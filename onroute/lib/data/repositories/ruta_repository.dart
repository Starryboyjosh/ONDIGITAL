/// El repositorio de la ruta del día: la única puerta por la que se cambia el
/// estado de negocio.
///
/// ## Por qué todo pasa por aquí
///
/// Hay una invariante que la app no se puede permitir romper: **lo que la
/// parrilla dice que salió del camión tiene que ser exactamente lo que las
/// paradas dicen que se entregó**. Si la UI pudiera tocar la bodega por un lado
/// y la parada por otro, tarde o temprano una pantalla actualizaría una y no la
/// otra, y el cuadre de fin de día reportaría un faltante que nadie causó.
///
/// Por eso [registrarEntrega] hace las dos cosas en una sola operación, y por
/// eso los modelos son inmutables: no hay forma de modificar una parada "por un
/// ladito" sin pasar por acá.
library;

import 'package:flutter/foundation.dart';

import '../../domain/logic/cuadre.dart';
import '../../domain/logic/vito_analista.dart';
import '../../domain/models/bodega.dart';
import '../../domain/models/dinero.dart';
import '../../domain/models/parada.dart';
import '../../domain/models/ruta.dart';

/// Por qué no se pudo registrar una entrega.
enum FalloEntrega {
  paradaNoExiste,
  paradaYaCerrada,
  sinExistencia,
  montoNegativo,

  /// Se pidió entregar cero o menos bultos de algún producto. Un bulto
  /// negativo pasaría la prueba de existencia sin problema —"hay 12, se piden
  /// -3"— y entraría tal cual a `entregado`, inflando el valor de lo entregado
  /// y abriendo una brecha de venta que nadie causó.
  bultosInvalidos,
}

/// Resultado de intentar registrar una entrega.
///
/// Se devuelve en vez de lanzar porque "no alcanza el producto" no es un error
/// de programación: es martes por la mañana y la pulpería pidió más de lo que
/// quedaba. La UI tiene que poder contarlo con calma.
@immutable
class ResultadoEntrega {
  const ResultadoEntrega.ok()
      : fallo = null,
        skuFaltante = null,
        bultosFaltantes = 0;

  const ResultadoEntrega.error(
    this.fallo, {
    this.skuFaltante,
    this.bultosFaltantes = 0,
  });

  final FalloEntrega? fallo;
  final String? skuFaltante;
  final int bultosFaltantes;

  bool get exito => fallo == null;
}

class RutaRepository extends ChangeNotifier {
  RutaRepository(this._ruta);

  Ruta _ruta;
  Ruta get ruta => _ruta;

  /// Efectivo que caja contó al recibir el sobre. `null` mientras no se ha
  /// liquidado: distinto de cero, igual que el conteo de la parrilla.
  Dinero? _efectivoEntregado;
  Dinero? get efectivoEntregado => _efectivoEntregado;

  /// Registra una venta: baja el producto de la parrilla y cierra la parada,
  /// en una sola operación atómica.
  ResultadoEntrega registrarEntrega({
    required String paradaId,
    required Map<String, int> items,
    Dinero efectivo = Dinero.cero,
    Dinero transferencia = Dinero.cero,
    Dinero credito = Dinero.cero,
    DateTime? momento,
  }) {
    final Parada? parada = _ruta.porId(paradaId);
    if (parada == null) {
      return const ResultadoEntrega.error(FalloEntrega.paradaNoExiste);
    }
    if (parada.cerrada) {
      return const ResultadoEntrega.error(FalloEntrega.paradaYaCerrada);
    }
    if (efectivo.esNegativo || transferencia.esNegativo || credito.esNegativo) {
      return const ResultadoEntrega.error(FalloEntrega.montoNegativo);
    }
    for (final MapEntry<String, int> e in items.entries) {
      if (e.value <= 0) {
        return ResultadoEntrega.error(
          FalloEntrega.bultosInvalidos,
          skuFaltante: e.key,
          bultosFaltantes: e.value,
        );
      }
      if (!_ruta.bodega.catalogo.containsKey(e.key)) {
        return ResultadoEntrega.error(
          FalloEntrega.bultosInvalidos,
          skuFaltante: e.key,
        );
      }
    }

    // Primero se verifica que alcance TODO, y solo después se toca nada. Una
    // entrega a medias dejaría la parrilla vaciada sin parada cerrada, que es
    // justo el descuadre fantasma que este repositorio existe para evitar.
    for (final MapEntry<String, int> e in items.entries) {
      final int hay = _ruta.bodega
          .delSku(e.key)
          .fold(0, (int a, Casilla c) => a + c.enCamion);
      if (hay < e.value) {
        return ResultadoEntrega.error(
          FalloEntrega.sinExistencia,
          skuFaltante: e.key,
          bultosFaltantes: e.value - hay,
        );
      }
    }

    Bodega bodega = _ruta.bodega;
    for (final MapEntry<String, int> e in items.entries) {
      final ({Bodega bodega, int sinDespachar}) r =
          bodega.despachar(e.key, e.value);
      assert(r.sinDespachar == 0, 'la verificación previa debió cubrir esto');
      bodega = r.bodega;
    }

    final Parada actualizada = parada.copyWith(
      estado:
          credito.esCero ? EstadoVisita.cobrada : EstadoVisita.credito,
      entregado: Map<String, int>.unmodifiable(items),
      efectivo: efectivo,
      transferencia: transferencia,
      credito: credito,
      horaLlegada: momento ?? DateTime.now(),
    );

    _ruta = _ruta.conParada(actualizada).copyWith(bodega: bodega);
    notifyListeners();
    return const ResultadoEntrega.ok();
  }

  /// Cierra una parada sin venta. El motivo es obligatorio: una parada que se
  /// salta sin explicación es exactamente el dato que después nadie puede
  /// reconstruir.
  bool omitir({
    required String paradaId,
    required MotivoOmision motivo,
    String? nota,
    DateTime? momento,
  }) {
    final Parada? p = _ruta.porId(paradaId);
    if (p == null || p.cerrada) return false;

    _ruta = _ruta.conParada(
      p.copyWith(
        estado: EstadoVisita.omitida,
        motivo: motivo,
        nota: nota,
        horaLlegada: momento ?? DateTime.now(),
      ),
    );
    notifyListeners();
    return true;
  }

  /// Marca que el camión llegó a una parada, sin cerrarla todavía.
  void marcarEnSitio(String paradaId, {DateTime? momento}) {
    final Parada? p = _ruta.porId(paradaId);
    if (p == null || p.cerrada) return;
    _ruta = _ruta.conParada(
      p.copyWith(
        estado: EstadoVisita.enSitio,
        horaLlegada: momento ?? DateTime.now(),
      ),
    );
    notifyListeners();
  }

  /// Registra el conteo físico de una casilla al cierre.
  bool contarCasilla({required String casillaId, required int contado}) {
    final Casilla? c = _ruta.bodega.porId(casillaId);
    if (c == null || contado < 0) return false;

    _ruta = _ruta.copyWith(
      bodega: _ruta.bodega.conCasilla(c.copyWith(contado: contado)),
    );
    notifyListeners();
    return true;
  }

  /// Atajo de cierre: da por bueno el teórico de toda la parrilla.
  ///
  /// Existe porque en la demo hay que poder cerrar rápido, pero se llama
  /// `aceptarConteoTeorico` y no `contarTodo` a propósito: quien lo use tiene
  /// que saber que **no contó nada**, solo firmó que confía en el sistema.
  void aceptarConteoTeorico() {
    Bodega b = _ruta.bodega;
    for (final Casilla c in b.casillas) {
      b = b.conCasilla(c.copyWith(contado: c.enCamion));
    }
    _ruta = _ruta.copyWith(bodega: b);
    notifyListeners();
  }

  /// Registra lo que caja contó en el sobre. Devuelve `false` y no cambia nada
  /// si el monto es negativo: un sobre con menos de cero lempiras no existe, y
  /// aceptarlo fabricaría una brecha de caja que nadie causó.
  bool entregarEfectivo(Dinero contado) {
    if (contado.esNegativo) return false;
    _efectivoEntregado = contado;
    notifyListeners();
    return true;
  }

  /// Liquidación con lo que se sepa hasta ahora. Si caja todavía no contó el
  /// sobre, se asume lo esperado, y la brecha de caja da cero — pero
  /// [listaParaCerrar] dice que todavía no se puede firmar.
  Liquidacion get liquidacion => cuadrar(
        ruta: _ruta,
        efectivoEntregado: _efectivoEntregado ?? _ruta.efectivoTotal,
      );

  bool get listaParaCerrar =>
      _efectivoEntregado != null && _ruta.bodega.conteoCompleto;

  /// Cuándo se firmó el cierre. `null` mientras el día siga abierto.
  DateTime? _cerradoEn;
  DateTime? get cerradoEn => _cerradoEn;

  bool get diaCerrado => _cerradoEn != null;

  /// Firma el cierre del día.
  ///
  /// Existe porque la pantalla de Cierre no cerraba nada: mostraba las tres
  /// brechas, recibía el conteo del sobre y ahí se acababa. Un día que nadie
  /// declara cerrado no tiene un momento en el que las cifras dejen de moverse,
  /// y sin eso las tres brechas son una foto que se puede seguir retocando.
  ///
  /// Devuelve `false` —y no cambia nada— si falta medir algo ([listaParaCerrar])
  /// o si el día ya estaba cerrado. Cerrar sin el conteo de la parrilla o sin
  /// el sobre daría por bueno un cuadre que se apoya en supuestos, que es
  /// exactamente lo que este producto existe para impedir.
  bool cerrarDia({DateTime? momento}) {
    if (!listaParaCerrar || _cerradoEn != null) return false;
    _cerradoEn = momento ?? DateTime.now();
    notifyListeners();
    return true;
  }

  /// El cierre empezó en cuanto alguien contó algo: el sobre, la parrilla, o
  /// bien ya no quedan paradas por visitar.
  ///
  /// No basta con "todas las paradas cerradas": el caso normal es que el
  /// vendedor entregue el sobre teniendo paradas omitidas pendientes de
  /// justificar, y si en ese momento Vito siguiera en modo ruta se callaría
  /// justo el faltante de caja que acaba de aparecer.
  bool get enLiquidacion =>
      _efectivoEntregado != null ||
      _ruta.bodega.conteoCompleto ||
      _ruta.cerradas == _ruta.total;

  /// Lo que Vito tiene que decir ahora mismo: durante la ruta se adelanta, al
  /// cierre audita.
  List<Hallazgo> get hallazgos => enLiquidacion
      ? analizarLiquidacion(liquidacion)
      : analizarRutaEnCurso(_ruta);
}
