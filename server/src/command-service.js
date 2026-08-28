"use strict";

const crypto = require("node:crypto");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { ResultCache } = require("./result-cache");

const ARG_VALUE = /^[\w\s.,@:/\\-]{0,256}$/;
const MAX_OUTPUT_BYTES = 1024 * 1024;

function redactMessage(value, sensitiveValues = []) {
  let text = String(value || "Command failed");
  for (const secret of sensitiveValues.filter(Boolean)) text = text.split(String(secret)).join("<redacted>");
  text = text.replace(/(password|token|api[_-]?key|secret)\s*[:=]\s*\S+/gi, "$1=<redacted>");
  return text.slice(0, 500);
}

function filterArgs(command, supplied = {}) {
  if (!supplied || typeof supplied !== "object" || Array.isArray(supplied)) {
    return { error: "args must be an object" };
  }
  const unknown = Object.keys(supplied).filter(key => !command.allowedArgs.includes(key));
  if (unknown.length) return { error: `Unknown argument: ${unknown[0]}` };

  const args = {};
  for (const key of command.allowedArgs) {
    if (supplied[key] === undefined) continue;
    const value = String(supplied[key]);
    if (!ARG_VALUE.test(value)) return { error: `Unsafe value for arg '${key}'` };
    args[key] = value;
  }
  return { args };
}

function createCommandService({
  commandMap,
  scriptsDir,
  spawnImpl = spawn,
  auditWriter,
  now = () => new Date(),
  requestId = () => crypto.randomUUID(),
  env = process.env,
  cache = new ResultCache(),
}) {
  async function execute({ commandId, args = {}, confirmText, dryRun = false, bypassCache = false }) {
    const command = commandMap.get(commandId);
    if (!command) return { httpStatus: 404, body: { error: `Unknown command: ${commandId}` } };
    if (command.danger && !dryRun && confirmText !== command.confirmText) {
      return {
        httpStatus: 400,
        body: { error: `Dangerous command requires confirmText: "${command.confirmText}"` },
      };
    }

    const filtered = filterArgs(command, args);
    if (filtered.error) return { httpStatus: 400, body: { error: filtered.error } };

    const id = requestId();
    const started = now();
    const base = {
      schema: "ums_command_result.v1",
      request_id: id,
      command_id: command.id,
      section: command.section || "General",
      safety: command.danger ? "dangerous" : "read-only",
      dry_run: Boolean(dryRun),
      started_at: started.toISOString(),
    };

    function finish(status, source, data, error, cacheOriginRequestId) {
      const outcome = {
        ...base,
        status,
        duration_ms: Math.max(0, now().getTime() - started.getTime()),
        source,
        ...(data !== undefined ? { data } : {}),
        ...(error ? { error } : {}),
        ...(cacheOriginRequestId ? { cache_origin_request_id: cacheOriginRequestId } : {}),
      };
      auditWriter({
        request_id: outcome.request_id,
        command_id: outcome.command_id,
        section: outcome.section,
        safety: outcome.safety,
        dry_run: outcome.dry_run,
        status: outcome.status,
        started_at: outcome.started_at,
        duration_ms: outcome.duration_ms,
        source: outcome.source,
        arg_names: Object.keys(filtered.args),
        ...(error ? { error_code: error.code } : {}),
        ...(cacheOriginRequestId ? { cache_origin_request_id: cacheOriginRequestId } : {}),
      });
      return outcome;
    }

    if (dryRun) {
      return {
        httpStatus: 200,
        body: finish("dry-run", "dry-run", {
          preview: { command: command.psCommand, args: filtered.args },
        }),
      };
    }

    const cacheKey = `${command.id}:${JSON.stringify(filtered.args)}`;
    if (!command.danger && command.cacheTtlSeconds && !bypassCache) {
      const cached = cache.get(cacheKey);
      if (cached) {
        return {
          httpStatus: 200,
          body: finish("success", "cache", cached.data, undefined, cached.request_id),
        };
      }
    }

    const scriptPath = path.join(scriptsDir, "Invoke-UmsCommand.ps1");
    const childArgs = [
      "-NonInteractive", "-NoProfile", "-File", scriptPath,
      "-CommandId", command.id,
      "-PsCommand", command.psCommand,
      "-ArgsJson", JSON.stringify(filtered.args),
      "-UmsHost", env.MQ_UMS_HOST || "",
      "-UmsPort", env.MQ_UMS_PORT || "8443",
      "-CredPath", env.MQ_UMS_CRED_PATH || "",
    ];

    return new Promise(resolve => {
      let stdout = "";
      let stderr = "";
      let settled = false;
      const complete = value => {
        if (settled) return;
        settled = true;
        resolve(value);
      };
      let child;
      try {
        child = spawnImpl("pwsh", childArgs, { timeout: 30000 });
      } catch (error) {
        complete({
          httpStatus: 500,
          body: finish("error", "live", undefined, {
            code: "spawn_failed",
            message: redactMessage(error.message, [env.MQ_UMS_CRED_PATH]),
          }),
        });
        return;
      }
      const append = (current, chunk) => (current + chunk.toString()).slice(0, MAX_OUTPUT_BYTES);
      child.stdout.on("data", chunk => { stdout = append(stdout, chunk); });
      child.stderr.on("data", chunk => { stderr = append(stderr, chunk); });
      child.on("error", error => complete({
        httpStatus: 500,
        body: finish("error", "live", undefined, {
          code: "spawn_failed",
          message: redactMessage(error.message, [env.MQ_UMS_CRED_PATH]),
        }),
      }));
      child.on("close", code => {
        if (code !== 0) {
          complete({
            httpStatus: 500,
            body: finish("error", "live", undefined, {
              code: "powershell_failed",
              message: redactMessage(stderr || "PowerShell runner failed", [env.MQ_UMS_CRED_PATH]),
            }),
          });
          return;
        }
        try {
          const data = JSON.parse(stdout);
          const body = finish("success", "live", data);
          if (!command.danger && command.cacheTtlSeconds) {
            cache.set(cacheKey, { data, request_id: body.request_id }, command.cacheTtlSeconds);
          }
          complete({ httpStatus: 200, body });
        } catch {
          complete({
            httpStatus: 500,
            body: finish("error", "live", undefined, {
              code: "invalid_json",
              message: "PowerShell returned invalid JSON",
            }),
          });
        }
      });
    });
  }

  return { execute };
}

module.exports = { createCommandService, filterArgs, redactMessage };
