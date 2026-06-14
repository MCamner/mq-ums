"use strict";

require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });

const express = require("express");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { validateConfig } = require("./validate-config");
const { writeAuditEntry } = require("./audit");

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

function requireApiKey(req, res, next) {
  if (!API_KEY) return next();
  const provided = req.headers["x-api-key"] || req.query.apiKey;
  if (provided !== API_KEY) return res.status(401).json({ error: "Unauthorized" });
  next();
}

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
  try {
    const doc = JSON.parse(fs.readFileSync(STATUS_PATH, "utf8"));
    if (doc && doc.schema === "ums_connection_status.v1") {
      return { ...doc, source: "mq-ums", emitted: true };
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
    risk: "unknown",
    findings: ["Live UMS validation has not been run yet; run scripts/Test-LiveUmsValidation.ps1 -EmitStatus <path>"],
    emitted: false,
  };
}

app.get("/api/ums-status", requireApiKey, (req, res) => res.json(umsStatusPayload()));

app.get("/api/commands", requireApiKey, (req, res) => {
  const list = Array.from(commandMap.values()).map(({ id, name, section, description, allowedArgs, danger, confirmText }) => ({
    id, name, description, allowedArgs, danger,
    ...(section ? { section } : {}),
    ...(confirmText ? { confirmText } : {}),
  }));
  res.json({ commands: list });
});

app.post("/api/run", requireApiKey, (req, res) => {
  const { commandId, args = {}, confirmText, dryRun = false } = req.body;

  if (!commandId || typeof commandId !== "string") {
    return res.status(400).json({ error: "Missing commandId" });
  }

  const cmd = commandMap.get(commandId);
  if (!cmd) {
    return res.status(404).json({ error: `Unknown command: ${commandId}` });
  }

  if (cmd.danger && !dryRun) {
    if (confirmText !== cmd.confirmText) {
      return res.status(400).json({ error: `Dangerous command requires confirmText: "${cmd.confirmText}"` });
    }
  }

  // Validate args — only allowlisted keys, string values only
  const filteredArgs = {};
  for (const key of cmd.allowedArgs) {
    if (args[key] !== undefined) {
      const val = String(args[key]);
      if (!/^[\w\s.,@:/\\-]{0,256}$/.test(val)) {
        return res.status(400).json({ error: `Unsafe value for arg '${key}'` });
      }
      filteredArgs[key] = val;
    }
  }

  if (dryRun) {
    writeAuditEntry({
      commandId,
      psCommand: cmd.psCommand,
      args: filteredArgs,
      dangerous: cmd.danger,
      dryRun: true,
      status: "dry-run",
    });
    return res.json({
      ok: true,
      dryRun: true,
      preview: {
        command: cmd.psCommand,
        args: filteredArgs,
      },
    });
  }

  const scriptPath = path.join(SCRIPTS_DIR, "Invoke-UmsCommand.ps1");
  const argsJson = JSON.stringify(filteredArgs);
  const start = Date.now();

  const ps = spawn("pwsh", [
    "-NonInteractive",
    "-NoProfile",
    "-File", scriptPath,
    "-CommandId", cmd.id,
    "-PsCommand", cmd.psCommand,
    "-ArgsJson", argsJson,
    "-UmsHost", process.env.MQ_UMS_HOST || "",
    "-UmsPort", process.env.MQ_UMS_PORT || "8443",
    "-CredPath", process.env.MQ_UMS_CRED_PATH || "",
  ], { timeout: 30000 });

  let stdout = "";
  let stderr = "";
  ps.stdout.on("data", (d) => { stdout += d.toString(); });
  ps.stderr.on("data", (d) => { stderr += d.toString(); });

  ps.on("close", (code) => {
    const durationMs = Date.now() - start;
    if (code !== 0) {
      writeAuditEntry({ commandId, psCommand: cmd.psCommand, args: filteredArgs, dangerous: cmd.danger, dryRun: false, status: "error", durationMs });
      return res.status(500).json({ error: "PowerShell runner failed", stderr: stderr.trim(), code });
    }
    writeAuditEntry({ commandId, psCommand: cmd.psCommand, args: filteredArgs, dangerous: cmd.danger, dryRun: false, status: "success", durationMs });
    try {
      const result = JSON.parse(stdout);
      res.json({ ok: true, result });
    } catch {
      res.json({ ok: true, raw: stdout.trim(), stderr: stderr.trim() });
    }
  });

  ps.on("error", (err) => {
    writeAuditEntry({ commandId, psCommand: cmd.psCommand, args: filteredArgs, dangerous: cmd.danger, dryRun: false, status: "spawn-error" });
    res.status(500).json({ error: `Failed to spawn PowerShell: ${err.message}` });
  });
});

if (require.main === module) {
  app.listen(PORT, HOST, () => {
    console.log(`mq-ums v${VERSION} running at http://${HOST}:${PORT}`);
    console.log(`UMS host: ${process.env.MQ_UMS_HOST || "(not set)"}`);
    console.log(`API key:  ${API_KEY ? "enabled" : "disabled"}`);
  });
}

module.exports = { app };
