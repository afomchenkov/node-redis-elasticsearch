const express = require('express');
const waterfall = require('async/waterfall');

const router = express.Router();

const categoryService = require('../services/categoryService');
const categorySearchService = require('../services/categorySearchService');

router.get('/', (req, res) => {
  waterfall(
    [
      (waterfallCallback) => {
        categoryService.getRecords((err, categories) => {
          if (err) {
            res.send(500, "Server Error");
            return;
          }

          const results = {
            categories
          };

          waterfallCallback(false, results);
        });
      },
      (results, waterfallCallback) => {
        categorySearchService.getRecords((err, esCategories) => {
          results.esCategories = esCategories;
          waterfallCallback(false, results);
        });
      }
    ],
    (err, results) => {
      if (err) {
        res.send(500, "Server Error");
        return;
      }

      const { categories, esCategories } = results;
      res.render('categories', {
        title: 'Categories',
        categories,
        esCategories,
      });
    }
  );
});

module.exports = router;
