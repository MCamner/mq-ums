"use strict";

class ResultCache {
  constructor({ maxItems = 100, now = () => Date.now() } = {}) {
    this.maxItems = maxItems;
    this.now = now;
    this.items = new Map();
  }

  get(key) {
    const entry = this.items.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= this.now()) {
      this.items.delete(key);
      return null;
    }
    this.items.delete(key);
    this.items.set(key, entry);
    return entry.value;
  }

  set(key, value, ttlSeconds) {
    if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) return;
    this.items.delete(key);
    this.items.set(key, { value, expiresAt: this.now() + ttlSeconds * 1000 });
    while (this.items.size > this.maxItems) this.items.delete(this.items.keys().next().value);
  }
}

module.exports = { ResultCache };
