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

module.exports = { writeAuditEntry };
