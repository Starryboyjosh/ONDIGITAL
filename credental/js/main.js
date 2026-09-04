/* ==========================================================================
   MAIN.JS - COMPORTAMIENTOS COMUNES Y COMPONENTES GLOBALES
   Controla barras laterales, notificaciones toast y perfiles de sesión
   con soporte para branding dinámico multi-empresa.
   ========================================================================== */

// 0. Autoejecución inmediata para restaurar el tema visual sin parpadeos.
//    El tema claro es el predeterminado; el oscuro es una opción secundaria.
//    Además pinta la barra del navegador (meta theme-color): sin ella, en
//    móvil queda una franja blanca encima de la app cuando el tema es oscuro.
//    El meta se inyecta aquí y no en las 18 páginas para tener una sola fuente
//    del color, y se actualiza también al alternar el tema (sección 6).
(function() {
  const savedTheme = localStorage.getItem('credental_theme');
  const isDark = savedTheme === 'dark';
  if (isDark) {
    document.documentElement.classList.add('dark-theme');
  }

  const CHROME_LIGHT = '#fff6e7'; // --bg-primary del tema claro
  const CHROME_DARK = '#071a2b';  // --bg-primary del tema oscuro
  window.applyThemeColor = function() {};
  if (!document.head) return;

  let meta = document.head.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  window.applyThemeColor = function(dark) {
    meta.setAttribute('content', dark ? CHROME_DARK : CHROME_LIGHT);
  };
  window.applyThemeColor(isDark);
})();

// Helper centralizado de formato de moneda: Lempira hondureño (HNL).
// Evita repetir Intl.NumberFormat en cada módulo. Disponible como window.formatMoney.
window.MONEY_LOCALE = 'es-HN';
window.MONEY_CURRENCY = 'HNL';
window.formatMoney = function(value) {
  // Un dato ausente o corrupto no es un saldo en cero: `Number(value) || 0`
  // convertía NaN y undefined en "L 0.00" y no había forma de distinguirlos
  // de una cuenta saldada.
  const num = Number(value);
  if (!Number.isFinite(num)) return '—';
  return new Intl.NumberFormat(window.MONEY_LOCALE, {
    style: 'currency',
    currency: window.MONEY_CURRENCY,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
};

// Helper centralizado anti-XSS: escapa valores capturados (nombres de
// paciente, notas, mensajes, etc.) antes de interpolarlos en innerHTML.
// Nunca usar sobre el markup que la propia app genera, solo sobre los datos.
window.escapeHtml = function(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

// Texto listo para comparar en un buscador: sin acentos y en minúsculas.
// En recepción nadie teclea la tilde, así que «maria» tiene que encontrar a
// «María Elena Castro». NFD separa la letra de su diacrítico y el rango
// U+0300–U+036F borra los diacríticos combinantes que quedan sueltos.
window.normalizarBusqueda = function(value) {
  return String(value == null ? '' : value)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
};

// --- Formato de fechas y estados (es-HN) ----------------------------------
// Toda fecha que ve el usuario pasa por aquí: nunca se imprime un ISO crudo
// (2026-09-01) ni un estado interno en inglés ('confirmed') en pantalla.
window.formatDateEs = function(value, opciones) {
  if (!value) return '—';
  const iso = String(value);
  // 'YYYY-MM-DD' se interpreta como UTC si se pasa tal cual a new Date().
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(iso + 'T00:00:00') : new Date(iso);
  // Una fecha corrupta no se imprime en crudo: '2026-13-45' en pantalla se lee
  // como un dato válido raro, y el guion ya es la convención de "sin dato".
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-HN', opciones || { day: 'numeric', month: 'short', year: 'numeric' });
};

window.formatDateLargaEs = function(value) {
  const txt = window.formatDateEs(value, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return txt.charAt(0).toUpperCase() + txt.slice(1);
};

window.formatHora = function(value) {
  if (!value) return '';
  const hhmm = String(value).includes('T') ? String(value).split('T')[1] : String(value);
  return (hhmm || '').slice(0, 5);
};

// Etiquetas en español para los estados internos de cita.
window.ESTADOS_CITA = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  completed: 'Completada',
  canceled: 'Cancelada'
};
window.estadoCitaEs = (status) => window.ESTADOS_CITA[status] || 'Pendiente';

// Etiquetas en español para el estado de cobranza de un presupuesto.
window.ESTADOS_COBRO = {
  pendiente: 'Pendiente',
  parcial: 'Abonado',
  pagado: 'Saldado',
  suspendido: 'Suspendido',
  cancelado: 'Cancelado'
};
window.estadoCobroEs = (status) => window.ESTADOS_COBRO[status] || 'Pendiente';

// Único criterio de "este presupuesto genera saldo por cobrar", compartido por
// Cobranzas, Presupuestos, Pacientes y Comunicaciones.
// Vivía duplicado en los cuatro módulos y se desincronizó: Comunicaciones se
// quedó mirando solo `status`, así que la plantilla de WhatsApp seguía
// reclamando {monto} de una cobranza que la propia clínica ya había suspendido
// o cancelado. Con una sola función los cuatro dan siempre la misma cifra.
//  - status 'draft' / 'rejected': el paciente no ha aceptado nada.
//  - paymentStatus 'cancelado' / 'suspendido': se decide en Cobranzas y
//    congela el saldo (db.js `recalcBudgetPaymentStatus`).
window.esCobrable = function(budget) {
  return !!budget && budget.status === 'accepted'
    && budget.paymentStatus !== 'cancelado' && budget.paymentStatus !== 'suspendido';
};

// Folio visible de un presupuesto. El id interno (bud_co_credental_demo_1)
// es de la base de datos y nunca debe llegar a la interfaz ni al comprobante.
window.folioPresupuesto = function(budget) {
  if (!budget) return '—';
  if (budget.folio) return budget.folio;
  // El respaldo solo sirve para los ids con sufijo correlativo de la semilla
  // (bud_co_credental_demo_7). Los ids generados en caliente terminan en
  // Date.now(), y ese respaldo imprimía "P-1730000000000123" en el
  // comprobante: exactamente la marca de tiempo interna que el folio existe
  // para no enseñar.
  const m = /_(\d{1,4})$/.exec(String(budget.id || ''));
  return m ? 'P-' + m[1].padStart(4, '0') : '—';
};

// Nombre en español de un método de pago. Los valores internos son en inglés.
window.METODOS_PAGO = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  check: 'Cheque'
};
window.metodoPagoEs = (metodo) => window.METODOS_PAGO[metodo] || (metodo || '—');

// Normaliza un teléfono hondureño al formato que espera wa.me (sin '+').
window.telefonoWhatsApp = function(phone) {
  let digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 8) digits = '504' + digits;
  return digits;
};

// Descarga un archivo generado en el navegador (CSV de reportes, etc.).
// No requiere backend ni dependencias externas.
window.descargarArchivo = function(nombre, contenido, mime) {
  const blob = new Blob(['﻿' + contenido], { type: (mime || 'text/csv') + ';charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// Serializa filas a CSV con comillas seguras (Excel/LibreOffice en es-HN).
window.filasACSV = function(filas) {
  const esc = (v) => {
    const t = String(v == null ? '' : v);
    return /[";\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
  };
  return filas.map(f => f.map(esc).join(';')).join('\r\n');
};

// Pide un dato al usuario con el modal propio de la app (reemplaza a
// window.prompt, que rompe la estética y no es estilizable). Devuelve una
// Promise<string|null>: null si el usuario cancela.
window.pedirDato = function(mensaje, opciones) {
  opciones = opciones || {};
  const titulo = opciones.titulo || 'Dato requerido';
  const etiqueta = opciones.etiqueta || mensaje;
  const tipo = opciones.tipo || 'text';
  const valor = opciones.valor === undefined ? '' : String(opciones.valor);
  const textoConfirmar = opciones.textoConfirmar || 'Guardar';
  const ayuda = opciones.ayuda || '';

  return new Promise(function(resolve) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const inputId = 'pedir-dato-' + Date.now();
    overlay.innerHTML = `
      <div class="modal-container" style="max-width: 420px;">
        <div class="modal-header">
          <h3 class="modal-title">${window.escapeHtml(titulo)}</h3>
          <button type="button" class="modal-close-btn" data-action="cancel" aria-label="Cerrar">✕</button>
        </div>
        <form class="modal-body" data-role="form">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" for="${inputId}">${window.escapeHtml(etiqueta)}</label>
            <input id="${inputId}" class="form-control" type="${window.escapeHtml(tipo)}" value="${window.escapeHtml(valor)}"
              ${tipo === 'number' ? 'min="0" step="0.01"' : ''} ${opciones.requerido === false ? '' : 'required'}>
            ${ayuda ? `<p class="form-hint">${window.escapeHtml(ayuda)}</p>` : ''}
          </div>
        </form>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-action="cancel">Cancelar</button>
          <button type="button" class="btn btn-primary" data-action="confirm">${window.escapeHtml(textoConfirmar)}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const input = overlay.querySelector('#' + inputId);

    let settled = false;
    const cleanup = (result) => {
      if (settled) return;
      settled = true;
      overlay.classList.remove('active');
      document.removeEventListener('keydown', onKeyDown);
      setTimeout(() => overlay.remove(), 200);
      resolve(result);
    };
    const aceptar = () => {
      if (!input.checkValidity()) { input.reportValidity(); return; }
      cleanup(input.value);
    };
    const onKeyDown = (e) => { if (e.key === 'Escape') cleanup(null); };

    overlay.querySelectorAll('[data-action="cancel"]').forEach((btn) => {
      btn.addEventListener('click', () => cleanup(null));
    });
    overlay.querySelector('[data-action="confirm"]').addEventListener('click', aceptar);
    overlay.querySelector('[data-role="form"]').addEventListener('submit', (e) => { e.preventDefault(); aceptar(); });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cleanup(null); });
    document.addEventListener('keydown', onKeyDown);

    requestAnimationFrame(() => {
      overlay.classList.add('active');
      input.focus();
      input.select();
    });
  });
};

// --- Contraste del acento por tenant --------------------------------------
// El acento corporativo puede ser demasiado claro para llevar texto blanco
// encima. Se oscurece hasta alcanzar 4.5:1 (WCAG AA) antes de usarlo como
// color de acción; el acento original se conserva para lo decorativo.
window.acentoAccesible = function(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return null;
  let r = parseInt(m[1].slice(0, 2), 16);
  let g = parseInt(m[1].slice(2, 4), 16);
  let b = parseInt(m[1].slice(4, 6), 16);

  const canal = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const contrasteConBlanco = (rr, gg, bb) => {
    const L = 0.2126 * canal(rr) + 0.7152 * canal(gg) + 0.0722 * canal(bb);
    return 1.05 / (L + 0.05);
  };

  let factor = 1;
  let rr = r, gg = g, bb = b;
  while (contrasteConBlanco(rr, gg, bb) < 4.5 && factor > 0.05) {
    factor -= 0.05;
    rr = Math.round(r * factor);
    gg = Math.round(g * factor);
    bb = Math.round(b * factor);
  }
  const hx = (c) => c.toString(16).padStart(2, '0');
  return '#' + hx(rr) + hx(gg) + hx(bb);
};

// Oscurece un hex por un factor (para estados hover/active del acento).
window.oscurecerHex = function(hex, factor) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return hex;
  const hx = (c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0');
  return '#' +
    hx(parseInt(m[1].slice(0, 2), 16) * factor) +
    hx(parseInt(m[1].slice(2, 4), 16) * factor) +
    hx(parseInt(m[1].slice(4, 6), 16) * factor);
};

document.addEventListener('DOMContentLoaded', function() {
  // 1. Verificar Sesión Inicialmente (redundancia de seguridad)
  if (window.auth) {
    window.auth.checkSession();
  }

  // 2. Aplicar Branding Dinámico de la Empresa
  const currentCompany = window.auth ? window.auth.getCurrentCompany() : null;
  if (currentCompany) {
    // El acento corporativo pinta lo decorativo tal cual, pero el color de
    // acción (botones, enlaces) se oscurece hasta pasar AA sobre texto blanco.
    // Antes se asignaba el acento crudo y el botón primario quedaba en 3.06:1.
    // El acento de CREDental (#cb6ce6) ya tiene su versión AA calculada a mano
    // en tokens.css (--action: #a723cd); no se recalcula.
    const accent = String(currentCompany.accent || '').toLowerCase();
    if (accent && accent !== '#cb6ce6') {
      const accentAA = window.acentoAccesible(accent);
      if (accentAA) {
        document.documentElement.style.setProperty('--action', accentAA);
        document.documentElement.style.setProperty('--action-strong', window.oscurecerHex(accentAA, 0.82));
      }
      document.documentElement.style.setProperty('--brand-purple', accent);
    }

    // Inyectar color translúcido de acento para efectos de fondo/sombra
    document.documentElement.style.setProperty('--border-glow-active', `${currentCompany.accent}66`);
    document.documentElement.style.setProperty('--box-shadow-glow', `0 0 20px ${currentCompany.accent}40`);

    // Actualizar nombre de la empresa en la barra lateral
    const brandNameEl = document.querySelector('.brand-name');
    if (brandNameEl) {
      const name = currentCompany.name;
      // Resaltado elegante de marca
      if (name.toLowerCase().includes('dental')) {
        const parts = name.split(/(dental)/i);
        if (parts.length >= 2) {
          brandNameEl.innerHTML = `${parts[0]}<span class="acc">${parts[1]}</span>${parts.slice(2).join('')}`;
        } else {
          brandNameEl.innerHTML = name;
        }
      } else {
        const words = name.split(' ');
        if (words.length >= 2) {
          brandNameEl.innerHTML = `${words[0]} <span class="acc">${words.slice(1).join(' ')}</span>`;
        } else {
          brandNameEl.innerHTML = `<span class="acc">${name}</span>`;
        }
      }
    }

    // El isotipo oficial se mantiene fijo; solo el nombre puede variar por tenant.
  }

  // 3. Cargar Perfil de Usuario en el Sidebar
  const currentUser = window.auth ? window.auth.getCurrentUser() : null;
  if (currentUser) {
    const avatarEl = document.getElementById('sidebar-user-avatar');
    const nameEl = document.getElementById('sidebar-user-name');
    const roleEl = document.getElementById('sidebar-user-role');

    if (avatarEl) avatarEl.textContent = currentUser.avatar || 'U';
    if (nameEl) nameEl.textContent = currentUser.name || 'Usuario';
    if (roleEl) roleEl.textContent = currentUser.role || 'Clínico';
  }

  // 4. Vincular botón de Logout
  const logoutBtn = document.getElementById('sidebar-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function(e) {
      e.preventDefault();
      if (window.auth) {
        window.auth.logout();
      }
    });
  }

  // 4.5. NAVEGACIÓN CENTRALIZADA — Todos los ítems del menú se definen aquí
  const navMenu = document.querySelector('.nav-menu');
  if (navMenu) {
    // Definición centralizada de la navegación, agrupada por sección.
    // Antes eran 17 ítems en una lista plana sin un solo encabezado: 677 px de
    // menú en un portátil que da 376 px de alto útil. Los encabezados son
    // estáticos a propósito —no hay acordeón— porque plegar escondería 12 de
    // los 17 módulos y esto es una base para presentar funcionalidades.
    // Para agregar/quitar/reordenar páginas, solo modifica este array.
    const navGroups = [
      {
        id: 'inicio',
        titulo: 'Inicio',
        items: [
          {
            href: 'dashboard.html',
            label: 'Dashboard',
            icon: '<rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect>'
          },
          {
            href: 'vito.html',
            label: 'Vito',
            icon: '<rect x="5" y="7" width="14" height="12" rx="3"></rect><path d="M9 7V5a3 3 0 0 1 6 0v2"></path><circle cx="9.5" cy="13" r="1"></circle><circle cx="14.5" cy="13" r="1"></circle><path d="M9.5 16.5c1 .8 3.5.8 5 0"></path>'
          }
        ]
      },
      {
        id: 'clinica',
        titulo: 'Clínica',
        items: [
          {
            href: 'agenda.html',
            label: 'Agenda de citas',
            icon: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>'
          },
          {
            href: 'pacientes.html',
            label: 'Pacientes',
            icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>'
          },
          {
            href: 'comunicaciones.html',
            label: 'Comunicaciones',
            icon: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>'
          },
          {
            href: 'odontograma.html',
            label: 'Odontograma',
            icon: '<path d="M12 2C10.5 2 9 3 8 4.5 7 6 6 8.5 6 10c0 4 2 6 2 9 0 2.5 1 3 2 3s1.5-1 2-2c0.5 1 1 2 2 2s2-0.5 2-3c0-3 2-5 2-9 0-1.5-1-4-2-5.5C15 3 13.5 2 12 2z"></path>'
          },
          {
            href: 'periodontograma.html',
            label: 'Periodontograma',
            icon: '<line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line><line x1="10" y1="3" x2="8" y2="21"></line><line x1="16" y1="3" x2="14" y2="21"></line>'
          },
          {
            href: 'laboratorios.html',
            label: 'Laboratorios',
            icon: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"></path><line x1="7.5" y1="14" x2="16.5" y2="14"></line>'
          }
        ]
      },
      {
        id: 'cobros',
        titulo: 'Cobros',
        items: [
          {
            href: 'presupuestos.html',
            label: 'Presupuestos',
            icon: '<line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>'
          },
          {
            href: 'cobranzas.html',
            label: 'Cobranzas',
            icon: '<rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line>'
          },
          {
            href: 'facturacion.html',
            label: 'Facturación',
            icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line>'
          },
          {
            href: 'caja.html',
            label: 'Caja',
            icon: '<path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"></path><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"></path><path d="M18 12a2 2 0 0 0 0 4h4v-4z"></path>'
          }
        ]
      },
      {
        id: 'gestion',
        titulo: 'Gestión',
        items: [
          {
            href: 'procedimientos.html',
            label: 'Procedimientos',
            icon: '<path d="M9 2h6a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v0a2 2 0 0 1 2-2z"></path><path d="M9 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-4"></path>'
          },
          {
            href: 'inventario.html',
            label: 'Inventario',
            icon: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line>'
          },
          {
            href: 'reportes.html',
            label: 'Reportes',
            icon: '<line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line>'
          }
        ]
      },
      {
        id: 'ajustes',
        titulo: 'Ajustes',
        items: [
          {
            href: 'configuracion.html',
            label: 'Configuración',
            icon: '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>'
          },
          {
            href: 'usuarios.html',
            label: 'Usuarios',
            icon: '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline>',
            adminOnly: true
          }
        ]
      }
    ];

    // Limpiar cualquier ítem hardcodeado que venga del HTML
    navMenu.innerHTML = '';

    // Generar los ítems dinámicamente
    const isAdmin = currentUser && window.auth && window.auth.isAdmin(currentUser);
    navGroups.forEach(grupo => {
      // El filtro se resuelve ANTES de pintar el encabezado: el grupo "Ajustes"
      // es entero adminOnly, así que una recepcionista veía el rótulo con nada
      // debajo. Si no queda ningún ítem visible, el grupo no se dibuja.
      const visibles = grupo.items.filter(item => !(item.adminOnly && !isAdmin));
      if (visibles.length === 0) return;

      const titulo = document.createElement('li');
      titulo.className = 'nav-section';
      // aria-hidden: el rótulo es una ayuda visual de agrupación; el lector de
      // pantalla ya recorre la lista de enlaces y no gana nada leyéndolo.
      titulo.setAttribute('aria-hidden', 'true');
      titulo.textContent = grupo.titulo;
      navMenu.appendChild(titulo);

      visibles.forEach(item => {
        const li = document.createElement('li');
        li.className = 'nav-item';
        li.innerHTML = `
          <a href="${item.href}">
            <svg viewBox="0 0 24 24">${item.icon}</svg>
            <span>${item.label}</span>
          </a>
        `;
        navMenu.appendChild(li);
      });
    });
  }

  // 5. Resaltar enlace activo en el Sidebar basado en la URL.
  // La comparacion es por nombre de archivo exacto: con endsWith(), la ruta
  // /periodontograma.html tambien terminaba en "odontograma.html" y las dos
  // entradas del menu se pintaban activas a la vez.
  const archivoActual = (window.location.pathname.split('/').pop() || 'dashboard.html');
  const navLinks = document.querySelectorAll('.nav-item');

  navLinks.forEach(item => {
    const link = item.querySelector('a');
    if (!link) return;
    const href = (link.getAttribute('href') || '').split('/').pop();
    if (href === archivoActual) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Con 17 modulos el menu desplaza en pantallas de portatil, y los ultimos
  // (Caja, Reportes, Configuracion...) quedan fuera de vista o cortados por la
  // mitad: al entrar a esas paginas no se ve donde esta uno parado. Se acerca
  // lo justo para dejar visible el item activo, sin mover nada si ya se ve.
  const activeItem = document.querySelector('.nav-item.active');
  const navScroller = document.querySelector('.sidebar nav');
  if (activeItem && navScroller) {
    // Se calcula a mano en lugar de scrollIntoView({block:'nearest'}): ese
    // metodo se resolvia antes de que el sidebar tuviera su altura final y
    // dejaba el item activo justo debajo del borde inferior.
    requestAnimationFrame(() => {
      const sobra = navScroller.scrollHeight - navScroller.clientHeight;
      if (sobra <= 0) return;
      // Centrar el item activo escondia el inicio del menu sin necesidad: en
      // Laboratorios, por ejemplo, "Dashboard" desaparecia aunque el item
      // activo ya estaba a la vista. Solo se desplaza si hace falta.
      const margen = 8;
      const arriba = activeItem.offsetTop;
      const abajo = arriba + activeItem.offsetHeight;
      const vistaArriba = navScroller.scrollTop;
      const vistaAbajo = vistaArriba + navScroller.clientHeight;
      let destino = vistaArriba;
      if (arriba - margen < vistaArriba) {
        destino = arriba - margen;
      } else if (abajo + margen > vistaAbajo) {
        destino = abajo + margen - navScroller.clientHeight;
      }
      navScroller.scrollTop = Math.max(0, Math.min(destino, sobra));
    });
  }

  // 7. Navegación móvil: botón hamburguesa + overlay para el sidebar deslizante.
  //    Solo se activa visualmente en móvil (CSS @media); el botón y el velo se
  //    inyectan aquí para no duplicar markup en las ~16 pantallas.
  const sidebarEl = document.querySelector('.sidebar');
  if (sidebarEl) {
    if (!sidebarEl.id) sidebarEl.id = 'app-sidebar';

    const navToggle = document.createElement('button');
    navToggle.className = 'sidebar-toggle';
    navToggle.type = 'button';
    navToggle.setAttribute('aria-label', 'Abrir menú de navegación');
    navToggle.setAttribute('aria-controls', sidebarEl.id);
    navToggle.setAttribute('aria-expanded', 'false');
    navToggle.innerHTML = '<svg viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>';

    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';

    document.body.appendChild(navToggle);
    document.body.appendChild(overlay);

    const openSidebar = () => {
      sidebarEl.classList.add('open');
      overlay.classList.add('active');
      document.body.classList.add('sidebar-open');
      navToggle.setAttribute('aria-expanded', 'true');
    };
    const closeSidebar = () => {
      sidebarEl.classList.remove('open');
      overlay.classList.remove('active');
      document.body.classList.remove('sidebar-open');
      navToggle.setAttribute('aria-expanded', 'false');
    };

    navToggle.addEventListener('click', () => {
      if (sidebarEl.classList.contains('open')) {
        closeSidebar();
      } else {
        openSidebar();
      }
    });
    overlay.addEventListener('click', closeSidebar);

    // Cerrar al tocar un enlace del menú (navegación) o el botón de logout.
    sidebarEl.addEventListener('click', (e) => {
      if (e.target.closest('.nav-item a') || e.target.closest('#sidebar-logout-btn')) {
        closeSidebar();
      }
    });

    // Cerrar con Escape y al volver a ancho de escritorio.
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeSidebar();
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 900) closeSidebar();
    });
  }
});

// ==========================================================================
// TOAST NOTIFICATIONS (Notificaciones flotantes premium)
// ==========================================================================
window.showToast = function(message, type = 'success') {
  // Eliminar toast anterior si existe
  const oldToast = document.querySelector('.toast-notification');
  if (oldToast) {
    oldToast.remove();
  }

  // Crear contenedor
  const toast = document.createElement('div');
  toast.className = `toast-notification ${type}`;
  
  // Asignar colores según el tipo usando la identidad oficial de CREDental.
  const rootStyles = getComputedStyle(document.documentElement);
  const brandPrimary = rootStyles.getPropertyValue('--brand-primary').trim() || '#004aad';
  const brandPurple = rootStyles.getPropertyValue('--brand-purple').trim() || '#cb6ce6';
  let bg = 'rgba(0, 77, 102, 0.96)';
  let border = `1px solid ${brandPrimary}66`;
  let iconColor = brandPurple;
  let iconSvg = '<circle cx="12" cy="12" r="10"></circle><polyline points="12 8 12 12 16 14"></polyline>'; // Reloj para info

  const currentCompany = window.auth ? window.auth.getCurrentCompany() : null;
  const activeAccent = currentCompany ? currentCompany.accent : brandPrimary;

  // El toast es el único canal de retroalimentación del producto: si un error y
  // un guardado correcto comparten el mismo fondo, el usuario no distingue si
  // la acción se completó. El fondo cambia con el tipo, no solo el borde de 1px.
  // El icono va en la variante CLARA del propio fondo, no en el morado de
  // identidad: #cb6ce6 sobre el verde del acierto son 2.74:1 y el visto se
  // pierde. Los rojos/ámbar que estaban aquí (#ff4a5a, #ffb800) venían del
  // diseño retirado y tampoco pertenecen a la paleta de CREDental.
  if (type === 'success') {
    bg = 'rgba(21, 87, 60, 0.96)';
    border = '1px solid rgba(167, 243, 200, 0.45)';
    iconColor = '#a7f3c8'; // 6.62:1 sobre el verde
    iconSvg = '<polyline points="20 6 9 17 4 12"></polyline>'; // Check
  } else if (type === 'error') {
    bg = 'rgba(133, 27, 20, 0.96)';
    border = '1px solid rgba(255, 201, 196, 0.45)';
    iconColor = '#ffc9c4'; // 6.66:1 sobre el rojo
    iconSvg = '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>'; // Equis
  } else if (type === 'warning') {
    bg = 'rgba(120, 76, 8, 0.96)';
    border = '1px solid rgba(255, 227, 168, 0.45)';
    iconColor = '#ffe3a8'; // 5.93:1 sobre el ámbar
    iconSvg = '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>'; // Alerta
  } else {
    border = `1px solid ${activeAccent}66`;
    iconColor = activeAccent;
  }

  // Estilos en línea dinámicos del Toast
  toast.style.position = 'fixed';
  toast.style.bottom = '25px';
  toast.style.right = '25px';
  toast.style.background = bg;
  toast.style.border = border;
  toast.style.color = '#ffffff';
  toast.style.padding = '14px 22px';
  toast.style.borderRadius = '12px';
  toast.style.backdropFilter = 'blur(15px)';
  toast.style.webkitBackdropFilter = 'blur(15px)';
  toast.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
  toast.style.display = 'flex';
  toast.style.alignItems = 'center';
  toast.style.gap = '12px';
  toast.style.zIndex = '99999';
  toast.style.fontFamily = "'DM Sans', sans-serif";
  toast.style.fontSize = '0.9rem';
  toast.style.fontWeight = '500';
  toast.style.transform = 'translateY(20px)';
  toast.style.opacity = '0';
  toast.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease';

  toast.innerHTML = `
    <svg style="width: 18px; height: 18px; stroke: ${iconColor}; fill: none; stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round;" viewBox="0 0 24 24">
      ${iconSvg}
    </svg>
    <span>${window.escapeHtml(message)}</span>
  `;

  document.body.appendChild(toast);

  // Gatillar animación de entrada
  setTimeout(() => {
    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';
  }, 50);

  // Auto-eliminar después de 3.5 segundos
  setTimeout(() => {
    toast.style.transform = 'translateY(20px)';
    toast.style.opacity = '0';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3500);
};

// Helper común para cerrar modales al hacer clic fuera del contenedor
window.setupModalClosers = function(overlayEl, closeBtnEl) {
  if (closeBtnEl) {
    closeBtnEl.addEventListener('click', () => {
      overlayEl.classList.remove('active');
    });
  }

  if (overlayEl) {
    overlayEl.addEventListener('click', (e) => {
      if (e.target === overlayEl) {
        overlayEl.classList.remove('active');
      }
    });
  }
};

// ==========================================================================
// CONFIRMACIÓN PERSONALIZADA (reemplazo de confirm() nativo del navegador)
// ==========================================================================
// Reutiliza el patrón visual .modal-overlay/.active ya usado en toda la app,
// pero genera su propio markup dinámicamente para no depender de HTML
// estático por página (igual que showToast). Devuelve una Promise<boolean>:
// true si el usuario confirma, false si cancela o cierra el modal.
window.confirmarAccion = function(mensaje, opciones) {
  opciones = opciones || {};
  const titulo = opciones.titulo || 'Confirmar acción';
  const textoConfirmar = opciones.textoConfirmar || 'Confirmar';
  const textoCancelar = opciones.textoCancelar || 'Cancelar';
  const peligroso = opciones.peligroso !== false; // por defecto, acción de riesgo

  return new Promise(function(resolve) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-container" style="max-width: 420px;">
        <div class="modal-header">
          <h3 class="modal-title">${window.escapeHtml(titulo)}</h3>
          <button type="button" class="modal-close-btn" data-action="cancel">✕</button>
        </div>
        <div class="modal-body">
          <p style="margin: 0; color: var(--text-primary);">${window.escapeHtml(mensaje)}</p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-action="cancel">${window.escapeHtml(textoCancelar)}</button>
          <button type="button" class="btn ${peligroso ? 'btn-danger' : 'btn-primary'}" data-action="confirm">${window.escapeHtml(textoConfirmar)}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    let settled = false;
    const cleanup = (result) => {
      if (settled) return;
      settled = true;
      overlay.classList.remove('active');
      document.removeEventListener('keydown', onKeyDown);
      setTimeout(() => overlay.remove(), 200);
      resolve(result);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') cleanup(false);
    };

    overlay.querySelectorAll('[data-action="cancel"]').forEach((btn) => {
      btn.addEventListener('click', () => cleanup(false));
    });
    overlay.querySelector('[data-action="confirm"]').addEventListener('click', () => cleanup(true));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cleanup(false);
    });
    document.addEventListener('keydown', onKeyDown);

    requestAnimationFrame(() => overlay.classList.add('active'));
  });
};
