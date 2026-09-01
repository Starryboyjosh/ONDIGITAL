/// La marca de OnRoute.
///
/// ## De dónde sale la forma
///
/// No es un camión ni un pin de mapa. La app ya tiene un motivo propio que se
/// repite en todas sus pantallas —la línea de ruta con nodos, `RouteLine` y
/// `RouteProgress`— y la marca es ese mismo motivo cerrado sobre sí mismo: una
/// jornada es un circuito que sale de la bodega y vuelve a la bodega.
///
/// Un logo que dibujara un camión estaría describiendo el vehículo; este
/// describe el trabajo. Y como es la misma gramática que el usuario ve todo el
/// día dentro de la app, la marca y el producto no se contradicen.
///
/// ## Qué significa cada parte
///
/// - El **anillo tenue** es la ruta completa del día.
/// - El **arco verdigrís** es lo ya recorrido: arranca arriba (la salida de
///   bodega) y avanza en el sentido del reloj.
/// - El **nodo de latón** es dónde va el camión ahora, en la punta del arco.
///   Va en latón porque en la paleta el latón es el dinero, y donde está el
///   camión es donde se está cobrando.
/// - El **nodo violeta hueco** es la siguiente parada. Violeta es "lo que
///   sigue" en toda la app; acá también.
///
/// La forma general lee como una **O** —de OnRoute y de ONDIGITAL— sin que la
/// letra esté dibujada. Eso la deja funcionar a 48 px en un launcher de
/// Android y a 512 px en una tienda sin cambiar de dibujo.
library;

import 'dart:math' as math;

import 'package:flutter/material.dart';

/// Paleta de la marca, fijada aparte del tema.
///
/// El logo no cambia de color con el tema: un launcher de Android lo dibuja
/// sobre el fondo del teléfono, no sobre el de la app, y una marca que se
/// aclara y se oscurece sola deja de ser una marca.
abstract final class ColoresMarca {
  static const Color tinta = Color(0xFF12201A);
  static const Color pergamino = Color(0xFFF2EFE4);
  static const Color verdigris = Color(0xFF1F7A57);
  static const Color laton = Color(0xFFD8A24A);
  static const Color violeta = Color(0xFF9B8CFF);
}

/// El isotipo: solo el circuito, sin texto.
class MarcaOnRoute extends StatelessWidget {
  const MarcaOnRoute({
    super.key,
    this.tamano = 64,
    this.sobreOscuro = true,
    this.conFondo = false,
    this.progreso = 0.62,
  });

  final double tamano;

  /// Si la marca se va a ver sobre fondo oscuro. Cambia solo el trazo tenue
  /// del anillo: el arco, el latón y el violeta no se tocan.
  final bool sobreOscuro;

  /// Dibuja el cuadrado de tinta detrás. Para el ícono de launcher, sí; para
  /// ponerla dentro de una pantalla que ya tiene fondo, no.
  final bool conFondo;

  /// Cuánto del circuito va recorrido. 0.62 es el valor de marca: una jornada
  /// a media tarde, ni empezada ni terminada.
  final double progreso;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: tamano,
      height: tamano,
      child: CustomPaint(
        painter: _MarcaPainter(
          sobreOscuro: sobreOscuro,
          conFondo: conFondo,
          progreso: progreso.clamp(0.0, 1.0),
        ),
        isComplex: false,
      ),
    );
  }
}

class _MarcaPainter extends CustomPainter {
  _MarcaPainter({
    required this.sobreOscuro,
    required this.conFondo,
    required this.progreso,
  });

  final bool sobreOscuro;
  final bool conFondo;
  final double progreso;

  /// Arriba del círculo. Todo se mide desde acá: es la salida de bodega.
  static const double _salida = -math.pi / 2;

  @override
  void paint(Canvas canvas, Size size) {
    final double lado = math.min(size.width, size.height);
    final Offset centro = Offset(size.width / 2, size.height / 2);

    if (conFondo) {
      // Esquinas suaves y no un círculo: Android ya recorta el ícono con la
      // máscara que tenga el launcher, y un círculo dentro de otro círculo
      // deja el dibujo flotando en el medio.
      final RRect fondo = RRect.fromRectAndRadius(
        Offset.zero & size,
        Radius.circular(lado * 0.22),
      );
      canvas.drawRRect(fondo, Paint()..color = ColoresMarca.tinta);
    }

    // El trazo se calcula desde el lado, no fijo, para que la marca se vea
    // igual de gruesa a 48 px y a 512 px.
    final double grosor = lado * 0.105;
    final double radio = lado * 0.32;
    final Rect caja = Rect.fromCircle(center: centro, radius: radio);

    // 1. La ruta completa del día, tenue.
    canvas.drawCircle(
      centro,
      radio,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = grosor
        ..color = (sobreOscuro || conFondo
                ? ColoresMarca.pergamino
                : ColoresMarca.tinta)
            .withValues(alpha: 0.20),
    );

    // 2. Lo ya recorrido.
    canvas.drawArc(
      caja,
      _salida,
      2 * math.pi * progreso,
      false,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = grosor
        ..strokeCap = StrokeCap.round
        ..color = ColoresMarca.verdigris,
    );

    // El color de la superficie de atrás. Los dos nodos lo usan para abrirse
    // un hueco en el anillo: sin ese hueco el nodo se pega al trazo y a 48 px
    // los dos se leen como una sola mancha.
    final Color superficie = (conFondo || sobreOscuro)
        ? ColoresMarca.tinta
        : ColoresMarca.pergamino;

    // 3. La siguiente parada: hueca, porque todavía no pasa nada ahí.
    //
    // La separación es 0.245 de vuelta (~88°) y no un valor chico. Con menos,
    // los dos nodos se tocan al reducir la marca y el dibujo pierde su única
    // afirmación: que hay un "ahora" y un "después" distintos.
    final Offset siguiente = _sobreElAnillo(centro, radio, progreso + 0.245);
    canvas.drawCircle(siguiente, grosor * 0.66, Paint()..color = superficie);
    canvas.drawCircle(
      siguiente,
      grosor * 0.47,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = grosor * 0.30
        ..color = ColoresMarca.violeta,
    );

    // 4. Dónde va el camión ahora. Se dibuja al final para que quede encima
    // del arco y del anillo pase lo que pase con el progreso.
    final Offset ahora = _sobreElAnillo(centro, radio, progreso);
    canvas.drawCircle(ahora, grosor * 0.82, Paint()..color = superficie);
    canvas.drawCircle(ahora, grosor * 0.58, Paint()..color = ColoresMarca.laton);
  }

  Offset _sobreElAnillo(Offset centro, double radio, double fraccion) {
    final double a = _salida + 2 * math.pi * fraccion;
    return Offset(centro.dx + radio * math.cos(a), centro.dy + radio * math.sin(a));
  }

  @override
  bool shouldRepaint(_MarcaPainter viejo) =>
      viejo.progreso != progreso ||
      viejo.sobreOscuro != sobreOscuro ||
      viejo.conFondo != conFondo;
}

/// El logotipo completo: marca + nombre.
///
/// "On" y "Route" van con pesos distintos y sin espacio, como en OnStock y
/// OnServe: la familia de productos se reconoce por esa juntura, no por un
/// color compartido.
class LogotipoOnRoute extends StatelessWidget {
  const LogotipoOnRoute({
    super.key,
    this.altura = 40,
    this.color,
    this.sobreOscuro = true,
  });

  final double altura;
  final Color? color;
  final bool sobreOscuro;

  @override
  Widget build(BuildContext context) {
    final Color tinta = color ??
        (sobreOscuro ? ColoresMarca.pergamino : ColoresMarca.tinta);

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        MarcaOnRoute(tamano: altura, sobreOscuro: sobreOscuro),
        SizedBox(width: altura * 0.28),
        Text.rich(
          TextSpan(
            children: <TextSpan>[
              TextSpan(
                text: 'On',
                style: TextStyle(
                  fontFamily: 'Fraunces',
                  fontSize: altura * 0.62,
                  fontWeight: FontWeight.w400,
                  color: tinta,
                  height: 1.05,
                ),
              ),
              TextSpan(
                text: 'Route',
                style: TextStyle(
                  fontFamily: 'Fraunces',
                  fontSize: altura * 0.62,
                  fontWeight: FontWeight.w700,
                  color: tinta,
                  height: 1.05,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
