// Traducción de modules/vito/service.go.
// Orquesta motor + herramientas. Es lo que llama la aplicación anfitriona.
import { Registry } from './registry.js';

export class Service {
  constructor(cfg, provider, tools) {
    if (!provider) throw new Error('vito: provider is required');
    this.provider = provider;
    this.tools = tools ?? new Registry();
    this.cfg = {
      enabled: !!cfg.enabled,
      locale: cfg.locale || 'es-HN',
      maxToolRounds: cfg.maxToolRounds > 0 ? cfg.maxToolRounds : 2,
      assistantName: cfg.assistantName || 'Vito',
    };
  }

  enabled() { return this.cfg.enabled; }

  // providerName es solo para los registros del servidor: nunca va en una respuesta.
  providerName() { return this.provider ? this.provider.name() : ''; }

  // ask atiende una consulta. Marca blanca: la respuesta nunca nombra al motor.
  async ask(req) {
    if (String(req.message ?? '').trim() === '') throw new Error('vito: message is required');
    if (!this.cfg.enabled) {
      return {
        reply: 'Vito no está activo en este momento. Puedes seguir usando el sistema con normalidad; cuando se active el plan con asistente, estaré aquí.',
        mock: true,
      };
    }

    const locale = req.locale || this.cfg.locale;
    const msgs = [...(req.history ?? [])];
    msgs.push({ role: 'user', content: String(req.message).trim(), created_at: new Date().toISOString() });

    const allCitations = [];
    let lastCalls = [];
    const mock = this.provider.name() === 'mock';

    for (let round = 0; round < this.cfg.maxToolRounds; round++) {
      let pres;
      try {
        pres = await this.provider.ask({
          system: systemPrompt(this.cfg.assistantName, locale),
          messages: msgs,
          tools: this.tools.list(),
          locale,
        });
      } catch (err) {
        throw new Error(`vito: provider: ${err.message}`);
      }

      const calls = pres.tool_calls ?? [];
      // Respuesta final (sin herramientas).
      if (calls.length === 0) {
        let reply = String(pres.content ?? '').trim();
        if (reply === '') reply = synthesizeFromTools(msgs);
        return respuesta(this.sanitizeReply(reply), allCitations, lastCalls, mock);
      }

      lastCalls = calls;

      // Historial compatible: el turno del asistente con tool_calls va ANTES de
      // los resultados de las herramientas.
      msgs.push({
        role: 'assistant',
        content: String(pres.content ?? '').trim(),
        tool_calls: [...calls],
        created_at: new Date().toISOString(),
      });

      for (const call of calls) {
        const meta = this.tools.get(call.name);
        if (meta && !meta.read_only) {
          const out = respuesta(
            'Encontré una acción que puede modificar datos. Confírmala para continuar.',
            allCitations, lastCalls, mock,
          );
          out.pending_action = {
            tool_name: call.name,
            summary: meta.description,
            ...(call.arguments ? { arguments: call.arguments } : {}),
          };
          return out;
        }

        const { res, err } = await this.tools.run(call);
        let result = res;
        if (err && !result.content) {
          result = {
            call_id: call.id, name: call.name, ok: false,
            error: err.message, content: JSON.stringify({ error: err.message }),
          };
        }
        if (result.citations) allCitations.push(...result.citations);
        msgs.push({
          role: 'tool',
          name: call.name,
          tool_call_id: result.call_id || call.id,
          content: result.content,
          created_at: new Date().toISOString(),
        });
      }
    }

    // Se agotaron las rondas tras usar herramientas: responder con sus datos.
    return respuesta(this.sanitizeReply(synthesizeFromTools(msgs)), allCitations, lastCalls, mock);
  }

  // confirmAction ejecuta una herramienta de escritura después de que el
  // usuario la confirma en la interfaz.
  async confirmAction(toolName, args) {
    if (!this.cfg.enabled) {
      return { reply: 'Vito no está activo en este momento.', mock: true };
    }
    const name = String(toolName ?? '').trim();
    if (name === '') throw new Error('vito: tool_name is required');
    const meta = this.tools.get(name);
    if (!meta) throw new Error(`vito: unknown tool "${name}"`);
    if (meta.read_only) throw new Error(`vito: tool "${name}" is read-only; use Ask`);
    const mock = this.provider.name() === 'mock';
    const { res, err } = await this.tools.run({ id: 'confirm_1', name, arguments: args });
    if (err && !res.ok) {
      return {
        reply: `No pude completar la acción: ${res.error || err.message}`,
        mock,
      };
    }
    let reply = this.sanitizeReply(preferSummary(res.content));
    if (reply === '') reply = 'Acción completada.';
    const out = { reply };
    if (res.citations && res.citations.length) out.citations = res.citations;
    out.tool_calls = [{ id: 'confirm_1', name, ...(args ? { arguments: args } : {}) }];
    out.mock = mock;
    if (!mock) delete out.mock; // `mock,omitempty`
    return out;
  }

  // sanitizeReply es la última línea de la marca blanca: si el motor ignora el
  // prompt y se presenta por su nombre, ese nombre no llega a pantalla.
  //
  // Cubre familias enteras (gpt-4, gpt-5, gpt) en lugar de una versión concreta,
  // porque el modelo de mañana no está en ninguna lista de hoy. "Llama" queda
  // fuera a propósito: en español es un verbo corriente ("se llama Ana") y
  // sustituirlo rompería el texto en vez de protegerlo.
  sanitizeReply(reply) {
    let out = String(reply ?? '').replace(BRAND_GUARD, 'Vito');
    // El motor activo puede llamarse de cualquier forma, así que su nombre se
    // tapa además del catálogo fijo.
    const name = String(this.provider?.name() ?? '').trim();
    if (name !== '') {
      out = out.replace(new RegExp(`\\b${escapeRegExp(name)}\\b`, 'gi'), 'Vito');
    }
    return out;
  }
}

const BRAND_GUARD = /\b(claude|chatgpt|openai|opencode|anthropic|gpt-?[0-9]+|gpt|gemini|nemotron|deepseek|mistral|qwen|copilot|grok)\b/gi;

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// respuesta arma el AskResponse respetando los `omitempty` del original.
function respuesta(reply, citations, toolCalls, mock) {
  const out = { reply };
  const cites = dedupeCitations(citations);
  if (cites.length) out.citations = cites;
  if (toolCalls && toolCalls.length) out.tool_calls = toolCalls;
  if (mock) out.mock = true;
  return out;
}

export function systemPrompt(name, locale) {
  return `Eres ${name}, el asistente empresarial del negocio. Respondes en español (locale ${locale}). `
    + 'Usas solo datos de las herramientas. Nunca menciones proveedores de IA, modelos ni APIs externas. '
    + 'Si no hay datos, dilo con claridad. Cita en qué parte del sistema te basaste cuando sea posible.';
}

function synthesizeFromTools(msgs) {
  const parts = [];
  for (const m of msgs) {
    if (m.role === 'tool' && String(m.content ?? '').trim() !== '') parts.push(preferSummary(m.content));
  }
  if (parts.length === 0) {
    return 'No pude obtener datos del negocio para responder. Intenta de nuevo o revisa que las herramientas estén conectadas.';
  }
  if (parts.length === 1) {
    const last = parts[0];
    if (last.startsWith('Según los datos')) return last;
    return `Según los datos del sistema:\n\n${last}`;
  }
  let b = 'Según los datos del sistema:\n';
  parts.forEach((p, i) => { b += `\n—— ${i + 1} ——\n${p}\n`; });
  return b.trim();
}

function dedupeCitations(input) {
  if (!input || input.length === 0) return [];
  const seen = new Set();
  const out = [];
  for (const c of input) {
    const key = `${c.source}|${c.label}|${c.detail ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }
  return out;
}

export function preferSummary(content) {
  const s = String(content ?? '').trim();
  if (s === '') return '';
  try {
    const obj = JSON.parse(s);
    if (obj && typeof obj.summary === 'string' && obj.summary.trim() !== '') return obj.summary;
  } catch { /* no era JSON: se devuelve tal cual */ }
  return s;
}
