/// Paleta de OnRoute, derivada de la paleta oficial ONDIGITAL "Pulso Vital"
/// (ver `AGENTS.md` y `skills/design/design-systems/DESIGN.md` §0).
///
/// OnRoute no inventa colores de marca: hereda verdigris, pergamino, latón y
/// violeta. Lo que sí define es **dos temas que responden a dos escenas
/// físicas distintas**, no a una preferencia:
///
/// - **Calle** (claro) — el vendedor, a las 11 a.m., bajo sol directo de
///   San Pedro Sula, el teléfono al brillo máximo y una mano ocupada. Pide
///   contraste alto y superficies francas, no sutilezas.
/// - **Torre** (oscuro) — el dueño o despachador, frente a una pantalla grande,
///   viendo la flota moverse sobre el mapa. Aquí el fondo se retira para que el
///   mapa y el estado de los camiones sean lo único que brilla.
///
/// Todos los pares texto/fondo de este archivo fueron verificados contra WCAG
/// AA (≥ 4.5:1). Los valores de contraste están anotados en cada constante.
library;

import 'package:flutter/material.dart';

/// Tokens de color de OnRoute, expuestos como `ThemeExtension` para que los
/// widgets los lean con `Theme.of(context).extension<OnRouteColors>()!` —o con
/// el atajo `context.colors` de `app_theme.dart`— en vez de importar constantes
/// sueltas. Así un widget nunca sabe en qué tema está.
@immutable
class OnRouteColors extends ThemeExtension<OnRouteColors> {
  const OnRouteColors({
    required this.bg,
    required this.bgSunk,
    required this.surface,
    required this.surfaceAlt,
    required this.border,
    required this.borderStrong,
    required this.ink,
    required this.ink2,
    required this.ink3,
    required this.brass,
    required this.brassDeep,
    required this.brassSoft,
    required this.violet,
    required this.violetSoft,
    required this.collected,
    required this.collectedSoft,
    required this.pending,
    required this.pendingSoft,
    required this.danger,
    required this.dangerSoft,
    required this.onBrass,
    required this.onViolet,
    required this.glassFill,
    required this.glassStroke,
    required this.glassShadow,
    required this.mapWash,
    required this.mapInk,
    required this.isDark,
  });

  // ── Superficies ────────────────────────────────────────────────────────
  /// Fondo de página.
  final Color bg;

  /// Fondo hundido: rieles, canaletas, el fondo de una barra de progreso.
  final Color bgSunk;

  /// Superficie elevada principal: tarjetas, paneles, hojas.
  final Color surface;

  /// Superficie alterna: cabeceras de tabla, filas alternas, zonas inertes.
  final Color surfaceAlt;

  final Color border;
  final Color borderStrong;

  // ── Tinta ──────────────────────────────────────────────────────────────
  /// Texto principal.
  final Color ink;

  /// Texto secundario: descripciones, metadatos con peso.
  final Color ink2;

  /// Texto terciario: etiquetas, marcas de tiempo. Sigue pasando AA.
  final Color ink3;

  // ── Marca ──────────────────────────────────────────────────────────────
  /// Latón. En OnRoute significa **valor**: dinero, monto, carga con precio.
  final Color brass;
  final Color brassDeep;

  /// Relleno tenue de latón para pastillas y estados de fondo.
  ///
  /// Los rellenos `*Soft` son **opacos a propósito**, no alfa. En tema oscuro un
  /// tinte alfa del propio tono aclara el fondo y le come el contraste a su
  /// texto: `danger` sobre `danger` al 14 % de alfa cae a 3.98:1. Compuestos
  /// contra `bgSunk` y congelados como color macizo, el peor par del sistema
  /// queda en 4.94:1.
  final Color brassSoft;

  /// Violeta. En OnRoute significa **lo activo ahora**: la parada siguiente, el
  /// camión seleccionado, Vito hablando. Nunca decorativo.
  final Color violet;
  final Color violetSoft;

  // ── Estado operativo ───────────────────────────────────────────────────
  /// Cobrado / entregado / cerrado en verde.
  final Color collected;
  final Color collectedSoft;

  /// Pendiente o con novedad: local cerrado, cliente ausente, reagendado.
  final Color pending;
  final Color pendingSoft;

  /// Descuadre, mora, falla. El color que obliga a mirar.
  final Color danger;
  final Color dangerSoft;

  /// Texto sobre relleno macizo de latón / violeta.
  final Color onBrass;
  final Color onViolet;

  // ── Cristal ────────────────────────────────────────────────────────────
  /// Relleno del panel de cristal. **Solo se usa cuando hay contenido vivo
  /// detrás** (el mapa en movimiento). Sobre fondo plano, el cristal es
  /// decoración y no se usa: ver `GlassPanel`.
  ///
  /// La opacidad no se eligió por gusto sino por el peor tile posible. Los
  /// tiles de OSM son claros; un velo tenue deja el pergamino de `torre` en
  /// 1.89:1 sobre una calle blanca. Al 75 % el peor caso sube a 7.30:1 y el
  /// mapa se sigue viendo moverse por debajo.
  ///
  /// De ahí sale la regla del cristal: **sobre cristal solo van [ink] e
  /// [ink2]** (AA en el peor tile). Los colores de estado dentro de un panel de
  /// cristal van sobre relleno opaco `*Soft` —una pastilla—, nunca como texto
  /// suelto; `danger` sobre cristal cae a 2.44:1.
  final Color glassFill;
  final Color glassStroke;
  final Color glassShadow;

  /// Velo sobre los tiles del mapa, para que el mapa sea contexto y los datos
  /// encima sean el contenido.
  final Color mapWash;

  /// Tinta que se dibuja **sobre los tiles**: hoy, el filete de las rutas.
  ///
  /// Es el único color de la paleta que vale lo mismo en los dos registros, y
  /// no por descuido: los tiles de OpenStreetMap son los mismos claros vengan
  /// del tema que vengan —el tema tiñe la app, no el mapa—, así que una tinta
  /// que siguiera al tema quedaría casi blanca sobre una calle blanca en el
  /// registro de calle. Contra el peor tile realista ya lavado por [mapWash]
  /// queda en 5.60:1 en torre y 11.45:1 en calle.
  ///
  /// Es lo que hace visible una ruta que no está seleccionada: el latón solo,
  /// y encima al 55 % de alfa, caía a 1.01:1 sobre una calle blanca.
  final Color mapInk;

  final bool isDark;

  // ── Tema Calle (claro) ─────────────────────────────────────────────────
  /// Verdigris llevado al extremo claro: un neutro tintado hacia el verde de
  /// la marca, no un gris genérico ni un crema.
  static const OnRouteColors calle = OnRouteColors(
    bg: Color(0xFFF4F7F3),
    bgSunk: Color(0xFFE8EDE7),
    surface: Color(0xFFFFFFFF),
    surfaceAlt: Color(0xFFFAFCFA),
    border: Color(0xFFDDE4DC),
    borderStrong: Color(0xFFC2CCC1),
    ink: Color(0xFF0F1A15), //  16.49:1 sobre bg · 17.81:1 sobre surface
    ink2: Color(0xFF4A5751), //  7.01:1 sobre bg ·  7.57:1 sobre surface
    ink3: Color(0xFF626F69), //  4.86:1 sobre bg ·  5.25:1 sobre surface
    brass: Color(0xFF8C6A2A), //  4.62:1 sobre bg ·  4.99:1 sobre surface
    brassDeep: Color(0xFF6B4E1E),
    brassSoft: Color(0xFFFAF5EA), //  4.59:1 con brass encima
    violet: Color(0xFF6C35ED), //  5.77:1 sobre bg ·  6.23:1 sobre surface
    violetSoft: Color(0xFFEDE6FE), //  5.15:1 con violet encima
    collected: Color(0xFF0D7A57), //  4.94:1 sobre bg ·  5.33:1 sobre surface
    collectedSoft: Color(0xFFE0F3EB), //  4.62:1 con collected encima
    pending: Color(0xFF9A5B08), //  5.02:1 sobre bg ·  5.42:1 sobre surface
    pendingSoft: Color(0xFFFBEFDD), //  4.77:1 con pending encima
    danger: Color(0xFFC0392F), //  5.03:1 sobre bg ·  5.43:1 sobre surface
    dangerSoft: Color(0xFFFBE9E7), //  4.63:1 con danger encima
    onBrass: Color(0xFFFFFFFF),
    onViolet: Color(0xFFFFFFFF),
    glassFill: Color(0xCCFFFFFF), // ink 11.09:1 · ink2 4.72:1 en el peor tile
    glassStroke: Color(0x1F0F1A15),
    glassShadow: Color(0x2E0F1A15),
    mapWash: Color(0x0A0F1A15),
    mapInk: Color(0xFF0B1410), // 11.45:1 contra el peor tile realista
    isDark: false,
  );

  // ── Tema Torre (oscuro) ────────────────────────────────────────────────
  /// Verdigris ink y pergamino tal como los define la marca.
  static const OnRouteColors torre = OnRouteColors(
    bg: Color(0xFF0B1410),
    bgSunk: Color(0xFF070E0B),
    surface: Color(0xFF16241E),
    surfaceAlt: Color(0xFF1C2E26),
    border: Color(0xFF2A3A33),
    borderStrong: Color(0xFF3A4C44),
    ink: Color(0xFFF2EFE4), // 16.26:1 sobre bg · 13.98:1 sobre surface
    ink2: Color(0xFFB9C4BC), // 10.42:1 sobre bg ·  8.95:1 sobre surface
    ink3: Color(0xFF9DAAA2), //  7.76:1 sobre bg ·  6.67:1 sobre surface
    brass: Color(0xFFD8A24A), //  8.19:1 sobre bg ·  7.04:1 sobre surface
    brassDeep: Color(0xFFB8862F),
    // Rellenos opacos = tono al 14 % compuesto sobre bgSunk. Ver `brassSoft`.
    brassSoft: Color(0xFF252314), //  6.91:1 con brass encima
    violet: Color(0xFF9B8CFF), //  6.77:1 sobre bg ·  5.81:1 sobre surface
    violetSoft: Color(0xFF1C202D), //  5.87:1 con violet encima
    collected: Color(0xFF3FD9A0), // 10.38:1 sobre bg ·  8.92:1 sobre surface
    collectedSoft: Color(0xFF0F2B20), //  8.40:1 con collected encima
    pending: Color(0xFFE0A83D), //  8.77:1 sobre bg ·  7.54:1 sobre surface
    pendingSoft: Color(0xFF262412), //  7.32:1 con pending encima
    danger: Color(0xFFE85D4E), //  5.44:1 sobre bg ·  4.68:1 sobre surface
    dangerSoft: Color(0xFF271914), //  4.94:1 con danger encima
    onBrass: Color(0xFF12201A),
    onViolet: Color(0xFF12201A),
    glassFill: Color(0xBF0B1410), // ink 7.30:1 · ink2 4.68:1 en el peor tile
    glassStroke: Color(0x26F2EFE4),
    glassShadow: Color(0x66000000),
    mapWash: Color(0x59070E0B),
    mapInk: Color(0xFF0B1410), //  5.60:1 contra el peor tile realista
    isDark: true,
  );

  @override
  OnRouteColors copyWith({
    Color? bg,
    Color? bgSunk,
    Color? surface,
    Color? surfaceAlt,
    Color? border,
    Color? borderStrong,
    Color? ink,
    Color? ink2,
    Color? ink3,
    Color? brass,
    Color? brassDeep,
    Color? brassSoft,
    Color? violet,
    Color? violetSoft,
    Color? collected,
    Color? collectedSoft,
    Color? pending,
    Color? pendingSoft,
    Color? danger,
    Color? dangerSoft,
    Color? onBrass,
    Color? onViolet,
    Color? glassFill,
    Color? glassStroke,
    Color? glassShadow,
    Color? mapWash,
    Color? mapInk,
    bool? isDark,
  }) {
    return OnRouteColors(
      bg: bg ?? this.bg,
      bgSunk: bgSunk ?? this.bgSunk,
      surface: surface ?? this.surface,
      surfaceAlt: surfaceAlt ?? this.surfaceAlt,
      border: border ?? this.border,
      borderStrong: borderStrong ?? this.borderStrong,
      ink: ink ?? this.ink,
      ink2: ink2 ?? this.ink2,
      ink3: ink3 ?? this.ink3,
      brass: brass ?? this.brass,
      brassDeep: brassDeep ?? this.brassDeep,
      brassSoft: brassSoft ?? this.brassSoft,
      violet: violet ?? this.violet,
      violetSoft: violetSoft ?? this.violetSoft,
      collected: collected ?? this.collected,
      collectedSoft: collectedSoft ?? this.collectedSoft,
      pending: pending ?? this.pending,
      pendingSoft: pendingSoft ?? this.pendingSoft,
      danger: danger ?? this.danger,
      dangerSoft: dangerSoft ?? this.dangerSoft,
      onBrass: onBrass ?? this.onBrass,
      onViolet: onViolet ?? this.onViolet,
      glassFill: glassFill ?? this.glassFill,
      glassStroke: glassStroke ?? this.glassStroke,
      glassShadow: glassShadow ?? this.glassShadow,
      mapWash: mapWash ?? this.mapWash,
      mapInk: mapInk ?? this.mapInk,
      isDark: isDark ?? this.isDark,
    );
  }

  @override
  OnRouteColors lerp(ThemeExtension<OnRouteColors>? other, double t) {
    if (other is! OnRouteColors) return this;
    Color c(Color a, Color b) => Color.lerp(a, b, t)!;
    return OnRouteColors(
      bg: c(bg, other.bg),
      bgSunk: c(bgSunk, other.bgSunk),
      surface: c(surface, other.surface),
      surfaceAlt: c(surfaceAlt, other.surfaceAlt),
      border: c(border, other.border),
      borderStrong: c(borderStrong, other.borderStrong),
      ink: c(ink, other.ink),
      ink2: c(ink2, other.ink2),
      ink3: c(ink3, other.ink3),
      brass: c(brass, other.brass),
      brassDeep: c(brassDeep, other.brassDeep),
      brassSoft: c(brassSoft, other.brassSoft),
      violet: c(violet, other.violet),
      violetSoft: c(violetSoft, other.violetSoft),
      collected: c(collected, other.collected),
      collectedSoft: c(collectedSoft, other.collectedSoft),
      pending: c(pending, other.pending),
      pendingSoft: c(pendingSoft, other.pendingSoft),
      danger: c(danger, other.danger),
      dangerSoft: c(dangerSoft, other.dangerSoft),
      onBrass: c(onBrass, other.onBrass),
      onViolet: c(onViolet, other.onViolet),
      glassFill: c(glassFill, other.glassFill),
      glassStroke: c(glassStroke, other.glassStroke),
      glassShadow: c(glassShadow, other.glassShadow),
      mapWash: c(mapWash, other.mapWash),
      mapInk: c(mapInk, other.mapInk),
      isDark: t < 0.5 ? isDark : other.isDark,
    );
  }
}
