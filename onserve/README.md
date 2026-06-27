# OnServe

OnServe es el sistema local de operación de restaurante de la línea
Micro-Empresa de ONDIGITAL para Honduras. Corre como un solo ejecutable Go:
servidor HTTP, interfaz web embebida y base de datos SQLite local.

## Alcance actual

- Salón en vivo con zonas, mesas, reservas, mesas ocupadas y comandas por cobrar.
- Comandas por mesa o para llevar, envío a cocina, estados KDS y cuenta imprimible.
- Menú editable con categorías, estaciones cocina/barra, disponibilidad, costos e ISV.
- Caja con apertura/cierre, pagos divididos, propina no gravable y arqueo.
- Configuración de empresa, RTN, teléfono, dirección, CAI y parámetros de ISV/propina.
- Dashboard con ventas del día, mesas ocupadas, cocina abierta y top platillos.

## Límites de producción

- No incluye autenticación ni roles; usarlo solo como app local controlada por el negocio.
- La facturación SAR está modelada como registro fiscal local, pero no genera XML, firma,
  CAEE ni validación contra Oficina Virtual.
- No guardar secretos, credenciales reales ni datos sensibles fuera de la carpeta de datos
  local definida al ejecutar el sistema.

## Comandos

```bash
make dev
make test
make build
```

Por defecto la app corre en `http://localhost:8090` y guarda la base de datos en
`data/onserve.db` junto al ejecutable o al directorio de trabajo usado con `go run`.
Para cambiar la carpeta de datos:

```bash
go run . -port 8090 -data ./tmp-data -no-open
```
