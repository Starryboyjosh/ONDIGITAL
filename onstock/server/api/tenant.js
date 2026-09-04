// Traducción de internal/httpapi/{tenant,modules}.go.
import { writeJSON, writeErr, readJSON, comoMapaDeGo } from './helpers.js';
import { parsePlan } from '../store/tenant.js';

export function getTenant(a, ctx) {
  writeJSON(ctx.res, 200, a.st.publicTenantView());
}

export async function putTenant(a, ctx) {
  let body;
  try {
    body = await readJSON(ctx.req);
  } catch {
    writeJSON(ctx.res, 400, { error: 'JSON inválido' });
    return;
  }
  const patch = {};
  if (body.plan) {
    let p;
    try {
      p = parsePlan(body.plan);
    } catch (err) {
      writeJSON(ctx.res, 400, { error: err.message });
      return;
    }
    patch.plan = p;
  }
  if (String(body.tenant_id ?? '').trim() !== '') patch.tenant_id = String(body.tenant_id).trim();
  if (body.modules) patch.modules = body.modules;
  if (Object.keys(patch).length === 0) {
    writeJSON(ctx.res, 400, { error: 'nada que actualizar' });
    return;
  }
  try {
    a.st.setSettings(patch);
  } catch (err) {
    writeErr(ctx.res, err);
    return;
  }
  writeJSON(ctx.res, 200, a.st.publicTenantView());
}

export function getModules(a, ctx) {
  if (!a.catalog) {
    writeJSON(ctx.res, 200, comoMapaDeGo({ modules: [], count: 0 }));
    return;
  }
  const infos = a.catalog.infos();
  writeJSON(ctx.res, 200, comoMapaDeGo({ modules: infos, count: infos.length }));
}
