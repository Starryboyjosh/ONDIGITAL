/// Ruteo real por calles, gratis, contra el OSRM público.
///
/// ## Por qué OSRM y no Google/Mapbox
///
/// El requisito era "mapa real siempre y cuando sea gratis". OSRM y los tiles
/// de OSM no piden llave ni tarjeta. El costo de esa decisión es real y hay que
/// decirlo: `router.project-osrm.org` es un servidor de **demostración** con
/// política de uso justo, sin SLA y sin garantía de disponibilidad. Sirve para
/// desarrollar y demostrar; para producción hace falta una instancia propia
/// —OSRM se autohospeda— o un proveedor pago.
///
/// De ahí la regla de diseño de este archivo: **la red nunca es obligatoria**.
/// Si OSRM no contesta, la app no se cae ni se queda cargando: dibuja el trazo
/// de punto a punto y sigue. El vendedor en San Pedro Sula con señal intermitente
/// es el caso normal, no el caso de error.
library;

import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';

/// Resultado de pedir una ruta.
@immutable
class TrazoRuta {
  const TrazoRuta({
    required this.puntos,
    required this.metros,
    required this.duracion,
    required this.esReal,
    this.duracionPorTramo = const <Duration>[],
  });

  /// Geometría para dibujar.
  final List<LatLng> puntos;

  final double metros;
  final Duration duracion;

  /// Tiempo de cada tramo entre paradas consecutivas. Es lo que alimenta la
  /// hora estimada de llegada de cada parada, en vez de repartir el total.
  final List<Duration> duracionPorTramo;

  /// `false` cuando el trazo es la línea recta de reserva. La UI lo usa para
  /// no presumir precisión que no tiene.
  final bool esReal;
}

class OsrmService {
  OsrmService({http.Client? cliente, this.tiempoLimite = const Duration(seconds: 8)})
      : _cliente = cliente ?? http.Client();

  static const String _host = 'router.project-osrm.org';

  final http.Client _cliente;
  final Duration tiempoLimite;

  /// Velocidad de reserva para estimar tiempos cuando no hubo red. 22 km/h es
  /// un promedio urbano honesto para un camión de reparto en San Pedro Sula con
  /// tráfico y paradas, no la velocidad de crucero de la carretera.
  static const double _kmhUrbano = 22;

  /// Pide a OSRM el trazo que une [puntos] en orden.
  ///
  /// Nunca lanza por problemas de red: ante cualquier fallo devuelve el trazo
  /// recto. Sí valida que vengan al menos dos puntos, porque eso es un error
  /// de programación y no una condición del mundo.
  Future<TrazoRuta> trazar(List<LatLng> puntos) async {
    if (puntos.length < 2) {
      throw ArgumentError('Se necesitan al menos dos puntos para trazar');
    }

    try {
      final String coords = puntos
          .map((LatLng p) =>
              '${p.longitude.toStringAsFixed(6)},${p.latitude.toStringAsFixed(6)}')
          .join(';');

      final Uri url = Uri.https(_host, '/route/v1/driving/$coords', <String, String>{
        'overview': 'full',
        'geometries': 'geojson',
        'steps': 'false',
      });

      final http.Response r = await _cliente.get(url).timeout(tiempoLimite);
      if (r.statusCode != 200) return _recto(puntos);

      final Map<String, dynamic> json =
          jsonDecode(r.body) as Map<String, dynamic>;
      if (json['code'] != 'Ok') return _recto(puntos);

      final List<dynamic> rutas = json['routes'] as List<dynamic>;
      if (rutas.isEmpty) return _recto(puntos);

      final Map<String, dynamic> ruta = rutas.first as Map<String, dynamic>;
      final Map<String, dynamic> geo = ruta['geometry'] as Map<String, dynamic>;
      final List<dynamic> coordenadas = geo['coordinates'] as List<dynamic>;

      // GeoJSON viene [lon, lat]; LatLng se construye al revés. Confundirlos
      // deja el camión en el océano Índico, así que el orden va explícito.
      final List<LatLng> linea = <LatLng>[
        for (final dynamic c in coordenadas)
          LatLng(
            ((c as List<dynamic>)[1] as num).toDouble(),
            (c[0] as num).toDouble(),
          ),
      ];
      if (linea.length < 2) return _recto(puntos);

      final List<Duration> tramos = <Duration>[
        for (final dynamic l in (ruta['legs'] as List<dynamic>? ?? <dynamic>[]))
          Duration(
            seconds:
                (((l as Map<String, dynamic>)['duration'] as num?) ?? 0).round(),
          ),
      ];

      return TrazoRuta(
        puntos: linea,
        metros: ((ruta['distance'] as num?) ?? 0).toDouble(),
        duracion: Duration(seconds: ((ruta['duration'] as num?) ?? 0).round()),
        duracionPorTramo: tramos,
        esReal: true,
      );
    } on Object catch (e) {
      // A propósito se atrapa todo: timeout, socket, DNS, JSON malformado, un
      // 502 del servidor de demostración. Ninguno de esos debe impedir que el
      // vendedor vea su ruta.
      debugPrint('OSRM no disponible, se usa trazo recto: $e');
      return _recto(puntos);
    }
  }

  /// Trazo de reserva: los mismos puntos unidos por líneas rectas.
  static TrazoRuta _recto(List<LatLng> puntos) {
    const Distance d = Distance();
    double metros = 0;
    final List<Duration> tramos = <Duration>[];

    for (int i = 0; i < puntos.length - 1; i++) {
      final double tramo = d.as(LengthUnit.Meter, puntos[i], puntos[i + 1]);
      metros += tramo;
      tramos.add(Duration(seconds: (tramo / (_kmhUrbano * 1000 / 3600)).round()));
    }

    return TrazoRuta(
      puntos: List<LatLng>.unmodifiable(puntos),
      metros: metros,
      duracion: Duration(
        seconds: (metros / (_kmhUrbano * 1000 / 3600)).round(),
      ),
      duracionPorTramo: tramos,
      esReal: false,
    );
  }

  void cerrar() => _cliente.close();
}
