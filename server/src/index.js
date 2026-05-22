"use strict";

require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });

const express = require("express");
const path = require("path");
const { spawn } = require("child_process");
const { validateConfig } = require("./validate-config");

const HOST = process.env.MQ_UMS_BIND || "127.0.0.1";
const PORT = parseInt(process.env.MQ_UMS_HTTP_PORT || "8787", 10);
const API_KEY = process.env.MQ_UMS_API_KEY || "";
const SCRIPTS_DIR = path.resolve(__dirname, "../../scripts");
const WEB_DIR = path.resolve(__dirname, "../../web");

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

app.get("/api/commands", requireApiKey, (req, res) => {
  const list = Array.from(commandMap.values()).map(({ id, name, description, allowedArgs, danger, confirmText }) => ({
    id, name, description, allowedArgs, danger, ...(confirmText ? { confirmText } : {}),
  }));
  res.json({ commands: list });
});

app.post("/api/run", requireApiKey, (req, res) => {
  const { commandId, args = {}, confirmText } = req.body;

  if (!commandId || typeof commandId !== "string") {
    return res.status(400).json({ error: "Missing commandId" });
  }

  const cmd = commandMap.get(commandId);
  if (!cmd) {
    return res.status(404).json({ error: `Unknown command: ${commandId}` });
  }

  if (cmd.danger) {
    if (confirmText !== cmd.confirmText) {
      return res.status(400).json({ error: `Dangerous command requires confirmText: "${cmd.confirmText}"` });
    }
  }

  // Validate args — only allowlisted keys, string values only
  const filteredArgs = {};
  for (const key of cmd.allowedArgs) {
    if (args[key] !== undefined) {
      const val = String(args[key]);
      // Only allow safe characters in arg values
      if (!/^[\w\s.,@:/\\-]{0,256}$/.test(val)) {
        return res.status(400).json({ error: `Unsafe value for arg '${key}'` });
      }
      filteredArgs[key] = val;
    }
  }

  const scriptPath = path.join(SCRIPTS_DIR, "Invoke-UmsCommand.ps1");
  const argsJson = JSON.stringify(filteredArgs);

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
    if (code !== 0) {
      return res.status(500).json({ error: "PowerShell runner failed", stderr: stderr.trim(), code });
    }
    try {
      const result = JSON.parse(stdout);
      res.json({ ok: true, result });
    } catch {
      res.json({ ok: true, raw: stdout.trim(), stderr: stderr.trim() });
    }
  });

  ps.on("error", (err) => {
    res.status(500).json({ error: `Failed to spawn PowerShell: ${err.message}` });
  });
});

app.listen(PORT, HOST, () => {
  console.log(`mq-ums running at http://${HOST}:${PORT}`);
  console.log(`UMS host: ${process.env.MQ_UMS_HOST || "(not set)"}`);
  console.log(`API key:  ${API_KEY ? "enabled" : "disabled"}`);
});
