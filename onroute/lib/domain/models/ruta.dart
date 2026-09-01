/// La ruta del día: un camión, una parrilla cargada y una lista de paradas.
library;

import 'package:latlong2/latlong.dart';
import 'package:meta/meta.dart';

import 'bodega.dart';
import 'dinero.dart';
import 'parada.dart';

@immutable
final class Ruta {
  const Ruta({
    required this.id,
    required this.camionId,
    required this.nombre,
    required this.fecha,
    required this.base,
    required this.horaSalida,
    required this.paradas,
    required this.bodega,
    this.trazo = const <LatLng>[],
  });

  final String id;
  final String camionId;

  /// Como la nombra la gente: "Comayagüela Sur", "Anillo Periférico".
  final String nombre;

  final DateTime fecha;

  /// De dónde sale y a dónde regresa el camión.
  final LatLng base;
  final DateTime horaSalida;

  final List<Parada> paradas;
  final Bodega bodega;

  /// Geometría real de calle, de OSRM. Vacía si no hubo red: la app sigue
  /// funcionando, solo que el trazo se dibuja de punto a punto.
  final List<LatLng> trazo;

  bool get tieneTrazoReal => trazo.length > paradas.length;

  int get total => paradas.length;

  int get atendidas => paradas.where((Parada p) => p.atendida).length;

  int get cerradas => paradas.where((Parada p) => p.cerrada).length;

  int get omitidas =>
      paradas.where((Parada p) => p.estado == EstadoVisita.omitida).length;

  /// Avance para la barra de progreso: cuenta también las omitidas, porque una
  /// parada resuelta con "local cerrado" ya no vuelve a visitarse hoy.
  double get avance => total == 0 ? 0 : cerradas / total;

  /// La parada en la que está el camión ahora, o la próxima pendiente.
  Parada? get paradaActual {
    for (final Parada p in paradas) {
      if (p.estado == EstadoVisita.enSitio) return p;
    }
    for (final Parada p in paradas) {
      if (!p.cerrada) return p;
    }
    return null;
  }

  Parada? porId(String id) {
    for (final Parada p in paradas) {
      if (p.id == id) return p;
    }
    return null;
  }

  List<Parada> get pendientes =>
      paradas.where((Parada p) => !p.cerrada).toList();

  /// Efectivo y transferencias en mano del vendedor.
  Dinero get cobradoTotal => paradas.map((Parada p) => p.cobrado).suma;

  /// Solo el billete. Es contra este número que se cuenta el sobre al cierre.
  Dinero get efectivoTotal => paradas.map((Parada p) => p.efectivo).suma;

  Dinero get transferenciaTotal =>
      paradas.map((Parada p) => p.transferencia).suma;

  /// Lo que quedó fiado hoy.
  Dinero get creditoTotal => paradas.map((Parada p) => p.credito).suma;

  /// Atraso acumulado contra el plan, medido en la última parada visitada.
  /// Es más útil que el promedio: lo que importa es si la ruta va a terminar
  /// tarde, no si una parada suelta se atrasó.
  int get atrasoMinutos {
    for (final Parada p in paradas.reversed) {
      final int? a = p.atrasoMinutos;
      if (a != null) return a;
    }
    return 0;
  }

  Ruta conParada(Parada actualizada) => copyWith(
        paradas: <Parada>[
          for (final Parada p in paradas)
            if (p.id == actualizada.id) actualizada else p,
        ],
      );

  Ruta copyWith({
    List<Parada>? paradas,
    Bodega? bodega,
    List<LatLng>? trazo,
  }) =>
      Ruta(
        id: id,
        camionId: camionId,
        nombre: nombre,
        fecha: fecha,
        base: base,
        horaSalida: horaSalida,
        paradas: paradas ?? this.paradas,
        bodega: bodega ?? this.bodega,
        trazo: trazo ?? this.trazo,
      );

  @override
  bool operator ==(Object other) => other is Ruta && other.id == id;

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() => 'Ruta($id · $nombre · $cerradas/$total)';
}
