# Roadmap

`mq-ums` is a local web UI for managing IGEL UMS via PSIGEL and PowerShell.

## Current status

`v0.1.1` — working prototype, read-only verified, not yet tested against real UMS.

## Now — v0.1.x

Focus: verify the prototype works safely against a real IGEL UMS.

- [ ] Test `Get-UMSStatus`, `Get-UMSFirmware`, `Get-UMSDevice` against live UMS
- [ ] Verify credential loading and session teardown
- [x] Add health endpoint `GET /health` and `GET /api/health`
- [x] Add dry-run mode (preview command without executing)
- [x] Add audit log (`logs/audit-YYYY-MM-DD.jsonl`)
- [ ] Add `tests/` with config validation smoke tests
- [x] Add GitHub Pages landing page

## Next — v0.2.0

Focus: make it reliable enough for daily use.

- [ ] Pagination support for large device lists
- [ ] Filter/search in browser UI
- [ ] Response caching for read-only commands
- [ ] Improved error messages from PowerShell failures
- [ ] Command history in UI

## Later

- [ ] Role-based command profiles (read-only vs operator)
- [x] Audit log
- [ ] Multi-UMS support
- [ ] Webhook notifications on dangerous command execution

## Security rules (permanent)

- No raw PowerShell from browser — ever
- All commands must be in `config/commands.json` allowlist
- Dangerous commands always require `confirmText: "RUN"`
- Bind to `127.0.0.1` by default
- Credentials via DPAPI only — never in `.env` or plaintext
