/// Superficies de OnRoute: una maciza y una de cristal.
///
/// Están en el mismo archivo a propósito, para que quien vaya a usar cristal
/// vea primero la alternativa. **El cristal solo se justifica cuando hay
/// contenido vivo detrás** —el mapa moviéndose, la flota avanzando—; sobre un
/// fondo plano no difumina nada y solo cuesta GPU. La regla no es estética: un
/// `BackdropFilter` sobre color liso es un `Container` caro.
library;

import 'dart:ui' show ImageFilter;

import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import '../theme/tokens.dart';

/// Superficie maciza. El caso por defecto: tarjetas, filas, hojas, cualquier
/// cosa que se apoye en el fondo de la app.
class Panel extends StatelessWidget {
  const Panel({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(Space.lg),
    this.borderRadius = Radii.allLg,
    this.color,
    this.borderColor,
    this.onTap,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final BorderRadius borderRadius;
  final Color? color;
  final Color? borderColor;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final Widget contenido = Padding(padding: padding, child: child);

    return DecoratedBox(
      decoration: BoxDecoration(
        color: color ?? c.surface,
        borderRadius: borderRadius,
        border: Border.all(color: borderColor ?? c.border),
      ),
      child: onTap == null
          ? contenido
          : Material(
              type: MaterialType.transparency,
              child: InkWell(
                onTap: onTap,
                borderRadius: borderRadius,
                child: contenido,
              ),
            ),
    );
  }
}

/// Superficie de cristal. Se usa **solo flotando sobre el mapa**.
///
/// El `assert` de [debugSobreContenidoVivo] no es ceremonia: documenta y hace
/// cumplir en desarrollo la única condición que hace honesto al cristal.
class GlassPanel extends StatelessWidget {
  const GlassPanel({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(Space.lg),
    this.borderRadius = Radii.allPanel,
    this.blur = 18,
    this.debugSobreContenidoVivo = true,
  }) : assert(
          debugSobreContenidoVivo,
          'GlassPanel solo va sobre contenido vivo (el mapa). Sobre fondo '
          'plano usá Panel: el desenfoque no difumina nada y cuesta GPU.',
        );

  final Widget child;
  final EdgeInsetsGeometry padding;
  final BorderRadius borderRadius;

  /// Sigma del desenfoque. 18 es el punto donde el mapa se lee como textura de
  /// contexto y deja de competir con el dato de encima.
  final double blur;

  final bool debugSobreContenidoVivo;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: borderRadius,
        boxShadow: <BoxShadow>[
          BoxShadow(
            color: c.glassShadow,
            blurRadius: 28,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: borderRadius,
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
          child: DecoratedBox(
            decoration: BoxDecoration(
              // `glassFill` ya trae calibrada la opacidad contra el peor tile
              // de OSM (ver `palette.dart`). Dentro de este panel solo va texto
              // en `ink`/`ink2`; el color de estado va en pastilla opaca.
              color: c.glassFill,
              borderRadius: borderRadius,
              border: Border.all(color: c.glassStroke),
            ),
            child: Padding(padding: padding, child: child),
          ),
        ),
      ),
    );
  }
}
