/// La semilla de demostración tiene que cuadrar consigo misma.
///
/// Una demo que arranca mostrando un descuadre inventado destruye justo lo que
/// el producto vende: la confianza en el número. Estas pruebas verifican que
/// los datos de Tegucigalpa son internamente coherentes —que la parrilla y las
/// paradas cuentan la misma historia— y que las coordenadas caen donde el
/// encabezado del archivo dice que caen.
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:onroute/data/semilla/semilla_tegucigalpa.dart';
import 'package:onroute/domain/logic/cuadre.dart';
import 'package:onroute/domain/logic/vito_analista.dart';
import 'package:onroute/domain/models/bodega.dart';
import 'package:onroute/domain/models/cliente.dart';
import 'package:onroute/domain/models/dinero.dart';
import 'package:onroute/domain/models/parada.dart';
import 'package:onroute/domain/models/ruta.dart';

void main() {
  test('la parrilla y las paradas cuentan la misma historia', () {
    // El chequeo de integridad de la semilla: lo que la bodega dice que salió
    // del camión tiene que ser exactamente lo que las paradas dicen que se
    // entregó, SKU por SKU. Si divergen, la demo miente antes de empezar.
    final Ruta r = rutaDelDia(variante: 1);

    final Map<String, int> segunParadas = <String, int>{};
    for (final Parada p in r.paradas) {
      p.entregado.forEach((String sku, int n) {
        segunParadas[sku] = (segunParadas[sku] ?? 0) + n;
      });
    }

    final Map<String, int> segunParrilla = <String, int>{};
    for (final Casilla c in r.bodega.casillas) {
      if (c.vendido == 0) continue;
      segunParrilla[c.sku] = (segunParrilla[c.sku] ?? 0) + c.vendido;
    }

    expect(segunParadas, segunParrilla);
  });

  test('la ruta a medio recorrido no arrastra descuadre inventado', () {
    final Ruta r = rutaDelDia(variante: 1);
    final Liquidacion l = cuadrar(ruta: r, efectivoEntregado: r.efectivoTotal);

    expect(l.brechaVenta, Dinero.cero,
        reason: 'entregado y justificado deben coincidir al centavo');
    expect(l.brechaCaja, Dinero.cero);
    expect(
      analizarLiquidacion(l)
          .where((Hallazgo h) => h.severidad == Severidad.critico),
      isEmpty,
      reason: 'la demo no debe abrir acusando a nadie',
    );
  });

  test('la variante recién cargada no tiene nada vendido ni cobrado', () {
    final Ruta r = rutaDelDia(variante: 0);
    expect(r.bodega.bultosVendidos, 0);
    expect(r.cobradoTotal, Dinero.cero);
    expect(r.cerradas, 0);
    expect(r.bodega.valorSalida > Dinero.cero, isTrue);
  });

  test('el avance de la variante 1 es real y hay una parada actual', () {
    final Ruta r = rutaDelDia(variante: 1);
    expect(r.cerradas, 6);
    expect(r.total, 14);
    expect(r.paradaActual, isNotNull);
    expect(r.paradaActual!.orden, greaterThan(6));
  });

  test('cada SKU de la parrilla existe en el catálogo', () {
    final Bodega b = bodegaCargada(variante: 1);
    for (final Casilla c in b.casillas) {
      expect(b.catalogo.containsKey(c.sku), isTrue, reason: 'SKU ${c.sku}');
    }
  });

  test('ninguna casilla vendió más de lo que cargó', () {
    for (final int v in <int>[0, 1]) {
      for (final Casilla c in bodegaCargada(variante: v).casillas) {
        expect(c.enCamion, greaterThanOrEqualTo(0),
            reason: 'casilla ${c.id} en variante $v');
      }
    }
  });

  test('todo cliente cae dentro del área metropolitana de Tegucigalpa', () {
    // El encabezado del archivo promete puntos aproximados dentro de colonias
    // reales. Esta prueba sostiene esa promesa.
    final List<Cliente> todos = <Cliente>[
      ...clientesRuta1,
      ...clientesRuta2,
      ...clientesRuta3,
    ];
    expect(todos.length, 34);
    for (final Cliente c in todos) {
      expect(c.posicion.latitude, inInclusiveRange(14.05, 14.12),
          reason: c.nombre);
      expect(c.posicion.longitude, inInclusiveRange(-87.25, -87.17),
          reason: c.nombre);
    }
  });

  test('los identificadores de cliente y de casilla son únicos', () {
    final List<Cliente> todos = <Cliente>[
      ...clientesRuta1,
      ...clientesRuta2,
      ...clientesRuta3,
    ];
    expect(todos.map((Cliente c) => c.id).toSet().length, todos.length);

    final List<Casilla> casillas = bodegaCargada(variante: 0).casillas;
    expect(casillas.map((Casilla c) => c.id).toSet().length, casillas.length);
  });

  test('no se filtró un teléfono fuera de los rangos de demostración', () {
    // Convención del repo: nada de datos reales de personas o negocios.
    final List<Cliente> todos = <Cliente>[
      ...clientesRuta1,
      ...clientesRuta2,
      ...clientesRuta3,
    ];
    for (final Cliente c in todos) {
      final String? t = c.telefono;
      if (t == null) continue;
      expect(t.contains('2200-') || t.contains('9800-'), isTrue, reason: t);
    }
  });
}
