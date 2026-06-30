# Roadmap y pendientes

## Pasos del plan de producto

El prototipo se construyó por etapas. Estado:

| Paso | Tema | Estado |
|------|------|--------|
| 1 | Rediseño de la estética base (clínica, tema claro, sin emojis) | ✅ Hecho |
| 2 | Dashboard operativo (KPIs, alertas, tareas) | ✅ Hecho |
| 3 | Localización Honduras (HNL, es‑HN, RTN/DNI, +504) | ✅ Hecho |
| 4 | Ficha del paciente con estructura clínica (pestañas) | ✅ Hecho |
| 5 | Esqueleto de facturación Honduras (RTN, CAI, CFE/CAEE) | ✅ Hecho |
| 6 | Esqueleto de caja y finanzas | ✅ Hecho |
| 7 | Esqueleto de reportes | ✅ Hecho |
| 8 | Esqueleto de inventario | ✅ Hecho |
| 9 | Esqueleto de laboratorios | ✅ Hecho |
| 10 | Esqueleto de comunicaciones | ✅ Hecho |
| 11 | Reorganización ligera de carpetas (estilos/módulos) | ✅ Hecho |
| 12 | Revisión visual final (desktop/mobile, consistencia) | ✅ Hecho |

### Paso 11 — Reorganización de carpetas (hecho)
`css/styles.css` se dividió por responsabilidad en parciales bajo `css/base/`, `css/layout/`,
`css/components/`, `css/modules/` y `css/themes/`. `styles.css` quedó como **manifiesto
`@import`** que agrega los parciales en el orden original de la cascada (no reordenar sin
revisar especificidad; el tema oscuro va al final). Las pantallas **no cambiaron**: siguen
enlazando un único `css/styles.css`, por lo que no hubo riesgo de romper rutas. Los `js/`
se mantuvieron planos por ahora (mover archivos JS obligaría a editar las ~16 pantallas y la
ruta de Firebase inyectada en `db.js`); queda como follow-up cuando se decida.

### Paso 12 — Revisión visual final (hecho)
Se revisó la consistencia de las 16 pantallas (sidebar, navegación centralizada, estados
vacíos, sin textos de Chile visibles; las etiquetas de documento ya dicen "RTN / DNI"). El
hallazgo principal: el sidebar fijo de 260px **no era responsivo** y tapaba la pantalla en
móvil. Se añadió un **panel deslizante con botón hamburguesa + overlay** (CSS `@media
(max-width: 900px)` en `layout/structure.css`, lógica inyectada por `main.js`), sin tocar las
pantallas. Pendiente menor (follow-up): el identificador de datos interno se sigue llamando
`rut` en `db.js` y algunos módulos (no visible al usuario); renombrarlo toca la capa de datos
y se deja fuera de un retoque visual.

---

## Decisiones abiertas (a trabajar con el equipo)

### 1. Base de datos — **a definir por el equipo**
Hoy los datos clínicos viven en `sessionStorage` (se borran al cerrar la pestaña) con
sincronización **opcional** a Firebase. Falta decidir el almacenamiento definitivo:

- **Local** (SQLite / IndexedDB) — probable según lo conversado.
- **Nube** (Firestore u otro).
- **Híbrido** (local con respaldo en nube).

Punto único de cambio: **`js/db.js`** (respeta la misma API y las pantallas no cambian).
Ver [arquitectura.md](arquitectura.md#capa-de-datos--importante-para-el-equipo).

### 2. Seguridad — **por definir**
La autenticación actual (`js/auth.js`) es de **demostración**: usuarios mock, sin hashing
ni autorización de servidor. Pendiente: modelo de usuarios, credenciales seguras, permisos
por rol reales, sesión, backups y separación cliente/servidor. El control `adminOnly` actual
es solo de UI.

### 3. Integraciones reales (futuras, hoy placeholders)
- **Facturación electrónica SAR / CFE‑CAEE** (XML, autorización, firma) — solo esqueleto.
- **Pasarelas de pago / link de pago** — placeholder en Caja.
- **WhatsApp Business API y correo transaccional** — placeholder en Comunicaciones.
- **Almacenamiento de archivos** (documentos, consentimientos, radiografías, adjuntos de
  laboratorio) y **firma electrónica** — placeholder en Pacientes/Laboratorios.
- **Compras y proveedores reales** en Inventario; **conciliación bancaria** en Caja.
- **Exportación real** CSV/PDF en Reportes.

---

## Siguiente etapa recomendada
Cuando se cierren los pasos 11–12, abordar la arquitectura de fondo: base de datos,
modelo de usuarios y permisos, backups, seguridad, facturación electrónica real e
integraciones. Hasta entonces, el foco se mantiene en prototipo profesional con dirección
de producto.
