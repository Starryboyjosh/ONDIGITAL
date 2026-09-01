/// Formato de cifras y fechas para Honduras.
///
/// Dos decisiones que conviene dejar escritas:
///
/// 1. **La locale es `es_419`, no `es_HN`.** `intl` no trae símbolos numéricos
///    para `es_HN`; sí para `es_419` (español de Latinoamérica), que usa coma de
///    millar y punto decimal — exactamente la convención hondureña. Usar `es` a
///    secas sería un error silencioso: España invierte los separadores y
///    `L 4.320,00` se leería mal en una app de cobro.
/// 2. **Las fechas y horas se arman a mano.** `DateFormat` con locale exige
///    `initializeDateFormatting` y de todos modos no tiene datos de `es_HN`.
///    Como solo necesitamos días, meses y a.m./p.m. en español, escribirlos
///    aquí sale más barato, es determinista y no añade arranque asíncrono.
library;

import 'package:intl/intl.dart';

abstract final class Formatos {
  /// Español de Latinoamérica: coma de millar, punto decimal.
  static const String locale = 'es_419';

  static final NumberFormat _conCentavos =
      NumberFormat.currency(locale: locale, symbol: 'L ', decimalDigits: 2);
  static final NumberFormat _sinCentavos =
      NumberFormat.currency(locale: locale, symbol: 'L ', decimalDigits: 0);
  static final NumberFormat _entero = NumberFormat.decimalPattern(locale);

  /// `L 4,320.00`. Para montos que el vendedor va a comparar contra efectivo.
  static String lempiras(num monto) => _conCentavos.format(monto);

  /// `L 4,320`. Para totales de cabecera, donde los centavos son ruido.
  /// Si el monto tiene centavos, se muestran igual: nunca redondeamos plata a
  /// espaldas del usuario.
  static String lempirasCorto(num monto) {
    final bool exacto = (monto * 100).round() % 100 == 0;
    return exacto ? _sinCentavos.format(monto) : _conCentavos.format(monto);
  }

  /// `1,240`. Cantidades de producto.
  static String cantidad(num valor) => _entero.format(valor);

  /// `8:15 a.m.` — la forma que se usa en Honduras, con puntos.
  static String hora(DateTime t) {
    final int h12 = t.hour % 12 == 0 ? 12 : t.hour % 12;
    final String mm = t.minute.toString().padLeft(2, '0');
    final String sufijo = t.hour < 12 ? 'a.m.' : 'p.m.';
    return '$h12:$mm $sufijo';
  }

  static const List<String> _meses = <String>[
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];

  static const List<String> _dias = <String>[
    'lunes', 'martes', 'miércoles', 'jueves',
    'viernes', 'sábado', 'domingo',
  ];

  /// `jueves 28 de agosto`.
  static String fechaLarga(DateTime d) =>
      '${_dias[d.weekday - 1]} ${d.day} de ${_meses[d.month - 1]}';

  /// `28 ago`.
  static String fechaCorta(DateTime d) =>
      '${d.day} ${_meses[d.month - 1].substring(0, 3)}';

  /// `1 h 20 min`, `45 min`, `3 min`. Para tiempos de recorrido y de espera.
  static String duracion(Duration d) {
    final int min = d.inMinutes;
    if (min < 60) return '$min min';
    final int h = min ~/ 60;
    final int resto = min % 60;
    return resto == 0 ? '$h h' : '$h h $resto min';
  }

  /// `4.2 km` o `380 m`.
  static String distancia(double metros) {
    if (metros < 1000) return '${metros.round()} m';
    return '${(metros / 1000).toStringAsFixed(1)} km';
  }
}
