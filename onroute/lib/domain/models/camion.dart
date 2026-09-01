/// El camión: identidad, tripulación y dónde está ahora.
library;

import 'package:latlong2/latlong.dart';
import 'package:meta/meta.dart';

enum EstadoCamion {
  enBase('En base'),
  enRuta('En ruta'),
  enParada('En parada'),
  regresando('De regreso'),
  liquidando('Liquidando'),
  cerrado('Cerrado');

  const EstadoCamion(this.etiqueta);

  final String etiqueta;

  bool get seMueve => this == enRuta || this == regresando;
}

/// Posición instantánea de un camión.
///
/// Va aparte del [Camion] a propósito: la posición cambia cada segundo y el
/// resto casi nunca. Separarlas evita reconstruir toda la flota en cada tick, y
/// deja abierta la puerta que dice el plan: hoy la fuente es la simulación,
/// mañana puede ser un GPS real, y ninguna pantalla se entera del cambio.
@immutable
final class Rastro {
  const Rastro({
    required this.posicion,
    required this.rumbo,
    required this.velocidadKmH,
    required this.momento,
  });

  final LatLng posicion;

  /// Grados desde el norte, en sentido horario. Es lo que rota el ícono.
  final double rumbo;

  final double velocidadKmH;
  final DateTime momento;

  bool get detenido => velocidadKmH < 1;

  /// Un rastro viejo es sospechoso: en la torre significa señal perdida, no
  /// camión quieto. La distinción importa para no acusar a nadie de parquearse.
  bool esViejo(DateTime ahora, {Duration limite = const Duration(minutes: 5)}) =>
      ahora.difference(momento) > limite;
}

@immutable
final class Camion {
  const Camion({
    required this.id,
    required this.placa,
    required this.apodo,
    required this.conductor,
    required this.estado,
    required this.rastro,
    this.capacidadBultos = 240,
  });

  final String id;

  /// Placa hondureña, formato `PCX 1234`.
  final String placa;

  /// Cómo le dice la gente. En una flota chica nadie dice la placa: dicen
  /// "el Rojo" o "el de Marvin". La torre debe hablar el mismo idioma.
  final String apodo;

  final String conductor;
  final EstadoCamion estado;
  final Rastro rastro;
  final int capacidadBultos;

  Camion conRastro(Rastro nuevo) => Camion(
        id: id,
        placa: placa,
        apodo: apodo,
        conductor: conductor,
        estado: estado,
        rastro: nuevo,
        capacidadBultos: capacidadBultos,
      );

  Camion conEstado(EstadoCamion nuevo) => Camion(
        id: id,
        placa: placa,
        apodo: apodo,
        conductor: conductor,
        estado: nuevo,
        rastro: rastro,
        capacidadBultos: capacidadBultos,
      );

  @override
  bool operator ==(Object other) => other is Camion && other.id == id;

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() => 'Camion($placa · $apodo)';
}
