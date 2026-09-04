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

    final Widget resumen = _Resumen(
      bodega: _bodega,
      onAceptarTeorico: _aceptarTeorico,
    );

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
    final Producto producto = _bodega.producto(c.sku);
    final int? contado = await showModalBottomSheet<int>(
      context: context,
      isScrollControlled: true,
      builder: (BuildContext ctx) => _HojaConteo(
        casilla: c,
        producto: producto,
      ),
    );
    if (!mounted) return;
    setState(() => _seleccionada = null);
    if (contado == null) return;

    _repo.contarCasilla(casillaId: c.id, contado: contado);
    _avisar(
      'Posición ${c.fila + 1}-${c.columna + 1}: '
      '${producto.unidad.contar(contado)}',
    );
  }

  /// Da por bueno el teórico de toda la parrilla, de una vez.
  ///
  /// La parrilla tiene 24 posiciones y hasta ahora la única forma de dejar el
  /// conteo completo —requisito para que el cierre pueda decir "todo cuadra"—
  /// era abrir 24 hojas modales y confirmar cada una. `aceptarConteoTeorico`
  /// existía en el repositorio desde el principio para exactamente esto y no la
  /// llamaba ninguna pantalla.
  ///
  /// Va con confirmación y con el nombre puesto: **no cuenta nada**, firma que
  /// se confía en el sistema. Presentarlo como "contar todo" sería vender un
  /// conteo que nadie hizo, que es justo el descuadre silencioso que este
  /// producto existe para impedir.
  Future<void> _aceptarTeorico() async {
    final int pendientes = _bodega.casillas
        .where((Casilla x) => x.contado == null)
        .length;

    final bool? sigue = await showDialog<bool>(
      context: context,
      builder: (BuildContext dialogo) => AlertDialog(
        title: const Text('Dar por bueno el teórico'),
        content: Text(
          'Quedan $pendientes ${pendientes == 1 ? 'posición' : 'posiciones'} '
          'sin contar. Se van a registrar con lo que el sistema dice que '
          'debería haber: no es un conteo, es firmar que se confía en la '
          'parrilla. Si alguna diferencia existe, el cierre no la va a ver.',
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.of(dialogo).pop(false),
            child: const Text('Mejor cuento'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogo).pop(true),
            child: const Text('Dar por bueno'),
          ),
        ],
      ),
    );

    if (sigue != true || !mounted) return;
    _repo.aceptarConteoTeorico();
    _avisar('Parrilla dada por buena sin contar: '
        '$pendientes ${pendientes == 1 ? 'posición' : 'posiciones'}');
  }

  void _avisar(String texto) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..clearSnackBars()
      ..showSnackBar(SnackBar(content: Text(texto)));
  }
}

class _Resumen extends StatelessWidget {
  const _Resumen({required this.bodega, required this.onAceptarTeorico});

  final Bodega bodega;
  final VoidCallback onAceptarTeorico;

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
          ] else ...<Widget>[
            const SizedBox(height: Space.md),
            SizedBox(
              width: double.infinity,
              height: Touch.comfortable,
              child: OutlinedButton.icon(
                onPressed: onAceptarTeorico,
                icon: const Icon(Icons.fact_check_outlined, size: 18),
                label: const Text('Dar por bueno el teórico'),
              ),
            ),
            const SizedBox(height: Space.xs),
            Text(
              'Cierra el conteo sin contar. Úsalo solo si la parrilla no se va '
              'a revisar.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(color: c.ink3),
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

    // Sin decoración propia: la hoja modal la pinta el tema. Ver `hoja_cobro`.
    return Padding(
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
                      // `displaySmall` ya es mono tabular en la escala de
                      // OnRoute (`AppText.dataXl`). Antes no estaba mapeado y
                      // caía en la escala de Material —Inter a 36 px—, de ahí
                      // que hubiera que forzarle las cifras tabulares a mano.
                      style: Theme.of(context).textTheme.displaySmall?.copyWith(
                            color: dif == 0 ? c.ink : c.danger,
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
