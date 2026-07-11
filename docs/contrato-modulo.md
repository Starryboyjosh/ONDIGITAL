# Contrato de módulo de negocio (Fase 2.1)

> Cada suite ONDIGITAL se **ensambla** a partir de módulos. Vito no es un producto aparte: se **enchufa** a las capacidades que cada módulo registra.

Implementación Go: `modules/modkit` (`ondigital.hn/modkit`).

---

## Qué es un módulo

Un **módulo** es un bloque reutilizable (inventario, agenda, facturación…) que:

1. Expone **capacidades** de consulta y/o acción.
2. Puede registrar **tools de Vito** (misma semántica white-label que Fase 1).
3. **Funciona sin Vito** (plan Starter/Business).

| Campo | Ejemplo |
|-------|---------|
| ID | `onstock` |
| Nombre | OnStock |
| Versión | `1.0.0` |
| Capacidades | `onstock.inventory.low_stock` (query), `onstock.purchases.restock_po` (action) |

---

## Capacidad

| Campo | Descripción |
|-------|-------------|
| `id` | Estable y con namespace (`dominio.area.accion`) |
| `name` | Etiqueta corta en español |
| `description` | Texto para catálogo / prompts |
| `kind` | `query` (solo lectura) o `action` (mutación) |
| `vito_tool` | Nombre del tool en `vito.Registry` (si aplica) |
| `read_only` | `true` en queries; `false` en actions |

**Actions** expuestas a Vito requieren confirmación en UI (`ConfirmAction` / `POST /api/vito/confirm`).

---

## Ciclo de vida en un host (suite)

```text
1. Abrir store / datos del cliente (tenant)
2. Catalog.Register(móduloOnStock)
3. Catalog.Register(móduloAgenda)   // futuros
4. Si Vito enabled:
     reg := vito.NewRegistry()
     catalog.RegisterAllVitoTools(reg)
     vito.NewServiceFromEnv(reg)
5. HTTP:
     GET  /api/modules       → catálogo público
     GET  /api/vito/status
     POST /api/vito/ask
     POST /api/vito/confirm
6. UI de negocio independiente de Vito
```

---

## Contrato con Vito (recordatorio)

- Tools: ver `modules/vito/README.md`
- Respuestas con `citations` de negocio
- Nunca filtrar nombre de proveedor de IA a la UI
- Host sin key / `VITO_ENABLED=false` → suite usable

---

## OnStock (2.2)

Módulo `onstock` implementado en `onstock/internal/vitohost` como `modkit.Module`:

| Capacidad | Tool Vito | Kind |
|-----------|-----------|------|
| Stock bajo | `list_low_stock` | query |
| Resumen ventas | `sales_summary` | query |
| Top productos | `top_products` | query |
| Rotación lenta | `slow_products` | query |
| OC de reposición | `create_restock_po` | action |

---

## Credental (2.3 ✅)

Runtime JS (local-first + Firebase opcional):

| Pieza | Ruta |
|-------|------|
| Contrato JS | `credental/js/modkit.js` |
| Capa híbrida (status) | `credental/js/data-hybrid.js` |
| Módulo + tools Vito | `credental/js/vito/module.js` |
| Seed demo | `credental/js/vito/seed-demo.js` |
| UI | `credental/vito.html` |

| Capacidad | Tool Vito | Kind |
|-----------|-----------|------|
| `credental.agenda.list_day` | `list_appointments` | query |
| `credental.billing.balances` | `list_patients_balance` | query |
| `credental.patients.summary` | `patient_summary` | query |
| `credental.ops.snapshot` | `clinic_snapshot` | query |

Política de datos: **local-first** (`sessionStorage`); sync cloud opcional vía `db.js` + Firebase.

---

## Biblioteca (2.5)

El catálogo vivo de una instancia se consulta en:

```http
GET /api/modules
```

Documentación de ensamblado de cliente nuevo: Fase 4 + este contrato.
