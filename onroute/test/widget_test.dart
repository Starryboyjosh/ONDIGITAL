/// Pruebas de humo del sistema visual.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:onroute/data/repositories/ruta_repository.dart';
import 'package:onroute/data/semilla/semilla_san_pedro_sula.dart';
import 'package:onroute/main.dart';
import 'package:onroute/ui/core/marca/marca_onroute.dart';
import 'package:onroute/ui/core/format/formatos.dart';
import 'package:onroute/ui/core/theme/app_theme.dart';
import 'package:onroute/ui/core/theme/tokens.dart';
import 'package:onroute/ui/core/widgets/money.dart';
import 'package:onroute/ui/core/widgets/route_line.dart';
import 'package:onroute/ui/features/identidad/views/identidad_view.dart';
import 'package:onroute/ui/features/vito/views/vito_chat_view.dart';

/// Monta la pantalla de identidad por sí sola.
///
/// Antes estas pruebas montaban `OnRouteApp`, porque la identidad *era* la
/// pantalla de arranque de la fase 1. Ahora el arranque es el armazón con la
/// torre, y la identidad es una pestaña más: montarla directo mantiene la
/// prueba sobre lo que de verdad examina —el sistema visual— en vez de
/// volverla una prueba de navegación disfrazada. De eso se encarga
/// `app_shell_test.dart`.
Widget _identidad({bool esTorre = false}) => MaterialApp(
      theme: esTorre ? AppTheme.torre : AppTheme.calle,
      home: IdentidadView(
        temaForzado: esTorre,
        esTorre: esTorre,
        onCambiarTema: (_) {},
      ),
    );

void main() {
  testWidgets('la pantalla de identidad levanta en ancho de teléfono',
      (WidgetTester tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(_identidad());
    await tester.pump();

    expect(find.text('Sistema visual'), findsOneWidget);
    expect(find.text('Color'), findsOneWidget);
  });

  testWidgets('no hay desbordes en el teléfono más angosto que soportamos',
      (WidgetTester tester) async {
    // 320 lógicos = iPhone SE de primera generación. Si el sistema aguanta
    // aquí, aguanta en cualquier teléfono que un vendedor traiga en el bolsillo.
    tester.view.physicalSize = const Size(320, 6000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(const OnRouteApp());
    // `pump` con duración fija, no `pumpAndSettle`: el mapa simulado tiene una
    // animación en bucle y `pumpAndSettle` nunca convergería.
    await tester.pump(const Duration(milliseconds: 400));

    expect(tester.takeException(), isNull);
  });

  testWidgets('la pantalla de identidad levanta en ancho de escritorio',
      (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1600, 1000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(_identidad(esTorre: true));
    await tester.pump();

    expect(find.text('Sistema visual'), findsOneWidget);
  });

  testWidgets('registrar un cobro sube el total y avanza la ruta',
      (WidgetTester tester) async {
    // Viewport alto a propósito: en un `CustomScrollView` los slivers fuera de
    // pantalla no se construyen, y esta prueba necesita ver a la vez el botón
    // de cobro y el contador de paradas.
    tester.view.physicalSize = const Size(390, 6000);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(_identidad());
    await tester.pump();

    expect(find.text('7 de 14 paradas'), findsOneWidget);

    await tester.tap(find.text('Registrar cobro'));
    await tester.pump(Motion.journey + const Duration(milliseconds: 50));

    expect(find.text('8 de 14 paradas'), findsOneWidget);
  });

  testWidgets('con movimiento reducido el monto se muestra sin rodar',
      (WidgetTester tester) async {
    await tester.pumpWidget(
      MediaQuery(
        data: const MediaQueryData(disableAnimations: true),
        child: MaterialApp(
          theme: AppTheme.calle,
          home: const Scaffold(body: MoneyOdometer(4320)),
        ),
      ),
    );
    await tester.pump();

    // Sin animación el monto es un solo `Text`, no una fila de dígitos.
    expect(find.text(Formatos.lempiras(4320)), findsOneWidget);
  });

  testWidgets('la línea de ruta expone su progreso a accesibilidad',
      (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.calle,
        home: const Scaffold(
          body: Padding(
            padding: EdgeInsets.all(16),
            child: RouteProgress(hechas: 7, total: 14),
          ),
        ),
      ),
    );
    await tester.pump(Motion.journey + const Duration(milliseconds: 50));

    expect(find.bySemanticsLabel('7 de 14 paradas'), findsOneWidget);
  });

  testWidgets('el isotipo se dibuja para el fondo que tiene detrás',
      (WidgetTester tester) async {
    // La bandera se calculaba con `c.ink.computeLuminance() < 0.5`, e `ink` es
    // el color del **texto**: claro justo cuando el fondo es oscuro. La prueba
    // estaba al revés y el isotipo salía invertido en los dos temas a la vez.
    for (final (String nombre, ThemeData tema, bool esperado)
        in <(String, ThemeData, bool)>[
      ('calle', AppTheme.calle, false),
      ('torre', AppTheme.torre, true),
    ]) {
      final RutaRepository repo = RutaRepository(rutaDelDia(variante: 1));
      addTearDown(repo.dispose);

      await tester.pumpWidget(
        MediaQuery(
          data: const MediaQueryData(size: Size(390, 844)),
          child: MaterialApp(theme: tema, home: VitoChatView(repo: repo)),
        ),
      );
      await tester.pump();

      final MarcaOnRoute marca =
          tester.widget<MarcaOnRoute>(find.byType(MarcaOnRoute));
      expect(marca.sobreOscuro, esperado,
          reason: 'el isotipo de Vito sale invertido en $nombre');

      await tester.pumpWidget(const SizedBox());
    }
  });

  group('Formatos', () {
    test('los lempiras usan coma de millar y punto decimal', () {
      expect(Formatos.lempiras(4320.5), 'L 4,320.50');
      expect(Formatos.lempiras(11840.25), 'L 11,840.25');
    });

    test('el formato corto omite centavos solo cuando no los hay', () {
      expect(Formatos.lempirasCorto(4320), 'L 4,320');
      expect(Formatos.lempirasCorto(4320.5), 'L 4,320.50');
    });

    test('la hora usa la forma hondureña', () {
      expect(Formatos.hora(DateTime(2026, 8, 28, 8, 5)), '8:05 a.m.');
      expect(Formatos.hora(DateTime(2026, 8, 28, 13, 40)), '1:40 p.m.');
      expect(Formatos.hora(DateTime(2026, 8, 28, 0, 30)), '12:30 a.m.');
      expect(Formatos.hora(DateTime(2026, 8, 28, 12, 0)), '12:00 p.m.');
    });

    test('fechas y duraciones en español', () {
      expect(Formatos.fechaLarga(DateTime(2026, 8, 28)), 'viernes 28 de agosto');
      expect(Formatos.duracion(const Duration(minutes: 45)), '45 min');
      expect(Formatos.duracion(const Duration(minutes: 80)), '1 h 20 min');
      expect(Formatos.duracion(const Duration(hours: 2)), '2 h');
    });

    test('distancias', () {
      expect(Formatos.distancia(380), '380 m');
      expect(Formatos.distancia(4200), '4.2 km');
    });

    test('leer un monto es el inverso exacto de imprimirlo', () {
      // Lo primero que hace quien cuenta el sobre es teclear la cifra que la
      // pantalla le está mostrando. Si la lectura no acepta la coma de millar,
      // el botón no hace nada y nadie entiende por qué.
      expect(Formatos.monto(Formatos.lempiras(6847.5).substring(2)), 6847.5);
      expect(Formatos.monto('6,847.50'), 6847.5);
      expect(Formatos.monto('6847.50'), 6847.5);
      expect(Formatos.monto(' 1,234 '), 1234);
      expect(Formatos.monto('-500'), -500);
      expect(Formatos.monto(''), isNull);
      expect(Formatos.monto('  '), isNull);
      expect(Formatos.monto('mil quinientos'), isNull);
      expect(Formatos.monto('1.2.3'), isNull);
    });
  });
}
