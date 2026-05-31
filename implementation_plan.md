# Plan de Implementación: OnDental — Sistema de Gestión Clínica Dental

**OnDental** es una plataforma premium e intuitiva de gestión clínica dental, inspirada en las capacidades operativas de DentalLink, pero con un enfoque visual y de experiencia de usuario (UX) completamente rediseñado bajo estándares modernos de diseño (aesthetics futuristas, glassmorphic, micro-animaciones, modo híbrido oscuro-clínico). 

El proyecto consta de múltiples páginas HTML estáticas e interconectadas que utilizan `localStorage` para simular una base de datos local en tiempo real, permitiendo una experiencia de SPA (Single Page Application) sin necesidad de infraestructura de servidor, ideal para demostraciones, portafolios y despliegues locales rápidos.

---

## User Review Required

> [!IMPORTANT]
> **Autenticación Multi-Usuario y Multi-Empresa**:
> - Se implementará un sistema de autenticación local con **8 usuarios distribuidos en 4 empresas/clínicas**. Cada usuario pertenece a una empresa específica mediante un campo `companyId`. Al iniciar sesión, el sistema carga automáticamente el branding (nombre, logo, color de acento) de la empresa correspondiente en el sidebar, header y pantalla de login. Las credenciales predeterminadas para demostración rápida son `admin / 1234` (empresa: **Credental**). ¿Desea agregar más usuarios o empresas, o ajustar las asignaciones propuestas?
>
> **Diseño y Estilo Visual**:
> - Reutilizaremos y adaptaremos el sistema visual premium detectado en el archivo original `OnDigital` (tipografías **Syne** y **DM Sans**, fondo de azul nocturno `--navy: #050f2c` con acentos en `--teal: #00e5b0` y `--blue-mid: #2b8af7`). Esto dará coherencia de marca a todo su ecosistema y se verá espectacular y de gama alta. Cada empresa podrá tener un color de acento personalizado que se inyecta dinámicamente al iniciar sesión.
>
> **El Odontograma Interactivo**:
> - La pieza central clínica será un **Odontograma Interactivo en SVG/JS** que representará las 32 piezas dentales del adulto. Al hacer clic en cualquier diente o en sus caras (vestibular, palatina, oclusal, mesial, distal), el odontopediatra o dentista general podrá marcar caries (rojo), restauraciones (azul), piezas ausentes (gris), coronas (amarillo) e implantes (verde azulado). Se autoguardará en el historial clínico del paciente en tiempo real.
>
> **Buscadores Inteligentes en la Agenda**:
> - Los selectores de paciente y profesional en el formulario de citas de `agenda.html` utilizarán campos de **autocompletado con búsqueda en tiempo real** (searchable autocomplete inputs) en lugar de dropdowns `<select>` simples. Esto permitirá encontrar pacientes y profesionales rápidamente escribiendo parte del nombre, RUT o especialidad, mostrando resultados filtrados en un menú desplegable dinámico. ¿Desea que se aplique el mismo patrón de búsqueda en otros selectores del sistema (presupuestos, odontograma)?
>
> **Duraciones de Cita Extendidas**:
> - El selector de duración de cita se extenderá hasta **6 horas** para cubrir procedimientos complejos (cirugías maxilofaciales, rehabilitaciones orales completas, etc.). Las opciones serán: 15 min, 30 min, 45 min, 1h, 1h30, 2h, 2h30, 3h, 3h30, 4h, 4h30, 5h, 5h30, 6h.

---

## Open Questions

> [!NOTE]
> 1. **¿Desea roles diferenciados en esta primera fase?**
>    - Por ejemplo: El Administrador/Recepcionista tiene acceso a facturación y agenda general, mientras que el Dentista tiene acceso a historias clínicas y odontogramas. En el plan inicial, implementaremos un panel común donde el usuario puede operar todas las áreas de manera unificada con una gran UX.
> 2. **¿Desea soporte para impresión de presupuestos?**
>    - Podemos programar un generador de PDFs nativo del navegador (`window.print` optimizado con estilos de impresión CSS personalizados) para que la clínica imprima o guarde presupuestos en PDF con aspecto profesional con un solo clic.
> 3. **¿Desea que los datos (pacientes, citas, presupuestos) estén filtrados por empresa?**
>    - Actualmente los datos en `localStorage` son compartidos. Podemos segmentarlos por `companyId` para que cada empresa solo vea sus propios datos, o dejar una vista unificada para administración central.

---

## Proposed Changes

Crearemos una nueva carpeta llamada `ondental` en la raíz del espacio de trabajo `/home/escoto/Documentos/ONDIGITAL/ondental` para organizar de manera impecable el código.

### Estructura del Proyecto

```
ondental/
├── index.html            # Pantalla de Login Premium con branding dinámico por empresa
├── dashboard.html        # Dashboard principal con métricas clínicas y accesos rápidos
├── agenda.html           # Agenda / Calendario con buscadores autocompletables y duraciones extendidas
├── pacientes.html        # Directorio de pacientes, historias clínicas y fichas
├── odontograma.html      # El odontograma interactivo para tratamientos dentales
├── presupuestos.html     # Generador de presupuestos, pagos y facturación
├── css/
│   └── styles.css        # Hoja de estilos globales (Glassmorphism, colores premium, variables, autocomplete)
└── js/
    ├── db.js             # Motor de datos (DB relacional sobre localStorage con empresas y usuarios)
    ├── auth.js           # Guardián de seguridad (Multi-usuario, multi-empresa, sesión con branding)
    ├── main.js           # Lógica común (Sidebar con branding de empresa, notificaciones, componentes)
    ├── agenda.js         # Lógica del calendario, autocomplete de selectores, duraciones extendidas
    ├── pacientes.js      # Lógica de búsqueda, filtrado y creación de historias clínicas
    ├── odontograma.js    # Lógica de dibujo SVG del mapa dental y selección de caras
    └── presupuestos.js   # Lógica de cálculo de presupuestos y exportación
```

---

### Sistema Multi-Usuario y Multi-Empresa

#### Empresas (Companies)

Se pre-cargarán las siguientes 4 empresas en el sistema:

| ID | Nombre | Color de Acento | Descripción |
|----|--------|-----------------|-------------|
| `credental` | **Credental** | `#00e5b0` (verde azulado) | Empresa principal de gestión dental |
| `ondental-central` | OnDental Clínica Central | `#2b8af7` (azul digital) | Clínica central de operaciones |
| `sonrisa-perfecta` | Sonrisa Perfecta | `#f5a623` (dorado cálido) | Clínica especializada en estética dental |
| `dentpro` | DentPro Consultores | `#9b59b6` (púrpura profesional) | Consultores dentales especializados |

#### Usuarios del Sistema

Se pre-cargarán los siguientes 8 usuarios:

| Username | Contraseña | Nombre Completo | Rol | Empresa | Avatar |
|----------|------------|-----------------|-----|---------|--------|
| `admin` | `1234` | Administrador General | Administración | **Credental** | `AG` |
| `dentista` | `1234` | Dr. Sebastián Escoto | Dentista Principal | **Credental** | `SE` |
| `recepcion` | `1234` | María González Ruiz | Recepcionista | OnDental Clínica Central | `MG` |
| `dra.lopez` | `1234` | Dra. Ana López Herrera | Odontóloga General | OnDental Clínica Central | `AL` |
| `dr.martinez` | `1234` | Dr. Carlos Martínez Vega | Cirujano Maxilofacial | Sonrisa Perfecta | `CM` |
| `higienista` | `1234` | Laura Fernández Díaz | Higienista Dental | Sonrisa Perfecta | `LF` |
| `dr.ramirez` | `1234` | Dr. Roberto Ramírez Soto | Ortodoncista | DentPro Consultores | `RR` |
| `asistente` | `1234` | Patricia Morales Cruz | Asistente Dental | DentPro Consultores | `PM` |

Cada usuario tiene un campo `companyId` que vincula al usuario con su empresa correspondiente.

---

### Componentes de Software

#### [NEW] [styles.css](file:///home/escoto/Documentos/ONDIGITAL/ondental/css/styles.css)
Contendrá el sistema de diseño completo:
- **Variables de color**: `#050f2c` (navy profundo), `#0a1a3a` (navy secundario), `#1a6fe8` (azul digital), `#00e5b0` (verde azulado curativo), `#ff4a5a` (caries/rojo), `#3dd68c` (restaurado/verde).
- **Variables dinámicas de empresa**: `--company-accent` se inyectará dinámicamente según la empresa del usuario logueado, cambiando los acentos de color en sidebar, header y botones primarios.
- **Glassmorphism**: Efectos de desenfoque (`backdrop-filter: blur(12px)`) con bordes translúcidos para tarjetas y menús.
- **Tipografía**: Importación de Google Fonts (**Syne** para encabezados de alto impacto, **DM Sans** para contenido legible y corporativo).
- **Diseño Responsivo**: Sidebar colapsable en móviles, cuadrículas fluidas adaptativas.
- **Micro-animaciones**: Transiciones de escala al pasar el cursor sobre tarjetas y botones, efectos de brillo shimmer para cargas.
- **Estilos de Autocomplete**: Estilos premium para los componentes de búsqueda autocompletable (`.autocomplete-wrapper`, `.autocomplete-results`, `.autocomplete-item`, `.autocomplete-item.highlighted`), incluyendo efectos glassmorphic en el menú de resultados, resaltado de coincidencias, animaciones de entrada/salida suaves.

#### [NEW] [db.js](file:///home/escoto/Documentos/ONDIGITAL/ondental/js/db.js)
El corazón de datos de la aplicación. Cargará datos pre-poblados si no existen en `localStorage`:
- **Empresas pre-cargadas**: Las 4 empresas definidas arriba con sus datos de branding (nombre, color de acento, descripción). Accesibles vía `db.getCompanies()` y `db.getCompany(companyId)`.
- **Usuarios pre-cargados**: Los 8 usuarios definidos arriba, cada uno con su `companyId` asignado. Accesibles vía `db.getUsers()` y `db.getUsersByCompany(companyId)`.
- **Pacientes pre-cargados**: Pacientes de prueba con historiales médicos básicos y tratamientos asignados para que la app se vea activa desde el primer segundo.
- **Citas pre-cargadas**: Citas programadas para la semana actual.
- **Dentistas/Profesionales**: Lista de profesionales que se consulta para los selectores autocomplete de la agenda, derivada de los usuarios con roles clínicos.
- **Funciones CRUD**:
  - `db.getCompanies()`, `db.getCompany(companyId)` — Consultar empresas
  - `db.getUsers()`, `db.getUsersByCompany(companyId)` — Consultar usuarios
  - `db.getPatients()`, `db.savePatient(patient)` — CRUD de pacientes
  - `db.getDentists()` — Obtener profesionales clínicos (para selectores autocomplete)
  - `db.getAppointments()`, `db.saveAppointment(appt)` — CRUD de citas
  - `db.getBudgets()`, `db.saveBudget(budget)` — CRUD de presupuestos
  - `db.getOdontogram(patientId)`, `db.saveOdontogram(patientId, data)` — CRUD de odontogramas
  - `db.searchPatients(query)` — Búsqueda de pacientes por nombre, RUT o teléfono (para autocomplete)
  - `db.searchDentists(query)` — Búsqueda de profesionales por nombre o especialidad (para autocomplete)

#### [NEW] [auth.js](file:///home/escoto/Documentos/ONDIGITAL/ondental/js/auth.js)
Controla la seguridad del lado del cliente con soporte multi-usuario y multi-empresa:
- **Usuarios registrados**: 8 usuarios distribuidos en 4 empresas:
  ```javascript
  const validUsers = [
    { username: 'admin', name: 'Administrador General', role: 'Administración', avatar: 'AG', companyId: 'credental' },
    { username: 'dentista', name: 'Dr. Sebastián Escoto', role: 'Dentista Principal', avatar: 'SE', companyId: 'credental' },
    { username: 'recepcion', name: 'María González Ruiz', role: 'Recepcionista', avatar: 'MG', companyId: 'ondental-central' },
    { username: 'dra.lopez', name: 'Dra. Ana López Herrera', role: 'Odontóloga General', avatar: 'AL', companyId: 'ondental-central' },
    { username: 'dr.martinez', name: 'Dr. Carlos Martínez Vega', role: 'Cirujano Maxilofacial', avatar: 'CM', companyId: 'sonrisa-perfecta' },
    { username: 'higienista', name: 'Laura Fernández Díaz', role: 'Higienista Dental', avatar: 'LF', companyId: 'sonrisa-perfecta' },
    { username: 'dr.ramirez', name: 'Dr. Roberto Ramírez Soto', role: 'Ortodoncista', avatar: 'RR', companyId: 'dentpro' },
    { username: 'asistente', name: 'Patricia Morales Cruz', role: 'Asistente Dental', avatar: 'PM', companyId: 'dentpro' }
  ];
  ```
- `auth.login(user, pass)`: Verifica las credenciales contra la lista de usuarios válidos. Si coincide, guarda el objeto de usuario completo (incluyendo `companyId`) y los datos de la empresa en `sessionStorage` o `localStorage`, luego redirige a `dashboard.html`.
- `auth.checkSession()`: Se ejecuta al inicio de cada página. Si no hay sesión iniciada, redirige de inmediato a `index.html` con un mensaje elegante de acceso denegado. Si hay sesión, retorna el objeto de usuario con la información de empresa para que la página pueda aplicar el branding correspondiente.
- `auth.getCurrentUser()`: Retorna el objeto del usuario actualmente logueado, incluyendo `companyId`, `name`, `role`, y `avatar`.
- `auth.getCurrentCompany()`: Retorna el objeto de empresa del usuario actual (nombre, color de acento, logo) para inyectar branding dinámico.
- `auth.logout()`: Destruye la sesión y redirige al login.

#### [NEW] [index.html](file:///home/escoto/Documentos/ONDIGITAL/ondental/index.html) (Login con Branding de Empresa)
- Interfaz premium de login con fondo interactivo animado.
- Formulario flotante con inputs con transiciones de color de foco.
- **Branding dinámico por empresa**: Al ingresar un nombre de usuario válido (evento `blur` o `input` con debounce), el sistema detecta la empresa del usuario y actualiza dinámicamente la pantalla de login:
  - Muestra el nombre de la empresa debajo del logo/título de la app.
  - Cambia el color de acento del formulario al color corporativo de la empresa.
  - Añade una sutil animación de transición al revelar el branding.
  - Si el usuario no existe, mantiene el branding genérico de OnDental.
- Mensajes interactivos de error en caso de credenciales incorrectas con animación shake.
- **Panel de credenciales de demostración** expandible que muestra todos los usuarios disponibles organizados por empresa, para facilitar las pruebas:
  - Credental: `admin / 1234`, `dentista / 1234`
  - OnDental Clínica Central: `recepcion / 1234`, `dra.lopez / 1234`
  - Sonrisa Perfecta: `dr.martinez / 1234`, `higienista / 1234`
  - DentPro Consultores: `dr.ramirez / 1234`, `asistente / 1234`

#### [NEW] [dashboard.html](file:///home/escoto/Documentos/ONDIGITAL/ondental/dashboard.html)
- Panel de control principal.
- **Header con branding de empresa**: Muestra el nombre de la empresa del usuario logueado, su rol, y avatar personalizado. El color de acento del header se adapta dinámicamente al color corporativo de la empresa.
- **Sidebar con identidad corporativa**: El nombre y logo de la empresa aparecen en la parte superior del sidebar, con el color de acento como línea decorativa.
- Tarjetas de estadísticas dinámicas (Citas hoy, Pacientes totales, Ingresos mensuales estimados, Tratamientos pendientes).
- Sección de **Acciones Rápidas** con botones flotantes (Crear Cita, Registrar Paciente, Crear Presupuesto).
- Lista de citas para el día de hoy, con cambio de estado rápido de "Pendiente" a "Confirmada" o "Completada".

#### [NEW] [agenda.html](file:///home/escoto/Documentos/ONDIGITAL/ondental/agenda.html)
- Calendario clínico completo con branding de empresa en header/sidebar.
- Vista de semana/día dinámica.
- Formulario modal emergente para añadir una nueva cita con las siguientes mejoras:
  - **Selector de paciente con búsqueda autocompletable**: En lugar de un `<select>` con scroll, se implementa un `<input type="text">` con un componente de autocomplete personalizado. Al escribir, se filtran los pacientes por nombre o RUT en tiempo real, mostrando los resultados en un menú desplegable glassmorphic debajo del campo. Al seleccionar un resultado, se captura el `id` del paciente en un campo hidden. Incluye:
    - Filtrado en tiempo real con debounce de 200ms.
    - Resaltado de texto coincidente (highlighting) en los resultados.
    - Navegación con teclado (↑ ↓ Enter Escape).
    - Indicador de "Sin resultados" si no hay coincidencias.
    - Botón de limpiar (×) para resetear la selección.
  - **Selector de profesional (dentista/odontólogo) con búsqueda autocompletable**: Mismo componente de autocomplete aplicado al selector de profesional. Filtra por nombre o especialidad. Permite buscar por ejemplo "cirujano" y encontrar al "Dr. Carlos Martínez Vega - Cirujano Maxilofacial".
  - Fecha y hora con selectores nativos.
  - **Selector de duración extendido hasta 6 horas**:
    ```html
    <select id="appt-duration" class="form-control" required>
      <option value="15">15 minutos</option>
      <option value="30" selected>30 minutos</option>
      <option value="45">45 minutos</option>
      <option value="60">1 hora</option>
      <option value="90">1 hora 30 min</option>
      <option value="120">2 horas</option>
      <option value="150">2 horas 30 min</option>
      <option value="180">3 horas</option>
      <option value="210">3 horas 30 min</option>
      <option value="240">4 horas</option>
      <option value="270">4 horas 30 min</option>
      <option value="300">5 horas</option>
      <option value="330">5 horas 30 min</option>
      <option value="360">6 horas</option>
    </select>
    ```
  - Especialidad (Limpieza, Endodoncia, Ortodoncia, Estética, Cirugía, Rehabilitación Oral).
  - Estado inicial (Pendiente, Confirmada).

#### [NEW] [pacientes.html](file:///home/escoto/Documentos/ONDIGITAL/ondental/pacientes.html)
- Listado interactivo en formato de tabla/tarjetas de pacientes.
- Buscador predictivo en tiempo real por nombre, rut/cédula o teléfono.
- Modal para registrar nuevo paciente (nombre, rut, edad, teléfono, correo, alergias, antecedentes médicos).
- Panel detallado del paciente al hacer clic:
  - Ficha de datos personales.
  - Historial de citas pasadas y futuras.
  - Historial de tratamientos.
  - Botón de **Acceso directo al Odontograma Clínico**.

#### [NEW] [odontograma.html](file:///home/escoto/Documentos/ONDIGITAL/ondental/odontograma.html)
- Representación visual interactiva en formato SVG de las dos arcadas dentales (32 dientes en total).
- Cada diente está dividido en sus **5 caras**: Superior (Oclusal/Incisal), Izquierda (Mesial), Derecha (Distal), Arriba (Vestibular), Abajo (Palatina/Lingual).
- **Selector de Tratamiento/Estado**:
  - Caries (Color Rojo translúcido sobre la cara específica).
  - Restaurado (Color Azul translúcido sobre la cara específica).
  - Ausente / Extraído (Se tacha el diente entero en gris).
  - Corona (Se dibuja un contorno dorado brillante sobre la corona del diente).
  - Implante (Se dibuja un perno de titanio color turquesa sobre la raíz del diente).
- Caja de historial clínico lateral que muestra cronológicamente las anotaciones y cambios de cada diente.

#### [NEW] [presupuestos.html](file:///home/escoto/Documentos/ONDIGITAL/ondental/presupuestos.html)
- Generador de presupuestos clínicos.
- Búsqueda de paciente e historial de presupuestos generados.
- Formulario de creación de presupuesto interactivo:
  - Selector de tratamientos preestablecidos con precios sugeridos (Ej: "Limpieza Profunda - $50.00", "Endodoncia Molar - $250.00", "Blanqueamiento - $120.00").
  - Aplicador de descuentos porcentuales.
  - Selector de estado (Borrador, Aceptado, Rechazado).
  - Tabla interactiva de desglose con sumas automáticas e IVA.
- Vista de impresión optimizada para guardar como PDF clínico impecable.

---

## Verification Plan

### Automated / Browser-based Testing
Utilizaremos pruebas visuales y funcionales en el navegador:

1. **Inicio de Sesión Multi-Usuario**:
   - Ingresar credenciales erróneas y comprobar que salta el aviso de error con animación shake.
   - Ingresar credenciales correctas para cada uno de los 8 usuarios y verificar redirección a `dashboard.html`.
   - **Probar todos los usuarios**: `admin`, `dentista`, `recepcion`, `dra.lopez`, `dr.martinez`, `higienista`, `dr.ramirez`, `asistente` — todos con contraseña `1234`.
   - Verificar que cada usuario ve el branding correcto de su empresa en el dashboard.

2. **Branding Dinámico de Empresa en Login**:
   - Escribir `admin` en el campo de usuario y verificar que aparece "Credental" como nombre de empresa con su color de acento `#00e5b0`.
   - Escribir `dr.martinez` y verificar que aparece "Sonrisa Perfecta" con acento `#f5a623`.
   - Escribir `dr.ramirez` y verificar que aparece "DentPro Consultores" con acento `#9b59b6`.
   - Escribir un usuario inexistente y verificar que se mantiene el branding genérico.
   - Verificar transición suave al cambiar entre usuarios de diferentes empresas.

3. **Branding en Sidebar y Header**:
   - Iniciar sesión como `admin` (Credental) y verificar que el sidebar muestra "Credental" con el color de acento verde azulado.
   - Cerrar sesión e iniciar como `recepcion` (OnDental Clínica Central) y verificar que el sidebar cambia a mostrar "OnDental Clínica Central" con acento azul.
   - Verificar que el nombre del usuario, rol y avatar aparecen correctamente en el header.

4. **Seguridad de Acceso**:
   - Intentar entrar directamente a `dashboard.html`, `agenda.html` o `odontograma.html` sin haber iniciado sesión. Debe ocurrir una redirección automática e inmediata a `index.html`.

5. **Buscadores Autocompletables en Agenda**:
   - Abrir el formulario de nueva cita en `agenda.html`.
   - En el campo de paciente, escribir las primeras 3 letras de un nombre y verificar que aparece un menú desplegable con resultados filtrados.
   - Verificar que se puede navegar con flechas (↑ ↓) y seleccionar con Enter.
   - Verificar que al presionar Escape se cierra el menú de resultados.
   - Escribir un RUT parcial y verificar que filtra correctamente.
   - Verificar que el botón de limpiar (×) resetea la selección.
   - Repetir las mismas pruebas con el campo de profesional/dentista.
   - Buscar por especialidad (ej: "ortodon") y verificar que aparece el profesional correspondiente.

6. **Duraciones de Cita Extendidas**:
   - Abrir el formulario de nueva cita y verificar que el selector de duración incluye todas las opciones desde 15 minutos hasta 6 horas.
   - Crear una cita con duración de 3 horas y verificar que se guarda y muestra correctamente en el calendario.
   - Crear una cita con duración de 6 horas y verificar que el bloque de tiempo se renderiza proporcionalmente en la vista de calendario.

7. **Flujo de Cita Completo**:
   - Agendar una nueva cita en `agenda.html` usando los buscadores autocompletables para seleccionar paciente y dentista, con una duración de 2 horas.
   - Comprobar que aparece en el calendario con la duración correcta.
   - Ir al `dashboard.html` y comprobar que la cita se refleja en la lista de citas del día y en las estadísticas.

8. **Flujo Clínica - Paciente - Odontograma**:
   - Registrar un paciente nuevo en `pacientes.html`.
   - Entrar a su ficha, abrir su **Odontograma**.
   - Pintar un diente con caries (rojo) y otro con corona (dorado). Guardar cambios.
   - Salir del odontograma, volver a entrar o refrescar, y comprobar que las marcas clínicas persisten exactamente en los dientes correctos.

9. **Presupuestos**:
   - Crear un presupuesto para el nuevo paciente, aplicar un 10% de descuento y guardarlo.
   - Verificar la vista de impresión en formato carta profesional.

### Manual Verification
- Pruebas en navegadores Chrome y Firefox en sistemas Linux para asegurar que el renderizado de los SVG del odontograma y los efectos de desenfoque de fondo (backdrop-filter) operen a 60 FPS estables.
- Redimensionamiento del navegador a formato móvil para garantizar la total adaptabilidad de los paneles de control.
- Verificar que el componente de autocomplete funciona correctamente en dispositivos táctiles (tap para seleccionar, cierre al tocar fuera).
- Verificar que el branding de empresa se actualiza instantáneamente sin parpadeos al cargar cada página.
- Probar el flujo completo de login → dashboard → agenda con al menos un usuario de cada empresa para asegurar consistencia visual.
