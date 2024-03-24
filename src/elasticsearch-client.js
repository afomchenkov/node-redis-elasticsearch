const elasticsearch = require('elasticsearch');

const client = new elasticsearch.Client({
  host: process.env.ELASTIC_HOST,
  log: process.env.ELASTIC_LOG
});

module.exports = client;
