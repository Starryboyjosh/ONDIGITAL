# Claude Code + Codex Combo

Este repo queda configurado para que Claude Code y Codex compartan las mismas reglas de proyecto:

- `AGENTS.md` es el archivo duradero que Codex lee automáticamente.
- `CLAUDE.md` importa `AGENTS.md` para Claude Code y agrega notas específicas de coordinación.
- `.codex/config.toml` configura Codex en este proyecto para usar `gpt-5.5` con razonamiento alto.
- `docs/graphify.md` define el pase Graphify para mapear el repo antes de implementaciones grandes.
- `docs/claude-implementation-prompt.md` contiene el prompt maestro listo para pegar en Claude Code.

Referencias oficiales:

- Codex plugin for Claude Code: `https://github.com/openai/codex-plugin-cc`
- Configuración de Codex y `AGENTS.md`: `https://developers.openai.com/codex/`
- Instalación de Claude Code: `https://code.claude.com/docs/en/setup`

## Verificación De Esta Máquina

Verificado el 2026-06-26 desde la raíz del repo:

- `codex` está disponible: `codex-cli 0.142.2`
- `node` está disponible: `v22.22.2`
- `npm` está disponible: `11.16.0`
- `claude` no apareció en esta shell

## Instalar O Verificar Herramientas

Verificar Codex:

```bash
codex --version
codex doctor
codex login
```

Instalar Claude Code en Linux/macOS/WSL con el instalador nativo recomendado por la documentación:

```bash
curl -fsSL https://claude.ai/install.sh | bash
claude --version
claude doctor
claude
```

Claude Code requiere una cuenta/plan que incluya acceso a Claude Code. Después de instalar, ejecutar `claude` en este repo y completar el login.

## Instalar El Plugin Codex En Claude Code

Ejecutar dentro de Claude Code:

```text
/plugin marketplace add openai/codex-plugin-cc
/plugin install codex@openai-codex
/reload-plugins
/codex:setup
```

Si `/codex:setup` indica que falta Codex, instalarlo:

```text
!npm install -g @openai/codex
!codex login
```

Comandos esperados del plugin:

```text
/codex:review
/codex:adversarial-review
/codex:rescue
/codex:transfer
/codex:status
/codex:result
/codex:cancel
/codex:setup
```

## Flujo Recomendado

Usar Claude como implementador principal y Codex como revisor crítico.

```text
Implementa la feature X en Credental. Mantén el cambio acotado y no hagas commit.
```

Luego correr una revisión read-only de Codex:

```text
/codex:adversarial-review --base main --background busca bugs, regresiones, seguridad, data loss, rutas rotas y alternativas más simples
/codex:status
/codex:result
```

Aplicar los hallazgos válidos en Claude y volver a ejecutar las verificaciones relevantes de `AGENTS.md`.

Para una revisión normal antes de entregar:

```text
/codex:review --base main --background
/codex:status
/codex:result
```

Para iniciar una implementación amplia del repo, pegar en Claude el prompt de:

```text
docs/claude-implementation-prompt.md
```

Ese prompt obliga a ejecutar Graphify, dividir por fases, no hacer commits y cerrar con revisión Codex.

Para delegar investigación o un parche pequeño:

```text
/codex:rescue --background investiga por qué falla el build y propón el parche mínimo
/codex:status
/codex:result
```

## Regla Para Trabajo Paralelo

No dejar que Claude y Codex editen el mismo working tree al mismo tiempo. Para trabajo paralelo real, usar Git worktrees separados:

```bash
git worktree add ../ONDIGITAL-claude -b ai/claude-feature
git worktree add ../ONDIGITAL-codex -b ai/codex-review
```

Mantener una rama por worktree y hacer merge/rebase solo después de revisar los diffs.

## Verificaciones Del Proyecto

Usar las verificaciones que correspondan al área modificada:

```bash
cd onstock
make test
```

Para Credental o páginas estáticas, levantar un servidor simple y probar las pantallas modificadas:

```bash
python3 -m http.server 4173
```

Abrir `http://localhost:4173/credental/` o la página HTML específica que se esté modificando.
