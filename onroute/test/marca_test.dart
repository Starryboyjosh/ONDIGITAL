/// Rasteriza la marca a PNG y genera los íconos de launcher.
///
/// Una sola fuente de verdad: el mismo `CustomPainter` que la app dibuja en
/// pantalla es el que produce los archivos del launcher. Así no puede pasar
/// que el ícono del teléfono y la marca de adentro se separen con el tiempo.
///
/// Va etiquetada como `captura` y salteada en la corrida normal. Para correrla:
///   flutter test test/marca_test.dart --run-skipped
@Tags(<String>['captura'])
library;

import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:onroute/ui/core/marca/marca_onroute.dart';

Future<void> _cargarFuentes() async {
  const Map<String, String> familias = <String, String>{
    'Inter': 'assets/fonts/Inter.ttf',
    'Fraunces': 'assets/fonts/Fraunces.ttf',
  };
  for (final MapEntry<String, String> e in familias.entries) {
    final File f = File(e.value);
    if (!f.existsSync()) continue;
    final Uint8List bytes = await f.readAsBytes();
    await (FontLoader(e.key)
          ..addFont(Future<ByteData>.value(ByteData.sublistView(bytes))))
        .load();
  }
}

Future<void> _aPng(
  WidgetTester tester, {
  required Widget hijo,
  required Size tamano,
  required String ruta,
  Color fondo = Colors.transparent,
}) async {
  tester.view.physicalSize = tamano;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);

  final GlobalKey clave = GlobalKey();
  await tester.pumpWidget(
    Directionality(
      textDirection: TextDirection.ltr,
      child: RepaintBoundary(
        key: clave,
        child: ColoredBox(
          color: fondo,
          child: Center(child: hijo),
        ),
      ),
    ),
  );
  await tester.pump();

  // El rasterizado va dentro de `runAsync`. `testWidgets` corre en una zona de
  // tiempo falso, y ahí el futuro de `toImage` depende de que el motor —que sí
  // usa el reloj real— llegue a completarlo: a veces alcanza y a veces la
  // prueba se queda colgada para siempre, sin fallar. `runAsync` sale de esa
  // zona y lo vuelve determinista.
  await tester.runAsync(() async {
    final RenderRepaintBoundary b =
        clave.currentContext!.findRenderObject()! as RenderRepaintBoundary;
    final ui.Image img = await b.toImage(pixelRatio: 1);
    final ByteData? png = await img.toByteData(format: ui.ImageByteFormat.png);
    img.dispose();
    final File salida = File(ruta)..createSync(recursive: true);
    salida.writeAsBytesSync(png!.buffer.asUint8List());
  });
}

void main() {
  setUpAll(_cargarFuentes);

  testWidgets('marca · hoja de revisión', (WidgetTester tester) async {
    await _aPng(
      tester,
      tamano: const Size(900, 420),
      fondo: ColoresMarca.tinta,
      ruta: 'build/capturas/logo-oscuro.png',
      hijo: const Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: <Widget>[
          LogotipoOnRoute(altura: 84),
          SizedBox(height: 48),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: <Widget>[
              MarcaOnRoute(tamano: 128),
              SizedBox(width: 32),
              MarcaOnRoute(tamano: 64),
              SizedBox(width: 32),
              MarcaOnRoute(tamano: 40),
              SizedBox(width: 32),
              // 24 px: el tamaño más chico donde todavía tiene que leerse.
              MarcaOnRoute(tamano: 24),
            ],
          ),
        ],
      ),
    );
  });

  testWidgets('marca · sobre claro', (WidgetTester tester) async {
    await _aPng(
      tester,
      tamano: const Size(900, 260),
      fondo: ColoresMarca.pergamino,
      ruta: 'build/capturas/logo-claro.png',
      hijo: const Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: <Widget>[
          LogotipoOnRoute(altura: 84, sobreOscuro: false),
          SizedBox(width: 48),
          MarcaOnRoute(tamano: 96, sobreOscuro: false),
        ],
      ),
    );
  });

  // Un `testWidgets` por archivo y no un bucle adentro de uno solo: dos
  // `toImage` seguidos en la misma prueba se quedan colgados esperando al
  // rasterizador, y el segundo archivo nunca se escribe.
  for (final MapEntry<String, int> d in <String, int>{
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192,
  }.entries) {
    testWidgets('launcher · ${d.key}', (WidgetTester tester) async {
      await _aPng(
        tester,
        tamano: Size(d.value.toDouble(), d.value.toDouble()),
        ruta: 'android/app/src/main/res/${d.key}/ic_launcher.png',
        hijo: MarcaOnRoute(tamano: d.value.toDouble(), conFondo: true),
      );
    });
  }

  // Ícono adaptativo: Android recorta el primer plano con la máscara que use
  // el launcher y solo garantiza el 66% central, así que la marca va al 60%
  // del lienzo y el fondo lo pone un color liso.
  for (final MapEntry<String, int> d in <String, int>{
    'mipmap-mdpi': 108,
    'mipmap-hdpi': 162,
    'mipmap-xhdpi': 216,
    'mipmap-xxhdpi': 324,
    'mipmap-xxxhdpi': 432,
  }.entries) {
    testWidgets('adaptativo · ${d.key}', (WidgetTester tester) async {
      await _aPng(
        tester,
        tamano: Size(d.value.toDouble(), d.value.toDouble()),
        ruta: 'android/app/src/main/res/${d.key}/ic_launcher_foreground.png',
        hijo: MarcaOnRoute(tamano: d.value * 0.60),
      );
    });
  }

  testWidgets('marca · ícono de tienda', (WidgetTester tester) async {
    await _aPng(
      tester,
      tamano: const Size(512, 512),
      ruta: 'build/capturas/icono-512.png',
      hijo: const MarcaOnRoute(tamano: 512, conFondo: true),
    );
  });
}
