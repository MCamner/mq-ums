# Roadmap

`mq-ums` is a local web UI for managing IGEL UMS via PSIGEL and PowerShell.

## Current status

`v0.1.1` — working prototype, read-only verified, not yet tested against real UMS.

## Now — v0.1.x

Focus: verify the prototype works safely against a real IGEL UMS.

- [ ] Test `Get-UMSStatus`, `Get-UMSFirmware`, `Get-UMSDevice` against live UMS
- [ ] Verify credential loading and session teardown
- [ ] Add health endpoint `GET /api/health`
- [ ] Add dry-run mode (log command without executing)
- [ ] Add `tests/` with config validation smoke tests
- [ ] Add GitHub Pages landing page

## Next — v0.2.0

Focus: make it reliable enough for daily use.

- [ ] Pagination support for large device lists
- [ ] Filter/search in browser UI
- [ ] Response caching for read-only commands
- [ ] Improved error messages from PowerShell failures
- [ ] Command history in UI

## Later

- [ ] Role-based command profiles (read-only vs operator)
- [ ] Audit log
- [ ] Multi-UMS support
- [ ] Webhook notifications on dangerous command execution

## Security rules (permanent)

- No raw PowerShell from browser — ever
- All commands must be in `config/commands.json` allowlist
- Dangerous commands always require `confirmText: "RUN"`
- Bind to `127.0.0.1` by default
- Credentials via DPAPI only — never in `.env` or plaintext
