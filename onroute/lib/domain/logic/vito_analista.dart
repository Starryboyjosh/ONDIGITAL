/// El analista de Vito.
///
/// ## Por qué esto es aritmética y no un modelo
///
/// Vito es el asistente de ONDIGITAL y en la interfaz habla como asistente,
/// pero **los hallazgos de esta capa se calculan, no se generan**. Un modelo de
/// lenguaje no toca el cuadre de caja de nadie: si alguien va a decirle a un
/// vendedor que faltan L 430, ese número tiene que ser reproducible, auditable
/// y el mismo cada vez que se pregunte. La parte de Vito que puede cambiar de
/// proveedor es la **voz** —cómo se dice—, y esa vive en la capa de UI
/// (`ui/features/vito/`), no aquí.
///
/// Por eso [Hallazgo] no trae texto: trae el tipo, los montos y a quién señala.
/// Redactar es presentación; encontrar es dominio.
library;

import 'package:meta/meta.dart';

import '../models/bodega.dart';
import '../models/dinero.dart';
import '../models/parada.dart';
import '../models/ruta.dart';
import 'cuadre.dart';

enum Severidad {
  /// Hay dinero o producto sin explicación. Alguien tiene que responder hoy.
  critico,

  /// No está mal todavía, pero va camino a estarlo.
  atencion,

  /// Dato útil para planificar mañana.
  informativo,

  /// Confirmación explícita de que algo salió bien.
  bueno,
}

enum TipoHallazgo {
  cajaCorta,
  cajaSobrada,
  entregaSinRegistro,
  cargaFaltante,
  cargaSobrante,
  conteoPendiente,
  productoNoAlcanza,
  creditoAlto,
  clienteCerradoRepetido,
  rutaAtrasada,
  diaLimpio,
}

@immutable
final class Hallazgo {
  const Hallazgo({
    required this.tipo,
    required this.severidad,
    this.esperado,
    this.real,
    this.diferencia,
    this.unidades,
    this.sku,
    this.paradaId,
    this.clienteNombre,
    this.rutaId,
    this.camionId,
  });

  final TipoHallazgo tipo;
  final Severidad severidad;

  /// Los dos lados de la comparación que produjo el hallazgo, y su brecha.
  /// Se guardan los tres aunque uno sea derivable: la frase de Vito casi
  /// siempre los nombra a los tres ("vendió X, entregó Y, faltan Z").
  final Dinero? esperado;
  final Dinero? real;
  final Dinero? diferencia;

  /// Bultos, cuando el hallazgo es de carga y no de dinero.
  final int? unidades;

  final String? sku;
  final String? paradaId;
  final String? clienteNombre;
  final String? rutaId;
  final String? camionId;

  @override
  String toString() => 'Hallazgo(${tipo.name}/${severidad.name})';
}

/// Umbral de cartera: pasado este porcentaje de lo entregado, el fiado deja de
/// ser una cortesía y empieza a ser el capital de trabajo del dueño prestado
/// sin plazo.
const double _limiteCredito = 0.25;

/// Atraso a partir del cual la ruta ya no termina a tiempo aunque acelere.
const int _atrasoSensible = 45;

/// Analiza una liquidación cerrada. Devuelve los hallazgos ordenados por
/// severidad, porque quien abre el cierre necesita lo peor arriba.
List<Hallazgo> analizarLiquidacion(Liquidacion l) {
  final Ruta r = l.ruta;
  final List<Hallazgo> out = <Hallazgo>[];

  Hallazgo base(TipoHallazgo tipo, Severidad sev) => Hallazgo(
        tipo: tipo,
        severidad: sev,
        rutaId: r.id,
        camionId: r.camionId,
      );

  // --- Libro 3 contra libro 2: el sobre. ---
  if (!l.cajaCuadra) {
    final bool corta = l.brechaCaja.esNegativo;
    out.add(
      Hallazgo(
        tipo: corta ? TipoHallazgo.cajaCorta : TipoHallazgo.cajaSobrada,
        // Sobrar también es un error: significa que se cobró algo que no se
        // registró en ninguna parada. Solo pesa menos que faltar.
        severidad: corta ? Severidad.critico : Severidad.atencion,
        esperado: l.efectivoEsperado,
        real: l.efectivoEntregado,
        diferencia: l.brechaCaja.magnitud,
        rutaId: r.id,
        camionId: r.camionId,
      ),
    );
  }

  // --- Libro 2 consigo mismo: entregado contra justificado. ---
  if (!l.ventaCuadra) {
    out.add(
      Hallazgo(
        tipo: TipoHallazgo.entregaSinRegistro,
        severidad: Severidad.critico,
        esperado: l.valorEntregado,
        real: l.cobrado + l.credito,
        diferencia: l.brechaVenta.magnitud,
        rutaId: r.id,
        camionId: r.camionId,
      ),
    );
  }

  // --- Libro 1: la parrilla. ---
  if (!l.conteoCompleto) {
    out.add(base(TipoHallazgo.conteoPendiente, Severidad.atencion));
  } else if (l.bultosFaltantes != 0) {
    final bool falta = l.bultosFaltantes > 0;
    out.add(
      Hallazgo(
        tipo: falta ? TipoHallazgo.cargaFaltante : TipoHallazgo.cargaSobrante,
        severidad: falta ? Severidad.critico : Severidad.atencion,
        unidades: l.bultosFaltantes.abs(),
        diferencia: l.valorCargaFaltante.magnitud,
        rutaId: r.id,
        camionId: r.camionId,
      ),
    );
  }

  // --- Cartera. ---
  if (!l.valorEntregado.esCero) {
    final double proporcion = l.credito.centavos / l.valorEntregado.centavos;
    if (proporcion > _limiteCredito) {
      out.add(
        Hallazgo(
          tipo: TipoHallazgo.creditoAlto,
          severidad: Severidad.atencion,
          esperado: l.valorEntregado,
          real: l.credito,
          diferencia: l.credito,
          rutaId: r.id,
          camionId: r.camionId,
        ),
      );
    }
  }

  out.addAll(_hallazgosDeOperacion(r));

  if (out.isEmpty && l.todoCuadra) {
    out.add(base(TipoHallazgo.diaLimpio, Severidad.bueno));
  }

  _ordenar(out);
  return out;
}

/// Analiza una ruta todavía abierta. Aquí Vito sirve para adelantarse, no para
/// reportar: lo que encuentre hoy a las diez de la mañana todavía se puede
/// arreglar.
List<Hallazgo> analizarRutaEnCurso(Ruta r) {
  final List<Hallazgo> out = <Hallazgo>[
    ..._faltanteProyectado(r),
    ..._hallazgosDeOperacion(r),
  ];
  _ordenar(out);
  return out;
}

/// ¿Alcanza el producto para las paradas que faltan?
///
/// Esta es la pregunta que solo se puede contestar si la carga se modela como
/// inventario vivo —la tesis de La Bodega Rodante—. Un app de entregas no la
/// puede contestar porque para él el camión es una caja negra que se vacía.
List<Hallazgo> _faltanteProyectado(Ruta r) {
  final Bodega b = r.bodega;

  final Map<String, int> demanda = <String, int>{};
  for (final Parada p in r.pendientes) {
    p.pedidoEsperado.forEach((String sku, int bultos) {
      demanda[sku] = (demanda[sku] ?? 0) + bultos;
    });
  }

  final List<Hallazgo> out = <Hallazgo>[];
  demanda.forEach((String sku, int pedido) {
    final int hay = b.delSku(sku).fold(0, (int a, Casilla c) => a + c.enCamion);
    if (hay >= pedido) return;
    final int faltan = pedido - hay;
    out.add(
      Hallazgo(
        tipo: TipoHallazgo.productoNoAlcanza,
        severidad: Severidad.atencion,
        unidades: faltan,
        sku: sku,
        diferencia: b.catalogo[sku] == null
            ? null
            : b.producto(sku).precio * faltan,
        rutaId: r.id,
        camionId: r.camionId,
      ),
    );
  });
  return out;
}

/// Hallazgos que no dependen de si la ruta cerró: atrasos y clientes que no
/// abren. Sirven igual a media mañana que en el cierre.
List<Hallazgo> _hallazgosDeOperacion(Ruta r) {
  final List<Hallazgo> out = <Hallazgo>[];

  final int atraso = r.atrasoMinutos;
  if (atraso > _atrasoSensible) {
    out.add(
      Hallazgo(
        tipo: TipoHallazgo.rutaAtrasada,
        severidad: Severidad.informativo,
        unidades: atraso,
        rutaId: r.id,
        camionId: r.camionId,
      ),
    );
  }

  // Un cliente que aparece cerrado no es noticia; que la ruta le caiga siempre
  // a la hora en que está cerrado sí lo es, y se arregla reordenando, no
  // insistiendo.
  for (final Parada p in r.paradas) {
    if (p.motivo == MotivoOmision.cerrado) {
      out.add(
        Hallazgo(
          tipo: TipoHallazgo.clienteCerradoRepetido,
          severidad: Severidad.informativo,
          paradaId: p.id,
          clienteNombre: p.cliente.nombre,
          rutaId: r.id,
          camionId: r.camionId,
        ),
      );
    }
  }

  return out;
}

void _ordenar(List<Hallazgo> h) =>
    h.sort((Hallazgo a, Hallazgo b) =>
        a.severidad.index.compareTo(b.severidad.index));
