/// Renderiza la pantalla de identidad a PNG, sin abrir ventana.
///
/// Es la forma de mirar el sistema visual desde una terminal: el mismo árbol de
/// widgets que corre en el teléfono, rasterizado a archivo. Las fuentes de
/// marca se cargan desde `assets/fonts` porque `flutter test` arranca sin
/// ninguna fuente real y todo saldría en el tipo de relleno de pruebas.
///
/// Salida: `build/capturas/*.png`.
///
/// Va etiquetada como `captura` y excluida de la corrida normal (ver
/// `dart_test.yaml`): rasterizar cuatro pantallas grandes tarda minutos y esto
/// es una herramienta de revisión visual, no una prueba que pueda fallar.
/// Para correrla a propósito: `flutter test --tags captura`.
@Tags(<String>['captura'])
library;

import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:onroute/ui/core/theme/app_theme.dart';
import 'package:onroute/data/repositories/ruta_repository.dart';
import 'package:onroute/data/semilla/semilla_tegucigalpa.dart';
import 'package:onroute/domain/models/bodega.dart';
import 'package:onroute/domain/models/dinero.dart';
import 'package:onroute/ui/features/bodega/views/bodega_view.dart';
import 'package:onroute/ui/features/identidad/views/identidad_view.dart';
import 'package:onroute/ui/features/liquidacion/views/liquidacion_view.dart';
import 'package:onroute/ui/features/ruta/views/ruta_view.dart';

Future<void> _cargarFuentes() async {
  const Map<String, String> familias = <String, String>{
    'Inter': 'assets/fonts/Inter.ttf',
    'JetBrainsMono': 'assets/fonts/JetBrainsMono.ttf',
    'Fraunces': 'assets/fonts/Fraunces.ttf',
  };
  for (final MapEntry<String, String> e in familias.entries) {
    final File f = File(e.value);
    if (!f.existsSync()) continue;
    final Uint8List bytes = await f.readAsBytes();
    final FontLoader loader = FontLoader(e.key)
      ..addFont(Future<ByteData>.value(ByteData.sublistView(bytes)));
    await loader.load();
  }
}

void main() {
  setUpAll(_cargarFuentes);

  Future<void> capturar(
    WidgetTester tester, {
    required String nombre,
    required Size tamano,
    required bool torre,
  }) async {
    tester.view.physicalSize = tamano;
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    final GlobalKey clave = GlobalKey();

    await tester.pumpWidget(
      RepaintBoundary(
        key: clave,
        child: MaterialApp(
          debugShowCheckedModeBanner: false,
          theme: torre ? AppTheme.torre : AppTheme.calle,
          home: IdentidadView(esTorre: torre, onCambiarTema: (_) {}),
        ),
      ),
    );
    // Un instante fijo del bucle del mapa, para que la captura sea reproducible.
    await tester.pump(const Duration(milliseconds: 2600));

    final RenderRepaintBoundary boundary =
        clave.currentContext!.findRenderObject()! as RenderRepaintBoundary;
    final ui.Image imagen = await boundary.toImage(pixelRatio: 2);
    final ByteData? png = await imagen.toByteData(format: ui.ImageByteFormat.png);

    final Directory salida = Directory('build/capturas')
      ..createSync(recursive: true);
    File('${salida.path}/$nombre.png')
        .writeAsBytesSync(png!.buffer.asUint8List());
  }

  /// Captura de La Bodega Rodante con un descuadre real puesto a propósito:
  /// una demo de la pantalla vacía o perfecta no muestra para qué sirve.
  Future<void> capturarBodega(
    WidgetTester tester, {
    required String nombre,
    required Size tamano,
    required bool torre,
  }) async {
    tester.view.physicalSize = tamano;
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    final RutaRepository repo = RutaRepository(rutaDelDia(variante: 1));
    repo.aceptarConteoTeorico();
    final Casilla objetivo =
        repo.ruta.bodega.casillas.firstWhere((Casilla c) => c.enCamion >= 2);
    repo.contarCasilla(casillaId: objetivo.id, contado: objetivo.enCamion - 2);

    final GlobalKey clave = GlobalKey();
    await tester.pumpWidget(
      RepaintBoundary(
        key: clave,
        child: MaterialApp(
          debugShowCheckedModeBanner: false,
          theme: torre ? AppTheme.torre : AppTheme.calle,
          home: BodegaView(repo: repo),
        ),
      ),
    );
    await tester.pumpAndSettle();

    final RenderRepaintBoundary boundary =
        clave.currentContext!.findRenderObject()! as RenderRepaintBoundary;
    final ui.Image imagen = await boundary.toImage(pixelRatio: 2);
    final ByteData? png =
        await imagen.toByteData(format: ui.ImageByteFormat.png);

    final Directory salida = Directory('build/capturas')
      ..createSync(recursive: true);
    File('${salida.path}/$nombre.png')
        .writeAsBytesSync(png!.buffer.asUint8List());
  }

  /// Captura del cierre del día con un sobre corto: las tres brechas se ven
  /// separadas y Vito nombra la que duele.
  Future<void> capturarCierre(
    WidgetTester tester, {
    required String nombre,
    required Size tamano,
    required bool torre,
  }) async {
    tester.view.physicalSize = tamano;
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    final RutaRepository repo = RutaRepository(rutaDelDia(variante: 1));
    repo.aceptarConteoTeorico();
    final Casilla objetivo =
        repo.ruta.bodega.casillas.firstWhere((Casilla c) => c.enCamion >= 2);
    repo.contarCasilla(casillaId: objetivo.id, contado: objetivo.enCamion - 2);
    // El sobre llega corto por L 430: el caso que esta pantalla existe para
    // hacer visible.
    repo.entregarEfectivo(repo.ruta.efectivoTotal - Dinero.desdeDecimal(430));

    final GlobalKey clave = GlobalKey();
    await tester.pumpWidget(
      RepaintBoundary(
        key: clave,
        child: MaterialApp(
          debugShowCheckedModeBanner: false,
          theme: torre ? AppTheme.torre : AppTheme.calle,
          home: LiquidacionView(repo: repo),
        ),
      ),
    );
    await tester.pumpAndSettle();

    final RenderRepaintBoundary boundary =
        clave.currentContext!.findRenderObject()! as RenderRepaintBoundary;
    final ui.Image imagen = await boundary.toImage(pixelRatio: 2);
    final ByteData? png =
        await imagen.toByteData(format: ui.ImageByteFormat.png);

    final Directory salida = Directory('build/capturas')
      ..createSync(recursive: true);
    File('${salida.path}/$nombre.png')
        .writeAsBytesSync(png!.buffer.asUint8List());
  }

  /// Captura de la ruta del vendedor a media jornada: unas paradas cerradas,
  /// una omitida y la siguiente por delante. Es la pantalla que alguien mira
  /// cincuenta veces al día, así que se revisa a media jornada y no vacía.
  Future<void> capturarRuta(
    WidgetTester tester, {
    required String nombre,
    required Size tamano,
    required bool torre,
  }) async {
    tester.view.physicalSize = tamano;
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    final RutaRepository repo = RutaRepository(rutaDelDia(variante: 1));
    final GlobalKey clave = GlobalKey();
    await tester.pumpWidget(
      RepaintBoundary(
        key: clave,
        child: MaterialApp(
          debugShowCheckedModeBanner: false,
          theme: torre ? AppTheme.torre : AppTheme.calle,
          home: RutaView(repo: repo),
        ),
      ),
    );
    // Duración fija y no `pumpAndSettle`: el nodo de la parada activa late en
    // bucle a propósito, así que el árbol nunca queda quieto. Este instante
    // agarra el pulso a media expansión, que es como se ve en la mano.
    await tester.pump(const Duration(milliseconds: 900));

    final RenderRepaintBoundary boundary =
        clave.currentContext!.findRenderObject()! as RenderRepaintBoundary;
    final ui.Image imagen = await boundary.toImage(pixelRatio: 2);
    final ByteData? png =
        await imagen.toByteData(format: ui.ImageByteFormat.png);

    final Directory salida = Directory('build/capturas')
      ..createSync(recursive: true);
    File('${salida.path}/$nombre.png')
        .writeAsBytesSync(png!.buffer.asUint8List());
  }

  testWidgets('captura · ruta en teléfono', (WidgetTester tester) async {
    await capturarRuta(
      tester,
      nombre: '09-ruta-telefono',
      tamano: const Size(390, 1500),
      torre: false,
    );
  });

  testWidgets('captura · cierre en teléfono', (WidgetTester tester) async {
    await capturarCierre(
      tester,
      nombre: '07-cierre-telefono',
      tamano: const Size(390, 1400),
      torre: false,
    );
  });

  testWidgets('captura · cierre en escritorio', (WidgetTester tester) async {
    await capturarCierre(
      tester,
      nombre: '08-cierre-escritorio',
      tamano: const Size(1440, 900),
      torre: true,
    );
  });

  testWidgets('captura · bodega en teléfono', (WidgetTester tester) async {
    await capturarBodega(
      tester,
      nombre: '05-bodega-telefono',
      tamano: const Size(390, 1100),
      torre: false,
    );
  });

  testWidgets('captura · bodega en escritorio', (WidgetTester tester) async {
    await capturarBodega(
      tester,
      nombre: '06-bodega-escritorio',
      tamano: const Size(1440, 900),
      torre: true,
    );
  });

  testWidgets('captura · calle en teléfono', (WidgetTester tester) async {
    await capturar(
      tester,
      nombre: '01-calle-telefono',
      tamano: const Size(390, 2200),
      torre: false,
    );
  });

  testWidgets('captura · torre en teléfono', (WidgetTester tester) async {
    await capturar(
      tester,
      nombre: '02-torre-telefono',
      tamano: const Size(390, 2200),
      torre: true,
    );
  });

  testWidgets('captura · torre en escritorio', (WidgetTester tester) async {
    await capturar(
      tester,
      nombre: '03-torre-escritorio',
      tamano: const Size(1440, 1500),
      torre: true,
    );
  });

  testWidgets('captura · calle en escritorio', (WidgetTester tester) async {
    await capturar(
      tester,
      nombre: '04-calle-escritorio',
      tamano: const Size(1440, 1500),
      torre: false,
    );
  });
}
