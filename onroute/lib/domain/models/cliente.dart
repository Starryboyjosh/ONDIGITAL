/// El negocio que se visita en una parada.
library;

import 'package:latlong2/latlong.dart';
import 'package:meta/meta.dart';

/// Los cuatro tipos de cliente que ve un vendedor de ruta en San Pedro Sula, en
/// orden de tamaño. Importa para la app porque el tamaño predice el ticket y el
/// riesgo de crédito: a la pulpería se le fía, a la distribuidora no hace falta.
enum TipoCliente {
  pulperia('Pulpería'),
  distribuidora('Distribuidora'),
  superMini('Súper'),
  mercado('Puesto de mercado');

  const TipoCliente(this.etiqueta);

  final String etiqueta;
}

@immutable
final class Cliente {
  const Cliente({
    required this.id,
    required this.nombre,
    required this.tipo,
    required this.direccion,
    required this.posicion,
    this.referencia,
    this.telefono,
    this.rtn,
  });

  final String id;
  final String nombre;
  final TipoCliente tipo;

  /// Dirección formal: colonia, bulevar, número.
  final String direccion;

  /// Cómo se llega de verdad. En Honduras la dirección oficial rara vez alcanza
  /// y la referencia —"del puente peatonal, dos cuadras al sur"— es el dato que
  /// el vendedor realmente usa. Va en el modelo, no como comentario en una nota.
  final String? referencia;

  /// Formato local, con +504.
  final String? telefono;

  /// RTN del negocio, cuando factura. Nulo en la mayoría de pulperías.
  final String? rtn;

  final LatLng posicion;

  bool get facturaConRtn => rtn != null;

  @override
  bool operator ==(Object other) => other is Cliente && other.id == id;

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() => 'Cliente($id · $nombre)';
}
