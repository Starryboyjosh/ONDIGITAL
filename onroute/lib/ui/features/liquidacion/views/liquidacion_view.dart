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

  void _alCambiar() => setState(() {});

  void _contarSobre() {
    final String texto = _sobreCtrl.text.trim();
    if (texto.isEmpty) return;
    final num? valor = num.tryParse(texto.replaceAll(',', '.'));
    if (valor == null) return;
    _repo.entregarEfectivo(Dinero.desdeDecimal(valor));
    if (_repo.listaParaCerrar) widget.alCerrar?.call();
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
  });

  final Liquidacion liquidacion;
  final TextEditingController sobreCtrl;
  final Dinero? efectivoEntregado;
  final VoidCallback onEntregarSobre;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        _EstadoCierre(liquidacion: liquidacion),
        const SizedBox(height: Space.lg),
        _Brechas(liquidacion: liquidacion),
        const SizedBox(height: Space.lg),
        _HojaSobre(
          ctrl: sobreCtrl,
          efectivoEntregado: efectivoEntregado,
          onEntregar: onEntregarSobre,
        ),
      ],
    );
  }
}

class _EstadoCierre extends StatelessWidget {
  const _EstadoCierre({required this.liquidacion});

  final Liquidacion liquidacion;

  @override
  Widget build(BuildContext context) {
    final OnRouteColors c = context.colors;
    final bool cuadra = liquidacion.todoCuadra;

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
                if (!cuadra)
                  Text(
                    // La brecha mayor titula el cierre porque es lo primero
                    // que quien lo abre necesita saber: cuál de las tres es
                    // la que hay que atender primero.
                    _titularBrecha(liquidacion),
                    style: Theme.of(context).textTheme.bodyMedium
                        ?.copyWith(color: c.ink2),
                  ),
              ],
            ),
          ),
          StatusPill(
            label: cuadra ? 'Todo cuadra' : 'Descuadre',
            tono: cuadra ? Tono.cobrado : Tono.alerta,
            icono: cuadra ? Icons.check_circle : Icons.error_outline,
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
  });

  final TextEditingController ctrl;
  final Dinero? efectivoEntregado;
  final VoidCallback onEntregar;

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
              'Ya se contó ${Formatos.lempiras(efectivoEntregado!.enLempiras)}. '
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
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  style: AppText.data,
                  decoration: const InputDecoration(
                    labelText: 'Efectivo del sobre',
                    prefixText: 'L ',
                  ),
                ),
              ),
              const SizedBox(width: Space.md),
              FilledButton(
                onPressed: onEntregar,
                child: const Text('Entregar'),
              ),
            ],
          ),
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
