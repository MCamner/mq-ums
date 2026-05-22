"use strict";

const fs = require("fs");
const path = require("path");

const CONFIG_PATH = path.resolve(__dirname, "../../config/commands.json");

function validateConfig(configPath = CONFIG_PATH) {
  let raw;
  try {
    raw = fs.readFileSync(configPath, "utf8");
  } catch (err) {
    throw new Error(`Cannot read commands.json: ${err.message}`);
  }

  let config;
  try {
    config = JSON.parse(raw);
  } catch (err) {
    throw new Error(`commands.json is not valid JSON: ${err.message}`);
  }

  if (!Array.isArray(config.commands)) {
    throw new Error("commands.json must have a top-level 'commands' array");
  }

  const ids = new Set();
  for (const cmd of config.commands) {
    if (!cmd.id || typeof cmd.id !== "string") throw new Error(`Command missing 'id': ${JSON.stringify(cmd)}`);
    if (!cmd.psCommand || typeof cmd.psCommand !== "string") throw new Error(`Command '${cmd.id}' missing 'psCommand'`);
    if (!Array.isArray(cmd.allowedArgs)) throw new Error(`Command '${cmd.id}' missing 'allowedArgs' array`);
    for (const arg of cmd.allowedArgs) {
      if (typeof arg !== "string" || !/^[A-Za-z]\w{0,63}$/.test(arg)) {
        throw new Error(`Command '${cmd.id}' has unsafe arg name: '${arg}'`);
      }
    }
    if (typeof cmd.danger !== "boolean") throw new Error(`Command '${cmd.id}' missing 'danger' boolean`);
    if (cmd.danger && !cmd.confirmText) throw new Error(`Command '${cmd.id}' is danger but missing 'confirmText'`);

    // Only allow safe characters in psCommand to prevent injection
    if (!/^[A-Za-z]+-[A-Za-z]+$/.test(cmd.psCommand)) {
      throw new Error(`Command '${cmd.id}' has unsafe psCommand: '${cmd.psCommand}'`);
    }

    if (ids.has(cmd.id)) throw new Error(`Duplicate command id: '${cmd.id}'`);
    ids.add(cmd.id);
  }

  return config;
}

module.exports = { validateConfig };

if (require.main === module) {
  try {
    const config = validateConfig();
    console.log(`OK: ${config.commands.length} commands validated`);
    process.exit(0);
  } catch (err) {
    console.error(`FAIL: ${err.message}`);
    process.exit(1);
  }
}
