# Seguridad: demo → producción (Fase 4.1)

Estado honesto para no confundir prototipo con producto vendible.

## Hoy (aceptable en demo / piloto controlado)

| Área | OnStock | Credental |
|------|---------|-----------|
| Auth | Sin login multi-usuario (PC de tienda) | sessionStorage + hash demo |
| Datos | SQLite local en `data/` | sessionStorage + Firebase opcional |
| Aislamiento | 1 instancia = 1 negocio | `companyId` en datos |
| Backups | `make backup` / `-backup` | copiar export / sync cloud |
| Vito keys | Solo `.env` servidor | tools locales sin key en browser |

## Antes de producción con datos reales

- [ ] Auth real (sesiones servidor / JWT / proveedor) y roles aplicados en API
- [ ] Credental: no depender de sessionStorage como única fuente de verdad clínica
- [ ] Reglas Firebase / backend que validen tenant en cada lectura/escritura
- [ ] Cifrado en tránsito (HTTPS) y backups automáticos probados
- [ ] Política de PII si Vito usa API en la nube (Enterprise AI)
- [ ] Rotación de keys; nunca keys en el frontend

## Roles (modelo)

Ver `ondigital.hn/tenant`: `admin` · `gerente` · `empleado` · `viewer`.

Enforcement completo en APIs: pendiente de endurecer por suite; la matriz ya está definida
en código para no reinventar en cada pantalla.
