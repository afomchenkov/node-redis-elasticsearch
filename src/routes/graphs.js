const express = require('express');
const waterfall = require('async/waterfall');

const router = express.Router();

const productGraphService = require('../services/productGraphService');

const dynamicColors = () => {
  const r = Math.floor(Math.random() * 255);
  const g = Math.floor(Math.random() * 255);
  const b = Math.floor(Math.random() * 255);
  return "rgb(" + r + "," + g + "," + b + ")";
};

router.get('/', (req, res) => {
  waterfall(
    [
      (waterfallCallback) => {
        productGraphService.getProductCountByDate({}, (err, result) => {
          if (err) {
            waterfallCallback(true, {});
          }

          const colors = [];
          for (const _ in result['vals']) {
            colors.push(dynamicColors());
          }

          const datasets = [
            {
              data: result['vals'].join(','),
              label: 'Num of Product',
              colors: '"' + colors.join('","') + '"',
            },
          ];
          const labels = '"' + result['keys'].join('","') + '"';

          waterfallCallback(false, {
            chart1: {
              labels,
              datasets,
            }
          });
        });
      },
      (data, waterfallCallback) => {
        productGraphService.getProductQuantities({}, (err, result) => {
          if (err) {
            waterfallCallback(true, {});
          }

          const colors = [];
          for (const _ in result['vals']) {
            colors.push(dynamicColors());
          }

          const labels = '"' + result['keys'].join('","') + '"';
          const datasets = [
            {
              data: result['vals'].join(','),
              label: 'Total Product Quantity',
              colors: '"' + colors.join('","') + '"'
            },
            {
              data: result['counts'].join(','),
              label: 'Num of Product'
            },
          ];

          waterfallCallback(false, {
            ...data,
            chart2: {
              labels,
              datasets,
            },
          });
        });
      },
      (data, waterfallCallback) => {
        productGraphService.getCategoriyQuantitySum({}, (err, result) => {
          if (err) {
            waterfallCallback(true, {});
          }

          const colors1 = [];
          const colors2 = [];
          for (const _ in result['vals']) {
            colors1.push(dynamicColors());
          }

          for (const _ in result['counts']) {
            colors2.push(dynamicColors());
          }

          const labels = '"' + result['keys'].join('","') + '"';
          const datasets = [
            {
              data: result['vals'].join(','),
              label: 'Total Quantity of Category',
              colors: '"' + colors1.join('","') + '"',
            },
            {
              data: result['counts'].join(','),
              label: 'Num of Product by Category',
              colors: '"' + colors2.join('","') + '"',
            },
          ];

          waterfallCallback(false, {
            ...data,
            chart3: {
              labels,
              datasets,
            }
          });
        });
      }
    ],
    (err, data) => {
      if (err) {
        res.send(500, "Server Error");
        return;
      }

      res.render('graphs', data);
    }
  );
  return;
});

module.exports = router;
