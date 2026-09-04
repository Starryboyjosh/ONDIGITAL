/// Ajustes: donde se configura la app.
///
/// ## Por qué existe esta pantalla
///
/// El selector de tema vivía dentro de la pantalla de identidad de marca, que
/// es una referencia del sistema de diseño —paleta, tipografía, componentes—
/// y no un panel de control. Quien quería cambiar de registro visual tenía que
/// entrar a un catálogo de color a buscarlo. Las opciones de la app salen de la
/// navegación principal y entran acá.
///
/// ## Por qué las rutas empujadas llevan el tema a cuestas
///
/// El armazón envuelve su contenido en un `Theme(...)` propio, y las rutas que
/// se empujan con `Navigator.push` se construyen bajo el `Navigator` del
/// `MaterialApp` —**fuera** de ese `Theme`. Sin volver a envolverlas, el
/// registro de conductores abriría en el tema contrario al elegido: se elige
/// Torre y se abre Calle. Por eso [tema] es obligatorio.
library;

import 'package:flutter/material.dart';

import '../../../../data/repositories/conductor_repository.dart';
import '../../../../domain/models/conductor.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../../../core/widgets/panel.dart';
import '../../../core/widgets/selector_tema.dart';
import '../../conductores/views/conductores_view.dart';
import '../../identidad/views/identidad_view.dart';

class AjustesView extends StatelessWidget {
  const AjustesView({
    super.key,
    required this.repo,
    required this.tema,
    required this.temaForzado,
    required this.esTorre,
    required this.onCambiarTema,
  });

  final ConductorRepository repo;

  /// El tema vigente del armazón. Se pasa explícito para vestir con él las
  /// pantallas que esta abre por encima —ver la nota de la librería.
  final ThemeData tema;

  /// La preferencia cruda: `null` = automático.
  final bool? temaForzado;

  /// El tema que se está pintando ahora mismo.
  final bool esTorre;

  final ValueChanged<bool?> onCambiarTema;

  void _abrir(BuildContext context, Widget pantalla) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (BuildContext _) => Theme(data: tema, child: pantalla),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    // El conteo de la fila de Conductores tiene que moverse en cuanto alguien
    // da de alta o de baja a una persona en la pantalla de al lado. Sin esto,
    // se vuelve de Conductores a Ajustes y la fila sigue diciendo el número
    // viejo, que es la clase de mentira pequeña que hace desconfiar del resto.
    return ListenableBuilder(
      listenable: repo,
      builder: (BuildContext context, Widget? _) => _cuerpo(context),
    );
  }

  Widget _cuerpo(BuildContext context) {
    final OnRouteColors c = context.colors;
    final bool ancho = !context.isCompact;
    final double margen = ancho ? Space.x3 : Space.lg;
    final int conUnidad = repo.activos
        .where((Conductor x) => x.camionId != null)
        .length;

    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: ListView(
          padding: EdgeInsets.fromLTRB(margen, Space.xxl, margen, Space.x6),
          children: <Widget>[
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 720),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    'Ajustes',
                    style: AppText.displayLg.copyWith(color: c.ink),
                  ),
                  const SizedBox(height: Space.sm),
                  Text(
                    'Cómo se ve la app y quién la maneja.',
                    style: AppText.body.copyWith(color: c.ink2),
                  ),
                  const SizedBox(height: Space.x3),

                  // ── Apariencia ────────────────────────────────────────
                  _Bloque(
                    titulo: 'Apariencia',
                    detalle:
                        'Calle para el teléfono bajo el sol, Torre para la '
                        'pantalla grande de la oficina.',
                    child: SelectorTema(
                      forzado: temaForzado,
                      resuelto: esTorre,
                      onCambiar: onCambiarTema,
                    ),
                  ),
                  const SizedBox(height: Space.lg),

                  // ── Equipo ────────────────────────────────────────────
                  _Fila(
                    icono: Icons.badge_outlined,
                    titulo: 'Equipo · Conductores',
                    detalle: '${repo.activos.length} en el registro · '
                        '$conUnidad con unidad',
                    onTap: () => _abrir(context, ConductoresView(repo: repo)),
                  ),
                  const SizedBox(height: Space.md),

                  // ── Sistema visual ────────────────────────────────────
                  _Fila(
                    icono: Icons.palette_outlined,
                    titulo: 'Sistema visual',
                    detalle: 'Paleta, tipografía y componentes de OnRoute',
                    onTap: () => _abrir(
                      context,
                      IdentidadView(
                        temaForzado: temaForzado,
                        esTorre: esTorre,
                        onCambiarTema: onCambiarTema,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Un bloque con contenido propio dentro. Para lo que se configura ahí mismo,
/// sin salir de la pantalla.
class _Bloque extends StatelessWidget {
  const _Bloque({
    required this.titulo,
    required this.detalle,
    required this.child,
  });

  final String titulo;
  final String detalle;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final OnRouteColors c = context.colors;

    return Panel(
      padding: const EdgeInsets.all(Space.xl),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(titulo, style: AppText.titleSm.copyWith(color: c.ink)),
          const SizedBox(height: Space.xs),
          Text(detalle, style: AppText.bodySm.copyWith(color: c.ink3)),
          const SizedBox(height: Space.lg),
          child,
        ],
      ),
    );
  }
}

/// Una fila que lleva a otra pantalla.
class _Fila extends StatelessWidget {
  const _Fila({
    required this.icono,
    required this.titulo,
    required this.detalle,
    required this.onTap,
  });

  final IconData icono;
  final String titulo;
  final String detalle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final OnRouteColors c = context.colors;

    return Panel(
      onTap: onTap,
      padding: const EdgeInsets.symmetric(
        horizontal: Space.xl,
        vertical: Space.lg,
      ),
      child: Row(
        children: <Widget>[
          Icon(icono, size: 22, color: c.brass),
          const SizedBox(width: Space.lg),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(titulo, style: AppText.titleSm.copyWith(color: c.ink)),
                const SizedBox(height: 2),
                Text(
                  detalle,
                  style: AppText.bodySm.copyWith(color: c.ink3),
                ),
              ],
            ),
          ),
          const SizedBox(width: Space.sm),
          Icon(Icons.chevron_right, size: 20, color: c.ink3),
        ],
      ),
    );
  }
}
