// Traducción de internal/store/tenant.go + modules/tenant/plan.go.
import { rfc3339 } from '../lib/fechas.js';

export const PLAN_STARTER = 'starter';
export const PLAN_BUSINESS = 'business';
export const PLAN_ENTERPRISE_AI = 'enterprise_ai';

// parsePlan normaliza el nombre del plan; lanza si no lo reconoce.
export function parsePlan(s) {
  const p = String(s ?? '').trim().toLowerCase();
  switch (p) {
    case PLAN_STARTER:
    case PLAN_BUSINESS:
    case PLAN_ENTERPRISE_AI:
      return p;
    case 'enterprise':
    case 'ai':
    case 'enterprise-ai':
      return PLAN_ENTERPRISE_AI;
    case '':
      return PLAN_STARTER;
    default:
      throw new Error(`tenant: plan desconocido "${s}" (starter|business|enterprise_ai)`);
  }
}

export function planIncludesVito(p) { return p === PLAN_ENTERPRISE_AI; }
export function planIncludesManagedInfra(p) { return p === PLAN_BUSINESS || p === PLAN_ENTERPRISE_AI; }
export function planIncludesModuleLibrary(p) { return p === PLAN_BUSINESS || p === PLAN_ENTERPRISE_AI; }

export function planLabelES(p) {
  switch (p) {
    case PLAN_STARTER: return 'Starter';
    case PLAN_BUSINESS: return 'Business';
    case PLAN_ENTERPRISE_AI: return 'Enterprise AI';
    default: return p;
  }
}

export function planPriceUSDMonthly(p) {
  switch (p) {
    case PLAN_STARTER: return 19;
    case PLAN_BUSINESS: return 49;
    case PLAN_ENTERPRISE_AI: return 99;
    default: return 0;
  }
}

// newID arma un slug simple a partir del nombre (ops puede sobrescribirlo).
export function newID(name) {
  const s = String(name ?? '').trim().toLowerCase();
  let b = '';
  for (const r of s) {
    if ((r >= 'a' && r <= 'z') || (r >= '0' && r <= '9')) b += r;
    else if (r === ' ' || r === '-' || r === '_') b += '-';
  }
  let out = b.replace(/^-+|-+$/g, '');
  while (out.includes('--')) out = out.replaceAll('--', '-');
  return out === '' ? 'cliente' : out;
}

function firstNonEmpty(...vals) {
  for (const v of vals) {
    const s = String(v ?? '').trim();
    if (s !== '') return s;
  }
  return '';
}

// tenantFromSettings arma el tenant a partir de la configuración de OnStock.
export function tenantFromSettings(db) {
  const m = db.getSettings();
  let plan;
  try {
    plan = parsePlan(m.plan);
  } catch {
    // ParsePlan de Go devuelve ("", err) y el llamador ignora el error: el plan
    // queda en cadena vacía.
    plan = '';
  }
  let id = String(m.tenant_id ?? '').trim();
  const name = String(m.company_name ?? '').trim();
  if (id === '' && name !== '') id = newID(name);
  if (id === '') id = 'local';
  let mods = ['onstock'];
  const v = String(m.modules ?? '').trim();
  if (v !== '') {
    mods = v.split(',').map((p) => p.trim()).filter((p) => p !== '');
  }
  return {
    id,
    name,
    // `rtn,omitempty`
    ...(m.company_rtn ? { rtn: m.company_rtn } : {}),
    plan,
    modules: mods,
    locale: firstNonEmpty(m.locale, 'es-HN'),
    currency: firstNonEmpty(m.currency_symbol, 'L'),
    // `created_at,omitempty` sobre un time.Time NO se omite: omitempty solo
    // salta ceros de tipos básicos, y una struct nunca cuenta como vacía. El
    // original nunca llena este campo, así que siempre sale el cero del
    // calendario de Go. Es un valor sin sentido, pero está en la respuesta y
    // omitirlo cambiaría el contrato del endpoint.
    created_at: '0001-01-01T00:00:00Z',
  };
}

// ensureTenantDefaults escribe tenant_id/plan si faltan.
export function ensureTenantDefaults(db) {
  const m = db.getSettings();
  const patch = {};
  if (String(m.tenant_id ?? '').trim() === '') {
    patch.tenant_id = newID(firstNonEmpty(m.company_name, 'Mi Empresa'));
  }
  if (String(m.plan ?? '').trim() === '') patch.plan = PLAN_STARTER;
  if (String(m.modules ?? '').trim() === '') patch.modules = 'onstock';
  if (String(m.locale ?? '').trim() === '') patch.locale = 'es-HN';
  if (Object.keys(patch).length === 0) return;
  db.setSettings(patch);
}

// publicTenantView es la forma JSON de GET /api/tenant (sin secretos).
export function publicTenantView(db) {
  ensureTenantDefaults(db);
  const t = tenantFromSettings(db);
  return {
    tenant: t,
    plan_label: planLabelES(t.plan),
    price_usd_monthly: planPriceUSDMonthly(t.plan),
    vito_included: planIncludesVito(t.plan),
    managed_infra_included: planIncludesManagedInfra(t.plan),
    module_library_included: planIncludesModuleLibrary(t.plan),
    as_of: rfc3339(),
  };
}
