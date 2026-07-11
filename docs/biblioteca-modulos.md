# Biblioteca de módulos ONDIGITAL (Fase 2.5)

Catálogo de bloques reutilizables para ensamblar el “departamento tecnológico” de un cliente.
Contrato técnico: [contrato-modulo.md](contrato-modulo.md) · Go: `modules/modkit` · Vito: `modules/vito`.

---

## Módulos disponibles hoy

| ID | Nombre | Runtime | Capacidades (resumen) | Vito |
|----|--------|---------|----------------------|------|
| `onstock` | OnStock | Go + SQLite + SPA | Inventario, ventas, compras, reportes HN | Sí (tools + UI `#/vito`) |
| `credental` | Credental | HTML/JS local-first (+ Firebase opcional) | Agenda, pacientes, presupuestos, cobranzas | Sí (tools + `vito.html`) |
| `vito` | Vito (capa IA) | Go lib / JS tools | Ask, confirm, providers mock/OpenAI-compatible | — (se enchufa a los demás) |

### OnStock — capacidades

| Capacidad | Tool Vito | Kind |
|-----------|-----------|------|
| `onstock.inventory.low_stock` | `list_low_stock` | query |
| `onstock.sales.summary` | `sales_summary` | query |
| `onstock.sales.top_products` | `top_products` | query |
| `onstock.inventory.slow_movers` | `slow_products` | query |
| `onstock.purchases.restock_po` | `create_restock_po` | action |

Descubrimiento en runtime:

```http
GET /api/modules
```

### Credental — capacidades

| Capacidad | Tool Vito | Kind |
|-----------|-----------|------|
| `credental.agenda.list_day` | `list_appointments` | query |
| `credental.billing.balances` | `list_patients_balance` | query |
| `credental.patients.summary` | `patient_summary` | query |
| `credental.ops.snapshot` | `clinic_snapshot` | query |

Descubrimiento en UI: panel lateral de `credental/vito.html` (catálogo `Modkit`).

---

## Plan comercial ↔ módulos

| Plan | Módulos de negocio | Vito |
|------|--------------------|------|
| **Starter** | Suite del cliente (p. ej. OnStock o Credental) en su infra | No |
| **Business** | Suite + módulos de biblioteca + infra administrada | No (opcional prep) |
| **Enterprise AI** | Todo Business + **Vito** enchufado a los mismos módulos | Sí |

La app **nunca** depende de Vito para operar (Starter/Business).

---

## Procedimiento para ensamblar un cliente nuevo

### 1. Definir el negocio

- Industria / procesos (tienda, clínica, otro).
- Plan: Starter / Business / Enterprise AI.
- Módulos base (hoy: `onstock` y/o `credental`; luego más de la biblioteca).

### 2. Provisionar la suite

| Módulo | Cómo se entrega |
|--------|-----------------|
| OnStock | Binario Go (`make build`) + carpeta `data/` + opcional `make seed-demo` para demos |
| Credental | Estáticos `credental/` servidos (nginx / Pi) + sessionStorage; seed en primera visita a Vito |
| Vito (Enterprise) | `.env` con `VITO_*` en el host Go; en Credental tools locales (backend híbrido opcional después) |

### 3. Configurar tenant / marca

- OnStock: ajustes de empresa (nombre, RTN, ISV) en Configuración.
- Credental: company + usuarios (auth demo) + branding.
- No mezclar datos de dos clientes en el mismo `data/` / mismo origen web sin aislamiento.

### 4. Enchufar Vito (solo Enterprise AI)

1. Host con tools del módulo (`RegisterVitoTools` / `VitoCredental`).
2. Key solo server-side (OnStock `.env`).
3. UI white-label: solo “Vito”.
4. Verificar `GET /api/vito/status` → enabled; pregunta canónica con **fuentes**.

### 5. Verificación de entrega

- [ ] Suite usable **sin** Vito (`VITO_ENABLED=0` o sin abrir panel Vito).
- [ ] Con Vito (si aplica): pregunta de negocio + citation.
- [ ] Backups: copiar `data/` (OnStock) / export/sync (Credental).
- [ ] Capacidades listadas en `/api/modules` o panel Credental.

### 6. Handoff

- Credenciales / URL de acceso.
- Plan y qué incluye (infra, módulos, Vito).
- Contacto ONDIGITAL para evolución de módulos.

---

## Cómo agregar un módulo nuevo a la biblioteca

1. Implementar `modkit.Module` (Go) o registro en `Modkit.catalog` (JS).
2. Definir `capabilities[]` con IDs estables `dominio.area.accion`.
3. Opcional: tools Vito (`read_only` / actions con confirmación).
4. Documentar fila en esta tabla.
5. Registrar en el host (`Catalog.Register`) al arrancar la suite.
6. Tests: módulo solo + suite con Vito off/on.

---

## Mapa de carpetas

```
modules/
  modkit/     # contrato Go
  vito/       # núcleo asistente
onstock/      # suite + módulo onstock
credental/    # suite + módulo credental (JS)
docs/
  contrato-modulo.md
  biblioteca-modulos.md   # este archivo
  demo-fase1-vito.md
```

---

## Relación con fases siguientes

- **Fase 3:** hosting demo (Pi) — **aplazada**.
- **Fase 4:** tenant/planes (`modules/tenant`), ledger (`modules/billing`), provisión:
  - [provision-cliente.md](provision-cliente.md)
  - [facturacion-suscripcion.md](facturacion-suscripcion.md)
  - [seguridad-demo-prod.md](seguridad-demo-prod.md)
