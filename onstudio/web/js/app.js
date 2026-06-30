// OnStudio — UI del generador (Phase 5).
// SPA vanilla: formulario de spec + selector de modelo → POST /api/jobs, lista de
// trabajos con sondeo de estado, factura USD/HNL, vista previa y descarga .zip.
// Convención de marca: tema blanco por defecto, colores de empresa opt-in y
// persistente. Todo dato dinámico se inyecta con textContent (nunca innerHTML).
"use strict";

const $ = (id) => document.getElementById(id);

// ── Helpers de red ──────────────────────────────────────────────────────────
async function getJSON(path) {
  const res = await fetch(path, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
  return res.json();
}

async function postJSON(path, body) {
  const opt = { method: "POST", headers: { Accept: "application/json" } };
  if (body !== null && body !== undefined) {
    opt.headers["Content-Type"] = "application/json";
    opt.body = JSON.stringify(body);
  }
  const res = await fetch(path, opt);
  let data = null;
  try { data = await res.json(); } catch (_) { /* sin cuerpo */ }
  return { ok: res.ok, status: res.status, data };
}

// ── Helper de DOM (seguro: textContent, sin innerHTML) ───────────────────────
function el(tag, attrs, ...kids) {
  const n = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (k === "onclick") n.addEventListener("click", v);
      else if (v === true) n.setAttribute(k, "");
      else n.setAttribute(k, v);
    }
  }
  appendKids(n, kids);
  return n;
}
function appendKids(n, kids) {
  for (const c of kids) {
    if (c == null || c === false) continue;
    if (Array.isArray(c)) { appendKids(n, c); continue; }
    n.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
}

// ── Formato ──────────────────────────────────────────────────────────────────
const nfNum = new Intl.NumberFormat("es-HN");
const nfUSD = new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 4,
});
let nfHNL = null;
try { nfHNL = new Intl.NumberFormat("es-HN", { style: "currency", currency: "HNL" }); } catch (_) { /* fallback */ }

const fmtNum = (n) => nfNum.format(Number(n) || 0);
const fmtUSD = (n) => nfUSD.format(Number(n) || 0);
const fmtHNL = (n) => { const v = Number(n) || 0; return nfHNL ? nfHNL.format(v) : "L " + v.toFixed(2); };
const fmtTime = (s) => { const d = new Date(s); return isNaN(d.getTime()) ? String(s || "") : d.toLocaleString("es-HN"); };

// ── Estado ────────────────────────────────────────────────────────────────────
const state = {
  models: [],
  jobs: [],
  selectedId: null,
  billing: {}, // jobId → Billing
  pollTimer: null,
};

const STATUS = {
  queued:   { label: "En cola",   cls: "pill-queued" },
  running:  { label: "Generando", cls: "pill-running" },
  done:     { label: "Listo",     cls: "pill-done" },
  error:    { label: "Error",     cls: "pill-error" },
  canceled: { label: "Cancelado", cls: "pill-canceled" },
};
const statusInfo = (s) => STATUS[s] || { label: s || "?", cls: "pill-queued" };
const isActive = (j) => j && (j.status === "queued" || j.status === "running");
const currentJob = () => state.jobs.find((j) => j.id === state.selectedId) || null;

function specOf(job) {
  try { return JSON.parse(job.spec_json) || {}; } catch (_) { return {}; }
}

// ── Salud + chip del motor ────────────────────────────────────────────────────
async function loadHealth() {
  const chip = $("engine-chip");
  try {
    const h = await getJSON("/api/health");
    if (h.version) $("version").textContent = `OnStudio ${h.version}`;
    const eng = h.engine || {};
    chip.textContent = `Motor: ${eng.mode || "?"}`;
    chip.className = "chip " + (eng.configured ? "ok" : "warn");
    if (eng.note) chip.title = eng.note;
  } catch (_) {
    chip.textContent = "Motor: sin conexión";
    chip.className = "chip warn";
  }
}

// ── Modelos ────────────────────────────────────────────────────────────────────
async function loadModels() {
  const sel = $("model-select");
  try {
    const models = await getJSON("/api/models");
    state.models = Array.isArray(models) ? models : [];
  } catch (_) {
    state.models = [];
  }
  if (!state.models.length) {
    sel.replaceChildren(el("option", { value: "", text: "Sin modelos configurados" }));
    sel.disabled = true;
    $("generate-btn").disabled = true;
    setMsg("No hay modelos habilitados (config.json → allowed_models).", "error");
    return;
  }
  sel.disabled = false;
  sel.replaceChildren(
    ...state.models.map((m, i) =>
      el("option", { value: String(i), text: m.label || `${m.provider} · ${m.model}` })
    )
  );
}

// ── Trabajos ───────────────────────────────────────────────────────────────────
async function loadJobs() {
  try {
    const jobs = await getJSON("/api/jobs");
    state.jobs = (Array.isArray(jobs) ? jobs : [])
      .slice()
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  } catch (_) { /* conserva la lista previa */ }
  renderJobs();
  renderDetail();
}

function renderJobs() {
  const ul = $("jobs");
  if (!state.jobs.length) {
    ul.replaceChildren(el("li", { class: "empty", text: "Aún no hay trabajos. Genera el primero." }));
    return;
  }
  ul.replaceChildren(
    ...state.jobs.map((job) => {
      const spec = specOf(job);
      const st = statusInfo(job.status);
      return el("li", {
        class: "job-item" + (job.id === state.selectedId ? " selected" : ""),
        onclick: () => selectJob(job.id),
      },
        el("div", {},
          el("div", { class: "job-name", text: spec.business_name || "Sitio sin nombre" }),
          el("div", { class: "job-sub", text: `${job.template_id || "—"} · ${fmtTime(job.created_at)}` }),
        ),
        el("span", { class: "pill " + st.cls, text: st.label }),
      );
    })
  );
}

function selectJob(id) {
  state.selectedId = id;
  renderJobs();
  renderDetail();
  loadBilling(id);
}

async function loadBilling(id) {
  try {
    state.billing[id] = await getJSON(`/api/jobs/${id}/billing`);
  } catch (_) { /* se reintenta en el siguiente tick */ }
  if (state.selectedId === id) renderDetail();
}

function renderDetail() {
  const box = $("job-detail");
  const job = currentJob();
  if (!job) { box.hidden = true; box.replaceChildren(); return; }
  box.hidden = false;

  const spec = specOf(job);
  const st = statusInfo(job.status);
  const kids = [];

  kids.push(el("div", { class: "detail-head" },
    el("h3", { text: spec.business_name || "Sitio sin nombre" }),
    el("span", { class: "pill " + st.cls, text: st.label }),
  ));
  kids.push(el("div", { class: "detail-meta" },
    el("div", {}, "Plantilla: ", el("code", { text: job.template_id || "—" })),
    el("div", { text: `Modelo: ${job.provider} · ${job.model}` }),
    el("div", {}, "Job: ", el("code", { text: job.id })),
  ));

  if (job.status === "error" && job.error_msg) {
    kids.push(el("div", { class: "errbox", text: job.error_msg }));
  }

  kids.push(renderBilling(job, state.billing[job.id]));

  const actions = [];
  if (isActive(job)) {
    actions.push(el("button", { class: "btn btn-danger", onclick: () => cancelJob(job.id) }, "Cancelar"));
  }
  if (job.status === "done") {
    actions.push(el("a", { class: "btn", href: `/api/jobs/${job.id}/preview/`, target: "_blank", rel: "noopener" }, "Abrir en pestaña"));
    actions.push(el("a", { class: "btn", href: `/api/jobs/${job.id}/download` }, "Descargar .zip"));
  }
  if (actions.length) kids.push(el("div", { class: "detail-actions" }, actions));

  if (job.status === "done") {
    kids.push(el("div", { class: "preview-wrap" },
      el("iframe", {
        src: `/api/jobs/${job.id}/preview/`,
        title: "Vista previa del sitio generado",
        sandbox: "allow-scripts allow-popups allow-forms",
        loading: "lazy",
      })
    ));
  }

  box.replaceChildren(...kids);
}

function renderBilling(job, bill) {
  if (!bill || !bill.captured) {
    const msg =
      isActive(job)            ? "La factura se calcula al terminar la generación." :
      job.status === "error"   ? "Sin factura: la generación no se completó." :
      job.status === "canceled" ? "Trabajo cancelado; sin factura." :
      "Aún sin uso facturado.";
    return el("div", { class: "bill" }, el("div", { class: "bill-note", text: msg }));
  }
  const rows = [
    billRow("Tokens (entrada / salida)", `${fmtNum(bill.input_tokens)} / ${fmtNum(bill.output_tokens)}`),
  ];
  if (bill.cache_read_tokens || bill.cache_write_tokens) {
    rows.push(billRow("Caché (lectura / escritura)", `${fmtNum(bill.cache_read_tokens)} / ${fmtNum(bill.cache_write_tokens)}`));
  }
  rows.push(billRow("Costo del proveedor", fmtUSD(bill.provider_cost_usd)));
  rows.push(billRow("Margen", `×${bill.margin}`));
  rows.push(billRow("Precio (USD)", fmtUSD(bill.price_usd)));
  rows.push(el("div", { class: "bill-row bill-total" },
    el("span", { class: "k", text: "Precio (HNL)" }),
    el("span", { class: "v", text: fmtHNL(bill.price_hnl) }),
  ));
  return el("div", { class: "bill" }, rows);
}

function billRow(k, v) {
  return el("div", { class: "bill-row" },
    el("span", { class: "k", text: k }),
    el("span", { class: "v", text: v }),
  );
}

// ── Crear / cancelar ────────────────────────────────────────────────────────────
function buildSpec(form) {
  const fd = new FormData(form);
  const get = (k) => String(fd.get(k) || "").trim();
  const pages = get("pages").split(",").map((s) => s.trim()).filter(Boolean);
  return {
    business_name: get("business_name"),
    industry: get("industry"),
    site_type: get("site_type"),
    locale: "es-HN",
    currency: "HNL",
    brand: {
      use_company_colors: fd.get("use_company_colors") === "on",
      primary: get("primary"),
      accent: get("accent"),
      logo_hint: get("logo_hint"),
    },
    pages,
    contact: {
      phone: get("phone"),
      whatsapp: get("whatsapp"),
      rtn: get("rtn"),
      dni: get("dni"),
      address: get("address"),
    },
    content_notes: get("content_notes"),
  };
}

function setMsg(text, kind) {
  const m = $("form-msg");
  m.textContent = text;
  m.className = "form-msg" + (kind ? " " + kind : "");
}

async function onSubmit(e) {
  e.preventDefault();
  setMsg("", "");
  const model = state.models[Number($("model-select").value)];
  if (!model) { setMsg("Selecciona un modelo habilitado.", "error"); return; }

  const spec = buildSpec(e.target);
  if (!spec.business_name) { setMsg("Falta el nombre del negocio.", "error"); return; }

  const btn = $("generate-btn");
  btn.disabled = true;
  btn.textContent = "Enviando…";
  try {
    const { ok, status, data } = await postJSON("/api/jobs", {
      spec, provider: model.provider, model: model.model,
    });
    if (!ok) {
      setMsg((data && data.error && data.error.message) || `HTTP ${status}`, "error");
      return;
    }
    setMsg("Trabajo creado. Generando el sitio…", "ok");
    await loadJobs();
    selectJob(data.job.id);
    startPolling();
  } catch (err) {
    setMsg("Error de red: " + err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Generar sitio";
  }
}

async function cancelJob(id) {
  if (!window.confirm("¿Cancelar este trabajo?")) return;
  try {
    const { ok, status, data } = await postJSON(`/api/jobs/${id}/cancel`, null);
    if (!ok && status !== 409) {
      setMsg((data && data.error && data.error.message) || `HTTP ${status}`, "error");
    }
  } catch (_) { /* refrescamos igual abajo */ }
  await loadJobs();
  if (state.selectedId === id) await loadBilling(id);
}

// ── Sondeo (se detiene solo cuando no quedan trabajos activos) ────────────────
function startPolling() {
  if (state.pollTimer) return;
  state.pollTimer = setInterval(tick, 3000);
}
function stopPolling() {
  clearInterval(state.pollTimer);
  state.pollTimer = null;
}
async function tick() {
  await loadJobs();
  const sel = currentJob();
  if (sel) await loadBilling(sel.id);
  if (!state.jobs.some(isActive)) stopPolling();
}

// ── Tema (blanco por defecto; colores de empresa opt-in y persistente) ────────
const THEME_KEY = "onstudio-theme";
function applyTheme(theme) {
  const company = theme === "company";
  document.documentElement.setAttribute("data-theme", company ? "company" : "light");
  const btn = $("theme-toggle");
  btn.setAttribute("aria-pressed", company ? "true" : "false");
  btn.textContent = company ? "Tema claro" : "Colores de empresa";
}
function initTheme() {
  applyTheme(localStorage.getItem(THEME_KEY) || "light");
  $("theme-toggle").addEventListener("click", () => {
    const next = document.documentElement.getAttribute("data-theme") === "company" ? "light" : "company";
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  initTheme();
  $("spec-form").addEventListener("submit", onSubmit);
  $("refresh-jobs").addEventListener("click", () => loadJobs());
  await Promise.all([loadHealth(), loadModels()]);
  await loadJobs();
  if (state.jobs.some(isActive)) startPolling();
}

document.addEventListener("DOMContentLoaded", init);
