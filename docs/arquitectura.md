# Arquitectura técnica (estado actual)

Documento de referencia para el equipo, en especial para quien defina la **base de
datos** y la **seguridad**.

## Stack

- **Front‑end estático**: HTML + CSS + JavaScript “vanilla” (sin framework, sin build,
  sin dependencias npm). Se ejecuta abriendo los `.html`.
- Tipografía vía Google Fonts (DM Sans). Iconografía: SVG en línea.

## Estructura

```
credental/
  *.html                 Una pantalla por módulo. Cada una incluye, en este orden:
                         db.js → auth.js → main.js → <modulo>.js
  css/styles.css         Sistema de diseño único (tokens + tema claro/oscuro + componentes)
  js/
    main.js              Navegación central (array navItems), tema, branding multi-empresa,
                         helper de moneda window.formatMoney (HNL), toasts, modales.
    db.js                Capa de datos local + sync Firebase opcional.
    auth.js              Login/sesión y guardas de ruta (demo).
    firebase/connection.js  Conector Firebase (se inyecta desde db.js).
    <modulo>.js          Lógica de cada pantalla.
```

## Sistema de diseño (CSS)

- **Tokens** en `:root` (colores, superficies, bordes, radios, sombras, fuentes).
- **Tema claro por defecto**; el oscuro se activa con la clase `html.dark-theme`
  (alterna desde el sidebar; preferencia en `localStorage` clave `credental_theme`).
- Los componentes (botones, tarjetas, tablas, formularios, badges, pestañas, alertas,
  estados vacíos, etc.) usan los tokens, por lo que **cambiar la paleta es un solo lugar**.

## Capa de datos — IMPORTANTE para el equipo

Hoy la persistencia es **solo del lado del cliente** y mixta:

| Qué | Dónde se guarda | Notas |
|-----|-----------------|-------|
| Pacientes, citas, presupuestos, pagos, tratamientos, config clínica, periodontogramas, usuarios, empresas | `sessionStorage` vía `js/db.js` (prefijo `credental_`) | **Se borra al cerrar la pestaña.** Aislado por empresa (`companyId`). |
| Sincronización opcional en la nube | Firebase Firestore (`js/firebase/connection.js`) | `db.js` lo inyecta y mezcla datos al cargar. Opcional. |
| Módulos esqueleto: facturación (RTN/CAI), caja (estado y movimientos), inventario, laboratorios | `localStorage` por empresa (claves `credental_<modulo>_<companyId>`) | **Persisten** entre sesiones; son datos de ejemplo + altas del usuario. |
| Preferencia de tema | `localStorage` (`credental_theme`) | — |

`db.js` expone una API tipo repositorio: `window.db.getPatients()`, `getAppointments()`,
`getBudgets()`, `getPayments()`, `saveBudget()`, `registerPayment()`, etc. **Toda la app
consume esta API**, así que migrar a otra base de datos se concentra en `db.js` sin
reescribir las pantallas.

### Dónde tocar para la base de datos definitiva

- Punto único de cambio: **`js/db.js`** (sustituir el backend de `get/set` y la
  sincronización). Las pantallas no deberían cambiar si se respeta la misma API.
- Decisión abierta: **local (SQLite/IndexedDB) vs nube vs híbrido** — a definir con el
  equipo. Hoy `sessionStorage` es volátil; conviene al menos mover los datos clínicos a
  almacenamiento persistente y con respaldo.

### Dónde tocar para la seguridad

- **`js/auth.js`** concentra login, sesión y guardas de ruta; hoy es de **demostración**
  (usuarios mock, sin hashing real ni control de acceso productivo).
- El control por rol existe de forma básica (ítems `adminOnly` en la navegación de
  `main.js`), pero **no hay autorización en el servidor** porque no hay servidor.
- Pendiente de definir: modelo de usuarios, hashing/credenciales, permisos por rol,
  backups, y separación cliente/servidor.

## Multi‑empresa (tenant)

- El usuario en sesión tiene `companyId`; `db.js` filtra pacientes/citas/presupuestos por
  esa empresa. El branding (nombre, iniciales, color) se aplica en `main.js`.

## Moneda y localización

- Helper único `window.formatMoney(valor)` en `main.js` → `Intl.NumberFormat('es-HN', HNL)`.
  Cambiar moneda/locale es un solo lugar.
