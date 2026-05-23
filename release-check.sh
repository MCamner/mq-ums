#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
VERSION="$(cat "$ROOT/VERSION")"
ERRORS=0

fail() { echo "FAIL: $1" >&2; ERRORS=$((ERRORS + 1)); }
ok()   { echo "OK:   $1"; }

echo "=== mq-ums release-check v${VERSION} ==="

# Config validation
echo ""
echo "--- Config ---"
if node "$ROOT/server/src/validate-config.js" > /dev/null 2>&1; then
  ok "commands.json validates"
else
  fail "commands.json validation failed — run: node server/src/validate-config.js"
fi

# Tests
echo ""
echo "--- Tests ---"
if (cd "$ROOT" && npm test --silent > /dev/null 2>&1); then
  ok "npm test"
else
  fail "npm test failed — run: npm test"
fi

# Version sync
echo ""
echo "--- Version sync ---"

PKG_VERSION="$(node -p "require('$ROOT/package.json').version" 2>/dev/null)"
if [[ "$PKG_VERSION" == "$VERSION" ]]; then
  ok "package.json version matches VERSION ($VERSION)"
else
  fail "package.json version '$PKG_VERSION' != VERSION '$VERSION'"
fi

if grep -q "version-${VERSION}" "$ROOT/README.md"; then
  ok "README.md contains version-${VERSION}"
else
  fail "README.md missing version-${VERSION} — update the badge"
fi

if grep -q "\[${VERSION}\]" "$ROOT/CHANGELOG.md"; then
  ok "CHANGELOG.md contains [${VERSION}]"
else
  fail "CHANGELOG.md missing [${VERSION}] entry"
fi

if grep -q "v${VERSION}" "$ROOT/docs/index.html"; then
  ok "docs/index.html contains v${VERSION}"
else
  fail "docs/index.html missing v${VERSION} — update the footer"
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

# Summary
echo ""
if [[ "$ERRORS" -eq 0 ]]; then
  echo "=== All checks passed — ready to release v${VERSION} ==="
else
  echo "=== $ERRORS check(s) failed — fix before releasing ===" >&2
  exit 1
fi
