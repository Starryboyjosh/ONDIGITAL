// graphify3d.config.js — vista 3D del grafo de ONDIGITAL.
//
// Se lee en este orden: --config, <repo>/graphify3d.config.js (este archivo),
// y el config.js por defecto de la skill. Las banderas de linea de comandos
// mandan sobre lo que diga aqui.
//
// El objeto de abajo debe ser JSON valido: se extrae y se parsea, no se evalua.

export default {
  // neural · galaxia · orbital · estratos · esfera ·
  // nebulosa · solar · quasar · anillos
  // "neural": con 4022 nodos y 247 comunidades el layout por fuerzas ya separa
  // solo los tres productos, porque casi no se llaman entre si. Export aparte
  // para las otras 8 (ver graphify-out/red-3d-*.html) o cambia de vista en
  // caliente con las teclas 1-9 dentro de cualquiera de ellas.
  "view": "neural",

  // noche · abismo · pulso · tinta
  // "noche" y no el verdigris "pulso" de la marca: con 244 comunidades, cada
  // una con su hue, el fondo casi negro es el unico que les deja sitio para
  // contrastar. Es la misma razon por la que lo usa el grafo de Holograma.
  "theme": "noche",

  "maxNodes": 6000,
  "iters": 400,

  // Vacio = solo la red al abrir. Cada panel se enciende con su tecla
  // (A, C, L, E, I; U = todas; ? = ayuda).
  "chrome": [],
  "hint": true,

  // Accesos rapidos por producto y por subsistema real. Cada uno aisla los
  // nodos cuyo id o archivo contenga alguno de los terminos; el numero entre
  // parentesis es lo que aisla hoy. "Mayor nexo" se calcula siempre.
  "shortcuts": [
    { "label": "Credental",    "match": ["credental"] },
    { "label": "OnStock",      "match": ["onstock"] },
    { "label": "OnRoute",      "match": ["onroute", "onserve"] },
    { "label": "Vito",         "match": ["vito"] },
    { "label": "Landing",      "match": ["pagina_web_original"] },
    { "label": "Servidor Node","match": ["onstock/server"] },
    { "label": "Go (referencia)", "match": ["onstock/internal", "onstock/main.go", "modules/"] },
    { "label": "Torre y flota","match": ["torre", "camion", "simulador_flota"] },
    { "label": "Conductores",  "match": ["conductor"] },
    { "label": "Cobro y saldo","match": ["liquidacion", "hoja_cobro", "cobranza", "cobrable"] },
    { "label": "Sistema visual","match": ["design-system", "tokens", "palette"] },
    { "label": "Pruebas",      "match": ["test", "prueba"] }
  ]
};
