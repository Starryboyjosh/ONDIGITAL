/* ==========================================================================
   MAIN.JS - COMPORTAMIENTOS COMUNES Y COMPONENTES GLOBALES
   Controla barras laterales, notificaciones toast y perfiles de sesión
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function() {
  // 1. Verificar Sesión Inicialmente (redundancia de seguridad)
  if (window.auth) {
    window.auth.checkSession();
  }

  // 2. Cargar Perfil de Usuario en el Sidebar
  const currentUser = window.auth ? window.auth.getCurrentUser() : null;
  if (currentUser) {
    const avatarEl = document.getElementById('sidebar-user-avatar');
    const nameEl = document.getElementById('sidebar-user-name');
    const roleEl = document.getElementById('sidebar-user-role');

    if (avatarEl) avatarEl.textContent = currentUser.avatar || 'U';
    if (nameEl) nameEl.textContent = currentUser.name || 'Usuario';
    if (roleEl) roleEl.textContent = currentUser.role || 'Clínico';
  }

  // 3. Vincular botón de Logout
  const logoutBtn = document.getElementById('sidebar-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function(e) {
      e.preventDefault();
      if (window.auth) {
        window.auth.logout();
      }
    });
  }

  // 4. Resaltar enlace activo en el Sidebar basado en la URL
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
