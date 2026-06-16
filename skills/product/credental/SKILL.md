---
name: credental-product-spec
description: >
  Especificación completa del producto Credental — Sistema de Gestión Clínica Dental.
  Incluye estructura del proyecto, sistema multi-usuario/multi-empresa, componentes
  de software, decisiones de diseño y plan de verificación.
  Usar este skill siempre que se trabaje en el proyecto Credental.
version: 1.1.0
author: ONDIGITAL
depends_on:
  - skills/dental-references.md
  - skills/product/saas-product-ui/SKILL.md
  - skills/data/database-system/SKILL.md
  - skills/security/auth-access-control/SKILL.md
  - skills/design/design-systems/DESIGN.md
---

# Credental — Especificación de Producto

> **Credental** es una plataforma premium e intuitiva de gestión clínica dental, inspirada
> en las capacidades operativas de DentalLink y Doctocliq, pero con un enfoque visual y de
> experiencia de usuario (UX) completamente rediseñado bajo estándares modernos de diseño
> (aesthetics futuristas, glassmorphic, micro-animaciones, modo híbrido oscuro-clínico).

El proyecto consta de múltiples páginas HTML estáticas e interconectadas que utilizan
`localStorage` para simular una base de datos local en tiempo real, permitiendo una
experiencia de SPA (Single Page Application) sin necesidad de infraestructura de servidor,
ideal para demostraciones, portafolios y despliegues locales rápidos.

Para referencias del sector y benchmark, consultar `skills/dental-references.md`.

---

## 📁 Estructura del Proyecto

```
credental/
├── index.html            # Pantalla de Login Premium con branding dinámico por empresa
├── dashboard.html        # Dashboard principal con métricas clínicas y accesos rápidos
├── agenda.html           # Agenda / Calendario con buscadores autocompletables y duraciones extendidas
├── pacientes.html        # Directorio de pacientes, historias clínicas y fichas (con motivo de consulta)
├── odontograma.html      # El odontograma interactivo para tratamientos dentales
├── periodontograma.html  # Periodontograma detallado de estado periodontal (sondaje, sangrado, placa, etc.)
├── presupuestos.html     # Generador de presupuestos clínicos (PDF con branding y datos de clínica dinámicos)
├── cobranzas.html        # Módulo de cobranzas para confirmar pago, suspender o cancelar presupuestos
├── procedimientos.html   # Catálogo CRUD de items y procedimientos dentales (ID, nombre, costo, descripción)
├── configuracion.html    # Panel de administración para configurar ubicación, contacto y nombre de la clínica
├── css/
│   └── styles.css        # Hoja de estilos globales (Glassmorphism, colores premium, variables, autocomplete)
└── js/
    ├── db.js             # Motor de datos (DB relacional local con soporte de configuración, cobranza y procedimientos)
    ├── auth.js           # Guardián de seguridad (Multi-usuario, multi-empresa, sesión con branding)
    ├── main.js           # Lógica común (Sidebar con branding de empresa, notificaciones, componentes)
    ├── agenda.js         # Lógica del calendario, autocomplete de selectores, duraciones extendidas
    ├── pacientes.js      # Lógica de búsqueda, filtrado, creación de pacientes y registro de motivo de consulta
    ├── odontograma.js    # Lógica de dibujo SVG del mapa dental y selección de caras
    ├── periodontograma.js# Lógica de registro detallado del periodontograma (sondaje, recesión, margen, sangrado)
    ├── presupuestos.js   # Lógica de cálculo de presupuestos y exportación con datos dinámicos de clínica
    ├── cobranzas.js      # Lógica de control de estados de cobro y generación de PDF de recibos
    ├── procedimientos.js # Lógica de gestión CRUD de procedimientos y catálogo de aranceles
    └── configuracion.js  # Lógica de edición de configuración de la clínica para usuarios administradores
```

---

## 👥 Sistema Multi-Usuario y Multi-Empresa

### Empresas (Companies)

Se pre-cargan las siguientes 4 empresas en el sistema:

| ID | Nombre | Color de Acento | Descripción |
|----|--------|-----------------|-------------|
| `credental` | **Credental** | `#00e5b0` (verde azulado) | Empresa principal de gestión dental |
| `credental-central` | Credental Clínica Central | `#2b8af7` (azul digital) | Clínica central de operaciones |
| `sonrisa-perfecta` | Sonrisa Perfecta | `#f5a623` (dorado cálido) | Clínica especializada en estética dental |
| `dentpro` | DentPro Consultores | `#9b59b6` (púrpura profesional) | Consultores dentales especializados |

### Usuarios del Sistema

Se pre-cargan los siguientes 8 usuarios:

| Username | Contraseña | Nombre Completo | Rol | Empresa | Avatar |
|----------|------------|-----------------|-----|---------|--------|
| `admin` | `1234` | Administrador General | Administración | **Credental** | `AG` |
| `dentista` | `1234` | Dr. Sebastián Escoto | Dentista Principal | **Credental** | `SE` |
| `recepcion` | `1234` | María González Ruiz | Recepcionista | Credental Clínica Central | `MG` |
| `dra.lopez` | `1234` | Dra. Ana López Herrera | Odontóloga General | Credental Clínica Central | `AL` |
| `dr.martinez` | `1234` | Dr. Carlos Martínez Vega | Cirujano Maxilofacial | Sonrisa Perfecta | `CM` |
| `higienista` | `1234` | Laura Fernández Díaz | Higienista Dental | Sonrisa Perfecta | `LF` |
| `dr.ramirez` | `1234` | Dr. Roberto Ramírez Soto | Ortodoncista | DentPro Consultores | `RR` |
| `asistente` | `1234` | Patricia Morales Cruz | Asistente Dental | DentPro Consultores | `PM` |

Cada usuario tiene un campo `companyId` que vincula al usuario con su empresa correspondiente.

---

## 🔐 Decisiones de Diseño Clave

### Autenticación Multi-Usuario y Multi-Empresa

- Sistema de autenticación local con **8 usuarios distribuidos en 4 empresas/clínicas**.
- Cada usuario pertenece a una empresa específica mediante un campo `companyId`.
- Al iniciar sesión, el sistema carga automáticamente el branding (nombre, logo, color de acento) de la empresa correspondiente en el sidebar, header and pantalla de login.
- Las credenciales predeterminadas para demostración rápida son `admin / 1234` (empresa: **Credental**).

### Diseño y Estilo Visual

- Reutiliza y adapta el sistema visual premium ONDIGITAL (tipografías **Syne** y **DM Sans**, fondo de azul nocturno `--navy: #050f2c` con acentos en `--teal: #00e5b0` y `--blue-mid: #2b8af7`).
- Coherencia de marca con todo el ecosistema ONDIGITAL.
- Cada empresa puede tener un color de acento personalizado que se inyecta dinámicamente al iniciar sesión vía `--company-accent`.

### Odontograma Interactivo

- **Odontograma Interactivo en SVG/JS** que representa las 32 piezas dentales del adulto.
- Al hacer clic en cualquier diente o en sus caras (vestibular, palatina, oclusal, mesial, distal), el profesional puede marcar:
  - Caries (rojo)
  - Restauraciones (azul)
  - Piezas ausentes (gris)
  - Coronas (amarillo)
  - Implantes (verde azulado)
- Se autoguarda en el historial clínico del paciente en tiempo real.

### Periodontograma Detallado

- **Periodontograma Clínico Completo** que permite evaluar la salud de las encías y soporte de cada diente.
- El odontólogo puede registrar de forma interactiva en una cuadrícula especializada por cada diente (arcada superior e inferior, tanto por vestibular como por lingual/palatino):
  - **Margen Gingival (MG)** en mm.
  - **Profundidad de Sondaje (PS)** en mm (se genera un gráfico de bolsa periodontal dinámico si PS >= 4mm).
  - **Nivel de Inserción Clínica (NIC)** calculado automáticamente (`NIC = PS - MG` o `NIC = PS + Recesión`).
  - **Sangrado al Sondaje (SS)** (indicador visual rojo al hacer clic).
  - **Placa Bacteriana (PB)** (indicador visual amarillo/azul al hacer clic).
  - **Movilidad dental** (grados 0, 1, 2, 3).
  - **Compromiso de furca** (clase I, II, III).
- Permite guardar y graficar en tiempo real el perfil del periodonto del paciente.

### Módulo de Cobranzas

- Una sección centralizada de **Cobranzas** donde se enlista cada presupuesto generado en el sistema.
- Por cada presupuesto se muestra su folio, paciente, fecha, monto total, monto pagado, monto pendiente y su **Estado de Cobro** (`Pendiente`, `Pagado parcial`, `Pagado total`, `Suspendido`, `Cancelado`).
- **Acciones Rápida**:
  - **Confirmar Pago**: Permite registrar un abono o el pago total al presupuesto seleccionando el método de pago (Efectivo, Tarjeta, Transferencia), actualizando el monto pendiente y el estado.
  - **Suspender**: Detiene los cobros temporalmente (ideal para tratamientos pausados).
  - **Cancelar**: Cancela el presupuesto y los saldos pendientes.
  - **Generar PDF**: Permite exportar un recibo / comprobante de cobranza profesional en PDF con desglose de abonos.

### Catálogo de Procedimientos (Items)

- Sección de administración de **Procedimientos/Items** que sirve de base para el armado de presupuestos.
- Permite a los usuarios clínicos autorizados realizar operaciones **CRUD** (Crear, Leer, Actualizar, Eliminar).
- Cada procedimiento debe incluir obligatoriamente los siguientes campos:
  - **ID / Código**: Identificador único (ej. `PROC-001`).
  - **Nombre**: Título del tratamiento (ej. `Endodoncia Molar`).
  - **Costo**: Precio base sugerido en la moneda local.
  - **Descripción**: Breve detalle técnico o comercial del procedimiento.
- Se autoguarda en `localStorage` y actualiza inmediatamente la lista disponible en la creación de presupuestos.

### Configuración de la Clínica (Branding del Presupuesto)

- Nueva sección de **Configuración** exclusiva para usuarios con rol `Administración` (usuario `admin`).
- Permite modificar la información básica de la clínica asociada a la empresa actual:
  - **Nombre de la Clínica**: Reemplaza el título del presupuesto (que antes por defecto decía "Credental"). El PDF y la cabecera del presupuesto llevarán este nombre personalizado.
  - **Ubicación / Dirección**: Dirección física de la clínica que aparecerá en el pie de página o sección de datos del presupuesto.
  - **Contacto**: Teléfono de la clínica y correo electrónico de atención.
- Los datos se guardan en el perfil de la empresa dentro de la base de datos local y se inyectan dinámicamente en los presupuestos creados y en los PDFs generados.

### Motivo de Consulta en Registro de Pacientes

- Al registrar un nuevo paciente en `pacientes.html`, se añade un campo obligatorio de **Motivo de Consulta**.
- Este motivo de consulta describe la razón principal por la que el paciente acude a la clínica (ej. "Dolor en molar inferior derecho", "Limpieza de rutina", "Evaluación para ortodoncia").
- El motivo de consulta se almacena en el expediente del paciente en `db.js` y se muestra de forma prominente en su ficha de historial clínico.

---

## 🧩 Componentes de Software

### styles.css

Contiene el sistema de diseño completo:
- **Variables de color**: `#050f2c` (navy profundo), `#0a1a3a` (navy secundario), `#1a6fe8` (azul digital), `#00e5b0` (verde azulado curativo), `#ff4a5a` (caries/rojo), `#3dd68c` (restaurado/verde).
- **Variables dinámicas de empresa**: `--company-accent` se inyecta dinámicamente según la empresa del usuario logueado, cambiando los acentos de color en sidebar, header y botones primarios.
- **Glassmorphism**: Efectos de desenfoque (`backdrop-filter: blur(12px)`) con bordes translúcidos para tarjetas y menús.
- **Tipografía**: Importación de Google Fonts (**Syne** para encabezados de alto impacto, **DM Sans** para contenido legible y corporativo).
- **Diseño Responsivo**: Sidebar colapsable en móviles, cuadrículas fluidas adaptativas.
- **Estilos de Autocomplete**: Estilos premium para los componentes de búsqueda autocompletable.
- **Gráficos de Periodontograma**: Estilos y diagramación en CSS para la visualización interactiva del periodonto, con celdas de entrada numéricas de sondaje y colores condicionales para sangrado (rojo) y placa (amarillo/azul).

### db.js

El corazón de datos de la aplicación. Carga datos pre-poblados si no existen en `localStorage`:
- **Empresas pre-cargadas**: Las 4 empresas con datos de branding y campos adicionales para configuración de clínica (`nombreClinica`, `direccion`, `telefono`, `correo`).
- **Usuarios pre-cargados**: Los 8 usuarios con `companyId` asignado.
- **Pacientes pre-cargados**: Pacientes de prueba con historiales médicos básicos y el campo `motivoConsulta` inicializado.
- **Procedimientos pre-cargados**: Catálogo inicial de aranceles y tratamientos con ID, nombre, costo y descripción.
- **Cobranzas y abonos**: Tabla para registrar los pagos/abonos realizados a los presupuestos.
- **Funciones CRUD adicionales**:
  - `db.getProcedures()`, `db.saveProcedure(procedure)`, `db.deleteProcedure(id)` — CRUD de procedimientos
  - `db.getClinicaConfig(companyId)`, `db.saveClinicaConfig(companyId, config)` — Configuración de clínica
  - `db.getPayments(budgetId)`, `db.registerPayment(payment)` — Gestión de cobranzas y abonos
  - `db.getPeriodontogram(patientId)`, `db.savePeriodontogram(patientId, data)` — CRUD de periodontogramas

### auth.js

Controla la seguridad del lado del cliente con soporte multi-usuario y multi-empresa.

### index.html (Login)

- Interfaz premium de login con branding dinámico por empresa.

### dashboard.html

- Panel de control principal con accesos rápidos actualizados que incluyen **Cobranzas**, **Procedimientos** y **Configuración**.

### agenda.html

- Calendario clínico completo con buscadores autocompletables y duraciones de cita extendidas.

### pacientes.html

- Listado interactivo y ficha del paciente.
- **Modal de Registro**: Incluye el campo obligatorio `<textarea id="patient-reason" required placeholder="Ej: Dolor agudo en encía superior"></textarea>` para capturar el Motivo de Consulta.
- **Ficha del Paciente**: Muestra en la parte superior el Motivo de Consulta en una tarjeta destacada, junto con un acceso directo al **Periodontograma** y al **Odontograma**.

### periodontograma.html

- Pantalla interactiva que carga los datos del paciente y muestra una tabla detallada con las 32 piezas dentales.
- Cada diente tiene entradas interactivas para:
  - Margen Gingival (MG) [input numérico]
  - Profundidad de Sondaje (PS) [input numérico con validación gráfica]
  - Nivel de Inserción (NIC) [calculado por JS]
  - Sangrado al Sondaje (SS) [botón de alternar rojo]
  - Placa Bacteriana (PB) [botón de alternar azul/amarillo]
- Incluye un lienzo de dibujo gráfico (Canvas o SVG dinámico) que une las líneas de margen gingival y profundidad de sondaje para generar la curva periodontal visual del paciente (gráfica de sondaje).

### presupuestos.html

- Formulario de presupuestos con cálculo interactivo.
- Consume dinámicamente la lista de tratamientos desde el catálogo de procedimientos (`db.getProcedures()`).
- Al presionar **Guardar/Aceptar**, el presupuesto se registra automáticamente en la tabla de **Cobranzas** para su respectivo control financiero.
- **Exportación en PDF (`window.print`)**:
  - En lugar de "Credental", la cabecera muestra en tipografía elegante el `nombreClinica` configurado.
  - El pie de página y los datos del emisor se extraen de la `direccion`, `telefono` y `correo` guardados en la configuración de la clínica para esa empresa.

### cobranzas.html

- Vista en formato de tabla interactiva de todos los presupuestos emitidos.
- Filtro por estado de cobro (`Todos`, `Pendiente`, `Pagado parcial`, `Pagado total`, `Suspendido`, `Cancelado`) y buscador por nombre de paciente.
- Al hacer clic en un presupuesto, se abre un modal con:
  - Historial de abonos registrados.
  - Formulario para registrar un **Nuevo Pago** (monto, fecha, método de pago).
  - Botones de estado: `Confirmar Pago`, `Suspendido`, `Cancelado`.
  - Botón para imprimir el recibo/comprobante con el branding de la clínica.

### procedimientos.html

- Listado del catálogo de procedimientos odontológicos en una tabla con buscador.
- Botón **Agregar Procedimiento** que abre un modal para ingresar ID, Nombre, Costo y Descripción.
- Acciones de fila: **Editar** (abre el modal con datos pre-cargados) y **Eliminar** (con confirmación de seguridad).

### configuracion.html

- Formulario de configuración de clínica para el usuario `admin`.
- Campos editables: Nombre de la clínica, Dirección física, Teléfono y Correo de contacto.
- Al guardar, emite un toast de éxito, actualiza la base de datos local y refresca el branding que se aplicará a todos los documentos imprimibles.

---

## ✅ Plan de Verificación

### Pruebas Funcionales

1. **Gestión de Procedimientos (CRUD)**:
   - Ingresar a `procedimientos.html` con cualquier usuario clínico/admin.
   - Presionar "Agregar" y crear un procedimiento con ID `PROC-TEST`, Nombre `Limpieza Ultrasonido`, Costo `60.00` y Descripción `Prueba`.
   - Verificar que aparece en la tabla.
   - Editar el costo a `65.00` y verificar la actualización.
   - Eliminar el procedimiento y confirmar que desaparece de la lista.
   - Abrir `presupuestos.html` y comprobar que la lista de tratamientos disponibles en los dropdowns/autocomplete coincide exactamente con los procedimientos activos del catálogo.

2. **Registro de Paciente con Motivo de Consulta**:
   - Ingresar a `pacientes.html`.
   - Registrar un paciente ingresando el motivo de consulta: `Dolor al masticar en el sector izquierdo`.
   - Guardar y hacer clic en el expediente del paciente.
   - Verificar que el motivo de consulta se visualiza claramente en la ficha detallada y que no se pierde al recargar.

3. **Periodontograma Detallado**:
   - Abrir la ficha de un paciente y hacer clic en **Periodontograma**.
   - Ingresar valores de sondaje: `MG: 1`, `PS: 4` en el diente 18.
   - Verificar que el NIC se calcula como `3` o el valor correcto según fórmula.
   - Alternar la casilla de Sangrado (SS) y comprobar que se pinta en rojo.
   - Guardar el periodontograma y verificar que al volver a ingresar los valores y marcas persisten.
   - Confirmar que el gráfico dinámico de curvas periodontales se renderiza con los datos del sondaje.

4. **Flujo de Cobranzas**:
   - Crear un presupuesto en `presupuestos.html` por un total de `$200.00`. Guardar.
   - Dirigirse a `cobranzas.html`.
   - Verificar que el nuevo presupuesto aparece listado como `Pendiente` con monto total `$200.00` y deuda de `$200.00`.
   - Registrar un abono de `$100.00` mediante transferencia bancaria.
   - Comprobar que el estado cambia a `Pagado parcial`, mostrando abono de `$100.00` y saldo de `$100.00`.
   - Registrar otro abono de `$100.00` y verificar que pasa a `Pagado total`.
   - Probar los botones de `Suspendido` y `Cancelado` y comprobar los cambios de estado en la tabla.
   - Generar el PDF del recibo y validar que contenga el historial de pagos y el branding de la clínica.

5. **Configuración de Clínica y PDF Personalizado**:
   - Iniciar sesión como `admin`.
   - Ingresar a `configuracion.html`.
   - Cambiar los datos a: Nombre `Clínica Dental San Patricio`, Dirección `Av. Reforma 123`, Teléfono `555-1234` y Correo `info@sanpatricio.com`.
   - Guardar los cambios.
   - Ir a `presupuestos.html` y crear un presupuesto.
   - Presionar el botón de imprimir / Generar PDF.
   - Verificar en la vista preliminar de impresión que el título no sea "Credental" sino `Clínica Dental San Patricio` y que el contacto/ubicación muestre los datos de San Patricio.

### Verificación Manual

- Probar en Chrome y Firefox que la tabla de cobranzas sea responsiva y oculte columnas secundarias en móviles.
- Validar que un usuario sin rol de administración no tenga acceso visual ni funcional a `configuracion.html` (debe ser redirigido o mostrar mensaje de error elegante).
- Asegurar que al suspender o cancelar un presupuesto en cobranzas, las sumatorias del dashboard (estadísticas de ingresos esperados) se actualicen en consecuencia.
