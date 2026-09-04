/// La torre tiene que funcionar sin red.
///
/// El servidor público de OSRM no tiene SLA y la oficina no siempre tiene
/// internet. Estas pruebas corren con un cliente HTTP que siempre falla, que es
/// el peor caso realista, y verifican que la flota igual se arma, se dibuja y
/// se mueve —y que la pantalla dice que el trazo es estimado en vez de hacer
/// pasar una línea recta por una ruta de calle.
library;

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:onroute/data/services/osrm_service.dart';
import 'package:onroute/data/services/simulador_flota.dart';
import 'package:onroute/data/semilla/semilla_san_pedro_sula.dart';
import 'package:onroute/ui/core/theme/app_theme.dart';
import 'package:onroute/ui/core/theme/tokens.dart';
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

/// Cuenta cuántas peticiones salieron antes de contestar ninguna. Es la forma
/// de ver que las tres van en paralelo y no una tras otra.
class _ClienteContador extends http.BaseClient {
  int enVuelo = 0;

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) {
    enVuelo++;
    return Future<http.StreamedResponse>.error(const SocketExceptionFalsa());
  }
}

/// No contesta hasta que se le dice: deja mirar el estado "trazando".
class _ClienteLento extends http.BaseClient {
  final Completer<void> _permiso = Completer<void>();

  void soltar() => _permiso.complete();

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    await _permiso.future;
    throw const SocketExceptionFalsa();
  }
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

  test('preparar pide los tres trazos a la vez y conserva el emparejamiento',
      () async {
    // En serie, un día sin red costaba tres esperas encadenadas: `OsrmService`
    // aguanta 8 s por llamada antes de caer al trazo recto, así que la torre
    // podía tardar 24 s en aparecer. En paralelo el peor caso es una espera.
    //
    // Lo que no se puede perder al paralelizar es el orden: `Future.wait`
    // devuelve por posición y no por llegada, y de eso depende que cada camión
    // se quede con su ruta.
    final _ClienteContador cliente = _ClienteContador();
    final TorreController c = TorreController(
      osrm: OsrmService(cliente: cliente),
      simulador: SimuladorFlota(),
    );

    expect(c.preparando, isFalse);
    final Future<void> arranque = c.preparar();
    expect(c.preparando, isTrue,
        reason: 'la torre tiene que poder decir que está trazando');
    // Las tres peticiones ya salieron antes de que contestara la primera.
    expect(cliente.enVuelo, 3);

    await arranque;
    expect(c.preparando, isFalse);
    expect(c.listo, isTrue);

    // Cada camión con su ruta, en el orden de la semilla.
    final List<CamionSimulado> flota = c.simulador.camiones;
    expect(flota, hasLength(3));
    for (int i = 0; i < flota.length; i++) {
      expect(flota[i].camion.id, camionesFlota[i].id);
      expect(flota[i].ruta.id, c.rutas[i].id);
      expect(flota[i].ruta.camionId, flota[i].camion.id,
          reason: 'un camión se quedó con la ruta de otro');
    }
    c.dispose();
  });

  testWidgets('mientras traza, la torre lo dice en vez de culpar a la red',
      (WidgetTester tester) async {
    // Con `trazosReales` en 0 y la petición todavía en vuelo, el panel
    // afirmaba "Trazo estimado: sin conexión al ruteador" —una afirmación
    // falsa, dicha en color de alerta, sobre algo que aún no se sabía—.
    final _ClienteLento cliente = _ClienteLento();
    final TorreController c = TorreController(
      osrm: OsrmService(cliente: cliente),
      simulador: SimuladorFlota(),
    );
    tester.view.physicalSize = const Size(1440, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    final Future<void> arranque = c.preparar();
    await tester.pumpWidget(_app(TorreView(controlador: c, conTiles: false)));
    await tester.pump();

    expect(find.text('Trazando rutas sobre el mapa…'), findsOneWidget);
    expect(find.text('Trazo estimado: sin conexión al ruteador'), findsNothing);
    expect(find.byType(CircularProgressIndicator), findsOneWidget);

    cliente.soltar();
    await arranque;
    await tester.pump();

    expect(find.text('Trazando rutas sobre el mapa…'), findsNothing);
    expect(find.text('Trazo estimado: sin conexión al ruteador'), findsOneWidget);

    await tester.pumpWidget(const SizedBox());
    c.dispose();
  });

  testWidgets('el marcador del camión cumple el piso táctil de 48',
      (WidgetTester tester) async {
    final TorreController c = _controlador();
    await c.preparar();
    tester.view.physicalSize = const Size(1440, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(_app(TorreView(controlador: c, conTiles: false)));
    await tester.pump();

    final Size tam = tester.getSize(find.byType(MarcadorCamion).first);
    expect(tam.width, greaterThanOrEqualTo(Touch.min));
    expect(tam.height, greaterThanOrEqualTo(Touch.min));

    await tester.pumpWidget(const SizedBox());
    c.dispose();
  });

  testWidgets('repetir la jornada vuelve a poner la flota en la calle',
      (WidgetTester tester) async {
    final TorreController c = _controlador();
    await c.preparar();
    tester.view.physicalSize = const Size(1440, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(_app(TorreView(controlador: c, conTiles: false)));
    await tester.pump();

    c.simulador.avanzar(const Duration(hours: 12));
    await tester.pump();
    expect(c.simulador.camiones.every((CamionSimulado s) => s.termino), isTrue);

    await tester.tap(find.widgetWithText(TextButton, 'Repetir jornada'));
    await tester.pump();

    expect(c.simulador.camiones.every((CamionSimulado s) => s.termino), isFalse);
    expect(find.byType(SnackBar), findsOneWidget,
        reason: 'mover tres marcadores sin decir nada deja a quien tocó '
            'el botón sin saber si pasó algo');

    c.simulador.pausar();
    await tester.pumpWidget(const SizedBox());
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
