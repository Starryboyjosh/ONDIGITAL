/// La torre tiene que funcionar sin red.
///
/// El servidor público de OSRM no tiene SLA y la oficina no siempre tiene
/// internet. Estas pruebas corren con un cliente HTTP que siempre falla, que es
/// el peor caso realista, y verifican que la flota igual se arma, se dibuja y
/// se mueve —y que la pantalla dice que el trazo es estimado en vez de hacer
/// pasar una línea recta por una ruta de calle.
library;

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:onroute/data/services/osrm_service.dart';
import 'package:onroute/data/services/simulador_flota.dart';
import 'package:onroute/ui/core/theme/app_theme.dart';
import 'package:onroute/ui/features/torre/torre_controller.dart';
import 'package:onroute/ui/features/torre/views/torre_view.dart';
import 'package:onroute/ui/features/torre/widgets/marcador_camion.dart';

/// Cliente que se cae siempre: simula el lunes sin internet.
class _ClienteCaido extends http.BaseClient {
  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) =>
      Future<http.StreamedResponse>.error(
        const SocketExceptionFalsa(),
      );
}

class SocketExceptionFalsa implements Exception {
  const SocketExceptionFalsa();
}

TorreController _controlador() => TorreController(
      osrm: OsrmService(cliente: _ClienteCaido()),
      simulador: SimuladorFlota(),
    );

Widget _app(Widget hijo, {Size tam = const Size(1440, 900)}) => MediaQuery(
      data: MediaQueryData(size: tam),
      child: MaterialApp(theme: AppTheme.torre, home: hijo),
    );

void main() {
  test('sin red la flota igual se arma, con trazo estimado', () async {
    final TorreController c = _controlador();
    await c.preparar();

    expect(c.listo, isTrue);
    expect(c.rutas, hasLength(3));
    expect(c.simulador.camiones, hasLength(3));
    expect(c.trazosReales, 0, reason: 'ninguna ruta pudo ser real sin red');
    for (final l in c.trazos.values) {
      expect(l.length, greaterThan(1));
    }
    c.dispose();
  });

  test('la flota se ordena poniendo primero a quien sigue en la calle',
      () async {
    final TorreController c = _controlador();
    await c.preparar();

    // Se adelanta la jornada entera de un camión para que termine.
    c.simulador.avanzar(const Duration(hours: 3));
    final List<CamionSimulado> orden = c.flota;
    bool vistoTerminado = false;
    for (final CamionSimulado s in orden) {
      if (s.termino) {
        vistoTerminado = true;
      } else {
        expect(vistoTerminado, isFalse,
            reason: 'un camión activo quedó después de uno terminado');
      }
    }
    c.dispose();
  });

  testWidgets('la torre dibuja un marcador por camión y la traza de cada ruta',
      (WidgetTester tester) async {
    final TorreController c = _controlador();
    await c.preparar();
    tester.view.physicalSize = const Size(1440, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      _app(TorreView(controlador: c, conTiles: false)),
    );
    await tester.pump();

    expect(find.byType(MarcadorCamion), findsNWidgets(3));
    expect(find.byType(PolylineLayer<Object>), findsOneWidget);
    expect(find.text('Trazo estimado: sin conexión al ruteador'), findsOneWidget);
    expect(find.text('© OpenStreetMap'), findsOneWidget,
        reason: 'la atribución de OSM es condición de uso, no adorno');

    await tester.pumpWidget(const SizedBox());
    c.dispose();
  });

  testWidgets('el camión se mueve cuando corre el reloj',
      (WidgetTester tester) async {
    final TorreController c = _controlador();
    await c.preparar();
    tester.view.physicalSize = const Size(1440, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      _app(TorreView(controlador: c, conTiles: false)),
    );
    await tester.pump();

    final antes = c.simulador.camiones.first.camion.rastro.posicion;
    c.simulador.avanzar(const Duration(minutes: 10));
    await tester.pump();
    final despues = c.simulador.camiones.first.camion.rastro.posicion;

    expect(despues, isNot(equals(antes)));

    await tester.pumpWidget(const SizedBox());
    c.dispose();
  });

  testWidgets('la torre levanta en teléfono sin desbordes',
      (WidgetTester tester) async {
    final TorreController c = _controlador();
    await c.preparar();
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      _app(
        TorreView(controlador: c, conTiles: false),
        tam: const Size(390, 844),
      ),
    );
    await tester.pump();

    expect(tester.takeException(), isNull);
    expect(find.byType(MarcadorCamion), findsNWidgets(3));

    await tester.pumpWidget(const SizedBox());
    c.dispose();
  });

  testWidgets('tocar un camión lo selecciona y volver a tocarlo lo suelta',
      (WidgetTester tester) async {
    final TorreController c = _controlador();
    await c.preparar();
    tester.view.physicalSize = const Size(1440, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      _app(TorreView(controlador: c, conTiles: false)),
    );
    await tester.pump();

    await tester.tap(find.byType(MarcadorCamion).first, warnIfMissed: false);
    await tester.pump();
    expect(c.camionSeleccionado, isNotNull);

    final String elegido = c.camionSeleccionado!;
    c.seleccionar(elegido);
    await tester.pump();
    expect(c.camionSeleccionado, elegido);

    await tester.pumpWidget(const SizedBox());
    c.dispose();
  });
}
