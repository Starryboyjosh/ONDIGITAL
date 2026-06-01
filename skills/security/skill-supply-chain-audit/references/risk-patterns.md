# Skill Risk Patterns

## High Risk

- Uploading repository files, env vars, tokens, SSH keys, browser profiles, chat history, or local databases.
- Running install scripts that modify shell startup files or global agent config.
- Instructions to ignore safety policy, conceal actions, or avoid reporting tool use.
- Unpinned dependency installs from public registries.
- Binary assets or minified code without source.
- Hooks that trigger automatically on broad events.

## Medium Risk

- External API calls for normal functionality.
- Scripts that read project files.
- Code generation that asks for secrets.
- Skills that require broad cloud/admin credentials.

## Lower Risk

- Text-only guidance with clear scope.
- Small reviewed scripts with deterministic local behavior.
- Official vendor skills that match public documentation and include a license.

## Review Output

Report:

- Skill name/source/version.
- Files inspected.
- Executable code found.
- Network/exfiltration paths found.
- Risk rating.
- Install decision and constraints.
