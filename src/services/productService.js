const db = require('../db-client');
const dateTime = require('node-datetime');
const every = require('async/every');
const waterfall = require('async/waterfall');

exports.getRecords = (params, callback) => {
  let sql = 'SELECT p.* FROM products p LEFT JOIN product_category pc ON pc.product_id = p.id LEFT JOIN categories c ON c.id = pc.category_id';
  let sqlParams = [];
  let sqlExtras = [];

  if (params.category) {
    sqlExtras.push({ 'sql': 'WHERE pc.category_id = ?', 'params': [params.category] });
  }

  if (params.keyword) {
    sqlExtras.push({ 'sql': ' WHERE (p.name LIKE ? OR p.description LIKE ?)', 'params': ['%' + params.keyword + '%', '%' + params.keyword + '%'] });
  }

  if (sqlExtras.length >= 1) {
    for (let e in sqlExtras) {
      sql += sqlExtras[e].sql;
      for (p in sqlExtras[e].params) {
        sqlParams.push(sqlExtras[e].params[p]);
      }
    }
  }
  sql += ' GROUP BY p.id LIMIT 50';

  db.getConnection((err, connection) => {
    if (err) {
      console.log(err);
      callback(true);
      return;
    }

    connection.query(sql, sqlParams, (err, results) => {
      connection.release();
      if (err) {
        console.log(err);
        callback(true);
        return;
      }
      callback(false, results);
    });
  });
};

exports.getRecord = (id, callback) => {
  const sql = 'SELECT * FROM products WHERE id = ?';

  db.getConnection((err, connection) => {
    if (err) {
      console.log(err);
      callback(true);
      return;
    }

    connection.query(sql, [id], (err, results) => {
      connection.release();
      if (err) {
        console.log(err);
        callback(true);
        return;
      }

      if (results.length >= 1) {
        callback(false, results[0]);
        return;
      }

      callback(false, undefined);
      return;
    });
  });
};

exports.insert = (sqlData, callback) => {
  let dt = dateTime.create();
  let formatted = dt.format('Y-m-d H:M:S');

  sqlData.updated_at = formatted;
  let sql = 'INSERT INTO products SET ?';

  db.getConnection((err, connection) => {
    if (err) {
      console.log(err);
      callback(true);
      return;
    }

    connection.query(sql, sqlData, (err, results) => {
      if (err) {
        console.log(err);
        callback(true);
        return;
      }
      callback(false, results.insertId);
    });
  });
};

exports.upsertCategories = (productId, categories, callback) => {
  waterfall(
    [
      (waterfallCallback) => {
        db.getConnection((err, connection) => {
          if (err) {
            console.log(err);
            waterfallCallback(true);
            return;
          }
          connection.query('DELETE FROM product_category WHERE product_id = ?', [productId], (err, results) => {
            if (err) {
              console.log(err);
              waterfallCallback(true);
              return;
            }
            waterfallCallback(false);
          });
        });
      },
      (waterfallCallback) => {
        every(categories, (category, eachCallback) => {
          let sql = 'INSERT INTO product_category SET ?';

          db.getConnection((err, connection) => {
            if (err) {
              console.log(err);
              eachCallback(true);
              return;
            }

            connection.query(sql, { product_id: productId, category_id: category }, (err) => {
              if (err) {
                console.log(err);
                eachCallback(true);
                return;
              }
              eachCallback(false);
            });
          });
        },
          (err, result) => {
            waterfallCallback(err);
          });
      }
    ],
    (err) => {
      callback(err);
    }
  );
};

exports.update = (sqlData, callback) => {
  let sql = 'UPDATE products SET name = ?, description = ?, price = ?, quantity = ? WHERE id = ?;';
  let params = [sqlData.name, sqlData.description, sqlData.price, sqlData.quantity, sqlData.id];

  db.getConnection((err, connection) => {
    if (err) {
      console.log(err);
      callback(true);
      return;
    }

    connection.query(sql, params, (err, results, fields) => {
      if (err) {
        console.log(err);
        callback(true);
        return;
      }
      callback(false, results.changedRows);
    });
  });
};

exports.delete = (productId, callback) => {
  let sql = 'DELETE FROM product_category WHERE product_id = ?;';
  let params = [productId];

  db.getConnection((err, connection) => {
    if (err) {
      console.log(err);
      callback(true);
      return;
    }

    connection.query(sql, params, (err) => {
      if (err) {
        console.log(err);
        callback(true);
        return;
      }
      const psql = 'DELETE FROM products WHERE id = ?;';
      const pparams = [productId];
      connection.query(psql, pparams, (err, results) => {
        callback(false, results.changedRows);
      });
    });
  });
};