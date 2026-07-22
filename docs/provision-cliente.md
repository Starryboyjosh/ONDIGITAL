# Provisión de cliente nuevo (Fase 4.2)

Proceso para entregar un plan **Starter / Business / Enterprise AI** sin improvisar.
Complementa [biblioteca-modulos.md](biblioteca-modulos.md) y [modelo-negocio.md](modelo-negocio.md).

## 1. Ficha del cliente

| Campo | Ejemplo |
|-------|---------|
| Nombre comercial | Abarrotes El Progreso |
| RTN | 0801900… |
| Industria | tienda / clinica |
| Plan | starter \| business \| enterprise_ai |
| Módulos | onstock y/o credental |
| Contacto | nombre, +504, correo |
| Tenant ID | `abarrotes-el-progreso` (slug) |

Generar ID: usar `tenant.NewID(nombre)` o el script abajo.

## 2. Elegir plan → qué se entrega

| Plan | USD/mes | Incluye | Vito |
|------|---------|---------|------|
| Starter | 19 | Suite a medida en **infra del cliente** | No |
| Business | 49 | + infra administrada + biblioteca de módulos | No* |
| Enterprise AI | 99 | + **Vito** sobre los datos del negocio | Sí |

\* Business puede preparar `.env` Vito desactivado hasta upgrade.

## 3. Checklist de entrega

### OnStock (tienda / inventario)

```bash
cd onstock
make build                    # dist/onstock-linux o .exe
# En la máquina del cliente:
./onstock -data ./data
# Identidad comercial:
# UI Configuración → nombre, RTN, ISV
# o API:
# PUT /api/tenant {"plan":"enterprise_ai","tenant_id":"cliente-x","modules":"onstock"}
```

- [ ] Binario + carpeta `data/`
- [ ] `GET /api/tenant` muestra plan y `vito_included`
- [ ] `GET /api/modules` lista capacidades
- [ ] Respaldo: `make backup` o `./onstock -backup ./backups`
- [ ] Si Enterprise: `.env` con `VITO_*` (keys solo servidor) y prueba en `#/vito`

### Credental (clínica)

```bash
# Servir estáticos (nginx, Caddy, o python -m http.server en demo)
cd credental && python3 -m http.server 8090
```

- [ ] Usuarios/roles demo o reales según entorno
- [ ] CompanyId aislado (no mezclar clínicas)
- [ ] Si Enterprise: `vito.html` + seed o datos reales
- [ ] Aviso: auth/storage siguen siendo **demo-grade** hasta endurecer (Fase 4.1 restante)

### Ledger ONDIGITAL (interno)

```bash
# Ver modules/billing — ledger JSON de suscripciones
# (ops; no es cobro con tarjeta todavía)
```

- [ ] Registrar suscripción del tenant (plan, monto, next_bill)
- [ ] Nota de facturación HNL al tipo de cambio del día (ver facturacion-suscripcion.md)

## 4. Script de ficha (generar JSON de tenant)

```bash
cd modules/tenant && go test ./...   # sanity
# Uso programático en Go: tenant.Tenant{...} + billing.Ledger.Create
```

Plantilla JSON:

```json
{
  "id": "abarrotes-el-progreso",
  "name": "Abarrotes El Progreso",
  "rtn": "08019001234567",
  "plan": "enterprise_ai",
  "modules": ["onstock"],
  "locale": "es-HN",
  "currency": "L"
}
```

## 5. Handoff al cliente

- [ ] URL / cómo abrir el sistema
- [ ] Quién es admin y cómo respaldar (`make backup`)
- [ ] Qué plan tiene y qué incluye Vito o no
- [ ] Contacto ONDIGITAL para soporte y upgrades de plan

## 6. Upgrade de plan

1. `PUT /api/tenant` con nuevo `plan` (OnStock).
2. Actualizar ledger de suscripción (monto / next_bill).
3. Si pasa a Enterprise AI: activar `VITO_ENABLED` + key + capacitación de 15 min en Vito.
