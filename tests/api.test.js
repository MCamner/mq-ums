"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { app, createRequireApiKey } = require("../server/src/index");

function get(server, urlPath) {
  const { port } = server.address();
  return new Promise((resolve, reject) => {
    http.get(`http://127.0.0.1:${port}${urlPath}`, res => {
      let body = "";
      res.on("data", d => { body += d; });
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, body }); }
      });
    }).on("error", reject);
  });
}

function post(server, urlPath, payload) {
  const { port } = server.address();
  const data = JSON.stringify(payload);
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: "127.0.0.1", port, path: urlPath, method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) },
    }, res => {
      let body = "";
      res.on("data", d => { body += d; });
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, body }); }
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function withServer(fn) {
  return async () => {
    const server = http.createServer(app);
    await new Promise(r => server.listen(0, "127.0.0.1", r));
    try { await fn(server); }
    finally { await new Promise(r => server.close(r)); }
  };
}

// ── Health ───────────────────────────────────────────────────────────────────
test("GET /health returns ok with expected fields", withServer(async server => {
  const { status, body } = await get(server, "/health");
  assert.equal(status, 200);
  assert.equal(body.ok, true);
  assert.equal(typeof body.version, "string");
  assert.equal(typeof body.commandsLoaded, "number");
  assert.ok(body.commandsLoaded > 0);
}));

test("GET /api/health is an alias for /health", withServer(async server => {
  const { status, body } = await get(server, "/api/health");
  assert.equal(status, 200);
  assert.equal(body.ok, true);
}));

// ── UMS status ───────────────────────────────────────────────────────────────
test("GET /api/ums-status returns the ums_connection_status.v1 contract", withServer(async server => {
  const { status, body } = await get(server, "/api/ums-status");
  assert.equal(status, 200);
  assert.equal(body.schema, "ums_connection_status.v1");
  assert.equal(body.source, "mq-ums");
  assert.equal(body.mode, "read-only");
  for (const key of ["ums_host_configured", "cred_file_present", "psigel_available",
    "session_create_ok", "session_remove_ok", "get_status_ok", "api_health_ok",
    "api_commands_ok", "api_run_ok", "audit_history_ok"]) {
    assert.equal(typeof body[key], "boolean", `${key} should be boolean`);
  }
  assert.ok(["low", "unknown"].includes(body.risk));
  assert.ok(Array.isArray(body.findings));
}));

test("GET /api/ums-status body carries no secret markers", withServer(async server => {
  const { body } = await get(server, "/api/ums-status");
  const serialized = JSON.stringify(body).toLowerCase();
  for (const marker of ["password", "token", "apikey", "api_key", "secret", "credential="]) {
    assert.ok(!serialized.includes(marker), `status body must not contain "${marker}"`);
  }
}));

// ── Commands ─────────────────────────────────────────────────────────────────
test("GET /api/commands returns non-empty command list", withServer(async server => {
  const { status, body } = await get(server, "/api/commands");
  assert.equal(status, 200);
  assert.ok(Array.isArray(body.commands));
  assert.ok(body.commands.length > 0);
}));

test("GET /api/commands command entries have required fields", withServer(async server => {
  const { body } = await get(server, "/api/commands");
  for (const cmd of body.commands) {
    assert.equal(typeof cmd.id, "string");
    assert.equal(typeof cmd.name, "string");
    assert.ok(Array.isArray(cmd.allowedArgs));
    assert.equal(typeof cmd.danger, "boolean");
  }
}));

// ── Run validation ────────────────────────────────────────────────────────────
test("POST /api/run missing commandId returns 400", withServer(async server => {
  const { status, body } = await post(server, "/api/run", {});
  assert.equal(status, 400);
  assert.ok(body.error);
}));

test("POST /api/run unknown commandId returns 404", withServer(async server => {
  const { status, body } = await post(server, "/api/run", { commandId: "does-not-exist" });
  assert.equal(status, 404);
  assert.match(body.error, /Unknown command/);
}));

test("POST /api/run dangerous command without confirmText returns 400", withServer(async server => {
  const { status, body } = await post(server, "/api/run", { commandId: "restart-device", dryRun: false });
  assert.equal(status, 400);
  assert.match(body.error, /confirmText/);
}));

test("POST /api/run unsafe arg value returns 400", withServer(async server => {
  const { status } = await post(server, "/api/run", {
    commandId: "get-device",
    args: { Filter: "$(evil)" },
  });
  assert.equal(status, 400);
}));

// ── Dry-run ───────────────────────────────────────────────────────────────────
test("POST /api/run dryRun=true returns preview without spawning PowerShell", withServer(async server => {
  const { status, body } = await post(server, "/api/run", {
    commandId: "get-status",
    args: {},
    dryRun: true,
  });
  assert.equal(status, 200);
  assert.equal(body.schema, "ums_command_result.v1");
  assert.equal(body.dry_run, true);
  assert.equal(body.data.preview.command, "Get-UMSStatus");
}));

test("POST /api/run dryRun=true for dangerous command skips confirmText", withServer(async server => {
  const { status, body } = await post(server, "/api/run", {
    commandId: "restart-device",
    args: { Id: "12345" },
    dryRun: true,
  });
  assert.equal(status, 200);
  assert.equal(body.dry_run, true);
  assert.equal(body.data.preview.command, "Restart-UMSDevice");
  assert.deepEqual(body.data.preview.args, { Id: "12345" });
}));

test("POST /api/run rejects unknown argument names", withServer(async server => {
  const { status, body } = await post(server, "/api/run", {
    commandId: "get-status", args: { Surprise: "value" }, dryRun: true,
  });
  assert.equal(status, 400);
  assert.match(body.error, /Unknown argument/);
}));

test("GET /api/history returns the redacted history contract", withServer(async server => {
  const { status, body } = await get(server, "/api/history?limit=5");
  assert.equal(status, 200);
  assert.equal(body.schema, "ums_command_history.v1");
  assert.ok(Array.isArray(body.entries));
  for (const entry of body.entries) {
    assert.ok(!("args" in entry));
    assert.ok(!("data" in entry));
  }
}));

test("API-key middleware accepts headers only, never querystrings", () => {
  const middleware = createRequireApiKey("expected");
  let status = 0;
  const res = { status(code) { status = code; return this; }, json() { return this; } };
  let next = false;
  middleware({ headers: {}, query: { apiKey: "expected" } }, res, () => { next = true; });
  assert.equal(status, 401);
  assert.equal(next, false);
  middleware({ headers: { "x-api-key": "expected" }, query: {} }, res, () => { next = true; });
  assert.equal(next, true);
});
