# PLAN vivo — Fase 4: Endurecer / vender

> plan-maestro. Borrar al cerrar la fase.

**Estado:** en curso  
**Norte:** poder entregar un cliente con proceso documentado (no improvisado).  
**Criterio de hecho:** provisión de un plan Starter/Business/Enterprise AI con checklist verificable.

## Grafo

```
modules/tenant   → planes, roles, tenant metadata
modules/billing  → suscripciones (ledger operativo ONDIGITAL)
onstock          → tenant en settings, backup, GET /api/tenant
docs             → provisión, facturación, seguridad demo→prod
credental        → roles documentados (auth demo sigue; no reescribir auth completa aún)
```

## Pasos

### 4.1 Multi-tenant / seguridad base
- [x] Modelo Plan + Tenant + Roles (`modules/tenant`)
- [x] OnStock: `tenant_id`, `plan` en settings + `GET/PUT /api/tenant`
- [x] Backup OnStock (`-backup`, `make backup`)
- [x] Doc límites demo vs producción (`seguridad-demo-prod.md`)
- [ ] Auth multi-usuario en OnStock + enforcement de roles en todas las APIs (sigue abierto)
- [ ] Credental: salir de sessionStorage como única verdad clínica (sigue abierto)

### 4.2 Provisión de cliente
- [x] Runbook `docs/provision-cliente.md`
- [x] Plantilla JSON tenant + checklist por plan

### 4.3 Facturación suscripción
- [x] Modelo de suscripción + ledger JSON (`modules/billing`)
- [x] Doc `docs/facturacion-suscripcion.md`
- [ ] Pasarela de pago / factura SAR (fuera de alcance actual)

### 4.4 Documentación viva
- [x] Enlaces desde biblioteca-modulos + plan-maestro

## Siguiente (si se profundiza 4.x)

Auth real OnStock y endurecimiento Credental datos; o retomar Fase 3 hosting.
