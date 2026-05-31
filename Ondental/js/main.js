/* ==========================================================================
   MAIN.JS - COMPORTAMIENTOS COMUNES Y COMPONENTES GLOBALES
   Controla barras laterales, notificaciones toast y perfiles de sesión
   con soporte para branding dinámico multi-empresa.
   ========================================================================== */

// 0. Autoejecución inmediata para restaurar el tema visual sin parpadeos
(function() {
  const savedTheme = localStorage.getItem('ondental_theme');
  if (savedTheme === 'light') {
    document.documentElement.classList.add('light-theme');
  }
})();

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

    // Actualizar logo o emoji corporativo en la barra lateral
    const brandLogoEl = document.querySelector('.brand-logo');
    if (brandLogoEl) {
      const logos = {
        'credental': '💎',
        'ondental-central': '🏥',
        'sonrisa-perfecta': '✨',
        'dentpro': '💼'
      };
      brandLogoEl.textContent = logos[currentCompany.id] || '🦷';
      brandLogoEl.style.boxShadow = `0 0 15px ${currentCompany.accent}73`;
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

  // 4.5. Inyectar dinámicamente el enlace de "Usuarios" para administradores
  const navMenu = document.querySelector('.nav-menu');
  if (navMenu && currentUser && currentUser.role === 'Administración') {
    const userLi = document.createElement('li');
    userLi.className = 'nav-item';
    userLi.innerHTML = `
      <a href="usuarios.html">
        <svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
        <span>Usuarios</span>
      </a>
    `;
    navMenu.appendChild(userLi);
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
    const toggleContainer = document.createElement('div');
    toggleContainer.className = 'theme-toggle-container';
    toggleContainer.style.cssText = 'margin-top: auto; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center; padding: 0 5px;';
    toggleContainer.innerHTML = `
      <span style="font-size: 0.8rem; color: var(--color-gray); font-weight: 500;">Modo Visual</span>
      <button id="theme-toggle-btn" style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-glow); border-radius: 20px; padding: 4px 10px; display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.75rem; color: var(--color-white); font-weight: 600; transition: all 0.3s ease;">
        <span id="theme-icon">🌙</span> <span id="theme-text">Oscuro</span>
      </button>
    `;
    userProfileEl.parentNode.insertBefore(toggleContainer, userProfileEl);
    userProfileEl.style.marginTop = '0';

    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const themeIcon = document.getElementById('theme-icon');
    const themeText = document.getElementById('theme-text');

    const updateToggleButton = (isLight) => {
      if (isLight) {
        themeIcon.textContent = '☀️';
        themeText.textContent = 'Claro';
        themeToggleBtn.style.background = 'rgba(0,0,0,0.05)';
        themeToggleBtn.style.color = '#1e293b';
        themeToggleBtn.style.borderColor = 'rgba(0,0,0,0.15)';
      } else {
        themeIcon.textContent = '🌙';
        themeText.textContent = 'Oscuro';
        themeToggleBtn.style.background = 'rgba(255,255,255,0.05)';
        themeToggleBtn.style.color = '#ffffff';
        themeToggleBtn.style.borderColor = 'var(--border-glow)';
      }
    };

    // Inicializar estado del botón
    const isLight = document.documentElement.classList.contains('light-theme');
    updateToggleButton(isLight);

    themeToggleBtn.addEventListener('click', function() {
      const wasLight = document.documentElement.classList.contains('light-theme');
      if (wasLight) {
        document.documentElement.classList.remove('light-theme');
        localStorage.setItem('ondental_theme', 'dark');
        updateToggleButton(false);
      } else {
        document.documentElement.classList.add('light-theme');
        localStorage.setItem('ondental_theme', 'light');
        updateToggleButton(true);
      }
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
