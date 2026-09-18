#!/usr/bin/env python3
"""Read-only comparison of the UMS release gate and its CI workflow surfaces."""
from __future__ import annotations

import re
import sys
import tempfile
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CI_ONLY = {
    "markdownlint.yml": "CI-only: Node markdownlint action; local READY does not attest Markdown style.",
    "release.yml": "CI-only: publishing a tag happens after preflight, not during it.",
}
STEPS = {
    "ci.yml": ["Install dependencies", "Validate commands.json", "Validate command contracts",
               "Run tests", "Read VERSION", "Check skills consistency",
               "package.json version matches VERSION", "README contains current version badge",
               "CHANGELOG contains current version", "docs/index.html contains current version"],
    "gate-parity.yml": ["Checkout", "Validate gate parity", "Test parity failures",
                        "Set up Node", "Install dependencies", "Check release READY"],
}
CI_COMMANDS = {
    "ci.yml": ["server/src/validate-config.js", "tools/validate-command-contracts.py",
               "npm test", "./scripts/check-skills.sh", 'require(\'./package.json\').version',
               "version-${VERSION}", "[${VERSION}]", "v${VERSION}"],
    "gate-parity.yml": ["python3 scripts/check-gate-parity.py", "--self-test",
                        "./release-check.sh --json"],
}
LOCAL_COMMANDS = {
    "config": 'run "commands.json validates" node "$ROOT/server/src/validate-config.js"',
    "contracts": 'run "command contracts match commands.json" python3 "$ROOT/tools/validate-command-contracts.py"',
    "tests": 'run "npm test" npm test --silent',
    "skills": 'run "check-skills.sh" bash "$ROOT/scripts/check-skills.sh"',
    "parity": 'run "check-gate-parity.py" python3 "$ROOT/scripts/check-gate-parity.py"',
}


def verify(root: Path) -> list[str]:
    errors: list[str] = []
    workflows = root / ".github" / "workflows"
    files = {p.name for p in workflows.glob("*.yml")} | {p.name for p in workflows.glob("*.yaml")}
    declared = set(STEPS) | set(CI_ONLY)
    for name in sorted(files - declared):
        errors.append(f"undeclared CI workflow: {name}")
    for name in sorted(declared - files):
        errors.append(f"declared CI workflow missing: {name}")
    for name, reason in CI_ONLY.items():
        if not reason.startswith("CI-only:") or len(reason.strip()) < 30:
            errors.append(f"CI-only workflow lacks a reason: {name}")
    for name, expected in STEPS.items():
        path = workflows / name
        if not path.is_file():
            continue
        text = path.read_text(encoding="utf-8")
        actual = re.findall(r"^\s*- name:\s*(.+?)\s*$", text, re.M)
        if Counter(actual) != Counter(expected):
            errors.append(f"CI steps changed without parity review: {name}: {actual!r}")
        for command in CI_COMMANDS[name]:
            if command not in text:
                errors.append(f"CI command missing in {name}: {command}")
    gate = root / "release-check.sh"
    if not gate.is_file():
        errors.append("release-check.sh missing")
    else:
        text = gate.read_text(encoding="utf-8")
        for label, command in LOCAL_COMMANDS.items():
            if command not in text:
                errors.append(f"local gate missing {label}: {command}")
    return errors


def self_test() -> int:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        workflows = root / ".github" / "workflows"
        workflows.mkdir(parents=True)
        gate = root / "release-check.sh"
        gate.write_text("\n".join(LOCAL_COMMANDS.values()))
        for name, steps in STEPS.items():
            (workflows / name).write_text("\n".join(f"      - name: {s}" for s in steps)
                                           + "\n" + "\n".join(CI_COMMANDS[name]))
        for name in CI_ONLY:
            (workflows / name).write_text("# CI-only\n")
        assert not verify(root), verify(root)
        original_gate = gate.read_text()
        gate.write_text(original_gate.replace(LOCAL_COMMANDS["skills"], ""))
        assert any("local gate missing skills" in e for e in verify(root))
        gate.write_text(original_gate)
        workflow = workflows / "ci.yml"
        original = workflow.read_text()
        workflow.write_text(original.replace("      - name: Check skills consistency", ""))
        assert any("CI steps changed" in e for e in verify(root))
        workflow.write_text(original.replace("./scripts/check-skills.sh", ""))
        assert any("CI command missing" in e for e in verify(root))
        workflow.write_text(original)
        (workflows / "unexpected.yml").write_text("on: push\n")
        assert any("undeclared CI workflow" in e for e in verify(root))
    print("PASS: baseline and four negative parity cases")
    return 0


if __name__ == "__main__":
    if sys.argv[1:] == ["--self-test"]:
        raise SystemExit(self_test())
    if len(sys.argv) != 1:
        raise SystemExit("usage: check-gate-parity.py [--self-test]")
    failures = verify(ROOT)
    for failure in failures:
        print(f"FAIL: {failure}")
    if failures:
        raise SystemExit(1)
    print("PASS: local/CI gate mappings and CI-only reasons declared")
