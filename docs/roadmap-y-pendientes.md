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
| 11 | Reorganización ligera de carpetas (estilos/módulos) | ⏳ Pendiente |
| 12 | Revisión visual final (desktop/mobile, consistencia) | ⏳ Pendiente |

### Paso 11 — Reorganización de carpetas (pendiente)
Separar `styles.css` por responsabilidad (tokens/base/layout/components/themes) y agrupar
los `js/` por módulo. **Requiere actualizar las rutas de `<link>`/`<script>` en las ~16
pantallas**; hacerlo con cuidado para no romper rutas. Conviene hacerlo cuando los módulos
estén estables.

### Paso 12 — Revisión visual final (pendiente)
Recorrer todas las pantallas en escritorio y móvil/tablet, confirmar consistencia, ausencia
de textos de Chile, estados vacíos profesionales y que la navegación (16 ítems) no se sienta
saturada.

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
