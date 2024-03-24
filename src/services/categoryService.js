const db = require('../db-client');

exports.getRecords = (callback) => {
  const sql = 'SELECT * FROM categories';

  db.getConnection((err, connection) => {
    if (err) {
      console.log(err);
      callback(true);
      return;
    }

    connection.query(sql, [], (err, results) => {
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


exports.getProductCategories = (productId, callback) => {
  const sql = 'SELECT * FROM product_category WHERE product_id = ?;';

  db.getConnection((err, connection) => {
    if (err) {
      console.log(err);
      callback(true);
      return;
    }

    connection.query(sql, [productId], (err, results) => {
      connection.release();
      if (err) {
        console.log(err);
        callback(true);
        return;
      }

      categories = [];
      for (let index in results) {
        categories.push(results[index]['category_id']);
      }

      connection.query('SELECT * FROM categories WHERE id IN (?)', [categories], (err, productCategories) => {
        callback(false, productCategories);
      });
    });
  });
};