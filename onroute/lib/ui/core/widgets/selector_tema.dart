/// El selector de registro visual: Automático, Calle o Torre.
///
/// ## Por qué son tres y no dos, y por qué recibe `bool?`
///
/// OnRoute decide el tema por el ancho: el vendedor va en teléfono y ve Calle,
/// el dueño en pantalla grande y ve Torre. Eso es lo correcto por defecto y es
/// lo que hace la app al abrir.
///
/// El selector anterior tenía solo dos botones y recibía el `esTorre` ya
/// resuelto, así que en cuanto alguien tocaba uno la decisión automática
/// quedaba **forzada para siempre**: no había forma de volver a "que lo decida
/// la pantalla" sin cerrar la app. Por eso este recibe la preferencia **cruda**
/// —`null` cuando nadie la ha forzado— y por eso la primera opción existe.
///
/// El widget es público porque vive en Ajustes, que es donde se ajusta la app,
/// y no dentro de la pantalla de identidad de marca, que es una referencia del
/// sistema de diseño y no un panel de control.
library;

import 'package:flutter/material.dart';

import '../theme/app_theme.dart';
import '../theme/palette.dart';
import '../theme/tokens.dart';
import '../theme/typography.dart';

class SelectorTema extends StatelessWidget {
  const SelectorTema({
    super.key,
    required this.forzado,
    required this.onCambiar,
    this.resuelto,
  });

  /// La preferencia guardada, cruda: `null` = automático, `false` = Calle,
  /// `true` = Torre. **No** el tema que se está pintando: pasar el resuelto es
  /// justo lo que hacía irrecuperable la opción automática.
  final bool? forzado;

  /// Qué tema está mostrando la app ahora mismo. Solo sirve para el subtítulo
  /// de la opción automática —"ahora: Torre"—, para que quien la elija no se
  /// quede adivinando qué acaba de pedir.
  final bool? resuelto;

  final ValueChanged<bool?> onCambiar;

  @override
  Widget build(BuildContext context) {
    final OnRouteColors c = context.colors;

    Widget opcion(String label, IconData icono, bool? valor) {
      final bool activa = forzado == valor;
      return Expanded(
        child: Semantics(
          button: true,
          selected: activa,
          child: Material(
            color: activa ? c.surface : Colors.transparent,
            borderRadius: Radii.allMd,
            child: InkWell(
              onTap: () => onCambiar(valor),
              borderRadius: Radii.allMd,
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: Space.xs,
                  vertical: Space.md,
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: <Widget>[
                    Icon(icono, size: 18, color: activa ? c.ink : c.ink3),
                    const SizedBox(height: Space.xs),
                    Text(
                      label,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style:
                          AppText.label.copyWith(color: activa ? c.ink : c.ink3),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 360),
          child: Container(
            padding: const EdgeInsets.all(Space.xs),
            decoration: BoxDecoration(
              color: c.bgSunk,
              borderRadius: Radii.allLg,
            ),
            child: Row(
              children: <Widget>[
                opcion('Automático', Icons.auto_awesome_outlined, null),
                opcion('Calle', Icons.wb_sunny_outlined, false),
                opcion('Torre', Icons.hub_outlined, true),
              ],
            ),
          ),
        ),
        if (forzado == null && resuelto != null) ...<Widget>[
          const SizedBox(height: Space.sm),
          Text(
            'La pantalla decide: ahora está en '
            '${resuelto! ? 'Torre' : 'Calle'}.',
            style: AppText.bodySm.copyWith(color: c.ink3),
          ),
        ],
      ],
    );
  }
}
