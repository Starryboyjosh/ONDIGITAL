/// Tipografía de OnRoute.
///
/// Las tres familias son las de marca ONDIGITAL y van empaquetadas como assets
/// (`pubspec.yaml`), no descargadas: la app tiene que verse igual sin señal.
///
/// Reparto de papeles —y la regla es estricta, porque una app operativa se
/// escanea, no se lee—:
///
/// - **Fraunces** solo en títulos de pantalla y en el saludo. Nunca en
///   etiquetas, botones ni datos.
/// - **Inter** en todo lo operativo: texto, botones, formularios, navegación.
/// - **JetBrains Mono** en todo lo que sea cifra comparable: dinero,
///   cantidades, horas, códigos, placas. Siempre con cifras tabulares, porque
///   en una app que maneja efectivo las columnas tienen que alinearse.
///
/// Las tres son fuentes variables. En Flutter, `fontWeight` por sí solo no
/// mueve el eje `wght` de una fuente variable declarada sin variantes: hay que
/// pasar también `fontVariations`. `_face` hace las dos cosas a la vez para que
/// ningún sitio de uso tenga que acordarse.
library;

import 'package:flutter/material.dart';

abstract final class Fonts {
  static const String display = 'Fraunces';
  static const String body = 'Inter';
  static const String mono = 'JetBrainsMono';
}

TextStyle _face({
  required String family,
  required double size,
  required FontWeight weight,
  double? height,
  double? tracking,
  double? opticalSize,
  List<FontFeature>? features,
}) {
  return TextStyle(
    fontFamily: family,
    fontSize: size,
    fontWeight: weight,
    height: height,
    letterSpacing: tracking,
    fontFeatures: features,
    fontVariations: <FontVariation>[
      FontVariation('wght', weight.value.toDouble()),
      if (opticalSize != null) FontVariation('opsz', opticalSize),
    ],
  );
}

/// Cifras tabulares: ancho fijo por dígito para que los montos se alineen en
/// columna y no "bailen" mientras un contador sube.
const List<FontFeature> _tabular = <FontFeature>[FontFeature.tabularFigures()];

/// Escala tipográfica de OnRoute. Escala fija en píxeles lógicos, no fluida:
/// el registro de producto se ve a densidad constante y un título que encoge
/// dentro de un panel se ve peor, no mejor.
abstract final class AppText {
  // ── Display (Fraunces) ─────────────────────────────────────────────────
  /// Saludo de la pantalla de ruta y títulos de pantalla completa.
  static final TextStyle displayLg = _face(
    family: Fonts.display,
    size: 28,
    weight: FontWeight.w600,
    height: 1.15,
    tracking: -0.5,
    opticalSize: 36,
  );

  /// Títulos de sección grandes y encabezados de hoja modal.
  static final TextStyle displayMd = _face(
    family: Fonts.display,
    size: 22,
    weight: FontWeight.w600,
    height: 1.2,
    tracking: -0.3,
    opticalSize: 24,
  );

  // ── Títulos (Inter) ────────────────────────────────────────────────────
  static final TextStyle titleLg = _face(
    family: Fonts.body,
    size: 19,
    weight: FontWeight.w700,
    height: 1.25,
    tracking: -0.3,
  );

  static final TextStyle titleMd = _face(
    family: Fonts.body,
    size: 16,
    weight: FontWeight.w700,
    height: 1.3,
    tracking: -0.15,
  );

  static final TextStyle titleSm = _face(
    family: Fonts.body,
    size: 14,
    weight: FontWeight.w600,
    height: 1.35,
  );

  // ── Cuerpo (Inter) ─────────────────────────────────────────────────────
  static final TextStyle body = _face(
    family: Fonts.body,
    size: 15,
    weight: FontWeight.w400,
    height: 1.5,
  );

  static final TextStyle bodySm = _face(
    family: Fonts.body,
    size: 13.5,
    weight: FontWeight.w400,
    height: 1.45,
  );

  /// Metadato de una línea: la hora estimada de una parada, el precio unitario
  /// debajo del producto, el rótulo de estado de un camión. Es el escalón que
  /// faltaba: sin él, `bodySmall` caía en la escala de Material y trece
  /// pantallas se dibujaban con la tipografía del framework —tamaño, tracking
  /// y peso ajenos— en vez de con la de OnRoute.
  static final TextStyle bodyXs = _face(
    family: Fonts.body,
    size: 12,
    weight: FontWeight.w400,
    height: 1.4,
    tracking: 0.1,
  );

  // ── Etiquetas (Inter) ──────────────────────────────────────────────────
  /// Texto de botón y etiquetas de campo.
  static final TextStyle label = _face(
    family: Fonts.body,
    size: 13,
    weight: FontWeight.w600,
    height: 1.2,
  );

  /// Etiqueta menor. Con `tracking` porque a este tamaño el espaciado extra es
  /// lo que la mantiene legible bajo el sol.
  static final TextStyle labelSm = _face(
    family: Fonts.body,
    size: 11,
    weight: FontWeight.w600,
    height: 1.2,
    tracking: 0.4,
  );

  // ── Datos (JetBrains Mono) ─────────────────────────────────────────────
  /// El monto protagonista de una pantalla: el total del día, el saldo del
  /// cuadre.
  static final TextStyle moneyLg = _face(
    family: Fonts.mono,
    size: 26,
    weight: FontWeight.w600,
    height: 1.1,
    tracking: -0.6,
    features: _tabular,
  );

  /// Monto por fila: lo que cobra una parada, lo que vale una posición de carga.
  static final TextStyle moneyMd = _face(
    family: Fonts.mono,
    size: 16,
    weight: FontWeight.w500,
    height: 1.2,
    tracking: -0.2,
    features: _tabular,
  );

  /// La cifra que alguien está moviendo con las manos: el conteo de una casilla
  /// de la parrilla, subido al camión. Va en mono tabular porque el número
  /// cambia de golpe con cada toque y un dígito de ancho variable hace saltar
  /// toda la fila.
  static final TextStyle dataXl = _face(
    family: Fonts.mono,
    size: 32,
    weight: FontWeight.w600,
    height: 1.1,
    tracking: -0.5,
    features: _tabular,
  );

  /// Cantidades, horas, códigos.
  static final TextStyle data = _face(
    family: Fonts.mono,
    size: 13,
    weight: FontWeight.w500,
    height: 1.3,
    features: _tabular,
  );

  /// Metadato mínimo: hora de un mensaje, placa, folio.
  static final TextStyle dataSm = _face(
    family: Fonts.mono,
    size: 11,
    weight: FontWeight.w500,
    height: 1.3,
    tracking: 0.2,
    features: _tabular,
  );

  /// `TextTheme` de Material derivado de la escala, para que los widgets del
  /// framework que no conocen `AppText` hereden igual la tipografía correcta.
  ///
  /// **Los quince papeles se llenan todos.** Un papel que se deja sin mapear no
  /// queda vacío: `ThemeData` lo rellena con la escala de Material y ese estilo
  /// llega a pantalla con el tamaño, el tracking y el color del framework —y
  /// sin `fontVariations`, así que el eje `wght` de la fuente variable ni
  /// siquiera se mueve. Es lo que pasaba con `bodySmall` (trece sitios de uso)
  /// y con `displaySmall` (el contador de la parrilla, que salía en Inter a 36
  /// px pese a pedir cifras tabulares).
  static TextTheme themeFor(Color ink, Color ink2) {
    return TextTheme(
      displayLarge: displayLg.copyWith(color: ink),
      displayMedium: displayMd.copyWith(color: ink),
      displaySmall: dataXl.copyWith(color: ink),
      headlineLarge: displayMd.copyWith(color: ink),
      headlineMedium: titleLg.copyWith(color: ink),
      headlineSmall: titleLg.copyWith(color: ink),
      titleLarge: titleLg.copyWith(color: ink),
      titleMedium: titleMd.copyWith(color: ink),
      titleSmall: titleSm.copyWith(color: ink),
      bodyLarge: body.copyWith(color: ink),
      bodyMedium: bodySm.copyWith(color: ink2),
      bodySmall: bodyXs.copyWith(color: ink2),
      labelLarge: label.copyWith(color: ink),
      labelMedium: label.copyWith(color: ink2),
      labelSmall: labelSm.copyWith(color: ink2),
    );
  }
}
