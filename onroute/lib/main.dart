/// OnRoute — app de autoventa para vendedores de ruta en Honduras.
///
/// Una sola app para dos registros: la **calle** (el vendedor con el teléfono
/// en la mano, junto al camión) y la **torre** (quien mira la flota desde la
/// oficina). No son dos productos: son la misma jornada vista desde dos
/// distancias, y por eso comparten repositorio, tipografía y paleta.
///
/// El armazón vive en `ui/app_shell.dart`; acá solo queda el arranque.
library;

import 'package:flutter/material.dart';

import 'ui/app_shell.dart';
import 'ui/core/theme/app_theme.dart';

void main() => runApp(const OnRouteApp());

class OnRouteApp extends StatelessWidget {
  const OnRouteApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'OnRoute',
      debugShowCheckedModeBanner: false,
      // El tema real lo elige `AppShell` según el ancho; estos dos quedan
      // declarados para que cualquier diálogo del sistema no salga con el
      // Material por defecto.
      theme: AppTheme.calle,
      darkTheme: AppTheme.torre,
      home: const AppShell(),
    );
  }
}
