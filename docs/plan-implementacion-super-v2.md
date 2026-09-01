# ONDIGITAL — Plan de Implementación Controlado v2

> Fuente oficial de implementación para el repositorio ONDIGITAL.
>
> Basado en una revisión estática del repositorio completo entregado el 2026-07-21.
> No se ejecutaron aplicaciones, migraciones ni suites de pruebas durante esta revisión.
>
> Este documento no autoriza implementar todo el repositorio de una sola vez. Su función es
> obligar a trabajar en cortes pequeños, verificables y aprobados explícitamente.
>
> **Nota (2026-08-28):** OnServe fue retirado del repositorio por ser redundante con OnStock.
> Las menciones a OnServe en este documento son historia del análisis original y ya no
> reflejan el estado del repo; no se reescribieron línea por línea para preservar el registro.

---

## 1. Propósito

Convertir ONDIGITAL en un portafolio que pueda demostrarse, pilotarse y posteriormente operar
con clientes reales sin confundir prototipo, piloto controlado y producción.

El repositorio contiene actualmente estas superficies:

| Superficie | Propósito | Estado observado |
|---|---|---|
| **OnStock** | Inventario, compras, ventas, POS y reportes | Producto local Go/SQLite avanzado, sin auth productiva |
| **OnServe** | Operación de restaurante, salón, comandas, cocina, caja y facturación local | Producto local Go/SQLite funcional, omitido del plan anterior y sin auth |
| **Credental** | Gestión clínica dental | Prototipo avanzado; auth y datos clínicos siguen en navegador/Firebase opcional |
| **Vito** | Asistente white-label sobre datos y acciones de negocio | Núcleo reutilizable; confirmación de acciones todavía manipulable por cliente |
| **Módulos compartidos** | `modkit`, `tenant`, `billing` | Fundaciones útiles, todavía insuficientes como plataforma de producción |
| **Firebase** | Sync opcional de Credental | Reglas temporales expiradas; arquitectura y seguridad no cerradas |
| **Landing y design system** | Presentación y lenguaje visual | Útiles para venta/demo; no son la prioridad de seguridad |

Los planes comerciales siguen siendo parte del contrato de producto, pero ninguna capacidad
se promete como productiva hasta que sus controles técnicos y operativos estén demostrados:

| Plan | Precio de referencia | Infraestructura | Vito |
|---|---:|---|---|
| Starter | USD 19/mes | Cliente | No |
| Business | USD 49/mes | Administrada por ONDIGITAL | No |
| Enterprise AI | USD 99/mes | Administrada por ONDIGITAL | Sí |

La facturación local se acuerda en HNL al tipo de cambio del día y el mínimo comercial es de
tres meses. Los precios, límites y promesas operativas deben pasar la puerta comercial de la
Fase 1 antes de usarse en contratos.

---

## 2. Jerarquía de fuentes de verdad

En caso de contradicción se usa este orden:

1. Código y esquema de datos presentes en el commit/base aprobado.
2. ADRs aprobados en `docs/adr/`.
3. Este plan y su registro de estado.
4. Documentación de producto vigente.
5. Documentos históricos y material de demo.

Disposición documental:

| Documento | Disposición |
|---|---|
| `plan-implementacion-super-v2.md` | Fuente oficial de ejecución |
| `auditoria-estatica-ondigital.md` | Baseline oficial de riesgos y hallazgos |
| `plan-implementacion-super.md` | Retirado; no existe como fuente activa |
| `plan-maestro.md` | Histórico; no usar como tracker operativo |
| `brief.md` | Borrador narrativo; no usar para precios ni arquitectura |
| `modelo-negocio.md` | Fuente comercial, sujeta a validación de capacidad/costos |
| `seguridad-demo-prod.md` | Requisitos mínimos; ampliar con ADRs y matrices reales |
| `arquitectura.md` | Actualizar para incluir OnStock, OnServe y backend de Credental |
| `biblioteca-modulos.md` | Actualizar para decidir si OnServe entra al catálogo |
| `provision-cliente.md` | No usar para clientes reales hasta completar Fases 2–8 |
| `facturacion-suscripcion.md` | Modelo operativo inicial; falta ciclo de pago completo |
| `demo-fase1-vito.md` | Regresión de demo, no prueba de seguridad productiva |
| `checklist-con-sin-vito.md` | Convertir en pruebas repetibles; los ✅ históricos no prueban el estado actual |
| `graphify.md` / `graphify-out/` | Mapa auxiliar; regenerar cuando cambie arquitectura |

`last_session.md` no existe en el repositorio revisado. El handoff durable se reemplaza por el
formato de cierre de fase definido en este documento.

---

## 3. Hallazgos de baseline que el plan debe resolver

### P0 — Contención inmediata

1. El archivo compartido contiene `onstock/.env` ignorado por Git con una clave de proveedor
   no-placeholder. No imprimirla, copiarla ni conservarla en artefactos. Debe rotarse antes de
   compartir nuevamente el proyecto.
2. OnStock y OnServe exponen APIs mutables sin autenticación. Ambos servidores usan `:puerto`,
   lo que enlaza todas las interfaces por defecto, aunque parte de la documentación los trate
   como aplicaciones locales controladas.
3. Credental no debe recibir datos clínicos reales: la sesión, los usuarios, el tenant y gran
   parte de los datos dependen del navegador.

### P1 — Bloqueadores de producción

1. `POST /api/vito/confirm` recibe `tool_name` y `arguments` del cliente; no existe una acción
   pendiente server-side verificable, ligada a usuario, tenant y expiración.
2. OnServe es un producto funcional completo, pero no aparece en el super plan, el README raíz,
   la biblioteca de módulos ni el grafo operativo actual.
3. Las reglas Firestore permitían acceso general hasta 2026-07-01 y ahora están expiradas. Esto
   combina una historia de exposición con un despliegue actualmente no operativo.
4. El repositorio entregado tiene un working tree sucio y el plan actual está sin seguimiento.
   No se puede atribuir trabajo nuevo con seguridad hasta congelar el baseline.
5. OnStock y OnServe generan varias numeraciones mediante `MAX(id)+1`, con riesgo de colisión
   bajo concurrencia.
6. `modules/tenant` define metadata y una matriz gruesa, pero no autentica ni aplica permisos.
7. `modules/billing` crea suscripciones y cambia estados, pero el runbook describe avanzar
   `next_bill` y registrar pagos sin que exista todavía ese ciclo completo en código.

### P2 — Deuda de producto y documentación

1. La documentación habla de “fallback local” para Vito, pero el repositorio revisado contiene
   provider mock y provider compatible con API; no hay un runtime de modelo local demostrado.
2. La promesa de alta disponibilidad, monitoreo, backups y soporte en planes económicos no tiene
   todavía SLO, límites, presupuesto de infraestructura ni costo máximo de IA.
3. Los checks históricos con ✅ son evidencia de una sesión pasada, no evidencia reproducible
   del commit que se vaya a liberar.
4. Firebase, backend multi-tenant y despliegue por clínica siguen siendo decisiones mezcladas,
   no una arquitectura aprobada.

---

## 4. Protocolo anti-estancamiento y anti-progreso-falso

Estas reglas son obligatorias para cualquier modelo o equipo implementador.

### 4.1 Una microfase por vez

- No implementar dos microfases en paralelo en el mismo working tree.
- No iniciar una microfase sin una aprobación explícita.
- No avanzar automáticamente a la siguiente microfase al terminar.
- Una microfase debe perseguir un solo resultado verificable.
- Una microfase no puede mezclar productos, salvo que sea una fundación compartida aprobada.

### 4.2 Estados permitidos

Cada microfase solo puede estar en uno de estos estados:

```text
NO_INICIADA
PROPUESTA
APROBADA
EN_CURSO
BLOQUEADA
EN_VERIFICACION
LISTA_PARA_REVISION
ACEPTADA
RECHAZADA
```

`ACEPTADA` solo puede asignarse después de la confirmación humana. El implementador puede dejar
una fase en `LISTA_PARA_REVISION`, nunca autoaceptarla.

### 4.3 Presupuesto máximo por microfase

Por defecto, una microfase debe cumplir todos estos límites:

- Un producto o una fundación compartida.
- Un objetivo principal.
- Máximo 8 archivos de producto modificados.
- Máximo una migración de esquema.
- Máximo dos ciclos de corregir → verificar.
- Sin refactors oportunistas no requeridos por el criterio de aceptación.

Si necesita exceder un límite, debe detenerse y presentar una división nueva. No puede seguir
acumulando cambios bajo el mismo nombre de fase.

### 4.4 Prohibiciones de reporte

El implementador no puede:

- Reportar porcentajes subjetivos como “80% listo”.
- Decir “pruebas pasaron” sin mostrar comando, código de salida y resumen.
- Decir “seguro”, “productivo” o “completo” basándose solo en UI o revisión visual.
- Marcar checks no ejecutados como aprobados.
- ocultar una prueba fallida detrás de “casi listo”.
- prometer continuar en segundo plano.
- editar el estado del plan como cerrado antes de aceptación humana.

### 4.5 Regla de bloqueo

Después de dos intentos fallidos de verificación:

1. detener cambios;
2. restaurar o preservar un estado reproducible;
3. marcar la microfase `BLOQUEADA`;
4. entregar causa, evidencia y opciones;
5. esperar decisión humana.

No se permite un bucle indefinido de “haré otro ajuste”.

### 4.6 Un solo escritor

- Un único agente/modelo escribe en un working tree.
- Revisores trabajan read-only o en worktrees separados.
- No usar revisiones en background como requisito de cierre si nadie las supervisa.
- Todo cambio parte de una rama/base identificable y de un working tree limpio o congelado.

---

## 5. Contrato de aprobación de una microfase

### 5.1 Propuesta obligatoria antes de editar

El implementador entrega:

```text
MICROFASE: X.Y — nombre
ESTADO: PROPUESTA
OBJETIVO ÚNICO:
BASE / COMMIT:
ARCHIVOS PREVISTOS:
DECISIONES YA APROBADAS:
FUERA DE ALCANCE:
RIESGOS:
PRUEBAS QUE SE EJECUTARÁN:
CRITERIO DE ACEPTACIÓN:
ROLLBACK:
```

La edición comienza únicamente después de recibir:

```text
APROBAR FASE X.Y
```

Una respuesta diferente se trata como corrección de alcance, no como aprobación implícita.

### 5.2 Informe de cierre obligatorio

Al terminar, el implementador entrega:

```text
MICROFASE: X.Y — nombre
ESTADO: LISTA_PARA_REVISION
BASE / COMMIT:
ARCHIVOS MODIFICADOS:
RESUMEN DEL DIFF:
MIGRACIONES:
COMANDOS EJECUTADOS:
RESULTADOS Y CÓDIGOS DE SALIDA:
EVIDENCIA GENERADA:
RIESGOS ABIERTOS:
DESVIACIONES DEL PLAN:
ROLLBACK PROBADO O DOCUMENTADO:
SIGUIENTE MICROFASE PROPUESTA:
```

La microfase solo pasa a `ACEPTADA` al recibir:

```text
ACEPTAR FASE X.Y
```

Para rechazar:

```text
RECHAZAR FASE X.Y: motivo
```

La siguiente microfase no se propone como trabajo activo hasta que la anterior sea aceptada,
rechazada o cancelada explícitamente.

### 5.3 Evidencia durable

Cada microfase aceptada debe dejar:

```text
docs/evidence/X.Y/
  closure.md
  commands.txt
  test-summary.md
  risk-delta.md
```

No se guardan secretos, dumps reales ni PII en evidencia. Salidas extensas pueden quedar en CI;
`closure.md` enlaza la ejecución correspondiente.

---

## 6. Mapa de fases y dependencias

```text
Fase 0  Contención y baseline
   │
   ▼
Fase 1  Decisiones de arquitectura, datos y producto
   │
   ▼
Fase 2  Fundaciones compartidas de seguridad y operación
   ├──────────────┬──────────────┐
   ▼              ▼              ▼
Fase 3          Fase 4         Fase 5
OnStock         OnServe        Credental
   └──────────────┴──────────────┘
                  │
                  ▼
Fase 6  Vito, módulos y enforcement por plan
                  │
                  ▼
Fase 7  Infraestructura, Firebase, CI y observabilidad
                  │
                  ▼
Fase 8  Provisión, billing, soporte y recuperación
                  │
                  ▼
Fase 9  Pilotos controlados
                  │
                  ▼
Fase 10 Lanzamiento productivo por producto
```

Reglas de dependencia:

- Fase 1 no escribe código de producto; cierra decisiones.
- Fase 2 no convierte automáticamente todas las suites a una arquitectura común; define y
  prueba contratos compartidos mínimos.
- Fases 3, 4 y 5 pueden ejecutarse en worktrees separados, pero cada una conserva sus propias
  puertas de aprobación.
- Fase 6 no puede habilitar Vito por plan sobre un producto que no tenga auth, permisos,
  tenant y auditoría aceptados.
- Fase 9 se ejecuta por un producto a la vez.
- “ONDIGITAL está en producción” no es un estado válido. Cada producto tiene su propio estado.

---

# FASE 0 — Contención y baseline reproducible

## Objetivo

Eliminar riesgos inmediatos y fijar una base confiable antes de cambiar arquitectura o código.

## Microfase 0.1 — Contención de secretos

**Entregables**

- Rotar la clave detectada en el `.env` compartido.
- Revocar credenciales antiguas en el proveedor correspondiente.
- Eliminar `.env`, bases de datos, binarios y runtime artifacts de futuros ZIP/handoffs.
- Ejecutar un escaneo de secretos sobre archivos versionados y sobre el paquete de entrega.
- Documentar variables permitidas en `.env.example` sin valores reales.

**Aceptación**

- La credencial anterior está revocada.
- El nuevo paquete no contiene `.env` real.
- El escaneo no encuentra secretos activos; falsos positivos quedan explicados.

## Microfase 0.2 — Congelar el working tree recibido

**Entregables**

- Guardar `git status`, commit base y `git diff --stat` como evidencia.
- Preservar los cambios preexistentes sin mezclarlos con implementación nueva.
- Crear rama o worktree de planificación.
- Decidir qué hacer con `docs/PLAN.md` eliminado y el super plan sin seguimiento.

**Aceptación**

- Existe una base identificable.
- Ningún cambio previo se atribuye falsamente a una fase nueva.
- El implementador puede volver al estado inicial.

## Microfase 0.3 — Inventario real del portafolio

**Entregables**

- Añadir OnServe al README raíz, arquitectura, Graphify, catálogo o lista de exclusión.
- Clasificar cada superficie como `demo`, `piloto`, `candidato-produccion`, `pausado` o
  `historico`.
- Registrar entrypoints, datos, rutas críticas, backups y comandos de verificación.
- Identificar artefactos generados, legados y runtime data que no deben entrar en revisiones.

**Aceptación**

- Ningún producto ejecutable queda fuera del mapa.
- OnServe tiene dueño, alcance y prioridad explícitos.

## Microfase 0.4 — Baseline verificable

**Entregables**

- Ejecutar las pruebas existentes sin modificar código.
- Registrar fallos previos por producto.
- Registrar versiones de Go y herramientas realmente requeridas.
- Crear matriz inicial de riesgos con severidad, dueño y fase de resolución.

**Comandos mínimos futuros**

```bash
git diff --check
cd onstock && make test
cd ../onserve && make test
cd ../modules/vito && go test ./...
cd ../tenant && go test ./...
cd ../billing && go test ./...
cd ../modkit && go test ./...
```

Credental y landing requieren smoke test servido, pero un servidor iniciado no cuenta como
prueba por sí mismo; deben registrarse páginas, viewport, flujo y resultado.

## Puerta G0

No avanzar hasta aprobar:

- contención de credenciales;
- baseline Git;
- inventario completo con OnServe;
- fallos previos documentados.

---

# FASE 1 — Decisiones de arquitectura, datos y producto

## Objetivo

Cerrar decisiones que cambiarían por completo el costo, la seguridad o el diseño. Esta fase
produce ADRs; no implementa el sistema definitivo.

## Microfase 1.1 — Alcance del portafolio

Decidir para OnStock, OnServe y Credental:

- prioridad de negocio;
- nivel objetivo: demo, piloto o producción;
- primer cliente/piloto previsto;
- dueño técnico y dueño de producto;
- qué producto queda explícitamente pausado.

**Aceptación:** no existe una orden genérica de “hacer todo productivo”.

## Microfase 1.2 — Modelo de despliegue por producto

Evaluar y elegir por suite:

- una instancia local por cliente;
- instancia administrada por cliente;
- backend multi-tenant;
- híbrido local + nube.

Debe resolver:

- bind por defecto (`127.0.0.1` frente a LAN explícita);
- acceso remoto;
- HTTPS/reverse proxy;
- actualizaciones;
- ubicación de backups;
- pérdida de internet;
- aislamiento de datos.

**Aceptación:** ADR por producto con amenazas y rollback.

## Microfase 1.3 — Identidad y permisos

Definir:

- usuario humano, dispositivo y sesión;
- pertenencia a uno o varios tenants;
- roles por producto;
- superadmin de ONDIGITAL, si existe;
- invitación, alta, baja, recuperación y revocación;
- duración y rotación de sesión;
- acciones que requieren reautenticación;
- caja como rol, dispositivo, modo de proceso o combinación.

Roles iniciales sugeridos, sujetos a ADR:

| Producto | Roles mínimos candidatos |
|---|---|
| OnStock | admin, gerente, empleado, viewer, caja |
| OnServe | admin, gerente, mesero, cocina, caja, viewer |
| Credental | admin, odontólogo, asistente, recepción, caja, viewer/auditor |

**Aceptación:** matriz recurso × acción × rol × tenant aprobada.

## Microfase 1.4 — Datos, PII y uso de IA

Clasificar:

- datos públicos;
- datos internos de negocio;
- datos financieros;
- credenciales;
- PII de clientes/pacientes;
- datos clínicos sensibles;
- datos permitidos en prompts y logs.

Definir retención, exportación, borrado, backups, acceso de soporte y respuesta a incidentes.

**Aceptación:** política de datos y política de Vito aprobadas antes de enviar datos reales a
un proveedor externo.

## Microfase 1.5 — Decisión Firebase/Credental

Elegir una sola dirección:

1. retirar Firebase y usar backend propio;
2. conservar Firebase con Authentication y reglas estrictas;
3. usar Firebase solo como demo/archivo histórico;
4. arquitectura híbrida claramente delimitada.

La decisión debe resolver conflictos, offline, IDs, timestamps, borrado, recuperación y tenant.

**Aceptación:** ADR cerrado; no se implementan simultáneamente dos backends “por si acaso”.

## Microfase 1.6 — Matriz comercial y sostenibilidad

Definir por plan:

- usuarios incluidos;
- productos y módulos incluidos;
- almacenamiento;
- retención de backups;
- soporte y horarios;
- RPO/RTO;
- límites de Vito y costo máximo mensual;
- disponibilidad realmente ofrecida;
- alcance de mejoras menores;
- procedimiento de atraso y baja.

No prometer “alta disponibilidad” ni “fallback local” hasta que exista implementación,
monitoreo y costo demostrados.

**Aceptación:** contrato técnico-comercial que pueda aplicarse en backend y operación.

## Puerta G1

Requiere ADRs aprobados para despliegue, identidad, datos, Firebase y capacidades por plan.

---

# FASE 2 — Fundaciones compartidas

## Objetivo

Crear contratos mínimos que eviten repetir controles incompatibles en cada producto, sin caer
en una reescritura general del repositorio.

## Microfase 2.1 — Baseline HTTP seguro para Go

Aplicar primero en una harness o producto piloto:

- loopback por defecto o flag LAN explícito según ADR;
- `ReadHeaderTimeout`, `ReadTimeout`, `WriteTimeout`, `IdleTimeout`;
- límite de body y rechazo de campos desconocidos;
- tipos de contenido consistentes;
- headers de seguridad;
- CORS cerrado;
- CSRF cuando se usen cookies;
- rate limiting para auth, Vito y mutaciones sensibles;
- request/correlation ID;
- apagado ordenado.

**Aceptación:** pruebas de request grande, timeout, método inválido, origen no permitido y LAN.

## Microfase 2.2 — Sesiones y autenticación

Implementar el contrato aprobado:

- contraseñas con Argon2id o bcrypt y parámetros documentados;
- cookies `HttpOnly`, `Secure`, `SameSite` cuando aplique;
- expiración, rotación y revocación;
- logout efectivo;
- protección de credenciales iniciales;
- rate limit y auditoría de login.

**Aceptación:** pruebas de sesión inválida, vencida, revocada, fijación de sesión y logout.

## Microfase 2.3 — Autorización y tenant

`modules/tenant` deja de ser metadata solamente o se complementa con un componente aprobado:

- actor y tenant obtenidos de sesión, nunca del body como autoridad;
- permisos por recurso y acción;
- object-level authorization;
- plan y módulos aplicados server-side;
- denegación por defecto;
- separación entre usuario del cliente y operador ONDIGITAL.

**Aceptación:** matriz de pruebas unauthenticated, rol incorrecto, tenant cruzado y objeto ajeno.

## Microfase 2.4 — Auditoría

Definir evento estable:

```text
id, timestamp, request_id, actor_id, tenant_id, product,
action, resource_type, resource_id, result, reason, metadata_safe
```

Requisitos:

- no guardar contraseñas, tokens, prompts clínicos completos ni secretos;
- registrar mutaciones financieras, inventario, caja, usuarios, tenant y Vito;
- protección contra edición casual;
- exportación para soporte/auditoría.

## Microfase 2.5 — Migraciones y backup/restore

- versionado de esquema;
- migraciones forward reproducibles;
- backup previo;
- validación posterior;
- rollback o restore documentado;
- pruebas con DB nueva y DB de versión anterior;
- cifrado/retención según política.

## Microfase 2.6 — Configuración y secretos

- `.env.example` sin secretos;
- validación de configuración al arrancar;
- separación demo/staging/producción;
- archivos de datos y logs fuera del binario/repo;
- procedimiento de rotación;
- paquete de entrega con allowlist de archivos.

## Puerta G2

Las fundaciones deben probarse en al menos una suite Go antes de propagarse.

---

# FASE 3 — OnStock candidato a producción

## Objetivo

Convertir OnStock en el primer candidato a piloto real, conservando su funcionamiento local y
sus invariantes de inventario y finanzas.

## Microfase 3.1 — Auth, roles y superficies admin/caja

- proteger las rutas administrativas;
- definir sesión real para caja;
- eliminar confianza en `sessionStorage` como autorización;
- mantener proceso `-caja` como reducción de superficie, no como sustituto de auth;
- requerir reautenticación para salir de caja o cambiar configuración sensible.

## Microfase 3.2 — Tenant y plan

- impedir `PUT /api/tenant` sin permiso administrativo;
- obtener tenant desde contexto confiable;
- validar módulos y plan;
- decidir si una instancia local contiene exactamente un tenant;
- evitar que el cliente se autoasigne Enterprise AI sin flujo de provisión.

## Microfase 3.3 — Confirmación segura de Vito

Al preguntar:

- crear acción pendiente server-side;
- token aleatorio de alta entropía;
- almacenar hash, actor, tenant, tool, argumentos canonizados, resumen, expiración y estado;
- enviar al cliente solo token opaco y resumen seguro.

Al confirmar:

- aceptar únicamente el token;
- revalidar actor, tenant, plan, permiso, expiración y estado;
- ejecutar una sola vez;
- invalidar de forma transaccional;
- registrar auditoría e idempotency key.

Pruebas obligatorias:

- replay;
- token vencido;
- token de otro usuario/tenant;
- argumentos manipulados;
- doble click/concurrencia;
- tool deshabilitada por plan;
- acción fallida y reintento definido.

## Microfase 3.4 — Integridad de inventario y numeración

- reemplazar `MAX(id)+1` para ventas y órdenes;
- constraints e índices únicos;
- máquina de estados para venta y compra;
- doble recepción y doble anulación;
- stock negativo según política;
- costo promedio ponderado;
- ajustes con actor, motivo y referencia;
- concurrencia SQLite.

## Microfase 3.5 — Pagos, impuestos y reversión

- allowlist de métodos de pago;
- descuentos y price override por rol;
- validación RTN/fechas/importes;
- anulación y devolución con reversión de stock y asientos operativos;
- fixtures de reportes Honduras;
- exportaciones CSV/XLSX/PDF comparadas con datos conocidos.

## Microfase 3.6 — Backup, restore y operación local

- backup consistente con WAL;
- restauración en máquina limpia;
- detección de disco lleno/corrupción;
- ruta de datos explícita;
- actualización del binario con rollback;
- HTTPS/LAN según ADR;
- logs y alertas mínimas.

## Microfase 3.7 — Cierre OnStock

Criterios:

- pruebas unitarias, integración, seguridad y E2E aprobadas;
- backup/restore demostrado;
- matriz de roles demostrada;
- Vito off/on por plan;
- cero P0/P1 abiertos;
- P2 aceptados con dueño y fecha.

---

# FASE 4 — OnServe candidato a producción

## Objetivo

Incorporar OnServe formalmente al portafolio y cerrar riesgos de restaurante, caja y
facturación local.

## Microfase 4.1 — Registro de producto y módulo

- añadirlo a README, arquitectura, Graphify y matriz comercial;
- decidir si implementa `modkit.Module`;
- definir qué planes lo incluyen;
- documentar límites fiscales: registro local no equivale a integración SAR.

## Microfase 4.2 — Roles y autorización

- admin/gerente;
- mesero;
- cocina/barra;
- caja;
- viewer/auditor.

Proteger mesas, menú, comandas, cocina, caja, configuración e informes por acción.

## Microfase 4.3 — Estados de mesa, orden y cocina

- máquinas de estado explícitas;
- transiciones inválidas rechazadas server-side;
- concurrencia entre mesero, cocina y caja;
- idempotencia al enviar comanda;
- cancelaciones con motivo y actor.

## Microfase 4.4 — Caja, pagos y arqueo

- apertura/cierre por actor;
- una sesión abierta según política;
- pagos divididos;
- propina y tratamiento fiscal documentado;
- diferencias de caja auditadas;
- reversión/anulación;
- reemplazar `MAX(id)+1` de sesiones.

## Microfase 4.5 — Factura, CAI y numeración

- reemplazar secuencias basadas en `MAX(id)+1`;
- constraints y rangos;
- vencimiento/agotamiento CAI;
- documentos anulados sin reutilizar correlativo;
- distinguir factura local impresa de factura electrónica SAR;
- pruebas de concurrencia.

## Microfase 4.6 — Backup, restore, hardening y cierre

Mismos estándares que OnStock, con pruebas sobre comandas abiertas, caja abierta y facturas.

---

# FASE 5 — Credental persistente y seguro

## Objetivo

Convertir la UI clínica en una aplicación con backend autorizado y almacenamiento clínico
durable. Credental no entra a piloto con datos reales antes del cierre de esta fase.

## Microfase 5.1 — Modelo clínico y migración

Inventariar y modelar:

- clínicas/tenants y sucursales;
- usuarios y odontólogos;
- pacientes e identificadores;
- citas;
- historia/evoluciones;
- odontogramas y periodontogramas;
- procedimientos;
- presupuestos, pagos y caja;
- facturación/CAI;
- inventario y laboratorios;
- documentos y comunicaciones.

Definir constraints, relaciones, timestamps, versión y auditoría.

## Microfase 5.2 — Backend mínimo vertical

Implementar primero un flujo completo pequeño, por ejemplo:

```text
login → listar pacientes → crear/editar paciente → auditar → backup/restore
```

No migrar todos los módulos en una sola microfase.

## Microfase 5.3 — Auth y autorización clínica

- roles aprobados;
- tenant desde sesión;
- acceso por paciente/objeto;
- recuperación segura;
- revocación;
- acciones sensibles auditadas;
- operador de soporte con acceso excepcional y trazable, si se aprueba.

## Microfase 5.4 — Sustituir `db.js` por adaptador de API

- conservar una interfaz estable donde sea útil;
- eliminar `sessionStorage` como fuente de verdad;
- tratar localStorage solo como preferencias/cache no sensible;
- estados loading/error/offline claros;
- concurrencia y conflictos definidos;
- no mezclar silenciosamente nube y local dando prioridad arbitraria.

## Microfase 5.5 — Migración módulo por módulo

Orden recomendado:

1. pacientes y usuarios;
2. agenda;
3. procedimientos e historia clínica;
4. odontograma/periodontograma;
5. presupuestos y pagos;
6. caja/facturación;
7. inventario/laboratorios;
8. comunicaciones/documentos.

Cada módulo tiene su propia microfase y aprobación.

## Microfase 5.6 — Seguridad de frontend

- reemplazar render inseguro de datos no confiables;
- sanitización solo donde el HTML sea requisito real;
- CSP y headers desde servidor;
- protección de exportaciones;
- no exponer datos clínicos en logs, URLs o mensajes de error;
- accesibilidad de flujos críticos.

## Microfase 5.7 — PII, retención y derechos operativos

- exportación de expediente;
- corrección y baja según política;
- retención legal/contractual definida;
- cifrado en tránsito y reposo según arquitectura;
- backups protegidos;
- política de Vito para resumen clínico y mensajes.

## Microfase 5.8 — Firebase según ADR

Si se conserva:

- Authentication;
- reglas por tenant, rol, propietario y campos;
- App Check si aplica;
- entornos separados;
- Emulator tests;
- índices, costos, logs y backups.

Si se retira:

- desactivar inicialización en producción;
- migrar o eliminar datos de prueba;
- documentar cierre del proyecto/colecciones;
- impedir doble escritura residual.

## Microfase 5.9 — Backup/restore y cierre clínico

- restauración en entorno limpio;
- integridad entre paciente, historia, presupuesto y pagos;
- tenant cruzado imposible;
- sesión manipulada no cambia identidad;
- cero P0/P1;
- revisión de privacidad independiente.

---

# FASE 6 — Vito, módulos y enforcement por plan

## Objetivo

Hacer que Vito y la biblioteca modular sean capacidades controladas del producto, no toggles
de interfaz ni promesas documentales.

## Microfase 6.1 — Contrato de módulos versionado

- incluir o excluir OnServe explícitamente;
- semver y compatibilidad de capabilities;
- migración de módulos;
- dependencias entre módulos;
- catálogo interno frente a catálogo público;
- suite funcional con Vito apagado.

## Microfase 6.2 — Gobernanza de tools

- schemas estrictos con `additionalProperties: false`;
- límites numéricos y textuales;
- allowlist por producto, rol y plan;
- queries y actions separadas;
- timeouts y cancelación;
- tamaño máximo de resultados;
- datos no confiables tratados como datos, no instrucciones.

## Microfase 6.3 — Privacidad y egress de IA

- redacción/minimización;
- proveedor por tenant/plan;
- log de egress sin PII;
- consentimiento contractual;
- retención del proveedor documentada;
- bloqueo de categorías clínicas no aprobadas;
- respuesta segura cuando no puede consultar datos.

## Microfase 6.4 — Historia, costo y disponibilidad

- truncado server-side;
- cuotas por tenant/usuario;
- presupuesto de tokens/costo;
- rate limit;
- circuit breaker;
- comportamiento sin proveedor;
- mock solo para pruebas/demo.

No etiquetar el mock como modelo local. Un modelo local real requiere una microfase futura con
runtime, hardware objetivo, calidad, seguridad, actualización y benchmark.

## Microfase 6.5 — Planes y upgrades

- Starter y Business no pueden invocar Vito aunque manipulen la UI;
- Enterprise AI requiere configuración válida y política aceptada;
- upgrade/downgrade transaccional;
- degradación segura al vencer plan;
- módulos autorizados por backend;
- pruebas por producto y plan.

---

# FASE 7 — Infraestructura, Firebase, CI y observabilidad

## Objetivo

Hacer reproducible el despliegue y visible el estado del sistema.

## Microfase 7.1 — Entornos y artefactos

- demo, test, staging y producción separados;
- builds reproducibles;
- versiones y checksums;
- allowlist de archivos de entrega;
- sin DB, `.env`, binarios obsoletos ni `node_modules` en paquetes fuente;
- SBOM/dependencias cuando aplique.

## Microfase 7.2 — CI mínima

Por cambio relevante:

- formato/lint;
- tests unitarios;
- integración SQLite;
- race/concurrencia donde sea viable;
- secret scan;
- dependency scan;
- link check Markdown;
- build por plataforma;
- pruebas Firebase Emulator si aplica.

## Microfase 7.3 — Observabilidad

- logs estructurados;
- request ID;
- métricas de errores y latencia;
- auth fallida;
- denegaciones tenant;
- fallos de Vito;
- backups fallidos;
- disco/DB;
- alertas con dueño y severidad.

## Microfase 7.4 — HTTPS y acceso remoto

- TLS directo o reverse proxy aprobado;
- certificados y renovación;
- firewall;
- VPN/túnel si corresponde;
- no exponer puertos administrativos por accidente;
- documentación de LAN segura.

## Microfase 7.5 — DR

- RPO/RTO por plan;
- restauración cronometrada;
- copia offsite en Business/Enterprise;
- prueba de pérdida total de host;
- inventario de secretos y dependencias.

---

# FASE 8 — Provisión, billing y operación ONDIGITAL

## Objetivo

Entregar, cobrar, soportar, renovar y retirar clientes sin APIs abiertas ni pasos manuales
ambiguos.

## Microfase 8.1 — Provisión segura

- ficha de cliente validada;
- tenant creado por herramienta interna autenticada, no por endpoint público;
- usuario admin inicial con cambio obligatorio;
- módulos y plan aplicados;
- backup inicial;
- URL/TLS;
- acta de handoff;
- aceptación del cliente.

Actualizar `provision-cliente.md`: sus comandos actuales son de demo y no deben promover un
`PUT /api/tenant` sin auth.

## Microfase 8.2 — Ciclo de suscripción

Completar `modules/billing` o sustituirlo por una herramienta ops aprobada:

- registrar pago;
- fecha y referencia;
- monto USD y HNL;
- tipo de cambio usado;
- descuentos;
- avanzar `next_bill` de forma explícita;
- notas auditables;
- cancelación/reactivación;
- prevención de duplicados;
- backup y concurrencia del ledger.

No almacenar tarjetas ni credenciales de pago.

## Microfase 8.3 — Soporte y mantenimiento

- severidades P0–P3;
- canal y horario;
- responsables;
- ventana de mantenimiento;
- política de actualizaciones;
- acceso de soporte;
- comunicación de incidentes;
- cierre y postmortem.

## Microfase 8.4 — Renovación, atraso y baja

- recordatorios;
- `past_due` con proceso humano;
- exportación del cliente;
- retención y eliminación;
- revocación de accesos;
- recuperación de infraestructura administrada;
- evidencia de cierre.

---

# FASE 9 — Pilotos controlados

## Objetivo

Validar una suite con operación real limitada antes de declararla productiva.

Orden recomendado por riesgo y madurez:

1. OnStock.
2. OnServe.
3. Credental, solo después de completar seguridad clínica y privacidad.

## Requisitos del piloto

- cliente y alcance identificados;
- datos de prueba o datos reales autorizados según producto;
- plan de rollback;
- backup inicial;
- monitoreo;
- soporte disponible;
- período y límites definidos;
- incident log;
- criterios de éxito y salida.

## Aceptación de piloto

- flujos críticos completados;
- restore probado;
- ninguna violación de tenant/auth;
- reconciliación financiera/inventario correcta;
- feedback documentado;
- P0/P1 cerrados;
- decisión explícita: avanzar, repetir o retirar.

---

# FASE 10 — Lanzamiento productivo por producto

## Criterio final

Un producto puede llamarse “producción” únicamente cuando:

- autentica y autoriza server-side;
- aplica tenant y plan server-side;
- persiste datos de forma durable;
- tiene migraciones y rollback/restore;
- audita mutaciones críticas;
- protege secretos y PII;
- opera por HTTPS o LAN controlada según ADR;
- tiene observabilidad y dueño de alertas;
- tiene provisión, soporte, renovación y baja;
- pasó piloto;
- no tiene riesgos P0/P1 abiertos;
- los P2 abiertos están aceptados por dueño y fecha;
- recibió `ACEPTAR FASE 10.<producto>`.

Estados válidos de release:

```text
OnStock:   demo | piloto | producción | pausado
OnServe:   demo | piloto | producción | pausado
Credental: demo | piloto | producción | pausado
Vito:      deshabilitado | demo | producción-por-producto
```

---

# ANEXO A — Matriz inicial de riesgos y fase propietaria

| ID | Riesgo | Severidad | Fase |
|---|---|---:|---:|
| R-001 | Clave activa incluida en paquete compartido | P0 | 0.1 |
| R-002 | APIs OnStock accesibles sin identidad en LAN | P0 | 1.2, 2, 3 |
| R-003 | APIs OnServe accesibles sin identidad | P0 | 1.2, 2, 4 |
| R-004 | Credental usa auth/tenant/datos del navegador | P0 | 1, 5 |
| R-005 | Confirmación Vito manipulable | P1 | 3.3, 6 |
| R-006 | Firestore temporal/expirado y sin auth real | P1 | 1.5, 5.8, 7 |
| R-007 | OnServe omitido del plan y catálogo | P1 | 0.3, 4.1 |
| R-008 | Numeración concurrente con `MAX(id)+1` | P1 | 3.4, 4.4, 4.5 |
| R-009 | `tenant` es metadata sin enforcement | P1 | 2.3 |
| R-010 | Billing no implementa el ciclo descrito | P1 | 8.2 |
| R-011 | Runbook propone endpoint de tenant sin auth | P1 | 8.1 |
| R-012 | Working tree sucio impide atribución confiable | P1 | 0.2 |
| R-013 | “Fallback local” no demostrado | P2 | 1.6, 6.4 |
| R-014 | Checks históricos no reproducibles | P2 | 0.4, 7.2 |
| R-015 | Promesas de HA/soporte sin SLO/costos | P2 | 1.6, 7, 8 |

La matriz se actualiza solo mediante `risk-delta.md` al cerrar una microfase.

---

# ANEXO B — Pruebas mínimas por dominio

### Auth y tenant

- sin sesión;
- sesión vencida/revocada;
- rol incorrecto;
- tenant incorrecto;
- objeto de otro tenant;
- logout;
- recuperación;
- CSRF si cookies;
- rate limit.

### Datos y migraciones

- DB nueva;
- DB de versión anterior;
- migración interrumpida;
- backup previo;
- restore;
- constraints;
- concurrencia;
- disco lleno cuando sea simulable.

### Finanzas/inventario/restaurante

- doble recepción;
- doble anulación;
- doble pago;
- stock negativo;
- costo promedio;
- descuentos/override;
- cierre de caja;
- pago dividido;
- correlativos concurrentes;
- reportes contra fixtures.

### Vito

- Vito apagado;
- plan no permitido;
- tool desconocida;
- schema inválido;
- token replay/vencido/cruzado;
- prompt injection en datos;
- historial excesivo;
- timeout/costo;
- proveedor caído;
- PII bloqueada.

### UI

- desktop y móvil;
- teclado;
- errores/loading/empty;
- no ocultar acciones críticas por layout;
- render de datos no confiables;
- flujo real, no solo carga de página.

---

# ANEXO C — Revisión independiente

Antes de aceptar una fase mayor:

1. revisión read-only del diff;
2. priorizar seguridad, pérdida de datos, tenant, contabilidad y regresiones;
3. registrar hallazgos con severidad y archivo/línea;
4. corregir únicamente hallazgos válidos dentro del presupuesto;
5. si la corrección amplía el alcance, abrir nueva microfase;
6. repetir las pruebas afectadas.

La revisión no sustituye pruebas ni aprobación humana.

---

# ANEXO D — Primeras aprobaciones recomendadas

El orden inmediato recomendado es:

```text
0.1 Contención de secretos
0.2 Congelar working tree
0.3 Inventario real con OnServe
0.4 Baseline de pruebas
1.1 Alcance del portafolio
1.2 Modelo de despliegue
1.3 Identidad y permisos
1.4 Datos/PII/IA
1.5 Firebase/Credental
1.6 Matriz comercial
```

No comenzar por escribir autenticación o un backend clínico antes de cerrar estas decisiones.

---

# ANEXO E — Plantilla de estado del plan

Mantener una sola tabla; no usar porcentajes:

| Microfase | Estado | Base | Evidencia | Aprobó | Fecha |
|---|---|---|---|---|---|
| 0.1 | NO_INICIADA | — | — | — | — |
| 0.2 | NO_INICIADA | — | — | — | — |
| 0.3 | NO_INICIADA | — | — | — | — |
| 0.4 | NO_INICIADA | — | — | — | — |

Añadir filas cuando se apruebe el alcance. Una fase `BLOQUEADA` conserva el motivo y no se
reemplaza por lenguaje optimista.

---

# ANEXO F — Definición de “hecho” del programa

El programa no termina porque todos los checkboxes estén marcados. Termina cuando:

- cada producto tiene estado explícito;
- los productos productivos pasaron sus puertas individuales;
- los productos pausados no se presentan como producción;
- los runbooks reflejan exactamente el sistema real;
- las evidencias son reproducibles desde una base identificable;
- otro equipo puede provisionar, operar, restaurar y retirar un cliente sin conocimiento
  tribal;
- ninguna credencial real forma parte del repositorio o paquete fuente.
