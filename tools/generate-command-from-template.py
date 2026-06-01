#!/usr/bin/env python3
"""
Generate commands.json entry, COMMANDS.md section, and optional Python wrapper
from a filled command-contract.yaml.

Usage:
  python3 tools/generate-command-from-template.py <contract.yaml>
  python3 tools/generate-command-from-template.py <contract.yaml> --apply
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
COMMANDS_JSON = REPO_ROOT / "config" / "commands.json"
COMMANDS_MD = REPO_ROOT / "docs" / "COMMANDS.md"

try:
    import yaml  # type: ignore[import]
except ImportError:
    sys.exit("Error: PyYAML not installed. Run: pip3 install pyyaml")


def load_contract(path: Path) -> dict:
    raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    if not isinstance(raw, dict):
        sys.exit(f"Error: {path} must be a YAML mapping")
    return raw


def validate(c: dict) -> list[str]:
    errors = []
    for field in ("id", "name", "section", "psCommand", "description"):
        if not c.get(field):
            errors.append(f"Missing required field: {field}")
    if "danger" not in c:
        errors.append("Missing required field: danger")
    if c.get("danger") and not c.get("confirmText"):
        errors.append("danger: true requires confirmText")
    for inp in c.get("inputs", []):
        name = inp.get("name", "")
        if not re.match(r"^[A-Za-z]\w{0,63}$", name):
            errors.append(f"Unsafe input name: '{name}'")
    return errors


def build_json_entry(c: dict) -> dict:
    entry: dict = {
        "id": c["id"],
        "section": c["section"],
        "name": c["name"],
        "psCommand": c["psCommand"],
        "allowedArgs": [inp["name"] for inp in c.get("inputs", [])],
        "danger": bool(c.get("danger", False)),
        "description": c["description"],
    }
    if c.get("confirmText"):
        entry["confirmText"] = c["confirmText"]
    return entry


def build_markdown_section(c: dict) -> str:
    lines = []
    lines.append(f"### {c['name']}")
    lines.append("")
    lines.append(f"**PSIGEL command:** `{c['psCommand']}`")
    if c.get("confirmText"):
        lines.append(f"**Confirmation required:** `{c['confirmText']}`")
    lines.append("")
    lines.append(c["description"])
    inputs = c.get("inputs", [])
    if inputs:
        lines.append("")
        lines.append("| Arg | Required | Notes |")
        lines.append("|---|---|---|")
        for inp in inputs:
            req = "Yes" if inp.get("required") else "Optional"
            notes = inp.get("notes", "")
            lines.append(f"| {inp['name']} | {req} | {notes} |")
    lines.append("")
    lines.append("---")
    lines.append("")
    return "\n".join(lines)


def build_python_wrapper(c: dict) -> str:
    fn_name = c["id"].replace("-", "_")
    params = [inp["name"].lower() for inp in c.get("inputs", [])]
    param_str = ", ".join(f"{p}: str" for p in params)
    args_dict = "{" + ", ".join(f'"{inp["name"]}": {inp["name"].lower()}' for inp in c.get("inputs", [])) + "}"
    lines = [
        f'def {fn_name}({param_str}) -> dict:',
        f'    """',
        f'    {c["description"]}',
        f'    """',
        f'    return run_command(',
        f'        command_id="{c["id"]}",',
        f'        args={args_dict},',
    ]
    if c.get("confirmText"):
        lines.append(f'        confirm_text="{c["confirmText"]}",')
    lines += ["    )", ""]
    return "\n".join(lines)


def apply_to_commands_json(entry: dict) -> str:
    data = json.loads(COMMANDS_JSON.read_text(encoding="utf-8"))
    existing_ids = [cmd["id"] for cmd in data["commands"]]
    if entry["id"] in existing_ids:
        return f"skipped — '{entry['id']}' already exists in commands.json"
    data["commands"].append(entry)
    COMMANDS_JSON.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return f"appended '{entry['id']}' to commands.json"


def apply_to_commands_md(section: str, c: dict) -> str:
    content = COMMANDS_MD.read_text(encoding="utf-8")
    marker = f"### {c['name']}"
    if marker in content:
        return f"skipped — '{c['name']}' already in COMMANDS.md"
    heading = f"\n## {c['section']}\n"
    if heading in content:
        insert_pos = content.rfind(heading) + len(heading)
        content = content[:insert_pos] + "\n" + section + content[insert_pos:]
    else:
        content = content.rstrip() + f"\n\n## {c['section']}\n\n" + section
    COMMANDS_MD.write_text(content, encoding="utf-8")
    return f"appended '{c['name']}' to COMMANDS.md"


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate mq-ums command artefacts from a contract YAML.")
    parser.add_argument("contract", type=Path, help="Path to filled command-contract.yaml")
    parser.add_argument("--apply", action="store_true", help="Write changes to commands.json and COMMANDS.md")
    args = parser.parse_args()

    if not args.contract.exists():
        sys.exit(f"Error: {args.contract} not found")

    c = load_contract(args.contract)
    errors = validate(c)
    if errors:
        for e in errors:
            print(f"Validation error: {e}", file=sys.stderr)
        return 1

    entry = build_json_entry(c)
    md_section = build_markdown_section(c)

    print("=== commands.json entry ===")
    print(json.dumps(entry, indent=2))
    print()
    print("=== COMMANDS.md section ===")
    print(md_section)

    if c.get("python_wrapper"):
        print("=== Python wrapper ===")
        print(build_python_wrapper(c))

    if args.apply:
        print("=== Applying ===")
        print(apply_to_commands_json(entry))
        print(apply_to_commands_md(md_section, c))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
