/// El motivo de "línea de ruta": la firma estructural de OnRoute.
///
/// OnRoute no puede inventar colores —la paleta Pulso Vital es obligatoria para
/// todos los productos ONDIGITAL— así que su identidad la lleva la **forma y el
/// movimiento**: una línea que hilvana las paradas del día, y un progreso que
/// *viaja* por esa línea en vez de solo rellenar una barra.
///
/// Dos piezas:
///
/// - [RouteNode] — el riel vertical de una fila de lista. Puesto en un
///   `ListView`, las filas se cosen solas en una ruta continua.
/// - [RouteProgress] — la versión horizontal, para cabeceras: "7 de 14".
library;

import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import '../theme/palette.dart';
import '../theme/tokens.dart';

/// Estado visual de una parada dentro de la línea.
enum EstadoParada {
  /// Visitada y cerrada.
  hecha,

  /// Donde está el vendedor ahora. Solo una por ruta.
  actual,

  /// Todavía por delante.
  pendiente,
}

/// Riel vertical con el nodo de una parada. Va como `leading` de la fila.
///
/// El ancho es fijo (28) para que todos los nodos de la lista queden en el
/// mismo eje aunque las filas tengan alturas distintas: la línea tiene que
/// leerse como una sola línea, no como tramos sueltos.
class RouteNode extends StatefulWidget {
  const RouteNode({
    super.key,
    required this.estado,
    this.esPrimera = false,
    this.esUltima = false,
  });

  final EstadoParada estado;
  final bool esPrimera;
  final bool esUltima;

  static const double ancho = 28;

  @override
  State<RouteNode> createState() => _RouteNodeState();
}

class _RouteNodeState extends State<RouteNode>
    with SingleTickerProviderStateMixin {
  AnimationController? _pulso;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _sincronizarPulso();
  }

  @override
  void didUpdateWidget(covariant RouteNode oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.estado != widget.estado) _sincronizarPulso();
  }

  /// El halo late solo en la parada actual, y solo una a la vez en toda la
  /// pantalla. Una animación infinita por fila sería un impuesto de batería
  /// para un vendedor que pasa el día fuera con el teléfono al máximo brillo.
  void _sincronizarPulso() {
    final bool debeLatir =
        widget.estado == EstadoParada.actual && !context.reduceMotion;
    if (debeLatir && _pulso == null) {
      _pulso = AnimationController(
        vsync: this,
        duration: const Duration(milliseconds: 2400),
      )..repeat();
    } else if (!debeLatir && _pulso != null) {
      _pulso!.dispose();
      _pulso = null;
    }
  }

  @override
  void dispose() {
    _pulso?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final painter = _RielPainter(
      colors: context.colors,
      estado: widget.estado,
      esPrimera: widget.esPrimera,
      esUltima: widget.esUltima,
      pulso: _pulso,
    );

    // El painter se repinta solo con `repaint: _pulso`; no hace falta envolver
    // en `AnimatedBuilder` y reconstruir el árbol cada frame.
    return SizedBox(
      width: RouteNode.ancho,
      child: CustomPaint(painter: painter, size: Size.infinite),
    );
  }
}

/// Fila de ruta: el riel y su contenido, ya cosidos.
///
/// Existe para que el riel no dependa de que quien la use se acuerde de
/// `CrossAxisAlignment.stretch`. Sin estirar, el riel no recibe altura y la
/// línea se rompe entre filas — que es justo lo único que este motivo no puede
/// permitirse.
class RouteRow extends StatelessWidget {
  const RouteRow({
    super.key,
    required this.estado,
    required this.child,
    this.esPrimera = false,
    this.esUltima = false,
    this.espacio = Space.md,
  });

  final EstadoParada estado;
  final Widget child;
  final bool esPrimera;
  final bool esUltima;
  final double espacio;

  @override
  Widget build(BuildContext context) {
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: <Widget>[
          RouteNode(
            estado: estado,
            esPrimera: esPrimera,
            esUltima: esUltima,
          ),
          SizedBox(width: espacio),
          Expanded(child: child),
        ],
      ),
    );
  }
}

class _RielPainter extends CustomPainter {
  _RielPainter({
    required this.colors,
    required this.estado,
    required this.esPrimera,
    required this.esUltima,
    required this.pulso,
  }) : super(repaint: pulso);

  final OnRouteColors colors;
  final EstadoParada estado;
  final bool esPrimera;
  final bool esUltima;
  final Animation<double>? pulso;

  /// Alto del nodo desde arriba de la fila. No es el centro vertical: la fila
  /// puede crecer con dos líneas de dirección, y el nodo tiene que quedar
  /// alineado con el nombre del cliente, que está arriba.
  static const double _yNodo = 22;

  @override
  void paint(Canvas canvas, Size size) {
    final double x = size.width / 2;
    final double y = math.min(_yNodo, size.height / 2);

    final Paint hecha = Paint()
      ..color = colors.collected
      ..strokeWidth = 2
      ..strokeCap = StrokeCap.round;
    final Paint porHacer = Paint()
      ..color = colors.borderStrong
      ..strokeWidth = 2
      ..strokeCap = StrokeCap.round;

    // Tramo de arriba: ya recorrido si la parada está hecha o es la actual.
    if (!esPrimera) {
      final bool recorrido = estado != EstadoParada.pendiente;
      canvas.drawLine(
        Offset(x, 0),
        Offset(x, y - 9),
        recorrido ? hecha : porHacer,
      );
    }

    // Tramo de abajo: recorrido solo si esta parada ya se cerró.
    if (!esUltima) {
      canvas.drawLine(
        Offset(x, y + 9),
        Offset(x, size.height),
        estado == EstadoParada.hecha ? hecha : porHacer,
      );
    }

    switch (estado) {
      case EstadoParada.hecha:
        canvas.drawCircle(
          Offset(x, y),
          5,
          Paint()..color = colors.collected,
        );
      case EstadoParada.pendiente:
        canvas
          ..drawCircle(Offset(x, y), 5, Paint()..color = colors.bg)
          ..drawCircle(
            Offset(x, y),
            5,
            Paint()
              ..color = colors.borderStrong
              ..style = PaintingStyle.stroke
              ..strokeWidth = 2,
          );
      case EstadoParada.actual:
        if (pulso != null) {
          final double t = pulso!.value;
          canvas.drawCircle(
            Offset(x, y),
            7 + 9 * t,
            Paint()..color = colors.violet.withValues(alpha: 0.28 * (1 - t)),
          );
        }
        canvas
          ..drawCircle(Offset(x, y), 7, Paint()..color = colors.violet)
          ..drawCircle(Offset(x, y), 2.5, Paint()..color = colors.onViolet);
    }
  }

  @override
  bool shouldRepaint(covariant _RielPainter old) =>
      old.estado != estado ||
      old.esPrimera != esPrimera ||
      old.esUltima != esUltima ||
      old.colors != colors;
}

/// La línea de ruta en horizontal, con un marcador que **viaja** hasta la
/// posición alcanzada. El recorrido es el dato: ver la marca desplazarse dice
/// "avanzaste" mejor que ver una barra cambiar de largo.
class RouteProgress extends StatelessWidget {
  const RouteProgress({
    super.key,
    required this.hechas,
    required this.total,
    this.alto = 6,
  });

  final int hechas;
  final int total;
  final double alto;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final double objetivo =
        total <= 0 ? 0 : (hechas / total).clamp(0.0, 1.0).toDouble();

    return Semantics(
      label: '$hechas de $total paradas',
      value: '${(objetivo * 100).round()}%',
      child: ExcludeSemantics(
        child: TweenAnimationBuilder<double>(
          tween: Tween<double>(end: objetivo),
          duration: context.reduceMotion ? Duration.zero : Motion.journey,
          curve: Motion.travel,
          builder: (BuildContext context, double v, _) {
            return SizedBox(
              height: math.max(alto, 14),
              child: LayoutBuilder(
                builder: (BuildContext context, BoxConstraints limites) {
                  final double ancho = limites.maxWidth;
                  final double x = ancho * v;
                  return Stack(
                    alignment: Alignment.centerLeft,
                    children: <Widget>[
                      Container(
                        height: alto,
                        decoration: BoxDecoration(
                          color: c.bgSunk,
                          borderRadius: Radii.pill,
                        ),
                      ),
                      Container(
                        height: alto,
                        width: x,
                        decoration: BoxDecoration(
                          color: c.collected,
                          borderRadius: Radii.pill,
                        ),
                      ),
                      // El marcador que viaja. Se recorta a los bordes para que
                      // no se salga del riel al 0 % ni al 100 %.
                      Positioned(
                        left: x.clamp(7.0, math.max(7.0, ancho - 7.0)) - 7,
                        child: Container(
                          width: 14,
                          height: 14,
                          decoration: BoxDecoration(
                            color: c.violet,
                            shape: BoxShape.circle,
                            border: Border.all(color: c.surface, width: 3),
                          ),
                        ),
                      ),
                    ],
                  );
                },
              ),
            );
          },
        ),
      ),
    );
  }
}
