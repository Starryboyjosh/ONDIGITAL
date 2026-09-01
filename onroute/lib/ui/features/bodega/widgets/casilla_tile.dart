/// Una posición de la parrilla del camión.
///
/// El estado de la casilla se codifica en **tres canales independientes** para
/// que no compitan: la pila dice cuánto queda, el borde dice si ya se contó, y
/// la esquina dice si el conteo cuadró. Un solo canal de color obligaría a
/// elegir entre "queda poco" y "falta producto", que son cosas distintas: una
/// casilla vacía porque se vendió todo es un buen día.
library;

import 'package:flutter/material.dart';

import '../../../../domain/models/bodega.dart';
import '../../../../domain/models/producto.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/theme/palette.dart';
import '../../../core/theme/tokens.dart';
import 'pila_bultos.dart';

class CasillaTile extends StatelessWidget {
  const CasillaTile({
    super.key,
    required this.casilla,
    required this.producto,
    required this.progreso,
    this.seleccionada = false,
    this.onTap,
  });

  final Casilla casilla;
  final Producto producto;

  /// Progreso del vaciado animado, compartido por toda la parrilla.
  final double progreso;

  final bool seleccionada;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final OnRouteColors c = context.colors;
    final int? faltante = casilla.faltante;
    final bool contada = casilla.contado != null;
    final bool descuadrada = (faltante ?? 0) != 0;

    final Color borde = seleccionada
        ? c.violet
        : descuadrada
        ? c.danger
        : contada
        ? c.collected
        : c.border;

    return Semantics(
      button: onTap != null,
      selected: seleccionada,
      label: _descripcion(faltante, contada),
      child: Material(
        type: MaterialType.transparency,
        child: InkWell(
          onTap: onTap,
          borderRadius: Radii.allSm,
          child: AnimatedContainer(
            duration: Motion.fast,
            curve: Motion.out,
            padding: const EdgeInsets.all(Space.sm),
            decoration: BoxDecoration(
              color: casilla.vacia ? c.surfaceAlt : c.surface,
              borderRadius: Radii.allSm,
              border: Border.all(
                color: borde,
                width: seleccionada || descuadrada ? 2 : 1,
              ),
            ),
            child: Stack(
              children: <Widget>[
                Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: <Widget>[
                    SizedBox(
                      width: 10,
                      child: PilaBultos(
                        salida: casilla.salida,
                        enCamion: casilla.enCamion,
                        progreso: progreso,
                        lleno: casilla.vacia ? c.ink3 : c.brass,
                        vacio: c.bgSunk,
                      ),
                    ),
                    const SizedBox(width: Space.sm),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: <Widget>[
                          Text(
                            // Solo la familia del SKU: el sufijo de presentación
                            // ("-001") no cabe en la casilla y no distingue
                            // nada dentro de una cuadrícula que ya muestra la
                            // cuenta de cada posición.
                            producto.sku.split('-').first,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context).textTheme.labelSmall
                                ?.copyWith(color: c.ink3),
                          ),
                          FittedBox(
                            fit: BoxFit.scaleDown,
                            alignment: Alignment.centerLeft,
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.baseline,
                              textBaseline: TextBaseline.alphabetic,
                              children: <Widget>[
                                Text(
                                  '${casilla.enCamion}',
                                  style: Theme.of(context).textTheme.titleMedium
                                      ?.copyWith(
                                        color: casilla.vacia ? c.ink3 : c.ink,
                                        fontFeatures: const <FontFeature>[
                                          FontFeature.tabularFigures(),
                                        ],
                                      ),
                                ),
                                const SizedBox(width: 2),
                                Text(
                                  '/${casilla.salida}',
                                  maxLines: 1,
                                  style: Theme.of(context).textTheme.labelSmall
                                      ?.copyWith(color: c.ink3),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                // La marca de descuadre va como pastilla opaca superpuesta y
                // no como tinte de fondo: el fondo ya lo usa "vacía", y
                // superponerlos haría que un buen día se confunda con un
                // faltante. Va en Stack porque en un teléfono de 320 px la
                // casilla mide 66 px y no hay ancho que ceder.
                if (descuadrada)
                  _Marca(
                    texto: faltante! > 0 ? '-$faltante' : '+${-faltante}',
                    fondo: c.dangerSoft,
                    tinta: c.danger,
                  )
                else if (contada)
                  _Marca(
                    texto: '✓',
                    fondo: c.collectedSoft,
                    tinta: c.collected,
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _descripcion(int? faltante, bool contada) {
    final String base =
        '${producto.etiqueta}, ${producto.unidad.contar(casilla.enCamion)} '
        'de ${casilla.salida} en el camión';
    if (!contada) return '$base, sin contar';
    if ((faltante ?? 0) == 0) return '$base, contada y cuadra';
    return faltante! > 0
        ? '$base, faltan $faltante al conteo'
        : '$base, sobran ${-faltante} al conteo';
  }
}

class _Marca extends StatelessWidget {
  const _Marca({required this.texto, required this.fondo, required this.tinta});

  final String texto;
  final Color fondo;
  final Color tinta;

  @override
  Widget build(BuildContext context) => Align(
    alignment: Alignment.topRight,
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
      decoration: BoxDecoration(color: fondo, borderRadius: Radii.pill),
      child: Text(
        texto,
        style: Theme.of(context).textTheme.labelSmall
            ?.copyWith(color: tinta, fontWeight: FontWeight.w600),
      ),
    ),
  );
}
