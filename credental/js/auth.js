/* ==========================================================================
   AUTH.JS - GUARDIÁN DE SEGURIDAD Y ACCESO DE USUARIOS
   Gestiona la autenticación, inicio y cierre de sesión de usuarios clínicos
   ========================================================================== */

(function() {
  const SESSION_KEY = 'credental_session';

  window.auth = {
    // Retorna todos los usuarios del sistema
    getValidUsers: () => {
      return window.db ? window.db.getUsers() : [];
    },

    // Búsqueda pública mínima para el branding dinámico del login: solo
    // expone la empresa y el nombre visible, nunca el hash de contraseña
    // ni el resto del registro de usuario.
    lookupMarca: (username) => {
      if (!window.db || !username) return null;
      const user = window.db.getUser ? window.db.getUser(username) : null;
      if (!user) return null;
      const company = window.db.getCompany ? window.db.getCompany(user.companyId) : null;
      return {
        empresa: user.companyId,
        nombreVisible: (company && company.name) || null
      };
    },

    // Función de hash SHA-256 síncrona
    hashPassword: (pwd) => {
      function rightRotate(value, amount) {
        return (value>>>amount) | (value<<(32-amount));
      }
      var mathPow = Math.pow;
      var maxWord = mathPow(2, 32);
      var lengthProperty = 'length';
      var i, j;
      var result = '';
      var words = [];
      var asciiLength = pwd[lengthProperty];
      var hash = [];
      var k = [];
      var primeCounter = 0;
      var isComposite = {};
      for (var candidate = 2; primeCounter < 64; candidate++) {
        if (!isComposite[candidate]) {
          for (i = 0; i < 313; i += candidate) {
            isComposite[i] = 1;
          }
          hash[primeCounter] = (mathPow(candidate, .5)*maxWord)|0;
          k[primeCounter++] = (mathPow(candidate, 1/3)*maxWord)|0;
        }
      }
      pwd += '\x80';
      while (pwd[lengthProperty] % 64 - 56) pwd += '\x00';
      for (i = 0; i < pwd[lengthProperty]; i++) {
        j = pwd.charCodeAt(i);
        if (j >> 8) return '';
        words[i >> 2] |= j << (24 - (i % 4) * 8);
      }
      words[words[lengthProperty]] = ((asciiLength * 8) / maxWord) | 0;
      words[words[lengthProperty]] = (asciiLength * 8);
      for (j = 0; j < words[lengthProperty]; j += 16) {
        var w = words.slice(j, j + 16);
        var oldHash = hash.slice(0);
        hash = hash.slice(0, 8);
        for (i = 0; i < 64; i++) {
          var w15 = w[i - 15], w2 = w[i - 2];
          var a = hash[0], e = hash[4];
          var temp1 = hash[7]
            + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
            + ((e & hash[5]) ^ (~e & hash[6]))
            + k[i]
            + (w[i] = (i < 16) ? w[i] : (
                w[i - 16]
                + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
                + w[i - 7]
                + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
              ) | 0
            );
          var temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
            + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
          hash = [(temp1 + temp2)|0].concat(hash);
          hash[4] = (hash[4] + temp1)|0;
        }
        for (i = 0; i < 8; i++) {
          hash[i] = (hash[i] + oldHash[i]) | 0;
        }
      }
      for (i = 0; i < 8; i++) {
        var val = hash[i];
        if (val < 0) val += maxWord;
        var hex = val.toString(16);
        while (hex[lengthProperty] < 8) hex = '0' + hex;
        result += hex;
      }
      return result;
    },

    // Intenta iniciar sesión con usuario y contraseña
    login: (username, password) => {
      const user = window.db ? window.db.getUser(username) : null;
      const hashedInput = window.auth.hashPassword(password);
      
      // Validamos contra la contraseña del usuario almacenada (que ya viene hasheada de la base de datos)
      if (user && user.password === hashedInput) {
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

    // Vuelve a leer del registro los datos visibles del usuario en sesión, sin
    // tocar la contraseña. Se usa al editar el propio perfil: de lo contrario
    // la barra lateral seguiría mostrando el nombre y el rol anteriores hasta
    // el siguiente inicio de sesión.
    refreshSession: () => {
      const session = window.auth.getCurrentUser();
      if (!session || !window.db || !window.db.getUser) return null;
      const user = window.db.getUser(session.username);
      if (!user) return session;
      const actualizada = Object.assign({}, session, {
        name: user.name,
        role: user.role,
        avatar: user.avatar,
        companyId: user.companyId
      });
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(actualizada));
      return actualizada;
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

    // Compatibilidad con sesiones antiguas que guardaban el rol como "admin".
    isAdmin: (user) => Boolean(user && ['Administración', 'admin'].includes(user.role)),

    // Cierra la sesión activa y redirige al login
    logout: () => {
      sessionStorage.removeItem(SESSION_KEY);
      window.location.href = 'index.html';
    },

    // Guardián de Ruta: Comprueba si hay una sesión activa.
    // Si no la hay y no se está en la página de login, redirige.
    checkSession: () => {
      const user = window.auth.getCurrentUser();
      const pathLower = window.location.pathname.toLowerCase();
      const isLoginPage = pathLower.endsWith('index.html') || 
                          window.location.pathname === '/' || 
                          pathLower.endsWith('credental/') ||
                          pathLower.endsWith('credental/index.html');

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
