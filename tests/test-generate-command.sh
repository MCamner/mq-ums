#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

GENERATOR="tools/generate-command-from-template.py"
EXAMPLE="docs/templates/command-contract-example.yaml"
TEMPLATE="docs/templates/command-contract.yaml"
TMP=$(mktemp /tmp/test-contract-XXXX.yaml)

echo "SMOKE: generate-command-from-template"

echo "[1/5] syntax"
python3 -m py_compile "$GENERATOR"

echo "[2/5] example contract produces JSON and markdown"
python3 "$GENERATOR" "$EXAMPLE" | grep -q '"id": "restart-device"'
python3 "$GENERATOR" "$EXAMPLE" | grep -q '"psCommand": "Restart-UMSDevice"'
python3 "$GENERATOR" "$EXAMPLE" | grep -q '### Restart Device'

echo "[3/5] python_wrapper output"
python3 "$GENERATOR" "$EXAMPLE" | grep -q 'def restart_device'

echo "[4/5] template file is valid YAML"
python3 -c "import yaml; yaml.safe_load(open('$TEMPLATE'))"

echo "[5/5] missing required field fails with exit 1"
cat > "$TMP" <<'YAML'
id: ""
name: ""
section: ""
psCommand: ""
description: ""
danger: false
YAML
python3 "$GENERATOR" "$TMP" && { echo "FAIL: should have exited 1"; exit 1; } || true

rm -f "$TMP"
echo "OK: generate-command-from-template smoke passed"
