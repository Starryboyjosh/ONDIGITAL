# Checklist — Con y sin Vito (Fase 2.4)

Verificado en la sesión de cierre de Fase 2. Repetir tras cambios grandes.

## OnStock

### Con Vito (`VITO_ENABLED=true`, provider mock o API)

```bash
cd onstock && make dev
# o: VITO_ENABLED=true VITO_PROVIDER=mock go run . -no-open
```

| Check | Cómo | OK |
|-------|------|----|
| Status activo | `GET /api/vito/status` → `enabled: true` | ✅ |
| Módulos | `GET /api/modules` → `onstock` + capacidades | ✅ |
| Negocio | Dashboard / productos cargan | ✅ |
| Vito datos | `POST /api/vito/ask` stock bajo → reply + citations | ✅ |
| UI | `#/vito` muestra chat white-label | ✅ |

### Sin Vito (`VITO_ENABLED=0`)

| Check | Cómo | OK |
|-------|------|----|
| Status off | `enabled: false`, mensaje amable | ✅ |
| Módulos | `/api/modules` sigue listando OnStock | ✅ |
| Negocio | Dashboard + `/api/products` OK | ✅ |
| No crash | Servidor arranca sin key / sin provider | ✅ |

## Credental

### Sin abrir Vito (plan Starter/Business)

| Check | Cómo | OK |
|-------|------|----|
| Dashboard | `dashboard.html` carga | ✅ |
| Agenda / pacientes | páginas de negocio independientes | ✅ |
| Datos | `db.js` local-first sin Vito | ✅ |

### Con Vito (Enterprise AI en la clínica)

```bash
cd credental && python3 -m http.server 8090
# http://localhost:8090/vito.html
```

| Check | Cómo | OK |
|-------|------|----|
| Seed demo | primera visita sin pacientes | ✅ |
| Citas | pregunta mañana/hoy + fuente Agenda | ✅ |
| Saldos | pregunta saldos + fuente Cobranzas | ✅ |
| Catálogo módulo | panel lateral capacidades `credental.*` | ✅ |
| White-label | solo “Vito” en UI | ✅ |

## Principio

> La suite es el producto; **Vito es un enchufe opcional** sobre el catálogo de módulos.
