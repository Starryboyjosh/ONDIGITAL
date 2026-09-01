/// El armazón de la app: una ruta, cinco pantallas, un solo repositorio.
///
/// ## Por qué el estado se crea acá y no en cada pantalla
///
/// [RutaRepository] es el único dueño del estado de negocio, y las cinco
/// pantallas son vistas distintas del **mismo día de trabajo**: lo que el
/// vendedor cobra en Ruta vacía la parrilla que Bodega dibuja y mueve las
/// cifras que Liquidación cuadra. Si cada pantalla creara su propio
/// repositorio, la app se vería igual y estaría mintiendo: cuatro días
/// paralelos que nunca se enteran uno del otro.
///
/// La torre es la excepción y por eso tiene su propio controlador: simula la
/// flota entera, no la ruta de esta persona, y su reloj corre aunque nadie la
/// esté viendo —un camión que se congela al cambiar de pestaña no es una
/// flota, es una foto.
///
/// ## Navegación por ancho, no por plataforma
///
/// En teléfono la navegación va abajo, al alcance del pulgar de quien está
/// parado junto al camión. En pantalla ancha va en un riel lateral. La
/// decisión la toma el ancho disponible, nunca `Platform.isAndroid`: la misma
/// app corre en un teléfono, en una tablet apoyada en el tablero y en la
/// computadora de la oficina.
library;

import 'package:flutter/material.dart';

import '../data/repositories/ruta_repository.dart';
import '../data/semilla/semilla_tegucigalpa.dart';
import 'core/theme/app_theme.dart';
import 'core/theme/palette.dart';
import 'core/theme/tokens.dart';
import 'features/bodega/views/bodega_view.dart';
import 'core/marca/marca_onroute.dart';
import 'features/identidad/views/identidad_view.dart';
import 'features/liquidacion/views/liquidacion_view.dart';
import 'features/ruta/views/ruta_view.dart';
import 'features/torre/torre_controller.dart';
import 'features/torre/views/torre_view.dart';
import 'features/vito/views/vito_chat_view.dart';

/// Una pestaña del armazón. El orden es el del día de trabajo: primero se ve
/// la flota, después se carga, después se vende, y al final se cuadra.
enum Destino {
  torre('Torre', Icons.map_outlined, Icons.map),
  bodega('Bodega', Icons.grid_view_outlined, Icons.grid_view),
  ruta('Ruta', Icons.route_outlined, Icons.route),
  liquidacion('Cierre', Icons.calculate_outlined, Icons.calculate),
  vito('Vito', Icons.chat_bubble_outline, Icons.chat_bubble),
  identidad('Identidad', Icons.palette_outlined, Icons.palette);

  const Destino(this.etiqueta, this.icono, this.iconoActivo);

  final String etiqueta;
  final IconData icono;
  final IconData iconoActivo;
}

class AppShell extends StatefulWidget {
  const AppShell({super.key, this.conTiles = true});

  /// Igual que en [TorreView]: en pruebas se apaga porque `TileLayer` sale a
  /// la red.
  final bool conTiles;

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  late final RutaRepository _repo = RutaRepository(rutaDelDia(variante: 1));
  late final TorreController _torre = TorreController();

  Destino _destino = Destino.torre;

  /// `null` = el tema lo decide el ancho. Un valor = alguien lo forzó desde la
  /// pantalla de identidad y se respeta hasta que lo cambie.
  bool? _torreForzada;

  @override
  void initState() {
    super.initState();
    _arrancarTorre();
  }

  Future<void> _arrancarTorre() async {
    await _torre.preparar();
    if (!mounted) return;
    _torre.simulador.iniciar();
  }

  @override
  void dispose() {
    _torre.dispose();
    _repo.dispose();
    super.dispose();
  }

  Widget _pantalla(bool esTorre) {
    switch (_destino) {
      case Destino.torre:
        return TorreView(controlador: _torre, conTiles: widget.conTiles);
      case Destino.bodega:
        return BodegaView(repo: _repo);
      case Destino.ruta:
        return RutaView(repo: _repo);
      case Destino.liquidacion:
        return LiquidacionView(repo: _repo);
      case Destino.vito:
        return VitoChatView(repo: _repo);
      case Destino.identidad:
        return IdentidadView(
          esTorre: esTorre,
          onCambiarTema: (bool v) => setState(() => _torreForzada = v),
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final double ancho = MediaQuery.sizeOf(context).width;
    final bool compacto = Breakpoints.isCompact(ancho);
    final bool esTorre = _torreForzada ?? !compacto;
    final ThemeData tema = esTorre ? AppTheme.torre : AppTheme.calle;

    return Theme(
      data: tema,
      child: Builder(
        builder: (BuildContext context) {
          final OnRouteColors c = context.colors;
          final Widget cuerpo = _pantalla(esTorre);

          if (compacto) {
            return Scaffold(
              backgroundColor: c.bg,
              appBar: AppBar(
                backgroundColor: c.bg,
                surfaceTintColor: Colors.transparent,
                elevation: 0,
                toolbarHeight: 48,
                titleSpacing: Space.lg,
                title: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: <Widget>[
                    MarcaOnRoute(
                      tamano: 22,
                      sobreOscuro: esTorre,
                    ),
                    const SizedBox(width: Space.xs),
                    Text(
                      'OnRoute',
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            color: c.ink,
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                  ],
                ),
              ),
              body: cuerpo,
              bottomNavigationBar: NavigationBar(
                selectedIndex: _destino.index,
                onDestinationSelected: (int i) =>
                    setState(() => _destino = Destino.values[i]),
                destinations: <Widget>[
                  for (final Destino d in Destino.values)
                    NavigationDestination(
                      icon: Icon(d.icono),
                      selectedIcon: Icon(d.iconoActivo),
                      label: d.etiqueta,
                    ),
                ],
              ),
            );
          }

          return Scaffold(
            backgroundColor: c.bg,
            body: Row(
              children: <Widget>[
                NavigationRail(
                  selectedIndex: _destino.index,
                  onDestinationSelected: (int i) =>
                      setState(() => _destino = Destino.values[i]),
                  labelType: NavigationRailLabelType.all,
                  backgroundColor: c.surface,
                  // El isotipo va acá, en el riel, y no en un `AppBar`
                  // aparte: en escritorio la marca vive donde vive la
                  // navegación, no encima del contenido.
                  leading: Padding(
                    padding: const EdgeInsets.symmetric(vertical: Space.lg),
                    child: MarcaOnRoute(tamano: 32, sobreOscuro: esTorre),
                  ),
                  destinations: <NavigationRailDestination>[
                    for (final Destino d in Destino.values)
                      NavigationRailDestination(
                        icon: Icon(d.icono),
                        selectedIcon: Icon(d.iconoActivo),
                        label: Text(d.etiqueta),
                      ),
                  ],
                ),
                Expanded(child: cuerpo),
              ],
            ),
          );
        },
      ),
    );
  }
}
