# ONDIGITAL

**Todo lo Vital es Digital.**

No vendemos páginas web. No vendemos bases de datos. No vendemos sistemas genéricos.

Nos convertimos en el **departamento tecnológico** de cada cliente: construimos plataformas
empresariales hechas completamente a la medida, que evolucionan junto con el negocio y
centralizan toda su operación en un único ecosistema digital.

ONDIGITAL es una **micro-empresa hondureña** formada por un equipo de estudiantes con
mentalidad de producto, nacida como proyecto de graduación y construida como una empresa real.

> Modelo de negocio completo en [`docs/modelo-negocio.md`](docs/modelo-negocio.md) ·
> Auditoría y plan de implementación en [`docs/auditoria-estatica-ondigital.md`](docs/auditoria-estatica-ondigital.md)
> y [`docs/plan-implementacion-super-v2.md`](docs/plan-implementacion-super-v2.md).

## Qué hacemos

Cada proyecto se diseña alrededor de los procesos reales del cliente. **No usamos plantillas
fijas:** analizamos cómo opera el negocio y construimos la solución para esa operación —
clientes, ventas, inventario, agenda, facturación, caja, reportes, dashboards,
automatizaciones y módulos completamente personalizados.

**La paradoja que lo hace posible:** cada sistema es único por fuera, pero por dentro todos
comparten una arquitectura modular y una biblioteca de módulos reutilizables. No empezamos de
cero en cada proyecto: ensamblamos y adaptamos. Eso es lo que permite ofrecer software
verdaderamente a la medida bajo un modelo de suscripción.

## Vito — el asistente empresarial

**Vito** es la pieza de inteligencia de ONDIGITAL. No es un chatbot: vive **sobre los datos
reales del negocio** y los entiende. Consulta (*"¿qué clientes deben?"*), resume
(*indicadores, tendencias, alertas*) y, donde el producto se lo permite, prepara una acción
—nunca la ejecuta sola: la deja lista y pide confirmación.

Esa frontera es deliberada. Hoy Vito es de **solo lectura** salvo excepciones contadas y
siempre confirmadas por una persona: en **OnStock** puede dejar en borrador una orden de
reposición; en **Credental** solo consulta y nunca modifica el expediente.

El cliente nunca ve el proveedor detrás —pregunta a Vito y Vito responde—, y el motor puede
correr en la nube o **localmente en el servidor del cliente**. Las variables que configura el
cliente tampoco lo nombran: el motor se describe por dónde corre, no por su marca. El mismo
Vito se adapta a cada negocio: en **OnStock** responde sobre stock y ventas; en **Credental**
sobre agenda y pacientes; en **OnRoute** explica cómo cerró el día de ruta.

## Acompañamiento

El desarrollo no termina al entregar el sistema; la relación con el cliente es continua. Tres
niveles de acompañamiento tecnológico:

- **Starter** — desarrollo del sistema a la medida, soporte, mantenimiento y mejoras; el
  cliente administra su propia infraestructura.
- **Business** — todo lo de Starter + infraestructura administrada (hosting, backups,
  monitoreo, SSL, alta disponibilidad) y acceso a la biblioteca de módulos.
- **Enterprise AI** — todo lo de Business + **Vito** integrado directamente al negocio.

## En este repositorio

- **Página Web Principal** (`Pagina_Web_Original/`): sitio institucional de ONDIGITAL con
  servicios, proceso, tecnología, equipo y contacto.
- **Credental** (`credental/`): la filosofía hecha realidad — sistema de gestión clínica
  dental para Honduras (agenda, pacientes, odontograma, presupuestos, cobranzas, caja,
  facturación, inventario clínico, laboratorios, reportes). Referencia viva de "un sistema
  construido alrededor de los procesos de una industria".
- **OnStock** (`onstock/`): mini-ERP local para tiendas y microempresas (POS, productos,
  inventario, compras, proveedores, gastos, reportes, exportaciones, SQLite). Fuente de
  módulos reutilizables de inventario y ventas.
- **OnRoute** (`onroute/`): app de autoventa (*van sales*) para vendedores de ruta, con
  marca propia. Un solo código para el teléfono del vendedor, la tablet del camión y la
  computadora de la oficina: torre de control de la flota, carga de bodega, cobro en la
  parada, cuadre de liquidación y Vito explicando el día. Hecha en Flutter.
- **Design System** (`design-system/`): tokens y componentes visuales de apoyo.
- **Graphify ONDIGITAL** (`design-system/graphify/` y `graphify-out/`): mapa visual del repo,
  reporte y grafo navegable para orientar implementaciones grandes.
- **Skills ONDIGITAL** (`skills/`): guías internas para construir productos, interfaces,
  seguridad, datos y automatización.
- **Docs** (`docs/`): documentación funcional y técnica, modelo de negocio y plan maestro.

## Equipo

Equipo joven con mentalidad de producto, enfocado en arquitectura, desarrollo web, apps
inteligentes, experiencia, backend, datos e infraestructura.

- **Mario Cueva**: fundador.
- **Joshua Isaula**: desarrollador principal.
- **Danniel Escoto**: desarrollador secundario.
- **Victor Mendez**: desarrollador secundario.
- **Jorge Portillo**: desarrollador secundario.

## Capacidades

- Webs y plataformas: landing pages, portales, e-commerce y productos SaaS.
- Apps móviles: experiencias iOS, Android y Flutter.
- Automatización: APIs, webhooks, reportes, bots internos y facturación.
- Bases de datos: modelado, migración, dashboards y sistemas de consulta.
- IA aplicada: Vito, asistentes internos y clasificación de información.
- Tecnología a medida: sistemas internos, integraciones y paneles operativos.

## Proceso

1. Descubrimiento: objetivos, usuarios, operación actual y restricciones.
2. Diseño y prototipo: flujos, pantallas y criterios de aceptación.
3. Desarrollo ágil: módulos, integraciones y entregas verificables.
4. Lanzamiento y soporte: publicación, monitoreo, documentación y evolución.

## Ejecución Rápida

### Credental

Servir `credental/` con un servidor estático y abrir `/index.html`. Para la demostración:

```text
Usuario: testing
Contraseña: 1234
```

La semilla clínica se carga automáticamente en la sesión del navegador.

### OnStock

```bash
cd onstock
make dev
```

La app corre en `http://localhost:8080`.

### OnRoute

```bash
cd onroute
flutter pub get
flutter run
```

Arranca con el día de demostración ya cargado; no necesita configuración.

## Trabajo Con Agentes AI


Este repo incluye `AGENTS.md` como guía compartida para Codex y `CLAUDE.md` como puente para
Claude Code. Para instalar el plugin oficial que permite usar Codex dentro de Claude Code y
trabajar con el flujo Claude implementa -> Codex revisa -> Claude corrige, ver
[`docs/ai-collaboration.md`](docs/ai-collaboration.md).

## Estado

Este repositorio mezcla sitio principal, prototipos y productos en evolución. Antes de usar
datos reales en producción, cada producto debe cerrar su modelo definitivo de autenticación,
persistencia, permisos, respaldos y seguridad.
