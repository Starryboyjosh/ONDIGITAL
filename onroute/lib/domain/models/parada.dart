/// Una parada de la ruta del día: el lugar más lo que pasó ahí.
library;

import 'package:meta/meta.dart';

import 'cliente.dart';
import 'dinero.dart';
import 'producto.dart';

enum EstadoVisita {
  /// Todavía no se llega.
  pendiente,

  /// El camión está ahí ahora mismo.
  enSitio,

  /// Se entregó y se cobró completo.
  cobrada,

  /// Se entregó pero parte quedó al crédito.
  credito,

  /// Se llegó y no se vendió.
  omitida,
}

/// Por qué no se vendió. Es un dato de negocio, no una excusa: tres "cerrado"
/// seguidos en el mismo cliente son una ruta mal horareada, y eso Vito lo dice.
enum MotivoOmision {
  cerrado('Local cerrado'),
  sinDinero('Sin efectivo hoy'),
  noPidio('No necesitó producto'),
  sinAcceso('Sin acceso al local'),
  moraPrevia('Tiene mora anterior');

  const MotivoOmision(this.etiqueta);

  final String etiqueta;
}

enum MedioPago {
  ninguno('Sin cobro'),
  efectivo('Efectivo'),
  transferencia('Transferencia'),
  mixto('Mixto');

  const MedioPago(this.etiqueta);

  final String etiqueta;
}

@immutable
final class Parada {
  const Parada({
    required this.id,
    required this.orden,
    required this.cliente,
    required this.horaEstimada,
    this.estado = EstadoVisita.pendiente,
    this.pedidoEsperado = const <String, int>{},
    this.entregado = const <String, int>{},
    this.efectivo = Dinero.cero,
    this.transferencia = Dinero.cero,
    this.credito = Dinero.cero,
    this.horaLlegada,
    this.motivo,
    this.nota,
  });

  final String id;

  /// Posición en la ruta del día, empezando en 1.
  final int orden;

  final Cliente cliente;

  /// Hora a la que la ruta planificada dice que se llega.
  final DateTime horaEstimada;

  /// Hora real. Nula mientras no se llega; comparada contra [horaEstimada] es
  /// lo que produce el atraso acumulado de la ruta.
  final DateTime? horaLlegada;

  final EstadoVisita estado;

  /// SKU → bultos que este cliente suele pedir, según su histórico.
  ///
  /// Es lo que convierte a Vito en algo que **avisa antes** en vez de reportar
  /// después: con el pedido esperado de las paradas que faltan y lo que queda
  /// arriba del camión, se sabe a media mañana si el producto va a alcanzar.
  final Map<String, int> pedidoEsperado;

  /// SKU → bultos entregados en esta parada.
  final Map<String, int> entregado;

  /// Billete que entró a la mano del vendedor. Va separado de la transferencia
  /// y no como un enum de "medio de pago" porque el cuadre de caja pregunta
  /// exactamente esto: cuánto papel debería traer encima. Un pago mixto con un
  /// solo monto deja esa pregunta sin respuesta.
  final Dinero efectivo;

  /// Lo que se pagó por transferencia. Cobrado de verdad, pero nunca llega a la
  /// caja: cuadra contra el estado de cuenta, no contra el sobre.
  final Dinero transferencia;

  /// Lo que quedó fiado. Es legítimo —así se mueve la pulpería— pero tiene que
  /// quedar registrado, porque es la diferencia honesta entre lo que se
  /// entregó y lo que se cobró.
  final Dinero credito;

  final MotivoOmision? motivo;
  final String? nota;

  /// Todo lo que se cobró aquí, por cualquier vía.
  Dinero get cobrado => efectivo + transferencia;

  MedioPago get medioPago {
    if (!efectivo.esCero && !transferencia.esCero) return MedioPago.mixto;
    if (!efectivo.esCero) return MedioPago.efectivo;
    if (!transferencia.esCero) return MedioPago.transferencia;
    return MedioPago.ninguno;
  }

  bool get atendida =>
      estado == EstadoVisita.cobrada || estado == EstadoVisita.credito;

  bool get cerrada => atendida || estado == EstadoVisita.omitida;

  int get bultosEntregados =>
      entregado.values.fold(0, (int a, int b) => a + b);

  /// Lo que valía lo entregado, según el catálogo del día.
  Dinero valorEntregado(Map<String, Producto> catalogo) => entregado.entries
      .map((MapEntry<String, int> e) {
        final Producto? p = catalogo[e.key];
        if (p == null) {
          throw StateError('SKU "${e.key}" entregado sin estar en el catálogo');
        }
        return p.precio * e.value;
      })
      .suma;

  /// Diferencia entre lo entregado y lo que se justificó (cobro + crédito).
  /// Distinto de cero significa producto que salió del camión sin quedar
  /// anotado en ningún lado. Ese es el hallazgo, no el atraso ni la ruta.
  Dinero descuadre(Map<String, Producto> catalogo) =>
      cobrado + credito - valorEntregado(catalogo);

  /// Minutos de atraso contra el plan. Negativo = se llegó antes.
  int? get atrasoMinutos =>
      horaLlegada?.difference(horaEstimada).inMinutes;

  Parada copyWith({
    EstadoVisita? estado,
    Map<String, int>? pedidoEsperado,
    Map<String, int>? entregado,
    Dinero? efectivo,
    Dinero? transferencia,
    Dinero? credito,
    DateTime? horaLlegada,
    MotivoOmision? motivo,
    String? nota,
  }) =>
      Parada(
        id: id,
        orden: orden,
        cliente: cliente,
        horaEstimada: horaEstimada,
        estado: estado ?? this.estado,
        pedidoEsperado: pedidoEsperado ?? this.pedidoEsperado,
        entregado: entregado ?? this.entregado,
        efectivo: efectivo ?? this.efectivo,
        transferencia: transferencia ?? this.transferencia,
        credito: credito ?? this.credito,
        horaLlegada: horaLlegada ?? this.horaLlegada,
        motivo: motivo ?? this.motivo,
        nota: nota ?? this.nota,
      );

  @override
  bool operator ==(Object other) => other is Parada && other.id == id;

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() => 'Parada($orden · ${cliente.nombre} · ${estado.name})';
}
