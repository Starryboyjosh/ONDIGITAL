/// Ajustes tiene dos trampas propias, y las dos son invisibles a ojo hasta que
/// alguien las pisa:
///
/// 1. **La opción automática tenía que ser recuperable.** El selector anterior
///    recibía el tema ya resuelto, así que en cuanto se tocaba una opción la
///    decisión por ancho quedaba forzada para siempre.
/// 2. **Las pantallas que se empujan salen del `Theme` del armazón.** El
///    `Navigator` del `MaterialApp` vive por encima de él, así que sin volver a
///    envolverlas el registro de conductores abre en el registro visual
///    contrario al elegido.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:onroute/ui/app_shell.dart';
import 'package:onroute/ui/core/theme/palette.dart';
import 'package:onroute/ui/core/widgets/selector_tema.dart';
import 'package:onroute/ui/features/ajustes/views/ajustes_view.dart';
import 'package:onroute/ui/features/conductores/views/conductores_view.dart';
import 'package:onroute/ui/features/identidad/views/identidad_view.dart';
import 'package:onroute/ui/features/torre/views/torre_view.dart';

Future<void> _montar(WidgetTester tester, Size tam) async {
  tester.view.physicalSize = tam;
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    MediaQuery(
      data: MediaQueryData(size: tam, disableAnimations: true),
      child: const MaterialApp(home: AppShell(conTiles: false)),
    ),
  );
  // Nunca `pumpAndSettle`: el simulador de la flota corre en un timer
  // periódico, así que el árbol nunca queda quieto.
  await tester.pump();
}

Future<void> _desmontar(WidgetTester tester) async {
  await tester.pumpWidget(const SizedBox());
  await tester.pump();
}

/// Entra a Ajustes por la barra inferior.
Future<void> _irAAjustes(WidgetTester tester) async {
  await tester.tap(find.descendant(
    of: find.byType(NavigationBar),
    matching: find.text('Ajustes'),
  ));
  await tester.pump();
}

/// Una opción del selector, buscada **dentro** del selector: "Torre" es
/// también el nombre de la primera pestaña de la barra de navegación.
Finder _opcionTema(String etiqueta) => find.descendant(
      of: find.byType(SelectorTema),
      matching: find.text(etiqueta),
    );

/// Un texto buscado dentro de la torre, que es donde se pinta la flota.
Finder _enLaTorre(String texto) => find.descendant(
      of: find.byType(TorreView),
      matching: find.textContaining(texto),
    );

/// El fondo con el que se pintó el `Scaffold` de una pantalla concreta.
Color _fondoDe(WidgetTester tester, Type pantalla) {
  final Scaffold s = tester.widget<Scaffold>(
    find.descendant(of: find.byType(pantalla), matching: find.byType(Scaffold)),
  );
  return s.backgroundColor!;
}

void main() {
  testWidgets('Ajustes ofrece apariencia, conductores y sistema visual',
      (WidgetTester tester) async {
    await _montar(tester, const Size(390, 844));
    await _irAAjustes(tester);

    expect(find.byType(AjustesView), findsOneWidget);
    expect(find.byType(SelectorTema), findsOneWidget);
    expect(find.text('Apariencia'), findsOneWidget);
    expect(find.text('Equipo · Conductores'), findsOneWidget);
    expect(find.text('Sistema visual'), findsOneWidget);

    await _desmontar(tester);
  });

  testWidgets('el selector de tema tiene tres opciones y una es Automático',
      (WidgetTester tester) async {
    await _montar(tester, const Size(390, 844));
    await _irAAjustes(tester);

    final SelectorTema sel = tester.widget<SelectorTema>(
      find.byType(SelectorTema),
    );
    expect(sel.forzado, isNull, reason: 'la app abre en automático');

    for (final String opcion in <String>['Automático', 'Calle', 'Torre']) {
      expect(_opcionTema(opcion), findsOneWidget);
    }

    await _desmontar(tester);
  });

  testWidgets('forzar Torre y volver a Automático devuelve la decisión al ancho',
      (WidgetTester tester) async {
    // 390 px = teléfono: en automático corresponde Calle.
    await _montar(tester, const Size(390, 844));
    await _irAAjustes(tester);
    expect(_fondoDe(tester, AjustesView), OnRouteColors.calle.bg);

    await tester.tap(_opcionTema('Torre'));
    await tester.pump();
    expect(_fondoDe(tester, AjustesView), OnRouteColors.torre.bg);

    // Este es el camino que antes no existía: el selector recibía el tema ya
    // resuelto y nunca volvía a marcar «Automático».
    await tester.tap(_opcionTema('Automático'));
    await tester.pump();
    expect(
      tester.widget<SelectorTema>(find.byType(SelectorTema)).forzado,
      isNull,
    );
    expect(_fondoDe(tester, AjustesView), OnRouteColors.calle.bg);

    await _desmontar(tester);
  });

  testWidgets('el registro de conductores abre en el tema elegido, no en el otro',
      (WidgetTester tester) async {
    // Escritorio: en automático corresponde Torre. Se fuerza Calle a propósito,
    // porque así el tema del armazón y el que el `MaterialApp` traería por
    // defecto dejan de coincidir y la fuga se puede ver.
    await _montar(tester, const Size(1440, 900));
    await tester.tap(find.descendant(
      of: find.byType(NavigationRail),
      matching: find.text('Ajustes'),
    ));
    await tester.pump();

    await tester.tap(_opcionTema('Calle'));
    await tester.pump();

    await tester.tap(find.text('Equipo · Conductores'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

    expect(find.byType(ConductoresView), findsOneWidget);
    expect(
      _fondoDe(tester, ConductoresView),
      OnRouteColors.calle.bg,
      reason: 'la ruta empujada se salió del Theme del armazón',
    );

    await _desmontar(tester);
  });

  testWidgets('sistema visual sigue existiendo, ahora colgando de Ajustes',
      (WidgetTester tester) async {
    await _montar(tester, const Size(390, 844));
    await _irAAjustes(tester);

    await tester.tap(find.text('Sistema visual'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

    expect(find.byType(IdentidadView), findsOneWidget);

    await _desmontar(tester);
  });

  testWidgets(
      'dar de baja desde Ajustes deja el camión sin conductor en la torre',
      (WidgetTester tester) async {
    // El circuito completo: se decide en el registro y tiene que verse en el
    // mapa. Sin la sincronía con el simulador, la torre seguiría rotulando a
    // alguien que el registro ya sacó de la rotación.
    await _montar(tester, const Size(1440, 900));
    expect(_enLaTorre('Marvin Aguilar'), findsWidgets);

    await tester.tap(find.descendant(
      of: find.byType(NavigationRail),
      matching: find.text('Ajustes'),
    ));
    await tester.pump();
    await tester.tap(find.text('Equipo · Conductores'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

    await tester.tap(find.widgetWithText(TextButton, 'Dar de baja').first);
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(find.textContaining('El Rojo (PCX 1234) queda sin'), findsOneWidget,
        reason: 'la confirmación tiene que nombrar el camión que se libera');

    await tester.tap(find.widgetWithText(FilledButton, 'Dar de baja'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

    // De vuelta al armazón, a la torre.
    await tester.tap(find.byTooltip('Back'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    await tester.tap(find.descendant(
      of: find.byType(NavigationRail),
      matching: find.text('Torre'),
    ));
    await tester.pump();

    // Dentro de la torre y no en toda la pantalla: el aviso de la baja sigue
    // arriba, y nombra a quien acaba de salir.
    expect(_enLaTorre('Marvin Aguilar'), findsNothing);
    expect(_enLaTorre('Sin conductor asignado'), findsWidgets);

    await _desmontar(tester);
  });

  testWidgets('el registro lista la flota con quien la maneja',
      (WidgetTester tester) async {
    await _montar(tester, const Size(390, 844));
    await _irAAjustes(tester);

    await tester.tap(find.text('Equipo · Conductores'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

    expect(find.text('Marvin Aguilar'), findsOneWidget);
    expect(find.text('0501-1985-01234 · +504 9800-1182'), findsOneWidget);
    // El apodo del camión que trae, no su id: en el patio nadie dice "cam-01".
    expect(find.text('El Rojo'), findsOneWidget);

    await _desmontar(tester);
  });

  testWidgets('el formulario no deja registrar hasta que los datos cuadran',
      (WidgetTester tester) async {
    // Alto de sobra: la lista es un `ListView` y una tarjeta fuera del
    // viewport no se construye, así que la persona recién registrada no
    // existiría en el árbol y la prueba mediría el scroll, no el alta.
    await _montar(tester, const Size(390, 2400));
    await _irAAjustes(tester);
    await tester.tap(find.text('Equipo · Conductores'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

    expect(find.text('0 de 13 dígitos'), findsNothing);
    await tester.tap(find.widgetWithText(FloatingActionButton, 'Nuevo'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

    Finder registrar() => find.widgetWithText(FilledButton, 'Registrar');
    bool habilitado() =>
        tester.widget<FilledButton>(registrar()).onPressed != null;

    expect(habilitado(), isFalse, reason: 'la hoja abre vacía');

    await tester.enterText(
      find.widgetWithText(TextField, 'Nombre y apellido'),
      'Elder Munguía',
    );
    await tester.pump();
    // Doce dígitos: uno menos de los que lleva un DNI hondureño.
    await tester.enterText(find.widgetWithText(TextField, 'DNI'), '050119960441');
    await tester.pump();
    await tester.enterText(
      find.widgetWithText(TextField, 'Teléfono'),
      '98004412',
    );
    await tester.pump();
    expect(habilitado(), isFalse, reason: 'el DNI está incompleto');
    // El error dice cuántos van: quien escribió doce no tiene que releer el
    // número entero para descubrir cuál le faltó.
    expect(find.text('El DNI son 13 dígitos, van 12'), findsOneWidget);

    await tester.enterText(
      find.widgetWithText(TextField, 'DNI'),
      '0501199604412',
    );
    await tester.pump();
    expect(habilitado(), isTrue);

    await tester.tap(registrar());
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));

    expect(find.text('Elder Munguía'), findsOneWidget);
    expect(find.text('0501-1996-04412 · +504 9800-4412'), findsOneWidget);

    await _desmontar(tester);
  });

  testWidgets('nada se desborda en el teléfono más angosto',
      (WidgetTester tester) async {
    // 320 lógicos: el registro tiene tres botones por fila y una tarjeta densa,
    // que es justo donde una fila rígida se sale de la pantalla.
    await _montar(tester, const Size(320, 2400));
    await _irAAjustes(tester);
    expect(tester.takeException(), isNull);

    await tester.tap(find.text('Equipo · Conductores'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 400));
    expect(tester.takeException(), isNull);

    await _desmontar(tester);
  });
}
