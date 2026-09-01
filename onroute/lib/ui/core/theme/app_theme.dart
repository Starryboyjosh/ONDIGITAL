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

  static ThemeData _build(OnRouteColors c) {
    final ColorScheme scheme =
        (c.isDark ? const ColorScheme.dark() : const ColorScheme.light())
            .copyWith(
      brightness: c.isDark ? Brightness.dark : Brightness.light,
      primary: c.brass,
      onPrimary: c.onBrass,
      secondary: c.violet,
      onSecondary: c.onViolet,
      error: c.danger,
      onError: c.isDark ? const Color(0xFF12201A) : Colors.white,
      surface: c.surface,
      onSurface: c.ink,
      outline: c.border,
      outlineVariant: c.borderStrong,
    );

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
        dragHandleColor: c.borderStrong,
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
