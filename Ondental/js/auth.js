/* ==========================================================================
   AUTH.JS - GUARDIÁN DE SEGURIDAD Y ACCESO DE USUARIOS
   Gestiona la autenticación, inicio y cierre de sesión de usuarios clínicos
   ========================================================================== */

(function() {
  const SESSION_KEY = 'ondental_session';

  window.auth = {
    // Retorna todos los usuarios del sistema
    getValidUsers: () => {
      return window.db ? window.db.getUsers() : [];
    },

    // Intenta iniciar sesión con usuario y contraseña
    login: (username, password) => {
      const user = window.db ? window.db.getUser(username) : null;
      
      // Validamos contra la contraseña del usuario (por defecto "1234")
      if (user && (user.password === password || (!user.password && password === '1234'))) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({
          username: user.username,
          name: user.name,
          role: user.role,
          avatar: user.avatar,
          companyId: user.companyId,
          loginTime: Date.now()
        }));
        return { success: true };
      }
      return { success: false, message: 'Usuario o contraseña incorrectos.' };
    },

    // Retorna los datos del usuario logueado actualmente
    getCurrentUser: () => {
      const session = sessionStorage.getItem(SESSION_KEY);
      return session ? JSON.parse(session) : null;
    },

    // Retorna la empresa del usuario logueado actualmente
    getCurrentCompany: () => {
      const user = window.auth.getCurrentUser();
      if (user && window.db && window.db.getCompany) {
        return window.db.getCompany(user.companyId);
      }
      return null;
    },

    // Cierra la sesión activa y redirige al login
    logout: () => {
      sessionStorage.removeItem(SESSION_KEY);
      window.location.href = 'index.html';
    },

    // Guardián de Ruta: Comprueba si hay una sesión activa.
    // Si no la hay y no se está en la página de login, redirige.
    checkSession: () => {
      const user = window.auth.getCurrentUser();
      const isLoginPage = window.location.pathname.endsWith('index.html') || 
                          window.location.pathname === '/' || 
                          window.location.pathname.endsWith('ondental/') ||
                          window.location.pathname.endsWith('ondental/index.html');

      if (!user && !isLoginPage) {
        // Redirigir de inmediato al login con parámetro de error
        window.location.href = 'index.html?error=unauthorized';
      } else if (user && isLoginPage) {
        // Si ya está logueado e intenta ir al login, redirige al dashboard
        window.location.href = 'dashboard.html';
      }
    }
  };

  // Ejecución inmediata del guardián para evitar parpadeo de contenido desprotegido
  window.auth.checkSession();
})();
