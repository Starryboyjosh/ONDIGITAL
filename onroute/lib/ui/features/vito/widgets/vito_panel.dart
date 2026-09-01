/// El panel donde Vito habla.
///
/// Renderiza una lista de [Hallazgo] ya redactados por `vito_voz.dart`. Este
/// widget no calcula ni redacta nada: solo dispone texto y color. La marca
/// visual de severidad es un punto de color junto al titular, nunca un
/// borde lateral —esa convención queda reservada para estados de selección
/// en otras partes de la app— y nunca un degradado sobre el texto.
library;

import 'package:flutter/material.dart';

import '../../../../domain/logic/vito_analista.dart';
import '../../../../domain/models/producto.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/widgets/panel.dart';
import '../vito_voz.dart';

/// Panel de hallazgos de Vito.
///
/// [hallazgos] llega ya ordenado por severidad (lo hace
/// `analizarLiquidacion`/`analizarRutaEnCurso`); este widget no reordena.
class VitoPanel extends StatelessWidget {
  const VitoPanel({
    super.key,
    required this.hallazgos,
    required this.encabezado,
    this.catalogo = const <String, Producto>{},
  });

  final List<Hallazgo> hallazgos;
  final String encabezado;

  /// Catálogo del día, para que Vito diga "harina Maseca" y no "HAR-50".
  /// Vacío es válido: el hallazgo cae de vuelta al SKU.
  final Map<String, Producto> catalogo;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;

    return Panel(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Text(
            encabezado,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: c.ink,
                  fontWeight: FontWeight.w600,
                ),
          ),
          const SizedBox(height: Space.md),
          if (hallazgos.isEmpty)
            Text(
              'Sin novedades por ahora.',
              style: Theme.of(context)
                  .textTheme
                  .bodyMedium
                  ?.copyWith(color: c.ink2),
            )
          else
            for (int i = 0; i < hallazgos.length; i++) ...<Widget>[
              if (i > 0)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: Space.sm),
                  child: Divider(height: 1, color: c.border),
                ),
              _FilaHallazgo(
                hallazgo: hallazgos[i],
                etiqueta: catalogo[hallazgos[i].sku]?.etiqueta,
              ),
            ],
        ],
      ),
    );
  }
}

class _FilaHallazgo extends StatelessWidget {
  const _FilaHallazgo({required this.hallazgo, this.etiqueta});

  final String? etiqueta;

  final Hallazgo hallazgo;

  Color _colorSeveridad(OnRouteColors c, Severidad s) {
    switch (s) {
      case Severidad.critico:
        return c.danger;
      case Severidad.atencion:
        return c.pending;
      case Severidad.informativo:
        return c.violet;
      case Severidad.bueno:
        return c.collected;
    }
  }

  String _etiquetaSeveridad(Severidad s) {
    switch (s) {
      case Severidad.critico:
        return 'crítico';
      case Severidad.atencion:
        return 'atención';
      case Severidad.informativo:
        return 'informativo';
      case Severidad.bueno:
        return 'bueno';
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final theme = Theme.of(context);
    final FraseVito frase = redactar(hallazgo, etiqueta: etiqueta);
    final Color marca = _colorSeveridad(c, hallazgo.severidad);

    return Semantics(
      label:
          'Severidad ${_etiquetaSeveridad(hallazgo.severidad)}: ${frase.titular}. '
          '${frase.detalle}${frase.accion != null ? ' ${frase.accion}' : ''}',
      child: ExcludeSemantics(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Padding(
              padding: const EdgeInsets.only(top: 6, right: Space.sm),
              child: Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: marca,
                ),
              ),
            ),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    frase.titular,
                    style: theme.textTheme.bodyLarge?.copyWith(
                      color: c.ink,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    frase.detalle,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: c.ink2,
                    ),
                  ),
                  if (frase.accion != null) ...<Widget>[
                    const SizedBox(height: Space.xs),
                    Text(
                      frase.accion!,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: c.violet,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
