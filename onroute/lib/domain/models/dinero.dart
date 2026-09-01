/// Dinero, en centavos de lempira.
///
/// El tipo existe por una razón concreta: `double` no puede representar 0.10
/// exacto. Una ruta de catorce paradas suma, resta y compara lo suficiente para
/// que ese error salga a flote justo donde más caro cuesta —el cuadre de fin de
/// día mostrando un descuadre de L 0.01 que nadie se robó— y a partir de ahí el
/// vendedor deja de creerle a la app.
///
/// Regla de la casa: el dinero se guarda y se opera en entero. La división
/// entre 100 pasa **una sola vez**, al final, para mostrarlo.
library;

import 'package:meta/meta.dart';

@immutable
final class Dinero implements Comparable<Dinero> {
  const Dinero(this.centavos);

  /// Desde lempiras enteros: `Dinero.lps(4320)` es L 4,320.00.
  const Dinero.lps(int lempiras) : centavos = lempiras * 100;

  /// Desde un decimal humano (`4320.50`). Solo para semillas y captura de UI:
  /// nunca para resultados de un cálculo, que ya deberían venir en centavos.
  factory Dinero.desdeDecimal(num lempiras) =>
      Dinero((lempiras * 100).round());

  static const Dinero cero = Dinero(0);

  final int centavos;

  /// Solo para formatear. No encadenar aritmética sobre este valor.
  double get enLempiras => centavos / 100;

  bool get esCero => centavos == 0;
  bool get esNegativo => centavos < 0;

  /// Magnitud sin signo. Un descuadre de L -430 y otro de L 430 son igual de
  /// graves; el signo dice hacia dónde, no cuánto.
  Dinero get magnitud => Dinero(centavos.abs());

  Dinero operator +(Dinero otro) => Dinero(centavos + otro.centavos);
  Dinero operator -(Dinero otro) => Dinero(centavos - otro.centavos);
  Dinero operator -() => Dinero(-centavos);

  /// Multiplicar por cantidad de unidades. Entero a propósito: no existe media
  /// caja de galletas, y si algún día existe, el precio cambia de unidad.
  Dinero operator *(int unidades) => Dinero(centavos * unidades);

  bool operator >(Dinero otro) => centavos > otro.centavos;
  bool operator >=(Dinero otro) => centavos >= otro.centavos;
  bool operator <(Dinero otro) => centavos < otro.centavos;
  bool operator <=(Dinero otro) => centavos <= otro.centavos;

  @override
  int compareTo(Dinero otro) => centavos.compareTo(otro.centavos);

  @override
  bool operator ==(Object other) =>
      other is Dinero && other.centavos == centavos;

  @override
  int get hashCode => centavos.hashCode;

  @override
  String toString() => 'Dinero($centavos¢)';
}

/// Suma de una colección de montos. `fold` con [Dinero.cero] como semilla, para
/// no repetir el patrón en cada rollup.
extension SumaDinero on Iterable<Dinero> {
  Dinero get suma => fold(Dinero.cero, (Dinero a, Dinero b) => a + b);
}
