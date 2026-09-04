# OnStock

Sistema de inventario, ventas y reportes para tiendas y microempresas en Honduras.
Es parte de la línea **Micro-Empresa** de ONDIGITAL y funciona como mini-ERP local:
incluye el servidor, la base de datos SQLite y la interfaz web.
No necesita internet ni instalación.

> ## Cuál implementación corre
>
> **La que corre es la de Node: `server/`.** Es Node 24 sobre `node:sqlite` de la
> biblioteca estándar, con **cero dependencias npm** (no hay `node_modules`, no
> hay `npm install`). Se arranca con `make dev`.
>
> El código en Go (`main.go` e `internal/`) **se conserva como implementación de
> referencia**: es la traducción original y sirve para contrastar la lógica de
> negocio línea por línea. No se compila en el flujo normal y sus objetivos del
> Makefile llevan el sufijo `-go`.
>
> Además del idioma, el cambio de fondo es que `main.go` incrustaba `web/` con
> `go:embed`, así que cualquier retoque de CSS o de JS obligaba a recompilar el
> binario para verlo. El servidor de Node **sirve `web/` desde disco**: se guarda
> el archivo, se recarga el navegador y ya está.
>
> `legacy/` es una versión de Node anterior y sin relación con esta; sigue siendo
> borrable.

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

> Este flujo describe el ejecutable único que produce la versión Go
> (`make build`), y sigue siendo el objetivo para la tienda. Con la
> implementación de Node el despliegue equivalente es copiar la carpeta del
> proyecto e instalar Node 22.5+ en la PC; el `.exe` de una sola pieza aún no
> está resuelto para esta versión.

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

Requisitos: **Node 22.5+** (probado en 24). Nada más: sin npm, sin dependencias
nativas, sin paso de compilación.

```bash
make admin            # sistema completo (oficina) → http://localhost:8080
make dev              # alias de make admin
make caja             # SOLO registradora (PC cajero) → http://localhost:8081/caja.html
# En el PC del cajero de la tienda: make caja PORT=8080
make test             # pruebas del servidor (node:test)
make seed-demo        # datos demostrativos (falla si ya hay productos)
make seed-demo-force  # reemplaza con el set demo (Abarrotes El Progreso)
make backup           # → backups/onstock-backup-*.db
```

Editar la interfaz no requiere reiniciar nada: `web/` se sirve desde disco.
Editar `server/` sí requiere reiniciar el proceso.

### Implementación de referencia en Go

Solo si hay Go 1.22+ instalado y las dependencias del `go.mod` disponibles:

```bash
make admin-go         # equivalente de make admin, corriendo el Go
make caja-go
make test-go          # go vet + go test + build
make build            # dist/onstock.exe (Windows) y dist/onstock-linux
```

**Vito** (asistente white-label): menú → Vito, o `http://localhost:8080/#/vito`.  
Config opcional en `.env` (ver `.env.example`). Guion de demo: `../docs/demo-fase1-vito.md`.  
**Módulos:** `GET /api/modules` · contrato `../docs/contrato-modulo.md` · biblioteca `../docs/biblioteca-modulos.md`.

Banderas del servidor (las mismas en Node y en Go):

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
# Plan comercial del tenant:
curl -s localhost:8080/api/tenant
curl -s -X PUT localhost:8080/api/tenant -H 'Content-Type: application/json' \
  -d '{"plan":"enterprise_ai"}'
```

## Estructura

```
server/               ← LO QUE CORRE. Node 24, cero dependencias npm.
  index.js              arranque, banderas de línea de comandos y servidor HTTP
  db.js                 node:sqlite + el esquema (idéntico al de Go)
  store/                lógica de negocio: productos, ventas, compras, gastos, reportes
  api/                  API REST, exportaciones Excel/PDF, códigos de barras, estáticos
  vito/                 asistente: motor local y en la nube, herramientas, catálogo
  lib/                  escritores propios de XLSX, PDF, PNG, ZIP y códigos de barras
  pruebas.test.js       pruebas (node:test), traducidas de los *_test.go

main.go               referencia en Go: servidor + frontend embebido (go:embed)
internal/store/       referencia en Go: SQLite y lógica de negocio
internal/httpapi/     referencia en Go: API REST, exportaciones, códigos de barras
web/                  SPA en español (vanilla JS + CSS, sin frameworks, sin CDN)
dist/                 ejecutables compilados de la versión Go
legacy/               versión de Node anterior y sin relación — se puede borrar
```

El esquema de SQLite y los contratos de la API son **los mismos** en las dos
implementaciones: una base creada por cualquiera de ellas abre en la otra, y
`web/js/api.js` no distingue cuál está del otro lado.

### Cómo se comprueba que el port dice lo mismo

`server/tools/equivalencia.mjs` levanta el binario de Go (`dist/onstock-linux`) y
el servidor de Node contra **dos copias de la misma base**, en puertos distintos,
y los enfrenta:

```
make equivalencia                                  # lecturas + mutaciones
node server/tools/equivalencia.mjs --solo-lecturas # sin escribir en las copias
```

Última corrida: **76 lecturas · 63 idénticas · 13 con diferencia declarada · 0 sin
explicar**, y las **10 tablas idénticas** tras las seis mutaciones.

Primero pide los mismos 76 endpoints de lectura a los dos y compara el JSON campo
por campo, incluido el orden de las claves. Las exportaciones no se comparan por
bytes —dos escritores distintos nunca dan los mismos bytes— sino por lo que
dicen: las celdas del Excel fila por fila, el texto del PDF renglón por renglón
(agrupado por su coordenada Y) y las barras del PNG módulo por módulo. Después
ejecuta seis mutaciones en ambos (venta, orden de compra, recepción, gasto,
salida de inventario y anulación) y compara las diez tablas con SQL, fila por
fila, dejando fuera solo las columnas de fecha de reloj.

**Ojo con el binario de referencia.** `dist/onstock-linux` se compiló el 16 de
agosto de 2026 y el árbol de Go cambió después (`75060f9` y `0bbf41a`). El port se
hizo contra HEAD, así que en lo que esos commits tocaron el binario y el port
dicen cosas distintas *a propósito* y el desactualizado es el binario: el orden
de la lista de ventas, el reparto proporcional del top de productos y el `-0.00`
del estado de resultados. La tabla `DECLARADAS` del script lleva cada caso con su
commit; si se recompila el binario desde HEAD, esas entradas deben dejar de
saltar.

### La única divergencia deliberada

`server/store/seedDemo.js` genera los datos de ejemplo con un generador
pseudoaleatorio distinto. El original usa `math/rand` de Go con semilla fija, y
ese generador arranca de una tabla de 607 constantes que vive dentro del runtime:
no se puede reproducir desde fuera. El port usa mulberry32 con la misma semilla,
así que sigue siendo **reproducible** (misma semilla → mismos datos, siempre) y
la forma del set es idéntica —mismos productos, misma densidad de tickets por
mes, mismos cinco SKU en rojo y los tres estancados— pero los tickets concretos
difieren. Solo afecta a `-seed-demo`; una base ya sembrada no se toca.

## Notas contables (Honduras)

- Los precios de venta pueden configurarse **con ISV incluido** (precio de góndola, por defecto)
  o sin ISV (Configuración).
- El Estado de Resultados presenta cifras **netas de ISV** (el ISV cobrado es débito fiscal,
  no ingreso) y muestra el ISV del período como nota informativa.
- El costo de ventas usa **costo promedio ponderado**, actualizado en cada recepción de compra.
- El ISR (25% por defecto, configurable) es una **estimación gerencial**; no sustituye la
  declaración oficial ante el SAR.
