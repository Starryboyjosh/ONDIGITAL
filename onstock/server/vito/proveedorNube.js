// Traducción de modules/vito/opencode_provider.go.
// Motor en la nube: pasarela compatible con la API de chat completions. El
// nombre del proveedor solo aparece en los registros del servidor, nunca en la
// interfaz; para el usuario el motor es "en la nube" y el asistente es Vito.
import { truncateRunes } from './proveedorLocal.js';

export const BASE_URL_POR_DEFECTO = 'https://opencode.ai/zen/v1';
export const MODELO_POR_DEFECTO = 'big-pickle';

export class ProveedorNube {
  constructor({ apiKey, baseURL, model, timeoutMs = 90000 }) {
    this.apiKey = apiKey;
    this.baseURL = (baseURL ?? '').replace(/\/+$/, '') || BASE_URL_POR_DEFECTO;
    this.model = model || MODELO_POR_DEFECTO;
    this.timeoutMs = timeoutMs;
  }

  name() { return 'opencode'; }

  async ask(req) {
    if (!this.apiKey) throw new Error('vito: opencode api key missing');

    const messages = [];
    const sys = String(req.system ?? '').trim();
    if (sys !== '') messages.push({ role: 'system', content: sys });
    for (const m of req.messages) messages.push(toWireMessage(m));

    const body = { model: this.model, messages };
    if (req.tools.length > 0) {
      body.tools = req.tools.map((t) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters ?? { type: 'object', properties: {} },
        },
      }));
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), this.timeoutMs);
    let resp;
    let text;
    try {
      resp = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      text = await resp.text();
    } catch (err) {
      throw new Error(`vito: opencode request: ${err.message}`);
    } finally {
      clearTimeout(timer);
    }
    if (resp.status < 200 || resp.status >= 300) {
      throw new Error(`vito: opencode HTTP ${resp.status}: ${truncateRunes(text, 280)}`);
    }
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      throw new Error(`vito: opencode decode: ${err.message}`);
    }
    if (!parsed.choices || parsed.choices.length === 0) {
      throw new Error('vito: opencode empty choices');
    }

    const msg = parsed.choices[0].message ?? {};
    const out = { content: String(msg.content ?? '').trim(), tool_calls: [] };
    for (const tc of msg.tool_calls ?? []) {
      let args = {};
      const raw = String(tc.function?.arguments ?? '').trim();
      if (raw !== '') {
        try {
          args = JSON.parse(raw);
        } catch { /* argumentos ilegibles: se llama sin ellos */ }
      }
      out.tool_calls.push({ id: tc.id, name: tc.function?.name, arguments: args });
    }
    return out;
  }
}

function toWireMessage(m) {
  switch (m.role) {
    case 'tool':
      return { role: 'tool', content: m.content, name: m.name, tool_call_id: m.tool_call_id };
    case 'assistant': {
      const msg = { role: 'assistant', content: m.content };
      if (m.tool_calls && m.tool_calls.length > 0) {
        msg.tool_calls = m.tool_calls.map((tc) => ({
          id: tc.id,
          type: 'function',
          function: { name: tc.name, arguments: JSON.stringify(tc.arguments ?? {}) },
        }));
      }
      return msg;
    }
    case 'system':
      return { role: 'system', content: m.content };
    default:
      return { role: 'user', content: m.content };
  }
}
