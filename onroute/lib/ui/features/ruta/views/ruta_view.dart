/// La pantalla del vendedor en la calle: la lista de paradas del día.
///
/// ## Qué hace distinta a esta pantalla
///
/// El vendedor la mira de pie, a medio brazo, muchas veces con una mano
/// ocupada cargando producto. Por eso el encabezado no es un dashboard: es
/// tres números que responden las tres preguntas que importan en ese momento
/// —cómo voy, qué llevo cobrado, voy atrasado o no— y la lista debajo es la
/// ruta en sí, en el orden en que se camina. La próxima parada pendiente se
/// marca en violeta porque en OnRoute ese color siempre significa "lo activo
/// ahora" (ver `route_line.dart`), nunca un adorno.
library;

import 'package:flutter/material.dart';

import '../../../../data/repositories/ruta_repository.dart';
import '../../../../domain/models/parada.dart';
import '../../../../domain/models/ruta.dart';
import '../../../core/format/formatos.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../../../core/widgets/money.dart';
import '../../../core/widgets/panel.dart';
import '../../../core/widgets/route_line.dart';
import '../../../core/widgets/status_pill.dart';
import '../widgets/hoja_cobro.dart';

class RutaView extends StatefulWidget {
  const RutaView({super.key, required this.repo});

  final RutaRepository repo;

  @override
  State<RutaView> createState() => _RutaViewState();
}

class _RutaViewState extends State<RutaView> {
  String? _seleccionada;

  RutaRepository get _repo => widget.repo;
  Ruta get _ruta => _repo.ruta;

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
    final Parada? actual = _ruta.paradaActual;

    final Widget encabezado = _Encabezado(ruta: _ruta);

    final Widget lista = _ListaParadas(
      ruta: _ruta,
      seleccionada: _seleccionada,
      onTocar: _abrirParada,
    );

    return Scaffold(
      backgroundColor: context.colors.bg,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(Space.lg),
          child: amplio
              // En pantalla ancha el detalle de la parada seleccionada
              // acompaña la lista en vez de taparla con una hoja modal: hay
              // espacio de sobra y tapar la lista para ver un detalle sería
              // desperdiciarlo.
              ? Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    encabezado,
                    const SizedBox(height: Space.lg),
                    Expanded(
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          Expanded(
                            flex: 3,
                            child: SingleChildScrollView(child: lista),
                          ),
                          const SizedBox(width: Space.lg),
                          SizedBox(
                            width: 380,
                            child: _seleccionada == null
                                ? _PanelVacio(hayActual: actual != null)
                                : Panel(
                                    padding: EdgeInsets.zero,
                                    child: HojaCobro(
                                      key: ValueKey<String>(_seleccionada!),
                                      repo: _repo,
                                      parada: _ruta.porId(_seleccionada!)!,
                                      alTerminar: () =>
                                          setState(() => _seleccionada = null),
                                    ),
                                  ),
                          ),
                        ],
                      ),
                    ),
                  ],
                )
              : ListView(
                  children: <Widget>[
                    encabezado,
                    const SizedBox(height: Space.lg),
                    lista,
                  ],
                ),
        ),
      ),
    );
  }

  Future<void> _abrirParada(Parada p) async {
    if (context.isCompact) {
      setState(() => _seleccionada = p.id);
      await showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        // Sin `backgroundColor: Colors.transparent`. El tema ya pinta la hoja
        // (`bottomSheetTheme`: superficie, esquinas de `Radii.topSheet` y asa),
        // y volverla transparente dejaba el asa —48 px de alto táctil— flotando
        // sobre un hueco vacío, con el contenido empezando recién debajo.
        builder: (BuildContext ctx) => HojaCobro(
          repo: _repo,
          parada: p,
          alTerminar: () => Navigator.of(ctx).pop(),
        ),
      );
      if (!mounted) return;
      setState(() => _seleccionada = null);
    } else {
      setState(() => _seleccionada = p.id);
    }
  }
}

class _Encabezado extends StatelessWidget {
  const _Encabezado({required this.ruta});

  final Ruta ruta;

  @override
  Widget build(BuildContext context) {
    final OnRouteColors c = context.colors;
    final int atraso = ruta.atrasoMinutos;

    return Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      ruta.nombre,
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: Space.xs),
                    Text(
                      // Dos cuentas, no una. La barra de abajo mide paradas
                      // **visitadas** —incluye las que se omitieron, porque
                      // pasar y no vender también gasta la mañana— y el
                      // vendedor necesita además saber cuántas cobró. Con una
                      // sola cifra, la barra iba siempre un paso adelante del
                      // número que tenía encima y no había forma de saber por
                      // qué.
                      '${ruta.atendidas} ${ruta.atendidas == 1 ? 'cobrada' : 'cobradas'} · '
                      '${ruta.cerradas} de ${ruta.total} visitadas',
                      style: Theme.of(context).textTheme.bodyMedium
                          ?.copyWith(color: c.ink2),
                    ),
                  ],
                ),
              ),
              if (atraso > 0)
                StatusPill(
                  label:
                      '${Formatos.duracion(Duration(minutes: atraso))} atraso',
                  tono: Tono.alerta,
                  icono: Icons.schedule,
                ),
            ],
          ),
          const SizedBox(height: Space.lg),
          RouteProgress(hechas: ruta.cerradas, total: ruta.total),
          const SizedBox(height: Space.lg),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(
                'Cobrado hoy',
                style: Theme.of(context).textTheme.labelMedium
                    ?.copyWith(color: c.ink3),
              ),
            ],
          ),
          const SizedBox(height: Space.xs),
          MoneyOdometer(
            ruta.cobradoTotal.enLempiras,
            style: AppText.moneyLg,
            color: c.brass,
          ),
        ],
      ),
    );
  }
}

class _PanelVacio extends StatelessWidget {
  const _PanelVacio({required this.hayActual});

  final bool hayActual;

  @override
  Widget build(BuildContext context) {
    final OnRouteColors c = context.colors;
    return Panel(
      child: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: Space.xxl),
          child: Text(
            hayActual
                ? 'Toca una parada para ver o registrar el cobro.'
                : 'Ruta completa: no quedan paradas pendientes.',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium
                ?.copyWith(color: c.ink2),
          ),
        ),
      ),
    );
  }
}

class _ListaParadas extends StatelessWidget {
  const _ListaParadas({
    required this.ruta,
    required this.seleccionada,
    required this.onTocar,
  });

  final Ruta ruta;
  final String? seleccionada;
  final ValueChanged<Parada> onTocar;

  @override
  Widget build(BuildContext context) {
    final Parada? proximaPendiente = ruta.paradaActual;

    return Column(
      children: <Widget>[
        for (int i = 0; i < ruta.paradas.length; i++)
          _FilaParada(
            parada: ruta.paradas[i],
            esPrimera: i == 0,
            esUltima: i == ruta.paradas.length - 1,
            esLaProxima: proximaPendiente?.id == ruta.paradas[i].id,
            seleccionada: seleccionada == ruta.paradas[i].id,
            onTocar: () => onTocar(ruta.paradas[i]),
          ),
      ],
    );
  }
}

class _FilaParada extends StatelessWidget {
  const _FilaParada({
    required this.parada,
    required this.esPrimera,
    required this.esUltima,
    required this.esLaProxima,
    required this.seleccionada,
    required this.onTocar,
  });

  final Parada parada;
  final bool esPrimera;
  final bool esUltima;

  /// `true` solo en la parada pendiente que sigue: se destaca en violeta
  /// porque en OnRoute ese color significa "lo activo ahora", nunca decoración.
  final bool esLaProxima;
  final bool seleccionada;
  final VoidCallback onTocar;

  @override
  Widget build(BuildContext context) {
    final OnRouteColors c = context.colors;

    final EstadoParada estadoLinea = parada.cerrada
        ? EstadoParada.hecha
        : esLaProxima
        ? EstadoParada.actual
        : EstadoParada.pendiente;

    final ({String label, Tono tono}) estadoPill = switch (parada.estado) {
      EstadoVisita.pendiente =>
        esLaProxima
            ? (label: 'Siguiente', tono: Tono.activo)
            : (label: 'Pendiente', tono: Tono.neutro),
      EstadoVisita.enSitio => (label: 'En sitio', tono: Tono.activo),
      EstadoVisita.cobrada => (label: 'Cobrado', tono: Tono.cobrado),
      EstadoVisita.credito => (label: 'Con fiado', tono: Tono.pendiente),
      EstadoVisita.omitida => (label: 'No se vendió', tono: Tono.neutro),
    };

    return Semantics(
      button: true,
      label: '${parada.orden}. ${parada.cliente.nombre}, ${estadoPill.label}',
      child: RouteRow(
        estado: estadoLinea,
        esPrimera: esPrimera,
        esUltima: esUltima,
        child: Padding(
          padding: const EdgeInsets.only(bottom: Space.md),
          child: Panel(
            onTap: onTocar,
            borderColor: esLaProxima
                ? c.violet
                : (seleccionada ? c.violet : c.border),
            child: Row(
              children: <Widget>[
                SizedBox(
                  width: 26,
                  child: Text(
                    '${parada.orden}',
                    style: AppText.data.copyWith(color: c.ink3),
                  ),
                ),
                const SizedBox(width: Space.sm),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(
                        parada.cliente.nombre,
                        style: Theme.of(context).textTheme.titleSmall,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        Formatos.hora(parada.horaEstimada),
                        style: Theme.of(context).textTheme.bodySmall
                            ?.copyWith(color: c.ink2),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: Space.sm),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: <Widget>[
                    StatusPill(
                      label: estadoPill.label,
                      tono: estadoPill.tono,
                      densa: true,
                    ),
                    if (parada.atendida) ...<Widget>[
                      const SizedBox(height: Space.xs),
                      MoneyText(
                        parada.cobrado.enLempiras,
                        style: AppText.data,
                        color: c.ink2,
                      ),
                      // El fiado va en su propia línea y no sumado al cobrado:
                      // la pastilla dice "Con fiado" pero no cuánto, y sin
                      // esta cifra la fila se lee como si el cliente hubiera
                      // pagado todo. Es la misma regla de los tres montos de
                      // la hoja de cobro, aplicada a la lista.
                      if (!parada.credito.esCero) ...<Widget>[
                        const SizedBox(height: 2),
                        Text(
                          'fiado ${Formatos.lempirasCorto(parada.credito.enLempiras)}',
                          style: AppText.dataSm.copyWith(color: c.pending),
                        ),
                      ],
                    ],
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
