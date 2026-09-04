/// El armazón tiene una sola promesa que vale la pena blindar: las pantallas
/// operativas miran el MISMO día. Si Bodega y Ruta terminaran con repositorios
/// distintos, todo se vería bien y la app estaría mintiendo —cobrar en una
/// pantalla no vaciaría la parrilla de la otra.
library;

import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:onroute/ui/app_shell.dart';
import 'package:onroute/ui/features/bodega/views/bodega_view.dart';
import 'package:onroute/ui/features/ajustes/views/ajustes_view.dart';
import 'package:onroute/ui/features/liquidacion/views/liquidacion_view.dart';
import 'package:onroute/ui/features/ruta/views/ruta_view.dart';
import 'package:onroute/ui/features/torre/views/torre_view.dart';
import 'package:onroute/ui/features/vito/views/vito_chat_view.dart';

Widget _app({required Size tam}) => MediaQuery(
      data: MediaQueryData(size: tam, disableAnimations: true),
      child: const MaterialApp(home: AppShell(conTiles: false)),
    );

Future<void> _montar(WidgetTester tester, Size tam) async {
  tester.view.physicalSize = tam;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(_app(tam: tam));
  // Nunca `pumpAndSettle`: el simulador de la flota corre en un timer
  // periódico a propósito, así que el árbol jamás queda quieto.
  await tester.pump();
}

/// Una pestaña de la barra inferior, buscada dentro de la barra: el nombre
/// suelto aparece también en el texto de otras pantallas.
Finder _pestana(String etiqueta) => find.descendant(
      of: find.byType(NavigationBar),
      matching: find.text(etiqueta),
    );

Future<void> _desmontar(WidgetTester tester) async {
  await tester.pumpWidget(const SizedBox());
  await tester.pump();
}

void main() {
  testWidgets('en teléfono la navegación va abajo y llega a las seis',
      (WidgetTester tester) async {
    await _montar(tester, const Size(390, 844));

    expect(find.byType(NavigationBar), findsOneWidget);
    expect(find.byType(NavigationRail), findsNothing);
    expect(find.byType(TorreView), findsOneWidget);

    for (final (String etiqueta, Type pantalla) in <(String, Type)>[
      ('Bodega', BodegaView),
      ('Ruta', RutaView),
      ('Cierre', LiquidacionView),
      ('Vito', VitoChatView),
      ('Ajustes', AjustesView),
      ('Torre', TorreView),
    ]) {
      // Por el nombre dentro de la barra, no en toda la pantalla: la de
      // identidad también habla de "torre" y "calle" en su propio texto.
      await tester.tap(find.descendant(
        of: find.byType(NavigationBar),
        matching: find.text(etiqueta),
      ));
      await tester.pump();
      expect(find.byType(pantalla), findsOneWidget,
          reason: 'la pestaña $etiqueta no llevó a su pantalla');
    }

    expect(tester.takeException(), isNull);
    await _desmontar(tester);
  });

  testWidgets('en escritorio la navegación va en riel lateral',
      (WidgetTester tester) async {
    await _montar(tester, const Size(1440, 900));

    expect(find.byType(NavigationRail), findsOneWidget);
    expect(find.byType(NavigationBar), findsNothing);
    expect(tester.takeException(), isNull);

    await _desmontar(tester);
  });

  testWidgets('bodega y ruta comparten el mismo día de trabajo',
      (WidgetTester tester) async {
    await _montar(tester, const Size(390, 1600));

    await tester.tap(_pestana('Ruta'));
    await tester.pump();
    final RutaView ruta = tester.widget<RutaView>(find.byType(RutaView));

    await tester.tap(_pestana('Bodega'));
    await tester.pump();
    final BodegaView bodega = tester.widget<BodegaView>(find.byType(BodegaView));

    expect(identical(ruta.repo, bodega.repo), isTrue,
        reason: 'cada pantalla se quedó con su propio repositorio');

    await _desmontar(tester);
  });

  testWidgets('cambiar de pestaña no congela la flota',
      (WidgetTester tester) async {
    await _montar(tester, const Size(390, 844));

    await tester.tap(_pestana('Bodega'));
    await tester.pump();
    // El reloj sigue corriendo con la torre fuera de pantalla: media hora
    // simulada mientras nadie la mira.
    await tester.pump(const Duration(seconds: 2));

    await tester.tap(_pestana('Torre'));
    await tester.pump();

    expect(find.byType(TorreView), findsOneWidget);
    expect(tester.takeException(), isNull);

    await _desmontar(tester);
  });

  testWidgets('el camión que llega en el mapa marca la parada en la lista',
      (WidgetTester tester) async {
    // Dos piezas buenas que no se hablaban: el simulador anunciaba cada
    // llegada por `alLlegar` y no lo escuchaba nadie, y `marcarEnSitio` del
    // repositorio no la llamaba ninguna pantalla. La torre mostraba a El Rojo
    // detenido en la pulpería mientras la pantalla de Ruta seguía diciendo que
    // esa parada estaba «Pendiente».
    await _montar(tester, const Size(390, 1600));

    final TorreView torre = tester.widget<TorreView>(find.byType(TorreView));
    // La primera ruta de la flota es la que trabaja el repositorio: mismo
    // camión, mismas paradas.
    expect(torre.controlador.rutas.first.camionId,
        torre.controlador.simulador.camiones.first.camion.id);

    await tester.tap(_pestana('Ruta'));
    await tester.pump();
    final RutaView ruta = tester.widget<RutaView>(find.byType(RutaView));
    expect(ruta.repo.ruta.paradas.any((p) => p.estado.name == 'enSitio'),
        isFalse);

    // Se adelanta media jornada: el camión pasa las seis paradas ya cerradas
    // —que `marcarEnSitio` deja en paz— y llega a la primera pendiente.
    torre.controlador.simulador.avanzar(const Duration(hours: 4));
    await tester.pump();

    expect(
      ruta.repo.ruta.paradas.any((p) => p.estado.name == 'enSitio'),
      isTrue,
      reason: 'la llegada del mapa nunca llegó a la lista de la ruta',
    );
    expect(find.text('En sitio'), findsWidgets);

    await _desmontar(tester);
  });

  /// La barra inferior reparte el ancho en partes iguales entre las seis
  /// pestañas. Si una etiqueta no cabe, Flutter no se queja: la corta con
  /// puntos suspensivos y la app se ve inacabada sin que nada falle. Esta
  /// prueba mide con la fuente real —`flutter_test` usa por defecto una
  /// fuente de ancho fijo que no se parece a Inter— y falla si alguna
  /// etiqueta necesita más espacio del que tiene.
  testWidgets('ninguna etiqueta de la barra sale cortada en teléfono',
      (WidgetTester tester) async {
    final FontLoader inter = FontLoader('Inter')
      ..addFont(Future<ByteData>.value(
        File('assets/fonts/Inter.ttf').readAsBytesSync().buffer.asByteData(),
      ));
    await inter.load();

    // 320 = iPhone SE de primera generación; 360 = el Android barato más
    // común en Honduras; 390 = iPhone moderno.
    for (final double ancho in <double>[320, 360, 390]) {
      await _montar(tester, Size(ancho, 900));

      for (final Destino d in Destino.values) {
        final RenderParagraph etiqueta =
            tester.renderObject<RenderParagraph>(_pestana(d.etiqueta));
        expect(
          etiqueta.getMaxIntrinsicWidth(double.infinity),
          lessThanOrEqualTo(etiqueta.size.width + 0.5),
          reason: '"${d.etiqueta}" no cabe en su pestaña a $ancho px de ancho',
        );
      }

      await _desmontar(tester);
    }
  });
}
