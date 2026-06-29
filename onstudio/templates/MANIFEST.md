# OnStudio — Templates MANIFEST

Operable index of the **Pro templates** OnStudio can clone and rebrand. This is
the file the implementation reads at runtime to list and select templates. The
human catalog (descriptions + rationale) is `docs/onstudio/template-catalog.md`;
the contract for the per-template `template.json` and the selection algorithm is
`skills/product/onstudio-generator/references/template-manifest.md`.

> **Estado: design index (Phase 0).** Aún no se ha producticado ninguna plantilla.
> La columna **Productized** queda en `no` hasta Phase 6, cuando se copia una
> versión limpia del fuente a `onstudio/templates/<id>/` con su `template.json`.
> Hoy `Source` apunta al producto original en el repo, no a una copia.

## Index

| id | name | source | stack | site_type | productized |
| --- | --- | --- | --- | --- | --- |
| `landing-institucional` | Landing institucional | `Pagina_Web_Original/` | static-html | `landing` | no |
| `dental-saas` | SaaS dental por módulos | `credental/` | static-html | `saas` | no |
| `pos-inventory-erp` | POS e Inventario (mini-ERP) | `onstock/` | go-embed-sqlite | `pos`,`erp-lite` | no |
| `restaurant-ops` | Operación de restaurante | `onserve/` | go-embed-sqlite | `restaurant` | no |
| `saas-dashboard-generic` | Dashboard SaaS genérico | skill SaaS + house style | TBD | `saas` (fallback) | no |

## Match hints (selector)

Used by the selection algorithm (`template-manifest.md`) to rank candidates by
overlap with `spec.industry` / `spec.site_type` / `content_notes`.

- **`landing-institucional`** — `site_type: landing`. Industrias: servicios,
  agencias, profesionales, presencia web. Keywords: institucional, contacto,
  servicios, equipo. También es la **fuente de marca** (robot SVG, navy, `#2b8af7`,
  `#00e5b0`).
- **`dental-saas`** — `site_type: saas`. Industrias: salud, clínicas,
  consultorios, o cualquier "panel con módulos". Keywords: agenda, pacientes,
  expediente, facturación, inventario. Auth/almacenamiento **demo-grade**.
- **`pos-inventory-erp`** — `site_type: pos`/`erp-lite`. Industrias: retail,
  tiendas, abarroterías, inventario, ventas con stock. Keywords: punto de venta,
  stock, proveedores, caja, compras.
- **`restaurant-ops`** — `site_type: restaurant`. Industrias: restaurantes,
  cafés, comida. Keywords: mesas, comandas, cocina/KDS, propina, menú.
- **`saas-dashboard-generic`** — `site_type: saas` (genérico). **Fallback** del
  selector cuando el rubro no calza con dental/POS/restaurante.

## Fallback order

1. Candidatos = plantillas cuyo `site_type` contiene `spec.site_type`.
2. Sin candidatos → familia: `saas-like → saas-dashboard-generic`;
   `landing/catalog → landing-institucional`.
3. Empate/nada → `saas-dashboard-generic` (fallback global).
4. Se registra `template_id` + razón en el job para auditoría.

## Protected on rebrand (no degradar la plantilla)

El rebrand solo toca identidad/contenido/tema. **Nunca** altera lógica financiera
ni de seguridad (detalle en
`skills/product/onstudio-generator/references/rebrand-rules.md`):

- `pos-inventory-erp`: costo promedio ponderado, reversa de stock, ISV/ISR,
  `internal/store/*`.
- `restaurant-ops`: caja/propina, ISV del menú, frontera de facturación SAR
  (registro local, no XML/firma).
- `dental-saas`: mantener el aviso de que auth/almacenamiento son demo, no
  producción clínica.

## Adding a template (Phase 6 checklist)

1. Copiar una versión **limpia** del fuente a `onstudio/templates/<id>/` (sin datos
   reales, sin `data/*.db`, sin secretos, sin `legacy/`/`dist/`).
2. Añadir `template.json` (id, `name`, `source`, `stack`, `site_type`, `match`,
   `rebrand_points`, `protected`) según el contrato.
3. Go: conservar estilo OnStock/OnServe (Makefile `dev/test/build`, `//go:embed
   web`, `modernc.org/sqlite`). Debe build/serve por sí sola antes de ofrecerse.
4. Marcar `productized: yes` en este índice.
