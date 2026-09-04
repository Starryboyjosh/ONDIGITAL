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
    this.conductorId,
    this.capacidadBultos = 240,
  });

  final String id;

  /// Placa hondureña, formato `PCX 1234`.
  final String placa;

  /// Cómo le dice la gente. En una flota chica nadie dice la placa: dicen
  /// "el Rojo" o "el de Marvin". La torre debe hablar el mismo idioma.
  final String apodo;

  /// El nombre que se pinta en pantalla. Se guarda acá, y no se resuelve por
  /// el repositorio de conductores, porque la torre tiene que poder nombrar a
  /// quien va manejando aunque nadie haya abierto Ajustes todavía: un camión
  /// sin nombre de conductor en el mapa es un camión sin tripulación.
  final String conductor;

  /// Quién va manejando, por identidad y no por texto. `null` mientras el
  /// camión no tenga a nadie asignado en el registro de conductores.
  ///
  /// Convive con [conductor] a propósito: el id es la llave con la que
  /// `ConductorRepository` hace la asignación, y el nombre es lo único que sale
  /// a pantalla. Nunca se imprime el id — en el patio nadie dice "con-01".
  final String? conductorId;

  final EstadoCamion estado;
  final Rastro rastro;
  final int capacidadBultos;

  Camion conRastro(Rastro nuevo) => Camion(
        id: id,
        placa: placa,
        apodo: apodo,
        conductor: conductor,
        conductorId: conductorId,
        estado: estado,
        rastro: nuevo,
        capacidadBultos: capacidadBultos,
      );

  Camion conEstado(EstadoCamion nuevo) => Camion(
        id: id,
        placa: placa,
        apodo: apodo,
        conductor: conductor,
        conductorId: conductorId,
        estado: nuevo,
        rastro: rastro,
        capacidadBultos: capacidadBultos,
      );

  /// El mismo camión con otra tripulación. Los dos campos se mueven juntos —
  /// nombre e id— porque separarlos deja la torre diciendo un nombre y el
  /// registro apuntando a otra persona.
  Camion conConductor({required String conductor, String? conductorId}) =>
      Camion(
        id: id,
        placa: placa,
        apodo: apodo,
        conductor: conductor,
        conductorId: conductorId,
        estado: estado,
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
