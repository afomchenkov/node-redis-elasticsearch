const express = require('express');
const md5 = require('blueimp-md5');
const waterfall = require('async/waterfall');

const router = express.Router();

const {
  productService,
  categoryService,
} = require('../services');

const redisClient = require('../libraries/redis-client');
const RedisQueue = require('../redis-queue');

const redisQueue = new RedisQueue(redisClient.getClient());

router.get('/', (req, res) => {
  const queryParams = req.query;

  waterfall([
    (waterfallCallback) => {
      redisClient.get(md5(queryParams), (err, results) => {
        if (err) {
          console.log(err);
          waterfallCallback();
          return;
        }

        if (results) {
          res.render('products', {
            title: 'Products',
            products: results,
            totalCount: results.length,
            cache: true,
          });
          return;
        }
        waterfallCallback();
      });
    },
    () => {
      productService.getRecords(queryParams, (err, results) => {
        if (err) {
          res.send(500, 'Server Error');
          return;
        }

        redisClient.set(md5(queryParams), results, 100);
        res.render('products', {
          title: 'Products',
          products: results,
          totalCount: results.length,
          cache: false,
        });
      });
    }
  ]);
});

router.get('/id/:id', (req, res) => {
  const params = req.params;

  productService.getRecord(params.id, (err, product) => {
    if (err) {
      res.send(500, 'Server Error');
      return;
    }

    if (!product) {
      res.send(404, 'Not Found');
      return;
    }

    res.render('product', {
      title: product['name'],
      product,
    });

    return;
  });
});

router.get('/new', (req, res) => {
  let product = {
    id: 0,
    name: '',
    description: '',
    price: '',
    quantity: ''
  };

  categoryService.getRecords((err, results) => {
    res.render('product-form', {
      product,
      url: '/product/new',
      categories: results,
    });
  });
});

router.post('/new', (req, res) => {
  const params = req.body;
  const categories = params.categories;
  delete params['categories'];

  waterfall(
    [
      (waterfallCallback) => {
        result = {};
        productService.insert(params, (err, insertId) => {
          if (err) {
            res.redirect('/product');
          }

          productService.upsertCategories(insertId, categories, () => {
            result.insertId = insertId;
            waterfallCallback(false, result);
          })
        });
      },
      (result, waterfallCallback) => {
        redisQueue.push('product_updates', {
          action: 'insert',
          productId: result.insertId,
        });
        // waterfallCallback(false, result);
      }
    ],
    (err, result) => {
      if (err) {
        res.send(400, 'Bad Request');
        return;
      }
      res.redirect('/product/id/' + result.insertId);
    }
  );
});

router.get('/:id/delete', (req, res) => {
  const params = req.params;

  waterfall(
    [
      (waterfallCallback) => {
        productService.delete(params.id, () => {
          waterfallCallback(false);
        });
      },
      (waterfallCallback) => {
        redisQueue.push('product_updates', {
          action: 'delete',
          productId: params.id,
        });
        // waterfallCallback(false);
      }
    ],
    (err) => {
      if (err) {
        res.send(400, 'Bad Request');
        return;
      }
      res.redirect('/product');
    }
  );
});

router.get('/:id/edit', (req, res) => {
  const params = req.params;

  waterfall(
    [
      (waterfallCallback) => {
        productService.getRecord(params.id, (err, product) => {
          if (err) {
            waterfallCallback(err);
            return;
          }
          waterfallCallback(false, { product });
        });
      },
      (result, waterfallCallback) => {
        categoryService.getRecords((err, categories) => {
          result.categories = categories;
          waterfallCallback(false, result);
        });
      },
      (result, waterfallCallback) => {
        categoryService.getProductCategories(params.id, (err, productCategories) => {
          result.productCategories = productCategories;
          waterfallCallback(false, result);
        });
      },
      (result, waterfallCallback) => {
        for (let i in result.categories) {
          for (let j in result.productCategories) {
            if (result.categories[i].id == result.productCategories[j].id) {
              result.categories[i].selected = true;
              break;
            } else {
              result.categories[i].selected = false;
            }
          }
        }
        waterfallCallback(false, result);
      }
    ],
    (err, results) => {
      if (err) {
        res.send(400, 'Bad Request');
        return;
      }

      res.render('product-form', {
        product: results.product,
        categories: results.categories,
        productCategories: results.productCategories,
        url: '/product/' + params.id + '/edit',
      });
    }
  );
});


router.post('/:id/edit', (req, res) => {
  let params = req.body;
  let queryParams = req.params;
  params.id = queryParams.id;
  let categories = params.categories;
  delete params['categories'];

  waterfall(
    [
      (waterfallCallback) => {
        productService.update(params, (err, changedRows) => {
          if (err) {
            res.redirect('/product');
            return;
          }
          productService.upsertCategories(queryParams.id, categories, (err) => {
            if (err) {
              waterfallCallback(true);
              return;
            }

            waterfallCallback(false);
            return;
          })
        });      
      },
      (waterfallCallback) => {
        redisQueue.push('product_updates', {
          action:'update',
          productId: queryParams.id,
        }, (err, res) => {
          waterfallCallback(false);
        });
      }
    ],
    (err, product) => {
      if (err) {
        res.send(400, 'Bad Request');
        return;
      }

      res.redirect('/product/id/' + queryParams.id);
      return;
    }
    );
});

module.exports = router;
