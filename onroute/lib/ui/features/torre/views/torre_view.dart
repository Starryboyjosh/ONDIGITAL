/// La torre: la flota sobre el mapa real de San Pedro Sula.
///
/// ## Por qué el mapa es de verdad y por qué eso obliga a cosas
///
/// Los tiles son de OpenStreetMap, que es gratuito y por eso **exige
/// atribución visible**: no es adorno legal, es la condición de uso. Va abajo a
/// la derecha, siempre, en las dos densidades.
///
/// Los tiles de OSM son claros y llenos de detalle —etiquetas de calles,
/// parques, comercios— que compiten con lo único que esta pantalla tiene que
/// comunicar: dónde va la flota. Por eso encima va `mapWash`, un velo que
/// convierte el mapa en contexto. Los paneles flotan en cristal porque acá sí
/// hay contenido vivo detrás; es el único lugar de OnRoute donde el cristal se
/// justifica.
library;

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

import '../../../../data/services/simulador_flota.dart';
import '../../../../domain/models/camion.dart';
import '../../../../domain/models/parada.dart';
import '../../../../domain/models/ruta.dart';
import '../../../core/format/formatos.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/panel.dart';
import '../torre_controller.dart';
import '../widgets/marcador_camion.dart';

class TorreView extends StatefulWidget {
  const TorreView({super.key, required this.controlador, this.conTiles = true});

  final TorreController controlador;

  /// En pruebas se apaga: `TileLayer` sale a la red y no hay red en un test.
  final bool conTiles;

  @override
  State<TorreView> createState() => _TorreViewState();
}

class _TorreViewState extends State<TorreView>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulso = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1600),
  );

  TorreController get _c => widget.controlador;

  @override
  void initState() {
    super.initState();
    _c.addListener(_refrescar);
    _c.simulador.addListener(_refrescar);
    _pulso.repeat();
  }

  @override
  void dispose() {
    _c.removeListener(_refrescar);
    _c.simulador.removeListener(_refrescar);
    _pulso.dispose();
    super.dispose();
  }

  void _refrescar() {
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final OnRouteColors c = context.colors;
    final bool compacto = Breakpoints.isCompact(MediaQuery.sizeOf(context).width);

    return Scaffold(
      backgroundColor: c.bg,
      body: Stack(
        children: <Widget>[
          _mapa(c),

          // El velo va entre el mapa y los datos, no dentro del mapa: así el
          // mapa se sigue pudiendo mover y el velo no se arrastra con él.
          Positioned.fill(
            child: IgnorePointer(child: ColoredBox(color: c.mapWash)),
          ),

          SafeArea(
            child: compacto
                ? Column(
                    children: <Widget>[
                      Padding(
                        padding: const EdgeInsets.all(Space.md),
                        child: _Resumen(controlador: _c),
                      ),
                      const Spacer(),
                      SizedBox(
                        height: 132,
                        child: _FlotaHorizontal(controlador: _c),
                      ),
                    ],
                  )
                : Align(
                    alignment: Alignment.centerLeft,
                    child: Padding(
                      padding: const EdgeInsets.all(Space.lg),
                      child: SizedBox(
                        width: 320,
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: <Widget>[
                            _Resumen(controlador: _c),
                            const SizedBox(height: Space.md),
                            Flexible(child: _FlotaVertical(controlador: _c)),
                          ],
                        ),
                      ),
                    ),
                  ),
          ),

          // Atribución de OpenStreetMap: condición de uso de los tiles.
          Positioned(
            right: Space.sm,
            bottom: Space.xs,
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: c.surface.withValues(alpha: 0.82),
                borderRadius: Radii.pill,
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: Space.sm,
                  vertical: 2,
                ),
                child: Text(
                  '© OpenStreetMap',
                  style: Theme.of(context)
                      .textTheme
                      .labelSmall
                      ?.copyWith(color: c.ink2),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _mapa(OnRouteColors c) => FlutterMap(
        options: MapOptions(
          initialCenter: _c.centro,
          initialZoom: 12.6,
          // La torre se mira, no se explora: sin rotación, que solo desorienta
          // a quien está buscando un camión.
          interactionOptions: const InteractionOptions(
            flags: InteractiveFlag.pinchZoom | InteractiveFlag.drag,
          ),
        ),
        children: <Widget>[
          if (widget.conTiles)
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'hn.ondigital.onroute',
              tileProvider: NetworkTileProvider(),
            ),
          PolylineLayer<Object>(
            polylines: <Polyline<Object>>[
              for (final Ruta r in _c.rutas)
                Polyline<Object>(
                  points: _c.trazos[r.id] ?? const <LatLng>[],
                  strokeWidth: r.camionId == _c.camionSeleccionado ? 4 : 2.5,
                  color: r.camionId == _c.camionSeleccionado
                      ? c.violet
                      : c.brass.withValues(alpha: 0.55),
                ),
            ],
          ),
          MarkerLayer(markers: <Marker>[..._paradas(c), ..._camiones()]),
        ],
      );

  /// Las paradas se dibujan chiquitas y sin etiqueta: son el escenario. Lo que
  /// se sigue es el camión.
  List<Marker> _paradas(OnRouteColors c) => <Marker>[
        for (final Ruta r in _c.rutas)
          for (final Parada p in r.paradas)
            Marker(
              point: p.cliente.posicion,
              width: 10,
              height: 10,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: p.atendida
                      ? c.collected
                      : p.estado == EstadoVisita.omitida
                          ? c.pending
                          : c.surface,
                  border: Border.all(color: c.borderStrong),
                ),
              ),
            ),
      ];

  List<Marker> _camiones() => <Marker>[
        for (final CamionSimulado s in _c.simulador.camiones)
          Marker(
            point: s.camion.rastro.posicion,
            width: 44,
            height: 44,
            child: AnimatedBuilder(
              animation: _pulso,
              builder: (BuildContext context, _) => MarcadorCamion(
                camion: s.camion,
                detenido: s.atendiendo || s.termino,
                pulso: _pulso.value,
                seleccionado: s.camion.id == _c.camionSeleccionado,
                onTap: () => _c.seleccionar(
                  s.camion.id == _c.camionSeleccionado ? null : s.camion.id,
                ),
              ),
            ),
          ),
      ];
}

class _Resumen extends StatelessWidget {
  const _Resumen({required this.controlador});

  final TorreController controlador;

  @override
  Widget build(BuildContext context) {
    final OnRouteColors c = context.colors;
    final List<CamionSimulado> flota = controlador.flota;
    final int andando = flota.where((CamionSimulado s) => !s.termino).length;

    return GlassPanel(
      padding: const EdgeInsets.all(Space.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Text(
            'Flota en calle',
            style: Theme.of(context).textTheme.labelMedium?.copyWith(color: c.ink2),
          ),
          const SizedBox(height: Space.xs),
          Text(
            '$andando de ${flota.length} camiones',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(color: c.ink),
          ),
          const SizedBox(height: Space.xs),
          Text(
            // Se dice de qué está hecha la línea que se está viendo. Hacer
            // pasar una recta por una ruta de calle sería mentir con el mapa.
            controlador.trazosReales == controlador.rutas.length
                ? 'Trazo sobre calle real'
                : 'Trazo estimado: sin conexión al ruteador',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: controlador.trazosReales == controlador.rutas.length
                      ? c.ink2
                      : c.pending,
                ),
          ),
        ],
      ),
    );
  }
}

class _FlotaVertical extends StatelessWidget {
  const _FlotaVertical({required this.controlador});

  final TorreController controlador;

  @override
  Widget build(BuildContext context) => ListView.separated(
        shrinkWrap: true,
        itemCount: controlador.flota.length,
        separatorBuilder: (_, _) => const SizedBox(height: Space.sm),
        itemBuilder: (BuildContext context, int i) => _FichaCamion(
          simulado: controlador.flota[i],
          controlador: controlador,
        ),
      );
}

class _FlotaHorizontal extends StatelessWidget {
  const _FlotaHorizontal({required this.controlador});

  final TorreController controlador;

  @override
  Widget build(BuildContext context) => ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: Space.md),
        itemCount: controlador.flota.length,
        separatorBuilder: (_, _) => const SizedBox(width: Space.sm),
        itemBuilder: (BuildContext context, int i) => SizedBox(
          width: 240,
          child: _FichaCamion(
            simulado: controlador.flota[i],
            controlador: controlador,
          ),
        ),
      );
}

/// Ficha de un camión. Encabeza el apodo y no la placa porque en una flota de
/// tres nadie dice "PCX 1234": dicen "el Rojo".
class _FichaCamion extends StatelessWidget {
  const _FichaCamion({required this.simulado, required this.controlador});

  final CamionSimulado simulado;
  final TorreController controlador;

  @override
  Widget build(BuildContext context) {
    final OnRouteColors c = context.colors;
    final Camion cam = simulado.camion;
    final bool activo = cam.id == controlador.camionSeleccionado;
    final Ruta r = simulado.ruta;

    final String estado = simulado.termino
        ? 'Terminó la ruta, ya en base'
        : simulado.regresando
            ? 'De regreso a la base'
            : simulado.atendiendo
                ? 'Atendiendo parada ${simulado.proximaParada} de ${r.total}'
                : 'Camino a la parada ${simulado.proximaParada + 1} de ${r.total}';

    return GlassPanel(
      padding: EdgeInsets.zero,
      child: Material(
        type: MaterialType.transparency,
        child: InkWell(
          borderRadius: Radii.allPanel,
          onTap: () => controlador.seleccionar(activo ? null : cam.id),
          child: Container(
            padding: const EdgeInsets.all(Space.md),
            decoration: BoxDecoration(
              borderRadius: Radii.allPanel,
              border: Border.all(
                color: activo ? c.violet : Colors.transparent,
                width: 2,
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                Row(
                  children: <Widget>[
                    Expanded(
                      child: Text(
                        cam.apodo,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context)
                            .textTheme
                            .titleSmall
                            ?.copyWith(color: c.ink),
                      ),
                    ),
                    Text(
                      Formatos.distancia(simulado.avance),
                      style: Theme.of(context)
                          .textTheme
                          .labelSmall
                          ?.copyWith(color: c.ink2),
                    ),
                  ],
                ),
                Text(
                  '${cam.conductor} · ${r.nombre}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context)
                      .textTheme
                      .bodySmall
                      ?.copyWith(color: c.ink2),
                ),
                const SizedBox(height: Space.sm),
                ClipRRect(
                  borderRadius: Radii.pill,
                  child: LinearProgressIndicator(
                    value: simulado.fraccionRecorrida,
                    minHeight: 4,
                    backgroundColor: c.bgSunk,
                    valueColor: AlwaysStoppedAnimation<Color>(
                      activo ? c.violet : c.brass,
                    ),
                  ),
                ),
                const SizedBox(height: Space.xs),
                Text(
                  estado,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context)
                      .textTheme
                      .bodySmall
                      ?.copyWith(color: c.ink2),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
