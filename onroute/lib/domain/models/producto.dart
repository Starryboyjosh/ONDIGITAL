/// Catálogo de lo que va en el camión.
library;

import 'package:meta/meta.dart';

import 'dinero.dart';

/// Cómo se cuenta el producto al cargarlo. En autoventa hondureña casi nada se
/// mueve por pieza suelta: se carga por caja, saco, fardo o paquete, y ese es el
/// bulto que ocupa una posición física en la parrilla del camión.
enum Unidad {
  caja('caja', 'cajas'),
  saco('saco', 'sacos'),
  fardo('fardo', 'fardos'),
  paquete('paq.', 'paq.'),
  bidon('bidón', 'bidones');

  const Unidad(this.singular, this.plural);

  final String singular;
  final String plural;

  String contar(int cantidad) =>
      '$cantidad ${cantidad == 1 ? singular : plural}';
}

@immutable
final class Producto {
  const Producto({
    required this.sku,
    required this.nombre,
    required this.marca,
    required this.unidad,
    required this.precio,
  });

  final String sku;
  final String nombre;
  final String marca;
  final Unidad unidad;

  /// Precio de venta al detalle por bulto, ya con ISV incluido —así es como el
  /// pulpero lo paga y como el vendedor lo canta.
  final Dinero precio;

  String get etiqueta => '$marca $nombre';

  @override
  bool operator ==(Object other) => other is Producto && other.sku == sku;

  @override
  int get hashCode => sku.hashCode;

  @override
  String toString() => 'Producto($sku)';
}
