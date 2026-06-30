// {{business_name}} — interacciones de la landing (vanilla, sin dependencias).
// Tema CLARO por defecto; "company" (navy) es opt-in y se recuerda en localStorage.
(function () {
  "use strict";

  var root = document.documentElement;
  var THEME_KEY = "site-theme"; // por sitio generado, no global

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
    var saved = localStorage.getItem(THEME_KEY);
    if (saved === "company") applyTheme("company");
  } catch (e) { /* almacenamiento no disponible: queda el tema claro */ }

  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "company" ? "light" : "company";
      applyTheme(next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* ignorar */ }
    });
  }

  // ── Menú móvil ──
  var navToggle = document.getElementById("nav-toggle");
  var navMenu = document.getElementById("nav-menu");
  if (navToggle && navMenu) {
    navToggle.addEventListener("click", function () {
      var open = navMenu.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    navMenu.addEventListener("click", function (ev) {
      if (ev.target.closest("a")) {
        navMenu.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  // ── Año del footer ──
  var year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  // ── Formulario de contacto → WhatsApp (sin backend) ──
  // El número se toma del enlace de WhatsApp ya presente en la página, así el
  // rebrand solo cambia el href en el HTML y aquí no hay datos quemados.
  var form = document.getElementById("contact-form");
  var status = document.getElementById("form-status");
  if (form) {
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var name = (form.elements.name.value || "").trim();
      var message = (form.elements.message.value || "").trim();
      if (!name || !message) {
        if (status) status.textContent = "Completa tu nombre y mensaje.";
        return;
      }
      var waLink = document.querySelector('a[href*="wa.me/"]');
      var number = "";
      if (waLink) {
        var m = waLink.getAttribute("href").match(/wa\.me\/(\d+)/);
        if (m) number = m[1];
      }
      var text = encodeURIComponent("Hola, soy " + name + ". " + message);
      var url = number ? "https://wa.me/" + number + "?text=" + text
                       : "https://wa.me/?text=" + text;
      if (status) status.textContent = "Abriendo WhatsApp…";
      window.open(url, "_blank", "noopener");
      form.reset();
    });
  }
})();
