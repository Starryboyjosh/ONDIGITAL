# ONDIGITAL — Plan Maestro

> El plan más largo desde la creación de la micro.
>
> **Norte:** cumplir el [Modelo de Negocio](modelo-negocio.md) — convertirnos en el
> departamento tecnológico del cliente, con **Vito** como pieza de inteligencia.

---

## Cómo leer este plan

- Las fases están ordenadas por **dependencia**, no por calendario fijo.
- Cada fase declara: **objetivo**, **entregables**, **criterio de "hecho"** y **riesgos**.
- Cuando una fase pase a implementación, se trabaja con la disciplina de
  `PLAN.md` vivo + `last_session.md` (handoff entre sesiones) y se verifica antes de avanzar.
- **Fase 1 está implementada y cerrada.** Las siguientes fases siguen el mismo proceso.

---

## Punto de partida (estado real, 2026-06)

| Pieza | Estado | Nota |
|-------|--------|------|
| **Credental** | Prototipo avanzado | UI clínica completa; datos en `sessionStorage` + Firebase opcional; auth demo. Esqueleto Vito local (`credental/vito.html`). |
| **OnStock** | Mini-ERP + Vito | Go + SQLite + UI embebida. Vito montado (tools, API, UI, seed demo). |
| **Pagina_Web_Original** | Sitio institucional | Estático; planes/Vito en landing. Hosting demo (Fase 3) aplazado. |
| **Vito** | **Fase 1 hecha** | Módulo `modules/vito` + host OnStock completo + esqueleto Credental. Ver abajo. |
| **OnStudio** | Eliminado | Pivote: ya no construimos páginas con IA. |

---

## Principios que no se negocian (transversales a todas las fases)

1. **Vito es white-label.** En la UI solo existe "Vito". Nunca aparece "Claude", "Nemotron",
   "ChatGPT", "OpenCode" ni ningún proveedor. El usuario pregunta a Vito; Vito responde.
2. **El proveedor es intercambiable.** Detrás de Vito hay una capa de proveedor abstracta:
   hoy la API gratuita de OpenCode (para la demo), mañana otro proveedor o un **modelo local
   en el servidor del cliente**. Cambiar el motor no cambia la experiencia.
3. **Llaves server-side, siempre.** Las API keys viven en `.env` (git-ignored), nunca en el
   navegador, fixtures ni commits.
4. **Multi-tenant con aislamiento.** Los datos de cada cliente están separados; Vito solo ve
   los del negocio al que sirve.
5. **Todo nace como módulo reutilizable.** Bespoke por fuera, biblioteca de módulos por dentro.
6. **Local-first donde se pueda.** Debe poder correr en una Raspberry Pi 5, un mini-PC o el
   servidor del propio cliente, no solo en la nube.
7. **Español en la UI y convenciones de Honduras** (HNL, es-HN, RTN/DNI, +504) donde aplique.
8. **Vito es opcional.** Cada suite funciona sola (Starter/Business) y se potencia con Vito
   (Enterprise AI). El producto nunca depende de la IA para operar.

---

## Fase 1 — Vito, el asistente ✅ CERRADA (2026-07)

**Objetivo:** un asistente funcional que responde **sobre datos reales** del negocio, con la
experiencia white-label, listo para demostrar.

**Estado:** hecho. Criterio de hecho validado en OnStock con seed demo + mock/OpenCode.

### Entregables (cerrados)

| # | Entregable | Dónde |
|---|------------|--------|
| 1.1 | Núcleo módulo Go | `modules/vito/` (`ondigital.hn/vito`) |
| 1.2 | Provider abstracto + OpenCode + env | `modules/vito` + `onstock/.env.example` |
| 1.3 | UI white-label OnStock | `onstock/web` → `#/vito` |
| 1.4 | Tools OnStock (read + acción OC) | `onstock/internal/vitohost` |
| 1.5 | Demo vertical + datos | `make seed-demo-force`, [demo-fase1-vito.md](demo-fase1-vito.md) |
| 1.6 | Contrato reuso + esqueleto Credental | [modules/vito/README.md](../modules/vito/README.md), `credental/js/vito/`, `credental/vito.html` |

**Criterio de hecho:** preguntar *"¿qué productos están por agotarse?"* → respuesta con productos
reales del SQLite, citation `Inventario · stock bajo`, UI solo dice **Vito**. ✅

**Cómo repetir la demo:**

```bash
cd onstock && make seed-demo-force && make dev
# http://localhost:8080/#/vito
```

**Riesgos que siguen vigentes (Fase 2+):** inyección vía datos; costo API; no filtrar PII a
proveedores sin política de plan; Credental aún no es backend híbrido completo.

---

## Fase 2 — Modularización y alimentar a Vito ✅ CERRADA (2026-07)

**Objetivo:** convertir los sistemas que ya existen en **módulos** que Vito puede leer (y, más
adelante, accionar), manteniendo que cada suite **funcione con y sin Vito**.

### Entregables (cerrados)

| # | Entregable | Dónde |
|---|------------|--------|
| 2.1 | Contrato de módulo | `modules/modkit` + [contrato-modulo.md](contrato-modulo.md) |
| 2.2 | OnStock como módulo | `vitohost.OnStockModule` + `GET /api/modules` |
| 2.3 | Credental como módulo | `credental/js/modkit.js` + `vito/module.js` + seed + `vito.html` |
| 2.4 | Con y sin Vito | [checklist-con-sin-vito.md](checklist-con-sin-vito.md) (verificado) |
| 2.5 | Biblioteca de módulos | [biblioteca-modulos.md](biblioteca-modulos.md) + catálogos runtime |

**Criterio de hecho:** Vito responde con datos reales en **OnStock** y **Credental**; ambas
suites operan con Vito apagado/sin panel. ✅

**Notas:** Credental sigue local-first (Firebase opcional). Un backend Go unificado multi-módulo
puede endurecerse en Fase 4. Multi-tenant de producción y facturación de planes → Fase 4.

**Riesgos que siguen:** aislamiento tenant real; no romper offline; PII hacia providers de IA.

---

## Fase 3 — Sitio, hosting y presentación ⏸ APLAZADA

**Objetivo:** actualizar la cara pública y montar la historia de infraestructura del modelo de
negocio, con una demo real para la escuela.

**Decisión (2026-07):** se **salta por ahora**.
- Landing (`Pagina_Web_Original`) ya está alineada al modelo (Vito, planes, mensaje).
- Hosting en Raspberry / mini-PC / demo pública **no es prioritario** en este momento.
- Se puede retomar cuando haga falta presentación escolar o infra administrada de Business.

**Entregables (pendientes al reabrir)**

- **3.1** Pulir sitio si el mensaje de negocio cambia otra vez.
- **3.2** Hosting de demo (p. ej. Raspberry Pi 5).
- **3.3** Camino de infraestructura (Pi → mini-PC → Business administrado).
- **3.4** Idea “espacio en la nube” / comunicación interna (oferta opcional).

**Criterio de hecho (cuando se reactive):** sitio actualizado y accesible en el entorno de demo
acordado (no bloquea Fase 4 de producto).

---

## Fase 4 — Adaptación general al Modelo de Negocio 🔄 EN CURSO

**Objetivo:** endurecer lo que en las fases 1–3 fue demo, hasta que se pueda **vender y
operar** según los tres planes.

**PLAN vivo:** [PLAN.md](PLAN.md)

**Entregables**

- **4.1 Multi-tenant / seguridad base.** 🔄 Modelo `modules/tenant` + OnStock `GET/PUT /api/tenant`
  + backups (`make backup`). Auth multi-usuario y storage clínico durable **siguen abiertos**
  (ver [seguridad-demo-prod.md](seguridad-demo-prod.md)).
- **4.2 Provisión de cliente nuevo.** ✅ [provision-cliente.md](provision-cliente.md)
- **4.3 Facturación de la suscripción.** ✅ Ledger `modules/billing` + [facturacion-suscripcion.md](facturacion-suscripcion.md)
  (sin pasarela de pago todavía).
- **4.4 Documentación viva.** ✅ Biblioteca + provisión + facturación enlazadas.

**Criterio de hecho (parcial):** hay proceso documentado de entrega por plan + identidad de
tenant/plan en OnStock + respaldo + ledger ops. Falta auth/tenant enforcement de producción.

**Cómo probar rápido:**

```bash
cd onstock
make backup
# GET http://localhost:8080/api/tenant
# PUT /api/tenant {"plan":"enterprise_ai"}
```

---

## Orden y dependencias

```
Fase 1 (Vito)  ──►  Fase 2 (modularizar + alimentar Vito)  ──►  Fase 4 (endurecer / vender)
                                   │
                                   └──►  Fase 3 (sitio + hosting)  ── puede correr en paralelo
```

- La **Fase 1** (Vito) y la **Fase 2** (módulos) están **cerradas**.
- La **Fase 3** (sitio + hosting) está **aplazada**: landing hecha; hosting no prioritario.
- La **Fase 4** (endurecer / vender) es el siguiente bloque de producto cuando se retome.

---

## Cómo ejecutamos (disciplina de trabajo)

- Una fase a la vez, en **entregables pequeños y verificables**.
- Al implementar: `PLAN.md` vivo junto al trabajo (marcado en el mismo turno en que se
  completa cada ítem) + `last_session.md` antes de quedarse sin contexto; ambos se borran al
  terminar la fase. El registro durable vive en estos docs y en el código.
- **Verificación:** `cd onstock && make test` para cambios en Go / API embebida; smoke test
  con servidor estático para cambios de UI/web; reportar el comando exacto si algo no se pudo
  correr.

---

## Decisiones cerradas (Fase 1)

1. **Forma de Vito:** módulo reutilizable integrado en cada app (no un servicio monolito aparte).
2. **Demo de datos:** OnStock y Credental; ancla completa en **OnStock** (Go + SQLite); Credental con esqueleto local.
3. **Alcance demo escolar:** lectura **y** acciones (con confirmación en UI) en OnStock.
4. **Credental datos:** híbrido (local + nube); capa completa queda en **Fase 2**.

**Registro durable de la Fase 1:** este archivo + código + [modules/vito/README.md](../modules/vito/README.md) + [demo-fase1-vito.md](demo-fase1-vito.md).  
El `PLAN.md` vivo de la fase se eliminó al cerrar.
