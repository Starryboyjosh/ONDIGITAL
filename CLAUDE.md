@AGENTS.md

# Claude Code

`AGENTS.md` is the shared source of truth for Claude Code and Codex. Keep this file limited to Claude-specific operating notes.

## Combo Workflow

- Before modifying code, explain the short plan and name the product area being touched.
- When the user asks to implement the repo broadly, run the Graphify workflow in `docs/graphify.md` before editing code.
- Use `docs/auditoria-estatica-ondigital.md` for the baseline and `docs/plan-implementacion-super-v2.md` as the implementation source of truth when starting a fresh Claude Code session for repo-wide work.
- Use one writer at a time in the same working tree. If Codex is running `/codex:rescue` on files, wait for `/codex:result` before editing those same files in Claude.
- Preferred loop: Claude implements and verifies, Codex reviews read-only, Claude applies valid findings, then checks run again.
- Use `/codex:review --base main --background` for a normal review before shipping.
- Use `/codex:adversarial-review --base main --background <focus>` when the implementation needs pressure-testing around security, data loss, architecture, accounting, or UX tradeoffs.
- Keep `/codex:setup --enable-review-gate` disabled unless someone is actively monitoring the session; it can create long review loops and consume usage quickly.
