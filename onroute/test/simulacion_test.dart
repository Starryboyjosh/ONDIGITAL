/// Pruebas de la geometría del recorrido y del reloj de simulación.
///
/// El simulador expone `avanzar(Duration)` justo para esto: aquí se simulan
/// horas de ruta sin esperar horas, y sin depender de un `Timer` real que
/// haría las pruebas lentas y frágiles.
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'package:onroute/data/semilla/semilla_tegucigalpa.dart';
import 'package:onroute/data/services/osrm_service.dart';
import 'package:onroute/data/services/recorrido.dart';
import 'package:onroute/data/services/simulador_flota.dart';
import 'package:onroute/domain/models/camion.dart';
import 'package:onroute/domain/models/parada.dart';
import 'package:onroute/domain/models/ruta.dart';

/// Un tramo recto norte–sur de poco más de 1 km, para poder verificar a mano.
final List<LatLng> _rectaNorte = <LatLng>[
  const LatLng(14.090, -87.220),
  const LatLng(14.100, -87.220),
];

void main() {
  group('Recorrido', () {
    test('el largo coincide con la distancia geodésica', () {
      final Recorrido r = Recorrido(_rectaNorte);
      const Distance d = Distance();
      expect(
        r.largo,
        closeTo(d.as(LengthUnit.Meter, _rectaNorte.first, _rectaNorte.last), 1),
      );
    });

    test('el punto medio cae a la mitad', () {
      final Recorrido r = Recorrido(_rectaNorte);
      final PuntoEnRuta p = r.en(r.largo / 2);
      expect(p.punto.latitude, closeTo(14.095, 0.0005));
    });

    test('rumbo norte es cerca de cero grados', () {
      final Recorrido r = Recorrido(_rectaNorte);
      expect(r.en(100).rumbo, closeTo(0, 1));
    });

    test('se satura en los extremos en vez de fallar', () {
      final Recorrido r = Recorrido(_rectaNorte);
      expect(r.en(-500).punto, _rectaNorte.first);
      expect(r.en(r.largo * 10).punto, _rectaNorte.last);
    });

    test('encuentra a qué distancia del trazo cae un destino', () {
      final Recorrido r = Recorrido(<LatLng>[
        const LatLng(14.090, -87.220),
        const LatLng(14.095, -87.220),
        const LatLng(14.100, -87.220),
      ]);
      // El vértice del medio está a la mitad del trazo.
      expect(
        r.distanciaHasta(const LatLng(14.0951, -87.2201)),
        closeTo(r.largo / 2, 30),
      );
    });

    test('el segmento recortado empieza y termina donde se pide', () {
      final Recorrido r = Recorrido(_rectaNorte);
      final List<LatLng> s = r.segmento(0, r.largo / 2);
      expect(s.first.latitude, closeTo(14.090, 0.0005));
      expect(s.last.latitude, closeTo(14.095, 0.0005));
    });
  });

  group('OsrmService (sin red)', () {
    test('exige al menos dos puntos', () {
      expect(
        () => OsrmService().trazar(<LatLng>[const LatLng(14.09, -87.22)]),
        throwsArgumentError,
      );
    });
  });

  group('SimuladorFlota', () {
    SimuladorFlota conRoute({double factor = 1}) {
      final Ruta ruta = rutaDelDia(variante: 0);
      final SimuladorFlota s = SimuladorFlota(factorTiempo: factor);
      s.agregar(
        camion: camionesFlota.first,
        ruta: ruta,
        // Sin red, el trazo es el de reserva: base + cada cliente en orden.
        trazo: <LatLng>[
          ruta.base,
          for (final Parada p in ruta.paradas) p.cliente.posicion,
        ],
      );
      return s;
    }

    test('arranca quieto en el inicio del recorrido', () {
      final SimuladorFlota s = conRoute();
      final CamionSimulado c = s.camiones.single;
      expect(c.avance, 0);
      expect(c.proximaParada, 0);
      expect(c.fraccionRecorrida, 0);
      s.dispose();
    });

    test('avanzar mueve el camión y le da rumbo', () {
      final SimuladorFlota s = conRoute();
      final LatLng antes = s.camiones.single.camion.rastro.posicion;

      s.avanzar(const Duration(minutes: 2));

      final Rastro r = s.camiones.single.camion.rastro;
      expect(r.posicion, isNot(antes));
      expect(r.rumbo, inInclusiveRange(0, 360));
      s.dispose();
    });

    test('un tick largo cubre varias paradas sin saltarse ninguna llegada', () {
      // Es la regresión del bucle: con el presupuesto de tiempo, medio día
      // simulado de un golpe debe disparar cada llegada en orden, no solo una.
      final SimuladorFlota s = conRoute();
      final List<String> llegadas = <String>[];
      s.alLlegar = (String _, String paradaId) => llegadas.add(paradaId);

      s.avanzar(const Duration(hours: 12));

      final Ruta ruta = rutaDelDia(variante: 0);
      expect(llegadas.length, ruta.total);
      expect(llegadas, ruta.paradas.map((Parada p) => p.id).toList(),
          reason: 'las llegadas salen en el orden de la ruta');
      s.dispose();
    });

    test('el mismo tiempo en un tick o en muchos deja el mismo avance', () {
      final SimuladorFlota a = conRoute();
      final SimuladorFlota b = conRoute();

      a.avanzar(const Duration(minutes: 60));
      for (int i = 0; i < 60; i++) {
        b.avanzar(const Duration(minutes: 1));
      }

      expect(a.camiones.single.avance, closeTo(b.camiones.single.avance, 1));
      expect(a.camiones.single.proximaParada, b.camiones.single.proximaParada);
      a.dispose();
      b.dispose();
    });

    test('mientras atiende una parada el camión aparece detenido', () {
      final SimuladorFlota s = SimuladorFlota(
        factorTiempo: 1,
        atencionPorParada: const Duration(minutes: 30),
      );
      final Ruta ruta = rutaDelDia(variante: 0);
      s.agregar(
        camion: camionesFlota.first,
        ruta: ruta,
        trazo: <LatLng>[
          ruta.base,
          for (final Parada p in ruta.paradas) p.cliente.posicion,
        ],
      );

      // Suficiente para llegar a la primera parada y quedarse atendiendo.
      s.avanzar(const Duration(hours: 1));

      final CamionSimulado c = s.camiones.single;
      expect(c.proximaParada, greaterThan(0));
      if (c.atendiendo) {
        expect(c.camion.rastro.velocidadKmH, 0);
        expect(c.camion.estado, EstadoCamion.enParada);
      }
      s.dispose();
    });

    test('al terminar la ruta se queda en la meta, no se pasa de largo', () {
      final SimuladorFlota s = conRoute();
      s.avanzar(const Duration(days: 1));

      final CamionSimulado c = s.camiones.single;
      expect(c.termino, isTrue);
      expect(c.avance, lessThanOrEqualTo(c.recorrido.largo + 1));
      expect(c.camion.estado, EstadoCamion.regresando);
      s.dispose();
    });

    test('el factor de tiempo comprime la jornada', () {
      final SimuladorFlota lento = conRoute();
      final SimuladorFlota rapido = conRoute(factor: 60);

      lento.avanzar(const Duration(minutes: 1));
      rapido.avanzar(const Duration(minutes: 1));

      expect(rapido.camiones.single.avance,
          greaterThan(lento.camiones.single.avance));
      lento.dispose();
      rapido.dispose();
    });
  });
}
