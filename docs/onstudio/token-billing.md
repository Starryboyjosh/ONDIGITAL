# OnStudio — Facturación por Tokens

> Cómo OnStudio cobra **por la cantidad de tokens** que consumió cada generación.
> Diseño para Phase 4. Las tarifas concretas son **configurables** (no se
> hardcodean) porque cambian seguido y dependen del proveedor/modelo.

## Modelo de cobro

```
provider_cost = costo real de la generación (USD)
price (cobro) = provider_cost × margin(provider, model)
```

- **`provider_cost`** = costo del trabajo según el proveedor. Dos fuentes, en
  orden de preferencia:
  1. El **costo reportado** por OpenCode en el mensaje del asistente (cuando el
     proveedor lo entrega). Es lo más exacto.
  2. Si no hay costo reportado: **calcularlo** con tokens × tarifa del registro de
     precios (`pricing`), usando input/output (y cache si aplica).
- **`margin`** = multiplicador de negocio por modelo (p.ej. `2.0` = 2×). Vive en
  `config.json` y se siembra en la tabla `pricing`. **El usuario define los
  valores reales** (placeholders en el ejemplo).
- **Moneda:** se calcula en USD y se **presenta también en HNL** (es-HN) usando un
  tipo de cambio configurable. La conversión es solo de presentación; el registro
  base queda en USD para fidelidad con el proveedor.

## De dónde salen los tokens

OnStudio lee el uso del **mensaje del asistente** de OpenCode al cerrar el turno
(ver [`opencode-integration.md`](opencode-integration.md)). Campos previstos:

| Campo OnStudio | Significado |
| --- | --- |
| `input_tokens` | tokens de entrada (prompt) |
| `output_tokens` | tokens de salida (respuesta) |
| `cache_read_tokens` | tokens leídos de cache (si el proveedor los reporta) |
| `cache_write_tokens` | tokens escritos a cache |
| `provider_cost` | costo USD reportado (o calculado) |

> ⚠️ Los nombres exactos en la respuesta de OpenCode deben **verificarse contra
> `/doc`** antes de implementar. Esta tabla es el destino normalizado en SQLite.

## Tabla de precios (`pricing`)

Sembrada desde `config.json`. Estructura (ver `architecture.md`):

```jsonc
// fragmento de config.json (valores = PLACEHOLDERS que el usuario reemplaza)
{
  "pricing": {
    "currency": "USD",
    "hnl_rate": 24.6,                     // USD→HNL solo para mostrar (ajustable)
    "default_margin": 2.0,
    "models": [
      {
        "provider": "anthropic",
        "model": "claude-sonnet-4-5",
        "input_per_mtok": 0.0,           // ← completar con tarifa real (USD/1M tok)
        "output_per_mtok": 0.0,          // ← completar con tarifa real
        "margin": 2.0
      },
      {
        "provider": "openai",
        "model": "gpt-...",
        "input_per_mtok": 0.0,
        "output_per_mtok": 0.0,
        "margin": 2.0
      }
    ]
  }
}
```

### Recomendación: costo base desde el registro de modelos

OpenCode resuelve modelos vía un **registro de precios** (Models.dev). Para no
mantener tarifas a mano, la implementación puede:

1. Preferir el **costo reportado** por el proveedor en cada turno.
2. Si falta, leer la tarifa del **registro** que ya usa OpenCode.
3. Permitir **override manual** en `config.json` (`*_per_mtok`) cuando el operador
   quiera fijar precios o cubrir un proveedor sin tarifa pública.

Así el cobro es exacto y de bajo mantenimiento, y el margen queda siempre bajo
control del negocio.

## Cálculo, paso a paso

```
1. Al terminar el turno, leer uso del mensaje assistant (tokens [+ costo]).
2. provider_cost:
     si OpenCode reporta costo → usarlo.
     si no → (input_tokens/1e6)*input_per_mtok + (output_tokens/1e6)*output_per_mtok
             (+ términos de cache si el modelo los tarifica).
3. m = margin(provider, model)  (o default_margin).
4. price = provider_cost * m.
5. persistir en usage (provider_cost, price, tokens, currency=USD).
6. presentación: price_hnl = price * hnl_rate.
```

## Reglas de negocio

- **Sin consumo medible, sin cobro.** Si la sesión falla antes de producir
  tokens, no se factura.
- **Consumo parcial:** si falla a mitad pero ya hubo tokens, se factura lo
  consumido y el job se marca `error` con nota. *(Política a confirmar con el
  usuario; por defecto: cobrar lo realmente consumido.)*
- **Idempotencia:** una captura por (sesión, turno). Reintentos no duplican.
- **Transparencia:** la UI muestra el desglose (tokens in/out/cache,
  provider_cost, margen, price en USD y HNL) antes de la descarga.
- **Auditoría:** `usage` es la fuente de verdad; nunca se recalcula el cobro a
  partir de datos volátiles.

## Presentación al cliente (UI)

```
Sitio: Panadería La Espiga
Modelo: anthropic / claude-sonnet-4-5
Tokens: entrada 18,420 · salida 7,930 · cache 12,000
Costo proveedor: USD 0.42
Margen: 2.0×
Total: USD 0.84  ·  L 20.66
```

(Valores ilustrativos.)

## Preguntas abiertas para el usuario (Phase 4)

1. **Tarifas y margen reales** por modelo (hoy son placeholders en el ejemplo).
2. **Tipo de cambio** USD→HNL: ¿fijo configurable o fuente externa?
3. **Política de consumo parcial** ante error (¿cobrar o absorber?).
4. ¿Mínimo de cobro por sitio, o estrictamente por tokens?
5. ¿Se emite comprobante fiscal (RTN/CAI/ISV) o es cobro de servicio simple?
