# OnStudio — Catálogo de Plantillas Pro

> Las **plantillas Pro** son las apps de alta calidad ya escritas por el equipo de
> ONDIGITAL. OnStudio las clona y rebrandea para un nuevo negocio. Este documento
> mapea cada plantilla a su **producto fuente** en el repo y describe para qué
> sirve. El manifest operable (que lee la implementación) vivirá en
> `onstudio/templates/MANIFEST.md`.

> **Estado (Phase 6):** las dos bases **static-HTML** propias ya están
> productizadas en `onstudio/templates/<id>/` (con `template.json`) y viajan
> **embebidas en el binario** (`//go:embed templates`). Las plantillas de apps Go
> (`dental-saas`, `pos-inventory-erp`, `restaurant-ops`) quedan **solo-catálogo a
> propósito**: el pipeline emite/sirve archivos estáticos, así que solo las bases
> static-HTML sirven como material de clonado hoy. Para esas tres, la "Fuente"
> apunta al producto original del repo (referencia), no a una copia productizada.

## Cómo se usa el catálogo

1. El intake produce `industry` + `site_type` (ver
   [`generation-pipeline.md`](generation-pipeline.md)).
2. El pipeline busca la plantilla cuyo `match` cubre ese par.
3. Si no hay match exacto → cae a la genérica más cercana y lo anota en el job.
4. El motor (OpenCode + skills) rebrandea la plantilla siguiendo
   `skills/product/onstudio-generator/references/rebrand-rules.md`.

## Plantillas

### `landing-institucional`  ✅ productizada
- **Fuente:** OnStudio Pro · base propia (estilo ONDIGITAL). Base limpia escrita
  para OnStudio en `onstudio/templates/landing-institucional/` (HTML + CSS + JS +
  `favicon.svg` + `template.json`), inspirada en `Pagina_Web_Original/`.
- **Stack:** HTML/CSS/JS estático, sin build.
- **Para:** sitio institucional / landing de empresa (hero, servicios, proceso,
  galería, contacto + FAB de WhatsApp). Es también la **fuente de marca** (robot
  SVG inline con `--robot-*`, tema claro por defecto + company-colors opt-in).
- **`site_type`:** `landing`, `catalog`, `sitio-informativo`.
- **Match:** servicios, retail, alimentos, salud, educación, construcción, turismo,
  belleza, profesional; "presencia web" general.
- **Notas:** default del selector para presencia + contacto. Placeholders
  `{{...}}` para rebrand; teléfono/RTN de muestra (`+504 0000-0000`), sin secretos.

### `dental-saas`  — solo-catálogo (por diseño)
- **Fuente:** `credental/` (multipágina: agenda, pacientes, odontograma,
  periodontograma, presupuestos, cobranzas, caja, facturación, inventario,
  laboratorios, comunicaciones, reportes, usuarios, configuración).
- **Stack:** HTML/CSS/JS vanilla, sin build; auth y storage **demo-grade**.
- **Para:** producto SaaS operativo denso con muchos módulos. Plantilla de
  referencia para clínicas/consultorios y, en general, software de gestión por
  módulos con navegación lateral.
- **`site_type`:** `saas`.
- **Match:** salud, clínicas, consultorios; o cualquier "panel con módulos".
- **Notas:** al rebrandear, marcar claramente que auth/almacenamiento son demo,
  no producción clínica (igual que el fuente).

### `pos-inventory-erp`  — solo-catálogo (por diseño)
- **Fuente:** `onstock/` (Go + `//go:embed web` + SQLite; POS, productos,
  inventario, compras, proveedores, gastos, reportes, exportaciones).
- **Stack:** Go un binario + UI vanilla embebida + SQLite.
- **Para:** mini-ERP local de tienda/microempresa con punto de venta e inventario.
- **`site_type`:** `pos` / `erp-lite`.
- **Match:** retail, tiendas, abarroterías, inventario, ventas con stock.
- **Notas:** lógica sensible (costo promedio, reversa de stock, ISV/ISR). El
  rebrand **no** debe alterar cálculos financieros; solo marca/copy/colores.

### `restaurant-ops`  — solo-catálogo (por diseño)
- **Fuente:** `onserve/` (Go + embed + SQLite; salón en vivo, mesas, comandas,
  KDS, caja con propina, menú con ISV, dashboard).
- **Stack:** Go un binario + UI vanilla embebida + SQLite.
- **Para:** operación de restaurante/cafetería (mesas, cocina, caja).
- **`site_type`:** `restaurant`.
- **Match:** restaurantes, cafés, comida; operación de salón + cocina + caja.
- **Notas:** facturación SAR modelada como registro local (no XML/firma). Mantener
  esa frontera al rebrandear.

### `saas-dashboard-generic`  ✅ productizada
- **Fuente:** OnStudio Pro · base propia (estilo ONDIGITAL). **Decisión Phase 6:**
  se materializó como **prototipo estático** (no app Go), en
  `onstudio/templates/saas-dashboard-generic/` (sidebar colapsable + topbar + KPIs +
  tabla de muestra + estados vacíos). Así encaja con el pipeline, que emite/sirve
  archivos estáticos.
- **Para:** **fallback** SaaS cuando el rubro no calza con dental/POS/restaurante:
  dashboard operativo genérico con login/datos **de muestra**, navegación lateral y
  módulos. Su `template.json` marca explícitamente "PROTOTIPO estático demo: NO
  presentar como producción".
- **`site_type`:** `saas` (genérico).
- **Match:** cualquier "panel/SaaS" sin vertical específica.
- **Notas:** es la red de seguridad del selector de plantillas. Robot + tema claro
  por defecto + company-colors opt-in; sin secretos ni datos reales.

## Tabla resumen (mapeo)

| Plantilla | Fuente | Stack | `site_type` | Rubro típico | Productizada |
| --- | --- | --- | --- | --- | --- |
| `landing-institucional` | base propia (estilo ONDIGITAL) | estático | `landing`/`catalog`/`sitio-informativo` | servicios/retail/alimentos… | ✅ sí (embebida) |
| `dental-saas` | `credental/` | estático multipágina | `saas-clinico` | salud/clínicas | catálogo |
| `pos-inventory-erp` | `onstock/` | Go+embed+SQLite | `pos`/`erp-lite` | retail/inventario | catálogo |
| `restaurant-ops` | `onserve/` | Go+embed+SQLite | `restaurant` | restaurantes/cafés | catálogo |
| `saas-dashboard-generic` | base propia (estilo ONDIGITAL) | estático (prototipo) | `saas` | fallback genérico | ✅ sí (embebida) |

## Reglas para productizar (Phase 6)

- **Solo se productizan plantillas static-HTML.** El pipeline emite un
  `{"files":[…]}` que se escribe y se sirve como archivos estáticos
  (`preview`/`download`), así que únicamente las bases static-HTML pueden clonarse y
  rebrandearse hoy. Las plantillas **go-embed-sqlite** (`dental-saas`,
  `pos-inventory-erp`, `restaurant-ops`) se quedan **solo-catálogo a propósito**:
  son referencia de módulos/marca, no material de clonado. Materializar una app Go
  como plantilla generable es trabajo futuro (requeriría que el pipeline produzca y
  ejecute proyectos Go, no solo estáticos).
- La plantilla limpia vive en `onstudio/templates/<id>/`: sin datos reales, sin
  `data/*.db`, sin secretos, sin `legacy/`/`dist/`.
- Cada plantilla incluye su propio `template.json` (id, `name`, `source`, `stack`,
  `site_type`, `entry`, `match`, `rebrand_points`, `protected`) — contrato definido
  en `skills/product/onstudio-generator/references/template-manifest.md` y validado
  con `DisallowUnknownFields` por `templates.LoadFS`.
- Las plantillas viajan **embebidas** en el binario (`//go:embed templates`); el
  arranque las carga y degrada al catálogo base si alguna es inválida.
- Mantener calidad Pro: el rebrand **no** degrada el template; solo lo adapta.
- Respetar marca: robot logo + tema claro por defecto + company-colors opt-in.
