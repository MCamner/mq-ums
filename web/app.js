"use strict";

const select = document.getElementById("command-select");
const description = document.getElementById("command-description");
const argsSection = document.getElementById("args-section");
const confirmSection = document.getElementById("confirm-section");
const confirmWord = document.getElementById("confirm-word");
const confirmInput = document.getElementById("confirm-input");
const runBtn = document.getElementById("run-btn");
const output = document.getElementById("output");
const clearBtn = document.getElementById("clear-btn");

let commands = [];
let current = null;

async function loadCommands() {
  try {
    const res = await fetch("/api/commands");
    const data = await res.json();
    commands = data.commands || [];
    for (const cmd of commands) {
      const opt = document.createElement("option");
      opt.value = cmd.id;
      opt.textContent = cmd.name + (cmd.danger ? " ⚠" : "");
      select.appendChild(opt);
    }
  } catch (err) {
    showOutput(`Failed to load commands: ${err.message}`, true);
  }
}

function renderArgs(cmd) {
  argsSection.innerHTML = "";
  for (const argName of cmd.allowedArgs || []) {
    const group = document.createElement("div");
    group.className = "arg-group";
    const lbl = document.createElement("label");
    lbl.textContent = argName;
    lbl.setAttribute("for", `arg-${argName}`);
    const inp = document.createElement("input");
    inp.type = "text";
    inp.id = `arg-${argName}`;
    inp.dataset.argName = argName;
    inp.placeholder = argName;
    group.appendChild(lbl);
    group.appendChild(inp);
    argsSection.appendChild(group);
  }
}

function getArgs() {
  const args = {};
  for (const inp of argsSection.querySelectorAll("input[data-arg-name]")) {
    if (inp.value.trim()) args[inp.dataset.argName] = inp.value.trim();
  }
  return args;
}

function updateRunBtn() {
  if (!current) { runBtn.disabled = true; return; }
  if (current.danger && confirmInput.value !== current.confirmText) {
    runBtn.disabled = true; return;
  }
  runBtn.disabled = false;
}

function showOutput(text, isError = false) {
  output.textContent = text;
  output.className = isError ? "error" : "";
}

select.addEventListener("change", () => {
  current = commands.find((c) => c.id === select.value) || null;
  description.textContent = current ? current.description : "";
  renderArgs(current || { allowedArgs: [] });

  if (current?.danger) {
    confirmSection.classList.remove("hidden");
    confirmWord.textContent = current.confirmText;
    confirmInput.value = "";
  } else {
    confirmSection.classList.add("hidden");
  }

  updateRunBtn();
});

confirmInput.addEventListener("input", updateRunBtn);

runBtn.addEventListener("click", async () => {
  if (!current) return;
  runBtn.disabled = true;
  showOutput("Running...");

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
      showOutput(`Error ${res.status}: ${data.error || JSON.stringify(data)}`, true);
    } else {
      showOutput(JSON.stringify(data.result ?? data.raw ?? data, null, 2));
    }
  } catch (err) {
    showOutput(`Request failed: ${err.message}`, true);
  } finally {
    updateRunBtn();
  }
});

clearBtn.addEventListener("click", () => { output.textContent = ""; output.className = ""; });

loadCommands();
