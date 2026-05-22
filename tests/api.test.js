"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { app } = require("../server/src/index");

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
  assert.equal(body.ok, true);
  assert.equal(body.dryRun, true);
  assert.equal(body.preview.command, "Get-UMSStatus");
}));

test("POST /api/run dryRun=true for dangerous command skips confirmText", withServer(async server => {
  const { status, body } = await post(server, "/api/run", {
    commandId: "restart-device",
    args: { Id: "12345" },
    dryRun: true,
  });
  assert.equal(status, 200);
  assert.equal(body.dryRun, true);
  assert.equal(body.preview.command, "Restart-UMSDevice");
  assert.deepEqual(body.preview.args, { Id: "12345" });
}));
