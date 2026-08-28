"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");

function load(relative) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relative), "utf8"));
}

function assertExactKeys(value, schema, label) {
  const allowed = new Set(Object.keys(schema.properties));
  assert.deepEqual(
    Object.keys(value).filter(key => !allowed.has(key)),
    [],
    `${label} carries undeclared fields`,
  );
  for (const key of schema.required || []) assert.ok(key in value, `${label} missing ${key}`);
}

test("public command result example matches the strict top-level contract", () => {
  const schema = load("schemas/ums_command_result.v1.json");
  const example = load("examples/ums_command_result.v1.json");
  assertExactKeys(example, schema, "result");
  assert.equal(example.schema, schema.properties.schema.const);
  assert.ok(schema.additionalProperties === false);
});

test("public history example carries metadata but no raw result or argument values", () => {
  const schema = load("schemas/ums_command_history.v1.json");
  const example = load("examples/ums_command_history.v1.json");
  assertExactKeys(example, schema, "history");
  const entrySchema = schema.properties.entries.items;
  for (const entry of example.entries) {
    assertExactKeys(entry, entrySchema, "history entry");
    assert.ok(!("data" in entry));
    assert.ok(!("args" in entry));
    assert.ok(!("stdout" in entry));
    assert.ok(!("stderr" in entry));
  }
});

test("history contract cannot grow raw or secret-bearing fields", () => {
  const schema = load("schemas/ums_command_history.v1.json");
  const fields = Object.keys(schema.properties.entries.items.properties);
  for (const forbidden of ["args", "data", "stdout", "stderr", "credential", "host"]) {
    assert.ok(!fields.includes(forbidden), `${forbidden} must stay outside history`);
  }
});
