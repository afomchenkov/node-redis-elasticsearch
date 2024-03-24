const express = require('express');
const parallel = require('async/parallel');

const router = express.Router();

const productService = require('../services/productService');
const productSearchService = require('../services/productSearchService');

router.get('/', (req, res) => {
  const queryParams = req.query

  parallel({
    db: (callback) => {
      productService.getRecords(queryParams, (err, results) => {
        if (err) {
          res.send(500, "Server Error");
          return;
        }

        callback(null, {
          products: results,
          totalCount: results.length,
        });
      });
    },
    elastic: (callback) => {
      productSearchService.getRecords(queryParams, (err, results) => {
        if (err) {
          res.send(500, "Server Error");
          return;
        }

        const products = [];
        for (const p in results.hits) {
          products.push(results.hits[p]._source);
        }

        callback(null, {
          products,
          totalCount: results.total,
        });
      });
    }
  }, (err, results) => {
    if (err) {
      return res.send(500, "Server Error");
    }

    res.render('search', results);
  });

  return;
});

router.get('/suggest', (req, res) => {
  const queryParams = req.query
  const terms = queryParams.keyword.trim().split(' ');
  const keyword = terms.pop();

  productSearchService.getSuggestions(keyword, (err, results) => {
    if (err) {
      res.send(500, "Server Error");
      return;
    }

    const data = { suggestions: [] };
    for (const p in results.options) {
      const tempTerms = terms.slice(0);
      tempTerms.push(results.options[p].text);
      const searchText = tempTerms.join(' ');

      data.suggestions.push({
        'search-text': searchText,
        suggest: results.options[p].text
      });
    }

    res.render('suggestions', data);
  });

  return;
});

module.exports = router;
