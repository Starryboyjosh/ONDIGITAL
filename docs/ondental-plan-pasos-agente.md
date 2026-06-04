# Plan por pasos para mejorar OnDental

Estado actualizado: pasos 1, 2 y 3 completados. El trabajo pendiente empieza en el Paso 4.

Este documento esta pensado para trabajar con un agente por etapas. La instruccion recomendada es:

```text
Haz el Paso 4 del archivo docs/ondental-plan-pasos-agente.md.
```

Cuando ese paso quede terminado y revisado:

```text
Sigue con el Paso 5.
```

Regla general: cada paso debe quedar terminado, probado visualmente y sin mezclar alcance del siguiente paso.

## Estado de avance

| Paso | Estado | Nota |
| --- | --- | --- |
| Paso 1: Redisenar la estetica base | Completado | Mantener el nuevo estilo profesional como base visual. |
| Paso 2: Dashboard operativo | Completado | No rehacer salvo ajustes necesarios por pasos futuros. |
| Paso 3: Localizacion Honduras | Completado | Mantener HNL, RTN/DNI, +504 y lenguaje hondureno. |
| Paso 4: Ficha del paciente con estructura clinica | Pendiente actual | Siguiente paso a ejecutar. |
| Paso 5: Esqueleto de facturacion Honduras | Pendiente | Ejecutar despues de aprobar Paso 4. |
| Paso 6: Esqueleto de caja y finanzas | Pendiente | Ejecutar despues de Paso 5. |
| Paso 7: Esqueleto de reportes | Pendiente | Ejecutar despues de Paso 6. |
| Paso 8: Esqueleto de inventario | Pendiente | Ejecutar despues de Paso 7. |
| Paso 9: Esqueleto de laboratorios | Pendiente | Ejecutar despues de Paso 8. |
| Paso 10: Esqueleto de comunicaciones | Pendiente | Ejecutar despues de Paso 9. |
| Paso 11: Reorganizacion ligera de carpetas | Pendiente | Hacer solo cuando los modulos base esten estables. |
| Paso 12: Revision visual final | Pendiente | Cierre de esta etapa de prototipo. |

## Prompt actual recomendado

Usar este prompt para continuar:

```text
Lee @docs/ondental-plan-pasos-agente.md y trabaja SOLO el Paso 4.

Los pasos 1, 2 y 3 ya estan completados. Respeta el estilo visual profesional y la localizacion Honduras ya aplicados.

No avances al Paso 5.
No cambies autenticacion, Firebase, base de datos, usuarios, seguridad ni hosting.
Mantén el sistema en HTML/CSS/JS actual.
Haz cambios pequenos, coherentes y revisables.
Al final dime que archivos tocaste, que cambio y que falta revisar visualmente.
```

Archivos recomendados para el Paso 4:

```text
@docs/ondental-plan-pasos-agente.md
@ondental/pacientes.html
@ondental/js/pacientes.js
@ondental/css/styles.css
@ondental/odontograma.html
@ondental/periodontograma.html
```

## Alcance actual

Objetivo inmediato: convertir OnDental en un prototipo serio de producto clinico, con estetica profesional y esqueleto funcional claro.

Por ahora NO hacer:

- No migrar a Firebase/Auth/backend nuevo.
- No resolver seguridad productiva.
- No definir hosting final.
- No cambiar toda la arquitectura de datos.
- No convertirlo todavia en SaaS completo.

Si algun paso necesita datos, usar datos mock/locales o estructuras placeholder claras.

## Paso 1: Redisenar la estetica base [COMPLETADO]

Objetivo: cambiar OnDental de una estetica futurista/demo a una interfaz clinica profesional.

Cambios principales:

- Usar modo claro como default.
- Mantener modo oscuro solo como opcion secundaria sobria.
- Quitar el look neon/glassmorphism exagerado.
- Reducir brillos, sombras fuertes, transparencias y gradientes decorativos.
- Crear una paleta clinica sobria:
  - Fondo general claro.
  - Superficies blancas.
  - Bordes gris claro.
  - Azul profesional para acciones principales.
  - Verde para estados positivos.
  - Amarillo/naranja para advertencias.
  - Rojo solo para errores o estados criticos.
- Cambiar radios a 6-8 px en botones, inputs, tablas y tarjetas.
- Hacer sidebar, tablas, formularios y cards mas limpios.
- Quitar emojis visibles de navegacion, metricas, botones y titulos.
- Reemplazar emojis por iconos SVG consistentes o iniciales profesionales.

Archivos probables:

- `ondental/css/styles.css`
- `ondental/js/main.js`
- `ondental/index.html`
- `ondental/dashboard.html`
- Paginas HTML que tengan emojis visibles.

Criterios de aceptacion:

- El sistema abre con tema claro por defecto.
- No se ven emojis en dashboard, sidebar, login ni botones principales.
- La UI se siente como software clinico/administrativo, no como demo futurista.
- Los botones, tablas e inputs tienen contraste legible.
- No hay texto cortado ni elementos superpuestos en desktop.

No hacer en este paso:

- No crear modulos nuevos.
- No reestructurar carpetas.
- No tocar autenticacion ni base de datos.

## Paso 2: Dashboard operativo [COMPLETADO]

Objetivo: convertir el dashboard en una mesa de control de clinica.

Cambios principales:

- Redisenar el dashboard para mostrar informacion accionable.
- Mantener una estructura densa pero clara.
- Agregar tarjetas o bloques para:
  - Citas de hoy.
  - Citas sin confirmar.
  - Pacientes activos.
  - Pagos pendientes.
  - Presupuestos pendientes.
  - Caja del dia.
  - Alertas importantes.
  - Tareas de seguimiento.
- Mantener la tabla de agenda del dia como superficie principal.
- Agregar un bloque de tareas operativas:
  - Confirmar citas.
  - Cobrar saldo pendiente.
  - Dar seguimiento a presupuesto.
  - Completar documento faltante.
- Quitar o mover del dashboard:
  - Tips clinicos decorativos.
  - Videos 3D.
  - Secciones con emojis.
  - Contenido que no ayude a tomar decisiones.

Archivos probables:

- `ondental/dashboard.html`
- `ondental/css/styles.css`
- `ondental/js/db.js` solo si se necesitan helpers mock existentes.

Criterios de aceptacion:

- El primer viewport comunica estado operativo de la clinica.
- Hay acciones claras para recepcion/administracion.
- Si no hay datos, los estados vacios se ven profesionales.
- No hay contenido decorativo innecesario.

No hacer en este paso:

- No implementar reportes completos.
- No crear facturacion real.
- No cambiar storage.

## Paso 3: Localizacion Honduras [COMPLETADO]

Objetivo: quitar senales de Chile y preparar el producto para Honduras.

Cambios principales:

- Cambiar moneda de `CLP` a `HNL`.
- Cambiar formato `es-CL` por formato adecuado para Honduras.
- Reemplazar `RUT` por `RTN / DNI / Documento`.
- Cambiar ejemplos telefonicos `+56` por `+504`.
- Cambiar ejemplos de correo/direccion a contexto hondureno.
- Revisar textos de factura, recibos, pacientes, presupuestos y cobranzas.
- Crear helper de formato de moneda centralizado para no repetir `Intl.NumberFormat`.

Archivos probables:

- `ondental/dashboard.html`
- `ondental/pacientes.html`
- `ondental/presupuestos.html`
- `ondental/cobranzas.html`
- `ondental/configuracion.html`
- `ondental/js/presupuestos.js`
- `ondental/js/cobranzas.js`
- `ondental/js/procedimientos.js`
- `ondental/js/pacientes.js`
- `ondental/js/agenda.js`
- `ondental/js/main.js` o nuevo helper local.

Criterios de aceptacion:

- No aparece `CLP`, `RUT`, `es-CL` ni telefonos `+56` en la UI.
- Montos se muestran en lempiras.
- Documentos y formularios usan lenguaje hondureno.
- El cambio no rompe presupuestos, cobranzas ni dashboard.

No hacer en este paso:

- No implementar integracion SAR.
- No crear XML real.
- No tocar reglas fiscales complejas todavia.

## Paso 4: Ficha del paciente con estructura clinica [PENDIENTE ACTUAL]

Objetivo: convertir la ficha de paciente en el centro operativo del sistema.

Estructura recomendada de tabs o secciones:

- Resumen.
- Datos personales.
- Historia clinica.
- Anamnesis.
- Alergias y antecedentes.
- Diagnosticos.
- Evoluciones clinicas.
- Odontograma.
- Periodontograma.
- Presupuestos.
- Pagos.
- Documentos.
- Comunicaciones.

Cambios principales:

- Reorganizar la pantalla de pacientes para que no sea solo tabla + panel.
- Agregar tabs o navegacion secundaria dentro del paciente.
- Crear estados vacios para secciones todavia no implementadas.
- Mantener odontograma y periodontograma enlazados al paciente.
- Preparar estructura visual para adjuntos y consentimientos.

Archivos probables:

- `ondental/pacientes.html`
- `ondental/js/pacientes.js`
- `ondental/css/styles.css`
- Posiblemente `ondental/odontograma.html`
- Posiblemente `ondental/periodontograma.html`

Criterios de aceptacion:

- La ficha de paciente se siente como expediente clinico.
- Hay secciones claras para historia, documentos, pagos y comunicaciones.
- Los datos existentes siguen visibles.
- Las secciones nuevas pueden estar como placeholders profesionales.

No hacer en este paso:

- No implementar storage real de archivos.
- No implementar firma electronica.
- No hacer backend.

## Paso 5: Esqueleto de facturacion Honduras

Objetivo: agregar la estructura visual y de datos inicial para facturacion hondurena, sin integracion SAR todavia.

Secciones necesarias:

- Datos fiscales de la clinica:
  - RTN.
  - Nombre legal.
  - Direccion fiscal.
  - Telefono.
  - Correo.
- Configuracion CAI:
  - CAI actual.
  - Rango inicial.
  - Rango final.
  - Correlativo actual.
  - Fecha limite de emision.
  - Estado del rango.
- Documento fiscal:
  - Factura.
  - Recibo interno.
  - Nota de credito placeholder.
  - Anulacion placeholder.
- Preparacion futura CFE/CAEE:
  - Estado XML.
  - Estado autorizacion.
  - Fecha de emision.
  - Hash/identificador placeholder.

Cambios principales:

- Crear modulo o pantalla `facturacion.html` si no existe.
- Agregar acceso en sidebar.
- Agregar tarjetas de estado fiscal.
- Agregar tabla de documentos emitidos.
- Agregar formulario base de configuracion CAI.
- Agregar alertas por rango cerca de vencer o fecha limite cercana.

Archivos probables:

- `ondental/facturacion.html`
- `ondental/js/facturacion.js`
- `ondental/css/styles.css`
- `ondental/js/main.js`
- `ondental/js/db.js` solo para datos mock/locales.

Criterios de aceptacion:

- Existe un modulo visible de Facturacion.
- El modulo usa RTN, HNL, CAI y rango autorizado.
- Se ve preparado para autoimpresor y CFE/CAEE futuro.
- No promete integracion SAR si aun no existe.

No hacer en este paso:

- No generar XML real.
- No consumir APIs SAR.
- No implementar firma electronica.

## Paso 6: Esqueleto de caja y finanzas

Objetivo: separar cobros simples de operacion financiera real.

Secciones necesarias:

- Caja del dia.
- Apertura de caja.
- Cierre de caja.
- Metodos de pago:
  - Efectivo.
  - Tarjeta.
  - Transferencia.
  - Link de pago placeholder.
- Ingresos.
- Gastos.
- Anulaciones.
- Saldos pendientes.
- Comisiones.

Cambios principales:

- Mejorar `cobranzas.html` o crear `caja.html`.
- Agregar resumen diario.
- Agregar tabla de movimientos.
- Agregar estado de caja: abierta/cerrada.
- Agregar placeholders para arqueo y conciliacion.

Archivos probables:

- `ondental/cobranzas.html`
- `ondental/js/cobranzas.js`
- `ondental/caja.html` si se decide separar.
- `ondental/js/caja.js`
- `ondental/css/styles.css`
- `ondental/js/main.js`

Criterios de aceptacion:

- El usuario entiende diferencia entre presupuesto, pago, recibo y caja.
- Hay pantalla o seccion clara para caja diaria.
- Los movimientos se ven en tabla profesional.
- Hay estados vacios y placeholders bien escritos.

No hacer en este paso:

- No hacer conciliacion bancaria real.
- No integrar pasarelas de pago.

## Paso 7: Esqueleto de reportes

Objetivo: preparar reporteria basica para administracion.

Reportes iniciales:

- Ventas por periodo.
- Citas por estado.
- Pacientes nuevos.
- Tratamientos mas vendidos.
- Presupuestos aceptados/pendientes.
- Cobranza pendiente.
- Productividad por odontologo.
- Caja diaria.

Cambios principales:

- Crear `reportes.html`.
- Agregar filtros:
  - Rango de fechas.
  - Odontologo.
  - Sucursal/clinica.
  - Estado.
- Agregar placeholders de graficas simples o tablas.
- Agregar botones de exportacion placeholder:
  - CSV.
  - PDF.

Archivos probables:

- `ondental/reportes.html`
- `ondental/js/reportes.js`
- `ondental/css/styles.css`
- `ondental/js/main.js`

Criterios de aceptacion:

- Existe pantalla de reportes.
- Los filtros se ven listos aunque usen datos mock.
- Hay tablas o bloques de resultados.
- Los botones de exportar no deben prometer funcionalidad si aun no existe.

No hacer en este paso:

- No instalar librerias de graficas si no es necesario.
- No implementar export real todavia.

## Paso 8: Esqueleto de inventario

Objetivo: preparar control de insumos clinicos.

Secciones necesarias:

- Insumos.
- Categorias.
- Proveedores.
- Stock actual.
- Stock minimo.
- Entradas.
- Salidas.
- Lotes.
- Vencimientos.

Cambios principales:

- Crear `inventario.html`.
- Agregar tabla de insumos.
- Agregar cards de alertas:
  - Stock bajo.
  - Proximo vencimiento.
  - Sin proveedor.
- Agregar formulario placeholder para crear insumo.

Archivos probables:

- `ondental/inventario.html`
- `ondental/js/inventario.js`
- `ondental/css/styles.css`
- `ondental/js/main.js`

Criterios de aceptacion:

- Existe pantalla de inventario.
- Se entiende que es para insumos dentales.
- Hay estados de stock y vencimiento.
- La UI esta alineada con el resto del sistema.

No hacer en este paso:

- No implementar compras completas.
- No conectar proveedores reales.

## Paso 9: Esqueleto de laboratorios

Objetivo: preparar seguimiento de trabajos enviados a laboratorio dental.

Secciones necesarias:

- Ordenes de laboratorio.
- Paciente.
- Tratamiento.
- Laboratorio/proveedor.
- Fecha de envio.
- Fecha esperada.
- Estado.
- Costo.
- Adjuntos placeholder.

Cambios principales:

- Crear `laboratorios.html`.
- Agregar tabla de ordenes.
- Agregar filtros por estado.
- Agregar formulario placeholder para nueva orden.
- Agregar estados:
  - Pendiente.
  - Enviado.
  - En proceso.
  - Recibido.
  - Entregado al paciente.

Archivos probables:

- `ondental/laboratorios.html`
- `ondental/js/laboratorios.js`
- `ondental/css/styles.css`
- `ondental/js/main.js`

Criterios de aceptacion:

- Existe pantalla de laboratorios.
- Los estados son claros.
- Se relaciona visualmente con paciente/tratamiento.
- No parece modulo generico de inventario.

No hacer en este paso:

- No implementar archivos reales.
- No implementar notificaciones automaticas.

## Paso 10: Esqueleto de comunicaciones

Objetivo: preparar recordatorios y seguimiento de pacientes.

Secciones necesarias:

- Plantillas.
- Recordatorios de citas.
- Seguimiento de presupuestos.
- Cobranza.
- Cumpleanos/reactivacion.
- Historial por paciente.

Cambios principales:

- Crear `comunicaciones.html`.
- Agregar tarjetas de plantillas.
- Agregar tabla de mensajes recientes.
- Agregar filtros por tipo.
- Agregar acciones placeholder:
  - Enviar WhatsApp.
  - Enviar email.
  - Programar recordatorio.

Archivos probables:

- `ondental/comunicaciones.html`
- `ondental/js/comunicaciones.js`
- `ondental/css/styles.css`
- `ondental/js/main.js`

Criterios de aceptacion:

- Existe pantalla de comunicaciones.
- Las plantillas tienen lenguaje profesional.
- Queda claro que algunos envios son placeholder si no hay integracion.
- Se conecta conceptualmente con pacientes, agenda y cobranzas.

No hacer en este paso:

- No integrar WhatsApp Business API todavia.
- No integrar email transaccional todavia.

## Paso 11: Reorganizacion ligera de carpetas

Objetivo: ordenar el proyecto sin romperlo.

Importante: este paso debe hacerse solo cuando el rediseño y los modulos base ya esten estables.

Cambios recomendados:

- Separar estilos por responsabilidad:
  - `styles/tokens.css`
  - `styles/base.css`
  - `styles/layout.css`
  - `styles/components.css`
  - `styles/themes.css`
- Separar JS por modulo:
  - `modules/pacientes/`
  - `modules/agenda/`
  - `modules/facturacion/`
  - `modules/caja/`
  - `modules/reportes/`
  - `modules/inventario/`
  - `modules/laboratorios/`
  - `modules/comunicaciones/`
- Mantener compatibilidad de rutas o actualizar todos los HTML.

Criterios de aceptacion:

- La app sigue abriendo todas las paginas.
- No hay scripts/css rotos por rutas.
- La estructura es mas facil de mantener.

No hacer en este paso:

- No reescribir toda la app a framework.
- No cambiar almacenamiento.

## Paso 12: Revision visual final

Objetivo: validar consistencia antes de seguir a arquitectura/backend.

Checklist:

- Revisar desktop.
- Revisar mobile/tablet si aplica.
- Revisar dashboard.
- Revisar pacientes.
- Revisar agenda.
- Revisar presupuestos.
- Revisar cobranzas/caja.
- Revisar facturacion.
- Revisar reportes.
- Confirmar que no hay emojis visibles en UI profesional.
- Confirmar que no quedan textos de Chile.
- Confirmar que los estados vacios se ven profesionales.
- Confirmar que la navegacion no se siente saturada.
- Confirmar que los placeholders no prometen funciones inexistentes.

Criterios de aceptacion:

- La app se puede demoear como producto serio.
- La estructura funcional se entiende sin explicar demasiado.
- El diseño visual es consistente en las paginas principales.
- Queda claro que sigue siendo prototipo, pero con direccion de producto.

## Siguiente etapa despues de estos pasos

Cuando estos pasos esten listos, entonces conviene volver a decisiones de arquitectura:

- Base local SQLite vs nube vs hibrido.
- Modelo de usuarios.
- Permisos.
- Backups.
- Seguridad.
- Facturacion electronica real.
- Integraciones.

Hasta entonces, mantener el foco en prototipo profesional y estructura funcional.
