# OnStudio — Plantillas Pro

Esta carpeta alojará las **plantillas Pro**: las apps de alta calidad de ONDIGITAL
que OnStudio clona y rebrandea para cada negocio.

> **Estado: Phase 6 — productización iniciada.** Ya viven aquí las dos bases
> **static-HTML** propias, cada una en su subcarpeta con su `template.json`:
> [`landing-institucional/`](landing-institucional/) y
> [`saas-dashboard-generic/`](saas-dashboard-generic/). Viajan **embebidas en el
> binario** (`//go:embed templates` en `main.go`) y se cargan al arrancar
> (`templates.LoadFS`). Las plantillas de apps Go (`dental-saas`,
> `pos-inventory-erp`, `restaurant-ops`) siguen **solo-catálogo a propósito**: el
> pipeline emite/sirve archivos estáticos, así que únicamente las bases static-HTML
> sirven como material de clonado hoy.

- Índice operable de plantillas: [`MANIFEST.md`](MANIFEST.md).
- Catálogo completo con descripciones y fuentes:
  `docs/onstudio/template-catalog.md`.
- Contrato de `template.json` y algoritmo de selección:
  `skills/product/onstudio-generator/references/template-manifest.md`.

Cada plantilla productizada vive en su subcarpeta con su propio `template.json`,
limpia (sin datos reales, sin `*.db`, sin secretos). El cargador valida el manifest
(`DisallowUnknownFields`), exige que exista el `entry` y aplica límites de
tamaño/cantidad; una plantilla inválida degrada al catálogo base sin tumbar el
arranque.
