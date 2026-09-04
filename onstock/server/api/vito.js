// Traducción de internal/httpapi/vito.go.
import { writeJSON, readJSON } from './helpers.js';

// El estado que ve la interfaz nunca incluye el nombre del proveedor.
export function getVitoStatus(a, ctx) {
  if (!a.vito) {
    writeJSON(ctx.res, 200, {
      assistant: 'Vito',
      enabled: false,
      ready: false,
      message: 'Vito no está configurado en este servidor.',
    });
    return;
  }
  const enabled = a.vito.enabled();
  const out = { assistant: 'Vito', enabled, ready: enabled };
  // `message,omitempty`
  if (!enabled) out.message = 'Vito está desactivado. El sistema funciona con normalidad sin el asistente.';
  writeJSON(ctx.res, 200, out);
}

export async function postVitoAsk(a, ctx) {
  if (!a.vito) {
    writeJSON(ctx.res, 503, { error: 'Vito no está disponible en este servidor.' });
    return;
  }
  let body;
  try {
    body = await readJSON(ctx.req);
  } catch {
    writeJSON(ctx.res, 400, { error: 'JSON inválido' });
    return;
  }
  if (String(body.message ?? '').trim() === '') {
    writeJSON(ctx.res, 400, { error: 'El mensaje es obligatorio' });
    return;
  }
  let res;
  try {
    res = await a.vito.ask({
      message: body.message,
      history: body.history ?? [],
      locale: body.locale ?? '',
    });
  } catch (err) {
    // La causa real se registra solo del lado del servidor (puede nombrar al
    // proveedor); a la interfaz nunca se le manda ese nombre.
    console.log(`vito ask: ${err.message}`);
    writeJSON(ctx.res, 502, {
      error: 'No pude procesar tu consulta ahora. Intenta de nuevo en un momento.',
    });
    return;
  }
  writeJSON(ctx.res, 200, res);
}

export async function postVitoConfirm(a, ctx) {
  if (!a.vito) {
    writeJSON(ctx.res, 503, { error: 'Vito no está disponible en este servidor.' });
    return;
  }
  let body;
  try {
    body = await readJSON(ctx.req);
  } catch {
    writeJSON(ctx.res, 400, { error: 'JSON inválido' });
    return;
  }
  if (String(body.tool_name ?? '').trim() === '') {
    writeJSON(ctx.res, 400, { error: 'tool_name es obligatorio' });
    return;
  }
  let res;
  try {
    res = await a.vito.confirmAction(body.tool_name, body.arguments);
  } catch {
    writeJSON(ctx.res, 400, {
      error: 'No pude confirmar esa acción. Revisa los datos e intenta de nuevo.',
    });
    return;
  }
  writeJSON(ctx.res, 200, res);
}
