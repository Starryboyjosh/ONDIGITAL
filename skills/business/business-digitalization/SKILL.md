---
name: business-digitalization
description: "Design digitalization plans for ONDIGITAL microbusiness clients: business process mapping, SaaS/product selection, CRM, POS, inventory, booking, payments, reporting, website funnels, roles, KPIs, and pragmatic MVP roadmaps for Latin American small businesses."
---

# Business Digitalization

## Overview

Use this skill when ONDIGITAL is turning a real-world business process into software. The output should be a practical operating system for a small business, not a generic app idea.

Pair with `skills/product/landing-page/SKILL.md`, `skills/product/saas-product-ui/SKILL.md`, `skills/product/sales-pos-inventory/SKILL.md`, `skills/backend/backend-api-production/SKILL.md`, and `skills/security/app-security-review/SKILL.md`.

## Discovery Workflow

1. Identify the business type: clinic, retail, restaurant, service provider, distributor, school, workshop, agency, real estate, or logistics.
2. Map the money flow: lead, quote, sale, payment, delivery/service, follow-up, repeat purchase.
3. Map the data flow: customers, products/services, stock, appointments, invoices, payments, staff, suppliers, documents.
4. Identify current tools: notebooks, WhatsApp, Excel, POS, social networks, bank transfer, calendar, paper forms.
5. Locate operational pain: lost leads, no follow-up, stockouts, manual reporting, unpaid balances, duplicate records, no appointment control.
6. Decide the software category and MVP scope.

## Software Category Selection

| Business need | Software category | Typical modules |
|---|---|---|
| Leads and follow-up | CRM | contacts, pipeline, tasks, WhatsApp, reminders |
| Sales counter | POS | cart, payments, receipts, daily cash close |
| Stock control | Inventory software | products, suppliers, movements, reorder points |
| Appointments | Booking/control software | schedule, resources, reminders, status |
| Services/quotes | Quoting and billing | estimates, invoices, collections, PDFs |
| Multi-user operation | SaaS/dashboard | roles, tenants, reports, settings |
| Public acquisition | Website/landing | offer, SEO, WhatsApp CTA, forms, maps |
| Internal coordination | ERP-lite | sales, purchases, inventory, staff, reports |

## MVP Scope Rules

- Start with the workflow that makes or protects revenue.
- Add reporting only after the transactional data is reliable.
- Avoid building accounting, payroll, or tax compliance unless the scope is explicit.
- Use WhatsApp as a first-class channel for Latin American SMB workflows.
- Support export to CSV/PDF so the client can leave or audit the system.
- Keep admin settings minimal: business profile, users, catalog, payment methods, numbering.

## Product Blueprint Output

For every digitalization request, produce:

- Business description and target users.
- Software category name in English and Spanish.
- Workflow map from lead to payment/follow-up.
- Core entities and relationships.
- Modules for MVP, phase 2, and later.
- Roles and permissions.
- KPIs: daily sales, pending collections, lead conversion, stockouts, appointment attendance, repeat purchases.
- Risk list: privacy, payments, tenant isolation, data loss, operational adoption.
- Recommended stack: static demo, Firebase MVP, Supabase/Postgres, custom API, Flutter app, or hybrid.

## ONDIGITAL Positioning

Design for microempresas: owners need clarity, fast onboarding, editable catalogs, WhatsApp-friendly communication, simple reports, and low operational overhead. Avoid enterprise workflows unless the business already has the staff to operate them.
