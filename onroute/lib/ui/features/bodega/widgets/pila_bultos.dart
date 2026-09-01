/// El dibujo de una casilla de la parrilla: los bultos que todavía van arriba.
///
/// ## Por qué una regla y no una barra de progreso
///
/// Una barra al 62 % obliga a traducir: ¿62 % de cuántos? En una parrilla de
/// camión el dato natural es entero —"quedan 15 sacos de 20"— y se verifica
/// mirando. Por eso la columna se dibuja con **muescas cada [_cadaMuesca]
/// bultos**: es una regla graduada contra la que se lee la altura, no un
/// porcentaje abstracto. Dos casillas del mismo producto se comparan de un
/// vistazo porque comparten graduación.
///
/// La primera versión dibujaba una losa por bulto, que es más literal. Se
/// descartó al verla: con cargas de 10 a 32 bultos, unas casillas salían
/// rayadas y otras macizas, y la cuadrícula parecía inconsistente sin que esa
/// diferencia significara nada. La graduación se ve igual en todas.
library;

import 'package:flutter/widgets.dart';

/// Cada cuántos bultos va una muesca. Cinco es lo que se cuenta sin contar.
const int _cadaMuesca = 5;

class PilaBultos extends StatelessWidget {
  const PilaBultos({
    super.key,
    required this.salida,
    required this.enCamion,
    required this.lleno,
    required this.vacio,
    this.progreso = 1,
  });

  /// Cuántos bultos cabían: define cuántas losas se dibujan en total.
  final int salida;

  /// Cuántos quedan: define cuántas van encendidas.
  final int enCamion;

  final Color lleno;
  final Color vacio;

  /// 0→1 para animar el vaciado. Interpola la cantidad encendida, no la
  /// opacidad: lo que se anima es el bulto bajando del camión.
  final double progreso;

  @override
  Widget build(BuildContext context) => CustomPaint(
        painter: _PilaPainter(
          salida: salida,
          enCamion: enCamion,
          lleno: lleno,
          vacio: vacio,
          progreso: progreso,
        ),
        size: Size.infinite,
      );
}

class _PilaPainter extends CustomPainter {
  _PilaPainter({
    required this.salida,
    required this.enCamion,
    required this.lleno,
    required this.vacio,
    required this.progreso,
  });

  final int salida;
  final int enCamion;
  final Color lleno;
  final Color vacio;
  final double progreso;

  @override
  void paint(Canvas canvas, Size size) {
    if (salida <= 0 || size.height <= 0) return;

    // El vaciado se anima desde "lleno" hacia el valor real, así que al cargar
    // la pantalla la parrilla se ve bajar sola: es la carga del día ocurriendo.
    final double vivos = salida - (salida - enCamion) * progreso;

    final Paint pLleno = Paint()..color = lleno;
    final Paint pVacio = Paint()..color = vacio;

    final RRect fondo = RRect.fromRectAndRadius(
      Offset.zero & size,
      const Radius.circular(3),
    );
    canvas.save();
    canvas.clipRRect(fondo);

    canvas.drawRRect(fondo, pVacio);

    // Se llena desde abajo: el bulto de hasta arriba es el primero que sale.
    final double h = size.height * (vivos / salida).clamp(0.0, 1.0);
    canvas.drawRect(Rect.fromLTWH(0, size.height - h, size.width, h), pLleno);

    // Las muescas se dibujan encima de ambos rellenos, en el color contrario
    // al que tapan, para que la graduación se lea tanto en la parte llena como
    // en la vacía.
    final double paso = size.height / salida;
    for (int i = _cadaMuesca; i < salida; i += _cadaMuesca) {
      final double y = size.height - paso * i;
      final bool sobreLleno = y > size.height - h;
      canvas.drawRect(
        Rect.fromLTWH(0, y - 0.5, size.width, 1),
        Paint()..color = (sobreLleno ? vacio : lleno).withValues(alpha: 0.55),
      );
    }

    canvas.restore();
  }

  @override
  bool shouldRepaint(_PilaPainter o) =>
      o.salida != salida ||
      o.enCamion != enCamion ||
      o.progreso != progreso ||
      o.lleno != lleno ||
      o.vacio != vacio;
}
