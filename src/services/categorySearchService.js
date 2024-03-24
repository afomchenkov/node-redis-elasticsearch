const db = require('../elasticsearch-client');

exports.getRecords = (callback) => {
  body = {
    size: 0,
    aggs: {
      categories: {
        terms: {
          field: 'categories.name',
          size: 20
        },
        aggs: {
          categoryId: {
            terms: {
              field: 'categories.id',
              size: 1
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
    const categories = [];
    const aggs = resp.aggregations.categories.buckets;

    for (let index in aggs) {
      const obj = {
        name: aggs[index].key,
        id: aggs[index].categoryId.buckets[0].key,
        count: aggs[index].doc_count,
      };
      categories.push(obj);
    }
    callback(false, categories);
    return;
  }, (err) => {
    callback(true);
    console.trace(err.message);
    return;
  });
};