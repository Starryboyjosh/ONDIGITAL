/// El registro de conductores: quién maneja qué, quién anda libre y quién ya
/// salió de la rotación.
///
/// Hasta esta pantalla el conductor era un `String` dentro del camión: se podía
/// leer en el mapa y nada más. Acá se da de alta, se corrige, se asigna unidad
/// y se da de baja —y todo eso se ve inmediatamente en la torre, porque el
/// mismo repositorio que guarda a la persona es el que rotula el camión.
///
/// ## Por qué la baja pregunta y el resto no
///
/// Editar un teléfono se deshace escribiéndolo otra vez. Dar de baja suelta la
/// unidad y saca a alguien de la rotación: eso sí merece una confirmación, y la
/// confirmación dice qué camión queda libre, porque esa es la consecuencia que
/// a quien está frente a la pantalla se le olvida.
library;

import 'package:flutter/material.dart';

import '../../../../data/repositories/conductor_repository.dart';
import '../../../../domain/models/camion.dart';
import '../../../../domain/models/conductor.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../../../core/widgets/panel.dart';
import '../../../core/widgets/status_pill.dart';
import '../widgets/hoja_conductor.dart';

class ConductoresView extends StatefulWidget {
  const ConductoresView({super.key, required this.repo});

  final ConductorRepository repo;

  @override
  State<ConductoresView> createState() => _ConductoresViewState();
}

class _ConductoresViewState extends State<ConductoresView> {
  @override
  void initState() {
    super.initState();
    widget.repo.addListener(_refrescar);
  }

  @override
  void dispose() {
    widget.repo.removeListener(_refrescar);
    super.dispose();
  }

  void _refrescar() {
    if (mounted) setState(() {});
  }

  void _avisar(ResultadoConductor r, {String? exito}) {
    if (!mounted) return;
    final String? texto = r.exito ? exito : r.mensaje;
    if (texto == null) return;
    ScaffoldMessenger.of(context)
      ..clearSnackBars()
      ..showSnackBar(SnackBar(content: Text(texto)));
  }

  Future<void> _nuevo() async {
    final DatosConductor? d = await abrirHojaConductor(context);
    if (d == null || !mounted) return;
    final ResultadoConductor r = widget.repo.registrar(
      nombre: d.nombre,
      dni: d.dni,
      telefono: d.telefono,
      licencia: d.licencia,
    );
    _avisar(r, exito: '${d.nombre} quedó registrado');
  }

  Future<void> _editar(Conductor c) async {
    final DatosConductor? d = await abrirHojaConductor(context, inicial: c);
    if (d == null || !mounted) return;
    final ResultadoConductor r = widget.repo.editar(
      id: c.id,
      nombre: d.nombre,
      dni: d.dni,
      telefono: d.telefono,
      licencia: d.licencia,
    );
    _avisar(r, exito: 'Datos de ${d.nombre} actualizados');
  }

  Future<void> _asignar(Conductor c) async {
    final List<Camion> flota = widget.repo.camiones;
    final String? camionId = await showModalBottomSheet<String>(
      context: context,
      builder: (BuildContext hoja) => _HojaAsignar(
        conductor: c,
        camiones: flota,
        ocupadoPor: <String, Conductor>{
          for (final Camion cam in flota)
            if (widget.repo.conductorDelCamion(cam.id) != null)
              cam.id: widget.repo.conductorDelCamion(cam.id)!,
        },
      ),
    );
    if (camionId == null || !mounted) return;

    if (camionId == _HojaAsignar.sinUnidad) {
      _avisar(
        widget.repo.liberar(c.id),
        exito: '${c.nombre} quedó sin unidad',
      );
      return;
    }
    final ResultadoConductor r =
        widget.repo.asignar(conductorId: c.id, camionId: camionId);
    final Camion? cam = widget.repo.camionPorId(camionId);
    _avisar(r, exito: '${c.nombre} va en ${cam?.apodo ?? camionId}');
  }

  Future<void> _darDeBaja(Conductor c) async {
    final Camion? cam =
        c.camionId == null ? null : widget.repo.camionPorId(c.camionId!);
    final bool? confirmado = await showDialog<bool>(
      context: context,
      builder: (BuildContext dlg) => AlertDialog(
        title: Text('¿Dar de baja a ${c.nombre}?'),
        content: Text(
          cam == null
              ? 'Sale de la rotación y deja de aparecer para asignarle unidad. '
                  'Sus rutas anteriores no se tocan.'
              : 'Sale de la rotación y ${cam.apodo} (${cam.placa}) queda sin '
                  'conductor asignado. Sus rutas anteriores no se tocan.',
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.of(dlg).pop(false),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dlg).pop(true),
            child: const Text('Dar de baja'),
          ),
        ],
      ),
    );
    if (confirmado != true || !mounted) return;
    _avisar(
      widget.repo.darDeBaja(c.id),
      exito: '${c.nombre} quedó fuera de la rotación',
    );
  }

  @override
  Widget build(BuildContext context) {
    final OnRouteColors c = context.colors;
    final List<Conductor> todos = widget.repo.conductores;
    final List<Conductor> activos =
        todos.where((Conductor x) => x.activo).toList();
    final List<Conductor> bajas =
        todos.where((Conductor x) => !x.activo).toList();
    final int enRuta =
        activos.where((Conductor x) => x.camionId != null).length;

    return Scaffold(
      backgroundColor: c.bg,
      appBar: AppBar(
        backgroundColor: c.bg,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        title: Text(
          'Conductores',
          style: AppText.titleMd.copyWith(color: c.ink),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _nuevo,
        icon: const Icon(Icons.person_add_alt),
        label: const Text('Nuevo'),
      ),
      body: SafeArea(
        top: false,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(
            Space.lg,
            Space.sm,
            Space.lg,
            Space.x6 + Space.xl,
          ),
          children: <Widget>[
            Text(
              '${activos.length} en el registro · $enRuta con unidad'
              '${bajas.isEmpty ? '' : ' · ${bajas.length} de baja'}',
              style: AppText.bodySm.copyWith(color: c.ink3),
            ),
            const SizedBox(height: Space.lg),
            for (final Conductor x in activos) ...<Widget>[
              _FilaConductor(
                conductor: x,
                camion: x.camionId == null
                    ? null
                    : widget.repo.camionPorId(x.camionId!),
                onEditar: () => _editar(x),
                onAsignar: () => _asignar(x),
                onDarDeBaja: () => _darDeBaja(x),
              ),
              const SizedBox(height: Space.md),
            ],
            if (bajas.isNotEmpty) ...<Widget>[
              const SizedBox(height: Space.lg),
              Text(
                'Fuera de la rotación',
                style: AppText.label.copyWith(color: c.ink3),
              ),
              const SizedBox(height: Space.xs),
              Text(
                'No se borran: siguen firmando las rutas que ya manejaron.',
                style: AppText.bodySm.copyWith(color: c.ink3),
              ),
              const SizedBox(height: Space.md),
              for (final Conductor x in bajas) ...<Widget>[
                _FilaBaja(
                  conductor: x,
                  onReactivar: () => _avisar(
                    widget.repo.reactivar(x.id),
                    exito: '${x.nombre} vuelve a la rotación, sin unidad',
                  ),
                ),
                const SizedBox(height: Space.md),
              ],
            ],
          ],
        ),
      ),
    );
  }
}

// ── Filas ────────────────────────────────────────────────────────────────

class _FilaConductor extends StatelessWidget {
  const _FilaConductor({
    required this.conductor,
    required this.camion,
    required this.onEditar,
    required this.onAsignar,
    required this.onDarDeBaja,
  });

  final Conductor conductor;
  final Camion? camion;
  final VoidCallback onEditar;
  final VoidCallback onAsignar;
  final VoidCallback onDarDeBaja;

  @override
  Widget build(BuildContext context) {
    final OnRouteColors c = context.colors;

    return Panel(
      padding: const EdgeInsets.all(Space.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              _Avatar(iniciales: conductor.iniciales),
              const SizedBox(width: Space.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(
                      conductor.nombre,
                      style: AppText.titleSm.copyWith(color: c.ink),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${conductor.dniFormateado} · '
                      '${conductor.telefonoFormateado}',
                      style: AppText.dataSm.copyWith(color: c.ink3),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: Space.sm),
              camion == null
                  ? const StatusPill(
                      label: 'Sin unidad',
                      tono: Tono.neutro,
                      densa: true,
                    )
                  : StatusPill(
                      label: camion!.apodo,
                      tono: Tono.cobrado,
                      icono: Icons.local_shipping_outlined,
                      densa: true,
                    ),
            ],
          ),
          const SizedBox(height: Space.md),
          Row(
            children: <Widget>[
              StatusPill(
                label: 'Licencia ${conductor.licencia.etiqueta.toLowerCase()}',
                tono: conductor.puedeConducirCamion
                    ? Tono.neutro
                    : Tono.pendiente,
                densa: true,
              ),
              if (camion != null) ...<Widget>[
                const SizedBox(width: Space.sm),
                Flexible(
                  child: Text(
                    camion!.placa,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AppText.dataSm.copyWith(color: c.ink3),
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: Space.md),
          // Envuelto y no en `Row`: en un teléfono de 320 px los tres botones
          // no caben en una línea y el último quedaría cortado.
          Wrap(
            spacing: Space.sm,
            runSpacing: Space.sm,
            children: <Widget>[
              OutlinedButton.icon(
                onPressed: onAsignar,
                icon: const Icon(Icons.local_shipping_outlined, size: 18),
                label: Text(camion == null ? 'Asignar' : 'Cambiar'),
              ),
              TextButton.icon(
                onPressed: onEditar,
                icon: const Icon(Icons.edit_outlined, size: 18),
                label: const Text('Editar'),
              ),
              TextButton.icon(
                onPressed: onDarDeBaja,
                icon: const Icon(Icons.person_off_outlined, size: 18),
                label: const Text('Dar de baja'),
                style: TextButton.styleFrom(foregroundColor: c.danger),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _FilaBaja extends StatelessWidget {
  const _FilaBaja({required this.conductor, required this.onReactivar});

  final Conductor conductor;
  final VoidCallback onReactivar;

  @override
  Widget build(BuildContext context) {
    final OnRouteColors c = context.colors;

    return Panel(
      color: c.bgSunk,
      padding: const EdgeInsets.symmetric(
        horizontal: Space.lg,
        vertical: Space.md,
      ),
      child: Row(
        children: <Widget>[
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  conductor.nombre,
                  style: AppText.titleSm.copyWith(color: c.ink2),
                ),
                const SizedBox(height: 2),
                Text(
                  conductor.dniFormateado,
                  style: AppText.dataSm.copyWith(color: c.ink3),
                ),
              ],
            ),
          ),
          TextButton(
            onPressed: onReactivar,
            child: const Text('Reactivar'),
          ),
        ],
      ),
    );
  }
}

class _Avatar extends StatelessWidget {
  const _Avatar({required this.iniciales});

  final String iniciales;

  @override
  Widget build(BuildContext context) {
    final OnRouteColors c = context.colors;

    return Container(
      width: 40,
      height: 40,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: c.violetSoft,
        borderRadius: Radii.pill,
      ),
      child: Text(
        iniciales,
        style: AppText.label.copyWith(color: c.violet),
      ),
    );
  }
}

// ── Hoja de asignación ───────────────────────────────────────────────────

class _HojaAsignar extends StatelessWidget {
  const _HojaAsignar({
    required this.conductor,
    required this.camiones,
    required this.ocupadoPor,
  });

  /// Valor devuelto para «dejarlo sin unidad». No es un id de camión y por eso
  /// no puede chocar con ninguno.
  static const String sinUnidad = '';

  final Conductor conductor;
  final List<Camion> camiones;
  final Map<String, Conductor> ocupadoPor;

  @override
  Widget build(BuildContext context) {
    final OnRouteColors c = context.colors;
    final bool puede = conductor.puedeConducirCamion;

    // Sin decoración propia: la hoja modal la pinta el tema. Ver `hoja_cobro`.
    return SafeArea(
      top: false,
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(
          Space.xl,
          Space.xl,
          Space.xl,
          Space.xl,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(
              'Unidad de ${conductor.nombre}',
              style: AppText.titleLg.copyWith(color: c.ink),
            ),
            const SizedBox(height: Space.xs),
            Text(
              puede
                  ? 'Si el camión ya trae conductor, esa persona queda sin '
                      'unidad.'
                  : 'Tiene licencia liviana: no puede llevar un camión de '
                      'reparto. Cambiale la licencia primero.',
              style: AppText.bodySm.copyWith(color: c.ink3),
            ),
            const SizedBox(height: Space.lg),
            for (final Camion cam in camiones) ...<Widget>[
              _OpcionCamion(
                camion: cam,
                seleccionado: conductor.camionId == cam.id,
                ocupante: ocupadoPor[cam.id],
                habilitada: puede,
                onTap: () => Navigator.of(context).pop(cam.id),
              ),
              const SizedBox(height: Space.sm),
            ],
            if (conductor.camionId != null) ...<Widget>[
              const SizedBox(height: Space.sm),
              SizedBox(
                width: double.infinity,
                child: TextButton.icon(
                  onPressed: () => Navigator.of(context).pop(sinUnidad),
                  icon: const Icon(Icons.link_off, size: 18),
                  label: const Text('Dejarlo sin unidad'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _OpcionCamion extends StatelessWidget {
  const _OpcionCamion({
    required this.camion,
    required this.seleccionado,
    required this.ocupante,
    required this.habilitada,
    required this.onTap,
  });

  final Camion camion;
  final bool seleccionado;
  final Conductor? ocupante;
  final bool habilitada;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final OnRouteColors c = context.colors;

    return Opacity(
      opacity: habilitada ? 1 : 0.5,
      child: Panel(
        onTap: habilitada ? onTap : null,
        color: seleccionado ? c.violetSoft : null,
        borderColor: seleccionado ? c.violet : null,
        padding: const EdgeInsets.symmetric(
          horizontal: Space.lg,
          vertical: Space.md,
        ),
        child: Row(
          children: <Widget>[
            Icon(
              seleccionado
                  ? Icons.radio_button_checked
                  : Icons.radio_button_unchecked,
              size: 20,
              color: seleccionado ? c.violet : c.ink3,
            ),
            const SizedBox(width: Space.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    '${camion.apodo} · ${camion.placa}',
                    style: AppText.titleSm.copyWith(color: c.ink),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    ocupante == null
                        ? 'Sin conductor asignado'
                        : seleccionado
                            ? 'Es el que trae hoy'
                            : 'Lo trae ${ocupante!.nombre}',
                    style: AppText.bodySm.copyWith(color: c.ink3),
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
