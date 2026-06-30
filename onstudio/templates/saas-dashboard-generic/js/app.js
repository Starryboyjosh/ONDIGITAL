// {{business_name}} — panel SaaS (prototipo estático, sin dependencias ni backend).
// Tema CLARO por defecto; "company" (navy) opt-in y recordado en localStorage.
(function () {
  "use strict";

  var root = document.documentElement;
  var THEME_KEY = "panel-theme";

  // ── Tema ──
  var themeBtn = document.getElementById("theme-toggle");
  function applyTheme(theme) {
    var company = theme === "company";
    root.setAttribute("data-theme", company ? "company" : "light");
    if (themeBtn) {
      themeBtn.setAttribute("aria-pressed", company ? "true" : "false");
      themeBtn.textContent = company ? "Tema claro" : "Colores de empresa";
    }
  }
  try {
    if (localStorage.getItem(THEME_KEY) === "company") applyTheme("company");
  } catch (e) { /* sin almacenamiento: queda claro */ }
  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "company" ? "light" : "company";
      applyTheme(next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* ignorar */ }
    });
  }

  // ── Sidebar (móvil) ──
  var sidebar = document.getElementById("sidebar");
  var sideToggle = document.getElementById("sidebar-toggle");
  if (sidebar && sideToggle) {
    sideToggle.addEventListener("click", function () {
      var open = sidebar.classList.toggle("open");
      sideToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  // ── Cambio de vista ──
  var links = document.querySelectorAll(".side-link");
  var views = document.querySelectorAll(".view");
  function show(view) {
    views.forEach(function (v) {
      var active = v.getAttribute("data-view") === view;
      v.classList.toggle("is-active", active);
      if (active) { v.removeAttribute("hidden"); } else { v.setAttribute("hidden", ""); }
    });
    links.forEach(function (l) { l.classList.toggle("is-active", l.getAttribute("data-view") === view); });
    if (sidebar) sidebar.classList.remove("open");
  }
  links.forEach(function (l) {
    l.addEventListener("click", function () { show(l.getAttribute("data-view")); });
  });
})();
