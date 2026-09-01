/// Contraste WCAG AA de la paleta, verificado desde los tokens reales.
///
/// La paleta se calculó a mano antes de fijar los hexadecimales; esta prueba
/// existe para que siga siendo cierta. Cualquiera que retoque un color y le
/// baje el contraste a un par que la app usa de verdad rompe aquí, no en la
/// calle a las once de la mañana.
library;

import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:onroute/ui/core/theme/palette.dart';

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

void main() {
  const double aa = 4.5;

  for (final (String nombre, OnRouteColors c) in <(String, OnRouteColors)>[
    ('calle', OnRouteColors.calle),
    ('torre', OnRouteColors.torre),
  ]) {
    group('tema $nombre', () {
      test('los tres niveles de tinta pasan AA sobre bg y surface', () {
        for (final (String etiqueta, Color tinta)
            in <(String, Color)>[('ink', c.ink), ('ink2', c.ink2), ('ink3', c.ink3)]) {
          for (final (String sup, Color fondo)
              in <(String, Color)>[('bg', c.bg), ('surface', c.surface)]) {
            expect(
              _razon(tinta, fondo),
              greaterThanOrEqualTo(aa),
              reason: '$etiqueta sobre $sup en $nombre',
            );
          }
        }
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
