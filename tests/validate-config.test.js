"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { validateConfig } = require("../server/src/validate-config");

function writeTmp(obj) {
  const p = path.join(os.tmpdir(), `mq-test-${process.pid}-${Date.now()}.json`);
  fs.writeFileSync(p, JSON.stringify(obj));
  return p;
}

const valid = {
  commands: [
    { id: "get-status", name: "Get Status", psCommand: "Get-UMSStatus", allowedArgs: [], danger: false, description: "ok" },
  ],
};

test("accepts real commands.json", () => {
  const cfg = validateConfig();
  assert.ok(cfg.commands.length > 0);
});

test("returns parsed config", () => {
  const cfg = validateConfig(writeTmp(valid));
  assert.equal(cfg.commands[0].id, "get-status");
});

test("throws on invalid JSON", () => {
  const p = path.join(os.tmpdir(), `mq-test-bad-${Date.now()}.json`);
  fs.writeFileSync(p, "{ not json }");
  assert.throws(() => validateConfig(p), /not valid JSON/);
});

test("throws when commands is not an array", () => {
  assert.throws(() => validateConfig(writeTmp({ commands: "nope" })), /commands.*array/i);
});

test("throws on missing id", () => {
  assert.throws(
    () => validateConfig(writeTmp({ commands: [{ psCommand: "Get-UMSStatus", allowedArgs: [], danger: false }] })),
    /missing 'id'/
  );
});

test("throws on unsafe psCommand", () => {
  assert.throws(
    () => validateConfig(writeTmp({ commands: [{ id: "bad", psCommand: "Get-UMSStatus; rm -rf /", allowedArgs: [], danger: false }] })),
    /unsafe psCommand/
  );
});

test("throws on psCommand with wrong format", () => {
  assert.throws(
    () => validateConfig(writeTmp({ commands: [{ id: "bad", psCommand: "GetUMSStatus", allowedArgs: [], danger: false }] })),
    /unsafe psCommand/
  );
});

test("throws on unsafe arg name", () => {
  assert.throws(
    () => validateConfig(writeTmp({ commands: [{ id: "x", psCommand: "Get-UMSStatus", allowedArgs: ["bad arg!"], danger: false }] })),
    /unsafe arg name/
  );
});

test("throws on danger=true without confirmText", () => {
  assert.throws(
    () => validateConfig(writeTmp({ commands: [{ id: "x", psCommand: "Restart-UMSDevice", allowedArgs: ["Id"], danger: true }] })),
    /confirmText/
  );
});

test("throws on duplicate id", () => {
  assert.throws(
    () => validateConfig(writeTmp({ commands: [
      { id: "x", psCommand: "Get-UMSStatus", allowedArgs: [], danger: false },
      { id: "x", psCommand: "Get-UMSFirmware", allowedArgs: [], danger: false },
    ]})),
    /Duplicate/
  );
});
