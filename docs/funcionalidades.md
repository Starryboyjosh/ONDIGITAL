# Funcionalidades por módulo

Leyenda de estado:

- **Funcional** — opera con los datos locales actuales.
- **Esqueleto** — estructura y datos de ejemplo/locales; lista para conectar a la
  base de datos real.
- **Placeholder** — visible pero sin función real todavía (claramente marcado en la UI).

---

## Base transversal

- **Estética clínica** (modo claro por defecto; modo oscuro como opción sobria).
  Paleta sobria, radios 6–8 px, sin neón/glassmorphism. — *Funcional*
- **Localización Honduras**: moneda Lempira (**HNL**) con helper centralizado
  `window.formatMoney`, formato de fecha `es-HN`, documento **RTN / DNI**, teléfonos
  `+504`, direcciones/correos hondureños. — *Funcional*
- **Multi‑empresa (multi‑tenant)**: branding por empresa (iniciales y color de acento),
  aislamiento de datos por `companyId`. — *Funcional*
- **Navegación central** definida en `main.js` (un solo lugar para el menú) con
  resaltado de la página activa y scroll si el menú crece. — *Funcional*
- **Notificaciones toast** y **modales** reutilizables. — *Funcional*

## Acceso

- **Login** (`index.html`): inicio de sesión con branding dinámico por usuario/empresa,
  tema claro. Autenticación de **demostración** (no productiva). — *Funcional (demo)*

## Operación diaria

- **Dashboard** (`dashboard.html`): mesa de control. KPIs operativos (citas de hoy,
  sin confirmar, pacientes activos, presupuestos pendientes, pagos pendientes, caja del
  día), **agenda del día** como superficie principal, **alertas importantes** y
  **tareas operativas** con accesos directos, **tareas de seguimiento (CRM)** y
  **comisiones por odontólogo**. — *Funcional*
- **Agenda** (`agenda.html`): calendario mensual de citas, creación/edición, búsqueda
  predictiva de pacientes/odontólogos, cambio de estado (pendiente/confirmada/
  completada/cancelada). — *Funcional*

## Paciente y clínica

- **Pacientes / Expediente** (`pacientes.html`): directorio + **ficha clínica con
  pestañas** (Resumen, Datos personales, Historia clínica, Evoluciones, Odontograma/
  Periodontograma, Presupuestos y pagos, Documentos, Comunicaciones). Indicadores del
  paciente y resúmenes financieros. Documentos y Comunicaciones son *Placeholder*. — *Funcional*
- **Odontograma** (`odontograma.html`): registro interactivo por pieza y por cara
  (caries, restaurado, estados), ligado al paciente por `?id=`. — *Funcional*
- **Periodontograma** (`periodontograma.html`): sondaje, margen gingival, NIC, sangrado
  y placa por pieza, con gráfico de sondaje. — *Funcional*

## Finanzas

- **Presupuestos** (`presupuestos.html`): armado de presupuesto desde el catálogo,
  descuentos, y **factura/PDF imprimible** con datos fiscales de la clínica. — *Funcional*
- **Cobranzas** (`cobranzas.html`): abonos por presupuesto, saldos, estados de pago y
  **recibo PDF**. — *Funcional*
- **Caja y Finanzas** (`caja.html`): apertura/cierre de caja, **movimientos del día**
  (abonos reales de Cobranzas + ingresos/gastos/anulaciones manuales), resumen por
  método de pago (efectivo/tarjeta/transferencia; *link de pago* placeholder), arqueo y
  conciliación como *Placeholder*. — *Esqueleto*
- **Facturación Honduras** (`facturacion.html`): datos fiscales (**RTN**, nombre legal,
  dirección), **configuración del rango CAI** (rango, correlativo, fecha límite, estado),
  **alertas** por folios/fecha, tabla de documentos emitidos (factura, recibo, nota de
  crédito y anulación) y preparación **CFE/CAEE** (Estado XML, autorización, hash) como
  *Placeholder*. **No integra SAR ni genera XML.** — *Esqueleto*

## Administración

- **Reportes** (`reportes.html`): filtros (rango de fechas, odontólogo, estado), KPIs y
  reportes calculados sobre los datos locales (ventas, citas por estado, tratamientos más
  vendidos, productividad por odontólogo, cobranza, caja del día) con gráficas de barras
  CSS. Exportar CSV/PDF es *Placeholder*. — *Esqueleto*
- **Inventario** (`inventario.html`): insumos con stock, mínimo, lote, vencimiento y
  proveedor; alertas de stock bajo / próximo vencimiento / sin proveedor; alta de insumo.
  — *Esqueleto*
- **Laboratorios** (`laboratorios.html`): órdenes a laboratorio por paciente y
  tratamiento, fechas de envío/esperada, costo y estados (pendiente → enviado → en
  proceso → recibido → entregado). Adjuntos *Placeholder*. — *Esqueleto*
- **Comunicaciones** (`comunicaciones.html`): plantillas profesionales (recordatorio,
  seguimiento de presupuesto, cobranza, cumpleaños/reactivación) e historial de mensajes
  con filtro. Envío real por WhatsApp/correo es *Placeholder*. — *Esqueleto*
- **Procedimientos** (`procedimientos.html`): catálogo de tratamientos con precios en
  lempiras. — *Funcional*
- **Configuración** (`configuracion.html`, admin): datos de la clínica que alimentan los
  encabezados de presupuestos/recibos. — *Funcional*
- **Usuarios** (`usuarios.html`, admin): gestión de usuarios de la empresa. — *Funcional (demo)*
