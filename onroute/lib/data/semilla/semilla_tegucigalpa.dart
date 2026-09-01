/// Semilla de demostración: una ruta de autoventa en Tegucigalpa / Comayagüela.
///
/// Aquí vive un catálogo típico de distribuidora hondureña, tres listas de
/// clientes de pulpería, una flota chica de camiones y una ruta del día ya
/// armada, en dos variantes (recién cargada / a medio recorrido). Sirve para
/// tener algo con qué probar la UI y la lógica de dominio sin depender de
/// datos reales de ningún cliente de ONDIGITAL.
///
/// Aviso de honestidad sobre las coordenadas: cada [LatLng] de este archivo
/// —clientes, base de operaciones, rastro de camión— es un punto **aproximado**
/// colocado a mano dentro de la colonia real que se nombra (Comayagüela,
/// Col. Kennedy, Col. Miraflores, Barrio La Granja, Mercado Zonal Belén,
/// Bulevar Fuerzas Armadas, El Pedregal, Col. Torocagua, La Vega, Barrio
/// Abajo, Col. Villa Nueva, Bulevar Morazán, Col. Alameda, Comayagüela 6a
/// avenida, Mercado San Isidro). No son direcciones geocodificadas ni
/// verificadas en campo: alcanzan para simular una ruta y dibujar el mapa,
/// pero **antes de cualquier uso en producción hay que reemplazarlas por
/// coordenadas reales**, obtenidas por geocodificación o por levantamiento
/// físico de cada negocio.
///
/// Los nombres de pulperías, teléfonos y RTN son ficticios, construidos para
/// sonar plausibles en el contexto hondureño; no corresponden a negocios ni
/// personas reales. Los teléfonos usan los rangos de demostración
/// +504 2200-xxxx (fijo) y +504 9800-xxxx (celular).
library;

import 'package:latlong2/latlong.dart';

import '../../domain/models/bodega.dart';
import '../../domain/models/camion.dart';
import '../../domain/models/cliente.dart';
import '../../domain/models/dinero.dart';
import '../../domain/models/parada.dart';
import '../../domain/models/producto.dart';
import '../../domain/models/ruta.dart';

// ---------------------------------------------------------------------------
// Catálogo: lo que trae la distribuidora en el camión.
// ---------------------------------------------------------------------------

/// Catálogo base de una ruta de autoventa hondureña, típico de lo que se le
/// vende a una pulpería: harina, manteca, azúcar, café, frijoles, aceite,
/// jabón, detergente, galletas, refrescos, agua purificada y masa de maíz.
/// Precios de venta al detalle por bulto, con ISV incluido, a precios
/// hondureños plausibles de 2026.
final Map<String, Producto> catalogoBase = <String, Producto>{
  'HAR-001': Producto(
    sku: 'HAR-001',
    nombre: 'Harina de Trigo Suave 25 lb',
    marca: 'Doña Blanca',
    unidad: Unidad.saco,
    precio: Dinero.desdeDecimal(419.50),
  ),
  'MAN-001': Producto(
    sku: 'MAN-001',
    nombre: 'Manteca Vegetal 4 lb (caja de 6)',
    marca: 'La Vaquita',
    unidad: Unidad.caja,
    precio: Dinero.desdeDecimal(785.00),
  ),
  'AZU-001': Producto(
    sku: 'AZU-001',
    nombre: 'Azúcar Blanca 50 lb',
    marca: 'Ingenio Dorado',
    unidad: Unidad.saco,
    precio: Dinero.desdeDecimal(1150.00),
  ),
  'CAF-001': Producto(
    sku: 'CAF-001',
    nombre: 'Café Molido 1 lb (caja de 24)',
    marca: 'Copán de Oro',
    unidad: Unidad.caja,
    precio: Dinero.desdeDecimal(1385.50),
  ),
  'FRI-001': Producto(
    sku: 'FRI-001',
    nombre: 'Frijol Rojo Seda 25 lb',
    marca: 'Cosecha Catracha',
    unidad: Unidad.saco,
    precio: Dinero.desdeDecimal(975.00),
  ),
  'ACE-001': Producto(
    sku: 'ACE-001',
    nombre: 'Aceite Vegetal Bidón 5 galones',
    marca: 'Ideal Dorado',
    unidad: Unidad.bidon,
    precio: Dinero.desdeDecimal(850.00),
  ),
  'JAB-001': Producto(
    sku: 'JAB-001',
    nombre: 'Jabón de Lavar 400 g (fardo de 24)',
    marca: 'Espuma Real',
    unidad: Unidad.fardo,
    precio: Dinero.desdeDecimal(478.50),
  ),
  'DET-001': Producto(
    sku: 'DET-001',
    nombre: 'Detergente en Polvo 1 kg (paq. de 12)',
    marca: 'Blancura Sol',
    unidad: Unidad.paquete,
    precio: Dinero.desdeDecimal(540.00),
  ),
  'GAL-001': Producto(
    sku: 'GAL-001',
    nombre: 'Galletas María (caja de 24 paq.)',
    marca: 'Doradita',
    unidad: Unidad.caja,
    precio: Dinero.desdeDecimal(312.50),
  ),
  'REF-001': Producto(
    sku: 'REF-001',
    nombre: 'Refresco de Cola 12 oz (caja de 24)',
    marca: 'Tropi Kola',
    unidad: Unidad.caja,
    precio: Dinero.desdeDecimal(258.00),
  ),
  'AGU-001': Producto(
    sku: 'AGU-001',
    nombre: 'Agua Purificada 500 ml (fardo de 24)',
    marca: 'Cristal Azul',
    unidad: Unidad.fardo,
    precio: Dinero.desdeDecimal(184.50),
  ),
  'MAS-001': Producto(
    sku: 'MAS-001',
    nombre: 'Masa de Maíz Precocida 20 lb',
    marca: 'Doña Maíz',
    unidad: Unidad.saco,
    precio: Dinero.desdeDecimal(339.00),
  ),
};

// ---------------------------------------------------------------------------
// Clientes: pulperías, súpers y distribuidoras de tres rutas de Tegucigalpa
// y Comayagüela.
// ---------------------------------------------------------------------------

/// Ruta 1 · Comayagüela: catorce clientes alrededor del centro de
/// Comayagüela, Barrio Abajo, La Vega y Villa Nueva.
const List<Cliente> clientesRuta1 = <Cliente>[
  Cliente(
    id: 'cli-r1-01',
    nombre: 'Pulpería La Esperanza',
    tipo: TipoCliente.pulperia,
    direccion: 'Comayagüela, 6a avenida, cerca del parque Concordia',
    referencia: 'Del parque Concordia, media cuadra al sur',
    telefono: '+504 2200-4411',
    posicion: LatLng(14.0965, -87.2135),
  ),
  Cliente(
    id: 'cli-r1-02',
    nombre: 'Distribuidora El Puente',
    tipo: TipoCliente.distribuidora,
    direccion: 'Comayagüela, Barrio Abajo, cerca del puente Mallol',
    referencia: 'Frente al puente Mallol, portón verde',
    telefono: '+504 2200-5522',
    rtn: '08019025001234',
    posicion: LatLng(14.0978, -87.2020),
  ),
  Cliente(
    id: 'cli-r1-03',
    nombre: 'Pulpería Doña Chila',
    tipo: TipoCliente.pulperia,
    direccion: 'Comayagüela, Mercado San Isidro',
    referencia: 'Dentro del Mercado San Isidro, local 14',
    posicion: LatLng(14.0925, -87.2152),
  ),
  Cliente(
    id: 'cli-r1-04',
    nombre: 'Mini Mercado San Isidro',
    tipo: TipoCliente.mercado,
    direccion: 'Mercado San Isidro, entrada principal',
    referencia: 'Entrada principal del mercado, puesto 3',
    telefono: '+504 9800-1123',
    posicion: LatLng(14.0931, -87.2144),
  ),
  Cliente(
    id: 'cli-r1-05',
    nombre: 'Pulpería El Progreso',
    tipo: TipoCliente.pulperia,
    direccion: 'Comayagüela, colonia La Vega',
    referencia: 'De la iglesia La Vega, dos cuadras abajo',
    telefono: '+504 2200-6634',
    posicion: LatLng(14.1071, -87.2052),
  ),
  Cliente(
    id: 'cli-r1-06',
    nombre: 'Abarrotería Doña Reina',
    tipo: TipoCliente.pulperia,
    direccion: 'Comayagüela, Barrio La Granja',
    referencia: 'Contiguo a la escuela Froilán Turcios',
    posicion: LatLng(14.0868, -87.1982),
  ),
  Cliente(
    id: 'cli-r1-07',
    nombre: 'Mini Mercado Belén',
    tipo: TipoCliente.mercado,
    direccion: 'Mercado Zonal Belén, ala norte',
    referencia: 'Mercado Zonal Belén, ala norte',
    telefono: '+504 9800-2245',
    posicion: LatLng(14.1012, -87.2108),
  ),
  Cliente(
    id: 'cli-r1-08',
    nombre: 'Pulpería San Judas',
    tipo: TipoCliente.pulperia,
    direccion: 'Comayagüela, colonia Villa Nueva',
    referencia: 'Del box de Villa Nueva, 30 varas al oeste',
    telefono: '+504 2200-7789',
    posicion: LatLng(14.0680, -87.2142),
  ),
  Cliente(
    id: 'cli-r1-09',
    nombre: 'Súper Mini El Trébol',
    tipo: TipoCliente.superMini,
    direccion: 'Comayagüela, 6a avenida esquina calle El Trébol',
    referencia: 'Sobre la 6a avenida, esquina con calle El Trébol',
    telefono: '+504 2200-3312',
    posicion: LatLng(14.0972, -87.2130),
  ),
  Cliente(
    id: 'cli-r1-10',
    nombre: 'Pulpería La Providencia',
    tipo: TipoCliente.pulperia,
    direccion: 'Comayagüela, Barrio Abajo',
    referencia: 'Del antiguo cine Clamer, una cuadra al norte',
    posicion: LatLng(14.0980, -87.2010),
  ),
  Cliente(
    id: 'cli-r1-11',
    nombre: 'Distribuidora Hermanos Zúniga',
    tipo: TipoCliente.distribuidora,
    direccion: 'Comayagüela, zona industrial',
    referencia: 'Bodega industrial, portón azul sobre la calle principal',
    telefono: '+504 2200-8890',
    rtn: '08019025005678',
    posicion: LatLng(14.0948, -87.2178),
  ),
  Cliente(
    id: 'cli-r1-12',
    nombre: 'Pulpería Nueva Esperanza',
    tipo: TipoCliente.pulperia,
    direccion: 'Comayagüela, colonia La Vega',
    referencia: 'Frente a la cancha de La Vega',
    telefono: '+504 9800-3367',
    posicion: LatLng(14.1080, -87.2044),
  ),
  Cliente(
    id: 'cli-r1-13',
    nombre: 'Abarrotería La Económica',
    tipo: TipoCliente.pulperia,
    direccion: 'Comayagüela, colonia Villa Nueva',
    referencia: 'De la parada de buses, 20 varas al sur',
    posicion: LatLng(14.0690, -87.2130),
  ),
  Cliente(
    id: 'cli-r1-14',
    nombre: 'Pulpería Doña Tere',
    tipo: TipoCliente.pulperia,
    direccion: 'Comayagüela, Barrio La Granja',
    referencia: 'Casa esquinera color celeste',
    telefono: '+504 9800-4489',
    posicion: LatLng(14.0876, -87.1970),
  ),
];

/// Ruta 2 · Kennedy - Miraflores - Torocagua - El Pedregal: once clientes en
/// el eje oeste y sur de Tegucigalpa.
const List<Cliente> clientesRuta2 = <Cliente>[
  Cliente(
    id: 'cli-r2-01',
    nombre: 'Súper Mini Kennedy',
    tipo: TipoCliente.superMini,
    direccion: 'Colonia Kennedy, bulevar Kennedy',
    referencia: 'Bulevar Kennedy, frente a la posta policial',
    telefono: '+504 2200-9011',
    posicion: LatLng(14.0962, -87.2255),
  ),
  Cliente(
    id: 'cli-r2-02',
    nombre: 'Pulpería El Paraíso',
    tipo: TipoCliente.pulperia,
    direccion: 'Colonia Kennedy, bloque J',
    referencia: 'Sector Kennedy, bloque J',
    posicion: LatLng(14.0945, -87.2270),
  ),
  Cliente(
    id: 'cli-r2-03',
    nombre: 'Distribuidora Los Ángeles',
    tipo: TipoCliente.distribuidora,
    direccion: 'Colonia Miraflores, vía principal',
    referencia: 'Sobre la vía principal a Miraflores, portón gris',
    telefono: '+504 2200-1156',
    rtn: '08019025009012',
    posicion: LatLng(14.0770, -87.1885),
  ),
  Cliente(
    id: 'cli-r2-04',
    nombre: 'Pulpería La Fortuna',
    tipo: TipoCliente.pulperia,
    direccion: 'Colonia Miraflores',
    referencia: 'Cerca de la parada de buses hacia la UNAH',
    telefono: '+504 9800-5512',
    posicion: LatLng(14.0758, -87.1900),
  ),
  Cliente(
    id: 'cli-r2-05',
    nombre: 'Mini Súper Torocagua',
    tipo: TipoCliente.superMini,
    direccion: 'Colonia Torocagua, entrada principal',
    referencia: 'Entrada a Torocagua, casa con rótulo azul',
    telefono: '+504 9800-6678',
    posicion: LatLng(14.0612, -87.1870),
  ),
  Cliente(
    id: 'cli-r2-06',
    nombre: 'Pulpería El Mirador',
    tipo: TipoCliente.pulperia,
    direccion: 'El Pedregal, calle principal',
    referencia: 'El Pedregal, calle principal, casa de dos plantas',
    posicion: LatLng(14.0648, -87.1806),
  ),
  Cliente(
    id: 'cli-r2-07',
    nombre: 'Pulpería El Ranchito',
    tipo: TipoCliente.pulperia,
    direccion: 'Colonia Torocagua',
    referencia: 'Atrás de la cancha de fútbol de Torocagua',
    telefono: '+504 2200-2287',
    posicion: LatLng(14.0600, -87.1882),
  ),
  Cliente(
    id: 'cli-r2-08',
    nombre: 'Abarrotería Doña Meche',
    tipo: TipoCliente.pulperia,
    direccion: 'El Pedregal',
    referencia: 'Del box de El Pedregal, 15 varas al norte',
    telefono: '+504 9800-7734',
    posicion: LatLng(14.0635, -87.1818),
  ),
  Cliente(
    id: 'cli-r2-09',
    nombre: 'Distribuidora El Camino',
    tipo: TipoCliente.distribuidora,
    direccion: 'Colonia Kennedy, carretera de acceso',
    referencia: 'Carretera hacia Kennedy, bodega con malla ciclón',
    telefono: '+504 2200-3345',
    rtn: '08019025003456',
    posicion: LatLng(14.0950, -87.2248),
  ),
  Cliente(
    id: 'cli-r2-10',
    nombre: 'Pulpería San Miguel',
    tipo: TipoCliente.pulperia,
    direccion: 'Colonia Miraflores',
    referencia: 'Frente a la capilla San Miguel',
    posicion: LatLng(14.0778, -87.1898),
  ),
  Cliente(
    id: 'cli-r2-11',
    nombre: 'Pulpería Vista Hermosa',
    tipo: TipoCliente.pulperia,
    direccion: 'El Pedregal, subida a Vista Hermosa',
    referencia: 'En la subida hacia Vista Hermosa, casa amarilla',
    telefono: '+504 9800-8845',
    posicion: LatLng(14.0655, -87.1798),
  ),
];

/// Ruta 3 · Morazán - Alameda - Fuerzas Armadas: nueve clientes en el eje
/// norte de Tegucigalpa.
const List<Cliente> clientesRuta3 = <Cliente>[
  Cliente(
    id: 'cli-r3-01',
    nombre: 'Súper Mini Morazán',
    tipo: TipoCliente.superMini,
    direccion: 'Bulevar Morazán',
    referencia: 'Sobre el bulevar Morazán, junto a la gasolinera',
    telefono: '+504 2200-4423',
    posicion: LatLng(14.0888, -87.1885),
  ),
  Cliente(
    id: 'cli-r3-02',
    nombre: 'Pulpería Doña Rosa',
    tipo: TipoCliente.pulperia,
    direccion: 'Colonia Alameda',
    referencia: 'Colonia Alameda, segunda entrada, casa con verja negra',
    posicion: LatLng(14.0805, -87.1935),
  ),
  Cliente(
    id: 'cli-r3-03',
    nombre: 'Abarrotería El Ahorro',
    tipo: TipoCliente.pulperia,
    direccion: 'Bulevar Fuerzas Armadas',
    referencia: 'Cerca de la rotonda Metrocentro',
    telefono: '+504 9800-9956',
    posicion: LatLng(14.1028, -87.1962),
  ),
  Cliente(
    id: 'cli-r3-04',
    nombre: 'Pulpería La Unión',
    tipo: TipoCliente.pulperia,
    direccion: 'Colonia Alameda',
    referencia: 'Frente a la iglesia evangélica Alameda',
    telefono: '+504 2200-5567',
    posicion: LatLng(14.0795, -87.1948),
  ),
  Cliente(
    id: 'cli-r3-05',
    nombre: 'Pulpería El Buen Precio',
    tipo: TipoCliente.pulperia,
    direccion: 'Bulevar Morazán',
    referencia: 'Junto al centro comercial pequeño del bulevar',
    posicion: LatLng(14.0892, -87.1875),
  ),
  Cliente(
    id: 'cli-r3-06',
    nombre: 'Distribuidora Hermanos Cruz',
    tipo: TipoCliente.distribuidora,
    direccion: 'Bulevar Fuerzas Armadas',
    referencia: 'Bodega grande, portón corredizo blanco',
    telefono: '+504 2200-6612',
    rtn: '08019025007890',
    posicion: LatLng(14.1038, -87.1950),
  ),
  Cliente(
    id: 'cli-r3-07',
    nombre: 'Súper Mini Alameda',
    tipo: TipoCliente.superMini,
    direccion: 'Colonia Alameda',
    referencia: 'Colonia Alameda, sobre la calle principal',
    telefono: '+504 9800-1078',
    posicion: LatLng(14.0808, -87.1925),
  ),
  Cliente(
    id: 'cli-r3-08',
    nombre: 'Pulpería La Alborada',
    tipo: TipoCliente.pulperia,
    direccion: 'Bulevar Morazán',
    referencia: 'Del semáforo del bulevar, una cuadra al este',
    posicion: LatLng(14.0878, -87.1898),
  ),
  Cliente(
    id: 'cli-r3-09',
    nombre: 'Pulpería Monte Sinaí',
    tipo: TipoCliente.pulperia,
    direccion: 'Bulevar Fuerzas Armadas, sector Monte Sinaí',
    referencia: 'Sector Monte Sinaí, casa con tienda al frente',
    telefono: '+504 9800-2234',
    posicion: LatLng(14.1020, -87.1970),
  ),
];

// ---------------------------------------------------------------------------
// Flota: los tres camiones que salen cada mañana.
// ---------------------------------------------------------------------------

/// Base de operaciones: una bodega en la zona industrial de Comayagüela, de
/// donde salen y a donde regresan los tres camiones.
const LatLng _baseOperaciones = LatLng(14.0995, -87.2190);

/// Flota chica de tres camiones. El Rojo va cargado y en ruta (es el que usa
/// [rutaDelDia]); los otros dos amanecen en base.
final List<Camion> camionesFlota = <Camion>[
  Camion(
    id: 'cam-01',
    placa: 'PCX 1234',
    apodo: 'El Rojo',
    conductor: 'Marvin Aguilar',
    estado: EstadoCamion.enRuta,
    capacidadBultos: 240,
    rastro: Rastro(
      posicion: const LatLng(14.0940, -87.2045),
      rumbo: 330,
      velocidadKmH: 22,
      momento: DateTime(2026, 8, 28, 9, 40),
    ),
  ),
  Camion(
    id: 'cam-02',
    placa: 'PAA 8821',
    apodo: 'La Mula',
    conductor: 'Denia Zelaya',
    estado: EstadoCamion.enBase,
    capacidadBultos: 200,
    rastro: Rastro(
      posicion: _baseOperaciones,
      rumbo: 0,
      velocidadKmH: 0,
      momento: DateTime(2026, 8, 28, 7),
    ),
  ),
  Camion(
    id: 'cam-03',
    placa: 'PBD 5567',
    apodo: 'El Chele',
    conductor: 'Wilmer Cruz',
    estado: EstadoCamion.enBase,
    capacidadBultos: 180,
    rastro: Rastro(
      posicion: _baseOperaciones,
      rumbo: 0,
      velocidadKmH: 0,
      momento: DateTime(2026, 8, 28, 7),
    ),
  ),
];

// ---------------------------------------------------------------------------
// Bodega rodante: la parrilla de El Rojo, en dos momentos del día.
// ---------------------------------------------------------------------------

/// Una posición de la parrilla en el molde de carga de la mañana: dónde va,
/// qué SKU, cuánto sale y cuánto ya se vendió cuando la ruta va a medio
/// camino (variante 1). En la variante 0 (recién cargado) [vendidoEnRuta] no
/// se usa: todas las casillas salen en cero.
typedef _CasillaPlantilla = ({
  int fila,
  int columna,
  String sku,
  int salida,
  int vendidoEnRuta,
});

/// Parrilla de 6 filas x 4 columnas (24 casillas), dos casillas por SKU. Las
/// cantidades de [vendidoEnRuta] coinciden con lo entregado en las primeras
/// seis paradas ya cerradas de [rutaDelDia] cuando `variante: 1`, para que la
/// bodega y la ruta cuenten la misma historia.
const List<_CasillaPlantilla> _plantillaBodega = <_CasillaPlantilla>[
  (fila: 0, columna: 0, sku: 'HAR-001', salida: 20, vendidoEnRuta: 5),
  (fila: 0, columna: 1, sku: 'HAR-001', salida: 18, vendidoEnRuta: 0),
  (fila: 0, columna: 2, sku: 'AZU-001', salida: 16, vendidoEnRuta: 1),
  (fila: 0, columna: 3, sku: 'AZU-001', salida: 14, vendidoEnRuta: 0),
  (fila: 1, columna: 0, sku: 'FRI-001', salida: 18, vendidoEnRuta: 2),
  (fila: 1, columna: 1, sku: 'FRI-001', salida: 16, vendidoEnRuta: 0),
  (fila: 1, columna: 2, sku: 'MAS-001', salida: 14, vendidoEnRuta: 0),
  (fila: 1, columna: 3, sku: 'MAS-001', salida: 12, vendidoEnRuta: 0),
  (fila: 2, columna: 0, sku: 'MAN-001', salida: 20, vendidoEnRuta: 2),
  (fila: 2, columna: 1, sku: 'MAN-001', salida: 16, vendidoEnRuta: 0),
  (fila: 2, columna: 2, sku: 'CAF-001', salida: 12, vendidoEnRuta: 1),
  (fila: 2, columna: 3, sku: 'CAF-001', salida: 10, vendidoEnRuta: 0),
  (fila: 3, columna: 0, sku: 'ACE-001', salida: 14, vendidoEnRuta: 0),
  (fila: 3, columna: 1, sku: 'ACE-001', salida: 10, vendidoEnRuta: 0),
  (fila: 3, columna: 2, sku: 'JAB-001', salida: 22, vendidoEnRuta: 2),
  (fila: 3, columna: 3, sku: 'JAB-001', salida: 18, vendidoEnRuta: 0),
  (fila: 4, columna: 0, sku: 'DET-001', salida: 16, vendidoEnRuta: 1),
  (fila: 4, columna: 1, sku: 'DET-001', salida: 12, vendidoEnRuta: 0),
  (fila: 4, columna: 2, sku: 'GAL-001', salida: 24, vendidoEnRuta: 3),
  (fila: 4, columna: 3, sku: 'GAL-001', salida: 20, vendidoEnRuta: 0),
  (fila: 5, columna: 0, sku: 'REF-001', salida: 28, vendidoEnRuta: 2),
  (fila: 5, columna: 1, sku: 'REF-001', salida: 24, vendidoEnRuta: 0),
  (fila: 5, columna: 2, sku: 'AGU-001', salida: 32, vendidoEnRuta: 3),
  (fila: 5, columna: 3, sku: 'AGU-001', salida: 28, vendidoEnRuta: 0),
];

/// Construye la parrilla de El Rojo. `variante: 0` es la carga de la mañana,
/// sin nada vendido todavía; `variante: 1` es a media ruta, después de las
/// primeras seis paradas.
Bodega bodegaCargada({required int variante}) {
  final List<Casilla> casillas = <Casilla>[
    for (final _CasillaPlantilla c in _plantillaBodega)
      Casilla(
        id: 'cas-${c.fila}-${c.columna}',
        fila: c.fila,
        columna: c.columna,
        sku: c.sku,
        salida: c.salida,
        vendido: variante == 1 ? c.vendidoEnRuta : 0,
      ),
  ];
  return Bodega(
    filas: 6,
    columnas: 4,
    casillas: casillas,
    catalogo: catalogoBase,
  );
}

// ---------------------------------------------------------------------------
// Ruta del día: catorce paradas de la Ruta 1, con El Rojo.
// ---------------------------------------------------------------------------

/// Pedido esperado por cliente de [clientesRuta1], en el mismo orden. Entre
/// 1 y 3 SKU y entre 1 y 6 bultos por parada, según el histórico de cada
/// negocio.
const List<Map<String, int>> _pedidosRuta1 = <Map<String, int>>[
  <String, int>{'HAR-001': 2, 'AZU-001': 1, 'AGU-001': 2},
  <String, int>{'HAR-001': 3, 'MAN-001': 2},
  <String, int>{'FRI-001': 2, 'CAF-001': 1},
  <String, int>{'REF-001': 2, 'GAL-001': 2, 'AGU-001': 1},
  <String, int>{'MAS-001': 2, 'ACE-001': 1},
  <String, int>{'JAB-001': 2, 'DET-001': 1, 'GAL-001': 1},
  <String, int>{'AZU-001': 2, 'FRI-001': 2},
  <String, int>{'AGU-001': 2, 'REF-001': 2},
  <String, int>{'HAR-001': 2, 'MAN-001': 1, 'CAF-001': 1},
  <String, int>{'GAL-001': 2, 'JAB-001': 1},
  <String, int>{'HAR-001': 3, 'AZU-001': 2},
  <String, int>{'MAS-001': 1, 'ACE-001': 1, 'DET-001': 1},
  <String, int>{'CAF-001': 1, 'FRI-001': 2},
  <String, int>{'JAB-001': 1, 'AGU-001': 3},
];

/// Arma una parada. Para `variante: 1` y las primeras seis posiciones
/// (`i` de 0 a 5), la parada ya está cerrada con un desenlace concreto —cobro
/// completo, un crédito, y un local cerrado— en vez de quedar pendiente. El
/// resto de la ruta sigue sin visitarse: es exactamente lo que se ve a media
/// mañana.
Parada _parada(
  int i,
  Cliente cliente,
  DateTime horaEstimada,
  Map<String, int> pedido,
  int variante,
) {
  final String id = 'parada-r1-${(i + 1).toString().padLeft(2, '0')}';
  final int orden = i + 1;

  if (variante != 1 || i >= 6) {
    return Parada(
      id: id,
      orden: orden,
      cliente: cliente,
      horaEstimada: horaEstimada,
      pedidoEsperado: pedido,
    );
  }

  switch (i) {
    case 0:
      // Cobrada completa en efectivo.
      return Parada(
        id: id,
        orden: orden,
        cliente: cliente,
        horaEstimada: horaEstimada,
        pedidoEsperado: pedido,
        estado: EstadoVisita.cobrada,
        entregado: pedido,
        efectivo: Dinero.desdeDecimal(2358.00),
        horaLlegada: horaEstimada.add(const Duration(minutes: 3)),
      );
    case 1:
      // Cobrada, pago mixto efectivo + transferencia.
      return Parada(
        id: id,
        orden: orden,
        cliente: cliente,
        horaEstimada: horaEstimada,
        pedidoEsperado: pedido,
        estado: EstadoVisita.cobrada,
        entregado: pedido,
        efectivo: Dinero.desdeDecimal(1828.50),
        transferencia: Dinero.desdeDecimal(1000.00),
        horaLlegada: horaEstimada.add(const Duration(minutes: -3)),
      );
    case 2:
      // Se entregó todo, pero una parte quedó al crédito.
      return Parada(
        id: id,
        orden: orden,
        cliente: cliente,
        horaEstimada: horaEstimada,
        pedidoEsperado: pedido,
        estado: EstadoVisita.credito,
        entregado: pedido,
        efectivo: Dinero.desdeDecimal(1335.50),
        credito: Dinero.desdeDecimal(2000.00),
        horaLlegada: horaEstimada.add(const Duration(minutes: 6)),
      );
    case 3:
      // Cobrada completa en efectivo.
      return Parada(
        id: id,
        orden: orden,
        cliente: cliente,
        horaEstimada: horaEstimada,
        pedidoEsperado: pedido,
        estado: EstadoVisita.cobrada,
        entregado: pedido,
        efectivo: Dinero.desdeDecimal(1325.50),
        horaLlegada: horaEstimada.add(const Duration(minutes: -1)),
      );
    case 4:
      // Se llegó, pero el local estaba cerrado: no se vendió nada.
      return Parada(
        id: id,
        orden: orden,
        cliente: cliente,
        horaEstimada: horaEstimada,
        pedidoEsperado: pedido,
        estado: EstadoVisita.omitida,
        motivo: MotivoOmision.cerrado,
        nota: 'Local cerrado con candado; se reintenta mañana.',
        horaLlegada: horaEstimada.add(const Duration(minutes: 5)),
      );
    case 5:
      // Cobrada completa por transferencia.
      return Parada(
        id: id,
        orden: orden,
        cliente: cliente,
        horaEstimada: horaEstimada,
        pedidoEsperado: pedido,
        estado: EstadoVisita.cobrada,
        entregado: pedido,
        transferencia: Dinero.desdeDecimal(1809.50),
        horaLlegada: horaEstimada.add(const Duration(minutes: 5)),
      );
    default:
      // No debería alcanzarse: i < 6 ya está cubierto arriba.
      return Parada(
        id: id,
        orden: orden,
        cliente: cliente,
        horaEstimada: horaEstimada,
        pedidoEsperado: pedido,
      );
  }
}

/// La ruta del día: catorce paradas de [clientesRuta1], con El Rojo
/// (`cam-01`) saliendo de la base a las 7:00 a.m. del 28 de agosto de 2026.
/// Las horas estimadas quedan separadas 25 minutos, empezando a las 7:30 a.m.
///
/// `variante: 0` da la ruta recién cargada, sin ninguna parada visitada.
/// `variante: 1` da la ruta a media mañana: las primeras seis paradas ya
/// están cerradas y la [Bodega] de [bodegaCargada] refleja los mismos
/// bultos ya vendidos.
Ruta rutaDelDia({required int variante}) {
  final DateTime horaSalida = DateTime(2026, 8, 28, 7);
  final List<Parada> paradas = <Parada>[
    for (int i = 0; i < clientesRuta1.length; i++)
      _parada(
        i,
        clientesRuta1[i],
        horaSalida.add(Duration(minutes: 30 + 25 * i)),
        _pedidosRuta1[i],
        variante,
      ),
  ];

  return Ruta(
    id: 'ruta-comayaguela-2026-08-28',
    camionId: 'cam-01',
    nombre: 'Comayagüela',
    fecha: DateTime(2026, 8, 28),
    base: _baseOperaciones,
    horaSalida: horaSalida,
    paradas: paradas,
    bodega: bodegaCargada(variante: variante),
  );
}
