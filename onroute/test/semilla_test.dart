/// La semilla de demostración tiene que cuadrar consigo misma.
///
/// Una demo que arranca mostrando un descuadre inventado destruye justo lo que
/// el producto vende: la confianza en el número. Estas pruebas verifican que
/// los datos de San Pedro Sula son internamente coherentes —que la parrilla y las
/// paradas cuentan la misma historia— y que las coordenadas caen donde el
/// encabezado del archivo dice que caen.
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:onroute/data/semilla/semilla_san_pedro_sula.dart';
import 'package:onroute/domain/logic/cuadre.dart';
import 'package:onroute/domain/logic/vito_analista.dart';
import 'package:onroute/domain/models/bodega.dart';
import 'package:onroute/domain/models/camion.dart';
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

  test('todo cliente cae dentro del área metropolitana de San Pedro Sula', () {
    // El encabezado del archivo promete puntos aproximados dentro de colonias
    // reales. Esta prueba sostiene esa promesa.
    final List<Cliente> todos = <Cliente>[
      ...clientesRuta1,
      ...clientesRuta2,
      ...clientesRuta3,
    ];
    expect(todos.length, 34);
    for (final Cliente c in todos) {
      expect(c.posicion.latitude, inInclusiveRange(15.45, 15.53),
          reason: c.nombre);
      expect(c.posicion.longitude, inInclusiveRange(-88.08, -87.995),
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

  group('las tres rutas de la flota', () {
    test('cada camión sale con su propia ruta, sus clientes y su parrilla', () {
      final List<Ruta> flota = rutasDeLaFlota();

      expect(flota, hasLength(camionesFlota.length));
      expect(
        flota.map((Ruta r) => r.id).toSet(),
        hasLength(flota.length),
        reason: 'ids repetidos colapsan el mapa de trazos de la torre',
      );
      expect(
        flota.map((Ruta r) => r.camionId).toList(),
        camionesFlota.map((Camion c) => c.id).toList(),
      );
      expect(
        flota.map((Ruta r) => r.total).toList(),
        <int>[clientesRuta1.length, clientesRuta2.length, clientesRuta3.length],
      );

      // Ningún cliente aparece en dos rutas el mismo día.
      final List<String> visitados = <String>[
        for (final Ruta r in flota)
          for (final Parada p in r.paradas) p.cliente.id,
      ];
      expect(visitados.toSet(), hasLength(visitados.length));
      expect(visitados, hasLength(34));

      // Ni dos paradas comparten identificador.
      final List<String> idsParada = <String>[
        for (final Ruta r in flota)
          for (final Parada p in r.paradas) p.id,
      ];
      expect(idsParada.toSet(), hasLength(idsParada.length));
    });

    test('la parrilla y las paradas cuentan la misma historia en las tres', () {
      for (final Ruta r in rutasDeLaFlota()) {
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

        expect(segunParadas, segunParrilla, reason: 'ruta ${r.nombre}');
      }
    });

    test('ninguna de las tres arranca con un descuadre inventado', () {
      for (final Ruta r in rutasDeLaFlota()) {
        final Liquidacion l =
            cuadrar(ruta: r, efectivoEntregado: r.efectivoTotal);
        expect(l.brechaVenta, Dinero.cero, reason: 'ruta ${r.nombre}');
        expect(l.brechaCaja, Dinero.cero, reason: 'ruta ${r.nombre}');
      }
    });

    test('ningún camión sale cargado por encima de su capacidad', () {
      final List<Ruta> flota = rutasDeLaFlota();
      for (int i = 0; i < flota.length; i++) {
        expect(
          flota[i].bodega.bultosSalida,
          lessThanOrEqualTo(camionesFlota[i].capacidadBultos),
          reason: '${camionesFlota[i].apodo} va sobrecargado',
        );
        expect(flota[i].bodega.casillas, isNotEmpty);
        for (final Casilla c in flota[i].bodega.casillas) {
          expect(c.enCamion, greaterThanOrEqualTo(0), reason: c.id);
          expect(flota[i].bodega.catalogo.containsKey(c.sku), isTrue,
              reason: c.sku);
        }
      }
    });

    test('todo pedido esperado pide productos que existen en el catálogo', () {
      for (final Ruta r in rutasDeLaFlota()) {
        for (final Parada p in r.paradas) {
          expect(p.pedidoEsperado, isNotEmpty, reason: p.id);
          for (final String sku in p.pedidoEsperado.keys) {
            expect(catalogoBase.containsKey(sku), isTrue, reason: sku);
          }
        }
      }
    });
  });

  test('no se filtró un teléfono fuera de los rangos de demostración', () {
    // Convención del repo: nada de datos reales de personas o negocios. El
    // fijo va en el rango 2500-xxxx, que además es el prefijo de San Pedro
    // Sula; 2200-xxxx sería Tegucigalpa y delataría una semilla sin mudar.
    for (final Cliente c in _todosLosClientes) {
      final String? t = c.telefono;
      if (t == null) continue;
      expect(t.contains('2500-') || t.contains('9800-'), isTrue, reason: t);
    }
  });

  test('los RTN llevan el código de San Pedro Sula, no el de Tegucigalpa', () {
    // Los primeros cuatro dígitos del RTN son el código del municipio: 0501
    // es Cortés · San Pedro Sula, 0801 es Francisco Morazán · Distrito
    // Central. Un `0801` acá no rompe nada visible y deja la semilla diciendo
    // que la flota factura desde otra ciudad.
    for (final Cliente c in _todosLosClientes) {
      final String? rtn = c.rtn;
      if (rtn == null) continue;
      expect(rtn.length, 14, reason: 'RTN de ${c.nombre}: $rtn');
      expect(rtn.startsWith('0501'), isTrue, reason: 'RTN de ${c.nombre}: $rtn');
    }
  });

  test('los clientes caen dentro del cuadrante de San Pedro Sula', () {
    for (final Cliente c in _todosLosClientes) {
      expect(c.posicion.latitude, inInclusiveRange(15.40, 15.65), reason: c.id);
      expect(c.posicion.longitude, inInclusiveRange(-88.12, -87.90),
          reason: c.id);
    }
  });
}

/// Los 34 clientes del día, de las tres rutas.
final List<Cliente> _todosLosClientes = <Cliente>[
  ...clientesRuta1,
  ...clientesRuta2,
  ...clientesRuta3,
];
