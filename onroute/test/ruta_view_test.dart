/// La pantalla del vendedor en la calle promete dos cosas: que registrar un
/// cobro mueve el estado real de la ruta (contador de atendidas, cobrado del
/// día) y que nunca se puede cerrar una parada con un descuadre silencioso.
/// Estas pruebas existen para que ninguna de las dos se rompa en silencio.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:onroute/data/repositories/ruta_repository.dart';
import 'package:onroute/data/semilla/semilla_tegucigalpa.dart';
import 'package:onroute/domain/models/bodega.dart';
import 'package:onroute/domain/models/parada.dart';
import 'package:onroute/ui/core/format/formatos.dart';
import 'package:onroute/ui/core/theme/app_theme.dart';
import 'package:onroute/ui/features/ruta/views/ruta_view.dart';

Widget _app(Widget hijo, {Size tam = const Size(390, 844)}) => MediaQuery(
      // Se desactivan las animaciones (el pulso de la parada actual en
      // `RouteNode` late indefinidamente): sin esto `pumpAndSettle` nunca
      // termina de asentar.
      data: MediaQueryData(size: tam, disableAnimations: true),
      child: MaterialApp(theme: AppTheme.calle, home: hijo),
    );

Future<void> _fijarTamano(WidgetTester tester, Size tam) async {
  tester.view.physicalSize = tam;
  tester.view.devicePixelRatio = 1;
}

void main() {
  testWidgets('se dibuja una fila por parada', (WidgetTester tester) async {
    final RutaRepository repo = RutaRepository(rutaDelDia(variante: 0));
    await _fijarTamano(tester, const Size(390, 1600));
    addTearDown(tester.view.reset);

    await tester.pumpWidget(_app(RutaView(repo: repo), tam: const Size(390, 1600)));
    await tester.pumpAndSettle();

    for (final Parada p in repo.ruta.paradas) {
      expect(find.text(p.cliente.nombre), findsOneWidget);
    }
  });

  testWidgets(
      'registrar un cobro completo mueve el contador y el cobrado del encabezado',
      (WidgetTester tester) async {
    final RutaRepository repo = RutaRepository(rutaDelDia(variante: 0));
    await _fijarTamano(tester, const Size(390, 1600));
    addTearDown(tester.view.reset);

    await tester.pumpWidget(_app(RutaView(repo: repo), tam: const Size(390, 1600)));
    await tester.pumpAndSettle();

    final Parada objetivo = repo.ruta.paradas.firstWhere((Parada p) => !p.cerrada);
    await tester.tap(find.text(objetivo.cliente.nombre));
    await tester.pumpAndSettle();

    final Bodega bodega = repo.ruta.bodega;
    // La hoja precarga el pedido completo (todos los SKU esperados), así que
    // el valor a cuadrar es la suma de todos, no solo del primero.
    final int valorTotal = objetivo.pedidoEsperado.entries.fold(
      0,
      (int a, MapEntry<String, int> e) =>
          a + bodega.producto(e.key).precio.centavos * e.value,
    );

    await tester.enterText(
      find.widgetWithText(TextField, 'Efectivo'),
      (valorTotal / 100).toStringAsFixed(2),
    );
    await tester.pumpAndSettle();

    final Finder botonRegistrar = find.widgetWithText(FilledButton, 'Registrar cobro');
    expect(tester.widget<FilledButton>(botonRegistrar).onPressed, isNotNull);

    await tester.tap(botonRegistrar);
    await tester.pumpAndSettle();

    expect(repo.ruta.atendidas, 1);
    // Dos cuentas separadas: cobradas y visitadas. Coinciden acá porque no se
    // omitió ninguna, pero el encabezado no las colapsa.
    expect(
      find.textContaining('1 cobrada · 1 de ${repo.ruta.total} visitadas'),
      findsOneWidget,
    );
    // Aparece al menos en el encabezado; también puede coincidir con el
    // monto de la fila si es la única parada cobrada hasta ahora.
    expect(
      find.text(Formatos.lempiras(repo.ruta.cobradoTotal.enLempiras)),
      findsWidgets,
    );
  });

  testWidgets('con los montos sin cuadrar el botón de registrar está deshabilitado',
      (WidgetTester tester) async {
    final RutaRepository repo = RutaRepository(rutaDelDia(variante: 0));
    await _fijarTamano(tester, const Size(390, 1600));
    addTearDown(tester.view.reset);

    await tester.pumpWidget(_app(RutaView(repo: repo), tam: const Size(390, 1600)));
    await tester.pumpAndSettle();

    final Parada objetivo = repo.ruta.paradas.firstWhere((Parada p) => !p.cerrada);
    await tester.tap(find.text(objetivo.cliente.nombre));
    await tester.pumpAndSettle();

    // Se entrega producto (el pedido esperado ya viene precargado) pero no se
    // teclea ningún monto: el valor entregado queda sin justificar.
    final Finder botonRegistrar = find.widgetWithText(FilledButton, 'Registrar cobro');
    expect(tester.widget<FilledButton>(botonRegistrar).onPressed, isNull);

    expect(repo.ruta.atendidas, 0);
  });

  testWidgets('omitir con motivo cierra la parada sin mover la parrilla',
      (WidgetTester tester) async {
    final RutaRepository repo = RutaRepository(rutaDelDia(variante: 0));
    await _fijarTamano(tester, const Size(390, 1600));
    addTearDown(tester.view.reset);

    await tester.pumpWidget(_app(RutaView(repo: repo), tam: const Size(390, 1600)));
    await tester.pumpAndSettle();

    final int vendidosAntes = repo.ruta.bodega.bultosVendidos;
    final Parada objetivo = repo.ruta.paradas.firstWhere((Parada p) => !p.cerrada);
    await tester.tap(find.text(objetivo.cliente.nombre));
    await tester.pumpAndSettle();

    await tester.tap(find.widgetWithText(OutlinedButton, 'No se vendió'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Local cerrado'));
    await tester.pumpAndSettle();

    final Parada actualizada = repo.ruta.porId(objetivo.id)!;
    expect(actualizada.estado, EstadoVisita.omitida);
    expect(actualizada.motivo, MotivoOmision.cerrado);
    expect(repo.ruta.bodega.bultosVendidos, vendidosAntes);
  });

  testWidgets('sin desbordes a 320 px de ancho', (WidgetTester tester) async {
    final RutaRepository repo = RutaRepository(rutaDelDia(variante: 0));
    await _fijarTamano(tester, const Size(320, 1600));
    addTearDown(tester.view.reset);

    await tester.pumpWidget(_app(RutaView(repo: repo), tam: const Size(320, 1600)));
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
  });

  testWidgets('sin desbordes a 1440 px de ancho', (WidgetTester tester) async {
    final RutaRepository repo = RutaRepository(rutaDelDia(variante: 0));
    await _fijarTamano(tester, const Size(1440, 900));
    addTearDown(tester.view.reset);

    await tester.pumpWidget(_app(RutaView(repo: repo), tam: const Size(1440, 900)));
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
  });

  testWidgets(
      'en escritorio registrar desde la hoja incrustada no desmonta la ruta',
      (WidgetTester tester) async {
    // Regresión: la hoja cerraba con `Navigator.pop`, que en teléfono cerraba
    // la hoja modal y en escritorio —donde está incrustada en la columna
    // derecha— sacaba de la pila la pantalla entera de la ruta.
    final RutaRepository repo = RutaRepository(rutaDelDia(variante: 0));
    await _fijarTamano(tester, const Size(1440, 1000));
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      _app(RutaView(repo: repo), tam: const Size(1440, 1000)),
    );
    await tester.pumpAndSettle();

    final Parada objetivo =
        repo.ruta.paradas.firstWhere((Parada p) => !p.cerrada);
    await tester.tap(find.text(objetivo.cliente.nombre).first);
    await tester.pumpAndSettle();

    final Bodega bodega = repo.ruta.bodega;
    final int valorTotal = objetivo.pedidoEsperado.entries.fold(
      0,
      (int a, MapEntry<String, int> e) =>
          a + bodega.producto(e.key).precio.centavos * e.value,
    );
    await tester.enterText(
      find.widgetWithText(TextField, 'Efectivo'),
      (valorTotal / 100).toStringAsFixed(2),
    );
    await tester.pumpAndSettle();

    final Finder boton = find.widgetWithText(FilledButton, 'Registrar cobro');
    expect(tester.widget<FilledButton>(boton).onPressed, isNotNull);
    await tester.ensureVisible(boton);
    await tester.pumpAndSettle();
    await tester.tap(boton);
    await tester.pumpAndSettle();

    expect(repo.ruta.atendidas, 1);
    expect(find.byType(RutaView), findsOneWidget,
        reason: 'la pantalla de la ruta tiene que seguir en pie');
    expect(tester.takeException(), isNull);
  });
}
