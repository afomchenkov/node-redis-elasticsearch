#!/usr/bin/env node
require('dotenv').config();

const waterfall = require('async/waterfall');

const RedisQueue = require('./redis-queue');
const redisClient = require('./redis-client');
const {
  productService,
  categoryService,
  productSearchService,
} = require('./services');

const redisQueue = new RedisQueue(redisClient.getClient());

const upsertOperation = (productId, functionCallback) => {
  waterfall([
    // Getting Product Category from DB (Preparing for Elasticsearch)
    (waterfallCallback) => {
      let result = {};
      categoryService.getProductCategories(productId, (err, productCategories) => {
        if (err) {
          waterfallCallback(true, null);
          return;
        }

        result.productCategories = productCategories;
        waterfallCallback(false, result);
      });
    },
    // Getting Product Data from DB (Preparing for Elasticsearch)
    (result, waterfallCallback) => {
      productService.getRecord(productId, (err, product) => {
        if (err) {
          waterfallCallback(true, null);
          return;
        }

        result.product = product;
        waterfallCallback(false, result);
      });
    },
    // Saving Product to Elasticsearch
    (result, waterfallCallback) => {
      let product = result.product;
      product.categories = result.productCategories;
      product.completion = { input: product.name.trim().split(' ') };

      productSearchService.insert(product, () => {
        waterfallCallback(false, product);
      });
    },
    (err, result) => {
      functionCallback(err, result);
    }
  ]);
};

const deleteOperation = (productId, functionCallback) => {
  productSearchService.delete(productId, (err) => {
    if (err) {
      functionCallback(true, err);
    }

    functionCallback(false);
  });
};

// Redis message queue listener
redisQueue.on('message', (queueName, payload) => {
  var messageData = JSON.parse(payload);

  if (messageData.action == 'update' || messageData.action == 'insert') {
    upsertOperation(messageData.productId, () => {
      console.log('[' + queueName + '] - Processed - ' + payload);
      pop_queue.next('product_updates');
    });

    return;
  }

  if (messageData.action == 'delete') {
    deleteOperation(messageData.productId, () => {
      console.log('[' + queueName + '] - Processed - ' + payload);
      pop_queue.next('product_updates');
    });

    return;
  }
  
  console.log('[' + queueName + '] - Not Processed - ' + payload);
  pop_queue.next('product_updates');
});

redisQueue.on('error', (error) => {
  console.log('Redis pop error: ', error);
});

redisQueue.next('product_updates');
