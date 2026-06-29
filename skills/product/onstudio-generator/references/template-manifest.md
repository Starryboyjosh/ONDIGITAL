# OnStudio — Template Manifest Contract

How OnStudio describes and selects **Pro templates**. The human-readable catalog
is `docs/onstudio/template-catalog.md`; the operable index the app reads is
`onstudio/templates/MANIFEST.md`; each productized template carries its own
`template.json`.

## `template.json` (per template)

Lives at `onstudio/templates/<id>/template.json` once the template is productized
(Phase 6). Shape:

```jsonc
{
  "id": "pos-inventory-erp",                 // stable id, kebab-case
  "name": "POS e Inventario (mini-ERP)",     // Spanish display name
  "source": "onstock/",                      // origin product in the repo
  "stack": "go-embed-sqlite",                // go-embed-sqlite | static-html
  "site_type": ["pos", "erp-lite"],          // matches spec.site_type
  "match": {                                 // selection hints
    "industries": ["retail", "tienda", "abarrotería", "inventario", "ventas"],
    "keywords": ["punto de venta", "stock", "proveedores", "caja"]
  },
  "entry": "main.go",                         // app entrypoint (or index.html)
  "rebrand_points": [                         // what the rebrand may touch
    "business_name", "copy", "theme", "colors", "logo", "pages", "contact"
  ],
  "protected": [                              // what the rebrand must NOT alter
    "internal/store/*",                       // financial/business logic
    "weighted-average cost", "stock reversal", "ISV/ISR"
  ],
  "notes": "No alterar cálculos financieros; solo marca/copy/colores."
}
```

## Selection algorithm

```
input: spec.industry, spec.site_type
1. candidates = templates where site_type contains spec.site_type
2. if candidates empty:
     pick the generic fallback by site_type family:
       saas-like      -> saas-dashboard-generic
       landing/catalog-> landing-institucional
3. rank candidates by industry/keyword overlap with spec.industry + content_notes
4. choose top-ranked; record template_id + reason on the job
5. if still nothing -> saas-dashboard-generic (global fallback) + note
```

The selection reason is stored on the job so a human can audit why a template was
picked.

## Templates (current catalog)

| id | source | stack | site_type |
| --- | --- | --- | --- |
| `landing-institucional` | `Pagina_Web_Original/` | static-html | `landing` |
| `dental-saas` | `credental/` | static-html | `saas` |
| `pos-inventory-erp` | `onstock/` | go-embed-sqlite | `pos`/`erp-lite` |
| `restaurant-ops` | `onserve/` | go-embed-sqlite | `restaurant` |
| `saas-dashboard-generic` | skill SaaS + house style | TBD | `saas` (fallback) |

See `docs/onstudio/template-catalog.md` for full descriptions and rationale.

## Productization rules (Phase 6)

- Copy a **clean** version of the source into `onstudio/templates/<id>/`: no real
  data, no `data/*.db`, no secrets, no `legacy/` or `dist/`.
- Add `template.json` with `rebrand_points` and `protected` paths.
- Go templates keep the OnStock/OnServe house style (Makefile, `//go:embed web`,
  `modernc.org/sqlite`).
- A template must build/serve on its own before it is offered to the engine.
- `protected` paths are off-limits to rebrand (financial logic, security, data
  invariants). Only identity/content/theme are fair game.
