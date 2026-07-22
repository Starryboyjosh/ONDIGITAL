# Auditoría estática del plan y repositorio ONDIGITAL

**Fecha:** 2026-07-21
**Alcance:** revisión estática del ZIP entregado; documentación, estructura Git y código crítico.
**No ejecutado:** aplicaciones, suites de tests, migraciones, Firebase Emulator y builds.

## 1. Material revisado

- Documentación raíz: `README.md`, `AGENTS.md`, `CLAUDE.md`.
- Los 16 documentos principales de `docs/`.
- Productos: `onstock/`, `onserve/`, `credental/`.
- Fundaciones: `modules/vito`, `modules/modkit`, `modules/tenant`, `modules/billing`.
- Configuración Firebase y reglas Firestore.
- Entry points, routers HTTP, stores SQLite, confirmación de Vito y auth/storage de Credental.
- Estado Git, archivos ignorados presentes y referencias documentales.

## 2. Diagnóstico del plan anterior

El plan anterior tenía buen criterio de seguridad, pero no representaba el repositorio entero.
Funcionaba como lista de remediaciones para OnStock, Vito y Credental, no como sistema de
ejecución controlado.

Fortalezas conservadas:

- prioridad a auth y autorización server-side;
- confirmaciones tokenizadas de Vito;
- pruebas adversariales;
- integridad de inventario y finanzas;
- backup/restore;
- separación entre UI y autorización;
- operación y facturación incluidas en el concepto de producción.

Debilidades corregidas en v2:

- faltaba OnServe;
- no había contención inicial de secretos;
- no reconocía el working tree sucio;
- mezclaba decisiones arquitectónicas con implementación;
- fases demasiado grandes;
- dependencias incompletas;
- criterios de cierre inconsistentes;
- no existía confirmación humana antes/después de cada fase;
- no había límites para impedir ciclos eternos;
- no diferenciaba mock de modelo local real;
- la facturación documentada excedía la implementación actual del ledger.

## 3. Hallazgos principales del repositorio

### 3.1 OnServe está fuera del mapa

`onserve/` es una aplicación Go/SQLite completa de restaurantes con salón, menú, comandas,
cocina, caja, pagos e invoices. Su propio README reconoce que no tiene autenticación ni roles.
No aparece en el super plan anterior, README raíz, biblioteca modular ni Graphify actual.

**Impacto:** un producto ejecutable puede quedar sin dueño, pruebas ni hardening mientras el
programa se declara completo.

### 3.2 Se compartió una credencial en un archivo ignorado

El ZIP contiene `onstock/.env`; la variable de API de Vito tiene un valor no-placeholder.
El archivo no está versionado, pero sí fue incluido en el paquete compartido.

**Impacto:** la higiene Git no protege archivos al comprimir o transferir el árbol completo.
La primera microfase debe rotar/revocar y crear un proceso de empaquetado por allowlist.

### 3.3 El baseline Git no está limpio

El árbol entregado parte de `main` con cambios en Credental y documentación, `docs/PLAN.md`
eliminado y el super plan nuevo sin seguimiento.

**Impacto:** un implementador no puede distinguir trabajo previo de trabajo de una fase nueva.
Se requiere congelar el diff y trabajar desde una base identificable.

### 3.4 OnStock y OnServe no son solamente “localhost”

Los entrypoints usan `Addr: ":<puerto>"`, que enlaza todas las interfaces. OnStock además
publicita acceso LAN. Ninguna de las dos APIs tiene autenticación productiva.

**Impacto:** la amenaza real incluye cualquier dispositivo de la red local. El plan anterior
decía mantener bind local por defecto, pero eso no describe el comportamiento actual.

### 3.5 La restricción de caja de OnStock no es auth

El frontend guarda el modo `admin/cajero` en `sessionStorage`; el proceso `-caja` reduce rutas,
pero no identifica al actor. Esto es una reducción útil de superficie, no autorización.

### 3.6 Tenant y plan son metadata mutable

`modules/tenant` define planes y roles, pero no aplica permisos. OnStock expone lectura y
actualización de tenant/plan mediante API sin auth.

**Impacto:** un cliente puede cambiar metadata o habilitar capacidades si el enforcement se
basa en ese endpoint y no en provisión confiable.

### 3.7 Confirmación de Vito controlada por cliente

La respuesta pendiente devuelve herramienta y argumentos. El frontend vuelve a enviarlos a
`POST /api/vito/confirm`, y el backend ejecuta `ConfirmAction(toolName, args)`.

**Impacto:** la confirmación de UI no demuestra consentimiento sobre una acción inmutable. Se
requiere estado pendiente server-side y token opaco de un solo uso.

### 3.8 Credental sigue siendo demo clínica

- login y sesión en navegador;
- hash SHA-256 implementado en frontend;
- usuario demo conocido;
- `companyId` proviene de la sesión manipulable;
- datos principales en `sessionStorage`;
- sync Firestore mezcla local/nube;
- varias superficies renderizan con `innerHTML`.

**Impacto:** no debe recibir expedientes reales hasta tener backend, auth, autorización,
migración, privacidad y recuperación.

### 3.9 Firebase está en un estado ambiguo

Las reglas permitían lectura/escritura general hasta el 2026-07-01. A la fecha de revisión la
condición ya expiró, por lo que el acceso queda denegado, pero el historial demuestra que el
modelo de seguridad era temporal y abierto.

**Impacto:** no basta “cerrar reglas”; primero debe decidirse si Firebase sigue siendo parte de
la arquitectura de Credental.

### 3.10 Numeraciones concurrentes

Se observaron patrones `MAX(id)+1` en ventas y órdenes de OnStock, y en sesiones, órdenes e
invoices de OnServe.

**Impacto:** colisiones y errores bajo concurrencia; debe resolverse junto con constraints,
idempotencia y máquinas de estado.

### 3.11 Billing no cubre todavía su propio runbook

El ledger crea suscripciones, cambia estado y calcula MRR. La documentación también describe
registrar pagos y avanzar `next_bill`, pero el código revisado no implementa ese ciclo completo.

### 3.12 “Fallback local” no está demostrado

El núcleo Vito tiene provider mock y provider compatible con API. No se encontró runtime de
modelo local, gestión de hardware ni benchmark.

**Impacto:** el mock sirve para tests/demo, pero no debe venderse como IA local.

## 4. Cambios de diseño introducidos en el plan v2

1. **Fase 0 de contención:** secretos, Git baseline, OnServe e inventario reproducible.
2. **Fase 1 solo de decisiones:** despliegue, identidad, PII, Firebase y contrato comercial.
3. **Microfases con presupuesto:** un objetivo, un producto, máximo 8 archivos y dos ciclos de
   reparación por defecto.
4. **Doble confirmación humana:** `APROBAR FASE X.Y` antes de editar y `ACEPTAR FASE X.Y`
   después de revisar evidencia.
5. **Estados discretos:** no se permiten porcentajes subjetivos.
6. **Bloqueo automático:** dos fallos de verificación obligan a detenerse y dividir o escalar.
7. **Evidencia durable:** comandos, resultados, riesgos y cierre por microfase.
8. **Ramas por producto:** OnStock, OnServe y Credental convergen antes de planes/Vito/ops.
9. **Producción por producto:** no existe un único estado global engañoso.
10. **Piloto obligatorio:** OnStock primero, OnServe después y Credental al final por riesgo de
    datos clínicos.

## 5. Veredicto

El plan anterior era una base buena de seguridad, pero incompleta como controlador de una
implementación extensa. La versión revisada convierte el roadmap en un protocolo verificable:
no permite autoavance, obliga a aislar el baseline y hace visible cuándo una fase está
bloqueada, pendiente de revisión o realmente aceptada.
