/// Pastilla de estado.
///
/// En una app de ruta el estado se escanea de reojo, con el teléfono a medio
/// brazo: por eso la pastilla codifica el estado en **dos canales a la vez**,
/// color y palabra. Nunca solo color — daltonismo aparte, bajo el sol un verde
/// y un ámbar tenues se parecen demasiado.
///
/// El relleno siempre es opaco (`*Soft` de la paleta), incluso dentro de un
/// panel de cristal: es lo que le devuelve el contraste al texto de color.
library;

import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import '../theme/palette.dart';
import '../theme/tokens.dart';
import '../theme/typography.dart';

/// Los estados que OnRoute sabe pintar. Son de negocio, no de color: quien los
/// usa dice "cobrado", no "verde".
enum Tono {
  /// Cobrado, entregado, cuadrado. Lo que ya salió bien.
  cobrado,

  /// Pendiente o con novedad: local cerrado, cliente ausente, reagendado.
  pendiente,

  /// Descuadre, mora, falla. Obliga a mirar.
  alerta,

  /// Lo que está pasando ahora: la parada siguiente, el camión seleccionado,
  /// Vito hablando.
  activo,

  /// Valor: monto, carga con precio.
  valor,

  /// Sin carga semántica. Metadatos, conteos, etiquetas inertes.
  neutro;

  ({Color texto, Color relleno}) resolver(OnRouteColors c) => switch (this) {
        Tono.cobrado => (texto: c.collected, relleno: c.collectedSoft),
        Tono.pendiente => (texto: c.pending, relleno: c.pendingSoft),
        Tono.alerta => (texto: c.danger, relleno: c.dangerSoft),
        Tono.activo => (texto: c.violet, relleno: c.violetSoft),
        Tono.valor => (texto: c.brass, relleno: c.brassSoft),
        Tono.neutro => (texto: c.ink2, relleno: c.surfaceAlt),
      };
}

class StatusPill extends StatelessWidget {
  const StatusPill({
    super.key,
    required this.label,
    required this.tono,
    this.icono,
    this.densa = false,
  });

  final String label;
  final Tono tono;

  /// Refuerzo opcional. La palabra ya lleva el significado; el icono solo
  /// acelera el reconocimiento.
  final IconData? icono;

  /// Versión compacta, para pastillas dentro de filas de lista densas.
  final bool densa;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final ({Color texto, Color relleno}) t = tono.resolver(c);
    final bool bordeada = tono == Tono.neutro;

    return DecoratedBox(
      decoration: BoxDecoration(
        color: t.relleno,
        borderRadius: Radii.pill,
        border: bordeada ? Border.all(color: c.border) : null,
      ),
      child: Padding(
        padding: EdgeInsets.symmetric(
          horizontal: densa ? Space.sm : Space.md,
          vertical: densa ? 3 : Space.xs + 1,
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            if (icono != null) ...<Widget>[
              Icon(icono, size: densa ? 12 : 14, color: t.texto),
              SizedBox(width: densa ? Space.xs : Space.xs + 2),
            ],
            Text(
              label,
              style: AppText.labelSm.copyWith(color: t.texto),
            ),
          ],
        ),
      ),
    );
  }
}
