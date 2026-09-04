/// El camión en el mapa.
///
/// El ícono apunta hacia donde va: el rumbo del [Rastro] se aplica como
/// rotación, y eso convierte un punto en información —de un vistazo se ve si
/// dos camiones van al mismo barrio o en direcciones opuestas—. Un círculo sin
/// rumbo obligaría a mirar la traza para averiguar lo mismo.
///
/// El pulso solo se dibuja cuando el camión **está atendiendo**, que es cuando
/// la torre quiere que le llamen la atención: un camión rodando es lo normal,
/// uno detenido veinte minutos en una pulpería no.
library;

import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../../domain/models/camion.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/theme/tokens.dart';

class MarcadorCamion extends StatelessWidget {
  const MarcadorCamion({
    super.key,
    required this.camion,
    required this.detenido,
    required this.pulso,
    this.seleccionado = false,
    this.onTap,
  });

  final Camion camion;
  final bool detenido;

  /// 0→1 continuo, compartido por toda la flota para que los pulsos latan
  /// juntos en vez de parecer ruido.
  final double pulso;

  final bool seleccionado;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final OnRouteColors c = context.colors;
    final Color tono = seleccionado ? c.violet : c.brass;

    return Semantics(
      button: onTap != null,
      selected: seleccionado,
      label: '${camion.apodo}, ${camion.conductor}. '
          '${detenido ? 'Detenido en parada' : 'En movimiento'}.',
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: SizedBox(
          // `Touch.min`, no 44: el marcador es el botón con el que la torre
          // selecciona un camión y tiene que cumplir el piso táctil del
          // sistema. El disco visible se queda en 26 —el mapa se satura si los
          // marcadores crecen—, lo que sube es el área que recibe el toque.
          width: Touch.min,
          height: Touch.min,
          child: Stack(
            alignment: Alignment.center,
            children: <Widget>[
              if (detenido)
                CustomPaint(
                  size: const Size.square(Touch.min),
                  painter: _PulsoPainter(fase: pulso, color: tono),
                ),
              Container(
                width: 26,
                height: 26,
                decoration: BoxDecoration(
                  color: tono,
                  shape: BoxShape.circle,
                  border: Border.all(color: c.surface, width: 2),
                  boxShadow: <BoxShadow>[
                    BoxShadow(
                      color: c.glassShadow,
                      blurRadius: 6,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Transform.rotate(
                  // El ícono apunta al norte; el rumbo viene en grados desde el
                  // norte en sentido horario, que es exactamente lo que espera
                  // `Transform.rotate` en radianes.
                  angle: camion.rastro.rumbo * math.pi / 180,
                  child: Icon(
                    Icons.navigation,
                    size: 15,
                    color: seleccionado ? c.onViolet : c.onBrass,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PulsoPainter extends CustomPainter {
  _PulsoPainter({required this.fase, required this.color});

  final double fase;
  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final Offset centro = size.center(Offset.zero);
    // El anillo crece y se desvanece a la vez: al llegar al borde ya no está,
    // así que no hace falta recortar nada.
    final double r = 13 + 9 * fase;
    canvas.drawCircle(
      centro,
      r,
      Paint()
        ..color = color.withValues(alpha: (1 - fase) * 0.45)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2,
    );
  }

  @override
  bool shouldRepaint(_PulsoPainter o) => o.fase != fase || o.color != color;
}
