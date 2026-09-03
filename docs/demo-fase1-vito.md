# Demo Fase 1 — Vito + OnStock

> **Fase 1 cerrada.** Checklist para la demo escolar / vertical (criterio de hecho del plan maestro).

## Preparar datos

```bash
cd onstock
make seed-demo-force   # carga "Abarrotes El Progreso" (reemplaza productos existentes)
make dev               # http://localhost:8080
```

Opcional (motor en la nube):

```bash
cp .env.example .env
# VITO_PROVIDER=nube
# VITO_API_KEY=...
```

Sin clave, Vito corre en **modo local** anclado a tools reales (sigue citando
inventario/ventas). Las variables no nombran al proveedor a propósito: el motor
es intercambiable y este mensaje se lee en la misma ventana que mira el dueño
del negocio.

## Abrir

1. OnStock: `http://localhost:8080`
2. Vito: `http://localhost:8080/#/vito`
3. Comprobar pill **Activo**

## Guion de preguntas (canónicas)

| # | Pregunta | Qué debe pasar |
|---|----------|----------------|
| 1 | ¿Qué productos están por agotarse? | Lista con stock/mínimo (Leche en polvo, Café, UHT, Papel higiénico, Chocolate…). **Fuente:** Inventario · stock bajo |
| 2 | ¿Cuánto vendí esta semana y cuál fue mi margen? | Ventas netas + margen del periodo. **Fuente:** Reportes · estado de resultados |
| 3 | ¿Qué producto se mueve más lento? | Sardinas / ambientador / gomitas u otros de baja rotación. **Fuente:** rotación lenta |
| 4 | Genera la orden de compra de lo que falta | Aparece **Confirmar** (no crea OC hasta confirmar) |
| 5 | Confirmar acción | OC creada (`OC-#####`), visible en **Compras** |

## Criterio de hecho (Fase 1)

> Preguntar *«¿qué productos están por agotarse?»* y que Vito responda con **datos reales**, citando de dónde salieron, **sin** exponer proveedor de IA.

- [ ] Respuesta con nombres de productos del seed
- [ ] Citation `Inventario · stock bajo` (o equivalente en UI)
- [ ] En la UI solo se lee **Vito** (nunca Claude / ChatGPT / OpenCode)
- [ ] Con `VITO_ENABLED=0` OnStock sigue usable; Vito muestra “no disponible”

## Datos del seed (resumen)

- **Empresa:** Abarrotes El Progreso (San Pedro Sula)
- **~20 productos** · 4 categorías · 2 proveedores
- **~16 ventas** repartidas en ~25 días
- **4 gastos** del mes
- Varios ítems en **stock bajo** a propósito

## Comandos de verificación

```bash
cd onstock && make test
cd onstock && go run . -seed-demo-force -no-open
# API smoke (servidor en marcha):
curl -sS -X POST http://localhost:8080/api/vito/ask \
  -H 'Content-Type: application/json' \
  -d '{"message":"¿qué productos están por agotarse?"}'
```

## Credental (Fase 2.3)

```bash
cd credental && python3 -m http.server 8090
# http://localhost:8090/vito.html
```

Preguntas: citas hoy/mañana · saldos pendientes · resumen de un paciente.  
Si no hay datos, la página carga demo **Clínica Sonrisa HN** sola.
