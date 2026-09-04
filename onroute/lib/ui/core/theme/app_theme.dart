/// Ensamblado del tema de OnRoute.
///
/// Dos temas, y la diferencia entre ellos no es una preferencia sino una
/// respuesta a dos escenas reales (ver `palette.dart`):
///
/// - `AppTheme.calle` — el vendedor en la calle, bajo sol.
/// - `AppTheme.torre` — el dueño frente al mapa de la flota.
library;

// `CupertinoPageTransitionsBuilder` vive en cupertino, no en material.
import 'package:flutter/cupertino.dart' show CupertinoPageTransitionsBuilder;
import 'package:flutter/material.dart';

import 'palette.dart';
import 'tokens.dart';
import 'typography.dart';

/// Atajo para leer los tokens de OnRoute desde cualquier widget.
extension OnRouteThemeContext on BuildContext {
  /// Colores de OnRoute del tema activo.
  OnRouteColors get colors => Theme.of(this).extension<OnRouteColors>()!;

  /// `true` cuando el ancho disponible es de teléfono.
  bool get isCompact =>
      Breakpoints.isCompact(MediaQuery.sizeOf(this).width);

  /// `true` cuando hay espacio para el registro "torre" (mapa + paneles).
  bool get isExpanded =>
      Breakpoints.isExpanded(MediaQuery.sizeOf(this).width);

  /// El sistema pidió reducir movimiento. Toda animación de OnRoute lo consulta:
  /// el estado final siempre se muestra, lo que se quita es el recorrido.
  bool get reduceMotion => MediaQuery.maybeDisableAnimationsOf(this) ?? false;
}

abstract final class AppTheme {
  /// Tema del vendedor: claro, contraste alto, targets grandes.
  static ThemeData get calle => _build(OnRouteColors.calle);

  /// Tema de la torre de control: oscuro, el mapa manda.
  static ThemeData get torre => _build(OnRouteColors.torre);

  /// El `ColorScheme` de OnRoute, con **todos** los papeles escritos a mano.
  ///
  /// No se parte de `ColorScheme.light()`/`dark()` ni se les hace `copyWith`.
  /// Esos dos constructores son la línea base de **Material 2** y traen morado
  /// `#6200EE` / lila `#BB86FC` en `primary` y menta `#03DAC6` en `secondary`;
  /// los papeles que no se escriben no quedan vacíos, se resuelven contra esos
  /// valores —`secondaryContainer` cae en `secondary`, `tertiary` también— y
  /// `copyWith` los **congela** ya resueltos, así que sobreescribir `primary` y
  /// `secondary` no los limpia.
  ///
  /// Eso no era teórico: `IconButton.filledTonal` pinta con
  /// `secondaryContainer`/`onSecondaryContainer`, y los botones `+` / `−` de la
  /// hoja de cobro y del conteo de la parrilla salían en menta de Material 2
  /// sobre negro. El indicador de la barra de navegación, en los dos registros,
  /// también.
  static ColorScheme _esquema(OnRouteColors c) => ColorScheme(
        brightness: c.isDark ? Brightness.dark : Brightness.light,

        // Latón = valor. Es el color de marca que encabeza.
        primary: c.brass,
        onPrimary: c.onBrass,
        primaryContainer: c.brassSoft,
        onPrimaryContainer: c.brass,

        // Violeta = lo activo ahora. De aquí come el indicador de navegación y
        // el relleno de los botones tonales.
        secondary: c.violet,
        onSecondary: c.onViolet,
        secondaryContainer: c.violetSoft,
        onSecondaryContainer: c.violet,

        // No hay un tercer color de marca: el papel terciario lo toma el verde
        // de "cobrado", que es el único acento que le queda al sistema.
        tertiary: c.collected,
        onTertiary: c.onBrass,
        tertiaryContainer: c.collectedSoft,
        onTertiaryContainer: c.collected,

        error: c.danger,
        onError: c.onBrass,
        errorContainer: c.dangerSoft,
        onErrorContainer: c.danger,

        surface: c.surface,
        onSurface: c.ink,
        onSurfaceVariant: c.ink2,

        // Los seis contenedores de superficie de M3 van de "más hundido" a
        // "más elevado", y esa escala se invierte entre los dos registros:
        // en calle elevarse es aclararse, en torre es lo contrario.
        surfaceDim: c.bgSunk,
        surfaceBright: c.isDark ? c.surfaceAlt : c.surface,
        surfaceContainerLowest: c.isDark ? c.bgSunk : c.surface,
        surfaceContainerLow: c.isDark ? c.surface : c.surfaceAlt,
        surfaceContainer: c.isDark ? c.surface : c.bg,
        surfaceContainerHigh: c.isDark ? c.surfaceAlt : c.bgSunk,
        surfaceContainerHighest: c.isDark ? c.surfaceAlt : c.bgSunk,

        outline: c.border,
        outlineVariant: c.borderStrong,

        shadow: const Color(0xFF000000),
        scrim: const Color(0xFF000000),

        inverseSurface: c.ink,
        onInverseSurface: c.bg,
        inversePrimary: c.brassDeep,

        // Sin tinte de elevación. M3 mezcla `surfaceTint` dentro de cada
        // superficie elevada, y ese tinte teñiría de latón las tarjetas y las
        // hojas: acá la elevación se cuenta con borde y sombra, no con color.
        surfaceTint: Colors.transparent,
      );

  static ThemeData _build(OnRouteColors c) {
    final ColorScheme scheme = _esquema(c);

    final TextTheme text = AppText.themeFor(c.ink, c.ink2);

    return ThemeData(
      useMaterial3: true,
      brightness: scheme.brightness,
      colorScheme: scheme,
      scaffoldBackgroundColor: c.bg,
      canvasColor: c.bg,
      textTheme: text,
      fontFamily: Fonts.body,
      extensions: <ThemeExtension<dynamic>>[c],
      splashFactory: InkSparkle.splashFactory,
      visualDensity: VisualDensity.standard,

      // El vendedor toca con el pulgar en movimiento: el área táctil nunca baja
      // de 48, aunque el control se dibuje más pequeño.
      materialTapTargetSize: MaterialTapTargetSize.padded,

      dividerTheme: DividerThemeData(
        color: c.border,
        thickness: 1,
        space: 1,
      ),

      cardTheme: CardThemeData(
        color: c.surface,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: Radii.allLg,
          side: BorderSide(color: c.border),
        ),
      ),

      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: c.ink,
          foregroundColor: c.bg,
          minimumSize: const Size(0, Touch.comfortable),
          padding: const EdgeInsets.symmetric(horizontal: Space.xl),
          textStyle: AppText.label,
          shape: const RoundedRectangleBorder(borderRadius: Radii.allMd),
        ),
      ),

      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: c.ink,
          minimumSize: const Size(0, Touch.comfortable),
          padding: const EdgeInsets.symmetric(horizontal: Space.xl),
          textStyle: AppText.label,
          side: BorderSide(color: c.borderStrong),
          shape: const RoundedRectangleBorder(borderRadius: Radii.allMd),
        ),
      ),

      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: c.violet,
          minimumSize: const Size(0, Touch.min),
          textStyle: AppText.label,
          shape: const RoundedRectangleBorder(borderRadius: Radii.allSm),
        ),
      ),

      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: c.isDark ? c.bgSunk : c.surfaceAlt,
        hintStyle: AppText.body.copyWith(color: c.ink3),
        labelStyle: AppText.label.copyWith(color: c.ink2),

        // El prefijo es parte de la cifra, no una etiqueta aparte. Sin esta
        // línea `InputDecorator` lo dibuja con `hintStyle`, y la `L ` de los
        // campos de dinero salía en Inter a 15 px en tinta terciaria pegada a
        // dígitos en JetBrains Mono a 13 px en tinta principal: dos tipos de
        // letra, dos tamaños y dos colores dentro del mismo monto. Vale igual
        // para el `+504 ` del teléfono en el registro de conductores.
        prefixStyle: AppText.data.copyWith(color: c.ink),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: Space.lg,
          vertical: Space.md,
        ),
        border: OutlineInputBorder(
          borderRadius: Radii.allMd,
          borderSide: BorderSide(color: c.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: Radii.allMd,
          borderSide: BorderSide(color: c.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: Radii.allMd,
          borderSide: BorderSide(color: c.violet, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: Radii.allMd,
          borderSide: BorderSide(color: c.danger),
        ),
      ),

      bottomSheetTheme: BottomSheetThemeData(
        backgroundColor: c.surface,
        surfaceTintColor: Colors.transparent,
        shape: const RoundedRectangleBorder(borderRadius: Radii.topSheet),
        showDragHandle: true,
        // `ink3` y no `borderStrong`: el asa es el control con el que se
        // arrastra la hoja, así que le aplica el piso de 3:1 de los elementos
        // de interfaz, y `borderStrong` sobre la superficie de la hoja daba
        // 1.62:1. Antes no se notaba porque las hojas se pedían transparentes
        // y el asa flotaba sobre el velo; ahora se apoya en la hoja.
        dragHandleColor: c.ink3,
      ),

      snackBarTheme: SnackBarThemeData(
        backgroundColor: c.isDark ? c.surfaceAlt : c.ink,
        contentTextStyle: AppText.bodySm.copyWith(
          color: c.isDark ? c.ink : c.bg,
        ),
        behavior: SnackBarBehavior.floating,
        shape: const RoundedRectangleBorder(borderRadius: Radii.allMd),
      ),

      tooltipTheme: TooltipThemeData(
        decoration: BoxDecoration(
          color: c.isDark ? c.surfaceAlt : c.ink,
          borderRadius: Radii.allSm,
        ),
        textStyle: AppText.dataSm.copyWith(color: c.isDark ? c.ink : c.bg),
      ),

      progressIndicatorTheme: ProgressIndicatorThemeData(
        color: c.violet,
        linearTrackColor: c.bgSunk,
        circularTrackColor: c.bgSunk,
      ),

      pageTransitionsTheme: const PageTransitionsTheme(
        builders: <TargetPlatform, PageTransitionsBuilder>{
          TargetPlatform.android: FadeForwardsPageTransitionsBuilder(),
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
          TargetPlatform.linux: FadeForwardsPageTransitionsBuilder(),
          TargetPlatform.macOS: CupertinoPageTransitionsBuilder(),
          TargetPlatform.windows: FadeForwardsPageTransitionsBuilder(),
        },
      ),
    );
  }
}
