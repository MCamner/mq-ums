"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const { createCommandService } = require("../server/src/command-service");

const commands = new Map([
  ["get-status", {id: "get-status", section: "Status", psCommand: "Get-UMSStatus", allowedArgs: [], danger: false, cacheTtlSeconds: 30}],
  ["restart", {id: "restart", section: "Devices", psCommand: "Restart-UMSDevice", allowedArgs: ["Id"], danger: true, confirmText: "RUN"}],
]);

function fakeSpawn({ stdout = "{}", stderr = "", code = 0, error = null } = {}) {
  return () => {
    const child = new EventEmitter();
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    queueMicrotask(() => {
      if (error) { child.emit("error", error); return; }
      if (stdout) child.stdout.emit("data", Buffer.from(stdout));
      if (stderr) child.stderr.emit("data", Buffer.from(stderr));
      child.emit("close", code);
    });
    return child;
  };
}

function service(spawnImpl = fakeSpawn()) {
  const audits = [];
  const instance = createCommandService({
    commandMap: commands,
    scriptsDir: "/repo/scripts",
    spawnImpl,
    auditWriter: row => audits.push(row),
    requestId: () => "request-1",
    now: (() => { let n = 0; return () => new Date(1000 + n++ * 25); })(),
    env: { MQ_UMS_CRED_PATH: "C:\\private\\cred.xml" },
  });
  return { instance, audits };
}

test("read-only success is cached and every hit is audited", async () => {
  let spawns = 0;
  const spawnImpl = (...args) => { spawns++; return fakeSpawn({ stdout: '{"ok":true}' })(...args); };
  const { instance, audits } = service(spawnImpl);
  const live = await instance.execute({ commandId: "get-status" });
  const cached = await instance.execute({ commandId: "get-status" });
  assert.equal(spawns, 1);
  assert.equal(live.body.source, "live");
  assert.equal(cached.body.source, "cache");
  assert.equal(cached.body.cache_origin_request_id, live.body.request_id);
  assert.equal(audits.length, 2);
});

test("bypassCache forces a fresh read-only execution", async () => {
  let spawns = 0;
  const spawnImpl = (...args) => { spawns++; return fakeSpawn({ stdout: '{}' })(...args); };
  const { instance } = service(spawnImpl);
  await instance.execute({ commandId: "get-status" });
  await instance.execute({ commandId: "get-status", bypassCache: true });
  assert.equal(spawns, 2);
});

test("successful execution returns one correlated result and audit row", async () => {
  const { instance, audits } = service(fakeSpawn({ stdout: '{"ok":true}' }));
  const result = await instance.execute({ commandId: "get-status" });
  assert.equal(result.httpStatus, 200);
  assert.equal(result.body.schema, "ums_command_result.v1");
  assert.equal(result.body.request_id, "request-1");
  assert.deepEqual(result.body.data, { ok: true });
  assert.equal(audits.length, 1);
  assert.equal(audits[0].request_id, result.body.request_id);
  assert.ok(!("data" in audits[0]));
});

test("unknown arguments fail closed before spawning", async () => {
  const { instance, audits } = service();
  const result = await instance.execute({ commandId: "get-status", args: { Surprise: "x" } });
  assert.equal(result.httpStatus, 400);
  assert.match(result.body.error, /Unknown argument/);
  assert.equal(audits.length, 0);
});

test("dangerous execution still requires exact confirmation", async () => {
  const { instance } = service();
  const result = await instance.execute({ commandId: "restart", args: { Id: "1" } });
  assert.equal(result.httpStatus, 400);
});

test("dry-run uses the same envelope and writes no argument values to audit", async () => {
  const { instance, audits } = service();
  const result = await instance.execute({ commandId: "restart", args: { Id: "123" }, dryRun: true });
  assert.equal(result.body.status, "dry-run");
  assert.equal(result.body.source, "dry-run");
  assert.deepEqual(audits[0].arg_names, ["Id"]);
  assert.ok(!("args" in audits[0]));
});

test("PowerShell failure is redacted and correlated", async () => {
  const { instance, audits } = service(fakeSpawn({
    stderr: "password=bad C:\\private\\cred.xml",
    code: 1,
  }));
  const result = await instance.execute({ commandId: "get-status" });
  assert.equal(result.httpStatus, 500);
  assert.equal(result.body.error.code, "powershell_failed");
  assert.doesNotMatch(result.body.error.message, /bad|private/);
  assert.equal(audits[0].error_code, "powershell_failed");
});

test("malformed PowerShell JSON fails instead of returning raw output", async () => {
  const { instance } = service(fakeSpawn({ stdout: "not-json" }));
  const result = await instance.execute({ commandId: "get-status" });
  assert.equal(result.httpStatus, 500);
  assert.equal(result.body.error.code, "invalid_json");
  assert.ok(!("data" in result.body));
});

test("synchronous spawn failure becomes a redacted result instead of a rejection", async () => {
  const { instance } = service(() => { throw new Error("C:\\private\\cred.xml unavailable"); });
  const result = await instance.execute({ commandId: "get-status", bypassCache: true });
  assert.equal(result.httpStatus, 500);
  assert.equal(result.body.error.code, "spawn_failed");
  assert.doesNotMatch(result.body.error.message, /private/);
});
