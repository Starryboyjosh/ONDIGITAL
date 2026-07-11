/* ==========================================================================
   MODKIT (JS) — espejo del contrato modules/modkit (Fase 2)
   Catálogo de módulos de negocio en el navegador (Credental).
   ========================================================================== */
(function (global) {
  'use strict';

  function Catalog() {
    this._byId = Object.create(null);
  }

  Catalog.prototype.register = function (mod) {
    if (!mod || !mod.id) throw new Error('modkit: module.id es obligatorio');
    if (this._byId[mod.id]) throw new Error('modkit: módulo duplicado ' + mod.id);
    this._byId[mod.id] = mod;
    return this;
  };

  Catalog.prototype.get = function (id) {
    return this._byId[id] || null;
  };

  Catalog.prototype.list = function () {
    return Object.keys(this._byId).sort().map(function (k) {
      return this._byId[k];
    }.bind(this));
  };

  Catalog.prototype.infos = function () {
    return this.list().map(function (m) {
      return {
        id: m.id,
        name: m.name,
        version: m.version || '0.0.0',
        description: m.description || '',
        capabilities: (m.capabilities || []).slice()
      };
    });
  };

  global.Modkit = {
    Kind: { Query: 'query', Action: 'action' },
    Catalog: Catalog,
    /** Catálogo global de la suite Credental en esta pestaña */
    catalog: new Catalog()
  };
})(window);
