/* Deprecated: use js/vito/module.js (Fase 2.3). Kept as thin re-export if old pages load it. */
(function () {
  'use strict';
  if (!window.VitoCredental && console && console.warn) {
    console.warn('Vito: carga js/vito/module.js (connector.js está deprecado).');
  }
})();
