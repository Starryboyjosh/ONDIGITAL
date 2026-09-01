/// La parrilla completa: la planta del camión, a escala.
///
/// La cuadrícula respeta `fila`/`columna` del dominio en vez de ordenar por
/// SKU, y eso es deliberado: la fila 0 es la de atrás, la que se descarga
/// primero. Cuando el vendedor busca en la app la casilla que tiene enfrente,
/// la encuentra en el mismo lugar del dibujo. Un grid ordenado alfabéticamente
/// se vería más limpio y sería inútil parado junto al camión.
library;

import 'package:flutter/material.dart';

import '../../../../domain/models/bodega.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/tokens.dart';
import 'casilla_tile.dart';

class Parrilla extends StatefulWidget {
  const Parrilla({
    super.key,
    required this.bodega,
    this.seleccionada,
    this.onTocar,
    this.alto,
  });

  final Bodega bodega;
  final String? seleccionada;
  final ValueChanged<Casilla>? onTocar;

  /// Alto fijo opcional. Sin él la parrilla toma el alto que le den y ajusta
  /// la relación de aspecto de sus casillas.
  final double? alto;

  @override
  State<Parrilla> createState() => _ParrillaState();
}

class _ParrillaState extends State<Parrilla>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl = AnimationController(
    vsync: this,
    duration: Motion.journey,
  );

  bool _arrancado = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_arrancado) return;
    _arrancado = true;
    // Con movimiento reducido no hay vaciado animado: la parrilla arranca ya
    // en su estado real. La animación cuenta una historia, pero el dato es lo
    // que importa y se muestra igual.
    //
    // Va acá y no en initState porque `MediaQuery` es un heredado y todavía no
    // está resuelto cuando initState corre.
    if (MediaQuery.maybeDisableAnimationsOf(context) ?? false) {
      _ctrl.value = 1;
    } else {
      _ctrl.forward();
    }
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final Bodega b = widget.bodega;
    final Map<int, Casilla> porPosicion = <int, Casilla>{
      for (final Casilla c in b.casillas) c.fila * b.columnas + c.columna: c,
    };

    final Widget grid = LayoutBuilder(
      builder: (BuildContext context, BoxConstraints cons) {
        const double hueco = Space.sm;
        final double anchoCelda =
            (cons.maxWidth - hueco * (b.columnas - 1)) / b.columnas;
        final double altoCelda = cons.maxHeight.isFinite
            ? (cons.maxHeight - hueco * (b.filas - 1)) / b.filas
            : 76;

        return GridView.builder(
          padding: EdgeInsets.zero,
          physics: const NeverScrollableScrollPhysics(),
          shrinkWrap: true,
          itemCount: b.filas * b.columnas,
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: b.columnas,
            mainAxisSpacing: hueco,
            crossAxisSpacing: hueco,
            childAspectRatio: anchoCelda / altoCelda.clamp(56.0, 120.0),
          ),
          itemBuilder: (BuildContext context, int i) {
            final Casilla? c = porPosicion[i];
            // Un camión no siempre va lleno: el hueco se dibuja como hueco.
            if (c == null) return const _Hueco();

            return AnimatedBuilder(
              animation: _ctrl,
              builder: (BuildContext context, _) => CasillaTile(
                casilla: c,
                producto: b.producto(c.sku),
                progreso: Curves.easeOutCubic.transform(_ctrl.value),
                seleccionada: c.id == widget.seleccionada,
                onTap: widget.onTocar == null
                    ? null
                    : () => widget.onTocar!(c),
              ),
            );
          },
        );
      },
    );

    return Semantics(
      container: true,
      label: 'Parrilla del camión, ${b.filas} filas por ${b.columnas} '
          'posiciones. ${b.bultosEnCamion} bultos arriba de '
          '${b.bultosSalida} cargados.',
      child: widget.alto == null
          ? grid
          : SizedBox(height: widget.alto, child: grid),
    );
  }
}

/// Posición que salió vacía de bodega. Se dibuja hundida y sin borde para que
/// se lea como espacio disponible y no como una casilla que se agotó.
class _Hueco extends StatelessWidget {
  const _Hueco();

  @override
  Widget build(BuildContext context) => Semantics(
        label: 'Posición vacía',
        child: DecoratedBox(
          decoration: BoxDecoration(
            borderRadius: Radii.allSm,
            color: context.colors.bgSunk,
          ),
        ),
      );
}
