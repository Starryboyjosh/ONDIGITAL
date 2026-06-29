// OnStudio — placeholder de UI (Phase 1).
// Solo verifica que la API responde y respeta la convención de tema (blanco por
// defecto, colores de empresa opt-in y persistente). La UI real llega en Phase 5.
"use strict";

const $ = (id) => document.getElementById(id);

async function getJSON(path) {
  const res = await fetch(path, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
  return res.json();
}

function renderHealth(h) {
  $("health").textContent = JSON.stringify(h, null, 2);
  if (h && h.version) $("version").textContent = `OnStudio ${h.version}`;
}

function renderModels(models) {
  const ul = $("models");
  if (!Array.isArray(models) || models.length === 0) {
    ul.innerHTML = '<li class="muted">Ninguno configurado todavía.</li>';
    return;
  }
  ul.innerHTML = "";
  for (const m of models) {
    const li = document.createElement("li");
    const label = m.label || m.model || "modelo";
    li.textContent = label;
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = `${m.provider || "?"} · ${m.model || "?"}`;
    li.appendChild(tag);
    ul.appendChild(li);
  }
}

function renderTemplates(tpls) {
  const ul = $("templates");
  if (!Array.isArray(tpls) || tpls.length === 0) {
    ul.innerHTML = '<li class="muted">Sin plantillas.</li>';
    return;
  }
  ul.innerHTML = "";
  for (const t of tpls) {
    const li = document.createElement("li");
    li.textContent = t.name || t.id;
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = (t.site_types || []).join(", ");
    li.appendChild(tag);
    ul.appendChild(li);
  }
}

// ── Tema (blanco por defecto; colores de empresa opt-in y persistente) ──
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

async function init() {
  initTheme();
  try {
    renderHealth(await getJSON("/api/health"));
  } catch (e) {
    $("health").textContent = "Error: " + e.message;
  }
  try {
    renderModels(await getJSON("/api/models"));
  } catch (e) {
    $("models").innerHTML = `<li class="muted">Error: ${e.message}</li>`;
  }
  try {
    renderTemplates(await getJSON("/api/templates"));
  } catch (e) {
    $("templates").innerHTML = `<li class="muted">Error: ${e.message}</li>`;
  }
}

document.addEventListener("DOMContentLoaded", init);
