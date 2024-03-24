const db = require('../elasticsearch-client');

exports.getProductCountByDate = (params, callback) => {
  body = {
    size: 0,
    aggs: {
      product_counts: {
        date_histogram: {
          field: "created_at",
          interval: 'week',
        }
      }
    }
  };

  db.search({
    index: 'products',
    type: 'product',
    body: body
  }).then((resp) => {
    const aggs = resp.aggregations.product_counts.buckets;
    const result = {
      keys: [],
      vals: []
    };

    for (let i in aggs) {
      result['keys'].push(aggs[i].key_as_string);
      result['vals'].push(aggs[i].doc_count);
    }
    callback(false, result);
    return;
  }, (err) => {
    callback(true);
    console.trace(err.message);
    return;
  });
};

exports.getCategoriyQuantitySum = (params, callback) => {
  body = {
    size: 0,
    aggs: {
      product_categories: {
        terms: {
          field: 'categories.id',
          size: 10
        },
        aggs: {
          sum: {
            sum: {
              field: 'quantity',
            }
          }
        }
      }
    }
  };

  db.search({
    index: 'products',
    type: 'product',
    body: body
  }).then((resp) => {
    const aggs = resp.aggregations.product_categories.buckets;
    const result = {
      keys: [],
      vals: [],
      counts: [],
    };

    for (let i in aggs) {
      result['keys'].push(aggs[i].key);
      result['counts'].push(aggs[i].doc_count);
      result['vals'].push(aggs[i].sum.value);
    }
    callback(false, result);
    return;
  }, function (err) {
    callback(true);
    console.trace(err.message);
    return;
  });
};

exports.getProductQuantities = (params, callback) => {
  body = {
    size: 0,
    aggs: {
      product_counts: {
        date_histogram: {
          field: 'created_at',
          interval: 'week',
        },
        aggs: {
          product_quantities: {
            sum: {
              field: 'quantity',
            },
          },
        },
      },
    },
  };

  db.search({
    index: 'products',
    type: 'product',
    body: body
  }).then((resp) => {
    let aggs = resp.aggregations.product_counts.buckets;
    let result = {
      keys: [],
      vals: [],
      counts: []
    };

    for (let i in aggs) {
      result['keys'].push(aggs[i].key_as_string);
      result['counts'].push(aggs[i].doc_count);
      result['vals'].push(aggs[i].product_quantities.value);
    }
    callback(false, result);
    return;
  }, (err) => {
    callback(true);
    console.trace(err.message);
    return;
  });
};