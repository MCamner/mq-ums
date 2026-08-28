"use strict";

require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });

const express = require("express");
const fs = require("fs");
const path = require("path");
const { validateConfig } = require("./validate-config");
const { writeAuditEntry, readAuditHistory } = require("./audit");
const { createCommandService } = require("./command-service");

const HOST = process.env.MQ_UMS_BIND || "127.0.0.1";
const PORT = parseInt(process.env.MQ_UMS_HTTP_PORT || "8787", 10);
const API_KEY = process.env.MQ_UMS_API_KEY || "";
const SCRIPTS_DIR = path.resolve(__dirname, "../../scripts");
const WEB_DIR = path.resolve(__dirname, "../../web");
const VERSION = fs.readFileSync(path.resolve(__dirname, "../../VERSION"), "utf8").trim();
// Where Test-LiveUmsValidation.ps1 -EmitStatus writes ums_connection_status.v1.
const STATUS_PATH = process.env.MQ_UMS_STATUS_PATH
  || path.resolve(__dirname, "../../out/ums_connection_status.v1.json");

let commandMap;
try {
  const config = validateConfig();
  commandMap = new Map(config.commands.map((c) => [c.id, c]));
  console.log(`Loaded ${commandMap.size} commands from config`);
} catch (err) {
  console.error(`Config error: ${err.message}`);
  process.exit(1);
}

const app = express();
app.use(express.json());
app.use(express.static(WEB_DIR));

function createRequireApiKey(apiKey) {
  return function requireApiKey(req, res, next) {
    if (!apiKey) return next();
    const provided = req.headers["x-api-key"];
    if (provided !== apiKey) return res.status(401).json({ error: "Unauthorized" });
    next();
  };
}

const requireApiKey = createRequireApiKey(API_KEY);

function healthPayload() {
  return {
    ok: true,
    version: VERSION,
    bind: HOST,
    commandsLoaded: commandMap.size,
    credentialConfigured: Boolean(process.env.MQ_UMS_CRED_PATH),
    umsHostConfigured: Boolean(process.env.MQ_UMS_HOST),
  };
}

app.get("/health", (req, res) => res.json(healthPayload()));
app.get("/api/health", (req, res) => res.json(healthPayload()));

// Read-only ums_connection_status.v1 (see docs/contracts/). This endpoint never
// contacts UMS, spawns PowerShell, or reads credentials — it returns the last
// status emitted by the live validation harness, or an honest "unproven" view
// synthesized from local config. The contract guarantees no secrets in the body.
function umsStatusPayload() {
  const apiDefaults = {
    api_health_ok: false,
    api_commands_ok: false,
    api_run_ok: false,
    audit_history_ok: false,
  };
  try {
    const doc = JSON.parse(fs.readFileSync(STATUS_PATH, "utf8"));
    if (doc && doc.schema === "ums_connection_status.v1") {
      return { ...apiDefaults, ...doc, source: "mq-ums", emitted: true };
    }
  } catch {
    // No emitted status yet — fall through to the synthesized default.
  }

  const credPath = process.env.MQ_UMS_CRED_PATH || "";
  let credPresent = false;
  if (credPath) {
    try { credPresent = fs.existsSync(credPath); } catch { credPresent = false; }
  }

  return {
    schema: "ums_connection_status.v1",
    source: "mq-ums",
    mode: "read-only",
    generated_at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    ums_host_configured: Boolean(process.env.MQ_UMS_HOST),
    cred_file_present: credPresent,
    psigel_available: false,
    session_create_ok: false,
    session_remove_ok: false,
    get_status_ok: false,
    ...apiDefaults,
    risk: "unknown",
    findings: ["Live UMS validation has not been run yet; run scripts/Test-LiveUmsValidation.ps1 -EmitStatus <path>"],
    emitted: false,
  };
}

app.get("/api/ums-status", requireApiKey, (req, res) => res.json(umsStatusPayload()));

app.get("/api/commands", requireApiKey, (req, res) => {
  const list = Array.from(commandMap.values()).map(({ id, name, section, description, allowedArgs, danger, confirmText, cacheTtlSeconds }) => ({
    id, name, description, allowedArgs, danger,
    ...(section ? { section } : {}),
    ...(confirmText ? { confirmText } : {}),
    ...(cacheTtlSeconds ? { cacheTtlSeconds } : {}),
  }));
  res.json({ commands: list });
});

const commandService = createCommandService({
  commandMap,
  scriptsDir: SCRIPTS_DIR,
  auditWriter: writeAuditEntry,
});

app.get("/api/history", requireApiKey, (req, res) => {
  res.json(readAuditHistory(req.query.limit));
});

app.post("/api/run", requireApiKey, async (req, res) => {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const { commandId, args = {}, confirmText, dryRun = false, bypassCache = false } = body;

  if (!commandId || typeof commandId !== "string") {
    return res.status(400).json({ error: "Missing commandId" });
  }

  const result = await commandService.execute({ commandId, args, confirmText, dryRun, bypassCache });
  return res.status(result.httpStatus).json(result.body);
});

if (require.main === module) {
  app.listen(PORT, HOST, () => {
    console.log(`mq-ums v${VERSION} running at http://${HOST}:${PORT}`);
    console.log(`UMS host: ${process.env.MQ_UMS_HOST || "(not set)"}`);
    console.log(`API key:  ${API_KEY ? "enabled" : "disabled"}`);
  });
}

module.exports = { app, createRequireApiKey };
