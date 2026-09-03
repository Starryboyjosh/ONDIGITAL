/// La Bodega Rodante promete que el dibujo **es** los números. Estas pruebas
/// existen para que esa promesa no se pueda romper en silencio: si alguien
/// desconecta la parrilla del repositorio, o el total deja de ser la suma de
/// las casillas, algo acá falla.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:onroute/data/repositories/ruta_repository.dart';
import 'package:onroute/data/semilla/semilla_san_pedro_sula.dart';
import 'package:onroute/domain/models/bodega.dart';
import 'package:onroute/ui/core/format/formatos.dart';
import 'package:onroute/ui/core/theme/app_theme.dart';
import 'package:onroute/ui/features/bodega/views/bodega_view.dart';
import 'package:onroute/ui/features/bodega/widgets/casilla_tile.dart';
import 'package:onroute/ui/features/bodega/widgets/parrilla.dart';

Widget _app(Widget hijo, {Size tam = const Size(390, 844)}) => MediaQuery(
      data: MediaQueryData(size: tam),
      child: MaterialApp(theme: AppTheme.calle, home: hijo),
    );

void main() {
  testWidgets('la parrilla dibuja una casilla por posición cargada',
      (WidgetTester tester) async {
    final RutaRepository repo = RutaRepository(rutaDelDia(variante: 1));
    tester.view.physicalSize = const Size(390, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(_app(BodegaView(repo: repo)));
    await tester.pumpAndSettle();

    expect(
      find.byType(CasillaTile),
      findsNWidgets(repo.ruta.bodega.casillas.length),
    );
  });

  testWidgets('el total de arriba es la suma de lo que se ve abajo',
      (WidgetTester tester) async {
    final RutaRepository repo = RutaRepository(rutaDelDia(variante: 1));
    tester.view.physicalSize = const Size(390, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(_app(BodegaView(repo: repo)));
    await tester.pumpAndSettle();

    final Bodega b = repo.ruta.bodega;
    expect(
      find.text(Formatos.lempiras(b.valorEnCamion.enLempiras)),
      findsOneWidget,
    );
    expect(
      find.textContaining(
        '${b.bultosEnCamion} de ${b.bultosSalida} bultos',
      ),
      findsOneWidget,
    );
  });

  testWidgets('contar una casilla corta la marca y mueve el resumen',
      (WidgetTester tester) async {
    final RutaRepository repo = RutaRepository(rutaDelDia(variante: 1));
    tester.view.physicalSize = const Size(390, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(_app(BodegaView(repo: repo)));
    await tester.pumpAndSettle();

    // Se cuenta toda la parrilla salvo una casilla, a la que se le declara un
    // bulto de menos: es el caso real que el producto tiene que atrapar.
    final Casilla objetivo =
        repo.ruta.bodega.casillas.firstWhere((Casilla c) => c.enCamion > 0);
    repo.aceptarConteoTeorico();
    repo.contarCasilla(
      casillaId: objetivo.id,
      contado: objetivo.enCamion - 1,
    );
    await tester.pumpAndSettle();

    expect(find.text('Parrilla contada completa'), findsOneWidget);
    expect(find.textContaining('1 bultos sin aparecer'), findsOneWidget);
    // La casilla culpable queda señalada en su propia posición.
    expect(find.text('-1'), findsOneWidget);
  });

  testWidgets('en escritorio el resumen acompaña a la parrilla',
      (WidgetTester tester) async {
    final RutaRepository repo = RutaRepository(rutaDelDia(variante: 1));
    tester.view.physicalSize = const Size(1440, 900);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      _app(BodegaView(repo: repo), tam: const Size(1440, 900)),
    );
    await tester.pumpAndSettle();

    expect(find.byType(Parrilla), findsOneWidget);
    expect(find.byType(Row), findsWidgets);
    expect(tester.takeException(), isNull);
  });

  testWidgets('no hay desbordes en el teléfono más angosto',
      (WidgetTester tester) async {
    final RutaRepository repo = RutaRepository(rutaDelDia(variante: 1));
    tester.view.physicalSize = const Size(320, 1400);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      _app(BodegaView(repo: repo), tam: const Size(320, 1400)),
    );
    await tester.pumpAndSettle();

    expect(tester.takeException(), isNull);
  });
}
