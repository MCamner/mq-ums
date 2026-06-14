"use strict";

// ── DOM refs ────────────────────────────────────────────────────────────────
const statusDot    = document.getElementById("status-dot");
const statusLabel  = document.getElementById("status-label");
const statusMeta   = document.getElementById("status-meta");
const umsSummary   = document.getElementById("ums-status-summary");
const umsChecks    = document.getElementById("ums-status-checks");
const umsRisk      = document.getElementById("ums-status-risk");
const refreshBtn   = document.getElementById("refresh-btn");
const apiKeyBtn    = document.getElementById("api-key-btn");
const apiKeyDialog = document.getElementById("api-key-dialog");
const apiKeyInput  = document.getElementById("api-key-input");
const saveApiKeyBtn = document.getElementById("save-api-key-btn");
const clearApiKeyBtn = document.getElementById("clear-api-key-btn");
const closeApiKeyBtn = document.getElementById("close-api-key-btn");
const cmdSearch    = document.getElementById("cmd-search");
const cmdCount     = document.getElementById("cmd-count");
const cmdList      = document.getElementById("cmd-list");
const cmdTitle     = document.getElementById("cmd-title");
const cmdDesc      = document.getElementById("cmd-desc");
const cmdMeta      = document.getElementById("cmd-meta");
const cmdBadgeWrap = document.getElementById("cmd-badge-wrap");
const argsFields   = document.getElementById("args-fields");
const safetyNote   = document.getElementById("safety-note");
const confirmBox   = document.getElementById("confirm-box");
const confirmWord  = document.getElementById("confirm-word");
const confirmInput = document.getElementById("confirm-input");
const runBtn       = document.getElementById("run-btn");
const runLabel     = document.getElementById("run-label");
const runSpinner   = document.getElementById("run-spinner");
const runHint      = document.getElementById("run-hint");
const outputPlaceholder = document.getElementById("output-placeholder");
const outputEl     = document.getElementById("output");
const copyBtn      = document.getElementById("copy-btn");
const clearBtn     = document.getElementById("clear-btn");
const resultMeta   = document.getElementById("result-meta");
const toast        = document.getElementById("toast");
const dryrunCheck  = document.getElementById("dryrun-check");

// ── State ───────────────────────────────────────────────────────────────────
const API_KEY_STORAGE = "mqUmsApiKey";
let apiKey   = localStorage.getItem(API_KEY_STORAGE) || "";
let commands = [];
let current  = null;
let running  = false;

// ── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  updateApiKeyButton();
  await checkHealth();
  await loadUmsStatus();
  await loadCommands();
  setInterval(checkHealth, 15000);
}

function apiHeaders(extra = {}) {
  return apiKey ? { ...extra, "x-api-key": apiKey } : extra;
}

async function checkHealth() {
  try {
    const res = await fetch("/api/health", { signal: AbortSignal.timeout(4000) });
    const data = await safeJson(res);
    if (!res.ok || !data.ok) throw new Error(data.error || res.status);

    statusDot.className = "status-dot ok";
    statusLabel.textContent = "connected";
    statusMeta.textContent = `v${data.version} · ${data.commandsLoaded} commands · UMS host ${data.umsHostConfigured ? "configured" : "missing"} · credentials ${data.credentialConfigured ? "configured" : "missing"}`;
  } catch (err) {
    statusDot.className = "status-dot error";
    statusLabel.textContent = "offline";
    statusMeta.textContent = `API offline or unreachable: ${err.message}`;
  }
}

// Read-only ums_connection_status.v1 — booleans + risk, no secrets.
const UMS_CHECK_LABELS = {
  ums_host_configured: "UMS host configured",
  cred_file_present: "Credential file present",
  psigel_available: "PSIGEL available",
  session_create_ok: "Session create",
  session_remove_ok: "Session teardown",
  get_status_ok: "Get-UMSStatus",
};

async function loadUmsStatus() {
  try {
    const res = await fetch("/api/ums-status", { headers: apiHeaders(), signal: AbortSignal.timeout(4000) });
    const data = await safeJson(res);
    if (!res.ok || data.schema !== "ums_connection_status.v1") throw new Error(data.error || `HTTP ${res.status}`);

    const risk = data.risk || "unknown";
    umsRisk.textContent = `risk: ${risk}`;
    umsRisk.className = `ums-risk ${risk === "low" ? "ok" : "unknown"}`;

    const proven = data.emitted ? "validated" : "not yet validated";
    umsSummary.textContent = `Read-only connection proof — ${proven} · ${data.findings?.[0] || ""}`;

    umsChecks.innerHTML = Object.entries(UMS_CHECK_LABELS).map(([key, label]) => {
      const on = data[key] === true;
      return `<span class="ums-check ${on ? "ok" : "off"}">${on ? "✓" : "○"} ${escHtml(label)}</span>`;
    }).join("");
  } catch (err) {
    umsRisk.textContent = "risk: unknown";
    umsRisk.className = "ums-risk unknown";
    umsSummary.textContent = `UMS status unavailable: ${err.message}`;
    umsChecks.innerHTML = "";
  }
}

async function loadCommands() {
  cmdCount.textContent = "Loading commands…";
  try {
    const res = await fetch("/api/commands", { headers: apiHeaders() });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

    commands = data.commands || [];
    renderSidebar(commands);
    cmdCount.textContent = `${commands.length} commands loaded`;

    if (commands.length && !current) {
      const firstReadOnly = commands.find(c => !c.danger) || commands[0];
      selectCommand(firstReadOnly.id);
    }
  } catch (err) {
    commands = [];
    cmdList.innerHTML = `<div class="empty-state">Failed to load commands.<br>${escHtml(err.message)}</div>`;
    cmdCount.textContent = "No commands loaded";
    showToast(`Failed to load commands: ${err.message}`);
  }
}

async function safeJson(res) {
  try { return await res.json(); }
  catch { return {}; }
}

// ── Sidebar ──────────────────────────────────────────────────────────────────
function renderSidebar(cmds) {
  cmdList.innerHTML = "";

  if (!cmds.length) {
    cmdList.innerHTML = `<div class="empty-state">No matching commands</div>`;
    return;
  }

  // Group by section, preserving order
  const sections = new Map();
  for (const cmd of cmds) {
    const sec = cmd.section || "General";
    if (!sections.has(sec)) sections.set(sec, []);
    sections.get(sec).push(cmd);
  }

  for (const [sectionName, sectionCmds] of sections) {
    const lbl = document.createElement("div");
    lbl.className = "cmd-group-label";
    lbl.textContent = sectionName;
    cmdList.appendChild(lbl);

    // Read-only first, then dangerous
    const sorted = [
      ...sectionCmds.filter(c => !c.danger),
      ...sectionCmds.filter(c => c.danger),
    ];
    for (const cmd of sorted) addCmdItem(cmd);
  }
}

function addCmdItem(cmd) {
  const item = document.createElement("button");
  item.type = "button";
  item.className = "cmd-item";
  item.dataset.id = cmd.id;

  const name = document.createElement("span");
  name.className = "cmd-item-name";
  name.textContent = cmd.name;

  const badge = document.createElement("span");
  badge.className = "badge " + (cmd.danger ? "badge-danger" : "badge-read");
  badge.textContent = cmd.danger ? "write" : "read";

  item.appendChild(name);
  item.appendChild(badge);
  item.addEventListener("click", () => selectCommand(cmd.id));
  cmdList.appendChild(item);
}

cmdSearch.addEventListener("input", () => {
  const q = cmdSearch.value.toLowerCase().trim();
  const filtered = commands.filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.id.toLowerCase().includes(q) ||
    (c.description || "").toLowerCase().includes(q)
  );
  renderSidebar(filtered);
  cmdCount.textContent = q ? `${filtered.length} matching commands` : `${commands.length} commands loaded`;
  if (current) {
    const active = cmdList.querySelector(`[data-id="${CSS.escape(current.id)}"]`);
    if (active) active.classList.add("active");
  }
});

// ── Command select ────────────────────────────────────────────────────────────
function selectCommand(id) {
  current = commands.find(c => c.id === id) || null;
  if (!current) return;

  cmdList.querySelectorAll(".cmd-item").forEach(el => {
    el.classList.toggle("active", el.dataset.id === id);
  });

  cmdTitle.textContent = current.name;
  cmdDesc.textContent  = current.description || "";
  cmdMeta.textContent = `${current.id} · ${current.allowedArgs?.length || 0} allowed arg${(current.allowedArgs?.length || 0) === 1 ? "" : "s"}`;

  cmdBadgeWrap.innerHTML = "";
  const b = document.createElement("span");
  b.className = "badge " + (current.danger ? "badge-danger" : "badge-read");
  b.textContent = current.danger ? "⚠ Dangerous" : "Read-only";
  cmdBadgeWrap.appendChild(b);

  renderArgs(current.allowedArgs || []);

  dryrunCheck.checked = current.danger;
  confirmInput.value = "";
  updateDryRunState();
  updateRunBtn();
  clearOutput();
}

function renderArgs(argNames) {
  argsFields.innerHTML = "";

  if (!argNames.length) {
    argsFields.innerHTML = `<div class="no-args">No arguments required.</div>`;
    return;
  }

  for (const argName of argNames) {
    const g = document.createElement("div");
    g.className = "arg-group";

    const lbl = document.createElement("label");
    lbl.className = "arg-label";
    lbl.textContent = argName;
    lbl.setAttribute("for", "arg-" + argName);

    const inp = document.createElement("input");
    inp.type = "text";
    inp.id   = "arg-" + argName;
    inp.className = "arg-input";
    inp.dataset.argName = argName;
    inp.placeholder = `Enter ${argName}`;
    inp.addEventListener("input", updateRunBtn);

    g.appendChild(lbl);
    g.appendChild(inp);
    argsFields.appendChild(g);
  }
}

function getArgs() {
  const args = {};
  argsFields.querySelectorAll("input[data-arg-name]").forEach(inp => {
    if (inp.value.trim()) args[inp.dataset.argName] = inp.value.trim();
  });
  return args;
}

// ── Run ───────────────────────────────────────────────────────────────────────
function updateDryRunState() {
  if (!current) return;

  const liveDanger = current.danger && !dryrunCheck.checked;
  confirmBox.classList.toggle("hidden", !liveDanger);
  runBtn.classList.toggle("danger-mode", liveDanger);
  confirmWord.textContent = current.confirmText || "RUN";
  runLabel.textContent = dryrunCheck.checked ? "Dry Run" : "Run";

  if (liveDanger) {
    safetyNote.textContent = "Live execution is enabled for a dangerous command. Confirm deliberately before running.";
    safetyNote.className = "safety-note danger";
  } else if (current.danger) {
    safetyNote.textContent = "Safe preview mode. The API will return the PowerShell command and arguments without executing them.";
    safetyNote.className = "safety-note warning";
  } else {
    safetyNote.textContent = "Read-only command. The API will execute through the allowlisted runner.";
    safetyNote.className = "safety-note info";
  }
}

function updateRunBtn() {
  if (!current || running) { runBtn.disabled = true; return; }
  if (current.danger && !dryrunCheck.checked && confirmInput.value !== current.confirmText) {
    runBtn.disabled = true; return;
  }
  runBtn.disabled = false;

  runHint.textContent = dryrunCheck.checked
    ? "Preview only — no UMS change"
    : current.danger ? "Live UMS change" : "Execute read-only command";
}

confirmInput.addEventListener("input", updateRunBtn);
dryrunCheck.addEventListener("change", () => {
  if (dryrunCheck.checked) confirmInput.value = "";
  updateDryRunState();
  updateRunBtn();
});

async function runCommand() {
  if (!current || running || runBtn.disabled) return;

  running = true;
  runBtn.disabled = true;
  const started = performance.now();
  runLabel.textContent = dryrunCheck.checked ? "Previewing" : "Running";
  runSpinner.classList.remove("hidden");
  clearOutput();
  showPlaceholder(false);

  const body = { commandId: current.id, args: getArgs(), dryRun: dryrunCheck.checked };
  if (current.danger && !dryrunCheck.checked) body.confirmText = confirmInput.value;

  try {
    const res = await fetch("/api/run", {
      method: "POST",
      headers: apiHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(body),
    });
    const data = await safeJson(res);
    const elapsedMs = Math.round(performance.now() - started);

    if (!res.ok) {
      showError(data.error || JSON.stringify(data));
      resultMeta.textContent = `failed · ${elapsedMs} ms`;
    } else if (data.dryRun) {
      showJson({ dryRun: true, preview: data.preview });
      resultMeta.textContent = `dry-run · ${elapsedMs} ms`;
      copyBtn.classList.remove("hidden");
    } else {
      const payload = data.result ?? data.raw ?? data;
      showJson(payload);
      resultMeta.textContent = `success · ${elapsedMs} ms`;
      copyBtn.classList.remove("hidden");
    }
  } catch (err) {
    showError(`Request failed: ${err.message}`);
    resultMeta.textContent = "request failed";
  } finally {
    running = false;
    runLabel.textContent = dryrunCheck.checked ? "Dry Run" : "Run";
    runSpinner.classList.add("hidden");
    updateRunBtn();
  }
}

runBtn.addEventListener("click", runCommand);
refreshBtn.addEventListener("click", async () => {
  await checkHealth();
  await loadUmsStatus();
  await loadCommands();
  showToast("API status refreshed");
});

// ── API key dialog ────────────────────────────────────────────────────────────
function updateApiKeyButton() {
  apiKeyBtn.textContent = apiKey ? "API key set" : "API key";
  apiKeyBtn.classList.toggle("key-set", Boolean(apiKey));
}

function openApiKeyDialog() {
  apiKeyInput.value = apiKey;
  apiKeyDialog.classList.remove("hidden");
  apiKeyInput.focus();
}

function closeApiKeyDialog() {
  apiKeyDialog.classList.add("hidden");
}

apiKeyBtn.addEventListener("click", openApiKeyDialog);
closeApiKeyBtn.addEventListener("click", closeApiKeyDialog);
saveApiKeyBtn.addEventListener("click", async () => {
  apiKey = apiKeyInput.value.trim();
  if (apiKey) localStorage.setItem(API_KEY_STORAGE, apiKey);
  else localStorage.removeItem(API_KEY_STORAGE);
  updateApiKeyButton();
  closeApiKeyDialog();
  await loadCommands();
  showToast(apiKey ? "API key saved" : "API key cleared");
});
clearApiKeyBtn.addEventListener("click", async () => {
  apiKey = "";
  apiKeyInput.value = "";
  localStorage.removeItem(API_KEY_STORAGE);
  updateApiKeyButton();
  closeApiKeyDialog();
  await loadCommands();
  showToast("API key cleared");
});
apiKeyDialog.addEventListener("click", e => {
  if (e.target === apiKeyDialog) closeApiKeyDialog();
});

// ── Output ────────────────────────────────────────────────────────────────────
function showPlaceholder(show) {
  outputPlaceholder.style.display = show ? "" : "none";
  outputEl.classList.toggle("hidden", show);
}

function clearOutput() {
  outputEl.innerHTML = "";
  outputEl.classList.add("hidden");
  outputPlaceholder.style.display = "";
  copyBtn.classList.add("hidden");
  resultMeta.textContent = "";
}

function showJson(data) {
  const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  outputEl.innerHTML = syntaxHighlight(text);
  outputEl.classList.remove("hidden");
  outputPlaceholder.style.display = "none";
  outputEl._rawText = text;
}

function showError(msg) {
  outputEl.innerHTML = `<span class="json-err">${escHtml(String(msg))}</span>`;
  outputEl.classList.remove("hidden");
  outputPlaceholder.style.display = "none";
  outputEl._rawText = msg;
}

function syntaxHighlight(json) {
  return json
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
      match => {
        if (/^"/.test(match)) {
          return /:$/.test(match)
            ? `<span class="json-key">${match}</span>`
            : `<span class="json-str">${match}</span>`;
        }
        if (/true|false/.test(match)) return `<span class="json-bool">${match}</span>`;
        if (/null/.test(match))       return `<span class="json-null">${match}</span>`;
        return `<span class="json-num">${match}</span>`;
      }
    );
}

function escHtml(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

// ── Copy ──────────────────────────────────────────────────────────────────────
copyBtn.addEventListener("click", async () => {
  const text = outputEl._rawText || outputEl.textContent;
  try {
    await navigator.clipboard.writeText(text);
    showToast("Copied to clipboard");
  } catch {
    showToast("Copy failed");
  }
});

clearBtn.addEventListener("click", clearOutput);

// ── Toast ─────────────────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2500);
}

// ── Keyboard shortcuts ────────────────────────────────────────────────────────
document.addEventListener("keydown", e => {
  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
    e.preventDefault();
    runCommand();
  }
  if (e.key === "Escape") {
    if (!apiKeyDialog.classList.contains("hidden")) { closeApiKeyDialog(); return; }
    clearOutput();
    if (confirmInput) confirmInput.value = "";
    updateRunBtn();
  }
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    cmdSearch.focus();
    cmdSearch.select();
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
init();
