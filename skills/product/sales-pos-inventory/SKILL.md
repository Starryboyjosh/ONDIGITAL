---
name: sales-pos-inventory
description: Build or review sales, POS, quotation, collections, inventory, suppliers, purchase orders, stock movements, pricing, commissions, cash close, and WhatsApp follow-up modules for ONDIGITAL small-business management apps.
---

# Sales POS Inventory

## Overview

Use this skill for stores, restaurants, distributors, service businesses, and SaaS modules that manage sales or stock. It turns business transactions into reliable records and operational reports.

Pair with `skills/business/business-digitalization/SKILL.md`, `skills/product/saas-product-ui/SKILL.md`, `skills/data/database-system/SKILL.md`, and `skills/backend/backend-api-production/SKILL.md`.

## Module Map

| Module | Purpose | Core records |
|---|---|---|
| Catalog | What the business sells | products, services, variants, bundles, prices |
| POS/cart | Fast sale capture | sale, sale_items, payment_lines, receipt |
| Quotes | Pre-sale estimates | quote, quote_items, acceptance, expiry |
| Collections | Money owed and paid | invoice, payment, balance, method, receipt |
| Electronic billing | Fiscal invoice issuance and authorization | invoice_xml, CAI/CAEE, SAR status, printable representation |
| Inventory | Stock truth | stock_item, stock_movement, location, lot, expiry |
| Suppliers | Reordering | supplier, purchase_order, receiving |
| Cash close | Daily control | register_session, opening cash, sales, expenses, closing cash |
| CRM follow-up | Repeat revenue | customer, task, reminder, message template |

## Data Invariants

- A sale total must equal the sum of line totals minus discounts plus taxes/fees.
- Payment totals cannot silently exceed the outstanding balance unless overpayment behavior is explicit.
- Stock decreases only through recorded movements, not direct product quantity edits.
- Every stock movement has a reason: sale, return, adjustment, transfer, purchase receipt, waste, correction.
- Inventory items may need unit conversion: box, unit, kg, liter, service hour.
- Price changes should not rewrite historical sale line prices.
- Deleting financial records should be disabled or replaced with void/cancel states plus audit logs.

## Inventory Workflow

1. Define stockable versus non-stockable items.
2. Define locations and units of measure.
3. Record opening stock through stock movements.
4. For each sale, reserve or decrement stock.
5. Track reorder point, par level, supplier lead time, and last purchase price.
6. Generate purchase orders for below-reorder items.
7. Receive stock against purchase orders.
8. Produce low-stock, overstock, expiry, and slow-mover reports.

## POS Workflow

1. Search or scan item.
2. Add quantity, discount, tax, and salesperson if relevant.
3. Select customer optionally, or required for credit/collections.
4. Split payments across cash, card, transfer, credit, or mixed methods.
5. Issue receipt or PDF.
6. Create stock movements and payment records atomically.
7. Update daily cash-close totals.

## Honduras Electronic Billing Needs

When ONDIGITAL builds billing, POS, collections, or invoice modules for Honduras, design the system to be ready for electronic fiscal documents instead of treating PDF/print as the source of truth. Treat this as a compliance-sensitive area and verify current SAR rules for the client's taxpayer category before production release.

Use these product assumptions unless current SAR guidance says otherwise:

- Support the current CAI/physical-print workflow, but design toward CFE/electronic invoicing.
- Prefer an `autoimpresor` architecture for fiscal billing modules so the business can issue from its own authorized system instead of depending on a printing company.
- Track whether the client is registered/authorized in SAR Oficina Virtual for the relevant billing regime and autoimpresor/electronic issuance status.
- Generate and store the fiscal XML as the canonical invoice artifact. The printable PDF/table/receipt is only a derived representation of that XML.
- Model CAEE (`Codigo de Autorizacion de Emision Electronica`) separately from CAI. CAEE is per electronic fiscal document; CAI remains relevant for current authorized printed ranges.
- Include SAR validation/authorization state in the invoice lifecycle: draft, submitted, authorized, rejected, canceled/voided, printed/sent.
- Store every issued invoice and its XML, authorization metadata, printable representation, and audit trail for at least 5 years or the currently required legal retention period, whichever is stricter.
- Keep invoice numbering, fiscal document type, buyer RTN, seller RTN, ISV/tax breakdown, totals, currency, issue date/time, and authorization codes immutable after authorization.

Minimum records for Honduras-ready billing:

| Record | Required fields |
|---|---|
| `fiscal_profile` | RTN, legal name, address, billing regime, autoimpresor status, SAR credentials reference, certificate/reference status |
| `invoice` | fiscal document type, sequence, buyer data, totals, tax breakdown, status, created/authorized/sent timestamps |
| `invoice_xml` | XML payload, schema/version, hash, signature metadata, generated_at |
| `sar_authorization` | CAI or CAEE, range if applicable, SAR response, validation errors, expiration/validity |
| `invoice_archive` | retained copy pointers, PDF/print representation, delivery channel, retention_until |
| `invoice_audit_event` | actor, action, before/after status, timestamp, reason, IP/device where available |

## UI Requirements

- POS surface must be fast, keyboard-friendly, and touch-friendly.
- Inventory tables need filters for low stock, supplier, category, location, and expiry.
- Financial screens need clear paid, partial, overdue, canceled, and void states.
- Honduras billing screens must distinguish draft invoice, SAR-authorized invoice, rejected invoice, and printable receipt/PDF.
- Destructive actions must be explicit and reversible when possible.
- Reports should be exportable to CSV/PDF.

## Production Gates

Before real use, require backend/server-side enforcement for:

- Sale totals, payment status, and balances.
- Stock movement integrity.
- Fiscal XML generation, invoice totals, tax breakdown, numbering, authorization state, and archive retention.
- Tenant ownership.
- Role permissions for discounts, voids, price edits, inventory adjustments, and cash close.
- Audit logs for financial and inventory mutations.
