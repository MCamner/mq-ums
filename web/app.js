"use strict";

// ── DOM refs ────────────────────────────────────────────────────────────────
const statusDot    = document.getElementById("status-dot");
const statusLabel  = document.getElementById("status-label");
const cmdSearch    = document.getElementById("cmd-search");
const cmdList      = document.getElementById("cmd-list");
const cmdTitle     = document.getElementById("cmd-title");
const cmdDesc      = document.getElementById("cmd-desc");
const cmdBadgeWrap = document.getElementById("cmd-badge-wrap");
const argsFields   = document.getElementById("args-fields");
const confirmBox   = document.getElementById("confirm-box");
const confirmWord  = document.getElementById("confirm-word");
const confirmInput = document.getElementById("confirm-input");
const runRow       = document.getElementById("run-row");
const runBtn       = document.getElementById("run-btn");
const runLabel     = document.getElementById("run-label");
const runSpinner   = document.getElementById("run-spinner");
const runHint      = document.getElementById("run-hint");
const outputWrap   = document.getElementById("output-wrap");
const outputPlaceholder = document.getElementById("output-placeholder");
const outputEl     = document.getElementById("output");
const copyBtn      = document.getElementById("copy-btn");
const clearBtn     = document.getElementById("clear-btn");
const toast        = document.getElementById("toast");

// ── State ───────────────────────────────────────────────────────────────────
let commands = [];
let current  = null;
let running  = false;

// ── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  await checkHealth();
  await loadCommands();
  setInterval(checkHealth, 15000);
}

async function checkHealth() {
  try {
    const res = await fetch("/api/commands", { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      statusDot.className = "status-dot ok";
      statusLabel.textContent = "connected";
    } else {
      throw new Error(res.status);
    }
  } catch {
    statusDot.className = "status-dot error";
    statusLabel.textContent = "offline";
  }
}

async function loadCommands() {
  try {
    const res = await fetch("/api/commands");
    const data = await res.json();
    commands = data.commands || [];
    renderSidebar(commands);
  } catch (err) {
    showToast(`Failed to load commands: ${err.message}`);
  }
}

// ── Sidebar ──────────────────────────────────────────────────────────────────
function renderSidebar(cmds) {
  cmdList.innerHTML = "";

  const safe    = cmds.filter(c => !c.danger);
  const dangerous = cmds.filter(c => c.danger);

  if (safe.length) {
    addGroup("Read-only", safe);
  }
  if (dangerous.length) {
    addGroup("Write / Danger", dangerous);
  }
}

function addGroup(label, cmds) {
  const lbl = document.createElement("div");
  lbl.className = "cmd-group-label";
  lbl.textContent = label;
  cmdList.appendChild(lbl);

  for (const cmd of cmds) {
    const item = document.createElement("div");
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
}

cmdSearch.addEventListener("input", () => {
  const q = cmdSearch.value.toLowerCase();
  const filtered = commands.filter(c =>
    c.name.toLowerCase().includes(q) ||
    c.id.toLowerCase().includes(q) ||
    (c.description || "").toLowerCase().includes(q)
  );
  renderSidebar(filtered);
  if (current) {
    const active = cmdList.querySelector(`[data-id="${current.id}"]`);
    if (active) active.classList.add("active");
  }
});

// ── Command select ────────────────────────────────────────────────────────────
function selectCommand(id) {
  current = commands.find(c => c.id === id) || null;
  if (!current) return;

  // Update sidebar active state
  cmdList.querySelectorAll(".cmd-item").forEach(el => {
    el.classList.toggle("active", el.dataset.id === id);
  });

  // Header
  cmdTitle.textContent = current.name;
  cmdDesc.textContent  = current.description || "";

  cmdBadgeWrap.innerHTML = "";
  const b = document.createElement("span");
  b.className = "badge " + (current.danger ? "badge-danger" : "badge-read");
  b.textContent = current.danger ? "⚠ Dangerous" : "Read-only";
  cmdBadgeWrap.appendChild(b);

  // Args
  argsFields.innerHTML = "";
  for (const argName of current.allowedArgs || []) {
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
    inp.placeholder = argName;
    inp.addEventListener("input", updateRunBtn);

    g.appendChild(lbl);
    g.appendChild(inp);
    argsFields.appendChild(g);
  }

  // Danger confirm
  if (current.danger) {
    confirmBox.classList.remove("hidden");
    confirmWord.textContent = current.confirmText;
    confirmInput.value = "";
    runBtn.classList.add("danger-mode");
  } else {
    confirmBox.classList.add("hidden");
    runBtn.classList.remove("danger-mode");
  }

  runHint.textContent = current.allowedArgs.length
    ? `${current.allowedArgs.length} arg${current.allowedArgs.length > 1 ? "s" : ""}`
    : "No args required";

  updateRunBtn();
  clearOutput();
}

function getArgs() {
  const args = {};
  argsFields.querySelectorAll("input[data-arg-name]").forEach(inp => {
    if (inp.value.trim()) args[inp.dataset.argName] = inp.value.trim();
  });
  return args;
}

// ── Run ───────────────────────────────────────────────────────────────────────
function updateRunBtn() {
  if (!current || running) { runBtn.disabled = true; return; }
  if (current.danger && confirmInput.value !== current.confirmText) {
    runBtn.disabled = true; return;
  }
  runBtn.disabled = false;
}

confirmInput.addEventListener("input", updateRunBtn);

async function runCommand() {
  if (!current || running || runBtn.disabled) return;

  running = true;
  runBtn.disabled = true;
  runLabel.textContent = "Running";
  runSpinner.classList.remove("hidden");
  clearOutput();
  showPlaceholder(false);

  const body = { commandId: current.id, args: getArgs() };
  if (current.danger) body.confirmText = confirmInput.value;

  try {
    const res = await fetch("/api/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (!res.ok) {
      showError(data.error || JSON.stringify(data));
    } else {
      const payload = data.result ?? data.raw ?? data;
      showJson(payload);
      copyBtn.classList.remove("hidden");
    }
  } catch (err) {
    showError(`Request failed: ${err.message}`);
  } finally {
    running = false;
    runLabel.textContent = "Run";
    runSpinner.classList.add("hidden");
    updateRunBtn();
  }
}

runBtn.addEventListener("click", runCommand);

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
}

function showJson(data) {
  const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  outputEl.innerHTML = syntaxHighlight(text);
  outputEl.classList.remove("hidden");
  outputPlaceholder.style.display = "none";
  outputEl._rawText = text;
}

function showError(msg) {
  outputEl.innerHTML = `<span class="json-err">${escHtml(msg)}</span>`;
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
  return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
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
    clearOutput();
    if (confirmInput) confirmInput.value = "";
    updateRunBtn();
  }
  if ((e.metaKey || e.ctrlKey) && e.key === "k") {
    e.preventDefault();
    cmdSearch.focus();
    cmdSearch.select();
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
init();
