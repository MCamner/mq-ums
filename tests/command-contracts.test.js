"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const VALIDATOR = path.join(ROOT, "tools", "validate-command-contracts.py");

function run(extra = []) {
  return spawnSync("python3", [VALIDATOR, ...extra], { encoding: "utf8" });
}

test("all command contracts match the runtime allowlist", () => {
  const result = run();
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /30 command contracts match/);
});

test("contract drift is named and rejected", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "mq-ums-contracts-"));
  const contracts = path.join(root, "contracts");
  fs.mkdirSync(contracts);
  fs.writeFileSync(path.join(root, "commands.json"), JSON.stringify({ commands: [{
    id: "get-status", section: "Status", psCommand: "Get-UMSStatus",
    allowedArgs: [], danger: false,
  }] }));
  fs.writeFileSync(path.join(contracts, "get-status.yaml"), [
    'id: "get-status"', 'section: "Wrong"', 'psCommand: "Get-UMSStatus"',
    "danger: false", "inputs:", "",
  ].join("\n"));
  const result = run(["--config", path.join(root, "commands.json"), "--contracts", contracts]);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /section mismatch/);
});
