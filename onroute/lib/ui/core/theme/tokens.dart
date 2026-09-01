/// Tokens estructurales de OnRoute: espaciado, radios, movimiento y puntos de
/// quiebre. El color vive en `palette.dart` y la tipografía en `typography.dart`.
///
/// Base de 4 px según `skills/design/design-systems/DESIGN.md` §3.
library;

import 'package:flutter/widgets.dart';

/// Escala de espaciado. Nombres por tamaño, no por uso, para que un mismo valor
/// sirva en contextos distintos sin renombrarse.
abstract final class Space {
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 20;
  static const double xxl = 24;
  static const double x3 = 32;
  static const double x4 = 40;
  static const double x5 = 48;
  static const double x6 = 64;
}

/// Radios. OnRoute es una app operativa densa: los radios grandes se reservan
/// para las superficies que flotan sobre el mapa, donde el cristal necesita una
/// silueta suave para leerse como panel y no como recorte.
abstract final class Radii {
  static const Radius sm = Radius.circular(8);
  static const Radius md = Radius.circular(12);
  static const Radius lg = Radius.circular(16);

  /// Paneles flotantes sobre el mapa. Eco del radio de 30 px de Holograma,
  /// bajado a 22 porque aquí el panel contiene datos densos, no un hero.
  static const Radius panel = Radius.circular(22);

  /// Hojas modales que suben desde abajo en móvil.
  static const Radius sheet = Radius.circular(28);

  static const BorderRadius allSm = BorderRadius.all(sm);
  static const BorderRadius allMd = BorderRadius.all(md);
  static const BorderRadius allLg = BorderRadius.all(lg);
  static const BorderRadius allPanel = BorderRadius.all(panel);
  static const BorderRadius pill = BorderRadius.all(Radius.circular(999));
  static const BorderRadius topSheet = BorderRadius.vertical(top: sheet);
}

/// Curvas y duraciones. Las curvas vienen de `DESIGN.md` §5.
abstract final class Motion {
  /// Curva amortiguada estándar. Todo lo que aparece, crece o se asienta.
  static const Curve out = Cubic(0.16, 1, 0.3, 1);

  /// Rebote sutil. Solo para confirmaciones táctiles (un cobro registrado).
  static const Curve spring = Cubic(0.34, 1.56, 0.64, 1);

  /// Movimiento a lo largo de una trayectoria. La firma de OnRoute: el progreso
  /// **viaja**, no solo se rellena.
  static const Curve travel = Cubic(0.4, 0, 0.2, 1);

  static const Duration fast = Duration(milliseconds: 150);
  static const Duration normal = Duration(milliseconds: 250);
  static const Duration slow = Duration(milliseconds: 450);

  /// Recorridos sobre el mapa y vaciado de la bodega.
  static const Duration journey = Duration(milliseconds: 600);
}

/// Puntos de quiebre. OnRoute tiene dos registros —calle y torre— y el ancho es
/// lo que decide cuál se muestra, porque coincide con el dispositivo real:
/// el vendedor va en teléfono, el dueño en pantalla grande.
abstract final class Breakpoints {
  /// Por debajo: teléfono. Registro "calle": una columna, targets grandes.
  static const double compact = 600;

  /// Entre `compact` y `expanded`: tablet. Dos paneles.
  static const double medium = 1024;

  /// Por encima: escritorio. Registro "torre": mapa + paneles flotantes.
  static const double expanded = 1440;

  static bool isCompact(double w) => w < compact;
  static bool isMedium(double w) => w >= compact && w < medium;
  static bool isExpanded(double w) => w >= medium;
}

/// Tamaño táctil mínimo. El vendedor usa la app de pie, con una mano, a veces
/// con la otra ocupada cargando producto: 48 es el piso, no el objetivo.
abstract final class Touch {
  static const double min = 48;
  static const double comfortable = 56;
}
