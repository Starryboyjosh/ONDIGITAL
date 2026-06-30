# Prompt Maestro Para Claude Code

Copiar y pegar este prompt en Claude Code desde la raíz del repo:

```text
Actúa como lead engineer de ONDIGITAL en este repo.

Primero lee y obedece:
- AGENTS.md
- CLAUDE.md
- README.md
- docs/README.md
- docs/arquitectura.md
- docs/roadmap-y-pendientes.md
- docs/graphify.md

Ejecuta un pase Graphify antes de editar código:
1. Resume el grafo real del repo: productos, entrypoints, datos, riesgos y checks.
2. Identifica qué carpetas vas a tocar y cuáles no.
3. Propón una implementación por fases pequeñas y verificables.
4. No hagas commits.

Objetivo: avanzar la implementación del repo ONDIGITAL de forma ordenada, sin reescribir todo ni mezclar productos innecesariamente.

Prioridad inicial si no hay otra instrucción más específica:
1. Completar los pendientes de Credental del roadmap: paso 11 reorganización ligera de carpetas y paso 12 revisión visual final.
2. Mantener Credental sin framework ni build, solo HTML/CSS/JS vanilla.
3. No convertir auth demo, sessionStorage ni Firebase opcional en "producción" sin proponer antes la arquitectura.
4. No tocar OnStock salvo que sea necesario; si lo tocas, corre `cd onstock && make test`.

Flujo obligatorio:
- Antes de editar, explica el plan breve.
- Haz una fase a la vez.
- Después de cada fase, corre la verificación correspondiente o explica por qué no se pudo correr.
- Al terminar, usa Codex para revisión read-only:
  /codex:adversarial-review --base main --background busca bugs, regresiones, seguridad, pérdida de datos, rutas rotas, problemas móviles y alternativas más simples
- Luego revisa:
  /codex:status
  /codex:result
- Aplica solo hallazgos válidos y vuelve a verificar.

Entrega final:
- Resumen de cambios por archivo.
- Checks ejecutados y resultados.
- Riesgos pendientes.
- Siguiente fase recomendada.
```
