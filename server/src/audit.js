"use strict";

const fs = require("fs");
const path = require("path");

const LOGS_DIR = path.resolve(__dirname, "../../logs");

function writeAuditEntry(entry) {
  try {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
    const date = new Date().toISOString().slice(0, 10);
    const file = path.join(LOGS_DIR, `audit-${date}.jsonl`);
    const line = JSON.stringify({ timestamp: new Date().toISOString(), ...entry }) + "\n";
    fs.appendFileSync(file, line, "utf8");
  } catch (err) {
    // Never let audit failure break the request
    console.error(`[audit] write failed: ${err.message}`);
  }
}

function readAuditHistory(limit = 20, logsDir = LOGS_DIR, now = () => new Date()) {
  const bounded = Math.min(Math.max(Number.parseInt(limit, 10) || 20, 1), 100);
  let files = [];
  try {
    files = fs.readdirSync(logsDir).filter(name => /^audit-\d{4}-\d{2}-\d{2}\.jsonl$/.test(name)).sort().reverse();
  } catch {
    return { schema: "ums_command_history.v1", generated_at: now().toISOString(), entries: [] };
  }

  const entries = [];
  for (const name of files) {
    let lines;
    try { lines = fs.readFileSync(path.join(logsDir, name), "utf8").split(/\r?\n/).reverse(); }
    catch { continue; }
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const row = JSON.parse(line);
        const required = ["request_id", "command_id", "section", "safety", "dry_run", "status", "started_at", "duration_ms", "source", "arg_names"];
        if (!required.every(key => key in row)) continue;
        entries.push(Object.fromEntries(
          [...required, "error_code", "cache_origin_request_id"].filter(key => key in row).map(key => [key, row[key]]),
        ));
      } catch { /* malformed historical rows are ignored */ }
      if (entries.length >= bounded) break;
    }
    if (entries.length >= bounded) break;
  }
  return { schema: "ums_command_history.v1", generated_at: now().toISOString(), entries };
}

module.exports = { writeAuditEntry, readAuditHistory };
