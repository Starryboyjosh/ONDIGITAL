/* ==========================================================================
   Capa de datos Credental — documentación operativa en código
   Política de la demo: local-first (sessionStorage). Firebase no se carga
   en las páginas actuales y requiere una configuración explícita futura.
   ========================================================================== */
(function (global) {
  'use strict';

  /**
   * Estado de la capa de datos para módulos / Vito / UI.
   * No reemplaza window.db: solo reporta modo y disponibilidad.
   */
  function status() {
    const hasDB = !!(global.db && typeof global.db.getPatients === 'function');
    const hasFirebase = !!(global.firebaseConnector);
    let firebaseReady = false;
    try {
      firebaseReady = hasFirebase && typeof global.firebaseConnector.init === 'function';
    } catch (_) { /* */ }

    return {
      mode: 'local-first',
      local_first: true,
      storage: 'sessionStorage',
      prefix: 'credental_',
      db_ready: hasDB,
      cloud_sync: firebaseReady ? 'explicit' : 'disabled',
      notes: [
        'Lectura/escritura siempre locales primero.',
        'La demo no carga un conector cloud por defecto.',
        'La clínica sigue operando sin red en este prototipo.'
      ]
    };
  }

  global.CredentalData = {
    status: status
  };
})(window);
