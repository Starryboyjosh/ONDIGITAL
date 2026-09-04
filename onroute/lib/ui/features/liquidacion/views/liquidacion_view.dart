/// La liquidación: el cierre del día.
///
/// ## Las tres brechas no se suman
///
/// Un día de autoventa deja tres registros que tienen que coincidir, y cada
/// uno lo lleva alguien distinto (ver `domain/logic/cuadre.dart`): la
/// **brecha de venta** (parrilla contra paradas) señala al vendedor que no
/// anotó una entrega, la **brecha de caja** (efectivo esperado contra
/// entregado) señala a quien armó el sobre, y la **brecha de carga**
/// (bultos y lempiras que no aparecen en el conteo de la parrilla) señala a
/// bodega. Sumarlas en un solo número de "descuadre" borraría justo el dato
/// por el que existe esta pantalla: quién responde por qué. Por eso esta
/// vista siempre las muestra por separado, nunca colapsadas.
///
/// Tampoco se inventa un cero: si nadie contó la parrilla todavía
/// (`!liquidacion.conteoCompleto`), la brecha de carga es **desconocida**,
/// no cero, y la pantalla lo dice así de claro.
library;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../data/repositories/ruta_repository.dart';
import '../../../../domain/logic/cuadre.dart';
import '../../../../domain/models/dinero.dart';
import '../../../core/format/formatos.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../../../core/widgets/money.dart';
import '../../../core/widgets/panel.dart';
import '../../../core/widgets/status_pill.dart';
import '../../vito/vito_voz.dart';
import '../../vito/widgets/vito_panel.dart';

/// Pantalla de cierre del día. Escucha [repo] igual que `BodegaView`: no
/// tiene estado de negocio propio, solo lo que hace falta para dibujar el
/// formulario del sobre.
class LiquidacionView extends StatefulWidget {
  const LiquidacionView({super.key, required this.repo, this.alCerrar});

  final RutaRepository repo;

  /// Aviso opcional de que el cierre quedó firmado. Nunca `Navigator.pop`
  /// desde adentro: esta pantalla vive igual embebida en escritorio que como
  /// ruta modal en teléfono, y un `pop` interno rompe uno de los dos casos
  /// (la lección de `HojaCobro`, ver ese archivo).
  final VoidCallback? alCerrar;

  @override
  State<LiquidacionView> createState() => _LiquidacionViewState();
}

class _LiquidacionViewState extends State<LiquidacionView> {
  late final TextEditingController _sobreCtrl = TextEditingController();

  RutaRepository get _repo => widget.repo;

  @override
  void initState() {
    super.initState();
    _repo.addListener(_alCambiar);
  }

  @override
  void dispose() {
    _repo.removeListener(_alCambiar);
    _sobreCtrl.dispose();
    super.dispose();
  }

  /// Qué salió mal con lo que se tecleó en el sobre. `null` mientras no haya
  /// nada que contestar.
  String? _errorSobre;

  void _alCambiar() => setState(() {});

  /// Cuenta el sobre. Igual que en `hoja_cobro.dart`: todos los fallos se
  /// contestan. Un botón "Entregar" que no hace nada al tocarlo deja a quien
  /// cierra sin saber si el sobre quedó registrado, y esa duda es exactamente
  /// lo que esta pantalla existe para eliminar.
  void _contarSobre() {
    final num? valor = Formatos.monto(_sobreCtrl.text);
    if (valor == null) {
      setState(
        () => _errorSobre = _sobreCtrl.text.trim().isEmpty
            ? 'Escribe cuánto trae el sobre antes de entregarlo.'
            : 'No se entiende ese monto. Escribe solo la cifra, '
                  'por ejemplo 6,847.50.',
      );
      return;
    }

    if (!_repo.entregarEfectivo(Dinero.desdeDecimal(valor))) {
      setState(
        () => _errorSobre =
            'El sobre no puede traer menos de cero lempiras. Cuenta otra vez.',
      );
      return;
    }

    setState(() => _errorSobre = null);
    _avisar('Sobre contado: ${Formatos.lempiras(valor)}');
  }

  /// Firma el cierre. Es la única acción de esta pantalla que **termina** algo,
  /// y por eso pregunta antes: después de firmar, las tres brechas quedan como
  /// están y el día deja de moverse.
  Future<void> _cerrarDia() async {
    final Liquidacion l = _repo.liquidacion;
    final bool? sigue = await showDialog<bool>(
      context: context,
      builder: (BuildContext dialogo) => AlertDialog(
        title: const Text('Cerrar el día'),
        content: Text(
          l.todoCuadra
              ? 'Los tres libros cuadran. Al firmar, el día queda cerrado con '
                  'estas cifras.'
              : 'El día se cierra con las brechas como están: '
                  '${_titularBrecha(l)}. Queda registrado así.',
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.of(dialogo).pop(false),
            child: const Text('Todavía no'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogo).pop(true),
            child: const Text('Cerrar el día'),
          ),
        ],
      ),
    );

    if (sigue != true || !mounted) return;
    if (!_repo.cerrarDia()) return;
    _avisar('Día cerrado a las ${Formatos.hora(_repo.cerradoEn!)}');
    widget.alCerrar?.call();
  }

  void _avisar(String texto) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..clearSnackBars()
      ..showSnackBar(SnackBar(content: Text(texto)));
  }

  @override
  Widget build(BuildContext context) {
    final double ancho = MediaQuery.sizeOf(context).width;
    final bool amplio = !Breakpoints.isCompact(ancho);
    final Liquidacion liquidacion = _repo.liquidacion;

    final Widget cuadre = _Cuadre(
      liquidacion: liquidacion,
      sobreCtrl: _sobreCtrl,
      efectivoEntregado: _repo.efectivoEntregado,
      onEntregarSobre: _contarSobre,
      errorSobre: _errorSobre,
      listaParaCerrar: _repo.listaParaCerrar,
      cerradoEn: _repo.cerradoEn,
      onCerrarDia: _cerrarDia,
    );

    final Widget vito = VitoPanel(
      hallazgos: _repo.hallazgos,
      encabezado: saludo(
        paradasCerradas: _repo.ruta.cerradas,
        total: _repo.ruta.total,
      ),
      catalogo: _repo.ruta.bodega.catalogo,
    );

    return Scaffold(
      backgroundColor: context.colors.bg,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(Space.lg),
          child: amplio
              // Centrado y con ancho máximo: el cierre es una hoja que se lee,
              // no un tablero que se vigila. Estirarlo a 2560 px dejaría las
              // dos columnas flacas y separadas por medio metro de vacío; con
              // el tope, el espacio sobrante se lee como margen.
              ? Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 1180),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Expanded(
                          flex: 3,
                          child: SingleChildScrollView(child: cuadre),
                        ),
                        const SizedBox(width: Space.lg),
                        Expanded(
                          flex: 2,
                          child: SingleChildScrollView(child: vito),
                        ),
                      ],
                    ),
                  ),
                )
              : ListView(
                  children: <Widget>[
                    cuadre,
                    const SizedBox(height: Space.lg),
                    vito,
                    const SizedBox(height: Space.lg),
                  ],
                ),
        ),
      ),
    );
  }
}

class _Cuadre extends StatelessWidget {
  const _Cuadre({
    required this.liquidacion,
    required this.sobreCtrl,
    required this.efectivoEntregado,
    required this.onEntregarSobre,
    required this.errorSobre,
    required this.listaParaCerrar,
    required this.cerradoEn,
    required this.onCerrarDia,
  });

  final Liquidacion liquidacion;
  final TextEditingController sobreCtrl;
  final Dinero? efectivoEntregado;
  final VoidCallback onEntregarSobre;
  final String? errorSobre;
  final bool listaParaCerrar;
  final DateTime? cerradoEn;
  final VoidCallback onCerrarDia;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        _EstadoCierre(
          liquidacion: liquidacion,
          sobreContado: efectivoEntregado != null,
          cerradoEn: cerradoEn,
        ),
        const SizedBox(height: Space.lg),
        _Brechas(liquidacion: liquidacion),
        const SizedBox(height: Space.lg),
        _HojaSobre(
          error: errorSobre,
          ctrl: sobreCtrl,
          efectivoEntregado: efectivoEntregado,
          onEntregar: onEntregarSobre,
          bloqueada: cerradoEn != null,
        ),
        const SizedBox(height: Space.lg),
        _FirmaCierre(
          liquidacion: liquidacion,
          sobreContado: efectivoEntregado != null,
          listaParaCerrar: listaParaCerrar,
          cerradoEn: cerradoEn,
          onCerrarDia: onCerrarDia,
        ),
      ],
    );
  }
}

/// El encabezado del cierre. **Tres estados, no dos.**
///
/// La versión anterior solo sabía decir "Todo cuadra" o "Descuadre", y
/// `todoCuadra` exige además que la parrilla esté contada. Resultado: al abrir
/// la pantalla, con el día entero por medir, el cierre saludaba con la pastilla
/// roja de "Descuadre" y con «La brecha más grande es L 0.00 en el sobre de
/// efectivo» —una alarma sobre un cero, que es la peor forma de gastar la
/// alarma: quien la ve todos los días deja de creerle el día que dice algo.
///
/// Sin medir no hay descuadre ni cuadre: hay un día abierto, y lo que falta se
/// nombra. La alarma queda reservada para una brecha de verdad.
class _EstadoCierre extends StatelessWidget {
  const _EstadoCierre({
    required this.liquidacion,
    required this.sobreContado,
    required this.cerradoEn,
  });

  final Liquidacion liquidacion;
  final bool sobreContado;
  final DateTime? cerradoEn;

  @override
  Widget build(BuildContext context) {
    final OnRouteColors c = context.colors;
    final bool medido = sobreContado && liquidacion.conteoCompleto;
    final bool cuadra = liquidacion.todoCuadra;

    final ({String pastilla, Tono tono, IconData icono, String detalle}) estado;
    if (cerradoEn != null) {
      estado = (
        pastilla: 'Día cerrado',
        tono: cuadra ? Tono.cobrado : Tono.alerta,
        icono: Icons.lock_outline,
        detalle: cuadra
            ? 'Firmado a las ${Formatos.hora(cerradoEn!)} · los tres libros cuadraron'
            : 'Firmado a las ${Formatos.hora(cerradoEn!)} · ${_titularBrecha(liquidacion)}',
      );
    } else if (!medido) {
      estado = (
        pastilla: 'Día abierto',
        tono: Tono.pendiente,
        icono: Icons.pending_outlined,
        detalle: _queFalta(liquidacion, sobreContado: sobreContado),
      );
    } else if (cuadra) {
      estado = (
        pastilla: 'Todo cuadra',
        tono: Tono.cobrado,
        icono: Icons.check_circle,
        detalle: 'Los tres libros coinciden. Se puede firmar el cierre.',
      );
    } else {
      estado = (
        pastilla: 'Descuadre',
        tono: Tono.alerta,
        icono: Icons.error_outline,
        // La brecha mayor titula el cierre porque es lo primero que quien lo
        // abre necesita saber: cuál de las tres hay que atender primero.
        detalle: _titularBrecha(liquidacion),
      );
    }

    return Panel(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  'Cierre del día',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: Space.xs),
                Text(
                  estado.detalle,
                  style: Theme.of(context).textTheme.bodyMedium
                      ?.copyWith(color: c.ink2),
                ),
              ],
            ),
          ),
          const SizedBox(width: Space.sm),
          StatusPill(
            label: estado.pastilla,
            tono: estado.tono,
            icono: estado.icono,
          ),
        ],
      ),
    );
  }
}

/// Qué falta medir, dicho con nombre y no como un cero.
String _queFalta(Liquidacion l, {required bool sobreContado}) {
  if (!sobreContado && !l.conteoCompleto) {
    return 'Falta contar la parrilla y el sobre de efectivo.';
  }
  if (!l.conteoCompleto) return 'Falta contar la parrilla del camión.';
  return 'Falta contar el sobre de efectivo.';
}

/// La firma del cierre: la única acción que termina el día.
///
/// Antes esta pantalla no cerraba nada —`listaParaCerrar` existía, se
/// consultaba y no llevaba a ninguna parte—, así que el "cierre" era una vista
/// de lectura con un campo de texto. El botón está siempre visible y dice qué
/// le falta cuando no se puede tocar: un botón deshabilitado sin explicación
/// deja a quien cierra adivinando.
class _FirmaCierre extends StatelessWidget {
  const _FirmaCierre({
    required this.liquidacion,
    required this.sobreContado,
    required this.listaParaCerrar,
    required this.cerradoEn,
    required this.onCerrarDia,
  });

  final Liquidacion liquidacion;
  final bool sobreContado;
  final bool listaParaCerrar;
  final DateTime? cerradoEn;
  final VoidCallback onCerrarDia;

  @override
  Widget build(BuildContext context) {
    final OnRouteColors c = context.colors;
    final DateTime? firmado = cerradoEn;

    if (firmado != null) {
      return Panel(
        color: c.collectedSoft,
        borderColor: c.collected,
        child: Row(
          children: <Widget>[
            Icon(Icons.lock_outline, size: 20, color: c.collected),
            const SizedBox(width: Space.md),
            Expanded(
              child: Text(
                'El día quedó cerrado a las ${Formatos.hora(firmado)}. '
                'Las cifras ya no se mueven.',
                style: Theme.of(context).textTheme.bodyMedium
                    ?.copyWith(color: c.collected),
              ),
            ),
          ],
        ),
      );
    }

    return Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            'Firma del cierre',
            style: Theme.of(context).textTheme.labelMedium
                ?.copyWith(color: c.ink3),
          ),
          const SizedBox(height: Space.sm),
          Text(
            listaParaCerrar
                ? 'Todo lo que había que medir está medido. Al firmar, el día '
                    'se cierra con estas cifras.'
                : _queFalta(liquidacion, sobreContado: sobreContado),
            style: Theme.of(context).textTheme.bodyMedium
                ?.copyWith(color: listaParaCerrar ? c.ink2 : c.pending),
          ),
          const SizedBox(height: Space.lg),
          SizedBox(
            width: double.infinity,
            height: Touch.comfortable,
            child: FilledButton.icon(
              onPressed: listaParaCerrar ? onCerrarDia : null,
              icon: const Icon(Icons.lock_outline, size: 18),
              label: const Text('Cerrar el día'),
            ),
          ),
        ],
      ),
    );
  }
}

/// Las tres brechas, una fila cada una. A propósito no hay ningún total: cada
/// fila apunta a un responsable distinto y sumarlas les quitaría el sentido.
class _Brechas extends StatelessWidget {
  const _Brechas({required this.liquidacion});

  final Liquidacion liquidacion;

  @override
  Widget build(BuildContext context) {
    final OnRouteColors c = context.colors;

    return Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            'Los tres libros',
            style: Theme.of(context).textTheme.labelMedium
                ?.copyWith(color: c.ink3),
          ),
          const SizedBox(height: Space.md),
          _FilaBrecha(
            etiqueta: 'Brecha de venta',
            responsable: 'parrilla vs. paradas · vendedor',
            monto: liquidacion.brechaVenta,
            cuadra: liquidacion.ventaCuadra,
          ),
          const Divider(height: Space.xl),
          _FilaBrecha(
            etiqueta: 'Brecha de caja',
            responsable: 'esperado vs. sobre · caja',
            monto: liquidacion.brechaCaja,
            cuadra: liquidacion.cajaCuadra,
          ),
          const Divider(height: Space.xl),
          _FilaBrechaCarga(liquidacion: liquidacion),
        ],
      ),
    );
  }
}

class _FilaBrecha extends StatelessWidget {
  const _FilaBrecha({
    required this.etiqueta,
    required this.responsable,
    required this.monto,
    required this.cuadra,
  });

  final String etiqueta;
  final String responsable;
  final Dinero monto;
  final bool cuadra;

  @override
  Widget build(BuildContext context) {
    final OnRouteColors c = context.colors;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(etiqueta, style: Theme.of(context).textTheme.bodyLarge),
              Text(
                responsable,
                style: Theme.of(context).textTheme.bodySmall
                    ?.copyWith(color: c.ink2),
              ),
            ],
          ),
        ),
        MoneyText(
          monto.enLempiras,
          style: AppText.data,
          color: cuadra ? c.ink : c.danger,
        ),
      ],
    );
  }
}

/// La brecha de carga es distinta a las otras dos: mientras nadie cuente la
/// parrilla, no es cero, es desconocida. Mostrar L 0.00 acá sería mentir con
/// la cara de estar cuadrado.
class _FilaBrechaCarga extends StatelessWidget {
  const _FilaBrechaCarga({required this.liquidacion});

  final Liquidacion liquidacion;

  @override
  Widget build(BuildContext context) {
    final OnRouteColors c = context.colors;

    if (!liquidacion.conteoCompleto) {
      return Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  'Brecha de carga',
                  style: Theme.of(context).textTheme.bodyLarge,
                ),
                Text(
                  'parrilla · bodega',
                  style: Theme.of(context).textTheme.bodySmall
                      ?.copyWith(color: c.ink2),
                ),
                const SizedBox(height: Space.xs),
                Text(
                  'Todavía no se contó la parrilla. Cuenta lo que volvió en '
                  'el camión antes de cerrar.',
                  style: Theme.of(context).textTheme.bodySmall
                      ?.copyWith(color: c.pending),
                ),
              ],
            ),
          ),
          Text('Desconocida', style: AppText.data.copyWith(color: c.pending)),
        ],
      );
    }

    final int bultos = liquidacion.bultosFaltantes;
    final bool cuadra = bultos == 0;

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(
                'Brecha de carga',
                style: Theme.of(context).textTheme.bodyLarge,
              ),
              Text(
                cuadra
                    ? 'parrilla cuadrada · bodega'
                    : '${bultos.abs()} bultos · bodega',
                style: Theme.of(context).textTheme.bodySmall
                    ?.copyWith(color: c.ink2),
              ),
            ],
          ),
        ),
        MoneyText(
          liquidacion.valorCargaFaltante.enLempiras,
          style: AppText.data,
          color: cuadra ? c.ink : c.danger,
        ),
      ],
    );
  }
}

/// El campo del sobre: el conteo independiente que caja mete a mano. Va por
/// `Dinero.desdeDecimal`, nunca `double`, siguiendo la convención de
/// `hoja_cobro.dart`.
class _HojaSobre extends StatelessWidget {
  const _HojaSobre({
    required this.ctrl,
    required this.efectivoEntregado,
    required this.onEntregar,
    required this.error,
    required this.bloqueada,
  });

  final TextEditingController ctrl;
  final Dinero? efectivoEntregado;
  final VoidCallback onEntregar;
  final String? error;

  /// Con el día ya firmado el conteo del sobre deja de aceptar correcciones:
  /// si se pudiera seguir tecleando, la firma no habría cerrado nada.
  final bool bloqueada;

  @override
  Widget build(BuildContext context) {
    final OnRouteColors c = context.colors;

    return Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            'Conteo del sobre',
            style: Theme.of(context).textTheme.labelMedium
                ?.copyWith(color: c.ink3),
          ),
          const SizedBox(height: Space.sm),
          if (efectivoEntregado != null) ...<Widget>[
            Text(
              bloqueada
                  ? 'Se contó ${Formatos.lempiras(efectivoEntregado!.enLempiras)}. '
                      'El día está cerrado: ya no se corrige.'
                  : 'Ya se contó ${Formatos.lempiras(efectivoEntregado!.enLempiras)}. '
                      'Vuelve a entregar para corregir.',
              style: Theme.of(context).textTheme.bodySmall
                  ?.copyWith(color: c.ink2),
            ),
            const SizedBox(height: Space.sm),
          ],
          Row(
            children: <Widget>[
              Expanded(
                child: TextField(
                  controller: ctrl,
                  enabled: !bloqueada,
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  inputFormatters: <TextInputFormatter>[
                    FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]')),
                  ],
                  style: AppText.data,
                  decoration: const InputDecoration(
                    labelText: 'Efectivo del sobre',
                    prefixText: 'L ',
                  ),
                ),
              ),
              const SizedBox(width: Space.md),
              FilledButton(
                onPressed: bloqueada ? null : onEntregar,
                child: const Text('Entregar'),
              ),
            ],
          ),
          if (error != null) ...<Widget>[
            const SizedBox(height: Space.md),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(Space.md),
              decoration: BoxDecoration(
                color: c.dangerSoft,
                borderRadius: Radii.allMd,
              ),
              child: Text(
                error!,
                style: Theme.of(
                  context,
                ).textTheme.bodyMedium?.copyWith(color: c.danger),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Titula el cierre nombrando **cuál** de las tres brechas es la mayor, no
/// solo cuánto mide.
///
/// `Liquidacion.brechaMayor` devuelve el monto y ahí se pierde la identidad, y
/// la identidad es la mitad útil del dato: L 430 de caja se resuelven con
/// quien contó el sobre, y L 430 de carga con quien despachó la parrilla. Sin
/// el nombre, el titular obliga a bajar a leer las tres filas para saber a
/// quién llamar.
String _titularBrecha(Liquidacion l) {
  final String monto = Formatos.lempiras(l.brechaMayor.enLempiras);
  // Solo entra a la comparación lo que de verdad se midió: sin conteo de
  // parrilla, la brecha de carga no es cero, es desconocida, y no puede
  // ganar ni perder una comparación.
  final String cual =
      !l.cargaCuadra &&
          l.conteoCompleto &&
          l.valorCargaFaltante.magnitud == l.brechaMayor
      ? 'en la carga de la parrilla'
      : l.brechaCaja.magnitud == l.brechaMayor
      ? 'en el sobre de efectivo'
      : 'entre lo despachado y lo cobrado';
  return 'La brecha más grande es $monto $cual';
}
