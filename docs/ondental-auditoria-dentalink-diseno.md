# Auditoria OnDental vs Dentalink y registro de diseno

Fecha de analisis: 2026-06-03  
Proyecto auditado: `ondental/`  
Producto: software de gestion clinica dental, con alcance de SaaS multi-clinica para agenda, pacientes, tratamientos, cobros y administracion.

## Resumen ejecutivo

OnDental ya tiene una base visual y funcional como prototipo navegable de software dental: login, dashboard, agenda, pacientes, odontograma, periodontograma, presupuestos, cobranzas, procedimientos, configuracion y usuarios. Por categoria, debe describirse como **software de gestion clinica dental** o **Dental Practice Management Software**, no solo como "control software". Si Ondigital lo vende como plataforma, el nombre comercial puede ser: **SaaS de gestion dental y administracion clinica**.

Comparado con Dentalink, OnDental esta en etapa de **prototipo funcional front-end**. Dentalink se presenta como un sistema cloud con agendamiento online, confirmacion por correo o WhatsApp, historia clinica, odontograma/periodontograma, consentimientos, firma electronica, carga de imagenes, pagos online, cuotas, tareas de cobranza, control de caja, gastos, laboratorios, inventario, reportes KPI/Excel e IA. Fuente: [Dentalink funcionalidades](https://www.softwaredentalink.com/funcionalidades).

La brecha principal no es agregar mas pantallas. La brecha real es convertir el prototipo en producto operativo: backend real, autenticacion segura, reglas por tenant, modelo de datos auditable, expediente clinico completo, facturacion fiscal, comunicaciones automaticas, reportes y una estetica mas profesional.

## Estado actual del sistema

| Area | Estado actual | Madurez |
| --- | --- | --- |
| Login y sesion | Login en navegador con SHA-256 manual y `sessionStorage`. | Demo, no produccion |
| Multi-clinica | Los datos se filtran por `companyId` en cliente. | Demo, no seguridad real |
| Base de datos | `sessionStorage` local con sincronizacion a Firestore desde el navegador. | Prototipo |
| Agenda | Citas, estados, busqueda de paciente/dentista, vista de detalle. | Base util |
| Pacientes | CRUD, ficha lateral, tags e historial basico. | Base util |
| Odontograma | Interactivo y enlazado a paciente. | Diferenciador inicial |
| Periodontograma | Registro periodontal con tabla y grafico. | Diferenciador inicial |
| Presupuestos | Creacion de presupuesto, formato imprimible, relacion paciente/tratamiento. | Base util |
| Cobranzas | Gestion de pagos y recibo. | Base util |
| Procedimientos | Catalogo de tratamientos y precios. | Base util |
| Configuracion | Datos de clinica para documentos. | Basico |
| Usuarios | Pantalla admin de usuarios, pero permisos client-side. | Inseguro |
| Reportes | KPIs simples en dashboard. | Insuficiente |
| Comunicacion | Link manual a WhatsApp desde tareas. | Basico |
| Facturacion Honduras | No hay modelo fiscal CAI/CAEE/RTN/ISV/CFE. | Falta critica |

Evidencia local:

- `firebase/firestore.rules` permite lectura/escritura general hasta 2026-07-01. Esto deja datos abiertos mientras la fecha sea valida y luego puede bloquear todo si no se cambia.
- `ondental/js/auth.js` guarda la sesion en `sessionStorage` y valida contrasenas en cliente.
- `ondental/js/db.js` inicializa colecciones vacias en `sessionStorage` y mezcla datos desde Firestore.
- `ondental/js/firebase/connection.js` carga Firebase desde CDN y permite `getDocs`, `saveDoc`, `deleteDoc` desde el navegador.
- `ondental/usuarios.html` registra usuarios desde cliente y guarda la contrasena recibida en el campo `password` sin hashearla en esa pantalla.

## Comparacion con Dentalink

| Capacidad Dentalink | OnDental hoy | Necesidad para competir |
| --- | --- | --- |
| Agendamiento online | Agenda interna, sin portal publico. | Portal de reserva, disponibilidad por sillones/profesionales, confirmaciones y reagendamiento. |
| Confirmacion de citas por correo/WhatsApp | Link manual a WhatsApp. | Motor de recordatorios con plantillas, colas, auditoria y estados de entrega. |
| Historia clinica digital | Ficha basica, odontograma y periodontograma. | Anamnesis, antecedentes, alergias, diagnosticos, evoluciones, recetas, adjuntos y consentimientos. |
| Odontograma y periodontograma online | Existe. | Mantenerlo como diferencial, agregar versionado, notas por pieza, adjuntos, historial y auditoria. |
| Consentimientos informados | No existe. | Plantillas legales, firma digital, version del documento y almacenamiento inmutable. |
| Firma electronica | No existe. | Integracion con firma electronica o captura de firma aceptada segun jurisdiccion. |
| Imagenes y documentos | No existe como modulo. | Storage seguro por paciente, tipos de archivo, permisos, escaneo antivirus y preview. |
| Pagos presenciales y online | Registro manual de pagos. | Pasarela de pago, recibos, conciliacion, caja, anulaciones y devoluciones. |
| Creditos/cuotas | Parcial en cobros, no como producto financiero. | Planes de pago, cuotas, vencimientos, mora y seguimiento. |
| Tareas de captura y morosidad | CRM basico en dashboard. | Pipeline de presupuestos, cobranza automatizada, responsables y SLA. |
| Encuestas/NPS/email marketing | No existe. | Campanas, encuestas post-atencion y segmentacion de pacientes. |
| Control de caja y gastos | Cobros simples, sin caja formal. | Apertura/cierre de caja, arqueo, gastos, metodos de pago, reportes diarios. |
| Laboratorios | No existe. | Ordenes de laboratorio, proveedores, costos, fechas, estados y archivos. |
| Inventario | No existe. | Insumos, proveedores, entradas/salidas, stock minimo, lotes y vencimientos. |
| Reportes KPI y Excel | KPIs simples. | Reportes filtrables, exportacion Excel/CSV/PDF, cohortes, rendimiento por doctor, tratamientos, morosidad y caja. |
| Carga masiva | No existe. | Importador CSV/Excel con validacion, preview y rollback. |
| IA clinica/operativa | No existe, solo tarjetas visuales de videos. | Dictado clinico, resumen de paciente, busqueda semantica, analisis de agenda y reportes conversacionales. |

## Necesidades faltantes y prioridad

### Criticas para produccion

1. **Backend real y modelo multi-tenant**
   - Implementar API con autenticacion central, autorizacion RBAC/ABAC, tenant isolation en servidor y validacion de todos los writes.
   - Opcion pragmatica: Firebase Auth + Firestore rules estrictas por `tenantId` + Cloud Functions para operaciones sensibles.
   - Opcion mas controlada: backend Node/NestJS o Laravel + PostgreSQL + storage S3 compatible.
   - Necesario porque actualmente el aislamiento por clinica depende del cliente y no protege datos medicos.

2. **Autenticacion, roles y auditoria**
   - Reemplazar SHA-256 manual y `sessionStorage` como autoridad.
   - Agregar roles: propietario, administrador, recepcion, odontologo, asistente, cobranzas, solo lectura.
   - Registrar `auditLogs`: quien creo, modifico, elimino, cobro, anulo o exporto informacion.
   - Necesario por privacidad de datos clinicos, operaciones financieras y responsabilidad profesional.

3. **Reglas Firestore cerradas**
   - Eliminar regla global abierta.
   - Permitir operaciones solo a usuarios autenticados del mismo tenant.
   - Separar colecciones por tenant o exigir `tenantId` validado en cada documento.
   - Necesario porque la regla actual permite acceso amplio mientras este vigente y luego vence.

4. **Prevencion XSS y validacion de datos**
   - Sustituir renderizado con `innerHTML` de datos de pacientes, notas, nombres y configuraciones por `textContent` o templates sanitizados.
   - Eliminar `onclick` inline y usar event listeners.
   - Validar entradas en cliente y servidor.
   - Necesario porque nombres, observaciones, telefonos, correos y datos de clinica se inyectan en HTML.

5. **Modelo fiscal Honduras**
   - Cambiar localizacion de Chile a Honduras: RTN/DNI, HNL, ISV, CAI, rangos autorizados, fecha limite de emision, exento/exonerado/gravado 15/18.
   - Preparar arquitectura CFE: XML fiscal como fuente de verdad, PDF/impresion como representacion, retencion minima de 5 anos, numeracion correlativa y bitacora de anulaciones.
   - Disenar modo autoimpresor para clientes registrados ante SAR.
   - Fuente normativa de referencia: el reglamento publicado por SEFIN/La Gaceta define CAEE, sistemas de autorizacion electronica, autoimpresor y facturacion electronica pura en el regimen hondureno: [Acuerdo No. 058-2014 PDF](https://www.sefin.gob.hn/wp-content/uploads/2016/11/AcuerdoNo058-2014.pdf). El sitio del SAR publica informacion relacionada con facturacion y firma electronica: [SAR Facturacion](https://www.sar.gob.hn/helpie_faq_category/facturacion/) y [SAR Firma Electronica](https://www.sar.gob.hn/firmaelectronica/).

6. **Backups, retencion y recuperacion**
   - Backups diarios, versionado de documentos, restauracion por tenant, pruebas de recuperacion.
   - Para facturacion y expediente clinico, definir retencion minima legal y politica de eliminacion.
   - Necesario porque perder datos clinicos o fiscales vuelve inviable el producto.

### Necesarias para competir

7. **Expediente clinico completo**
   - Agregar anamnesis, alergias, antecedentes, medicamentos, diagnosticos, evoluciones, recetas, incapacidades, consentimientos, adjuntos, imagenes y odontograma versionado.
   - Implementar como submodulos dentro de `pacientes`: `resumen`, `clinica`, `odontograma`, `periodonto`, `documentos`, `presupuestos`, `pagos`, `comunicaciones`.

8. **Agenda profesional**
   - Agregar recursos: sillones, sucursales, horarios por doctor, bloqueos, feriados, recurrencias, tiempos por procedimiento, conflictos y lista de espera.
   - Agregar confirmacion automatica, no-show, cancelacion, reagendamiento y recordatorios.

9. **Caja, cobros y finanzas**
   - Separar presupuesto, plan de tratamiento, factura/recibo, pago, caja y comision.
   - Agregar apertura/cierre de caja, arqueo, anulaciones, notas de credito, metodos de pago y conciliacion.

10. **Reportes y exportaciones**
    - Reportes de ventas, cobranzas, morosidad, ocupacion, productividad por odontologo, conversion de presupuestos, tratamientos mas vendidos, pacientes nuevos/recurrentes, caja y comisiones.
    - Exportar CSV/XLSX/PDF con permisos y auditoria.

11. **Inventario y laboratorios**
    - Inventario por insumo, lote, proveedor, fecha de vencimiento, stock minimo y consumo por procedimiento.
    - Laboratorios con ordenes, estados, costos, archivos y vencimientos.

12. **Portal del paciente**
    - Reserva de citas, pre-registro, carga de documentos, aceptacion de consentimientos, historial de pagos, links de pago y encuestas.

13. **Comunicaciones**
    - Plantillas de WhatsApp/email/SMS, opt-in, historial por paciente, recordatorios, cumpleanos, reactivacion y seguimiento de presupuestos.

14. **Importacion y migracion**
    - Importador de pacientes, tratamientos, saldos, citas y usuarios desde CSV/Excel.
    - Preview de cambios, validacion de duplicados y rollback.

### Recomendadas como diferenciadores

15. **IA clinica responsable**
    - Dictado de notas clinicas a evolucion estructurada.
    - Resumen de paciente antes de la cita.
    - Busqueda semantica en historia clinica.
    - Nunca generar diagnosticos autonomos sin revision del profesional.

16. **IA operativa**
    - Analisis de agenda, huecos, no-show, recomendaciones de recordatorio y reportes conversacionales.
    - Alertas de mora, bajo stock y vencimiento de CAI/rangos.

17. **Contenido educativo real**
    - Reemplazar emojis/tarjetas por videos o animaciones reales con permisos de uso.
    - Conectar cada video a procedimientos y presupuestos.

## Plan de implementacion recomendado

### Fase 0: estabilizar el prototipo

- Crear datos demo consistentes o flujo de onboarding inicial; hoy la DB inicializa vacia.
- Quitar dependencias de `sessionStorage` como fuente principal de datos.
- Corregir localizacion: HNL, RTN/DNI, telefono Honduras, direccion y lenguaje fiscal local.
- Sanitizar renders con datos de usuario.
- Retirar `onclick` inline.
- Reemplazar emojis por iconos SVG consistentes.
- Documentar modelo actual y entidades.

### Fase 1: backbone SaaS

- Elegir arquitectura: Firebase productiva o backend propio.
- Implementar auth real, roles y tenant isolation.
- Redisenar Firestore/Postgres schema:
  - `tenants`
  - `users`
  - `patients`
  - `clinical_records`
  - `odontograms`
  - `periodontograms`
  - `appointments`
  - `treatment_plans`
  - `procedures`
  - `invoices`
  - `payments`
  - `cash_sessions`
  - `documents`
  - `communications`
  - `inventory_items`
  - `lab_orders`
  - `audit_logs`
- Agregar backups y ambientes `dev`, `staging`, `production`.

### Fase 2: expediente clinico y agenda

- Convertir ficha del paciente en workspace con tabs.
- Versionar odontograma y periodontograma por fecha.
- Agregar documentos, imagenes, consentimientos y recetas.
- Mejorar agenda con recursos, bloqueos, recurrencias, confirmaciones y lista de espera.

### Fase 3: finanzas y cumplimiento

- Implementar caja y gastos.
- Separar recibos internos de documentos fiscales.
- Agregar modulo CAI/autoimpresor primero:
  - Datos fiscales del emisor.
  - Rango autorizado.
  - Fecha limite.
  - Correlativo.
  - Validacion de ISV.
  - Alertas de vencimiento/rango.
- Preparar CFE/CAEE:
  - XML fiscal como documento canonico.
  - PDF derivado.
  - Estado: borrador, emitida, autorizada, anulada, rechazada.
  - Retencion minima de 5 anos.
  - Integracion SAR/GDFE aislada en backend.

### Fase 4: crecimiento

- Portal de paciente.
- Recordatorios automaticos.
- Reportes avanzados y exportaciones.
- Inventario y laboratorios.
- IA clinica y operativa con permisos, auditoria y revision humana.

## Estructura de carpetas recomendada

La carpeta actual esta plana: multiples `.html` en raiz, un CSS grande y scripts por pagina. Para crecer, conviene ordenar por capas y dominios.

Propuesta si se mantiene vanilla HTML/JS por ahora:

```text
ondental/
  app/
    pages/
      dashboard/
      agenda/
      pacientes/
      clinica/
      finanzas/
      administracion/
    components/
      sidebar/
      page-header/
      tables/
      forms/
      modals/
      toasts/
    modules/
      auth/
      tenants/
      patients/
      appointments/
      clinical-records/
      odontogram/
      periodontogram/
      billing/
      payments/
      reports/
      inventory/
      labs/
      communications/
    services/
      api/
      firebase/
      storage/
      notifications/
    styles/
      tokens.css
      base.css
      components.css
      layouts.css
      themes.css
    utils/
      formatters.js
      validators.js
      sanitizer.js
  docs/
  tests/
```

Propuesta si se migra a app moderna:

```text
apps/
  ondental-web/
  ondental-api/
packages/
  ui/
  domain/
  billing-hn/
  security/
  test-utils/
infra/
  firebase/
  deploy/
docs/
```

## Registro de estetica y diseno actual

### Identidad visual actual

- Estilo dark-first con glassmorphism, brillos, gradientes azul/teal y sombras fuertes.
- Tipografias `Syne` para titulos y `DM Sans` para cuerpo.
- Paleta saturada: azul electrico, teal neon, rojo de estado, dorado y morado.
- Sidebar fija con fondo translucido.
- Tarjetas con bordes brillantes, blur, sombras y radios medianos/altos.
- Uso frecuente de emojis como iconos de producto, metricas, acciones y marcas de clinicas.
- Modo claro existe como override, pero parece un parche sobre una UI pensada originalmente para oscuro.
- Hay muchos estilos inline en HTML/JS, lo que hace dificil mantener consistencia.

Evidencia local:

- `ondental/css/styles.css` declara explicitamente "Glassmorphism, Neon/Teal accents, Futuristic Aesthetics".
- `ondental/dashboard.html` usa emojis en metricas, accesos rapidos, CRM, comisiones y videos.
- `ondental/index.html` usa emojis como logos de clinicas.
- `ondental/js/main.js` usa emojis para logos de tenant y para el toggle claro/oscuro.
- `ondental/dashboard.html` usa formato `es-CL` y `CLP`; varias pantallas usan RUT.

### Problemas de percepcion profesional

1. **Los emojis reducen confianza**
   - En un sistema clinico, emojis como dinero, hospital, brillo, banco o fiesta hacen que el producto se vea como demo o app casual.
   - Ademas, cada sistema operativo renderiza emojis diferente, lo que rompe consistencia visual.

2. **Dark mode como default no encaja con operacion clinica**
   - Recepcion, caja y doctores trabajan muchas horas leyendo tablas, historiales y formularios.
   - Un fondo claro neutro reduce fatiga y se siente mas institucional.
   - El dark mode puede quedar como opcion secundaria.

3. **Exceso de glow y glassmorphism**
   - Se ve futurista, pero no necesariamente confiable para salud, dinero y datos fiscales.
   - El blur y las transparencias bajan contraste en tablas y formularios.

4. **La UI mezcla dashboard operativo con secciones decorativas**
   - "Videos 3D" con emojis parece contenido placeholder.
   - El dashboard deberia priorizar citas, atrasos, caja, tareas, alertas clinicas y productividad.

5. **Inconsistencia por estilos inline**
   - Los estilos inline impiden una evolucion ordenada del sistema.
   - Dificultan temas, responsive, accesibilidad y pruebas visuales.

6. **Localizacion incorrecta**
   - RUT, CLP, ejemplos `+56` y `es-CL` son senales de producto no adaptado a Honduras.
   - Para Ondigital, esto afecta ventas y confianza desde la primera demo.

## Direccion visual recomendada

Nombre del estilo objetivo: **Clinico Operacional Profesional**.

Principios:

- Light mode por defecto.
- Dark mode opcional, sobrio y sin neon.
- Iconos SVG consistentes, no emojis.
- Radios de 6 a 8 px para botones, inputs y tarjetas.
- Sombras muy sutiles o sin sombra en tablas.
- Separacion clara entre navegacion, toolbar, contenido y paneles.
- Densidad media/alta para recepcion, agenda, caja y reportes.
- Colores por funcion, no por decoracion.

Paleta recomendada:

| Token | Uso | Color sugerido |
| --- | --- | --- |
| `--bg-app` | fondo general | `#f6f8fb` |
| `--surface` | paneles | `#ffffff` |
| `--surface-muted` | headers de tabla | `#f1f5f9` |
| `--border` | divisores | `#d8e0ea` |
| `--text-primary` | texto principal | `#172033` |
| `--text-secondary` | texto secundario | `#64748b` |
| `--primary` | accion principal | `#2563eb` |
| `--clinical` | estado clinico | `#0f766e` |
| `--success` | pagado/confirmado | `#16a34a` |
| `--warning` | pendiente/vencimiento | `#d97706` |
| `--danger` | mora/cancelado/error | `#dc2626` |

Cambios concretos:

- Reemplazar logos emoji por iniciales, logotipo cargado por clinica o monograma profesional.
- Reemplazar iconos emoji por Lucide/Heroicons o set SVG propio.
- Convertir "Acciones Rapidas" en barra de acciones con icono + texto.
- Convertir "Tips Clinicos" en alertas contextuales o quitarlo del dashboard.
- Convertir "Videos 3D" en modulo real de educacion dentro de paciente/procedimiento, no en dashboard principal.
- Usar tablas mas limpias con filtros, ordenamiento, estado vacio, loading y errores.
- Crear componentes base: `Button`, `Badge`, `Table`, `Modal`, `Toast`, `FormField`, `PageHeader`, `Tabs`, `SidePanel`.
- Reducir textos celebratorios y usar copy profesional: "Cita confirmada", "Pago registrado", "Paciente actualizado".

## Dashboard recomendado

El dashboard debe ser una mesa de control, no una portada.

Bloques necesarios:

- Citas de hoy por estado.
- Proximas citas en riesgo: sin confirmar, tarde, pendiente de pago.
- Ocupacion por odontologo/sillon.
- Caja del dia: recibido, pendiente, anulaciones.
- Presupuestos pendientes y conversion.
- Tareas asignadas: cobranza, seguimiento, laboratorio, documentos faltantes.
- Alertas: CAI por vencer, stock bajo, consentimiento pendiente, paciente sin anamnesis.

Bloques que conviene mover o redisenar:

- Videos 3D: mover a paciente/procedimientos.
- Tips clinicos: convertir a ayuda contextual o checklist clinico.
- Emojis de metricas: reemplazar por iconos consistentes.

## Recomendacion final de prioridad

Orden sugerido:

1. Seguridad y backend multi-tenant.
2. Localizacion Honduras y facturacion fiscal base.
3. Reduccion de riesgo XSS y validacion.
4. Redesign profesional light-first.
5. Ficha clinica completa.
6. Agenda avanzada y recordatorios.
7. Caja, reportes y exportaciones.
8. Inventario, laboratorios y portal del paciente.
9. IA clinica/operativa.

Sin los puntos 1 a 4, OnDental puede servir como demo comercial, pero no deberia operar con datos reales de pacientes, pagos o facturacion. Con esos puntos resueltos, el sistema puede evolucionar hacia un SaaS dental competitivo para microempresas y clinicas pequenas en Honduras.

## Fuentes externas consultadas

- Dentalink, funcionalidades del software dental: <https://www.softwaredentalink.com/funcionalidades>
- SAR Honduras, categoria de facturacion: <https://www.sar.gob.hn/helpie_faq_category/facturacion/>
- SAR Honduras, firma electronica avanzada: <https://www.sar.gob.hn/firmaelectronica/>
- SEFIN/Honduras, Acuerdo No. 058-2014 sobre regimen de facturacion y documentos fiscales electronicos: <https://www.sefin.gob.hn/wp-content/uploads/2016/11/AcuerdoNo058-2014.pdf>
