# OnStudio — Spec Intake Contract

The canonical, normalized shape of an OnStudio generation request. The UI collects
it, the Go API validates it, and the engine prompt is built from it. Keep this in
sync with `docs/onstudio/api-and-config.md` and `docs/onstudio/generation-pipeline.md`.

## Normalized spec

```jsonc
{
  "business_name": "Panadería La Espiga",   // required, non-empty
  "industry": "alimentos/retail",            // required; maps to a template
  "site_type": "landing",                    // required; see enum below
  "locale": "es-HN",                         // default es-HN
  "currency": "HNL",                         // default HNL
  "brand": {
    "use_company_colors": false,             // false = light theme (default)
    "primary": null,                         // optional hex; null = skill tokens
    "accent": null,                          // optional hex
    "logo_hint": "espiga de trigo"           // optional; guides logo/robot fill
  },
  "pages": ["inicio", "productos", "nosotros", "contacto"],  // 1..n
  "contact": {
    "phone": "+504...",                      // optional; +504 for Honduras
    "rtn": null,                             // optional; never fabricate
    "dni": null,                             // optional; never fabricate
    "address": "...",                        // optional
    "whatsapp": "+504..."                    // optional
  },
  "content_notes": "Pan artesanal, pedidos por WhatsApp, horario...",  // free text
  "model": {
    "provider": "anthropic",                 // required; must be allowed
    "model": "claude-sonnet-4-5"             // required; must be allowed
  }
}
```

## `site_type` enum

| Value | Meaning | Default template |
| --- | --- | --- |
| `landing` | Institutional / business landing | `landing-institucional` |
| `catalog` | Catalog / indirect-contact site | `landing-institucional` (+ data) |
| `saas` | Operational dashboard with modules | `dental-saas` or `saas-dashboard-generic` |
| `pos` | Point of sale + inventory | `pos-inventory-erp` |
| `restaurant` | Restaurant floor + kitchen + cash | `restaurant-ops` |
| `erp-lite` | Light ERP | `pos-inventory-erp` |

## Validation rules

- `business_name`, `industry`, `site_type`, `model.provider`, `model.model`
  are **required**.
- `model` must be in `config.json → allowed_models`; reject otherwise with a
  Spanish error (`{ "error": { "code": "modelo_no_permitido", ... } }`).
- `locale`/`currency` default to `es-HN` / `HNL` when omitted.
- `brand.use_company_colors` defaults to `false` (light theme is the default).
- `pages` must have at least one entry; normalize to lowercase, de-duplicate.
- **Sanitize all free text** (`content_notes`, `business_name`, page names)
  before injecting into the engine prompt — strip control chars, cap length,
  and treat it as untrusted (prompt-injection hygiene).
- **Never fabricate** `rtn`, `dni`, prices, or legal claims; pass through what
  the user gave, else leave a clear placeholder.

## Intake → prompt mapping (for the engine)

- `industry` + `site_type` → template id (see `template-manifest.md`).
- `brand` → theme selection (light default vs company-colors) + color overrides.
- `pages` + `content_notes` → sections/content to produce.
- `locale`/`currency`/`contact` → localization (es-HN, HNL, +504, RTN/DNI).
- `model` → the OpenCode `{providerID, modelID}` for the prompt.
