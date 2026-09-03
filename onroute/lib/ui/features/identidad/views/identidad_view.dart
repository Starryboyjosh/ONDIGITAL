/// Pantalla de identidad visual: el sistema de diseño puesto a la vista.
///
/// No es una pantalla operativa; es la referencia viva del sistema —color,
/// tipografía, componentes, movimiento— para poder juzgarlo y mantenerlo sin
/// abrir el código. Se queda en el producto a propósito.
///
/// El texto que sale acá habla del producto, nunca del plan de trabajo
/// interno: un "Fase 1" en pantalla le cuenta al cliente en qué sprint
/// andamos, que no es asunto suyo.
library;

import 'dart:math' as math;
import 'dart:ui' show PathMetric;

import 'package:flutter/material.dart';

import '../../../core/format/formatos.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../../../core/widgets/money.dart';
import '../../../core/widgets/panel.dart';
import '../../../core/widgets/route_line.dart';
import '../../../core/widgets/status_pill.dart';

class IdentidadView extends StatefulWidget {
  const IdentidadView({
    super.key,
    required this.esTorre,
    required this.onCambiarTema,
  });

  final bool esTorre;
  final ValueChanged<bool> onCambiarTema;

  @override
  State<IdentidadView> createState() => _IdentidadViewState();
}

class _IdentidadViewState extends State<IdentidadView> {
  double _cobrado = 3890;
  int _hechas = 7;

  void _registrarCobro() {
    setState(() {
      _cobrado += 215 + math.Random().nextInt(600);
      if (_hechas < 14) _hechas++;
    });
  }

  void _reiniciar() => setState(() {
        _cobrado = 3890;
        _hechas = 7;
      });

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final bool ancho = !context.isCompact;

    final List<Widget> secciones = <Widget>[
      _SeccionColor(),
      _SeccionTipografia(),
      _SeccionEstados(),
      _SeccionDinero(
        cobrado: _cobrado,
        onCobro: _registrarCobro,
        onReiniciar: _reiniciar,
      ),
      _SeccionRoute(hechas: _hechas, total: 14),
      const _SeccionCristal(),
    ];

    return Scaffold(
      body: SafeArea(
        child: CustomScrollView(
          slivers: <Widget>[
            SliverToBoxAdapter(
              child: _Cabecera(
                esTorre: widget.esTorre,
                onCambiarTema: widget.onCambiarTema,
              ),
            ),
            SliverPadding(
              padding: EdgeInsets.fromLTRB(
                ancho ? Space.x3 : Space.lg,
                0,
                ancho ? Space.x3 : Space.lg,
                Space.x6,
              ),
              sliver: ancho
                  // En pantalla ancha las secciones se acomodan en dos
                  // columnas de mampostería simple: el sistema se compara mejor
                  // cuando se ve entero de un vistazo.
                  ? SliverToBoxAdapter(
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          Expanded(
                            child: Column(
                              children: <Widget>[
                                for (int i = 0; i < secciones.length; i += 2)
                                  Padding(
                                    padding:
                                        const EdgeInsets.only(bottom: Space.lg),
                                    child: secciones[i],
                                  ),
                              ],
                            ),
                          ),
                          const SizedBox(width: Space.lg),
                          Expanded(
                            child: Column(
                              children: <Widget>[
                                for (int i = 1; i < secciones.length; i += 2)
                                  Padding(
                                    padding:
                                        const EdgeInsets.only(bottom: Space.lg),
                                    child: secciones[i],
                                  ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    )
                  : SliverList.separated(
                      itemCount: secciones.length,
                      separatorBuilder: (_, _) =>
                          const SizedBox(height: Space.lg),
                      itemBuilder: (_, int i) => secciones[i],
                    ),
            ),
          ],
        ),
      ),
      backgroundColor: c.bg,
    );
  }
}

// ── Cabecera ─────────────────────────────────────────────────────────────

class _Cabecera extends StatelessWidget {
  const _Cabecera({required this.esTorre, required this.onCambiarTema});

  final bool esTorre;
  final ValueChanged<bool> onCambiarTema;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final bool ancho = !context.isCompact;

    return Padding(
      padding: EdgeInsets.fromLTRB(
        ancho ? Space.x3 : Space.lg,
        Space.xxl,
        ancho ? Space.x3 : Space.lg,
        Space.xxl,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Text('ONROUTE', style: AppText.labelSm.copyWith(color: c.brass)),
              const SizedBox(width: Space.sm),
              Text('·', style: AppText.labelSm.copyWith(color: c.ink3)),
              const SizedBox(width: Space.sm),
              Text(
                'ONDIGITAL',
                style: AppText.labelSm.copyWith(color: c.ink3),
              ),
            ],
          ),
          const SizedBox(height: Space.md),
          Text('Sistema visual', style: AppText.displayLg.copyWith(color: c.ink)),
          const SizedBox(height: Space.sm),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 560),
            child: Text(
              'Los dos temas no son una preferencia: son dos escenas. '
              'Calle es el vendedor bajo el sol de San Pedro Sula; Torre es quien '
              'mira la flota moverse en una pantalla grande.',
              style: AppText.body.copyWith(color: c.ink2),
            ),
          ),
          const SizedBox(height: Space.xl),
          _SelectorTema(esTorre: esTorre, onCambiar: onCambiarTema),
        ],
      ),
    );
  }
}

class _SelectorTema extends StatelessWidget {
  const _SelectorTema({required this.esTorre, required this.onCambiar});

  final bool esTorre;
  final ValueChanged<bool> onCambiar;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    Widget opcion(String label, IconData icono, bool torre) {
      final bool activa = esTorre == torre;
      return Expanded(
        child: Material(
          color: activa ? c.surface : Colors.transparent,
          borderRadius: Radii.allMd,
          child: InkWell(
            onTap: () => onCambiar(torre),
            borderRadius: Radii.allMd,
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: Space.md),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: <Widget>[
                  Icon(icono, size: 16, color: activa ? c.ink : c.ink3),
                  const SizedBox(width: Space.sm),
                  Text(
                    label,
                    style: AppText.label
                        .copyWith(color: activa ? c.ink : c.ink3),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 320),
      child: Container(
        padding: const EdgeInsets.all(Space.xs),
        decoration: BoxDecoration(
          color: c.bgSunk,
          borderRadius: Radii.allLg,
        ),
        child: Row(
          children: <Widget>[
            opcion('Calle', Icons.wb_sunny_outlined, false),
            opcion('Torre', Icons.hub_outlined, true),
          ],
        ),
      ),
    );
  }
}

// ── Andamiaje de sección ─────────────────────────────────────────────────

class _Seccion extends StatelessWidget {
  const _Seccion({
    required this.titulo,
    required this.nota,
    required this.child,
  });

  final String titulo;
  final String nota;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Panel(
      padding: const EdgeInsets.all(Space.xl),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(titulo, style: AppText.titleMd.copyWith(color: c.ink)),
          const SizedBox(height: Space.xs),
          Text(nota, style: AppText.bodySm.copyWith(color: c.ink2)),
          const SizedBox(height: Space.xl),
          child,
        ],
      ),
    );
  }
}

// ── Color ────────────────────────────────────────────────────────────────

class _SeccionColor extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final List<(String, String, Color)> fichas = <(String, String, Color)>[
      ('Latón', 'valor · dinero', c.brass),
      ('Violeta', 'lo activo ahora', c.violet),
      ('Verde', 'cobrado', c.collected),
      ('Ámbar', 'pendiente', c.pending),
      ('Rojo', 'descuadre', c.danger),
    ];

    return _Seccion(
      titulo: 'Color',
      nota: 'Heredado de Pulso Vital. Cada tono tiene un significado de '
          'negocio fijo; no hay color decorativo.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          for (final (String nombre, String uso, Color color) in fichas)
            Padding(
              padding: const EdgeInsets.only(bottom: Space.md),
              child: Row(
                children: <Widget>[
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: color,
                      borderRadius: Radii.allMd,
                    ),
                  ),
                  const SizedBox(width: Space.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(
                          nombre,
                          style: AppText.titleSm.copyWith(color: c.ink),
                        ),
                        Text(
                          uso,
                          style: AppText.bodySm.copyWith(color: c.ink2),
                        ),
                      ],
                    ),
                  ),
                  Text(
                    _hex(color),
                    style: AppText.dataSm.copyWith(color: c.ink3),
                  ),
                ],
              ),
            ),
          const SizedBox(height: Space.sm),
          Text(
            'Tinta: ink 4.9:1 mínimo en los tres niveles. Verificado contra '
            'WCAG AA antes de fijar los hexadecimales.',
            style: AppText.bodySm.copyWith(color: c.ink3),
          ),
        ],
      ),
    );
  }

  static String _hex(Color c) =>
      '#${((c.r * 255).round() << 16 | (c.g * 255).round() << 8 | (c.b * 255).round()).toRadixString(16).padLeft(6, '0').toUpperCase()}';
}

// ── Tipografía ───────────────────────────────────────────────────────────

class _SeccionTipografia extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return _Seccion(
      titulo: 'Tipografía',
      nota: 'Fraunces solo titula. Inter opera. JetBrains Mono lleva toda '
          'cifra comparable, siempre tabular.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            'Buenos días, Marvin',
            style: AppText.displayMd.copyWith(color: c.ink),
          ),
          const SizedBox(height: Space.sm),
          Text(
            'Ruta Centro · 14 paradas',
            style: AppText.body.copyWith(color: c.ink2),
          ),
          const SizedBox(height: Space.lg),
          const Divider(),
          const SizedBox(height: Space.lg),
          // La prueba de que las cifras tabulares hacen su trabajo: dos filas
          // con dígitos de anchos muy distintos que igual alinean a la derecha.
          for (final (String etiqueta, double monto) in <(String, double)>[
            ('Pulpería La Esperanza', 1180),
            ('Distribuidora El Puente', 11840.5),
            ('Súper Mini El Trébol', 940.25),
          ])
            Padding(
              padding: const EdgeInsets.only(bottom: Space.sm),
              child: Row(
                children: <Widget>[
                  Expanded(
                    child: Text(
                      etiqueta,
                      style: AppText.bodySm.copyWith(color: c.ink2),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: Space.md),
                  MoneyText(monto, color: c.ink),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

// ── Estados ──────────────────────────────────────────────────────────────

class _SeccionEstados extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return _Seccion(
      titulo: 'Estados',
      nota: 'Color y palabra siempre juntos. Bajo el sol, un verde y un ámbar '
          'tenues se parecen demasiado.',
      child: Wrap(
        spacing: Space.sm,
        runSpacing: Space.sm,
        children: const <Widget>[
          StatusPill(
            label: 'Cobrado',
            tono: Tono.cobrado,
            icono: Icons.check_rounded,
          ),
          StatusPill(
            label: 'Local cerrado',
            tono: Tono.pendiente,
            icono: Icons.schedule_rounded,
          ),
          StatusPill(
            label: 'Descuadre L 430',
            tono: Tono.alerta,
            icono: Icons.priority_high_rounded,
          ),
          StatusPill(
            label: 'Siguiente parada',
            tono: Tono.activo,
            icono: Icons.navigation_rounded,
          ),
          StatusPill(label: 'Carga L 18,400', tono: Tono.valor),
          StatusPill(label: 'Camión 2', tono: Tono.neutro),
        ],
      ),
    );
  }
}

// ── Dinero ───────────────────────────────────────────────────────────────

class _SeccionDinero extends StatelessWidget {
  const _SeccionDinero({
    required this.cobrado,
    required this.onCobro,
    required this.onReiniciar,
  });

  final double cobrado;
  final VoidCallback onCobro;
  final VoidCallback onReiniciar;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return _Seccion(
      titulo: 'Dinero',
      nota: 'El total no parpadea a su nuevo valor: los dígitos ruedan. El '
          'cambio se ve ocurrir.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            'COBRADO HOY',
            style: AppText.labelSm.copyWith(color: c.ink3),
          ),
          const SizedBox(height: Space.sm),
          MoneyOdometer(cobrado, color: c.ink, conCentavos: false),
          const SizedBox(height: Space.lg),
          // `Wrap` y no `Row`: a 390 px de ancho —un iPhone corriente— los dos
          // botones con su altura cómoda de 56 y su respiro horizontal se
          // salían del panel. En una app que se usa de pie y con una mano, el
          // target no se encoge; el que se acomoda es el renglón.
          Wrap(
            spacing: Space.md,
            runSpacing: Space.sm,
            children: <Widget>[
              FilledButton(
                onPressed: onCobro,
                child: const Text('Registrar cobro'),
              ),
              TextButton(onPressed: onReiniciar, child: const Text('Reiniciar')),
            ],
          ),
        ],
      ),
    );
  }
}

// ── Ruta ─────────────────────────────────────────────────────────────────

class _SeccionRoute extends StatelessWidget {
  const _SeccionRoute({required this.hechas, required this.total});

  final int hechas;
  final int total;

  static const List<(String, String, double)> _paradas =
      <(String, String, double)>[
    ('Pulpería La Esperanza', 'Barrio El Centro, cerca del Parque Central', 1180),
    ('Súper Mini El Trébol', '3a Avenida NO esquina 6 Calle NO', 940.25),
    ('Distribuidora El Puente', 'Barrio Río de Piedras', 11840.5),
    ('Bodega San Miguel', 'Mercado Guamilito', 2340),
  ];

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    return _Seccion(
      titulo: 'Línea de ruta',
      nota: 'La firma estructural. Las filas se cosen en una sola línea y el '
          'progreso viaja por ella.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            children: <Widget>[
              Flexible(
                child: Text(
                  '$hechas de $total paradas',
                  style: AppText.data.copyWith(color: c.ink2),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: Space.sm),
              Text(
                Formatos.hora(DateTime(2026, 8, 28, 11, 15)),
                style: AppText.dataSm.copyWith(color: c.ink3),
              ),
            ],
          ),
          const SizedBox(height: Space.md),
          RouteProgress(hechas: hechas, total: total),
          const SizedBox(height: Space.xl),
          for (int i = 0; i < _paradas.length; i++)
            RouteRow(
              estado: switch (i) {
                0 => EstadoParada.hecha,
                1 => EstadoParada.actual,
                _ => EstadoParada.pendiente,
              },
              esPrimera: i == 0,
              esUltima: i == _paradas.length - 1,
              child: Padding(
                padding: const EdgeInsets.only(bottom: Space.xl),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Row(
                      children: <Widget>[
                        Expanded(
                          child: Text(
                            _paradas[i].$1,
                            style: AppText.titleSm.copyWith(color: c.ink),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: Space.sm),
                        MoneyText(
                          _paradas[i].$3,
                          color: i == 0 ? c.collected : c.ink2,
                          conCentavos: false,
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _paradas[i].$2,
                      style: AppText.bodySm.copyWith(color: c.ink3),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// ── Cristal ──────────────────────────────────────────────────────────────

class _SeccionCristal extends StatelessWidget {
  const _SeccionCristal();

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return _Seccion(
      titulo: 'Cristal',
      nota: 'Solo sobre contenido vivo. La opacidad está calibrada contra el '
          'tile de mapa más claro, no elegida a ojo.',
      child: ClipRRect(
        borderRadius: Radii.allLg,
        child: SizedBox(
          height: 200,
          child: Stack(
            fit: StackFit.expand,
            children: <Widget>[
              const _MapaSimulado(),
              Align(
                alignment: Alignment.bottomCenter,
                child: Padding(
                  padding: const EdgeInsets.all(Space.md),
                  child: GlassPanel(
                    padding: const EdgeInsets.all(Space.lg),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(
                          'El Rojo · Marvin Aguilar',
                          style: AppText.titleSm.copyWith(color: c.ink),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: Space.xs),
                        Text(
                          'Barrio Río de Piedras, en movimiento',
                          style: AppText.bodySm.copyWith(color: c.ink2),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: Space.md),
                        // La pastilla va sobre relleno opaco justamente porque
                        // está encima del cristal: `danger` como texto suelto
                        // sobre cristal cae a 2.44:1.
                        const StatusPill(
                          label: 'Descuadre L 430',
                          tono: Tono.alerta,
                          densa: true,
                        ),
                      ],
                    ),
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

/// Mapa de mentira, y dicho de frente: una retícula que se desplaza, solo para
/// que el cristal tenga algo vivo detrás mientras la Fase 2 conecta los tiles
/// de OpenStreetMap de verdad.
class _MapaSimulado extends StatefulWidget {
  const _MapaSimulado();

  @override
  State<_MapaSimulado> createState() => _MapaSimuladoState();
}

class _MapaSimuladoState extends State<_MapaSimulado>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl = AnimationController(
    vsync: this,
    duration: const Duration(seconds: 24),
  )..repeat();

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (context.reduceMotion) {
      return CustomPaint(painter: _MapaPainter(context.colors, 0));
    }
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (BuildContext context, _) => CustomPaint(
        painter: _MapaPainter(context.colors, _ctrl.value),
      ),
    );
  }
}

class _MapaPainter extends CustomPainter {
  _MapaPainter(this.c, this.t);

  final OnRouteColors c;
  final double t;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawRect(
      Offset.zero & size,
      Paint()..color = c.isDark ? c.bgSunk : c.surfaceAlt,
    );

    final Paint calle = Paint()
      ..color = c.isDark ? c.border : c.borderStrong
      ..strokeWidth = 6;
    final Paint calleMenor = Paint()
      ..color = c.isDark ? c.border : c.border
      ..strokeWidth = 2;

    const double paso = 46;
    final double dx = (t * paso * 2) % paso;
    final double dy = (t * paso) % paso;

    for (double x = -paso + dx; x < size.width + paso; x += paso) {
      canvas.drawLine(
        Offset(x, 0),
        Offset(x, size.height),
        x.round() % 2 == 0 ? calleMenor : calle,
      );
    }
    for (double y = -paso + dy; y < size.height + paso; y += paso) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), calleMenor);
    }

    // La ruta trazada encima, y el camión avanzando sobre ella.
    final Path ruta = Path()
      ..moveTo(-20, size.height * 0.78)
      ..cubicTo(
        size.width * 0.3,
        size.height * 0.62,
        size.width * 0.45,
        size.height * 0.30,
        size.width + 20,
        size.height * 0.22,
      );
    canvas.drawPath(
      ruta,
      Paint()
        ..color = c.brass
        ..style = PaintingStyle.stroke
        ..strokeWidth = 3
        ..strokeCap = StrokeCap.round,
    );

    final PathMetric metrica = ruta.computeMetrics().first;
    final Offset pos =
        metrica.getTangentForOffset(metrica.length * ((t * 2) % 1))!.position;
    {
      canvas
        ..drawCircle(pos, 11, Paint()..color = c.violet.withValues(alpha: 0.25))
        ..drawCircle(pos, 6, Paint()..color = c.violet);
    }
  }

  @override
  bool shouldRepaint(covariant _MapaPainter old) =>
      old.t != t || old.c != c;
}
