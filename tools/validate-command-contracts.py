#!/usr/bin/env python3
"""Cross-check command YAML contracts against the runtime JSON allowlist."""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _scalar(value: str):
    value = value.strip()
    if value in {"true", "false"}:
        return value == "true"
    if value == "[]":
        return []
    if len(value) >= 2 and value[0] == value[-1] == '"':
        return value[1:-1]
    return value


def load_contract(path: Path) -> dict:
    contract: dict = {"inputs": []}
    in_inputs = False
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.split("#", 1)[0].rstrip()
        if not line:
            continue
        if line == "inputs:":
            in_inputs = True
            continue
        match = re.match(r"^  - name:\s*(.+)$", line)
        if in_inputs and match:
            contract["inputs"].append({"name": _scalar(match.group(1))})
            continue
        match = re.match(r"^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$", line)
        if match:
            in_inputs = False
            contract[match.group(1)] = _scalar(match.group(2))
    return contract


def validate(config_path: Path, contracts_dir: Path) -> list[str]:
    commands = json.loads(config_path.read_text(encoding="utf-8"))["commands"]
    by_id = {str(command["id"]): command for command in commands}
    errors: list[str] = []
    contracts: dict[str, tuple[Path, dict]] = {}
    for path in sorted(contracts_dir.glob("*.yaml")):
        contract = load_contract(path)
        command_id = str(contract.get("id", ""))
        if not command_id:
            errors.append(f"{path.name}: missing id")
        elif command_id in contracts:
            errors.append(f"duplicate contract id: {command_id}")
        else:
            contracts[command_id] = (path, contract)

    for command_id in sorted(set(by_id) - set(contracts)):
        errors.append(f"missing contract for command: {command_id}")
    for command_id in sorted(set(contracts) - set(by_id)):
        errors.append(f"contract has no runtime command: {command_id}")

    for command_id in sorted(set(by_id) & set(contracts)):
        command = by_id[command_id]
        path, contract = contracts[command_id]
        expected = {
            "section": command.get("section", ""),
            "psCommand": command.get("psCommand", ""),
            "danger": command.get("danger"),
            "confirmText": command.get("confirmText", ""),
            "inputs": command.get("allowedArgs", []),
        }
        actual = {
            "section": contract.get("section", ""),
            "psCommand": contract.get("psCommand", ""),
            "danger": contract.get("danger"),
            "confirmText": contract.get("confirmText", ""),
            "inputs": [item.get("name", "") for item in contract.get("inputs", []) if isinstance(item, dict)],
        }
        for field in expected:
            if actual[field] != expected[field]:
                errors.append(
                    f"{path.name}: {field} mismatch: contract={actual[field]!r} runtime={expected[field]!r}"
                )
    return errors


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=Path, default=ROOT / "config" / "commands.json")
    parser.add_argument("--contracts", type=Path, default=ROOT / "docs" / "contracts")
    args = parser.parse_args()
    errors = validate(args.config, args.contracts)
    if errors:
        for error in errors:
            print(f"FAIL: {error}")
        return 1
    count = len(json.loads(args.config.read_text(encoding="utf-8"))["commands"])
    print(f"OK: {count} command contracts match commands.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
