# ONDIGITAL

**Todo lo Vital es Digital.**

Repositorio principal de ONDIGITAL: contiene la pagina web principal, los productos
internos y los prototipos de la linea **Micro-Empresa** para digitalizar operaciones
de pequenas empresas en Honduras.

ONDIGITAL disena y desarrolla plataformas web, apps, automatizaciones, sistemas a
medida, bases de datos, dashboards e inteligencia artificial aplicada para empresas
que necesitan operar mejor, vender mas y escalar con tecnologia confiable.

## Micro-Empresa

**Micro-Empresa** es la linea de productos de ONDIGITAL para negocios pequenos que
necesitan herramientas claras, locales y operativas sin complejidad empresarial
innecesaria.

El objetivo es convertir flujos reales de trabajo en sistemas utilizables:
clientes, ventas, inventario, cobros, reportes, usuarios, documentos,
automatizaciones y seguimiento por WhatsApp.

## Proyectos

- **Pagina Web Principal** (`Pagina_Web_Original/`): sitio institucional de
  ONDIGITAL con servicios, proceso, tecnologia, equipo y contacto.
- **Credental** (`credental/`): sistema de gestion clinica dental para Honduras,
  con agenda, pacientes, odontograma, periodontograma, presupuestos, cobranzas,
  caja, facturacion, inventario clinico, laboratorios, comunicaciones y reportes.
- **OnStock** (`onstock/`): mini-ERP local para tiendas y microempresas, con POS,
  productos, inventario, compras, proveedores, gastos, reportes, exportaciones y
  base de datos SQLite.
- **Design System** (`design-system/`): tokens y componentes visuales de apoyo.
- **Skills ONDIGITAL** (`skills/`): guias internas para construir productos,
  interfaces, seguridad, datos y automatizacion.
- **Docs** (`docs/`): documentacion funcional y tecnica de los productos activos.

## Equipo

La pagina principal presenta a ONDIGITAL como un equipo joven con mentalidad de
producto, enfocado en arquitectura, desarrollo web, apps inteligentes, experiencia,
backend, datos e infraestructura.

- **Mario Cueva**: fundador.
- **Joshua Isaula**: desarrollador principal.
- **Danniel Escoto**: desarrollador secundario.
- **Victor Mendez**: desarrollador secundario.
- **Jorge Portillo**: desarrollador secundario.

## Capacidades

- Webs y plataformas: landing pages, portales, e-commerce y productos SaaS.
- Apps moviles: experiencias iOS, Android y Flutter.
- Automatizacion: APIs, webhooks, reportes, bots internos y facturacion.
- Bases de datos: modelado, migracion, dashboards y sistemas de consulta.
- IA aplicada: chatbots, asistentes internos y clasificacion de informacion.
- Tecnologia a medida: sistemas internos, integraciones y paneles operativos.

## Proceso

1. Descubrimiento: objetivos, usuarios, operacion actual y restricciones.
2. Diseno y prototipo: flujos, pantallas y criterios de aceptacion.
3. Desarrollo agil: modulos, integraciones y entregas verificables.
4. Lanzamiento y soporte: publicacion, monitoreo, documentacion y evolucion.

## Ejecucion Rapida

### Credental

Abrir `credental/index.html` en el navegador, idealmente desde un servidor
estatico local.

### OnStock

```bash
cd onstock
make dev
```

La app corre en `http://localhost:8080`.

## Estado

Este repositorio mezcla sitio principal, prototipos y productos internos en
evolucion. Antes de usar datos reales en produccion, cada producto debe cerrar su
modelo definitivo de autenticacion, persistencia, permisos, respaldos y seguridad.
