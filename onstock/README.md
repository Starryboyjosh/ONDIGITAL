# OnStock

Sistema de inventario, ventas y reportes para tiendas y microempresas en Honduras.
Es parte de la línea **Micro-Empresa** de ONDIGITAL y funciona como mini-ERP local:
un solo ejecutable incluye el servidor, la base de datos SQLite y la interfaz web.
No necesita internet ni instalación.

## Funciones

- **Productos** — catálogo con SKU autogenerado por categoría (ej. `LUB-0001`), código de barras
  (EAN-8/13 o Code128), costo, precio, tasa de ISV por producto (0/15/18%), stock mínimo con alertas.
- **Códigos de barras** — generación de imagen por producto e impresión de **hojas de etiquetas en PDF**
  (carta, 3×9) con nombre, código y precio. Compatible con escáner USB (funciona como teclado).
- **Caja / Registradora (POS)** — menú **Caja** (`#/caja`): escanea o busca, carrito, ISV, cobro F2.
  **Modo cajero** (turno): oculta Dashboard, reportes, gastos, compras, Vito y config; solo cobra.
  Salida con PIN de admin (Configuración). **Ventas** = historial (solo admin).
- **Compras** — órdenes de compra a proveedores; al recibirlas se suma el stock y se recalcula el
  **costo promedio ponderado** de cada producto.
- **Inventario** — kardex completo (ventas, compras, entradas, salidas, ajustes por conteo físico).
- **Proveedores** — directorio con RTN y datos de contacto.
- **Gastos** — clasificados (venta / administrativos / financieros / otros) para el Estado de Resultados.
- **Reportes** — **Estado de Resultados formato Honduras** (ventas netas de ISV, costo de ventas,
  utilidad bruta, gastos de operación, ISR estimado, utilidad neta), resumen mensual con top de
  productos, y exportación de todo a **Excel y PDF**.
- **Multi-PC** — el servidor escucha en la red local: otras computadoras de la tienda pueden usar
  el sistema desde el navegador con la IP que se muestra al iniciar.

## Despliegue en la tienda (Windows)

1. Copia `dist/onstock.exe` a la PC (ej. `C:\OnStock\`).
2. Doble clic. Se abre una ventana negra (el servidor) y el navegador con el sistema.
   - La primera vez se crea la carpeta `data\` junto al `.exe` con la base de datos.
3. Para apagar el sistema, cierra la ventana negra.

> **Respaldo:** copia la carpeta `data\` periódicamente (USB, Drive, etc.). Eso es toda la base de datos.

> **Inicio automático (opcional):** crea un acceso directo al `.exe` en
> `shell:startup` (Win+R → `shell:startup`) para que arranque con Windows.

### Acceso desde otras PCs de la tienda

Al iniciar, la consola muestra algo como `En la red: http://192.168.1.50:8080`.
Abre esa dirección en el navegador de cualquier PC de la misma red.
Para habilitar ese acceso explícitamente ejecuta el sistema con `-host 0.0.0.0`.
El valor predeterminado es `127.0.0.1`, adecuado para una sola PC.

## Desarrollo (Linux)

Requisitos: Go 1.22+ (sin CGO, sin Node, sin dependencias nativas).

```bash
make admin            # sistema completo (oficina) → http://localhost:8080
make dev              # alias de make admin
make caja             # SOLO registradora (PC cajero) → http://localhost:8081/caja.html
# En el PC del cajero de la tienda: make caja PORT=8080
make test             # go vet + tests + build
make seed-demo        # datos demostrativos (falla si ya hay productos)
make seed-demo-force  # reemplaza con el set demo (Abarrotes El Progreso)
make build            # genera dist/onstock.exe (Windows) y dist/onstock-linux
```

**Vito** (asistente white-label): menú → Vito, o `http://localhost:8080/#/vito`.  
Config opcional en `.env` (ver `.env.example`). Guion de demo: `../docs/demo-fase1-vito.md`.  
**Módulos:** `GET /api/modules` · contrato `../docs/contrato-modulo.md` · biblioteca `../docs/biblioteca-modulos.md`.

Opciones del ejecutable:

```
-host 127.0.0.1    interfaz de escucha (local por defecto; usa 0.0.0.0 para red local)
-port 8080           puerto del servidor
-data DIR            carpeta de datos (por defecto: ./data junto al ejecutable)
-caja                modo solo registradora (PC del cajero; sin finanzas ni admin)
-no-open             no abrir el navegador automáticamente (solo aplica en Windows)
-seed-demo           carga datos demostrativos y sale
-seed-demo-force     reemplaza datos con el set demostrativo y sale
-backup DIR          crea respaldo SQLite en DIR y sale
```

### Dos PCs en la tienda

| Rol | Comando | Qué ve |
|-----|---------|--------|
| Dueño / oficina | `make admin` (o `make dev`) | Inventario, finanzas, reportes, Vito, config |
| Cajero | `make caja` | Solo la registradora (`/caja.html`) |

En producción Windows se puede lanzar el mismo `.exe` con o sin `-caja`. Misma carpeta `-data` si comparten red/servidor; o un servidor central admin y terminales solo-caja.

```bash
make backup          # → backups/onstock-backup-*.db
# Plan comercial del tenant:
curl -s localhost:8080/api/tenant
curl -s -X PUT localhost:8080/api/tenant -H 'Content-Type: application/json' \
  -d '{"plan":"enterprise_ai"}'
```

## Estructura

```
main.go               servidor HTTP + frontend embebido (go:embed)
internal/store/       SQLite (modernc.org/sqlite, puro Go): esquema y lógica de negocio
internal/httpapi/     API REST, exportaciones Excel/PDF, códigos de barras
web/                  SPA en español (vanilla JS + CSS, sin frameworks, sin CDN)
dist/                 ejecutables compilados
legacy/               versión anterior (Node.js) — se puede borrar
```

## Notas contables (Honduras)

- Los precios de venta pueden configurarse **con ISV incluido** (precio de góndola, por defecto)
  o sin ISV (Configuración).
- El Estado de Resultados presenta cifras **netas de ISV** (el ISV cobrado es débito fiscal,
  no ingreso) y muestra el ISV del período como nota informativa.
- El costo de ventas usa **costo promedio ponderado**, actualizado en cada recepción de compra.
- El ISR (25% por defecto, configurable) es una **estimación gerencial**; no sustituye la
  declaración oficial ante el SAR.
