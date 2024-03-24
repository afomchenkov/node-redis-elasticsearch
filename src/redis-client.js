const redis = require('redis');
const client = redis.createClient({ 'host': 'redis' });

class RedisClient {
  #client = null;

  constructor(client) {
    if (!client) {
      throw new Error('Redis client is not provided');
    }

    this.#client = client;
  }

  getClient() {
    return this.#client;
  }

  push(key, value, callback) {
    this.#client.lpush(key, value, (err, result) => {
      callback(err, result);
    });
  }

  pop() {
    this.#client.brpop(key, value, (err, result) => {
      callback(err, result);
    });
  }

  set(key, value, ttl = 86400) {
    if (value) {
      this.#client.set(key, JSON.stringify(value), 'EX', ttl);
    }
  }

  get(key, callback) {
    this.#client.get(key, (err, result) => {
      if (result) {
        callback(err, JSON.parse(result));
        return;
      }
      callback(true, {});
    });
  }

  delete(key) {
    this.#client.delete(key);
  }
}

module.exports = new RedisClient(client);
