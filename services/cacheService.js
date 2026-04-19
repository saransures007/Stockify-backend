// LRU Cache implementation for memory efficiency
class LRUCache {
  constructor(limit = 500) {
    this.limit = limit;
    this.cache = new Map();
  }
  
  get(key) {
    const item = this.cache.get(key);
    if (item && Date.now() < item.expiry) {
      // Move to front (refresh)
      this.cache.delete(key);
      this.cache.set(key, item);
      return item.value;
    }
    if (item) this.cache.delete(key);
    return null;
  }
  
  set(key, value, ttlSeconds = 300) { // 5 min default TTL
    if (this.cache.size >= this.limit) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, {
      value,
      expiry: Date.now() + (ttlSeconds * 1000)
    });
  }
  
  clear() {
    this.cache.clear();
  }
}

const cache = new LRUCache(500);

const getCache = (key) => cache.get(key);
const setCache = (key, value, ttl) => cache.set(key, value, ttl);

module.exports = { getCache, setCache };