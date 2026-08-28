"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { normalizeDevices, filterAndPaginate, shortSummary } = require("../web/result-model");

test("normalizes common PSIGEL device result shapes", () => {
  assert.deepEqual(normalizeDevices([{ id: 1 }]), [{ id: 1 }]);
  assert.deepEqual(normalizeDevices({ devices: [{ id: 2 }] }), [{ id: 2 }]);
  assert.deepEqual(normalizeDevices(null), []);
});

test("device filtering and pagination are bounded", () => {
  const devices = Array.from({ length: 30 }, (_, i) => ({ Id: i, Name: `Clinic-${i}` }));
  const page = filterAndPaginate(devices, { query: "clinic", page: 2, pageSize: 10 });
  assert.equal(page.total, 30);
  assert.equal(page.page, 2);
  assert.equal(page.pages, 3);
  assert.equal(page.items.length, 10);
});

test("short summary carries metadata but no device content", () => {
  const summary = shortSummary({
    schema: "ums_command_result.v1", command_id: "get-device", status: "success",
    source: "cache", duration_ms: 12, data: [{ Name: "sensitive-device-name" }],
  });
  assert.match(summary, /1 device result/);
  assert.doesNotMatch(summary, /sensitive-device-name/);
});
