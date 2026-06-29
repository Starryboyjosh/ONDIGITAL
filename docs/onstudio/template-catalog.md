# OnStudio — Catálogo de Plantillas Pro

> Las **plantillas Pro** son las apps de alta calidad ya escritas por el equipo de
> ONDIGITAL. OnStudio las clona y rebrandea para un nuevo negocio. Este documento
> mapea cada plantilla a su **producto fuente** en el repo y describe para qué
> sirve. El manifest operable (que lee la implementación) vivirá en
> `onstudio/templates/MANIFEST.md`.

> **Estado:** catálogo de diseño. En Phase 6 se extraen los archivos reales a
> `onstudio/templates/<id>/`. Hoy no se copia código; solo se cataloga el origen.

## Cómo se usa el catálogo

1. El intake produce `industry` + `site_type` (ver
   [`generation-pipeline.md`](generation-pipeline.md)).
2. El pipeline busca la plantilla cuyo `match` cubre ese par.
3. Si no hay match exacto → cae a la genérica más cercana y lo anota en el job.
4. El motor (OpenCode + skills) rebrandea la plantilla siguiendo
   `skills/product/onstudio-generator/references/rebrand-rules.md`.

## Plantillas

### `landing-institucional`
- **Fuente:** `Pagina_Web_Original/ondigital-landing-v2.html`
- **Stack:** HTML/CSS/JS estático, sin build.
- **Para:** sitio institucional / landing de empresa (servicios, proceso,
  equipo, contacto). Es también la **fuente de marca** (robot SVG, paleta navy,
  azul `#2b8af7`, teal `#00e5b0`).
- **`site_type`:** `landing`.
- **Match:** servicios, agencias, profesionales, "presencia web" general.
- **Notas:** ideal como default cuando el negocio solo quiere presencia + contacto.

### `dental-saas`
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

### `pos-inventory-erp`
- **Fuente:** `onstock/` (Go + `//go:embed web` + SQLite; POS, productos,
  inventario, compras, proveedores, gastos, reportes, exportaciones).
- **Stack:** Go un binario + UI vanilla embebida + SQLite.
- **Para:** mini-ERP local de tienda/microempresa con punto de venta e inventario.
- **`site_type`:** `pos` / `erp-lite`.
- **Match:** retail, tiendas, abarroterías, inventario, ventas con stock.
- **Notas:** lógica sensible (costo promedio, reversa de stock, ISV/ISR). El
  rebrand **no** debe alterar cálculos financieros; solo marca/copy/colores.

### `restaurant-ops`
- **Fuente:** `onserve/` (Go + embed + SQLite; salón en vivo, mesas, comandas,
  KDS, caja con propina, menú con ISV, dashboard).
- **Stack:** Go un binario + UI vanilla embebida + SQLite.
- **Para:** operación de restaurante/cafetería (mesas, cocina, caja).
- **`site_type`:** `restaurant`.
- **Match:** restaurantes, cafés, comida; operación de salón + cocina + caja.
- **Notas:** facturación SAR modelada como registro local (no XML/firma). Mantener
  esa frontera al rebrandear.

### `saas-dashboard-generic`
- **Fuente:** patrón derivado de `skills/product/saas-product-ui` + estilo común de
  `onstock/`/`onserve/`. (En Phase 6 se decide si se materializa como app Go o como
  prototipo estático.)
- **Para:** **fallback** SaaS cuando el rubro no calza con dental/POS/restaurante:
  dashboard operativo genérico con login demo, navegación lateral y módulos CRUD.
- **`site_type`:** `saas` (genérico).
- **Match:** cualquier "panel/SaaS" sin vertical específica.
- **Notas:** es la red de seguridad del selector de plantillas.

## Tabla resumen (mapeo)

| Plantilla | Fuente | Stack | `site_type` | Rubro típico |
| --- | --- | --- | --- | --- |
| `landing-institucional` | `Pagina_Web_Original/` | estático | `landing` | servicios/agencias |
| `dental-saas` | `credental/` | estático multipágina | `saas` | salud/clínicas |
| `pos-inventory-erp` | `onstock/` | Go+embed+SQLite | `pos`/`erp-lite` | retail/inventario |
| `restaurant-ops` | `onserve/` | Go+embed+SQLite | `restaurant` | restaurantes/cafés |
| `saas-dashboard-generic` | skill SaaS + estilo común | por definir | `saas` | fallback genérico |

## Reglas para productizar (Phase 6)

- Copiar a `onstudio/templates/<id>/` una versión **limpia** del fuente: sin datos
  reales, sin `data/*.db`, sin secretos, sin `legacy/`/`dist/`.
- Cada plantilla incluye su propio `template.json` (id, `site_type`, `match`,
  stack, puntos de rebrand) — contrato definido en
  `skills/product/onstudio-generator/references/template-manifest.md`.
- Las plantillas Go heredan el estilo OnStock/OnServe (Makefile `dev/test/build`,
  `//go:embed web`, SQLite `modernc.org/sqlite`).
- Mantener calidad Pro: el rebrand **no** degrada el template; solo lo adapta.
- Respetar marca: robot logo + tema claro por defecto + company-colors opt-in.
