/// El cuadre de fin de día. Función pura: entra el estado de la ruta, sale la
/// liquidación. Sin red, sin reloj, sin estado escondido — así se puede probar
/// entero y así el mismo cálculo corre igual en el teléfono y en la torre.
///
/// ## Los tres libros
///
/// Un día de autoventa deja tres registros que **tienen que coincidir**, y cada
/// uno lo lleva alguien distinto:
///
/// 1. **La parrilla** — qué salió cargado, qué se contó al volver. Lo lleva
///    bodega.
/// 2. **Las paradas** — qué se entregó, qué se cobró, qué se fió. Lo lleva el
///    vendedor.
/// 3. **La caja** — cuánto billete se entregó al cerrar. Lo cuenta caja.
///
/// La tentación es restar principio contra final y mostrar un solo número. Es
/// exactamente lo que no hay que hacer: un único "descuadre" mezcla tres
/// responsables distintos y termina culpando al vendedor de un error de
/// bodega. Por eso aquí se calculan **tres brechas separadas**, cada una entre
/// dos libros consecutivos, y cada una apunta a una persona y a una causa.
library;

import 'package:meta/meta.dart';

import '../models/bodega.dart';
import '../models/dinero.dart';
import '../models/parada.dart';
import '../models/producto.dart';
import '../models/ruta.dart';

/// Qué tan lejos del cero se tolera antes de llamarlo descuadre.
///
/// No es cero absoluto por una razón práctica: el vendedor redondea el vuelto.
/// Una lempira suelta en catorce paradas no es un robo, es una moneda que no
/// había. Pasado ese margen ya no es redondeo.
const Dinero toleranciaCaja = Dinero(500); // L 5.00

@immutable
final class Liquidacion {
  const Liquidacion({
    required this.ruta,
    required this.valorEntregado,
    required this.cobrado,
    required this.efectivoEsperado,
    required this.efectivoEntregado,
    required this.credito,
    required this.brechaVenta,
    required this.brechaCaja,
    required this.bultosFaltantes,
    required this.valorCargaFaltante,
    required this.conteoCompleto,
  });

  final Ruta ruta;

  /// Libro 2, lado izquierdo: lo que valía el producto que bajó del camión.
  final Dinero valorEntregado;

  /// Libro 2, lado derecho: lo que se justificó, cobrado en cualquier vía.
  final Dinero cobrado;

  /// Del cobro, lo que era billete y debería aparecer en el sobre.
  final Dinero efectivoEsperado;

  /// Libro 3: lo que caja realmente recibió y contó.
  final Dinero efectivoEntregado;

  /// Lo fiado hoy. No es descuadre: es cartera.
  final Dinero credito;

  /// **Brecha de venta** (paradas): entregado contra cobrado + fiado.
  /// Negativa = salió producto que nadie anotó.
  final Dinero brechaVenta;

  /// **Brecha de caja** (vendedor contra caja): efectivo esperado contra
  /// efectivo entregado. Negativa = falta billete.
  final Dinero brechaCaja;

  /// **Brecha de carga** (parrilla): bultos que no aparecen en el conteo.
  final int bultosFaltantes;
  final Dinero valorCargaFaltante;

  /// Si nadie contó la parrilla, la brecha de carga no es cero: es desconocida.
  /// Mostrar "0" sin conteo sería mentir con la cara de estar cuadrado.
  final bool conteoCompleto;

  bool get ventaCuadra => brechaVenta.magnitud <= toleranciaCaja;
  bool get cajaCuadra => brechaCaja.magnitud <= toleranciaCaja;
  bool get cargaCuadra => conteoCompleto && bultosFaltantes == 0;

  /// Solo se puede afirmar que el día cuadró si además se contó la parrilla.
  bool get todoCuadra => ventaCuadra && cajaCuadra && cargaCuadra;

  /// Para el titular del cierre: la peor de las brechas en dinero.
  Dinero get brechaMayor {
    final Dinero v = brechaVenta.magnitud;
    final Dinero c = brechaCaja.magnitud;
    final Dinero g = valorCargaFaltante.magnitud;
    Dinero peor = v;
    if (c > peor) peor = c;
    if (g > peor) peor = g;
    return peor;
  }
}

/// Calcula la liquidación de una ruta.
///
/// [efectivoEntregado] lo teclea quien recibe en caja, contando el sobre. Es
/// una medición independiente a propósito: si la app lo dedujera del cobro
/// registrado, la brecha de caja daría cero siempre y el cuadre no serviría
/// para nada.
Liquidacion cuadrar({
  required Ruta ruta,
  required Dinero efectivoEntregado,
}) {
  final Bodega bodega = ruta.bodega;
  final Map<String, Producto> catalogo = bodega.catalogo;

  final Dinero valorEntregado =
      ruta.paradas.map((Parada p) => p.valorEntregado(catalogo)).suma;

  final Dinero cobrado = ruta.cobradoTotal;
  final Dinero credito = ruta.creditoTotal;
  final Dinero efectivoEsperado = ruta.efectivoTotal;

  return Liquidacion(
    ruta: ruta,
    valorEntregado: valorEntregado,
    cobrado: cobrado,
    credito: credito,
    efectivoEsperado: efectivoEsperado,
    efectivoEntregado: efectivoEntregado,

    // Lo justificado menos lo que valía lo entregado. Si bajó producto por
    // L 1,000 y solo se anotaron L 700 entre cobro y fiado, faltan L 300 de
    // explicación, no de dinero: puede ser una entrega sin registrar.
    brechaVenta: cobrado + credito - valorEntregado,

    // El sobre contra lo que el sobre debería traer.
    brechaCaja: efectivoEntregado - efectivoEsperado,

    bultosFaltantes: bodega.bultosFaltantes,
    valorCargaFaltante: bodega.valorFaltante,
    conteoCompleto: bodega.conteoCompleto,
  );
}
