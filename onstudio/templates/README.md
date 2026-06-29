# OnStudio — Plantillas Pro

Esta carpeta alojará las **plantillas Pro**: las apps de alta calidad de ONDIGITAL
que OnStudio clona y rebrandea para cada negocio.

> **Estado: vacío a propósito (Phase 0).** Todavía no se copian las plantillas
> reales. La extracción de los productos fuente a `onstudio/templates/<id>/` es
> Phase 6 (ver `docs/onstudio/roadmap.md`).

- Índice de plantillas (de diseño): [`MANIFEST.md`](MANIFEST.md).
- Catálogo completo con descripciones y fuentes:
  `docs/onstudio/template-catalog.md`.
- Contrato de `template.json` y algoritmo de selección:
  `skills/product/onstudio-generator/references/template-manifest.md`.

Cuando se producticen, cada plantilla vivirá en su subcarpeta con su propio
`template.json`, limpia (sin datos reales, sin `*.db`, sin secretos).
