/// La Bodega Rodante.
///
/// ## Qué hace distinta a esta pantalla
///
/// En una app de reparto la carga es una lista de cantidades que se descuenta.
/// Acá la carga es la **planta del camión**, y el conteo de cierre se hace
/// tocando la posición física que se está mirando. De ahí sale la propiedad que
/// vale: el dibujo no ilustra los números, **el dibujo es los números**. El
/// total de arriba es la suma de lo que se ve abajo, y cuando el conteo no
/// cuadra la casilla culpable está señalada en el mismo sitio donde está el
/// bulto en la vida real.
///
/// Por eso el resumen no muestra "descuadre: L 430" y ya: muestra bultos y
/// valor por separado, porque el que cuenta cuenta bultos y el que responde
/// responde por lempiras.
library;

import 'package:flutter/material.dart';

import '../../../../data/repositories/ruta_repository.dart';
import '../../../../domain/models/bodega.dart';
import '../../../../domain/models/producto.dart';
import '../../../core/format/formatos.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/typography.dart';
import '../../../core/theme/palette.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/money.dart';
import '../../../core/widgets/panel.dart';
import '../widgets/parrilla.dart';

class BodegaView extends StatefulWidget {
  const BodegaView({super.key, required this.repo});

  final RutaRepository repo;

  @override
  State<BodegaView> createState() => _BodegaViewState();
}

class _BodegaViewState extends State<BodegaView> {
  String? _seleccionada;

  RutaRepository get _repo => widget.repo;
  Bodega get _bodega => _repo.ruta.bodega;

  @override
  void initState() {
    super.initState();
    _repo.addListener(_alCambiar);
  }

  @override
  void dispose() {
    _repo.removeListener(_alCambiar);
    super.dispose();
  }

  void _alCambiar() => setState(() {});

  @override
  Widget build(BuildContext context) {
    final double ancho = MediaQuery.sizeOf(context).width;
    final bool amplio = !Breakpoints.isCompact(ancho);

    final Widget parrilla = Parrilla(
      bodega: _bodega,
      seleccionada: _seleccionada,
      onTocar: _abrirConteo,
    );

    final Widget resumen = _Resumen(bodega: _bodega);

    return Scaffold(
      backgroundColor: context.colors.bg,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(Space.lg),
          child: amplio
              // En pantalla ancha el resumen acompaña a la parrilla en vez de
              // empujarla fuera de vista: en la torre se miran juntos.
              ? Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Expanded(flex: 3, child: parrilla),
                    const SizedBox(width: Space.lg),
                    SizedBox(width: 300, child: resumen),
                  ],
                )
              : ListView(
                  children: <Widget>[
                    resumen,
                    const SizedBox(height: Space.lg),
                    parrilla,
                    const SizedBox(height: Space.lg),
                  ],
                ),
        ),
      ),
    );
  }

  Future<void> _abrirConteo(Casilla c) async {
    setState(() => _seleccionada = c.id);
    final int? contado = await showModalBottomSheet<int>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (BuildContext ctx) => _HojaConteo(
        casilla: c,
        producto: _bodega.producto(c.sku),
      ),
    );
    if (!mounted) return;
    setState(() => _seleccionada = null);
    if (contado != null) {
      _repo.contarCasilla(casillaId: c.id, contado: contado);
    }
  }
}

class _Resumen extends StatelessWidget {
  const _Resumen({required this.bodega});

  final Bodega bodega;

  @override
  Widget build(BuildContext context) {
    final OnRouteColors c = context.colors;
    final int faltan = bodega.bultosFaltantes;
    final int contadas =
        bodega.casillas.where((Casilla x) => x.contado != null).length;

    return Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            'Arriba del camión',
            style: Theme.of(context).textTheme.labelMedium?.copyWith(
                  color: c.ink3,
                ),
          ),
          const SizedBox(height: Space.xs),
          MoneyText(
            bodega.valorEnCamion.enLempiras,
            style: AppText.moneyLg,
            color: c.brass,
          ),
          const SizedBox(height: Space.xs),
          Text(
            '${bodega.bultosEnCamion} de ${bodega.bultosSalida} bultos · '
            'vendido ${Formatos.lempirasCorto(bodega.valorVendido.enLempiras)}',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: c.ink2),
          ),
          const Divider(height: Space.xxl),

          // El conteo se reporta como progreso y no como booleano porque a
          // media parrilla contada la pregunta útil es "cuántas faltan", no
          // "¿ya terminaste?".
          Text(
            bodega.conteoCompleto
                ? 'Parrilla contada completa'
                : 'Contadas $contadas de ${bodega.casillas.length} posiciones',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: bodega.conteoCompleto ? c.collected : c.pending,
                ),
          ),
          if (bodega.conteoCompleto) ...<Widget>[
            const SizedBox(height: Space.sm),
            if (faltan == 0)
              Text(
                'El conteo cuadra con lo despachado',
                style:
                    Theme.of(context).textTheme.bodySmall?.copyWith(color: c.ink2),
              )
            else
              // Bultos y lempiras van separados: uno se cuenta subido al
              // camión, el otro se responde en la oficina.
              Text(
                faltan > 0
                    ? '$faltan bultos sin aparecer · '
                        '${Formatos.lempirasCorto(bodega.valorFaltante.enLempiras)}'
                    : '${-faltan} bultos de más en el conteo',
                style: Theme.of(context)
                    .textTheme
                    .bodyMedium
                    ?.copyWith(color: c.danger),
              ),
          ],
        ],
      ),
    );
  }
}

/// Teclado de conteo. Sin campo de texto libre: se cuenta de pie, junto al
/// camión, y un teclado numérico completo invita a teclear el número que la app
/// ya esperaba. Los botones grandes con la cifra teórica al centro hacen que
/// confirmar sea un toque y corregir también.
class _HojaConteo extends StatefulWidget {
  const _HojaConteo({required this.casilla, required this.producto});

  final Casilla casilla;
  final Producto producto;

  @override
  State<_HojaConteo> createState() => _HojaConteoState();
}

class _HojaConteoState extends State<_HojaConteo> {
  late int _valor = widget.casilla.contado ?? widget.casilla.enCamion;

  @override
  Widget build(BuildContext context) {
    final OnRouteColors c = context.colors;
    final int teorico = widget.casilla.enCamion;
    final int dif = _valor - teorico;

    return Container(
      decoration: BoxDecoration(color: c.surface, borderRadius: Radii.topSheet),
      padding: EdgeInsets.only(
        left: Space.lg,
        right: Space.lg,
        top: Space.lg,
        bottom: MediaQuery.viewInsetsOf(context).bottom + Space.xxl,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(widget.producto.etiqueta,
              style: Theme.of(context).textTheme.titleMedium),
          Text(
            'Posición ${widget.casilla.fila + 1}-${widget.casilla.columna + 1} · '
            'debería haber ${widget.producto.unidad.contar(teorico)}',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(color: c.ink2),
          ),
          const SizedBox(height: Space.xl),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: <Widget>[
              _Boton(
                icono: Icons.remove,
                onTap: _valor > 0 ? () => setState(() => _valor--) : null,
              ),
              Expanded(
                child: Column(
                  children: <Widget>[
                    Text(
                      '$_valor',
                      style: Theme.of(context).textTheme.displaySmall?.copyWith(
                            color: dif == 0 ? c.ink : c.danger,
                            fontFeatures: const <FontFeature>[
                              FontFeature.tabularFigures(),
                            ],
                          ),
                    ),
                    Text(
                      dif == 0
                          ? 'cuadra'
                          : dif < 0
                              ? 'faltan ${-dif}'
                              : 'sobran $dif',
                      style: Theme.of(context).textTheme.labelMedium?.copyWith(
                            color: dif == 0 ? c.collected : c.danger,
                          ),
                    ),
                  ],
                ),
              ),
              _Boton(
                icono: Icons.add,
                onTap: () => setState(() => _valor++),
              ),
            ],
          ),
          const SizedBox(height: Space.xl),
          SizedBox(
            width: double.infinity,
            height: Touch.comfortable,
            child: FilledButton(
              onPressed: () => Navigator.of(context).pop(_valor),
              child: const Text('Registrar conteo'),
            ),
          ),
        ],
      ),
    );
  }
}

class _Boton extends StatelessWidget {
  const _Boton({required this.icono, this.onTap});

  final IconData icono;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => SizedBox(
        width: Touch.comfortable,
        height: Touch.comfortable,
        child: IconButton.filledTonal(onPressed: onTap, icon: Icon(icono)),
      );
}
