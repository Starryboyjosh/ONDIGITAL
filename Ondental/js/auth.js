/* ==========================================================================
   AUTH.JS - GUARDIÁN DE SEGURIDAD Y ACCESO DE USUARIOS
   Gestiona la autenticación, inicio y cierre de sesión de usuarios clínicos
   ========================================================================== */

(function() {
  const SESSION_KEY = 'ondental_session';

  // Usuarios válidos del sistema (Demo)
  const validUsers = [
    { username: 'admin', name: 'Administrador General', role: 'Administración', avatar: 'A' },
    { username: 'dentista', name: 'Dr. Sebastián Escoto', role: 'Dentista Principal', avatar: 'SE' }
  ];

  window.auth = {
    // Intenta iniciar sesión con usuario y contraseña
    login: (username, password) => {
      const user = validUsers.find(u => u.username === username.trim().toLowerCase());
      
      // En este demo clínico, la contraseña universal es "1234"
      if (user && password === '1234') {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({
          username: user.username,
          name: user.name,
          role: user.role,
          avatar: user.avatar,
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
