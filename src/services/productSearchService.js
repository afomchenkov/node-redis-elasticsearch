const db = require('../elasticsearch-client');

exports.getSuggestions = (keyword, callback) => {
  const body = {
    suggest: {
      suggest: {
        completion: {
          field: 'completion',
          size: 10,
          skip_duplicates: true
        },
        text: keyword
      }
    }
  };

  db.search({
    index: 'products',
    type: 'product',
    body: body
  }).then((resp) => {
    const hits = resp.suggest.suggest[0];
    callback(false, hits);
    return;
  }, (err) => {
    callback(true);
    console.trace(err.message);
    return;
  });
}

exports.getRecords = (params, callback) => {
  const body = {
    query: {},
    size: 50
  };

  if (params.category) {
    body.query.term = {
      'categories.id': {
        value: params.category,
      },
    };
  }

  if (params.keyword) {
    body.query.bool = {
      must: [],
    };

    const terms = params.keyword.split(' ');
    for (let i = 0; i < terms.length; i++) {
      if (!terms[i]) {
        // ignore empty term
        continue;
      }

      body.query.bool.must.push({
        bool: {
          should: [
            {
              fuzzy: {
                'name.autocomplete': {
                  value: terms[i],
                  boost: 10.0,
                  fuzziness: 1,
                  prefix_length: 0,
                  max_expansions: 100
                }
              }
            },
            {
              fuzzy: {
                'description.autocomplete': {
                  value: terms[i],
                  boost: 2.0,
                  fuzziness: 1,
                  prefix_length: 0,
                  max_expansions: 100
                }
              }
            },
            {
              fuzzy: {
                'category.name.autocomplete': {
                  value: terms[i],
                  boost: 3.0,
                  fuzziness: 1,
                  prefix_length: 0,
                  max_expansions: 100
                }
              }
            }
          ]
        }
      });
    }
  }

  db.search({
    index: 'products',
    type: 'product',
    body: body
  }).then((resp) => {
    const hits = resp.hits;
    callback(false, hits);
    return;
  }, (err) => {
    callback(true);
    console.trace(err.message);
    return;
  });
};

exports.insert = (product, callback) => {
  db.index({
    index: 'products',
    type: 'product',
    id: product.id,
    body: product
  }, (error, response) => {
    if (error) {
      callback(true, error);
      return;
    }
    callback(false, response);
  });
};

exports.delete = (productId, callback) => {
  db.delete({
    index: 'products',
    type: 'product',
    id: productId,
  }, (error, response) => {
    if (error) {
      callback(true, error);
      return;
    }

    callback(false, response);
  });
};