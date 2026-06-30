/* ==========================================================================
   MAIN.JS - COMPORTAMIENTOS COMUNES Y COMPONENTES GLOBALES
   Controla barras laterales, notificaciones toast y perfiles de sesión
   con soporte para branding dinámico multi-empresa.
   ========================================================================== */

// 0. Autoejecución inmediata para restaurar el tema visual sin parpadeos.
//    El tema claro es el predeterminado; el oscuro es una opción secundaria.
(function() {
  const savedTheme = localStorage.getItem('credental_theme');
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark-theme');
  }
})();

// Helper: iniciales profesionales a partir del nombre de la empresa.
function getCompanyInitials(name) {
  if (!name) return 'OD';
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return words[0].slice(0, 2).toUpperCase();
}

// Helper centralizado de formato de moneda: Lempira hondureño (HNL).
// Evita repetir Intl.NumberFormat en cada módulo. Disponible como window.formatMoney.
window.MONEY_LOCALE = 'es-HN';
window.MONEY_CURRENCY = 'HNL';
window.formatMoney = function(value) {
  const num = Number(value) || 0;
  return new Intl.NumberFormat(window.MONEY_LOCALE, {
    style: 'currency',
    currency: window.MONEY_CURRENCY,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
};

document.addEventListener('DOMContentLoaded', function() {
  // 1. Verificar Sesión Inicialmente (redundancia de seguridad)
  if (window.auth) {
    window.auth.checkSession();
  }

  // 2. Aplicar Branding Dinámico de la Empresa
  const currentCompany = window.auth ? window.auth.getCurrentCompany() : null;
  if (currentCompany) {
    // Inyectar el color de acento corporativo directamente en la variable CSS global
    document.documentElement.style.setProperty('--color-blue-mid', currentCompany.accent);
    
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

    // Actualizar el logo corporativo (iniciales) en la barra lateral
    const brandLogoEl = document.querySelector('.brand-logo');
    if (brandLogoEl) {
      brandLogoEl.textContent = getCompanyInitials(currentCompany.name);
      brandLogoEl.style.background = currentCompany.accent;
    }
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
    // Definición centralizada de todos los ítems de navegación
    // Para agregar/quitar/reordenar páginas, solo modifica este array.
    const navItems = [
      {
        href: 'dashboard.html',
        label: 'Dashboard',
        icon: '<rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect>'
      },
      {
        href: 'agenda.html',
        label: 'Agenda Citas',
        icon: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>'
      },
      {
        href: 'pacientes.html',
        label: 'Pacientes',
        icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>'
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
      },
      {
        href: 'reportes.html',
        label: 'Reportes',
        icon: '<line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line>'
      },
      {
        href: 'inventario.html',
        label: 'Inventario',
        icon: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line>'
      },
      {
        href: 'laboratorios.html',
        label: 'Laboratorios',
        icon: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"></path><line x1="7.5" y1="14" x2="16.5" y2="14"></line>'
      },
      {
        href: 'comunicaciones.html',
        label: 'Comunicaciones',
        icon: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>'
      },
      {
        href: 'procedimientos.html',
        label: 'Procedimientos',
        icon: '<path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>'
      },
      {
        href: 'configuracion.html',
        label: 'Configuración',
        icon: '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>',
        adminOnly: true
      },
      {
        href: 'usuarios.html',
        label: 'Usuarios',
        icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
        adminOnly: true
      }
    ];

    // Limpiar cualquier ítem hardcodeado que venga del HTML
    navMenu.innerHTML = '';

    // Generar los ítems dinámicamente
    const isAdmin = currentUser && currentUser.role === 'Administración';
    navItems.forEach(item => {
      // Omitir ítems exclusivos de admin si el usuario no es admin
      if (item.adminOnly && !isAdmin) return;

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
  }

  // 5. Resaltar enlace activo en el Sidebar basado en la URL
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll('.nav-item');
  
  navLinks.forEach(item => {
    const link = item.querySelector('a');
    if (link) {
      const href = link.getAttribute('href');
      if (currentPath.endsWith(href) || (currentPath.endsWith('/') && href === 'dashboard.html')) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    }
  });

  // 6. Inyectar alternancia de modo visual Claro/Oscuro en Sidebar
  const userProfileEl = document.querySelector('.user-profile');
  if (userProfileEl) {
    const SUN_ICON = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path></svg>';
    const MOON_ICON = '<svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';

    const toggleContainer = document.createElement('div');
    toggleContainer.className = 'theme-toggle-container';
    toggleContainer.style.marginTop = 'auto';
    toggleContainer.innerHTML = `
      <span class="theme-toggle-label">Modo visual</span>
      <button id="theme-toggle-btn" class="theme-toggle-btn" type="button">
        <span id="theme-icon"></span><span id="theme-text"></span>
      </button>
    `;
    userProfileEl.parentNode.insertBefore(toggleContainer, userProfileEl);
    userProfileEl.style.marginTop = '0';

    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const themeIcon = document.getElementById('theme-icon');
    const themeText = document.getElementById('theme-text');

    // Refleja el tema activo: oscuro muestra luna, claro muestra sol.
    const updateToggleButton = (isDark) => {
      themeIcon.innerHTML = isDark ? MOON_ICON : SUN_ICON;
      themeText.textContent = isDark ? 'Oscuro' : 'Claro';
    };

    updateToggleButton(document.documentElement.classList.contains('dark-theme'));

    themeToggleBtn.addEventListener('click', function() {
      const isDark = document.documentElement.classList.toggle('dark-theme');
      localStorage.setItem('credental_theme', isDark ? 'dark' : 'light');
      updateToggleButton(isDark);
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
  
  // Asignar colores según el tipo
  let bg = 'rgba(10, 26, 60, 0.9)';
  let border = '1px solid rgba(43, 138, 247, 0.4)';
  let iconColor = '#00e5b0';
  let iconSvg = '<circle cx="12" cy="12" r="10"></circle><polyline points="12 8 12 12 16 14"></polyline>'; // Reloj para info

  const currentCompany = window.auth ? window.auth.getCurrentCompany() : null;
  const activeAccent = currentCompany ? currentCompany.accent : '#2b8af7';

  if (type === 'success') {
    border = '1px solid rgba(0, 229, 176, 0.4)';
    iconColor = '#00e5b0';
    iconSvg = '<polyline points="20 6 9 17 4 12"></polyline>'; // Check
  } else if (type === 'error') {
    border = '1px solid rgba(255, 74, 90, 0.4)';
    iconColor = '#ff4a5a';
    iconSvg = '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>'; // Equis
  } else if (type === 'warning') {
    border = '1px solid rgba(255, 184, 0, 0.4)';
    iconColor = '#ffb800';
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
    <span>${message}</span>
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
