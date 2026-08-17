# Graph Report - ONDIGITAL  (2026-08-14)

## Corpus Check
- 190 files · ~209,988 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1901 nodes · 3535 edges · 154 communities (142 shown, 12 thin omitted)
- Extraction: 90% EXTRACTED · 10% INFERRED · 0% AMBIGUOUS · INFERRED: 366 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d7d0b4b3`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- esc
- Store
- writeErr
- onserve/web/js/ui.js
- round2
- writeErr
- .exportIncomeStatement
- ONDIGITAL — Skill Maestro de Generación Web
- New
- Store
- Plan
- orders_test.go
- Catalog
- allow
- 🧩 Componentes de Software
- onstock/internal/store/models.go
- Order
- Service
- New
- ONDIGITAL — Generación de Plataformas SaaS Premium
- NewRegistry
- graphify-map.js
- ONDIGITAL — Especificación del Sistema de Diseño Premium
- Internationalizing Flutter Applications
- ONDIGITAL — Generación de Landing Pages Premium de Alta Conversión
- ONDIGITAL — Modelo de Negocio
- Store
- NewServiceFromEnv
- onserve/internal/store/models.go
- Implementing Routing and Deep Linking
- brief.md
- module.js
- round2
- ONDIGITAL — Sistemas de Bases de Datos Locales y en la Nube
- pacientes.js
- .Ask
- opencode_provider.go
- 3. Hallazgos principales del repositorio
- ONDIGITAL — Plan Maestro
- Registry
- RegisterOnStockTools
- ONDIGITAL
- Architecting Flutter Applications
- js/caja.js
- db.js
- plan-implementacion-super-v2.md
- ONDIGITAL — Plan de Implementación Controlado v2
- Contrato de montaje (host app)
- Implementing Flutter Integration Tests
- Previewing Flutter Widgets
- ONDIGITAL — Caja de Herramientas y Utilidades Premium
- facturacion.js
- FASE 5 — Credental persistente y seguro
- Implementing Adaptive Layouts
- agenda.js
- Graphify
- Provisión de cliente nuevo (Fase 4.2)
- Bootstrap
- .CreateExpense
- Backend API Production
- Writing Flutter Widget Tests
- Resolving Flutter Layout Errors
- Serializing JSON Manually in Flutter
- Sales POS Inventory
- js/inventario.js
- Arquitectura técnica (estado actual)
- Checklist — Con y sin Vito (Fase 2.4)
- Demo Fase 1 — Vito + OnStock
- FASE 1 — Decisiones de arquitectura, datos y producto
- FASE 2 — Fundaciones compartidas
- FASE 3 — OnStock candidato a producción
- TestTools_CreateRestockPO_PendingThenConfirm
- OnStock
- Coding Quality
- Implementing Flutter Networking
- QA Automation
- laboratorios.js
- js/reportes.js
- Auditoría estática del plan y repositorio ONDIGITAL
- Biblioteca de módulos ONDIGITAL (Fase 2.5)
- Contrato de módulo de negocio (Fase 2.1)
- FASE 4 — OnServe candidato a producción
- install.sh
- Business Digitalization
- Frontend Quality Review
- Html App Production
- SaaS Product UI
- Skill Registry Audit
- Auth Access Control
- odontograma.js
- Claude Code + Codex Combo
- docs/README.md
- Procedimiento para ensamblar un cliente nuevo
- Facturación de la suscripción (Fase 4.3)
- Funcionalidades por módulo
- 4. Protocolo anti-estancamiento y anti-progreso-falso
- FASE 0 — Contención y baseline reproducible
- FASE 6 — Vito, módulos y enforcement por plan
- FASE 7 — Infraestructura, Firebase, CI y observabilidad
- Store
- Store
- Store
- Frontend Review Checklist
- HTML App Patterns
- Flutter App Production
- ONDIGITAL Open Source Skill Map
- OWASP-Oriented Release Checklist
- Skill Supply Chain Audit
- Web Security Hardening
- AGENTS.md
- cobranzas.js
- Catalog
- presupuestos.js
- ANEXO B — Pruebas mínimas por dominio
- FASE 8 — Provisión, billing y operación ONDIGITAL
- newTestRouter
- main
- Visual Quality Reference
- Referencias de Plataformas Dentales: Dentalink y Doctocliq
- Flutter Workflow Reference
- SaaS Patterns Reference
- App Security Review
- Auth And Access Control Patterns
- Skill Risk Patterns
- Browser Hardening Checklist
- periodontograma.js
- .Router
- OnServe
- quality-check.mjs
- onstock
- Seguridad: demo → producción (Fase 4.1)
- vito.go
- renderReceipt
- Claude Code
- connection.js
- TestRegistry_RegisterAndList
- Landing ONDIGITAL
- graphify/README.md
- putTenantBody
- onserve

## God Nodes (most connected - your core abstractions)
1. `esc()` - 52 edges
2. `writeErr()` - 49 edges
3. `writeJSON()` - 48 edges
4. `writeErr()` - 45 edges
5. `writeJSON()` - 43 edges
6. `API` - 42 edges
7. `API` - 37 edges
8. `toastErr()` - 33 edges
9. `toast()` - 32 edges
10. `money()` - 30 edges

## Surprising Connections (you probably didn't know these)
- `vitoAskBody` --references--> `Message`  [EXTRACTED]
  onstock/internal/httpapi/vito.go → modules/vito/types.go
- `Bootstrap()` --calls--> `NewCatalog()`  [INFERRED]
  onstock/internal/vitohost/host.go → modules/modkit/module.go
- `Bootstrap()` --calls--> `NewServiceFromEnv()`  [INFERRED]
  onstock/internal/vitohost/host.go → modules/vito/config.go
- `Bootstrap()` --calls--> `NewRegistry()`  [INFERRED]
  onstock/internal/vitohost/host.go → modules/vito/tools.go
- `TestTools_ListLowStockAndAsk()` --calls--> `NewRegistry()`  [INFERRED]
  onstock/internal/vitohost/tools_test.go → modules/vito/tools.go

## Import Cycles
- 2-file cycle: `onstock/web/js/app.js -> onstock/web/js/pages/configuracion.js -> onstock/web/js/app.js`
- 2-file cycle: `onserve/web/js/app.js -> onserve/web/js/pages/configuracion.js -> onserve/web/js/app.js`

## Communities (154 total, 12 thin omitted)

### Community 0 - "esc"
Cohesion: 0.07
Nodes (106): applyShellMode(), cajeroAllowed(), checkExitPin(), enterCajeroMode(), exitCajeroMode(), getMode(), isCajero(), setMode() (+98 more)

### Community 1 - "Store"
Cohesion: 0.19
Nodes (7): boolToInt(), firstN(), Store, scanProduct(), Category, Product, ProductFilter

### Community 2 - "writeErr"
Cohesion: 0.08
Nodes (34): Barcode, RouterOpts, cajaStaticHandler(), decode(), FS, Handler, API, Request (+26 more)

### Community 3 - "onserve/web/js/ui.js"
Cohesion: 0.12
Nodes (48): api, navigate(), refreshSettings(), routes, setMobileNav(), setupMobileNav(), closeModal(), kpi() (+40 more)

### Community 4 - "round2"
Cohesion: 0.36
Nodes (7): Dashboard, Store, round2(), IncomeStatement, MonthlySummary, MonthPoint, TopProduct

### Community 5 - "writeErr"
Cohesion: 0.17
Nodes (12): decode(), Request, ResponseWriter, T, pathID(), pathInt(), qInt(), writeErr() (+4 more)

### Community 6 - ".exportIncomeStatement"
Cohesion: 0.34
Nodes (11): File, Fpdf, isRow, fmtNum(), API, Request, ResponseWriter, incomeStatementRows() (+3 more)

### Community 7 - "ONDIGITAL — Skill Maestro de Generación Web"
Cohesion: 0.04
Nodes (46): 1. 🧠 Filosofía (Propósito), 2. 📐 Jerarquía (Estructura), 3. 🔍 Detalle (Calidad), 4. ⚡ Función (Rendimiento), 5. 💡 Innovación (Diferenciación), Accesibilidad (a11y), Anti-Patrones, ❌ Anti-Patrones de Diseño (+38 more)

### Community 8 - "New"
Cohesion: 0.24
Nodes (9): Store, New(), Store, Tx, insertPOItems(), NewPOInput, NewPOItemIn, POFilter (+1 more)

### Community 9 - "Store"
Cohesion: 0.09
Nodes (16): T, TestCajaOnlyBlocksAdminAPI(), copyFile(), Store, T, TestBackup(), T, TestSeedDemo() (+8 more)

### Community 10 - "Plan"
Cohesion: 0.08
Nodes (25): Ledger, Status, Subscription, Time, OpenLedger(), T, TestLedger_CreateList(), DefaultModules() (+17 more)

### Community 11 - "orders_test.go"
Cohesion: 0.16
Nodes (24): approx(), firstTableID(), firstZoneID(), Store, T, itemIDByName(), newTestStore(), openOrderWithBaleadas() (+16 more)

### Community 12 - "Catalog"
Cohesion: 0.09
Nodes (14): Capability, Catalog, Info, Kind, Module, okMod, RWMutex, NewCatalog() (+6 more)

### Community 13 - "allow"
Cohesion: 0.06
Nodes (32): permissions, allow, ask, deny, $schema, Bash(curl http://127.0.0.1:*), Bash(curl http://localhost:*), Bash(git commit:*) (+24 more)

### Community 14 - "🧩 Componentes de Software"
Cohesion: 0.06
Nodes (30): agenda.html, Autenticación Multi-Usuario y Multi-Empresa, auth.js, Catálogo de Procedimientos (Items), cobranzas.html, 🧩 Componentes de Software, configuracion.html, Configuración de la Clínica (Branding del Presupuesto) (+22 more)

### Community 15 - "onstock/internal/store/models.go"
Cohesion: 0.24
Nodes (8): Store, scanSale(), NewSaleInput, NewSaleItemInput, PurchaseOrderItem, Sale, SaleFilter, SaleItem

### Community 16 - "Order"
Cohesion: 0.20
Nodes (14): createInvoiceTx(), editableStatus(), Store, Tx, normalizePaymentMethod(), orderStatus(), recompute(), recomputeWithDiscount() (+6 more)

### Community 17 - "Service"
Cohesion: 0.15
Nodes (17): dedupeCitations(), Context, preferSummary(), synthesizeFromTools(), systemPrompt(), Context, Time, AskRequest (+9 more)

### Community 18 - "New"
Cohesion: 0.19
Nodes (9): API, Store, New(), Store, nonNilTables(), scanTable(), FloorView, Table (+1 more)

### Community 19 - "ONDIGITAL — Generación de Plataformas SaaS Premium"
Cohesion: 0.09
Nodes (21): Arquitectura Multi-Tenant (Aislamiento de Datos), Checklist de Validación SaaS, Estilos CSS Core (`dashboard.css`), Estructura HTML Base (`dashboard.html`), Facturación, Planes y Suscripciones, Gestión de Usuarios, Roles y Permisos, Grid de KPI Moderno, Integración con APIs (Fetch, Loading y Errores) (+13 more)

### Community 20 - "NewRegistry"
Cohesion: 0.31
Nodes (18): New(), assertNoVendorLeak(), Context, T, mustService(), TestAsk_Disabled(), TestAsk_EmptyMessage(), TestAsk_LowStockWithoutTool() (+10 more)

### Community 21 - "graphify-map.js"
Cohesion: 0.16
Nodes (19): colorFor(), connectedToSelected(), edgeLayer, filterList, graphData, inspector, nodeById, nodeLayer (+11 more)

### Community 22 - "ONDIGITAL — Especificación del Sistema de Diseño Premium"
Cohesion: 0.10
Nodes (19): 1. Botones Premium, 1. Paleta Dark Premium (SaaS, Tecnología, Lujo), 2. Entradas de Texto (Inputs Glass), 2. Paleta Salud e Higiene (Clínicas, Consultorios, Farmacias), 3. Componente de Búsqueda Autocompletable, 3. Paleta Comercial (Tiendas, E-commerce, Cafés), 4. Tabla de Datos Premium (Data Table), Animaciones y Tokens de Movimiento (CSS Transitions) (+11 more)

### Community 23 - "Internationalizing Flutter Applications"
Cohesion: 0.10
Nodes (19): 1. Add Dependencies, 1. Define ARB Files, 2. Enable Code Generation, 2. Generate Localization Classes, 3. Consume Localized Strings, 3. Create Configuration File, 4. Configure the App Entry Point, Advanced Formatting (+11 more)

### Community 24 - "ONDIGITAL — Generación de Landing Pages Premium de Alta Conversión"
Cohesion: 0.10
Nodes (19): 🏥 Clínica Médica/Dental, Código HTML Hero, Estilos CSS Hero, Estilos CSS WhatsApp, Estructura de Conversión (AIDA), Estructura HTML y JS WhatsApp, 💊 Farmacia de Contacto Directo, Formulario de Contacto y Captura con Validación (+11 more)

### Community 25 - "ONDIGITAL — Modelo de Negocio"
Cohesion: 0.11
Nodes (19): 1. Consultas inteligentes, 2. Automatización inteligente, 3. Inteligencia de negocio, Filosofía de desarrollo, La paradoja: a la medida, pero modular, La referencia: Credental, Modelo comercial — planes de acompañamiento, ONDIGITAL — Modelo de Negocio (+11 more)

### Community 26 - "Store"
Cohesion: 0.22
Nodes (6): Store, scanMenuItem(), MenuCategory, MenuItem, MenuItemFilter, MenuView

### Community 27 - "NewServiceFromEnv"
Cohesion: 0.25
Nodes (16): envBool(), firstNonEmpty(), isPlaceholderKey(), LoadEnvConfig(), NewProvider(), NewServiceFromEnv(), NewOpenCodeProvider(), T (+8 more)

### Community 28 - "onserve/internal/store/models.go"
Cohesion: 0.14
Nodes (13): Store, Dashboard, AddItemInput, CloseSessionInput, Invoice, KitchenTicket, NewOrderInput, OpenSessionInput (+5 more)

### Community 29 - "Implementing Routing and Deep Linking"
Cohesion: 0.11
Nodes (17): 1. Scaffold the Application, 2. Configure the Router, Contents, Core Concepts, Examples, High-Fidelity Shell Widget Implementation, If configuring for Android:, If configuring for iOS: (+9 more)

### Community 30 - "brief.md"
Cohesion: 0.12
Nodes (16): Automatización Inteligente, Biblioteca de Módulos, Consultas inteligentes, Ejemplo, Filosofía de Desarrollo, Infraestructura Administrada, Inteligencia de Negocio, Modelo Comercial (+8 more)

### Community 31 - "module.js"
Cohesion: 0.17
Nodes (6): addDaysISO(), ask(), preferSummary(), runTool(), sanitize(), todayISO()

### Community 32 - "round2"
Cohesion: 0.28
Nodes (6): Dashboard, Store, Store, scanSession(), round2(), Session

### Community 33 - "ONDIGITAL — Sistemas de Bases de Datos Locales y en la Nube"
Cohesion: 0.12
Nodes (15): Actualizaciones y Suscripciones en Tiempo Real, Búsqueda Autocompletable, Filtros y Paginación, Conexión y Sincronización con Firebase Firestore, Copias de Seguridad (Backup) y Restauración, Diagrama de Relaciones Conceptual, Diseño Relacional Simulado en LocalStorage, Exportación a CSV Limpio, Exportación de Datos (CSV e Impresión PDF) (+7 more)

### Community 34 - "pacientes.js"
Cohesion: 0.21
Nodes (6): budgetPaid(), budgetTotal(), fmtDate(), renderEvoluciones(), renderFinanzas(), renderResumen()

### Community 35 - ".Ask"
Cohesion: 0.24
Nodes (11): Context, hasTool(), lastToolContent(), lastUserText(), looksLikeLossOrAdvice(), looksLikeLowStock(), looksLikeRestockPO(), looksLikeSales() (+3 more)

### Community 36 - "opencode_provider.go"
Cohesion: 0.24
Nodes (11): Client, toOCMessage(), ocChatRequest, ocChatResponse, ocFunctionCallOut, ocFunctionDef, ocMessage, ocTool (+3 more)

### Community 37 - "3. Hallazgos principales del repositorio"
Cohesion: 0.15
Nodes (13): 3.10 Numeraciones concurrentes, 3.11 Billing no cubre todavía su propio runbook, 3.12 “Fallback local” no está demostrado, 3.1 OnServe está fuera del mapa, 3.2 Se compartió una credencial en un archivo ignorado, 3.3 El baseline Git no está limpio, 3.4 OnStock y OnServe no son solamente “localhost”, 3.5 La restricción de caja de OnStock no es auth (+5 more)

### Community 38 - "ONDIGITAL — Plan Maestro"
Cohesion: 0.15
Nodes (13): Cómo ejecutamos (disciplina de trabajo), Cómo leer este plan, Decisiones cerradas (Fase 1), Entregables (cerrados), Entregables (cerrados), Fase 1 — Vito, el asistente ✅ CERRADA (2026-07), Fase 2 — Modularización y alimentar a Vito ✅ CERRADA (2026-07), Fase 3 — Sitio, hosting y presentación ⏸ APLAZADA (+5 more)

### Community 39 - "Registry"
Cohesion: 0.21
Nodes (7): Context, RWMutex, Provider, ProviderRequest, ProviderResult, Registry, Tool

### Community 40 - "RegisterOnStockTools"
Cohesion: 0.54
Nodes (12): argInt(), argString(), failTool(), Store, periodRange(), RegisterOnStockTools(), toolCreateRestockPO(), toolListLowStock() (+4 more)

### Community 41 - "ONDIGITAL"
Cohesion: 0.15
Nodes (13): Acompañamiento, Capacidades, Credental, Ejecución Rápida, En este repositorio, Equipo, Estado, ONDIGITAL (+5 more)

### Community 42 - "Architecting Flutter Applications"
Cohesion: 0.15
Nodes (12): Architecting Flutter Applications, Architectural Layers, Contents, Data Layer, Data Layer: Service and Repository, Examples, Logic Layer (Domain - Optional), Project Structure (+4 more)

### Community 43 - "js/caja.js"
Cohesion: 0.27
Nodes (8): gatherMovements(), horaFromId(), normMetodo(), readMovs(), renderAll(), renderEstado(), renderMovimientos(), renderSummary()

### Community 44 - "db.js"
Cohesion: 0.27
Nodes (6): ensureDefaultAdmin(), get(), initDB(), syncAllFromFirebase(), syncCollection(), syncObjectCollection()

### Community 45 - "plan-implementacion-super-v2.md"
Cohesion: 0.17
Nodes (11): Aceptación de piloto, ANEXO A — Matriz inicial de riesgos y fase propietaria, ANEXO C — Revisión independiente, ANEXO D — Primeras aprobaciones recomendadas, ANEXO E — Plantilla de estado del plan, ANEXO F — Definición de “hecho” del programa, Criterio final, FASE 10 — Lanzamiento productivo por producto (+3 more)

### Community 46 - "ONDIGITAL — Plan de Implementación Controlado v2"
Cohesion: 0.17
Nodes (12): 1. Propósito, 2. Jerarquía de fuentes de verdad, 3. Hallazgos de baseline que el plan debe resolver, 5.1 Propuesta obligatoria antes de editar, 5.2 Informe de cierre obligatorio, 5.3 Evidencia durable, 5. Contrato de aprobación de una microfase, 6. Mapa de fases y dependencias (+4 more)

### Community 47 - "Contrato de montaje (host app)"
Cohesion: 0.17
Nodes (11): 1. Dependencia, 2. Configuración (server-side), 3. Ciclo de vida en el host, 4. Tools (lo que separa a Vito de un chatbot), 5. API de tipos (Go), 6. White-label (no negociable), 7. Referencia de implementación, 8. Verificación (+3 more)

### Community 48 - "Implementing Flutter Integration Tests"
Cohesion: 0.17
Nodes (11): Contents, Examples, Execution and Profiling, Host Driver Script (`test_driver/integration_test.dart`), Implementing Flutter Integration Tests, Interactive Exploration via MCP, Performance Profiling Driver Script (`test_driver/perf_driver.dart`), Project Setup and Dependencies (+3 more)

### Community 49 - "Previewing Flutter Widgets"
Cohesion: 0.17
Nodes (11): Basic Preview, Contents, Creating a Widget Preview, Custom Preview with Runtime Transformation, Examples, Handling Limitations, Interacting with Previews, MultiPreview Implementation (+3 more)

### Community 50 - "ONDIGITAL — Caja de Herramientas y Utilidades Premium"
Cohesion: 0.17
Nodes (11): Administrador de Menú Lateral (Sidebar Manager), Componente Autocomplete Inteligente (Buscador), Controlador de Ventanas Modales Adaptativas, Estilos CSS de Impresión (`print.css`), Generador de Reportes PDF Profesionales (`window.print`), Motor de Ordenamiento y Filtrado de Tablas de Datos, ONDIGITAL — Caja de Herramientas y Utilidades Premium, Reglas De Seguridad Para Utilidades (+3 more)

### Community 51 - "facturacion.js"
Cohesion: 0.33
Nodes (7): correlativoNum(), fmtDate(), rangeInfo(), renderAlerts(), renderAll(), renderDocs(), renderStatusCards()

### Community 52 - "FASE 5 — Credental persistente y seguro"
Cohesion: 0.18
Nodes (11): FASE 5 — Credental persistente y seguro, Microfase 5.1 — Modelo clínico y migración, Microfase 5.2 — Backend mínimo vertical, Microfase 5.3 — Auth y autorización clínica, Microfase 5.4 — Sustituir `db.js` por adaptador de API, Microfase 5.5 — Migración módulo por módulo, Microfase 5.6 — Seguridad de frontend, Microfase 5.7 — PII, retención y derechos operativos (+3 more)

### Community 53 - "Implementing Adaptive Layouts"
Cohesion: 0.18
Nodes (10): Adaptive Layout using LayoutBuilder, Constraining Width on Large Screens, Contents, Device and Orientation Behaviors, Examples, Implementing Adaptive Layouts, Space Measurement Guidelines, Widget Sizing and Constraints (+2 more)

### Community 54 - "agenda.js"
Cohesion: 0.33
Nodes (8): clearDentistAutocomplete(), clearPatientAutocomplete(), createCell(), deleteAppt(), initAllAutocompletes(), renderCalendar(), setupSearchAutocomplete(), updateApptStatus()

### Community 55 - "Graphify"
Cohesion: 0.20
Nodes (9): Comandos De Ejecución, Cuándo Usarlo, Grafo Actual Del Repo, Graphify, Implementación Visual En Este Repo, Limitaciones Actuales, Riesgos Prioritarios, Rutina Graphify (+1 more)

### Community 56 - "Provisión de cliente nuevo (Fase 4.2)"
Cohesion: 0.20
Nodes (10): 1. Ficha del cliente, 2. Elegir plan → qué se entrega, 3. Checklist de entrega, 4. Script de ficha (generar JSON de tenant), 5. Handoff al cliente, 6. Upgrade de plan, Credental (clínica), Ledger ONDIGITAL (interno) (+2 more)

### Community 57 - "Bootstrap"
Cohesion: 0.24
Nodes (7): LoadDotEnv(), LoadDotEnvFiles(), T, TestLoadDotEnv(), Bootstrap(), Store, Host

### Community 58 - ".CreateExpense"
Cohesion: 0.36
Nodes (4): Store, validExpenseCategory(), Expense, ExpenseFilter

### Community 59 - "Backend API Production"
Cohesion: 0.20
Nodes (9): API Rules, Backend API Production, Backend Choice, External Source Notes, Firestore Specifics, Honduras Fiscal Billing Backend, ONDIGITAL Minimum Backend Contract, Overview (+1 more)

### Community 60 - "Writing Flutter Widget Tests"
Cohesion: 0.20
Nodes (9): Contents, Core Components, Examples, High-Fidelity Widget Test Implementation, Interaction & State Management, Setup & Configuration, Task Progress, Workflow: Implementing a Widget Test (+1 more)

### Community 61 - "Resolving Flutter Layout Errors"
Cohesion: 0.20
Nodes (9): Constraint Violation Diagnostics, Contents, Examples, Fixing RenderFlex Overflow, Fixing Unbounded Height (ListView in Column), Fixing Unbounded Width (TextField in Row), Layout Error Resolution Workflow, Resolving Flutter Layout Errors (+1 more)

### Community 62 - "Serializing JSON Manually in Flutter"
Cohesion: 0.20
Nodes (9): Background Parsing (Large Payload), Contents, Core Guidelines, Examples, High-Fidelity Model Implementation, Serializing JSON Manually in Flutter, Synchronous Parsing (Small Payload), Workflow: Fetching and Parsing JSON (+1 more)

### Community 63 - "Sales POS Inventory"
Cohesion: 0.20
Nodes (9): Data Invariants, Honduras Electronic Billing Needs, Inventory Workflow, Module Map, Overview, POS Workflow, Production Gates, Sales POS Inventory (+1 more)

### Community 64 - "js/inventario.js"
Cohesion: 0.39
Nodes (6): diasParaVencer(), estadoInsumo(), fmtVence(), renderAlerts(), renderAll(), renderTable()

### Community 65 - "Arquitectura técnica (estado actual)"
Cohesion: 0.22
Nodes (9): Arquitectura técnica (estado actual), Capa de datos — IMPORTANTE para el equipo, Dónde tocar para la base de datos definitiva, Dónde tocar para la seguridad, Estructura, Moneda y localización, Multi‑empresa (tenant), Sistema de diseño (CSS) (+1 more)

### Community 66 - "Checklist — Con y sin Vito (Fase 2.4)"
Cohesion: 0.22
Nodes (8): Checklist — Con y sin Vito (Fase 2.4), Con Vito (Enterprise AI en la clínica), Con Vito (`VITO_ENABLED=true`, provider mock o API), Credental, OnStock, Principio, Sin abrir Vito (plan Starter/Business), Sin Vito (`VITO_ENABLED=0`)

### Community 67 - "Demo Fase 1 — Vito + OnStock"
Cohesion: 0.22
Nodes (8): Abrir, Comandos de verificación, Credental (Fase 2.3), Criterio de hecho (Fase 1), Datos del seed (resumen), Demo Fase 1 — Vito + OnStock, Guion de preguntas (canónicas), Preparar datos

### Community 68 - "FASE 1 — Decisiones de arquitectura, datos y producto"
Cohesion: 0.22
Nodes (9): FASE 1 — Decisiones de arquitectura, datos y producto, Microfase 1.1 — Alcance del portafolio, Microfase 1.2 — Modelo de despliegue por producto, Microfase 1.3 — Identidad y permisos, Microfase 1.4 — Datos, PII y uso de IA, Microfase 1.5 — Decisión Firebase/Credental, Microfase 1.6 — Matriz comercial y sostenibilidad, Objetivo (+1 more)

### Community 69 - "FASE 2 — Fundaciones compartidas"
Cohesion: 0.22
Nodes (9): FASE 2 — Fundaciones compartidas, Microfase 2.1 — Baseline HTTP seguro para Go, Microfase 2.2 — Sesiones y autenticación, Microfase 2.3 — Autorización y tenant, Microfase 2.4 — Auditoría, Microfase 2.5 — Migraciones y backup/restore, Microfase 2.6 — Configuración y secretos, Objetivo (+1 more)

### Community 70 - "FASE 3 — OnStock candidato a producción"
Cohesion: 0.22
Nodes (9): FASE 3 — OnStock candidato a producción, Microfase 3.1 — Auth, roles y superficies admin/caja, Microfase 3.2 — Tenant y plan, Microfase 3.3 — Confirmación segura de Vito, Microfase 3.4 — Integridad de inventario y numeración, Microfase 3.5 — Pagos, impuestos y reversión, Microfase 3.6 — Backup, restore y operación local, Microfase 3.7 — Cierre OnStock (+1 more)

### Community 71 - "TestTools_CreateRestockPO_PendingThenConfirm"
Cohesion: 0.53
Nodes (8): NewMockProvider(), Store, T, openTestStore(), seedLowStock(), TestTools_CreateRestockPO_PendingThenConfirm(), TestTools_ListLowStockAndAsk(), TestTools_SalesSummary()

### Community 72 - "OnStock"
Cohesion: 0.22
Nodes (8): Acceso desde otras PCs de la tienda, Desarrollo (Linux), Despliegue en la tienda (Windows), Dos PCs en la tienda, Estructura, Funciones, Notas contables (Honduras), OnStock

### Community 73 - "Coding Quality"
Cohesion: 0.22
Nodes (8): Codebase Orientation, Coding Quality, Debugging Discipline, Documentation Standard, Migration Planning, Operating Rules, Overview, Refactoring Rules

### Community 74 - "Implementing Flutter Networking"
Cohesion: 0.22
Nodes (8): Background Parsing, Configuration & Permissions, Contents, Examples, High-Fidelity Implementation: Fetching and Parsing in the Background, Implementing Flutter Networking, Request Execution & Response Handling, Workflow: Executing Network Operations

### Community 75 - "QA Automation"
Cohesion: 0.22
Nodes (8): Accessibility Checks, API And Data Checks, Browser Test Checklist, Delivery Output, Overview, QA Automation, Required QA Workflow, Test Stack Defaults

### Community 76 - "laboratorios.js"
Cohesion: 0.36
Nodes (4): fmtDate(), renderAll(), renderResumen(), renderTable()

### Community 77 - "js/reportes.js"
Cohesion: 0.50
Nodes (7): budgetDate(), budgetPaid(), budgetTotal(), buildReport(), dateInRange(), renderBars(), tsFromId()

### Community 78 - "Auditoría estática del plan y repositorio ONDIGITAL"
Cohesion: 0.25
Nodes (5): 1. Material revisado, 2. Diagnóstico del plan anterior, 4. Cambios de diseño introducidos en el plan v2, 5. Veredicto, Auditoría estática del plan y repositorio ONDIGITAL

### Community 79 - "Biblioteca de módulos ONDIGITAL (Fase 2.5)"
Cohesion: 0.25
Nodes (8): Biblioteca de módulos ONDIGITAL (Fase 2.5), Credental — capacidades, Cómo agregar un módulo nuevo a la biblioteca, Mapa de carpetas, Módulos disponibles hoy, OnStock — capacidades, Plan comercial ↔ módulos, Relación con fases siguientes

### Community 80 - "Contrato de módulo de negocio (Fase 2.1)"
Cohesion: 0.25
Nodes (8): Biblioteca (2.5), Capacidad, Ciclo de vida en un host (suite), Contrato con Vito (recordatorio), Contrato de módulo de negocio (Fase 2.1), Credental (2.3 ✅), OnStock (2.2), Qué es un módulo

### Community 81 - "FASE 4 — OnServe candidato a producción"
Cohesion: 0.25
Nodes (8): FASE 4 — OnServe candidato a producción, Microfase 4.1 — Registro de producto y módulo, Microfase 4.2 — Roles y autorización, Microfase 4.3 — Estados de mesa, orden y cocina, Microfase 4.4 — Caja, pagos y arqueo, Microfase 4.5 — Factura, CAI y numeración, Microfase 4.6 — Backup, restore, hardening y cierre, Objetivo

### Community 82 - "install.sh"
Cohesion: 0.39
Nodes (5): download_file(), download_file_parallel(), is_not_found(), path_has_dir(), install.sh script

### Community 83 - "Business Digitalization"
Cohesion: 0.25
Nodes (7): Business Digitalization, Discovery Workflow, MVP Scope Rules, ONDIGITAL Positioning, Overview, Product Blueprint Output, Software Category Selection

### Community 84 - "Frontend Quality Review"
Cohesion: 0.25
Nodes (7): Checklist, Final Report, Fixing Rules, Frontend Quality Review, Overview, Review Workflow, What To Look For

### Community 85 - "Html App Production"
Cohesion: 0.25
Nodes (7): Common Build Patterns, Html App Production, HTML Standards, Operating Workflow, Overview, Verification, Visual Direction

### Community 86 - "SaaS Product UI"
Cohesion: 0.25
Nodes (7): Copy Rules, Interface Defaults, Overview, Product UI Workflow, SaaS Patterns, SaaS Product UI, Verification

### Community 87 - "Skill Registry Audit"
Cohesion: 0.25
Nodes (7): Acceptance Criteria, Acquisition Modes, Audit Workflow, ONDIGITAL Folder Policy, Overview, Skill Registry Audit, Source Map

### Community 88 - "Auth Access Control"
Cohesion: 0.25
Nodes (7): Admin Loading Pattern, Anti-Patterns, Auth Access Control, Hard Rule, Implementation Workflow, Overview, References

### Community 89 - "odontograma.js"
Cohesion: 0.57
Nodes (5): buildArchTeeth(), handleFaceClick(), handleToothClick(), loadPatientOdontogram(), renderFindingsHistory()

### Community 90 - "Claude Code + Codex Combo"
Cohesion: 0.29
Nodes (7): Claude Code + Codex Combo, Flujo Recomendado, Instalar El Plugin Codex En Claude Code, Instalar O Verificar Herramientas, Regla Para Trabajo Paralelo, Verificaciones Del Proyecto, Verificación De Esta Máquina

### Community 91 - "docs/README.md"
Cohesion: 0.29
Nodes (4): Credental — Documentación, Cómo ejecutarlo, Mapa rápido del código, Índice de documentación

### Community 93 - "Procedimiento para ensamblar un cliente nuevo"
Cohesion: 0.29
Nodes (7): 1. Definir el negocio, 2. Provisionar la suite, 3. Configurar tenant / marca, 4. Enchufar Vito (solo Enterprise AI), 5. Verificación de entrega, 6. Handoff, Procedimiento para ensamblar un cliente nuevo

### Community 94 - "Facturación de la suscripción (Fase 4.3)"
Cohesion: 0.29
Nodes (7): API de código (ops), Ciclo de cobro (manual / semi-manual), Estados de suscripción, Facturación de la suscripción (Fase 4.3), Precios de lista (modelo-negocio), Qué no incluye aún, Seguridad

### Community 95 - "Funcionalidades por módulo"
Cohesion: 0.29
Nodes (7): Acceso, Administración, Base transversal, Finanzas, Funcionalidades por módulo, Operación diaria, Paciente y clínica

### Community 96 - "4. Protocolo anti-estancamiento y anti-progreso-falso"
Cohesion: 0.29
Nodes (7): 4.1 Una microfase por vez, 4.2 Estados permitidos, 4.3 Presupuesto máximo por microfase, 4.4 Prohibiciones de reporte, 4.5 Regla de bloqueo, 4.6 Un solo escritor, 4. Protocolo anti-estancamiento y anti-progreso-falso

### Community 97 - "FASE 0 — Contención y baseline reproducible"
Cohesion: 0.29
Nodes (7): FASE 0 — Contención y baseline reproducible, Microfase 0.1 — Contención de secretos, Microfase 0.2 — Congelar el working tree recibido, Microfase 0.3 — Inventario real del portafolio, Microfase 0.4 — Baseline verificable, Objetivo, Puerta G0

### Community 98 - "FASE 6 — Vito, módulos y enforcement por plan"
Cohesion: 0.29
Nodes (7): FASE 6 — Vito, módulos y enforcement por plan, Microfase 6.1 — Contrato de módulos versionado, Microfase 6.2 — Gobernanza de tools, Microfase 6.3 — Privacidad y egress de IA, Microfase 6.4 — Historia, costo y disponibilidad, Microfase 6.5 — Planes y upgrades, Objetivo

### Community 99 - "FASE 7 — Infraestructura, Firebase, CI y observabilidad"
Cohesion: 0.29
Nodes (7): FASE 7 — Infraestructura, Firebase, CI y observabilidad, Microfase 7.1 — Entornos y artefactos, Microfase 7.2 — CI mínima, Microfase 7.3 — Observabilidad, Microfase 7.4 — HTTPS y acceso remoto, Microfase 7.5 — DR, Objetivo

### Community 100 - "Store"
Cohesion: 0.29
Nodes (3): Store, MovementFilter, StockMovement

### Community 103 - "Frontend Review Checklist"
Cohesion: 0.29
Nodes (6): Accessibility, Frontend Review Checklist, Interaction, Render, Responsive, Visual Quality

### Community 104 - "HTML App Patterns"
Cohesion: 0.29
Nodes (6): Dashboard Pattern, Form Pattern, HTML App Patterns, Interactive Tool Pattern, Standalone File Pattern, Verification Targets

### Community 105 - "Flutter App Production"
Cohesion: 0.29
Nodes (6): Flutter App Production, Operating Workflow, Overview, Production Defaults, UI Quality, Verification

### Community 106 - "ONDIGITAL Open Source Skill Map"
Cohesion: 0.29
Nodes (6): Executive Decision, Install Constraints, ONDIGITAL Open Source Skill Map, Reddit And Forum Signals, Replace Or Improve Map, Sources Reviewed

### Community 107 - "OWASP-Oriented Release Checklist"
Cohesion: 0.29
Nodes (6): Access Control, Authentication And Sessions, Dependencies And Deployment, Input, Output, And Injection, OWASP-Oriented Release Checklist, Secrets And Data

### Community 108 - "Skill Supply Chain Audit"
Cohesion: 0.29
Nodes (6): Audit Workflow, Decision Rules, Local Checks, Overview, References, Skill Supply Chain Audit

### Community 109 - "Web Security Hardening"
Cohesion: 0.29
Nodes (6): CSP Rollout, Overview, Quick Wins, References, Static HTML Caveat, Web Security Hardening

### Community 110 - "AGENTS.md"
Cohesion: 0.33
Nodes (4): Agent Workflow, Project Snapshot, Review Guidelines, Verification

### Community 111 - "cobranzas.js"
Cohesion: 0.47
Nodes (3): formatCurrency(), getStatusBadgeHtml(), renderTable()

### Community 113 - "presupuestos.js"
Cohesion: 0.53
Nodes (3): calculateTotals(), formatCurrency(), renderInvoiceTable()

### Community 114 - "ANEXO B — Pruebas mínimas por dominio"
Cohesion: 0.33
Nodes (6): ANEXO B — Pruebas mínimas por dominio, Auth y tenant, Datos y migraciones, Finanzas/inventario/restaurante, UI, Vito

### Community 115 - "FASE 8 — Provisión, billing y operación ONDIGITAL"
Cohesion: 0.33
Nodes (6): FASE 8 — Provisión, billing y operación ONDIGITAL, Microfase 8.1 — Provisión segura, Microfase 8.2 — Ciclo de suscripción, Microfase 8.3 — Soporte y mantenimiento, Microfase 8.4 — Renovación, atraso y baja, Objetivo

### Community 116 - "newTestRouter"
Cohesion: 0.60
Nodes (5): Handler, T, newTestRouter(), TestDashboardSmokeAndSecurityHeaders(), TestRejectsUnknownJSONFields()

### Community 117 - "main"
Cohesion: 0.60
Nodes (5): defaultBaseDir(), isTempDir(), lanIP(), main(), truncatePath()

### Community 118 - "Visual Quality Reference"
Cohesion: 0.33
Nodes (5): Direction Before Code, Failure Checks, Motion, Quality Rules, Visual Quality Reference

### Community 119 - "Referencias de Plataformas Dentales: Dentalink y Doctocliq"
Cohesion: 0.33
Nodes (5): 🦷 Dentalink, 🦷 Doctocliq, Funciones más destacadas:, Funciones más destacadas:, Referencias de Plataformas Dentales: Dentalink y Doctocliq

### Community 120 - "Flutter Workflow Reference"
Cohesion: 0.33
Nodes (5): Flutter Workflow Reference, New Feature Shape, Responsive Checklist, Screen Checklist, Testing Choices

### Community 121 - "SaaS Patterns Reference"
Cohesion: 0.33
Nodes (5): Common Surfaces, Data Table Checklist, Form Checklist, SaaS Patterns Reference, Visual System

### Community 122 - "App Security Review"
Cohesion: 0.33
Nodes (5): App Security Review, Overview, Production Gates, References, Review Workflow

### Community 123 - "Auth And Access Control Patterns"
Cohesion: 0.33
Nodes (5): Auth And Access Control Patterns, Prototype Caveat, Route Guard Model, Safe API Shape, Tests To Add

### Community 124 - "Skill Risk Patterns"
Cohesion: 0.33
Nodes (5): High Risk, Lower Risk, Medium Risk, Review Output, Skill Risk Patterns

### Community 125 - "Browser Hardening Checklist"
Cohesion: 0.33
Nodes (5): Baseline Headers, Browser Hardening Checklist, CORS, Dangerous DOM Sinks, Third-Party Scripts

### Community 127 - ".Router"
Cohesion: 0.60
Nodes (4): FS, Handler, logMiddleware(), securityHeaders()

### Community 128 - "OnServe"
Cohesion: 0.40
Nodes (4): Alcance actual, Comandos, Límites de producción, OnServe

### Community 130 - "onstock"
Cohesion: 0.50
Nodes (5): ondigital.hn/billing, ondigital.hn/modkit, ondigital.hn/tenant, ondigital.hn/vito, onstock

### Community 131 - "Seguridad: demo → producción (Fase 4.1)"
Cohesion: 0.50
Nodes (4): Antes de producción con datos reales, Hoy (aceptable en demo / piloto controlado), Roles (modelo), Seguridad: demo → producción (Fase 4.1)

### Community 132 - "vito.go"
Cohesion: 0.50
Nodes (3): vitoAskBody, vitoConfirmBody, vitoStatusResponse

### Community 133 - "renderReceipt"
Cohesion: 0.67
Nodes (3): Store, orDash(), renderReceipt()

## Knowledge Gaps
- **668 isolated node(s):** `$schema`, `Bash(go build:*)`, `Bash(go test:*)`, `Bash(go vet:*)`, `Bash(go run:*)` (+663 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Service` connect `Service` to `Registry`?**
  _High betweenness centrality (0.001) - this node is a cross-community bridge._
- **Why does `New()` connect `New` to `Service`, `writeErr`, `Catalog`?**
  _High betweenness centrality (0.001) - this node is a cross-community bridge._
- **Why does `NewServiceFromEnv()` connect `NewServiceFromEnv` to `Service`, `NewRegistry`, `Registry`, `TestTools_CreateRestockPO_PendingThenConfirm`?**
  _High betweenness centrality (0.001) - this node is a cross-community bridge._
- **What connects `$schema`, `Bash(go build:*)`, `Bash(go test:*)` to the rest of the system?**
  _668 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `esc` be split into smaller, more focused modules?**
  _Cohesion score 0.06838709677419355 - nodes in this community are weakly interconnected._
- **Should `writeErr` be split into smaller, more focused modules?**
  _Cohesion score 0.07758620689655173 - nodes in this community are weakly interconnected._
- **Should `onserve/web/js/ui.js` be split into smaller, more focused modules?**
  _Cohesion score 0.11571940604198669 - nodes in this community are weakly interconnected._