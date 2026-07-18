#!/usr/bin/env bash
# Release readiness check for mq-ums. Read-only.
#
# Human mode (no flags / --dry-run): prints OK/FAIL per check, exits 1 on any
#   failure.
# Contract mode (--json): emits a repo_release_check.v1 object on stdout and
#   exits 0 (the `status` field carries the verdict). Consumed by mq-agent's
#   `stack release --all --preflight`.
# --dry-run is accepted for contract compatibility; this check is already
#   read-only, so it is a no-op.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT" || exit 1
VERSION="$(cat "$ROOT/VERSION")"

DRY_RUN=0
JSON=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --json) JSON=1 ;;
    *) echo "usage: ./release-check.sh [--dry-run] [--json]" >&2; exit 2 ;;
  esac
done
: "$DRY_RUN"

BLOCKERS=()
say()  { [[ "$JSON" -eq 1 ]] || echo "$1"; }
ok()   { [[ "$JSON" -eq 1 ]] || echo "OK:   $1"; }
fail() { BLOCKERS+=("$1"); [[ "$JSON" -eq 1 ]] || echo "FAIL: $1" >&2; }

run() {
  local label="$1"; shift
  local out
  if out="$("$@" 2>&1)"; then
    ok "$label"
  else
    fail "$label"
    [[ "$JSON" -eq 1 ]] || printf '%s\n' "$out" >&2
  fi
}

say "=== mq-ums release-check v${VERSION} ==="

say ""
say "--- Config ---"
run "commands.json validates" node "$ROOT/server/src/validate-config.js"

say ""
say "--- Tests ---"
run "npm test" npm test --silent

say ""
say "--- Version sync ---"
PKG_VERSION="$(node -p "require('$ROOT/package.json').version" 2>/dev/null)"
if [[ "$PKG_VERSION" == "$VERSION" ]]; then
  ok "package.json version matches VERSION ($VERSION)"
else
  fail "package.json version '$PKG_VERSION' != VERSION '$VERSION'"
fi

if grep -q "version-${VERSION}" "$ROOT/README.md"; then
  ok "README.md contains version-${VERSION}"
else
  fail "README.md missing version-${VERSION}"
fi

if grep -q "\[${VERSION}\]" "$ROOT/CHANGELOG.md"; then
  ok "CHANGELOG.md contains [${VERSION}]"
else
  fail "CHANGELOG.md missing [${VERSION}] entry"
fi

if grep -q "v${VERSION}" "$ROOT/docs/index.html"; then
  ok "docs/index.html contains v${VERSION}"
else
  fail "docs/index.html missing v${VERSION}"
fi

if [[ -f "$ROOT/docs/LIVE_UMS_VALIDATION.md" ]]; then
  ok "docs/LIVE_UMS_VALIDATION.md exists"
else
  fail "docs/LIVE_UMS_VALIDATION.md missing"
fi

if [[ -f "$ROOT/scripts/Test-LiveUmsValidation.ps1" ]]; then
  ok "scripts/Test-LiveUmsValidation.ps1 exists"
else
  fail "scripts/Test-LiveUmsValidation.ps1 missing"
fi

if [[ "$JSON" -eq 1 ]]; then
  status=READY
  [[ "${#BLOCKERS[@]}" -gt 0 ]] && status=BLOCKED
  python3 - "$status" "$VERSION" ${BLOCKERS[@]+"${BLOCKERS[@]}"} <<'PY'
import json
import sys

status, version, *blockers = sys.argv[1:]
print(json.dumps({
    "schema": "repo_release_check.v1",
    "repo": "mq-ums",
    "status": status,
    "blockers": blockers,
    "warnings": [],
    "evidence": {"version": version},
}))
PY
  exit 0
fi

say ""
if [[ "${#BLOCKERS[@]}" -eq 0 ]]; then
  echo "=== All checks passed — ready to release v${VERSION} ==="
else
  echo "=== ${#BLOCKERS[@]} check(s) failed — fix before releasing ===" >&2
  exit 1
fi
