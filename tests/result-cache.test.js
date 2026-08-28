"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { ResultCache } = require("../server/src/result-cache");

test("cache expires entries and bounds item count", () => {
  let now = 0;
  const cache = new ResultCache({ maxItems: 2, now: () => now });
  cache.set("a", 1, 1);
  cache.set("b", 2, 10);
  cache.set("c", 3, 10);
  assert.equal(cache.get("a"), null);
  assert.equal(cache.get("b"), 2);
  now = 11000;
  assert.equal(cache.get("b"), null);
  assert.equal(cache.get("c"), null);
});
