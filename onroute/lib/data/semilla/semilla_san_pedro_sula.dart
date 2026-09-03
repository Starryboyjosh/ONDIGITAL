/// Semilla de demostración: una ruta de autoventa en San Pedro Sula.
///
/// Aquí vive un catálogo típico de distribuidora hondureña, tres listas de
/// clientes de pulpería, una flota chica de camiones y una ruta del día ya
/// armada, en dos variantes (recién cargada / a medio recorrido). Sirve para
/// tener algo con qué probar la UI y la lógica de dominio sin depender de
/// datos reales de ningún cliente de ONDIGITAL.
///
/// Aviso de honestidad sobre las coordenadas: cada [LatLng] de este archivo
/// —clientes, base de operaciones, rastro de camión— es un punto **aproximado**
/// colocado a mano dentro de la colonia real que se nombra (Colonia Altiplano,
/// Mercado Guamilito, Barrio Río de Piedras, Mercado Medina, Barrio El Benque,
/// Colonia Moderna, Barrio Concepción, Rivera Hernández, Chamelecón, Colonia
/// Satélite, Colonia López Arellano, Colonia El Prado, Colonia Jardines del
/// Valle, Bulevar del Norte). No son direcciones geocodificadas ni verificadas
/// en campo: alcanzan para simular una ruta y dibujar el mapa, pero **antes de
/// cualquier uso en producción hay que reemplazarlas por coordenadas reales**,
/// obtenidas por geocodificación o por levantamiento físico de cada negocio.
///
/// Los nombres de pulperías, teléfonos y RTN son ficticios, construidos para
/// sonar plausibles en el contexto hondureño; no corresponden a negocios ni
/// personas reales. Los teléfonos usan los rangos de demostración
/// +504 2500-xxxx (fijo) y +504 9800-xxxx (celular).
///
/// Los tres datos que llevan código geográfico van cuadrados con la ciudad, y
/// conviene revisarlos si alguna vez se muda la semilla: el RTN empieza con
/// `0501` (Cortés · San Pedro Sula, no `0801` que es el Distrito Central), el
/// fijo con `25` (San Pedro Sula, no `22` que es Tegucigalpa) y las
/// coordenadas caen en el cuadrante 15.4x–15.6x N / -87.9x–-88.1x O. Un
/// `0801` suelto no rompe ninguna prueba y deja la semilla contando una
/// ciudad distinta de la que dice el archivo.
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
// Clientes: pulperías, súpers y distribuidoras de tres rutas de San Pedro
// Sula.
// ---------------------------------------------------------------------------

/// Ruta 1 · Centro: catorce clientes alrededor del Parque Central, el Mercado
/// Guamilito, el Mercado Medina, Barrio Río de Piedras y Barrio El Benque.
const List<Cliente> clientesRuta1 = <Cliente>[
  Cliente(
    id: 'cli-r1-01',
    nombre: 'Pulpería La Esperanza',
    tipo: TipoCliente.pulperia,
    direccion: 'Barrio El Centro, cerca del Parque Central',
    referencia: 'Del Parque Central, media cuadra al sur',
    telefono: '+504 2500-4411',
    posicion: LatLng(15.5040, -88.0285),
  ),
  Cliente(
    id: 'cli-r1-02',
    nombre: 'Distribuidora El Puente',
    tipo: TipoCliente.distribuidora,
    direccion: 'Barrio Río de Piedras, cerca del puente sobre el río',
    referencia: 'Frente al puente de Río de Piedras, portón verde',
    telefono: '+504 2500-5522',
    rtn: '05019025001234',
    posicion: LatLng(15.4995, -88.0420),
  ),
  Cliente(
    id: 'cli-r1-03',
    nombre: 'Pulpería Doña Chila',
    tipo: TipoCliente.pulperia,
    direccion: 'Mercado Guamilito',
    referencia: 'Dentro del Mercado Guamilito, local 14',
    posicion: LatLng(15.5065, -88.0295),
  ),
  Cliente(
    id: 'cli-r1-04',
    nombre: 'Mini Mercado Medina',
    tipo: TipoCliente.mercado,
    direccion: 'Mercado Medina, entrada principal',
    referencia: 'Entrada principal del mercado, puesto 3',
    telefono: '+504 9800-1123',
    posicion: LatLng(15.5010, -88.0250),
  ),
  Cliente(
    id: 'cli-r1-05',
    nombre: 'Pulpería El Progreso',
    tipo: TipoCliente.pulperia,
    direccion: 'Barrio El Benque',
    referencia: 'De la iglesia de El Benque, dos cuadras abajo',
    telefono: '+504 2500-6634',
    posicion: LatLng(15.4970, -88.0335),
  ),
  Cliente(
    id: 'cli-r1-06',
    nombre: 'Abarrotería Doña Reina',
    tipo: TipoCliente.pulperia,
    direccion: 'Barrio Río de Piedras',
    referencia: 'Contiguo a la escuela del barrio',
    posicion: LatLng(15.4980, -88.0405),
  ),
  Cliente(
    id: 'cli-r1-07',
    nombre: 'Mini Mercado Guamilito',
    tipo: TipoCliente.mercado,
    direccion: 'Mercado Guamilito, ala norte',
    referencia: 'Mercado Guamilito, ala norte',
    telefono: '+504 9800-2245',
    posicion: LatLng(15.5072, -88.0300),
  ),
  Cliente(
    id: 'cli-r1-08',
    nombre: 'Pulpería San Judas',
    tipo: TipoCliente.pulperia,
    direccion: 'Colonia Moderna',
    referencia: 'Del box de Colonia Moderna, 30 varas al oeste',
    telefono: '+504 2500-7789',
    posicion: LatLng(15.5110, -88.0310),
  ),
  Cliente(
    id: 'cli-r1-09',
    nombre: 'Súper Mini El Trébol',
    tipo: TipoCliente.superMini,
    direccion: '3a Avenida NO esquina 6 Calle NO',
    referencia: 'Sobre la 3a avenida, esquina con calle El Trébol',
    telefono: '+504 2500-3312',
    posicion: LatLng(15.5055, -88.0275),
  ),
  Cliente(
    id: 'cli-r1-10',
    nombre: 'Pulpería La Providencia',
    tipo: TipoCliente.pulperia,
    direccion: 'Barrio Concepción',
    referencia: 'Del antiguo cine del barrio, una cuadra al norte',
    posicion: LatLng(15.5025, -88.0260),
  ),
  Cliente(
    id: 'cli-r1-11',
    nombre: 'Distribuidora Hermanos Zúniga',
    tipo: TipoCliente.distribuidora,
    direccion: 'Zona de bodegas cerca del Mercado Guamilito',
    referencia: 'Bodega industrial, portón azul sobre la calle principal',
    telefono: '+504 2500-8890',
    rtn: '05019025005678',
    posicion: LatLng(15.4950, -88.0270),
  ),
  Cliente(
    id: 'cli-r1-12',
    nombre: 'Pulpería Nueva Esperanza',
    tipo: TipoCliente.pulperia,
    direccion: 'Barrio Río de Piedras',
    referencia: 'Frente a la cancha del barrio',
    telefono: '+504 9800-3367',
    posicion: LatLng(15.4988, -88.0430),
  ),
  Cliente(
    id: 'cli-r1-13',
    nombre: 'Abarrotería La Económica',
    tipo: TipoCliente.pulperia,
    direccion: 'Barrio El Benque',
    referencia: 'De la parada de buses, 20 varas al sur',
    posicion: LatLng(15.4960, -88.0340),
  ),
  Cliente(
    id: 'cli-r1-14',
    nombre: 'Pulpería Doña Tere',
    tipo: TipoCliente.pulperia,
    direccion: 'Colonia Moderna',
    referencia: 'Casa esquinera color celeste',
    telefono: '+504 9800-4489',
    posicion: LatLng(15.5118, -88.0318),
  ),
];

/// Ruta 2 · Rivera Hernández - Chamelecón - Satélite - López Arellano: once
/// clientes en el eje suroeste de San Pedro Sula.
const List<Cliente> clientesRuta2 = <Cliente>[
  Cliente(
    id: 'cli-r2-01',
    nombre: 'Súper Mini Rivera Hernández',
    tipo: TipoCliente.superMini,
    direccion: 'Rivera Hernández, bulevar del Occidente',
    referencia: 'Bulevar del Occidente, frente a la posta policial',
    telefono: '+504 2500-9011',
    posicion: LatLng(15.4790, -88.0510),
  ),
  Cliente(
    id: 'cli-r2-02',
    nombre: 'Pulpería El Paraíso',
    tipo: TipoCliente.pulperia,
    direccion: 'Rivera Hernández, sector 3',
    referencia: 'Sector 3 de Rivera Hernández',
    posicion: LatLng(15.4805, -88.0530),
  ),
  Cliente(
    id: 'cli-r2-03',
    nombre: 'Distribuidora Los Ángeles',
    tipo: TipoCliente.distribuidora,
    direccion: 'Colonia Satélite, vía principal',
    referencia: 'Sobre la vía principal de Satélite, portón gris',
    telefono: '+504 2500-1156',
    rtn: '05019025009012',
    posicion: LatLng(15.4870, -88.0480),
  ),
  Cliente(
    id: 'cli-r2-04',
    nombre: 'Pulpería La Fortuna',
    tipo: TipoCliente.pulperia,
    direccion: 'Colonia Satélite',
    referencia: 'Cerca de la parada de buses hacia el centro',
    telefono: '+504 9800-5512',
    posicion: LatLng(15.4855, -88.0495),
  ),
  Cliente(
    id: 'cli-r2-05',
    nombre: 'Mini Súper Chamelecón',
    tipo: TipoCliente.superMini,
    direccion: 'Chamelecón, entrada principal',
    referencia: 'Entrada a Chamelecón, casa con rótulo azul',
    telefono: '+504 9800-6678',
    posicion: LatLng(15.4620, -88.0430),
  ),
  Cliente(
    id: 'cli-r2-06',
    nombre: 'Pulpería El Mirador',
    tipo: TipoCliente.pulperia,
    direccion: 'Colonia López Arellano, calle principal',
    referencia: 'López Arellano, calle principal, casa de dos plantas',
    posicion: LatLng(15.4680, -88.0405),
  ),
  Cliente(
    id: 'cli-r2-07',
    nombre: 'Pulpería El Ranchito',
    tipo: TipoCliente.pulperia,
    direccion: 'Chamelecón',
    referencia: 'Atrás de la cancha de fútbol de Chamelecón',
    telefono: '+504 2500-2287',
    posicion: LatLng(15.4610, -88.0445),
  ),
  Cliente(
    id: 'cli-r2-08',
    nombre: 'Abarrotería Doña Meche',
    tipo: TipoCliente.pulperia,
    direccion: 'Colonia López Arellano',
    referencia: 'Del box de López Arellano, 15 varas al norte',
    telefono: '+504 9800-7734',
    posicion: LatLng(15.4695, -88.0398),
  ),
  Cliente(
    id: 'cli-r2-09',
    nombre: 'Distribuidora El Camino',
    tipo: TipoCliente.distribuidora,
    direccion: 'Rivera Hernández, carretera de acceso',
    referencia: 'Carretera hacia Rivera Hernández, bodega con malla ciclón',
    telefono: '+504 2500-3345',
    rtn: '05019025003456',
    posicion: LatLng(15.4780, -88.0525),
  ),
  Cliente(
    id: 'cli-r2-10',
    nombre: 'Pulpería San Miguel',
    tipo: TipoCliente.pulperia,
    direccion: 'Colonia Satélite',
    referencia: 'Frente a la capilla San Miguel',
    posicion: LatLng(15.4862, -88.0488),
  ),
  Cliente(
    id: 'cli-r2-11',
    nombre: 'Pulpería Vista Hermosa',
    tipo: TipoCliente.pulperia,
    direccion: 'López Arellano, subida a Vista Hermosa',
    referencia: 'En la subida hacia Vista Hermosa, casa amarilla',
    telefono: '+504 9800-8845',
    posicion: LatLng(15.4670, -88.0390),
  ),
];

/// Ruta 3 · El Prado - Bulevar del Norte - Jardines del Valle: nueve clientes
/// en el eje norte de San Pedro Sula.
const List<Cliente> clientesRuta3 = <Cliente>[
  Cliente(
    id: 'cli-r3-01',
    nombre: 'Súper Mini El Prado',
    tipo: TipoCliente.superMini,
    direccion: 'Colonia El Prado',
    referencia: 'Sobre la calle de El Prado, junto a la gasolinera',
    telefono: '+504 2500-4423',
    posicion: LatLng(15.5115, -88.0200),
  ),
  Cliente(
    id: 'cli-r3-02',
    nombre: 'Pulpería Doña Rosa',
    tipo: TipoCliente.pulperia,
    direccion: 'Colonia Jardines del Valle',
    referencia: 'Jardines del Valle, segunda entrada, casa con verja negra',
    posicion: LatLng(15.5165, -88.0080),
  ),
  Cliente(
    id: 'cli-r3-03',
    nombre: 'Abarrotería El Ahorro',
    tipo: TipoCliente.pulperia,
    direccion: 'Bulevar del Norte',
    referencia: 'Cerca de la rotonda del bulevar',
    telefono: '+504 9800-9956',
    posicion: LatLng(15.5220, -88.0165),
  ),
  Cliente(
    id: 'cli-r3-04',
    nombre: 'Pulpería La Unión',
    tipo: TipoCliente.pulperia,
    direccion: 'Colonia Jardines del Valle',
    referencia: 'Frente a la iglesia evangélica de Jardines del Valle',
    telefono: '+504 2500-5567',
    posicion: LatLng(15.5158, -88.0068),
  ),
  Cliente(
    id: 'cli-r3-05',
    nombre: 'Pulpería El Buen Precio',
    tipo: TipoCliente.pulperia,
    direccion: 'Colonia El Prado',
    referencia: 'Junto al centro comercial pequeño de El Prado',
    posicion: LatLng(15.5122, -88.0192),
  ),
  Cliente(
    id: 'cli-r3-06',
    nombre: 'Distribuidora Hermanos Cruz',
    tipo: TipoCliente.distribuidora,
    direccion: 'Bulevar del Norte',
    referencia: 'Bodega grande, portón corredizo blanco',
    telefono: '+504 2500-6612',
    rtn: '05019025007890',
    posicion: LatLng(15.5228, -88.0158),
  ),
  Cliente(
    id: 'cli-r3-07',
    nombre: 'Súper Mini Altiplano',
    tipo: TipoCliente.superMini,
    direccion: 'Colonia Altiplano',
    referencia: 'Colonia Altiplano, sobre la calle principal',
    telefono: '+504 9800-1078',
    posicion: LatLng(15.5175, -88.0130),
  ),
  Cliente(
    id: 'cli-r3-08',
    nombre: 'Pulpería La Alborada',
    tipo: TipoCliente.pulperia,
    direccion: 'Colonia El Prado',
    referencia: 'Del semáforo de El Prado, una cuadra al este',
    posicion: LatLng(15.5108, -88.0205),
  ),
  Cliente(
    id: 'cli-r3-09',
    nombre: 'Pulpería Monte Sinaí',
    tipo: TipoCliente.pulperia,
    direccion: 'Bulevar del Norte, sector Monte Sinaí',
    referencia: 'Sector Monte Sinaí, casa con tienda al frente',
    telefono: '+504 9800-2234',
    posicion: LatLng(15.5215, -88.0148),
  ),
];

// ---------------------------------------------------------------------------
// Flota: los tres camiones que salen cada mañana.
// ---------------------------------------------------------------------------

/// Base de operaciones: Colonia Altiplano, San Pedro Sula, Casa 14 — de ahí
/// salen y a donde regresan los tres camiones.
///
/// Es público porque también es el centro con el que abre el mapa de la torre
/// cuando todavía no hay ninguna ruta armada: sin esto, la pantalla tendría
/// que llevar un par de coordenadas sueltas escritas a mano, y basta que
/// alguien las copie de otra ciudad para que el mapa abra en el lugar
/// equivocado.
const LatLng baseOperaciones = LatLng(15.5185, -88.0115);

/// Flota chica de tres camiones. El Rojo va cargado y en ruta (es el que usa
/// [rutaDelDia]); los otros dos amanecen en base.
///
/// [Camion.capacidadBultos] es cuántos bultos le caben a cada uno, y está por
/// encima de lo que su parrilla carga en [rutasDeLaFlota]: un camión que sale
/// exactamente a tope no existe, siempre queda espacio para un pedido extra.
final List<Camion> camionesFlota = <Camion>[
  Camion(
    id: 'cam-01',
    placa: 'PCX 1234',
    apodo: 'El Rojo',
    conductor: 'Marvin Aguilar',
    estado: EstadoCamion.enRuta,
    capacidadBultos: 480,
    rastro: Rastro(
      posicion: const LatLng(15.5015, -88.0300),
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
    capacidadBultos: 240,
    rastro: Rastro(
      posicion: baseOperaciones,
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
    capacidadBultos: 200,
    rastro: Rastro(
      posicion: baseOperaciones,
      rumbo: 0,
      velocidadKmH: 0,
      momento: DateTime(2026, 8, 28, 7),
    ),
  ),
];

/// El camión de la flota con ese `id`, o `null` si no existe.
///
/// Existe para que ninguna pantalla tenga que enseñar un `camionId` crudo.
/// `cam-01` es una llave de base de datos; en el patio nadie dice "cam-01",
/// dicen "El Rojo" o "el de Marvin". Un identificador interno en pantalla es
/// una fuga de la implementación, y además obliga al vendedor a traducir.
Camion? camionPorId(String id) {
  for (final Camion c in camionesFlota) {
    if (c.id == id) return c;
  }
  return null;
}

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
    id: 'ruta-centro-2026-08-28',
    camionId: 'cam-01',
    nombre: 'Centro',
    fecha: DateTime(2026, 8, 28),
    base: baseOperaciones,
    horaSalida: horaSalida,
    paradas: paradas,
    bodega: bodegaCargada(variante: variante),
  );
}

// ---------------------------------------------------------------------------
// Las otras dos rutas del día: lo que la torre ve moverse además de El Rojo.
// ---------------------------------------------------------------------------

/// Valor de un pedido según el catálogo del día.
///
/// Las rutas 2 y 3 no llevan montos escritos a mano: el efectivo de cada
/// parada cerrada se calcula con esta función a partir de lo entregado. Es la
/// única forma de garantizar que la semilla no arranque con un descuadre
/// inventado por un error de suma al teclear.
Dinero _valorDe(Map<String, int> pedido) => pedido.entries
    .map((MapEntry<String, int> e) => catalogoBase[e.key]!.precio * e.value)
    .suma;

/// Una estiba en el molde de carga de un camión: dónde va, qué SKU y cuánto
/// sale. A diferencia del molde de El Rojo, acá no se escribe lo vendido: se
/// deduce de las paradas ya cerradas.
typedef _EstibaPlantilla = ({int fila, int columna, String sku, int salida});

/// Arma una parrilla y le reparte lo ya vendido, vaciando de adelante hacia
/// atrás igual que [Bodega.despachar]: primero la fila más cercana a la
/// cabina. Así la parrilla y las paradas cuentan la misma historia por
/// construcción y no por coincidencia.
Bodega _parrilla({
  required int filas,
  required int columnas,
  required String prefijo,
  required List<_EstibaPlantilla> plantilla,
  required Map<String, int> vendidoPorSku,
}) {
  final Map<String, int> pendiente = Map<String, int>.of(vendidoPorSku);
  final List<Casilla> casillas = <Casilla>[];

  for (final _EstibaPlantilla e in plantilla) {
    final int porRepartir = pendiente[e.sku] ?? 0;
    final int vendido = porRepartir < e.salida ? porRepartir : e.salida;
    pendiente[e.sku] = porRepartir - vendido;
    casillas.add(
      Casilla(
        id: '$prefijo-${e.fila}-${e.columna}',
        fila: e.fila,
        columna: e.columna,
        sku: e.sku,
        salida: e.salida,
        vendido: vendido,
      ),
    );
  }

  final Iterable<MapEntry<String, int>> sobrantes =
      pendiente.entries.where((MapEntry<String, int> e) => e.value > 0);
  if (sobrantes.isNotEmpty) {
    throw StateError(
      'La parrilla "$prefijo" no cargó suficiente para lo que las paradas '
      'dicen que se entregó: ${sobrantes.map((MapEntry<String, int> e) => "${e.key} x${e.value}").join(", ")}',
    );
  }

  return Bodega(
    filas: filas,
    columnas: columnas,
    casillas: casillas,
    catalogo: catalogoBase,
  );
}

/// Pedido esperado de cada cliente de [clientesRuta2], en el mismo orden.
const List<Map<String, int>> _pedidosRuta2 = <Map<String, int>>[
  <String, int>{'HAR-001': 3, 'AZU-001': 2, 'ACE-001': 1},
  <String, int>{'FRI-001': 1, 'GAL-001': 2, 'AGU-001': 2},
  <String, int>{'AZU-001': 3, 'HAR-001': 2, 'MAN-001': 2},
  <String, int>{'REF-001': 3, 'AGU-001': 2},
  <String, int>{'MAS-001': 2, 'JAB-001': 2},
  <String, int>{'CAF-001': 1, 'DET-001': 1, 'GAL-001': 1},
  <String, int>{'HAR-001': 2, 'FRI-001': 2},
  <String, int>{'AGU-001': 3, 'REF-001': 2},
  <String, int>{'JAB-001': 2, 'DET-001': 2},
  <String, int>{'MAN-001': 1, 'ACE-001': 1, 'CAF-001': 1},
  <String, int>{'GAL-001': 2, 'AZU-001': 1},
];

/// Parrilla de La Mula: 6 x 4, doscientos bultos de los doscientos cuarenta
/// que le caben.
const List<_EstibaPlantilla> _plantillaRuta2 = <_EstibaPlantilla>[
  (fila: 0, columna: 0, sku: 'HAR-001', salida: 14),
  (fila: 0, columna: 1, sku: 'HAR-001', salida: 10),
  (fila: 0, columna: 2, sku: 'AZU-001', salida: 12),
  (fila: 0, columna: 3, sku: 'AZU-001', salida: 8),
  (fila: 1, columna: 0, sku: 'FRI-001', salida: 10),
  (fila: 1, columna: 1, sku: 'FRI-001', salida: 6),
  (fila: 1, columna: 2, sku: 'MAS-001', salida: 8),
  (fila: 1, columna: 3, sku: 'MAS-001', salida: 6),
  (fila: 2, columna: 0, sku: 'MAN-001', salida: 10),
  (fila: 2, columna: 1, sku: 'MAN-001', salida: 6),
  (fila: 2, columna: 2, sku: 'CAF-001', salida: 6),
  (fila: 2, columna: 3, sku: 'CAF-001', salida: 4),
  (fila: 3, columna: 0, sku: 'ACE-001', salida: 8),
  (fila: 3, columna: 1, sku: 'ACE-001', salida: 4),
  (fila: 3, columna: 2, sku: 'JAB-001', salida: 10),
  (fila: 3, columna: 3, sku: 'JAB-001', salida: 8),
  (fila: 4, columna: 0, sku: 'DET-001', salida: 8),
  (fila: 4, columna: 1, sku: 'DET-001', salida: 6),
  (fila: 4, columna: 2, sku: 'GAL-001', salida: 12),
  (fila: 4, columna: 3, sku: 'GAL-001', salida: 8),
  (fila: 5, columna: 0, sku: 'REF-001', salida: 10),
  (fila: 5, columna: 1, sku: 'REF-001', salida: 6),
  (fila: 5, columna: 2, sku: 'AGU-001', salida: 12),
  (fila: 5, columna: 3, sku: 'AGU-001', salida: 8),
];

/// Pedido esperado de cada cliente de [clientesRuta3], en el mismo orden.
const List<Map<String, int>> _pedidosRuta3 = <Map<String, int>>[
  <String, int>{'HAR-001': 3, 'MAN-001': 2, 'CAF-001': 1},
  <String, int>{'AZU-001': 2, 'GAL-001': 2},
  <String, int>{'REF-001': 3, 'AGU-001': 3},
  <String, int>{'FRI-001': 2, 'MAS-001': 1},
  <String, int>{'JAB-001': 2, 'DET-001': 1},
  <String, int>{'ACE-001': 1, 'HAR-001': 2},
  <String, int>{'AGU-001': 2, 'GAL-001': 1},
  <String, int>{'AZU-001': 1, 'CAF-001': 1, 'MAN-001': 1},
  <String, int>{'REF-001': 2, 'JAB-001': 1},
];

/// Parrilla de El Chele: 4 x 3, una estiba por producto y ciento ochenta
/// bultos de los doscientos que le caben. Es el camión chico de la flota y su
/// parrilla lo refleja: menos posiciones y estibas más altas.
const List<_EstibaPlantilla> _plantillaRuta3 = <_EstibaPlantilla>[
  (fila: 0, columna: 0, sku: 'HAR-001', salida: 20),
  (fila: 0, columna: 1, sku: 'AZU-001', salida: 16),
  (fila: 0, columna: 2, sku: 'FRI-001', salida: 12),
  (fila: 1, columna: 0, sku: 'MAS-001', salida: 10),
  (fila: 1, columna: 1, sku: 'MAN-001', salida: 14),
  (fila: 1, columna: 2, sku: 'CAF-001', salida: 8),
  (fila: 2, columna: 0, sku: 'ACE-001', salida: 8),
  (fila: 2, columna: 1, sku: 'JAB-001', salida: 16),
  (fila: 2, columna: 2, sku: 'DET-001', salida: 12),
  (fila: 3, columna: 0, sku: 'GAL-001', salida: 20),
  (fila: 3, columna: 1, sku: 'REF-001', salida: 22),
  (fila: 3, columna: 2, sku: 'AGU-001', salida: 22),
];

/// Cómo terminó una parada ya cerrada de las rutas 2 y 3: qué parte se cobró
/// al contado, qué parte por transferencia y qué parte quedó fiada. Los tres
/// montos se derivan del valor entregado, nunca se teclean.
enum _Cierre {
  /// Todo en efectivo.
  contado,

  /// Todo por transferencia bancaria.
  transferencia,

  /// Se entregó completo y una parte quedó al crédito.
  conFiado,

  /// Se llegó y no se vendió.
  cerrado,
}

Parada _paradaFlota({
  required String rutaCorta,
  required int i,
  required Cliente cliente,
  required DateTime horaEstimada,
  required Map<String, int> pedido,
  required _Cierre? cierre,
  required int desfaseMinutos,
}) {
  final String id = 'parada-$rutaCorta-${(i + 1).toString().padLeft(2, '0')}';
  final int orden = i + 1;

  if (cierre == null) {
    return Parada(
      id: id,
      orden: orden,
      cliente: cliente,
      horaEstimada: horaEstimada,
      pedidoEsperado: pedido,
    );
  }

  final DateTime llegada = horaEstimada.add(Duration(minutes: desfaseMinutos));

  if (cierre == _Cierre.cerrado) {
    return Parada(
      id: id,
      orden: orden,
      cliente: cliente,
      horaEstimada: horaEstimada,
      pedidoEsperado: pedido,
      estado: EstadoVisita.omitida,
      motivo: MotivoOmision.sinDinero,
      nota: 'Pidió pasar mañana temprano; no tenía con qué pagar hoy.',
      horaLlegada: llegada,
    );
  }

  final Dinero valor = _valorDe(pedido);

  // El fiado es un monto redondo porque así se pacta en el mostrador: "te dejo
  // dos mil pendientes". El resto entra en efectivo, y por eso siempre cuadra.
  final Dinero fiado =
      cierre == _Cierre.conFiado ? Dinero.desdeDecimal(2500.00) : Dinero.cero;

  return Parada(
    id: id,
    orden: orden,
    cliente: cliente,
    horaEstimada: horaEstimada,
    pedidoEsperado: pedido,
    estado:
        cierre == _Cierre.conFiado ? EstadoVisita.credito : EstadoVisita.cobrada,
    entregado: pedido,
    efectivo: cierre == _Cierre.transferencia ? Dinero.cero : valor - fiado,
    transferencia: cierre == _Cierre.transferencia ? valor : Dinero.cero,
    credito: fiado,
    horaLlegada: llegada,
  );
}

Ruta _rutaFlota({
  required String id,
  required String rutaCorta,
  required String camionId,
  required String nombre,
  required DateTime horaSalida,
  required int minutosEntreParadas,
  required List<Cliente> clientes,
  required List<Map<String, int>> pedidos,
  required List<_Cierre?> cierres,
  required int filas,
  required int columnas,
  required List<_EstibaPlantilla> plantilla,
}) {
  final List<Parada> paradas = <Parada>[
    for (int i = 0; i < clientes.length; i++)
      _paradaFlota(
        rutaCorta: rutaCorta,
        i: i,
        cliente: clientes[i],
        horaEstimada:
            horaSalida.add(Duration(minutes: 30 + minutosEntreParadas * i)),
        pedido: pedidos[i],
        cierre: cierres[i],
        // Un desfase distinto por parada, entre -4 y +5 minutos: una ruta real
        // nunca llega clavada a la hora estimada.
        desfaseMinutos: <int>[3, -2, 5, -4, 2, 4, -1, 3][i % 8],
      ),
  ];

  final Map<String, int> vendidoPorSku = <String, int>{};
  for (final Parada p in paradas) {
    p.entregado.forEach((String sku, int n) {
      vendidoPorSku[sku] = (vendidoPorSku[sku] ?? 0) + n;
    });
  }

  return Ruta(
    id: id,
    camionId: camionId,
    nombre: nombre,
    fecha: DateTime(2026, 8, 28),
    base: baseOperaciones,
    horaSalida: horaSalida,
    paradas: paradas,
    bodega: _parrilla(
      filas: filas,
      columnas: columnas,
      prefijo: rutaCorta,
      plantilla: plantilla,
      vendidoPorSku: vendidoPorSku,
    ),
  );
}

/// Las tres rutas del 28 de agosto de 2026, una por camión y cada una con su
/// propia lista de clientes, su parrilla y su avance.
///
/// Existe aparte de [rutaDelDia] porque son dos preguntas distintas: la app del
/// vendedor trabaja **una** ruta —la suya— y la torre mira **la flota**. Antes
/// la torre repetía tres veces la misma ruta del Centro, y en el mapa se veían
/// tres camiones haciendo exactamente el mismo recorrido; eso no es una flota,
/// es un camión dibujado tres veces.
///
/// El orden es el de [camionesFlota]: El Rojo, La Mula, El Chele.
List<Ruta> rutasDeLaFlota() => <Ruta>[
      rutaDelDia(variante: 1),
      _rutaFlota(
        id: 'ruta-suroeste-2026-08-28',
        rutaCorta: 'r2',
        camionId: 'cam-02',
        nombre: 'Suroeste',
        horaSalida: DateTime(2026, 8, 28, 6, 40),
        minutosEntreParadas: 28,
        clientes: clientesRuta2,
        pedidos: _pedidosRuta2,
        cierres: const <_Cierre?>[
          _Cierre.contado,
          _Cierre.contado,
          _Cierre.conFiado,
          _Cierre.transferencia,
          null,
          null,
          null,
          null,
          null,
          null,
          null,
        ],
        filas: 6,
        columnas: 4,
        plantilla: _plantillaRuta2,
      ),
      _rutaFlota(
        id: 'ruta-norte-2026-08-28',
        rutaCorta: 'r3',
        camionId: 'cam-03',
        nombre: 'Norte',
        horaSalida: DateTime(2026, 8, 28, 7, 20),
        minutosEntreParadas: 32,
        clientes: clientesRuta3,
        pedidos: _pedidosRuta3,
        cierres: const <_Cierre?>[
          _Cierre.contado,
          _Cierre.transferencia,
          _Cierre.cerrado,
          null,
          null,
          null,
          null,
          null,
          null,
        ],
        filas: 4,
        columnas: 3,
        plantilla: _plantillaRuta3,
      ),
    ];
