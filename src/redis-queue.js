const { EventEmitter } = require('events');

class RedisQueueError extends Error { }

class RedisQueue extends EventEmitter {
  #client = null;

  constructor(client) {
    this.#client = client;
  }

  push(type, payload) {
    this.#client.lpush(type, JSON.stringify(payload));
  }

  clear(...keysToClear) {
    for (const key of keysToClear) {
      this.#client.del(key);
    }
  }

  monitor(...keysToMonitor) {
    for (const key of [...keysToMonitor, 0]) {
      this.#client.brpop(key, 0, (err, replies) => {
        try {
          if (err) {
            return this.emit('error', err);
          }

          if (replies.length != 2) {
            return this.emit('error', new RedisQueueError(`Bad replies number from redis ${replies.length}`));
          }

          this.emit('message', replies[0], replies[1]);
        } finally {
          this.monitor(...keysToMonitor);
        }
      });
    }
  }
}

module.exports = RedisQueue;
