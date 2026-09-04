/// Contraste WCAG AA de la paleta, verificado desde los tokens reales **y**
/// desde el tema ya armado.
///
/// La paleta se calculó a mano antes de fijar los hexadecimales; esta prueba
/// existe para que siga siendo cierta. Cualquiera que retoque un color y le
/// baje el contraste a un par que la app usa de verdad rompe aquí, no en la
/// calle a las once de la mañana.
///
/// Mirar solo los tokens dejaba fuera la mitad del problema, y esa mitad ya se
/// había cobrado una: los tokens estaban bien y el `ColorScheme` que se armaba
/// con ellos partía de la línea base de **Material 2**, así que morado
/// `#6200EE` y menta `#03DAC6` llegaban a pantalla por los papeles que nadie
/// escribía (`secondaryContainer`, `tertiary`) sin que ninguna prueba de color
/// se enterara. Por eso acá se revisa el `ThemeData` completo: el esquema, sus
/// parejas `on…`, la escala tipográfica y los colores que el tema fija para el
/// `SnackBar` y el tooltip.
library;

import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:onroute/ui/core/theme/app_theme.dart';
import 'package:onroute/ui/core/theme/palette.dart';
import 'package:onroute/ui/core/theme/typography.dart';

/// Luminancia relativa según WCAG 2.x.
double _luminancia(Color c) {
  double canal(double v) =>
      v <= 0.04045 ? v / 12.92 : math.pow((v + 0.055) / 1.055, 2.4).toDouble();
  return 0.2126 * canal(c.r) + 0.7152 * canal(c.g) + 0.0722 * canal(c.b);
}

double _razon(Color a, Color b) {
  final double la = _luminancia(a);
  final double lb = _luminancia(b);
  return (math.max(la, lb) + 0.05) / (math.min(la, lb) + 0.05);
}

/// Compone un color con alfa sobre un fondo opaco.
Color _sobre(Color fg, Color bg) => Color.alphaBlend(fg, bg);

/// Los tiles que de verdad sirve `tile.openstreetmap.org`: todos claros. El
/// mapa no cambia con el tema de la app, así que lo que se dibuje encima tiene
/// que aguantar estos cinco vengan del registro que vengan.
const Map<String, Color> _tilesReales = <String, Color>{
  'calle asfaltada': Color(0xFFFFFFFF),
  'fondo de OSM': Color(0xFFF2EFE9),
  'agua': Color(0xFFAADAFF),
  'parque': Color(0xFFC8E6C9),
  'manzana construida': Color(0xFFD9D0C9),
};

/// La línea base de Material 2 que `ColorScheme.light()`/`dark()` arrastran, y
/// que ningún papel del esquema de OnRoute puede tener.
const Map<int, String> _material2 = <int, String>{
  0xFF6200EE: 'morado primario de M2',
  0xFFBB86FC: 'lila primario de M2 oscuro',
  0xFF3700B3: 'morado variante de M2',
  0xFF03DAC6: 'menta secundaria de M2',
  0xFF018786: 'verde azulado de M2',
  0xFFB00020: 'rojo de error de M2',
  0xFFCF6679: 'rosa de error de M2 oscuro',
  0xFF121212: 'gris de superficie de M2 oscuro',
};

/// La paleta retirada de ONDIGITAL (`AGENTS.md`).
const Map<int, String> _retirados = <int, String>{
  0xFF070D18: 'navy retirado',
  0xFF2B8AF7: 'azul retirado',
  0xFF00E5B0: 'menta retirada',
};

void main() {
  const double aa = 4.5;

  /// Piso de WCAG para lo que no es texto: iconos, filetes, bordes.
  const double noTexto = 3;

  for (final (String nombre, OnRouteColors c) in <(String, OnRouteColors)>[
    ('calle', OnRouteColors.calle),
    ('torre', OnRouteColors.torre),
  ]) {
    group('tema $nombre', () {
      test('ink e ink2 pasan AA sobre las cuatro superficies', () {
        // Antes solo se miraban `bg` y `surface`. `bgSunk` (pastillas de dato,
        // rieles, relleno de campo en torre) y `surfaceAlt` (fondo del
        // SnackBar y del tooltip en torre, relleno de campo en calle) llevan
        // texto igual y no los cubría nadie.
        for (final (String etiqueta, Color tinta)
            in <(String, Color)>[('ink', c.ink), ('ink2', c.ink2)]) {
          for (final (String sup, Color fondo) in <(String, Color)>[
            ('bg', c.bg),
            ('bgSunk', c.bgSunk),
            ('surface', c.surface),
            ('surfaceAlt', c.surfaceAlt),
          ]) {
            expect(
              _razon(tinta, fondo),
              greaterThanOrEqualTo(aa),
              reason: '$etiqueta sobre $sup en $nombre',
            );
          }
        }
      });

      test('ink3 pasa AA donde lleva texto y 3:1 donde solo lleva icono', () {
        for (final (String sup, Color fondo) in <(String, Color)>[
          ('bg', c.bg),
          ('surface', c.surface),
          ('surfaceAlt', c.surfaceAlt),
        ]) {
          expect(
            _razon(c.ink3, fondo),
            greaterThanOrEqualTo(aa),
            reason: 'ink3 sobre $sup en $nombre',
          );
        }
        // Sobre `bgSunk`, `ink3` solo dibuja el icono de la pastilla de dato
        // del cliente —el texto de esa pastilla va en `ink2`—, así que el piso
        // que aplica es el de elemento gráfico, no el de texto. Si alguien
        // pone texto ahí, esta prueba no lo va a atajar: que lo ponga en
        // `ink2`, que sí está cubierto arriba.
        expect(
          _razon(c.ink3, c.bgSunk),
          greaterThanOrEqualTo(noTexto),
          reason: 'ink3 sobre bgSunk en $nombre',
        );
      });

      test('los colores de estado pasan AA sobre bg y surface', () {
        final Map<String, Color> tonos = <String, Color>{
          'brass': c.brass,
          'violet': c.violet,
          'collected': c.collected,
          'pending': c.pending,
          'danger': c.danger,
        };
        tonos.forEach((String etiqueta, Color tono) {
          for (final (String sup, Color fondo)
              in <(String, Color)>[('bg', c.bg), ('surface', c.surface)]) {
            expect(
              _razon(tono, fondo),
              greaterThanOrEqualTo(aa),
              reason: '$etiqueta sobre $sup en $nombre',
            );
          }
        });
      });

      test('cada pastilla pasa AA contra su propio relleno', () {
        final List<(String, Color, Color)> pares = <(String, Color, Color)>[
          ('brass', c.brass, c.brassSoft),
          ('violet', c.violet, c.violetSoft),
          ('collected', c.collected, c.collectedSoft),
          ('pending', c.pending, c.pendingSoft),
          ('danger', c.danger, c.dangerSoft),
          ('neutro', c.ink2, c.surfaceAlt),
        ];
        for (final (String etiqueta, Color texto, Color relleno) in pares) {
          expect(
            _razon(texto, relleno),
            greaterThanOrEqualTo(aa),
            reason: 'pastilla $etiqueta en $nombre',
          );
        }
      });

      test('los rellenos de pastilla son opacos', () {
        // Un relleno con alfa sobre tema oscuro aclara el fondo y le come el
        // contraste a su propio texto. Ver `palette.dart`.
        for (final Color relleno in <Color>[
          c.brassSoft,
          c.violetSoft,
          c.collectedSoft,
          c.pendingSoft,
          c.dangerSoft,
        ]) {
          expect(relleno.a, 1.0, reason: 'relleno con alfa en $nombre');
        }
      });

      test('el filete de las rutas se ve sobre cualquier tile', () {
        // Este es el par que se había roto: la ruta sin seleccionar era latón
        // al 55 % de alfa sobre los tiles ya lavados, y sobre una calle blanca
        // eso daba 1.01:1 —la ruta desaparecía justo donde hay calles—. La
        // arregla el filete, y el filete tiene que aguantar los cinco tiles.
        for (final MapEntry<String, Color> tile in _tilesReales.entries) {
          final Color lavado = _sobre(c.mapWash, tile.value);
          expect(
            _razon(c.mapInk, lavado),
            greaterThanOrEqualTo(noTexto),
            reason: 'filete de ruta sobre ${tile.key} en $nombre',
          );
        }
      });

      test('la tinta del mapa no sigue al tema', () {
        // Los tiles de OSM son claros vengan del registro que vengan. Un filete
        // que siguiera al tema sería casi blanco sobre calle blanca en calle.
        expect(c.mapInk, OnRouteColors.torre.mapInk);
        expect(c.mapInk, OnRouteColors.calle.mapInk);
      });

      test('ink e ink2 sobreviven al peor tile de mapa bajo el cristal', () {
        // Los tiles de OSM van de blanco a verde parque; el cristal tiene que
        // aguantar los dos extremos.
        const List<Color> peoresTiles = <Color>[
          Color(0xFFFFFFFF), // calle asfaltada, blanco puro
          Color(0xFFF2EFE9), // fondo estándar de OSM
          Color(0xFFAADAFF), // agua
          Color(0xFF3A5F3A), // parque en tiles oscuros
          Color(0xFF000000),
        ];
        for (final Color tile in peoresTiles) {
          final Color cristal = _sobre(c.glassFill, tile);
          expect(
            _razon(c.ink, cristal),
            greaterThanOrEqualTo(aa),
            reason: 'ink sobre cristal con tile $tile en $nombre',
          );
          expect(
            _razon(c.ink2, cristal),
            greaterThanOrEqualTo(aa),
            reason: 'ink2 sobre cristal con tile $tile en $nombre',
          );
        }
      });
    });
  }

  // ── El tema ya armado ────────────────────────────────────────────────
  //
  // Los tokens pueden estar impecables y el tema seguir sacando colores
  // ajenos a pantalla: es exactamente lo que pasaba.
  for (final (String nombre, ThemeData tema, OnRouteColors c)
      in <(String, ThemeData, OnRouteColors)>[
    ('calle', AppTheme.calle, OnRouteColors.calle),
    ('torre', AppTheme.torre, OnRouteColors.torre),
  ]) {
    group('tema armado $nombre', () {
      final ColorScheme e = tema.colorScheme;

      /// Los treinta papeles del esquema, con nombre para que el fallo diga
      /// cuál se soltó.
      final Map<String, Color> papeles = <String, Color>{
        'primary': e.primary,
        'onPrimary': e.onPrimary,
        'primaryContainer': e.primaryContainer,
        'onPrimaryContainer': e.onPrimaryContainer,
        'secondary': e.secondary,
        'onSecondary': e.onSecondary,
        'secondaryContainer': e.secondaryContainer,
        'onSecondaryContainer': e.onSecondaryContainer,
        'tertiary': e.tertiary,
        'onTertiary': e.onTertiary,
        'tertiaryContainer': e.tertiaryContainer,
        'onTertiaryContainer': e.onTertiaryContainer,
        'error': e.error,
        'onError': e.onError,
        'errorContainer': e.errorContainer,
        'onErrorContainer': e.onErrorContainer,
        'surface': e.surface,
        'onSurface': e.onSurface,
        'onSurfaceVariant': e.onSurfaceVariant,
        'surfaceDim': e.surfaceDim,
        'surfaceBright': e.surfaceBright,
        'surfaceContainerLowest': e.surfaceContainerLowest,
        'surfaceContainerLow': e.surfaceContainerLow,
        'surfaceContainer': e.surfaceContainer,
        'surfaceContainerHigh': e.surfaceContainerHigh,
        'surfaceContainerHighest': e.surfaceContainerHighest,
        'outline': e.outline,
        'outlineVariant': e.outlineVariant,
        'inverseSurface': e.inverseSurface,
        'onInverseSurface': e.onInverseSurface,
        'inversePrimary': e.inversePrimary,
      };

      test('ningún papel del esquema es de Material 2', () {
        // `ColorScheme.light()`/`dark()` son la línea base de M2 y resuelven
        // los papeles que no se escriben contra ella; `copyWith` los congela
        // ya resueltos, así que pisar `primary` y `secondary` no los limpia.
        // `IconButton.filledTonal` lee `secondaryContainer`: los botones + y −
        // de la hoja de cobro y del conteo salían en menta de Material 2.
        papeles.forEach((String papel, Color color) {
          final String? m2 = _material2[color.toARGB32()];
          expect(
            m2,
            isNull,
            reason: '$papel en $nombre es el $m2',
          );
        });
      });

      test('ningún papel del esquema usa la paleta retirada', () {
        papeles.forEach((String papel, Color color) {
          expect(
            _retirados[color.toARGB32()],
            isNull,
            reason: '$papel en $nombre trae un color retirado',
          );
        });
      });

      test('todos los papeles del esquema salen de la paleta de OnRoute', () {
        final Set<int> deLaPaleta = <int>{
          for (final Color x in <Color>[
            c.bg, c.bgSunk, c.surface, c.surfaceAlt,
            c.border, c.borderStrong,
            c.ink, c.ink2, c.ink3,
            c.brass, c.brassDeep, c.brassSoft,
            c.violet, c.violetSoft,
            c.collected, c.collectedSoft,
            c.pending, c.pendingSoft,
            c.danger, c.dangerSoft,
            c.onBrass, c.onViolet,
            const Color(0xFF000000),
            const Color(0x00000000),
          ])
            x.toARGB32(),
        };
        papeles.forEach((String papel, Color color) {
          expect(
            deLaPaleta,
            contains(color.toARGB32()),
            reason: '$papel en $nombre no sale de ningún token de OnRoute',
          );
        });
      });

      test('cada pareja on/fondo del esquema pasa AA', () {
        final List<(String, Color, Color)> pares = <(String, Color, Color)>[
          ('primary', e.onPrimary, e.primary),
          ('primaryContainer', e.onPrimaryContainer, e.primaryContainer),
          ('secondary', e.onSecondary, e.secondary),
          ('secondaryContainer', e.onSecondaryContainer, e.secondaryContainer),
          ('tertiary', e.onTertiary, e.tertiary),
          ('tertiaryContainer', e.onTertiaryContainer, e.tertiaryContainer),
          ('error', e.onError, e.error),
          ('errorContainer', e.onErrorContainer, e.errorContainer),
          ('surface', e.onSurface, e.surface),
          ('surface · variante', e.onSurfaceVariant, e.surface),
          ('inverseSurface', e.onInverseSurface, e.inverseSurface),
        ];
        for (final (String papel, Color texto, Color fondo) in pares) {
          expect(
            _razon(texto, fondo),
            greaterThanOrEqualTo(aa),
            reason: 'on$papel sobre $papel en $nombre',
          );
        }
      });

      test('sin tinte de elevación', () {
        // M3 mezcla `surfaceTint` dentro de cada superficie elevada. Con el
        // latón ahí, tarjetas y hojas se iban tiñendo según la elevación.
        expect(e.surfaceTint.a, 0);
      });

      test('el SnackBar y el tooltip se leen', () {
        // Son los dos sitios donde el tema pinta fondo y texto por su cuenta,
        // sin pasar por ningún widget de OnRoute.
        expect(
          _razon(
            tema.snackBarTheme.contentTextStyle!.color!,
            tema.snackBarTheme.backgroundColor!,
          ),
          greaterThanOrEqualTo(aa),
          reason: 'SnackBar en $nombre',
        );
        final BoxDecoration deco =
            tema.tooltipTheme.decoration! as BoxDecoration;
        expect(
          _razon(tema.tooltipTheme.textStyle!.color!, deco.color!),
          greaterThanOrEqualTo(aa),
          reason: 'tooltip en $nombre',
        );
      });

      test('la escala tipográfica está completa y es de OnRoute', () {
        // Un papel sin mapear no queda vacío: `ThemeData` lo rellena con la
        // escala de Material y ese estilo llega a pantalla con el tamaño y el
        // tracking del framework, y sin `fontVariations` —así que el eje
        // `wght` de la fuente variable ni se mueve—. Le pasaba a `bodySmall`,
        // con trece sitios de uso, y a `displaySmall`.
        final TextTheme t = tema.textTheme;
        final Map<String, TextStyle?> escala = <String, TextStyle?>{
          'displayLarge': t.displayLarge,
          'displayMedium': t.displayMedium,
          'displaySmall': t.displaySmall,
          'headlineLarge': t.headlineLarge,
          'headlineMedium': t.headlineMedium,
          'headlineSmall': t.headlineSmall,
          'titleLarge': t.titleLarge,
          'titleMedium': t.titleMedium,
          'titleSmall': t.titleSmall,
          'bodyLarge': t.bodyLarge,
          'bodyMedium': t.bodyMedium,
          'bodySmall': t.bodySmall,
          'labelLarge': t.labelLarge,
          'labelMedium': t.labelMedium,
          'labelSmall': t.labelSmall,
        };
        const Set<String> familias = <String>{
          Fonts.display,
          Fonts.body,
          Fonts.mono,
        };
        escala.forEach((String papel, TextStyle? estilo) {
          expect(estilo, isNotNull, reason: '$papel sin mapear en $nombre');
          expect(
            familias,
            contains(estilo!.fontFamily),
            reason: '$papel en $nombre usa una familia ajena',
          );
          expect(
            estilo.fontVariations,
            isNotEmpty,
            reason: '$papel en $nombre no mueve el eje wght',
          );
          expect(estilo.color, isNotNull, reason: '$papel en $nombre sin color');
        });
      });

      test('todo texto de la escala pasa AA sobre su superficie', () {
        final TextTheme t = tema.textTheme;
        for (final TextStyle? estilo in <TextStyle?>[
          t.displayLarge, t.displayMedium, t.displaySmall,
          t.headlineLarge, t.headlineMedium, t.headlineSmall,
          t.titleLarge, t.titleMedium, t.titleSmall,
          t.bodyLarge, t.bodyMedium, t.bodySmall,
          t.labelLarge, t.labelMedium, t.labelSmall,
        ]) {
          for (final (String sup, Color fondo)
              in <(String, Color)>[('bg', c.bg), ('surface', c.surface)]) {
            expect(
              _razon(estilo!.color!, fondo),
              greaterThanOrEqualTo(aa),
              reason: 'un estilo de la escala no se lee sobre $sup en $nombre',
            );
          }
        }
      });

      test('el asa de las hojas modales se ve sobre la hoja', () {
        // El asa es el control con el que se arrastra la hoja: le aplica el
        // piso de elemento de interfaz. Con `borderStrong` daba 1.62:1, y no
        // se notaba solo porque las hojas se pedían transparentes y el asa
        // quedaba flotando sobre el velo en vez de apoyada en la hoja.
        final BottomSheetThemeData hoja = tema.bottomSheetTheme;
        expect(hoja.showDragHandle, isTrue);
        expect(
          _razon(hoja.dragHandleColor!, hoja.backgroundColor!),
          greaterThanOrEqualTo(noTexto),
          reason: 'el asa de la hoja modal en $nombre',
        );
      });

      test('el prefijo de los campos es la misma letra que la cifra', () {
        // La `L ` de los campos de dinero se dibujaba con `hintStyle` —Inter a
        // 15 px en tinta terciaria— pegada a dígitos en mono a 13 px en tinta
        // principal.
        final InputDecorationThemeData campo = tema.inputDecorationTheme;
        expect(campo.prefixStyle!.fontFamily, Fonts.mono);
        expect(campo.prefixStyle!.fontSize, AppText.data.fontSize);
        expect(campo.prefixStyle!.color, c.ink);
      });
    });
  }

  test('la paleta oficial Pulso Vital no se reemplazó por la retirada', () {
    // `AGENTS.md`: la paleta navy/azul/menta quedó retirada y no se reintroduce.
    const List<Color> retirados = <Color>[
      Color(0xFF070D18),
      Color(0xFF2B8AF7),
      Color(0xFF00E5B0),
    ];
    for (final OnRouteColors c
        in <OnRouteColors>[OnRouteColors.calle, OnRouteColors.torre]) {
      final List<Color> usados = <Color>[
        c.bg, c.bgSunk, c.surface, c.surfaceAlt,
        c.ink, c.ink2, c.ink3,
        c.brass, c.brassDeep, c.violet,
        c.collected, c.pending, c.danger,
      ];
      for (final Color retirado in retirados) {
        expect(usados, isNot(contains(retirado)));
      }
    }
  });
}
