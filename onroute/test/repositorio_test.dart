/// El repositorio es la única puerta al estado de negocio, así que estas
/// pruebas no verifican "que compile": verifican que **no exista un camino**
/// por el cual la parrilla y las paradas dejen de contar la misma historia.
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:onroute/data/repositories/ruta_repository.dart';
import 'package:onroute/data/semilla/semilla_san_pedro_sula.dart';
import 'package:onroute/domain/logic/cuadre.dart';
import 'package:onroute/domain/logic/vito_analista.dart';
import 'package:onroute/domain/models/bodega.dart';
import 'package:onroute/domain/models/dinero.dart';
import 'package:onroute/domain/models/parada.dart';
import 'package:onroute/domain/models/ruta.dart';

/// Suma, SKU por SKU, lo que las paradas dicen que se entregó.
Map<String, int> _segunParadas(Ruta r) {
  final Map<String, int> m = <String, int>{};
  for (final Parada p in r.paradas) {
    p.entregado.forEach((String sku, int n) => m[sku] = (m[sku] ?? 0) + n);
  }
  return m;
}

/// Lo mismo, pero según la parrilla.
Map<String, int> _segunParrilla(Ruta r) {
  final Map<String, int> m = <String, int>{};
  for (final Casilla c in r.bodega.casillas) {
    if (c.vendido == 0) continue;
    m[c.sku] = (m[c.sku] ?? 0) + c.vendido;
  }
  return m;
}

void main() {
  late RutaRepository repo;

  setUp(() => repo = RutaRepository(rutaDelDia(variante: 0)));

  /// La primera parada pendiente, con un SKU que sí hay arriba del camión.
  ({String paradaId, String sku}) primerPendiente(RutaRepository r) {
    final Parada p = r.ruta.pendientes.first;
    final String sku = r.ruta.bodega.casillas
        .firstWhere((Casilla c) => c.enCamion > 0)
        .sku;
    return (paradaId: p.id, sku: sku);
  }

  test('una entrega baja de la parrilla y cierra la parada a la vez', () {
    final ({String paradaId, String sku}) t = primerPendiente(repo);
    final int antes = repo.ruta.bodega
        .delSku(t.sku)
        .fold(0, (int a, Casilla c) => a + c.enCamion);

    final ResultadoEntrega r = repo.registrarEntrega(
      paradaId: t.paradaId,
      items: <String, int>{t.sku: 2},
      efectivo: repo.ruta.bodega.producto(t.sku).precio * 2,
    );

    expect(r.exito, isTrue);
    final int despues = repo.ruta.bodega
        .delSku(t.sku)
        .fold(0, (int a, Casilla c) => a + c.enCamion);
    expect(despues, antes - 2, reason: 'la parrilla tiene que haber bajado');
    expect(repo.ruta.porId(t.paradaId)!.estado, EstadoVisita.cobrada);
    expect(_segunParadas(repo.ruta), _segunParrilla(repo.ruta));
  });

  test('una entrega cobrada al centavo no produce brecha de venta', () {
    final ({String paradaId, String sku}) t = primerPendiente(repo);
    repo.registrarEntrega(
      paradaId: t.paradaId,
      items: <String, int>{t.sku: 3},
      efectivo: repo.ruta.bodega.producto(t.sku).precio * 3,
    );
    expect(repo.liquidacion.brechaVenta, Dinero.cero);
  });

  test('el fiado no es descuadre: entra como cartera, no como faltante', () {
    final ({String paradaId, String sku}) t = primerPendiente(repo);
    final Dinero valor = repo.ruta.bodega.producto(t.sku).precio * 2;

    repo.registrarEntrega(
      paradaId: t.paradaId,
      items: <String, int>{t.sku: 2},
      credito: valor,
    );

    final Parada p = repo.ruta.porId(t.paradaId)!;
    expect(p.estado, EstadoVisita.credito);
    expect(repo.liquidacion.brechaVenta, Dinero.cero);
    expect(repo.liquidacion.credito, valor);
  });

  test('pedir más de lo que hay se contesta, no se lanza', () {
    final ({String paradaId, String sku}) t = primerPendiente(repo);
    final int hay = repo.ruta.bodega
        .delSku(t.sku)
        .fold(0, (int a, Casilla c) => a + c.enCamion);

    final ResultadoEntrega r = repo.registrarEntrega(
      paradaId: t.paradaId,
      items: <String, int>{t.sku: hay + 5},
    );

    expect(r.exito, isFalse);
    expect(r.fallo, FalloEntrega.sinExistencia);
    expect(r.bultosFaltantes, 5);
    expect(r.skuFaltante, t.sku);
  });

  test('un bulto negativo se rechaza y no toca la parrilla', () {
    // La regresión: un negativo pasaba la prueba de existencia sin problema
    // ("hay 12, se piden -3"), `despachar` no hacía nada por ser <= 0, y el
    // -3 entraba tal cual a `entregado`. El valor de lo entregado bajaba, y el
    // cuadre abría una brecha de venta que nadie causó.
    final ({String paradaId, String sku}) t = primerPendiente(repo);
    final Map<String, int> antes = <String, int>{
      for (final Casilla x in repo.ruta.bodega.casillas) x.id: x.enCamion,
    };

    final ResultadoEntrega r = repo.registrarEntrega(
      paradaId: t.paradaId,
      items: <String, int>{t.sku: -3},
    );

    expect(r.exito, isFalse);
    expect(r.fallo, FalloEntrega.bultosInvalidos);
    expect(r.skuFaltante, t.sku);
    expect(repo.ruta.porId(t.paradaId)!.estado, EstadoVisita.pendiente);
    for (final Casilla x in repo.ruta.bodega.casillas) {
      expect(x.enCamion, antes[x.id], reason: 'casilla ${x.id} se movió');
    }
    expect(repo.liquidacion.brechaVenta, Dinero.cero);
  });

  test('entregar cero bultos de un producto también se rechaza', () {
    final ({String paradaId, String sku}) t = primerPendiente(repo);
    final ResultadoEntrega r = repo.registrarEntrega(
      paradaId: t.paradaId,
      items: <String, int>{t.sku: 0},
    );

    expect(r.exito, isFalse);
    expect(r.fallo, FalloEntrega.bultosInvalidos);
  });

  test('un SKU que no va en el camión se rechaza en vez de fallar después', () {
    final ({String paradaId, String sku}) t = primerPendiente(repo);
    final ResultadoEntrega r = repo.registrarEntrega(
      paradaId: t.paradaId,
      items: <String, int>{'NO-EXISTE-001': 1},
    );

    expect(r.exito, isFalse);
    expect(r.fallo, FalloEntrega.bultosInvalidos);
    expect(repo.ruta.porId(t.paradaId)!.estado, EstadoVisita.pendiente);
  });

  test('un sobre negativo no se acepta ni fabrica una brecha de caja', () {
    repo.aceptarConteoTeorico();
    final bool ok = repo.entregarEfectivo(Dinero.desdeDecimal(-500));

    expect(ok, isFalse);
    expect(repo.efectivoEntregado, isNull,
        reason: 'no contar es distinto de contar un número imposible');
    expect(repo.listaParaCerrar, isFalse);
  });

  test('una entrega rechazada no deja la parrilla a medio vaciar', () {
    // La prueba que justifica verificar todo antes de despachar nada: si el
    // segundo SKU no alcanza, el primero NO se pudo haber bajado ya.
    final Parada p = repo.ruta.pendientes.first;
    final Casilla c = repo.ruta.bodega.casillas.firstWhere(
      (Casilla c) => c.enCamion > 0,
    );
    final String escaso = repo.ruta.bodega.casillas
        .map((Casilla c) => c.sku)
        .firstWhere((String s) => s != c.sku);

    final Map<String, int> antes = <String, int>{
      for (final Casilla x in repo.ruta.bodega.casillas) x.id: x.enCamion,
    };

    final ResultadoEntrega r = repo.registrarEntrega(
      paradaId: p.id,
      items: <String, int>{c.sku: 1, escaso: 100000},
    );

    expect(r.exito, isFalse);
    for (final Casilla x in repo.ruta.bodega.casillas) {
      expect(x.enCamion, antes[x.id], reason: 'casilla ${x.id} se movió');
    }
    expect(repo.ruta.porId(p.id)!.estado, EstadoVisita.pendiente);
  });

  test('una parada cerrada no se puede volver a cobrar', () {
    final ({String paradaId, String sku}) t = primerPendiente(repo);
    repo.registrarEntrega(
      paradaId: t.paradaId,
      items: <String, int>{t.sku: 1},
      efectivo: repo.ruta.bodega.producto(t.sku).precio,
    );
    final ResultadoEntrega r = repo.registrarEntrega(
      paradaId: t.paradaId,
      items: <String, int>{t.sku: 1},
    );
    expect(r.fallo, FalloEntrega.paradaYaCerrada);
  });

  test('omitir exige motivo y cierra la parada sin mover producto', () {
    final Parada p = repo.ruta.pendientes.first;
    final int bultos = repo.ruta.bodega.bultosVendidos;

    expect(repo.omitir(paradaId: p.id, motivo: MotivoOmision.cerrado), isTrue);
    expect(repo.ruta.porId(p.id)!.estado, EstadoVisita.omitida);
    expect(repo.ruta.bodega.bultosVendidos, bultos);
    expect(repo.omitir(paradaId: p.id, motivo: MotivoOmision.cerrado), isFalse);
  });

  test('sin conteo de parrilla no se puede declarar el día cuadrado', () {
    expect(repo.liquidacion.conteoCompleto, isFalse);
    expect(repo.liquidacion.todoCuadra, isFalse,
        reason: 'cero sin contar no es cero');
    expect(
      repo.hallazgos.map((Hallazgo h) => h.tipo),
      isNot(contains(TipoHallazgo.diaLimpio)),
    );

    repo.aceptarConteoTeorico();
    expect(repo.liquidacion.conteoCompleto, isTrue);
    expect(repo.liquidacion.cargaCuadra, isTrue);
  });

  test('un conteo corto aparece como carga faltante, no como caja corta', () {
    repo.aceptarConteoTeorico();
    final Casilla c =
        repo.ruta.bodega.casillas.firstWhere((Casilla c) => c.enCamion >= 2);
    repo.contarCasilla(casillaId: c.id, contado: c.enCamion - 2);
    repo.entregarEfectivo(repo.ruta.efectivoTotal);

    expect(repo.liquidacion.bultosFaltantes, 2);
    final Set<TipoHallazgo> tipos =
        repo.hallazgos.map((Hallazgo h) => h.tipo).toSet();
    expect(tipos, contains(TipoHallazgo.cargaFaltante));
    expect(tipos, isNot(contains(TipoHallazgo.cajaCorta)));
  });

  test('el sobre corto señala la caja y deja la carga en paz', () {
    final ({String paradaId, String sku}) t = primerPendiente(repo);
    repo.registrarEntrega(
      paradaId: t.paradaId,
      items: <String, int>{t.sku: 2},
      efectivo: repo.ruta.bodega.producto(t.sku).precio * 2,
    );
    repo.aceptarConteoTeorico();
    repo.entregarEfectivo(repo.ruta.efectivoTotal - const Dinero(43000));

    final Liquidacion l = repo.liquidacion;
    expect(l.cajaCuadra, isFalse);
    expect(l.brechaCaja, const Dinero(-43000));
    expect(l.cargaCuadra, isTrue, reason: 'bodega no tiene culpa de esto');
    expect(repo.hallazgos.first.tipo, TipoHallazgo.cajaCorta);
    expect(repo.hallazgos.first.severidad, Severidad.critico);
  });

  test('el repositorio avisa a la UI en cada cambio', () {
    int avisos = 0;
    repo.addListener(() => avisos++);
    final ({String paradaId, String sku}) t = primerPendiente(repo);

    repo.marcarEnSitio(t.paradaId);
    repo.registrarEntrega(
      paradaId: t.paradaId,
      items: <String, int>{t.sku: 1},
      efectivo: repo.ruta.bodega.producto(t.sku).precio,
    );
    repo.entregarEfectivo(Dinero.cero);

    expect(avisos, 3);
  });

  test('cerrar la ruta entera mantiene la invariante parrilla ↔ paradas', () {
    // El recorrido completo: se vende en cada parada hasta que se acabe el
    // producto, y al final las dos fuentes tienen que seguir de acuerdo.
    for (final Parada p in List<Parada>.of(repo.ruta.pendientes)) {
      final Map<String, int> pedido = p.pedidoEsperado.isEmpty
          ? <String, int>{repo.ruta.bodega.casillas.first.sku: 1}
          : p.pedidoEsperado;

      Dinero valor = Dinero.cero;
      pedido.forEach((String sku, int n) {
        valor = valor + repo.ruta.bodega.producto(sku).precio * n;
      });

      final ResultadoEntrega r = repo.registrarEntrega(
        paradaId: p.id,
        items: pedido,
        efectivo: valor,
      );
      if (!r.exito) {
        repo.omitir(paradaId: p.id, motivo: MotivoOmision.noPidio);
      }
    }

    expect(repo.ruta.pendientes, isEmpty);
    expect(_segunParadas(repo.ruta), _segunParrilla(repo.ruta));
    expect(repo.liquidacion.brechaVenta, Dinero.cero);
  });
}
