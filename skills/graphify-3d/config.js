// graphify3d.config.js — que muestra la vista 3D.
//
// Se lee en este orden: --config, <repo>/graphify3d.config.js, y este archivo.
// Copialo al repo para configurarlo por proyecto. Las banderas de linea de
// comandos mandan sobre lo que diga aqui.
//
// El objeto de abajo debe ser JSON valido: se extrae y se parsea, no se evalua.

export default {
  // neural · galaxia · orbital · estratos · esfera ·
  // nebulosa · solar · quasar · anillos
  "view": "neural",

  // noche · abismo · pulso · tinta
  "theme": "noche",

  "maxNodes": 6000,
  "iters": 400,

  // Regiones de interfaz visibles al abrir. Vacio = solo la red neuronal, y
  // cada panel se enciende con su tecla (A, C, L, E, I; U = todas; ? = ayuda).
  // Validas: "topbar", "controls", "legend", "stats", "info".
  "chrome": [],

  // Aviso breve "? teclas" al abrir. Ponlo en false para no ver nada en absoluto.
  "hint": true,

  // Accesos rapidos. Cada uno aisla los nodos cuyo id o archivo contenga
  // alguno de los terminos. Los que no encuentran nada se omiten solos.
  // "Mayor nexo" se calcula siempre y no hace falta declararlo.
  "shortcuts": [
    { "label": "Vito",      "match": ["vito"] },
    { "label": "OnRoute",   "match": ["onroute", "onserve"] },
    { "label": "OnStock",   "match": ["onstock"] },
    { "label": "Credental", "match": ["credental"] }
  ]
};
