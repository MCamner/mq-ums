"use strict";

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { readAuditHistory } = require("../server/src/audit");

function row(id) {
  return {
    request_id: id, command_id: "get-status", section: "Status", safety: "read-only",
    dry_run: false, status: "success", started_at: "2026-08-28T00:00:00Z",
    duration_ms: 1, source: "live", arg_names: [], args: { secret: "must-not-leak" },
  };
}

test("history skips malformed rows, bounds limit and projects only safe fields", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "mq-ums-audit-"));
  fs.writeFileSync(path.join(dir, "audit-2026-08-28.jsonl"), [
    JSON.stringify(row("one")), "not-json", JSON.stringify(row("two")), "",
  ].join("\n"));
  const history = readAuditHistory(1, dir, () => new Date("2026-08-28T01:00:00Z"));
  assert.equal(history.entries.length, 1);
  assert.equal(history.entries[0].request_id, "two");
  assert.ok(!("args" in history.entries[0]));
  assert.equal(history.generated_at, "2026-08-28T01:00:00.000Z");
});
