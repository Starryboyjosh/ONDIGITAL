/* ==========================================================================
   Capa híbrida Credental (Fase 2.3) — documentación operativa en código
   Política: local-first (sessionStorage) + sync opcional Firebase (db.js).
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
      mode: 'hybrid',
      local_first: true,
      storage: 'sessionStorage',
      prefix: 'credental_',
      db_ready: hasDB,
      cloud_sync: firebaseReady ? 'optional' : 'unavailable',
      notes: [
        'Lectura/escritura siempre locales primero.',
        'Si Firebase está configurado, db.js sincroniza en segundo plano.',
        'Sin red o sin Firebase la clínica sigue operando (demo / Starter).'
      ]
    };
  }

  global.CredentalData = {
    status: status
  };
})(window);
