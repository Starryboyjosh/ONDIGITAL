# Facturación de la suscripción (Fase 4.3)

Modelo operativo de ONDIGITAL para cobrar el **plan mensual**. No es un gateway de pagos:
es el registro de qué cliente está en qué plan y cuándo toca cobrar.

Implementación: `modules/billing` (ledger JSON).

---

## Precios de lista (modelo-negocio)

| Plan | USD / mes | Código |
|------|-----------|--------|
| Starter | 99 | `starter` |
| Business | 149 | `business` |
| Enterprise AI | 199 | `enterprise_ai` |

Cobro en Honduras: **USD de referencia**, facturación en **HNL** al tipo de cambio del día
(acuerdo comercial; el ledger guarda `amount_usd`).

---

## Estados de suscripción

| Status | Significado |
|--------|-------------|
| `trial` | Prueba; cuenta en MRR blando |
| `active` | Al día |
| `past_due` | Atraso de pago |
| `canceled` | Baja |

---

## Ciclo de cobro (manual / semi-manual)

1. **Alta:** crear suscripción en ledger al provisionar (`billing.Ledger.Create`).
2. **Cada mes:** revisar `next_bill` ≤ hoy.
3. **Cobrar** (transferencia, depósito, pasarela futura).
4. **Registrar** pago en notas o sistema contable externo; avanzar `next_bill` +1 mes.
5. Si no paga: `past_due` → contactar; no apagar el software del cliente sin proceso humano
   (relación de acompañamiento, no SaaS self-serve puro).

---

## API de código (ops)

```go
led, _ := billing.OpenLedger("ops/subscriptions.json")
sub, _ := led.Create(tenant.Tenant{
    ID: "cliente-x", Name: "Cliente X", Plan: tenant.PlanBusiness,
    Modules: []string{"onstock"},
}, billing.StatusActive, "contrato 2026-07")

mrr := led.MonthlyRecurringUSD()
```

Archivo default sugerido (fuera del repo o gitignored): `ops/subscriptions.json`.

---

## Qué no incluye aún

- Cargo automático con tarjeta / ACH
- Factura electrónica SAR
- Portal de self-service del cliente

Esos entran cuando el volumen de clientes lo justifique; el ledger ya ordena la operación.

---

## Seguridad

- El ledger es **dato de ONDIGITAL**, no del tenant.
- No guardar tarjetas ni secretos de pago en el JSON.
- Permisos de archivo `0600` en el ledger.
