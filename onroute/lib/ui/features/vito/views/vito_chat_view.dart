/// La conversación con Vito.
///
/// ## Por qué el contexto se arma acá y no en el proveedor
///
/// [VitoProvider] no sabe qué es una [Ruta] ni una [Liquidacion]: solo sabe
/// mandar texto y recibir texto. Este archivo es el punto donde el estado
/// real del día —la misma [RutaRepository] que ven Bodega, Ruta y Cierre— se
/// convierte en el resumen de una página que Vito recibe como contexto.
/// Así el proveedor se queda genérico y reusable, y el conocimiento de
/// dominio queda donde debe: en la capa que ya conoce el dominio.
library;

import 'package:flutter/material.dart';

import '../../../../data/repositories/ruta_repository.dart';
import '../../../../data/semilla/semilla_san_pedro_sula.dart' show camionPorId;
import '../../../../data/services/vito_provider.dart';
import '../../../../domain/models/camion.dart';
import '../../../../domain/models/ruta.dart';
import '../../../core/format/formatos.dart';
import '../../../core/marca/marca_onroute.dart' show MarcaOnRoute;
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/panel.dart';

/// Resume el día en un párrafo corto que Vito puede leer de una pasada.
/// Ninguna cifra la calcula Vito: todas salen de [RutaRepository], la misma
/// fuente que usan las pantallas operativas.
///
/// El camión se nombra como lo nombra la gente —"El Rojo, con Marvin
/// Aguilar"— y nunca por su `camionId`. Este texto no es solo para el motor:
/// termina citado dentro de la respuesta que el vendedor lee, así que un
/// `cam-01` acá sale en pantalla.
String contextoDelDia(RutaRepository repo) {
  final Ruta r = repo.ruta;
  final String cobrado = Formatos.lempiras(r.cobradoTotal.enLempiras);
  final String credito = Formatos.lempiras(r.creditoTotal.enLempiras);
  final Camion? camion = camionPorId(r.camionId);
  final String quien = camion == null
      ? ''
      : ', en ${camion.apodo} con ${camion.conductor}';
  return 'Ruta "${r.nombre}"$quien. '
      '${r.cerradas} de ${r.total} paradas visitadas, ${r.atendidas} cobradas. '
      'Cobrado hasta ahora: $cobrado (crédito: $credito). '
      '${repo.enLiquidacion ? "La ruta ya está en liquidación." : "La ruta sigue en curso."}';
}

class VitoChatView extends StatefulWidget {
  const VitoChatView({super.key, required this.repo, this.proveedor});

  final RutaRepository repo;

  /// Inyectable para pruebas; en producción usa [VitoProvider.desdeEntorno].
  final VitoProvider? proveedor;

  @override
  State<VitoChatView> createState() => _VitoChatViewState();
}

class _VitoChatViewState extends State<VitoChatView> {
  late final VitoProvider _proveedor =
      widget.proveedor ?? VitoProvider.desdeEntorno();
  final List<MensajeVito> _mensajes = <MensajeVito>[];
  final TextEditingController _entrada = TextEditingController();
  final ScrollController _scroll = ScrollController();
  bool _pensando = false;

  @override
  void dispose() {
    _entrada.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _enviar() async {
    final String texto = _entrada.text.trim();
    if (texto.isEmpty || _pensando) return;

    setState(() {
      _mensajes.add(MensajeVito.usuario(texto));
      _entrada.clear();
      _pensando = true;
    });
    _alFinal();

    final String respuesta = await _proveedor.responder(
      contextoOperativo: contextoDelDia(widget.repo),
      historial: _mensajes,
    );

    if (!mounted) return;
    setState(() {
      _mensajes.add(MensajeVito.vito(respuesta));
      _pensando = false;
    });
    _alFinal();
  }

  void _alFinal() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scroll.hasClients) return;
      _scroll.animateTo(
        _scroll.position.maxScrollExtent,
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOutCubic,
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    return Scaffold(
      backgroundColor: c.bg,
      body: SafeArea(
        child: Column(
          children: <Widget>[
            Padding(
              padding: const EdgeInsets.fromLTRB(
                Space.lg,
                Space.lg,
                Space.lg,
                Space.sm,
              ),
              child: Row(
                children: <Widget>[
                  // `c.isDark`, no la luminancia de la tinta: `ink` es el color del
                  // **texto**, que es claro justo cuando el fondo es oscuro. La
                  // prueba estaba al revés y el isotipo salía invertido en los
                  // dos temas a la vez.
                  MarcaOnRoute(tamano: 32, sobreOscuro: c.isDark),
                  const SizedBox(width: Space.sm),
                  Text(
                    'Vito',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          color: c.ink,
                          fontWeight: FontWeight.w700,
                        ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: _mensajes.isEmpty
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(Space.xl),
                        child: Text(
                          'Pregúntale a Vito por el estado de la ruta o del '
                          'cierre. Responde sobre los mismos datos que ves '
                          'en las otras pantallas, nunca inventa cifras.',
                          textAlign: TextAlign.center,
                          style: Theme.of(context)
                              .textTheme
                              .bodyMedium
                              ?.copyWith(color: c.ink2),
                        ),
                      ),
                    )
                  : ListView.builder(
                      controller: _scroll,
                      padding: const EdgeInsets.symmetric(
                        horizontal: Space.lg,
                        vertical: Space.sm,
                      ),
                      itemCount: _mensajes.length,
                      itemBuilder: (BuildContext context, int i) =>
                          _BurbujaMensaje(mensaje: _mensajes[i]),
                    ),
            ),
            if (_pensando)
              const Padding(
                padding: EdgeInsets.only(bottom: Space.sm),
                child: SizedBox(
                  height: 2,
                  child: LinearProgressIndicator(),
                ),
              ),
            Padding(
              padding: const EdgeInsets.all(Space.lg),
              child: Row(
                children: <Widget>[
                  Expanded(
                    child: TextField(
                      controller: _entrada,
                      onSubmitted: (_) => _enviar(),
                      textInputAction: TextInputAction.send,
                      decoration: const InputDecoration(
                        hintText: 'Escríbele a Vito…',
                        isDense: true,
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ),
                  const SizedBox(width: Space.sm),
                  IconButton.filled(
                    onPressed: _pensando ? null : _enviar,
                    icon: const Icon(Icons.send),
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

class _BurbujaMensaje extends StatelessWidget {
  const _BurbujaMensaje({required this.mensaje});

  final MensajeVito mensaje;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final bool esUsuario = mensaje.esUsuario;

    return Align(
      alignment: esUsuario ? Alignment.centerRight : Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 520),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: Space.xs),
          child: Panel(
            color: esUsuario ? c.violetSoft : c.surface,
            child: Text(
              mensaje.texto,
              style: Theme.of(context)
                  .textTheme
                  .bodyMedium
                  ?.copyWith(color: c.ink),
            ),
          ),
        ),
      ),
    );
  }
}
