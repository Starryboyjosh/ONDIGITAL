/// La hoja de cobro: donde se registra lo que pasó en una parada.
///
/// ## Por qué tres montos y no uno
///
/// El cuadre de fin de día (`lib/domain/logic/cuadre.dart`) pregunta
/// exactamente cuánto papel debería traer encima el vendedor. Un solo campo
/// "total" no puede responder eso: un pago mixto de L 500 efectivo + L 300
/// transferencia y otro de L 800 puro fiado suman igual y son negocios
/// completamente distintos. Por eso el formulario nunca colapsa los tres
/// montos, y por eso el botón de registrar se bloquea mientras
/// `efectivo + transferencia + credito` no cuadre contra lo que vale lo
/// entregado (con la tolerancia de `cuadre.dart`): cerrar una parada con un
/// descuadre silencioso es justo lo que este producto existe para impedir.
library;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../../data/repositories/ruta_repository.dart';
import '../../../../domain/logic/cuadre.dart';
import '../../../../domain/models/bodega.dart';
import '../../../../domain/models/cliente.dart';
import '../../../../domain/models/dinero.dart';
import '../../../../domain/models/parada.dart';
import '../../../../domain/models/producto.dart';
import '../../../core/format/formatos.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../../../core/widgets/money.dart';

/// Hoja modal de cobro. Se abre sobre una parada pendiente, arranca con el
/// pedido esperado precargado y termina llamando a `repo.registrarEntrega`
/// o `repo.omitir`.
class HojaCobro extends StatefulWidget {
  const HojaCobro({
    super.key,
    required this.repo,
    required this.parada,
    required this.alTerminar,
  });

  final RutaRepository repo;
  final Parada parada;

  /// Qué hacer cuando la parada queda registrada u omitida. Va por callback y
  /// no por `Navigator.pop` porque esta hoja vive en dos sitios distintos: en
  /// teléfono es una hoja modal —una ruta del navegador— y en escritorio está
  /// incrustada en la columna derecha, donde no hay nada que cerrar. Un `pop`
  /// desde adentro funcionaba en teléfono y en escritorio sacaba de la pila la
  /// pantalla entera de la ruta.
  final VoidCallback alTerminar;

  @override
  State<HojaCobro> createState() => _HojaCobroState();
}

class _HojaCobroState extends State<HojaCobro> {
  late final Map<String, int> _cantidades = Map<String, int>.from(
    widget.parada.pedidoEsperado.isEmpty
        ? widget.parada.entregado
        : widget.parada.pedidoEsperado,
  );

  late final TextEditingController _efectivoCtrl = TextEditingController();
  late final TextEditingController _transferenciaCtrl = TextEditingController();
  late final TextEditingController _creditoCtrl = TextEditingController();

  String? _errorSinExistencia;

  Bodega get _bodega => widget.repo.ruta.bodega;

  @override
  void dispose() {
    _efectivoCtrl.dispose();
    _transferenciaCtrl.dispose();
    _creditoCtrl.dispose();
    super.dispose();
  }

  Dinero get _efectivo => _leer(_efectivoCtrl);
  Dinero get _transferencia => _leer(_transferenciaCtrl);
  Dinero get _credito => _leer(_creditoCtrl);

  Dinero _leer(TextEditingController ctrl) {
    final num? valor = Formatos.monto(ctrl.text);
    if (valor == null || valor < 0) return Dinero.cero;
    return Dinero.desdeDecimal(valor);
  }

  Dinero get _valorEntregado => _cantidades.entries
      .where((MapEntry<String, int> e) => e.value > 0)
      .map((MapEntry<String, int> e) => _bodega.producto(e.key).precio * e.value)
      .suma;

  Dinero get _pagado => _efectivo + _transferencia + _credito;

  Dinero get _diferencia => _pagado - _valorEntregado;

  bool get _cuadra => _diferencia.magnitud <= toleranciaCaja;

  bool get _hayAlgoQueEntregar =>
      _cantidades.values.any((int c) => c > 0);

  /// Cambia el pedido o el cobro y limpia el error de paso.
  ///
  /// El aviso de "ya no alcanza tal producto" habla de **un pedido concreto**:
  /// en cuanto el vendedor baja la cantidad, deja de ser cierto. Se quedaba en
  /// pantalla contradiciendo al botón, que ya estaba habilitado, y no había
  /// forma de quitarlo salvo cerrar la hoja y volver a abrirla.
  void _editar(VoidCallback cambio) {
    setState(() {
      cambio();
      _errorSinExistencia = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final Parada p = widget.parada;
    final bool soloLectura = p.cerrada;

    // Sin decoración propia: la hoja modal ya la pinta el tema. Pintarla otra
    // vez acá era lo que abría el hueco transparente bajo el asa.
    return Container(
      constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * 0.9),
      padding: EdgeInsets.only(
        left: Space.lg,
        right: Space.lg,
        top: Space.lg,
        bottom: MediaQuery.viewInsetsOf(context).bottom + Space.xxl,
      ),
      child: soloLectura ? _vistaLectura(context, p) : _vistaEdicion(context, p),
    );
  }

  // ── Modo lectura: la parada ya se cerró; se muestra qué pasó. ────────────
  Widget _vistaLectura(BuildContext context, Parada p) {
    final OnRouteColors c = context.colors;
    return SingleChildScrollView(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(p.cliente.nombre, style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: Space.xs),
          Text(
            p.estado == EstadoVisita.omitida
                ? 'No se vendió · ${p.motivo?.etiqueta ?? ''}'
                : p.estado == EstadoVisita.credito
                    ? 'Entregado con parte al fiado'
                    : 'Cobrado completo',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: c.ink2),
          ),
          const SizedBox(height: Space.xl),
          if (p.entregado.isNotEmpty) ...<Widget>[
            Text('Entregado', style: Theme.of(context).textTheme.labelMedium),
            const SizedBox(height: Space.sm),
            for (final MapEntry<String, int> e in p.entregado.entries)
              if (e.value > 0)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: Space.xs),
                  child: Row(
                    children: <Widget>[
                      Expanded(child: Text(_bodega.producto(e.key).etiqueta)),
                      Text(
                        _bodega.producto(e.key).unidad.contar(e.value),
                        style: Theme.of(context).textTheme.bodyMedium,
                      ),
                    ],
                  ),
                ),
            const Divider(height: Space.xxl),
          ],
          _filaMonto(context, 'Efectivo', p.efectivo),
          _filaMonto(context, 'Transferencia', p.transferencia),
          _filaMonto(context, 'Fiado', p.credito, color: c.pending),
          if (p.nota != null && p.nota!.isNotEmpty) ...<Widget>[
            const SizedBox(height: Space.md),
            Text(p.nota!, style: Theme.of(context).textTheme.bodySmall?.copyWith(color: c.ink2)),
          ],
        ],
      ),
    );
  }

  /// Quién es el cliente, con los datos que el vendedor usa parado en la
  /// puerta.
  ///
  /// La referencia va acá y no escondida: en Honduras la dirección formal rara
  /// vez alcanza para llegar —"del puente peatonal, dos cuadras al sur" sí—, y
  /// el modelo [Cliente] la guarda justo por eso. El RTN aparece solo cuando
  /// el negocio factura, que es cuando el vendedor lo necesita para llenar la
  /// factura ahí mismo; en la mayoría de pulperías no existe y mostrar un
  /// campo vacío sería ruido.
  Widget _encabezadoCliente(BuildContext context, Parada p) {
    final OnRouteColors c = context.colors;
    final Cliente cliente = p.cliente;
    final TextStyle? menor =
        Theme.of(context).textTheme.bodySmall?.copyWith(color: c.ink2);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        Text(cliente.nombre, style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: Space.xs),
        Text('${cliente.tipo.etiqueta} · ${cliente.direccion}', style: menor),
        if (cliente.referencia != null) ...<Widget>[
          const SizedBox(height: Space.xs),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Icon(Icons.place_outlined, size: 14, color: c.ink3),
              const SizedBox(width: Space.xs),
              Expanded(child: Text(cliente.referencia!, style: menor)),
            ],
          ),
        ],
        if (cliente.telefono != null || cliente.facturaConRtn) ...<Widget>[
          const SizedBox(height: Space.sm),
          Wrap(
            spacing: Space.sm,
            runSpacing: Space.xs,
            children: <Widget>[
              if (cliente.telefono != null)
                _datoCliente(context, Icons.phone_outlined, cliente.telefono!),
              if (cliente.facturaConRtn)
                _datoCliente(context, Icons.receipt_long_outlined,
                    'RTN ${cliente.rtn}'),
            ],
          ),
        ],
      ],
    );
  }

  Widget _datoCliente(BuildContext context, IconData icono, String texto) {
    final OnRouteColors c = context.colors;
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: Space.sm,
        vertical: Space.xs,
      ),
      decoration: BoxDecoration(
        color: c.bgSunk,
        borderRadius: Radii.pill,
        border: Border.all(color: c.border),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Icon(icono, size: 13, color: c.ink3),
          const SizedBox(width: Space.xs),
          Text(texto, style: AppText.dataSm.copyWith(color: c.ink2)),
        ],
      ),
    );
  }

  Widget _filaMonto(BuildContext context, String etiqueta, Dinero monto, {Color? color}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: Space.xs),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: <Widget>[
          Text(etiqueta, style: Theme.of(context).textTheme.bodyMedium),
          MoneyText(monto.enLempiras, color: color),
        ],
      ),
    );
  }

  // ── Modo edición: cobrar la parada. ───────────────────────────────────────
  Widget _vistaEdicion(BuildContext context, Parada p) {
    final OnRouteColors c = context.colors;

    return SingleChildScrollView(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          _encabezadoCliente(context, p),
          const SizedBox(height: Space.xl),

          Text('Pedido', style: Theme.of(context).textTheme.labelMedium),
          const SizedBox(height: Space.sm),
          for (final String sku in _skusRelevantes)
            _filaProducto(context, sku),

          const Divider(height: Space.xxl),

          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: <Widget>[
              Flexible(
                child: Text(
                  'Valor entregado',
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.titleSmall,
                ),
              ),
              const SizedBox(width: Space.sm),
              MoneyText(_valorEntregado.enLempiras, style: AppText.moneyMd, color: c.brass),
            ],
          ),
          const SizedBox(height: Space.lg),

          Text('Cobro', style: Theme.of(context).textTheme.labelMedium),
          const SizedBox(height: Space.sm),
          _campoMonto(context, 'Efectivo', _efectivoCtrl),
          const SizedBox(height: Space.sm),
          _campoMonto(context, 'Transferencia', _transferenciaCtrl),
          const SizedBox(height: Space.sm),
          _campoMonto(context, 'Fiado (crédito)', _creditoCtrl),

          const SizedBox(height: Space.lg),
          _resumenDiferencia(context),

          if (_errorSinExistencia != null) ...<Widget>[
            const SizedBox(height: Space.md),
            Container(
              padding: const EdgeInsets.all(Space.md),
              decoration: BoxDecoration(
                color: c.pendingSoft,
                borderRadius: Radii.allMd,
              ),
              child: Text(
                _errorSinExistencia!,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: c.pending),
              ),
            ),
          ],

          const SizedBox(height: Space.xl),
          SizedBox(
            width: double.infinity,
            height: Touch.comfortable,
            child: FilledButton(
              onPressed: (_hayAlgoQueEntregar && _cuadra) ? _confirmar : null,
              child: const Text('Registrar cobro'),
            ),
          ),
          const SizedBox(height: Space.sm),
          SizedBox(
            width: double.infinity,
            height: Touch.comfortable,
            child: OutlinedButton(
              onPressed: _noSeVendio,
              child: const Text('No se vendió'),
            ),
          ),
        ],
      ),
    );
  }

  /// SKUs a mostrar: el pedido esperado, más cualquier otro que el vendedor
  /// haya agregado a mano en esta hoja (el `+` no está limitado al pedido).
  List<String> get _skusRelevantes {
    final Set<String> skus = <String>{
      ...widget.parada.pedidoEsperado.keys,
      ..._cantidades.keys.where((String s) => (_cantidades[s] ?? 0) > 0),
    };
    return skus.toList()..sort();
  }

  Widget _filaProducto(BuildContext context, String sku) {
    final OnRouteColors c = context.colors;
    final Producto producto = _bodega.producto(sku);
    final int cantidad = _cantidades[sku] ?? 0;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: Space.xs),
      child: Row(
        children: <Widget>[
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(producto.etiqueta, style: Theme.of(context).textTheme.bodyMedium),
                Text(
                  Formatos.lempiras(producto.precio.enLempiras),
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(color: c.ink2),
                ),
              ],
            ),
          ),
          SizedBox(
            width: Touch.comfortable,
            height: Touch.comfortable,
            child: IconButton.filledTonal(
              onPressed: cantidad > 0
                  ? () => _editar(() => _cantidades[sku] = cantidad - 1)
                  : null,
              icon: const Icon(Icons.remove),
            ),
          ),
          SizedBox(
            width: 36,
            child: Text(
              '$cantidad',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.titleMedium,
            ),
          ),
          SizedBox(
            width: Touch.comfortable,
            height: Touch.comfortable,
            child: IconButton.filledTonal(
              onPressed: () => _editar(() => _cantidades[sku] = cantidad + 1),
              icon: const Icon(Icons.add),
            ),
          ),
        ],
      ),
    );
  }

  Widget _campoMonto(BuildContext context, String etiqueta, TextEditingController ctrl) {
    return TextField(
      controller: ctrl,
      keyboardType: const TextInputType.numberWithOptions(decimal: true),
      inputFormatters: <TextInputFormatter>[
        FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]')),
      ],
      style: AppText.data,
      decoration: InputDecoration(
        labelText: etiqueta,
        prefixText: 'L ',
      ),
      onChanged: (_) => _editar(() {}),
    );
  }

  Widget _resumenDiferencia(BuildContext context) {
    final OnRouteColors c = context.colors;
    final Dinero dif = _diferencia;
    final String texto = dif.esCero
        ? 'Cuadra'
        : dif > Dinero.cero
            ? 'Sobran ${Formatos.lempiras(dif.enLempiras)}'
            : 'Faltan ${Formatos.lempiras(dif.magnitud.enLempiras)}';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: Space.md, vertical: Space.sm),
      decoration: BoxDecoration(
        color: _cuadra ? c.collectedSoft : c.dangerSoft,
        borderRadius: Radii.allMd,
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: <Widget>[
          Flexible(
            child: Text(
              'Cobrado vs. entregado',
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: _cuadra ? c.collected : c.danger,
                  ),
            ),
          ),
          const SizedBox(width: Space.sm),
          Text(
            texto,
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  color: _cuadra ? c.collected : c.danger,
                ),
          ),
        ],
      ),
    );
  }

  /// Pregunta antes de cobrar. Registrar una entrega **no se puede deshacer**:
  /// baja el producto de la parrilla y cierra la parada de una vez —el
  /// repositorio rechaza cualquier segundo intento con `paradaYaCerrada`—, así
  /// que un toque de más con el pulgar sobre un teléfono en la calle dejaba la
  /// parada cerrada con la cifra equivocada y sin vuelta atrás. El diálogo
  /// repite en una línea lo que se va a registrar, que es lo único que hay que
  /// mirar antes de confirmar.
  Future<void> _confirmar() async {
    final int bultos =
        _cantidades.values.fold(0, (int a, int b) => a + (b > 0 ? b : 0));

    final bool? sigue = await showDialog<bool>(
      context: context,
      builder: (BuildContext dialogo) => AlertDialog(
        title: const Text('Registrar el cobro'),
        content: Text(
          'Se bajan $bultos ${bultos == 1 ? 'bulto' : 'bultos'} de la parrilla '
          'y la parada de ${widget.parada.cliente.nombre} queda cerrada con '
          '${Formatos.lempiras(_pagado.enLempiras)}. '
          'Una vez registrada no se puede corregir.',
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.of(dialogo).pop(false),
            child: const Text('Revisar'),
          ),
          FilledButton(
            onPressed: () => Navigator.of(dialogo).pop(true),
            child: const Text('Registrar'),
          ),
        ],
      ),
    );

    if (sigue != true || !mounted) return;
    _registrar();
  }

  void _registrar() {
    final Map<String, int> items = <String, int>{
      for (final MapEntry<String, int> e in _cantidades.entries)
        if (e.value > 0) e.key: e.value,
    };

    final ResultadoEntrega r = widget.repo.registrarEntrega(
      paradaId: widget.parada.id,
      items: items,
      efectivo: _efectivo,
      transferencia: _transferencia,
      credito: _credito,
    );

    if (r.exito) {
      // Se avisa **antes** de cerrar la hoja: el `ScaffoldMessenger` se busca
      // desde este contexto, y después del `alTerminar` la hoja ya no está en
      // el árbol en teléfono.
      _avisar(
        '${widget.parada.cliente.nombre}: cobro de '
        '${Formatos.lempiras(_pagado.enLempiras)} registrado',
      );
      widget.alTerminar();
      return;
    }

    // Todos los fallos se contestan. Un botón que no hace nada al tocarlo es
    // peor que un error: el vendedor lo vuelve a tocar creyendo que no
    // registró el toque, y termina sin saber si la parada quedó cobrada.
    setState(() => _errorSinExistencia = _explicar(r));
  }

  void _avisar(String texto) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..clearSnackBars()
      ..showSnackBar(SnackBar(content: Text(texto)));
  }

  String _explicar(ResultadoEntrega r) {
    switch (r.fallo!) {
      case FalloEntrega.sinExistencia:
        final Producto p = _bodega.producto(r.skuFaltante!);
        return 'Ya no alcanza ${p.etiqueta.toLowerCase()}: faltan '
            '${p.unidad.contar(r.bultosFaltantes)} en la parrilla para '
            'completar este pedido.';
      case FalloEntrega.paradaYaCerrada:
        return 'Esta parada ya quedó registrada. Cierra la hoja para verla.';
      case FalloEntrega.paradaNoExiste:
        return 'Esta parada ya no está en la ruta de hoy.';
      case FalloEntrega.montoNegativo:
        return 'Alguno de los montos quedó en negativo. Revisa el cobro.';
      case FalloEntrega.bultosInvalidos:
        return 'Hay una cantidad inválida en el pedido. Revisa los bultos '
            'antes de registrar.';
    }
  }

  Future<void> _noSeVendio() async {
    final MotivoOmision? motivo = await showModalBottomSheet<MotivoOmision>(
      context: context,
      builder: (BuildContext ctx) => const _HojaMotivo(),
    );
    if (motivo == null || !mounted) return;

    widget.repo.omitir(paradaId: widget.parada.id, motivo: motivo);
    if (!mounted) return;
    _avisar(
      '${widget.parada.cliente.nombre}: no se vendió · ${motivo.etiqueta}',
    );
    widget.alTerminar();
  }
}

/// Selector de motivo de omisión: una lista corta, un toque, sin campo libre
/// obligatorio. El motivo es lo que después nadie puede reconstruir si no
/// queda anotado en el momento.
class _HojaMotivo extends StatelessWidget {
  const _HojaMotivo();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(
        left: Space.lg,
        right: Space.lg,
        top: Space.lg,
        bottom: Space.xxl,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text('¿Por qué no se vendió?', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: Space.lg),
          for (final MotivoOmision m in MotivoOmision.values)
            SizedBox(
              width: double.infinity,
              height: Touch.comfortable,
              child: Padding(
                padding: const EdgeInsets.only(bottom: Space.sm),
                child: OutlinedButton(
                  onPressed: () => Navigator.of(context).pop(m),
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Text(m.etiqueta),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
