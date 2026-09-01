/// Geometría de un recorrido: cómo caminar una polilínea por distancia.
///
/// Se precalcula la distancia acumulada de cada vértice una sola vez. Después,
/// preguntar "¿dónde estoy a los 4,300 m?" cuesta una búsqueda binaria en vez
/// de recorrer el trazo entero. Importa porque esto se llama dos veces por
/// segundo por cada camión de la flota.
library;

import 'dart:math' as math;

import 'package:latlong2/latlong.dart';

/// Una posición sobre el recorrido: dónde y hacia dónde.
typedef PuntoEnRuta = ({LatLng punto, double rumbo});

class Recorrido {
  Recorrido(List<LatLng> puntos)
      : assert(puntos.length >= 2, 'un recorrido necesita al menos dos puntos'),
        _puntos = List<LatLng>.unmodifiable(puntos),
        _acumulado = _acumular(puntos);

  static const Distance _d = Distance();

  final List<LatLng> _puntos;

  /// `_acumulado[i]` = metros desde el inicio hasta `_puntos[i]`.
  final List<double> _acumulado;

  List<LatLng> get puntos => _puntos;

  /// Largo total en metros.
  double get largo => _acumulado.last;

  static List<double> _acumular(List<LatLng> p) {
    final List<double> out = <double>[0];
    double total = 0;
    for (int i = 0; i < p.length - 1; i++) {
      total += _d.as(LengthUnit.Meter, p[i], p[i + 1]);
      out.add(total);
    }
    return List<double>.unmodifiable(out);
  }

  /// Posición y rumbo a [metros] del inicio. Se satura en los extremos en vez
  /// de fallar: un camión que ya llegó se queda en la meta, no desaparece.
  PuntoEnRuta en(double metros) {
    if (metros <= 0) {
      return (punto: _puntos.first, rumbo: _rumbo(0, 1));
    }
    if (metros >= largo) {
      final int n = _puntos.length;
      return (punto: _puntos.last, rumbo: _rumbo(n - 2, n - 1));
    }

    final int i = _segmentoEn(metros);
    final double desde = _acumulado[i];
    final double tramo = _acumulado[i + 1] - desde;
    // Un tramo de largo cero deja `t` indefinido; se queda en el vértice.
    final double t = tramo <= 0 ? 0 : (metros - desde) / tramo;

    final LatLng a = _puntos[i];
    final LatLng b = _puntos[i + 1];
    return (
      punto: LatLng(
        a.latitude + (b.latitude - a.latitude) * t,
        a.longitude + (b.longitude - a.longitude) * t,
      ),
      rumbo: _rumbo(i, i + 1),
    );
  }

  /// Índice del segmento que contiene [metros]. Búsqueda binaria.
  int _segmentoEn(double metros) {
    int bajo = 0;
    int alto = _acumulado.length - 1;
    while (bajo < alto - 1) {
      final int medio = (bajo + alto) ~/ 2;
      if (_acumulado[medio] <= metros) {
        bajo = medio;
      } else {
        alto = medio;
      }
    }
    return bajo;
  }

  /// Rumbo en grados desde el norte, 0–360. Es lo que rota el ícono del camión.
  double _rumbo(int i, int j) {
    final double g = _d.bearing(_puntos[i], _puntos[j]);
    return (g % 360 + 360) % 360;
  }

  /// A cuántos metros del inicio queda el vértice más cercano a [destino].
  ///
  /// Sirve para saber en qué punto del trazo cae cada parada: OSRM devuelve la
  /// geometría por calles, no los puntos que se le pidieron, así que la parada
  /// hay que reencontrarla sobre la línea.
  double distanciaHasta(LatLng destino) {
    double mejor = double.infinity;
    int indice = 0;
    for (int i = 0; i < _puntos.length; i++) {
      final double d = _d.as(LengthUnit.Meter, _puntos[i], destino);
      if (d < mejor) {
        mejor = d;
        indice = i;
      }
    }
    return _acumulado[indice];
  }

  /// Recorte del trazo entre dos distancias, para dibujar el tramo ya andado
  /// con un color y el que falta con otro.
  List<LatLng> segmento(double desde, double hasta) {
    final double a = math.max(0, math.min(desde, hasta));
    final double b = math.min(largo, math.max(desde, hasta));
    final List<LatLng> out = <LatLng>[en(a).punto];
    for (int i = 0; i < _puntos.length; i++) {
      if (_acumulado[i] > a && _acumulado[i] < b) out.add(_puntos[i]);
    }
    out.add(en(b).punto);
    return out;
  }
}
