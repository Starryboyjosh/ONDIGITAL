/// La pantalla de cierre promete que las tres brechas nunca se mezclan en un
/// solo número, que la brecha de carga se admite como desconocida mientras
/// nadie cuente la parrilla, y que contar el sobre corto dispara el hallazgo
/// de Vito. Estas pruebas existen para que ninguna de las tres se rompa en
/// silencio.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:onroute/data/repositories/ruta_repository.dart';
import 'package:onroute/data/semilla/semilla_san_pedro_sula.dart';
import 'package:onroute/domain/models/dinero.dart';
import 'package:onroute/ui/core/theme/app_theme.dart';
import 'package:onroute/ui/features/liquidacion/views/liquidacion_view.dart';

Widget _app(Widget hijo, {Size tam = const Size(390, 844)}) => MediaQuery(
      // Sin esto `pumpAndSettle` cuelga: hay widgets con animación en bucle
      // (el pulso de estado) en el tema de la app.
      data: MediaQueryData(size: tam, disableAnimations: true),
      child: MaterialApp(theme: AppTheme.calle, home: hijo),
    );

Future<void> _fijarTamano(WidgetTester tester, Size tam) async {
  tester.view.physicalSize = tam;
  tester.view.devicePixelRatio = 1;
}

void main() {
  testWidgets('las tres brechas se muestran como tres cifras distintas',
      (WidgetTester tester) async {
    final RutaRepository repo = RutaRepository(rutaDelDia(variante: 0));
    await _fijarTamano(tester, const Size(390, 2200));
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      _app(LiquidacionView(repo: repo), tam: const Size(390, 2200)),
    );
    await tester.pumpAndSettle();

    // Las tres etiquetas aparecen por separado.
    expect(find.text('Brecha de venta'), findsOneWidget);
    expect(find.text('Brecha de caja'), findsOneWidget);
    expect(find.text('Brecha de carga'), findsOneWidget);

    // No existe ningún rótulo de total/descuadre único que las colapse.
    expect(find.textContaining('Descuadre total'), findsNothing);
  });

  testWidgets(
      'sin conteo de parrilla la pantalla dice desconocida y no un cero',
      (WidgetTester tester) async {
    final RutaRepository repo = RutaRepository(rutaDelDia(variante: 0));
    // Nadie llamó a contarCasilla ni a aceptarConteoTeorico: la parrilla
    // sigue sin contar.
    expect(repo.ruta.bodega.conteoCompleto, isFalse);

    await _fijarTamano(tester, const Size(390, 2200));
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      _app(LiquidacionView(repo: repo), tam: const Size(390, 2200)),
    );
    await tester.pumpAndSettle();

    expect(find.textContaining('Desconocida'), findsOneWidget);

    // La fila de "Brecha de carga" tiene que mostrar "Desconocida" y no un
    // monto en lempiras: se busca el ancestro común de la etiqueta y se
    // confirma que ningún MoneyText de esa fila diga L 0.00.
    final Finder filaCarga = find.ancestor(
      of: find.text('Brecha de carga'),
      matching: find.byType(Row),
    );
    expect(
      find.descendant(of: filaCarga, matching: find.text('L 0.00')),
      findsNothing,
    );
  });

  testWidgets('contar el sobre corto muestra el hallazgo de caja corta de Vito',
      (WidgetTester tester) async {
    // Variante 1 y no 0: con la ruta recién cargada el efectivo esperado es
    // cero, y "L 100 menos que cero" es un sobre negativo, que el repositorio
    // rechaza con razón. El caso que esta prueba quiere es el real: una ruta
    // con cobros de verdad y un sobre que llega corto.
    final RutaRepository repo = RutaRepository(rutaDelDia(variante: 1));
    // Se cuenta la parrilla completa para que la única brecha activa sea la
    // de caja, y se calcula cuánto debería traer el sobre.
    repo.aceptarConteoTeorico();
    final Dinero esperado = repo.liquidacion.efectivoEsperado;
    expect(esperado > const Dinero(10000), isTrue,
        reason: 'el sobre corto tiene que seguir siendo un monto positivo');
    final Dinero corto = esperado - const Dinero(10000); // L 100 de menos.

    await _fijarTamano(tester, const Size(390, 2200));
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      _app(LiquidacionView(repo: repo), tam: const Size(390, 2200)),
    );
    await tester.pumpAndSettle();

    await tester.enterText(
      find.widgetWithText(TextField, 'Efectivo del sobre'),
      corto.enLempiras.toStringAsFixed(2),
    );
    await tester.tap(find.widgetWithText(FilledButton, 'Entregar'));
    await tester.pumpAndSettle();

    expect(find.textContaining('Faltan'), findsWidgets);
    expect(find.textContaining('del sobre'), findsWidgets);
  });

  testWidgets('el cierre abre diciendo qué falta, no gritando descuadre',
      (WidgetTester tester) async {
    // Al abrir, `todoCuadra` es falso solo porque nadie contó la parrilla, y
    // la pantalla saludaba con la pastilla de alerta «Descuadre» y con «La
    // brecha más grande es L 0.00 en el sobre de efectivo»: una alarma sobre
    // un cero. Quien la ve todos los días deja de creerle.
    final RutaRepository repo = RutaRepository(rutaDelDia(variante: 1));
    await _fijarTamano(tester, const Size(390, 2400));
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      _app(LiquidacionView(repo: repo), tam: const Size(390, 2400)),
    );
    await tester.pumpAndSettle();

    expect(find.text('Descuadre'), findsNothing);
    // El titular ya no puede ser «La brecha más grande es L 0.00»: sin medir
    // no hay brecha mayor que nombrar. En la tabla de los tres libros un
    // L 0.00 sí es legítimo —ahí es una cifra, no una alarma—.
    expect(find.textContaining('La brecha más grande'), findsNothing);
    expect(find.text('Día abierto'), findsOneWidget);
    expect(
      find.textContaining('Falta contar la parrilla y el sobre'),
      findsWidgets,
    );
  });

  testWidgets('el botón de cerrar el día no se puede tocar hasta que se midió',
      (WidgetTester tester) async {
    final RutaRepository repo = RutaRepository(rutaDelDia(variante: 1));
    await _fijarTamano(tester, const Size(390, 2400));
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      _app(LiquidacionView(repo: repo), tam: const Size(390, 2400)),
    );
    await tester.pumpAndSettle();

    final Finder cerrar = find.widgetWithText(FilledButton, 'Cerrar el día');
    expect(cerrar, findsOneWidget, reason: 'el cierre tiene que poder cerrar');
    expect(tester.widget<FilledButton>(cerrar).onPressed, isNull);

    // Contada la parrilla sigue faltando el sobre, y el botón lo dice.
    repo.aceptarConteoTeorico();
    await tester.pumpAndSettle();
    expect(tester.widget<FilledButton>(cerrar).onPressed, isNull);
    expect(find.textContaining('Falta contar el sobre'), findsWidgets);
  });

  testWidgets('firmar el cierre cierra el día, lo avisa y congela el sobre',
      (WidgetTester tester) async {
    final RutaRepository repo = RutaRepository(rutaDelDia(variante: 1));
    repo.aceptarConteoTeorico();
    final Dinero esperado = repo.liquidacion.efectivoEsperado;

    await _fijarTamano(tester, const Size(390, 2400));
    addTearDown(tester.view.reset);

    bool aviso = false;
    await tester.pumpWidget(
      _app(
        LiquidacionView(repo: repo, alCerrar: () => aviso = true),
        tam: const Size(390, 2400),
      ),
    );
    await tester.pumpAndSettle();

    await tester.enterText(
      find.widgetWithText(TextField, 'Efectivo del sobre'),
      esperado.enLempiras.toStringAsFixed(2),
    );
    await tester.tap(find.widgetWithText(FilledButton, 'Entregar'));
    await tester.pumpAndSettle();
    expect(find.text('Todo cuadra'), findsOneWidget);

    final Finder cerrar = find.widgetWithText(FilledButton, 'Cerrar el día');
    await tester.ensureVisible(cerrar);
    await tester.tap(cerrar);
    await tester.pumpAndSettle();

    // Pregunta antes: firmar es lo único de esta pantalla que termina algo.
    expect(find.byType(AlertDialog), findsOneWidget);
    expect(repo.diaCerrado, isFalse);
    await tester.tap(find.widgetWithText(FilledButton, 'Cerrar el día').last);
    await tester.pumpAndSettle();

    expect(repo.diaCerrado, isTrue);
    expect(aviso, isTrue, reason: 'alCerrar tiene que llegar a alguien');
    expect(find.byType(SnackBar), findsOneWidget);
    expect(find.text('Día cerrado'), findsOneWidget);

    // Con el día firmado el sobre ya no admite correcciones: si se pudiera
    // seguir tecleando, la firma no habría cerrado nada.
    expect(
      tester
          .widget<TextField>(
            find.widgetWithText(TextField, 'Efectivo del sobre'),
          )
          .enabled,
      isFalse,
    );
    expect(
      tester
          .widget<FilledButton>(
            find.widgetWithText(FilledButton, 'Entregar'),
          )
          .onPressed,
      isNull,
    );
  });

  testWidgets('sin desbordes a 320 px', (WidgetTester tester) async {
    final RutaRepository repo = RutaRepository(rutaDelDia(variante: 0));
    await _fijarTamano(tester, const Size(320, 2400));
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      _app(LiquidacionView(repo: repo), tam: const Size(320, 2400)),
    );
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
  });

  testWidgets('sin desbordes a 1440 px', (WidgetTester tester) async {
    final RutaRepository repo = RutaRepository(rutaDelDia(variante: 0));
    await _fijarTamano(tester, const Size(1440, 900));
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      _app(LiquidacionView(repo: repo), tam: const Size(1440, 900)),
    );
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
  });
}
