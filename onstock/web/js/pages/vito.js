// Vito — asistente white-label (solo se muestra "Vito", nunca el proveedor).
import { api } from '../api.js';
import { $, esc, toast, toastErr } from '../ui.js';

const SUGGESTIONS = [
  '¿Qué productos están por agotarse?',
  '¿Cuánto vendí esta semana y cuál fue mi margen?',
  '¿Qué producto se mueve más lento?',
  'Genera la orden de compra de lo que falta',
];

/** @type {{ role: string, content: string, citations?: any[], pending?: any }[]} */
let history = [];
let busy = false;
/** @type {any} */
let status = null;

export async function render(page) {
  history = [];
  busy = false;

  try {
    status = await api.get('/api/vito/status');
  } catch (err) {
    status = { assistant: 'Vito', enabled: false, ready: false, message: err.message };
  }

  const enabled = !!(status && status.enabled && status.ready);

  page.innerHTML = `
    <div class="page-head">
      <div class="vito-title-row">
        <span class="vito-avatar" aria-hidden="true">
          <svg viewBox="88 54 184 188" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="100" y="92" width="160" height="140" rx="16" fill="var(--primary)"/>
            <path d="M148 92 C148 62 212 62 212 92" stroke="var(--primary)" stroke-width="14" fill="none" stroke-linecap="round"/>
            <rect x="112" y="110" width="136" height="108" rx="12" fill="#0c2a1f"/>
            <ellipse cx="153" cy="154" rx="13" ry="13" fill="#f2c879"/>
            <ellipse cx="207" cy="154" rx="13" ry="13" fill="#f2c879"/>
            <path d="M140 178 Q180 200 220 178" stroke="#f2c879" stroke-width="5" fill="none" stroke-linecap="round"/>
          </svg>
        </span>
        <div>
          <h1>Vito</h1>
          <div class="sub">Asistente del negocio · inventario, ventas y compras</div>
        </div>
      </div>
      <div class="page-actions">
        <span class="vito-status ${enabled ? 'is-on' : 'is-off'}" id="vito-status-pill">
          ${enabled ? 'Activo' : 'No disponible'}
        </span>
      </div>
    </div>

    <div class="vito-layout">
      <div class="card vito-chat-card">
        <div class="vito-messages" id="vito-messages" role="log" aria-live="polite" aria-relevant="additions"></div>

        <div class="vito-suggestions" id="vito-suggestions">
          ${SUGGESTIONS.map((s, i) => `
            <button type="button" class="vito-chip" data-suggest="${i}" ${enabled ? '' : 'disabled'}>${esc(s)}</button>
          `).join('')}
        </div>

        <form class="vito-composer" id="vito-form">
          <textarea
            id="vito-input"
            rows="1"
            placeholder="${enabled ? 'Pregúntale a Vito sobre tu negocio…' : 'Vito no está activo en este momento'}"
            ${enabled ? '' : 'disabled'}
            maxlength="2000"
          ></textarea>
          <button type="submit" class="btn btn-primary" id="vito-send" ${enabled ? '' : 'disabled'}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
            Enviar
          </button>
        </form>
      </div>

      <aside class="card vito-side card-pad">
        <h2>Cómo usar a Vito</h2>
        <ul class="vito-help">
          <li>Pregunta en español sobre stock, ventas o rotación.</li>
          <li>Vito responde con datos de <b>este</b> OnStock y te dice la fuente.</li>
          <li>Si propone una acción (p. ej. crear una orden de compra), <b>tú confirmas</b> antes de que se ejecute.</li>
          <li>El sistema funciona igual si Vito está apagado.</li>
        </ul>
        ${status && status.message ? `<p class="vito-side-note muted">${esc(status.message)}</p>` : ''}
      </aside>
    </div>
  `;

  const messagesEl = $('#vito-messages', page);
  const form = $('#vito-form', page);
  const input = $('#vito-input', page);

  if (!enabled) {
    appendSystem(messagesEl,
      status?.message || 'Vito no está activo. Puedes seguir usando OnStock con normalidad.');
    return;
  }

  appendAssistant(messagesEl, {
    content: 'Hola, soy Vito. Puedo consultar tu inventario y ventas, y ayudarte a preparar órdenes de compra. ¿Qué necesitas?',
  });

  page.querySelectorAll('[data-suggest]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const i = +btn.dataset.suggest;
      input.value = SUGGESTIONS[i];
      input.focus();
      form.requestSubmit();
    });
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (busy) return;
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    await ask(messagesEl, form, input, text);
  });
}

async function ask(messagesEl, form, input, text) {
  busy = true;
  setComposerEnabled(form, false);
  appendUser(messagesEl, text);
  const thinking = appendThinking(messagesEl);

  // API history: prior user/assistant turns only (no system bubbles)
  const apiHistory = history
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role, content: m.content }));

  try {
    const res = await api.post('/api/vito/ask', {
      message: text,
      history: apiHistory,
    });
    thinking.remove();

    history.push({ role: 'user', content: text });
    history.push({
      role: 'assistant',
      content: res.reply || '',
      citations: res.citations || [],
      pending: res.pending_action || null,
    });

    appendAssistant(messagesEl, {
      content: res.reply || 'Sin respuesta.',
      citations: res.citations,
      pending: res.pending_action,
      onConfirm: res.pending_action
        ? () => confirmAction(messagesEl, form, res.pending_action)
        : null,
    });
  } catch (err) {
    thinking.remove();
    appendAssistant(messagesEl, {
      content: err.message || 'No pude completar la consulta.',
      error: true,
    });
    toastErr(err);
  } finally {
    busy = false;
    setComposerEnabled(form, true);
    input.focus();
  }
}

async function confirmAction(messagesEl, form, pending) {
  if (busy || !pending) return;
  busy = true;
  setComposerEnabled(form, false);
  const thinking = appendThinking(messagesEl, 'Aplicando acción…');
  try {
    const res = await api.post('/api/vito/confirm', {
      tool_name: pending.tool_name,
      arguments: pending.arguments || {},
    });
    thinking.remove();
    history.push({
      role: 'assistant',
      content: res.reply || 'Acción completada.',
      citations: res.citations || [],
    });
    appendAssistant(messagesEl, {
      content: res.reply || 'Acción completada.',
      citations: res.citations,
    });
    toast('Acción confirmada');
  } catch (err) {
    thinking.remove();
    appendAssistant(messagesEl, {
      content: err.message || 'No se pudo confirmar la acción.',
      error: true,
    });
    toastErr(err);
  } finally {
    busy = false;
    setComposerEnabled(form, true);
  }
}

function setComposerEnabled(form, on) {
  form.querySelectorAll('textarea, button').forEach((el) => {
    el.disabled = !on;
  });
}

function appendUser(root, text) {
  const el = document.createElement('div');
  el.className = 'vito-msg vito-msg-user';
  el.innerHTML = `<div class="vito-bubble">${esc(text)}</div>`;
  root.appendChild(el);
  root.scrollTop = root.scrollHeight;
}

function appendSystem(root, text) {
  const el = document.createElement('div');
  el.className = 'vito-msg vito-msg-system';
  el.innerHTML = `<div class="vito-bubble">${esc(text)}</div>`;
  root.appendChild(el);
}

function appendThinking(root, label = 'Vito está pensando…') {
  const el = document.createElement('div');
  el.className = 'vito-msg vito-msg-assistant';
  el.innerHTML = `
    <div class="vito-bubble vito-thinking">
      <span class="vito-dots" aria-hidden="true"><i></i><i></i><i></i></span>
      ${esc(label)}
    </div>`;
  root.appendChild(el);
  root.scrollTop = root.scrollHeight;
  return el;
}

function appendAssistant(root, { content, citations, pending, onConfirm, error }) {
  const el = document.createElement('div');
  el.className = 'vito-msg vito-msg-assistant' + (error ? ' is-error' : '');

  let cites = '';
  if (citations && citations.length) {
    cites = `<div class="vito-cites">
      <span class="vito-cites-label">Fuente</span>
      ${citations.map((c) => `
        <span class="vito-cite" title="${esc(c.source || '')}">
          ${esc(c.label || c.source || 'Datos del sistema')}
          ${c.detail ? `<em>${esc(c.detail)}</em>` : ''}
        </span>`).join('')}
    </div>`;
  }

  let action = '';
  if (pending && onConfirm) {
    action = `
      <div class="vito-action">
        <p>Vito propone una acción que puede modificar datos:</p>
        <strong>${esc(pending.summary || pending.tool_name)}</strong>
        <div class="vito-action-btns">
          <button type="button" class="btn btn-primary btn-sm" data-confirm>Confirmar</button>
          <button type="button" class="btn btn-outline btn-sm" data-dismiss>Ahora no</button>
        </div>
      </div>`;
  }

  el.innerHTML = `
    <div class="vito-bubble">
      <div class="vito-text">${formatReply(content)}</div>
      ${cites}
      ${action}
    </div>`;
  root.appendChild(el);
  root.scrollTop = root.scrollHeight;

  if (pending && onConfirm) {
    const confirmBtn = $('[data-confirm]', el);
    const dismissBtn = $('[data-dismiss]', el);
    confirmBtn?.addEventListener('click', () => {
      confirmBtn.disabled = true;
      dismissBtn.disabled = true;
      onConfirm();
    });
    dismissBtn?.addEventListener('click', () => {
      $('.vito-action', el)?.remove();
      toast('Acción cancelada', 'success');
    });
  }
}

function formatReply(text) {
  // Escape then light formatting: newlines → <br>, bullets stay readable
  return esc(text || '').replaceAll('\n', '<br>');
}
