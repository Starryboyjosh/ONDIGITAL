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
- Hoy esto es **plan**, no código. No se implementa hasta cerrar la Fase 1 en detalle.

---

## Punto de partida (estado real, 2026-06)

| Pieza | Estado | Nota |
|-------|--------|------|
| **Credental** | Prototipo avanzado | UI clínica completa; datos en `sessionStorage` + Firebase opcional; auth demo. Ver [roadmap-y-pendientes.md](roadmap-y-pendientes.md). |
| **OnStock** | Mini-ERP funcional | Go + SQLite + UI embebida. La casa de estilo del repo. |
| **Pagina_Web_Original** | Sitio institucional | Estático; pendiente actualizar mensaje y hostear. |
| **Vito** | No existe | Se construye en la Fase 1. |
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

## Fase 1 — Vito, el asistente (se construye primero)

**Objetivo:** un asistente funcional que responde **sobre datos reales** del negocio, con la
experiencia white-label, listo para demostrar.

**Entregables**

- **1.1 Núcleo del servicio Vito.** Nuevo servicio en la casa de estilo de OnStock
  (Go single-binary + `//go:embed` UI vanilla + SQLite). Carpeta candidata: `vito/`.
- **1.2 Capa de proveedor abstracta.** Una sola interfaz interna (p. ej. `Provider.Ask(...)`).
  Primera implementación: **API de OpenCode** (gratuita, para la demo). El resto del sistema
  no sabe ni le importa quién responde.
- **1.3 UI de Vito (white-label).** Pantalla de consulta donde solo aparece "Vito": estados
  de "pensando", respuesta y **fuente de datos** citada. Cero menciones de proveedor.
- **1.4 Acceso a datos (lo que lo separa de un chatbot).** Vito puede invocar "herramientas"
  de solo lectura para consultar datos (ventas, inventario, clientes, citas). Se arranca con
  un conector de demostración alimentado con datos de muestra de OnStock.
- **1.5 Demo vertical.** Vito contestando preguntas reales sobre esos datos.

**Criterio de hecho:** preguntar *"¿qué productos están por agotarse?"* y que Vito responda
con datos reales, citando de dónde salieron, sin exponer ningún proveedor.

**Riesgos / cuidados:** inyección de prompts desde los datos; límites y costo de la API;
alucinaciones → respuestas **ancladas a datos** + cita de la fuente; nunca enviar datos
sensibles del cliente a un proveedor sin que el plan/infra lo permita.

---

## Fase 2 — Modularización y alimentar a Vito

**Objetivo:** convertir los sistemas que ya existen en **módulos** que Vito puede leer (y, más
adelante, accionar), manteniendo que cada suite **funcione con y sin Vito**.

**Entregables**

- **2.1 Contrato de módulo.** Definir la interfaz que cada módulo expone: qué datos entrega y
  qué acciones permite, tanto a la plataforma como a Vito.
- **2.2 OnStock como módulo.** Inventario, ventas y compras detrás del contrato; conector Vito
  primero de solo lectura, luego con acciones (p. ej. *"genera la orden de compra de lo que
  falta"*).
- **2.3 Credental como módulo.** Agenda, pacientes y facturación detrás del contrato. **Antes**
  hay que cerrar su capa de datos (hoy `sessionStorage`/Firebase — ver su roadmap) y después
  enchufar el conector de Vito.
- **2.4 "Con y sin Vito".** Cada suite corre sola (Starter/Business); Vito se enchufa encima
  (Enterprise AI) sin reescribir la app.
- **2.5 Biblioteca de módulos.** Catálogo de módulos reutilizables y el procedimiento para
  **ensamblar** el sistema de un cliente nuevo a partir de ellos.

**Criterio de hecho:** una misma instancia de Vito responde correctamente sobre **OnStock** y
**Credental**, y ambas apps siguen operando aunque Vito esté apagado.

**Riesgos / cuidados:** no romper el comportamiento offline/local de cada app; mantener el
aislamiento de datos entre módulos y entre clientes.

---

## Fase 3 — Sitio, hosting y presentación

**Objetivo:** actualizar la cara pública y montar la historia de infraestructura del modelo de
negocio, con una demo real para la escuela.

**Entregables**

- **3.1 Mejorar `Pagina_Web_Original`.** Reflejar el nuevo modelo (departamento tecnológico,
  Vito, planes **sin precios** en la web) y conservar *"Todo lo Vital es Digital."*
- **3.2 Hosting de demo.** Servir el sitio (y, si se puede, una demo de Vito) desde la
  **Raspberry Pi 5** para la presentación escolar.
- **3.3 Camino de infraestructura.** De la Raspberry a **mini-PCs**, hacia la "infraestructura
  administrada" del Plan Business (hosting, backups, monitoreo, SSL, alta disponibilidad).
- **3.4 Idea "espacio en la nube" para el cliente.** No solo hosting de base de datos: también
  un espacio de **comunicación interna** para los empleados del cliente. Opcional, según el
  cliente; se documenta como oferta, no como obligación.

**Criterio de hecho:** el sitio actualizado, servido desde la Raspberry Pi 5 y accesible
durante la presentación.

**Riesgos / cuidados:** exponer la Raspberry de forma segura; no prometer en la web infra que
todavía no se sostiene.

---

## Fase 4 — Adaptación general al Modelo de Negocio

**Objetivo:** endurecer lo que en las fases 1–3 fue demo, hasta que se pueda **vender y
operar** según los tres planes.

**Entregables**

- **4.1 Multi-tenant real:** aislamiento por cliente, modelo de usuarios y roles, backups,
  seguridad (sustituir las auth/almacenamiento demo).
- **4.2 Provisión de cliente nuevo:** cómo se arma una entrega Starter / Business /
  Enterprise AI a partir de la biblioteca de módulos.
- **4.3 Facturación de la suscripción:** cómo se cobra y administra el plan mensual.
- **4.4 Documentación viva** de la biblioteca de módulos y del procedimiento de entrega.

**Criterio de hecho:** poder tomar un cliente nuevo y entregarle un plan completo usando el
proceso documentado, no improvisado.

---

## Orden y dependencias

```
Fase 1 (Vito)  ──►  Fase 2 (modularizar + alimentar Vito)  ──►  Fase 4 (endurecer / vender)
                                   │
                                   └──►  Fase 3 (sitio + hosting)  ── puede correr en paralelo
```

- La **Fase 1** es el corazón y va primero.
- La **Fase 3** (sitio + Raspberry) puede adelantarse en paralelo porque la presentación
  escolar es un forzante de calendario.
- La **Fase 4** consolida todo lo anterior para que deje de ser demo.

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

## Pendientes de decisión (para cerrar antes/durante la Fase 1)

1. ¿Vito vive en su propia carpeta `vito/` como servicio Go, o se integra dentro de cada app?
2. ¿La demo conecta Vito a **OnStock** primero (recomendado: ya es Go + SQLite) o a Credental?
3. ¿Qué tan lejos llega la demo escolar: solo consultas de lectura, o ya alguna acción?
4. Capa de datos de Credental (bloquea su parte de la Fase 2): local, nube o híbrido.
