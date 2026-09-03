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
