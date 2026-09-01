/// La Bodega Rodante: la parrilla del camión modelada como lo que es.
///
/// Esta es la pieza firma de OnRoute, el equivalente al odontograma de Credental.
/// La idea es la misma: en vez de una tabla de cantidades, un **diagrama
/// espacial** de algo físico, donde cada posición se puede tocar y tiene
/// historia propia.
///
/// La decisión de modelado que lo hace honesto: la fuente de verdad es la
/// [Casilla], no el total por producto. El vendedor no vende "12 cajas de
/// galletas en abstracto": vende de una estiba concreta que está en un lugar
/// concreto de la parrilla, y esa estiba se vacía. Los totales por SKU son un
/// rollup de las casillas, nunca al revés. Así el dibujo no ilustra los
/// números: el dibujo **es** los números.
library;

import 'package:meta/meta.dart';

import 'dinero.dart';
import 'producto.dart';

/// Una posición física en la parrilla, con una estiba de un solo SKU.
@immutable
final class Casilla {
  const Casilla({
    required this.id,
    required this.fila,
    required this.columna,
    required this.sku,
    required this.salida,
    this.vendido = 0,
    this.contado,
  })  : assert(salida >= 0, 'no se puede cargar cantidad negativa'),
        assert(vendido >= 0, 'no se puede vender cantidad negativa');

  final String id;

  /// Fila 0 es la más cercana a la cabina. Importa: lo que va al fondo es lo
  /// que menos rota, y verlo en el diagrama es medio punto del producto.
  final int fila;
  final int columna;

  final String sku;

  /// Bultos cargados en la mañana, antes de salir de bodega.
  final int salida;

  /// Bultos entregados en ruta. Sube con cada visita cobrada.
  final int vendido;

  /// Conteo físico al cierre. `null` mientras la ruta sigue abierta: nadie ha
  /// contado todavía, que no es lo mismo que haber contado cero.
  final int? contado;

  /// Lo que el sistema **cree** que queda arriba del camión.
  int get enCamion => salida - vendido;

  /// Diferencia entre lo que debería haber y lo que hay. `null` hasta que
  /// alguien cuente. Positivo = falta producto.
  int? get faltante {
    final int? c = contado;
    return c == null ? null : enCamion - c;
  }

  bool get cuadra => faltante == 0;
  bool get vacia => enCamion == 0;

  /// Qué tan llena se dibuja la casilla, de 0 a 1.
  double get fraccionRestante =>
      salida == 0 ? 0 : (enCamion / salida).clamp(0.0, 1.0);

  Casilla copyWith({int? vendido, int? contado, bool limpiarContado = false}) =>
      Casilla(
        id: id,
        fila: fila,
        columna: columna,
        sku: sku,
        salida: salida,
        vendido: vendido ?? this.vendido,
        contado: limpiarContado ? null : (contado ?? this.contado),
      );

  @override
  bool operator ==(Object other) => other is Casilla && other.id == id;

  @override
  int get hashCode => id.hashCode;
}

/// La parrilla completa de un camión para un día.
@immutable
final class Bodega {
  const Bodega({
    required this.filas,
    required this.columnas,
    required this.casillas,
    required this.catalogo,
  });

  final int filas;
  final int columnas;
  final List<Casilla> casillas;

  /// SKU → producto. Se pasa completo en vez de colgar el [Producto] de cada
  /// casilla: el precio es del catálogo del día, no de la estiba.
  final Map<String, Producto> catalogo;

  Producto producto(String sku) {
    final Producto? p = catalogo[sku];
    if (p == null) {
      throw StateError('SKU "$sku" en la parrilla pero no en el catálogo');
    }
    return p;
  }

  Casilla? enPosicion(int fila, int columna) {
    for (final Casilla c in casillas) {
      if (c.fila == fila && c.columna == columna) return c;
    }
    return null;
  }

  Casilla? porId(String id) {
    for (final Casilla c in casillas) {
      if (c.id == id) return c;
    }
    return null;
  }

  /// Todas las casillas del mismo producto, en orden de parrilla.
  List<Casilla> delSku(String sku) =>
      casillas.where((Casilla c) => c.sku == sku).toList();

  // ---- Rollups. Todos derivados de las casillas, ninguno almacenado. ----

  int get bultosSalida =>
      casillas.fold(0, (int a, Casilla c) => a + c.salida);

  int get bultosVendidos =>
      casillas.fold(0, (int a, Casilla c) => a + c.vendido);

  int get bultosEnCamion =>
      casillas.fold(0, (int a, Casilla c) => a + c.enCamion);

  /// Valor de lo que salió cargado. Es el número que el dueño arriesga cada
  /// mañana, y por eso encabeza la pantalla de bodega.
  Dinero get valorSalida => casillas
      .map((Casilla c) => producto(c.sku).precio * c.salida)
      .suma;

  /// Valor de lo entregado según la carga. Ojo: esto **no** es lo cobrado.
  /// Que las dos cifras se separen es precisamente lo que Vito busca.
  Dinero get valorVendido => casillas
      .map((Casilla c) => producto(c.sku).precio * c.vendido)
      .suma;

  Dinero get valorEnCamion => casillas
      .map((Casilla c) => producto(c.sku).precio * c.enCamion)
      .suma;

  /// Fracción vendida del total cargado, para la barra de "vaciado".
  double get fraccionVendida =>
      bultosSalida == 0 ? 0 : bultosVendidos / bultosSalida;

  /// ¿Ya se contó físicamente toda la parrilla?
  bool get conteoCompleto =>
      casillas.every((Casilla c) => c.contado != null);

  /// Casillas donde el conteo no coincide con lo teórico.
  List<Casilla> get descuadradas => casillas
      .where((Casilla c) => (c.faltante ?? 0) != 0)
      .toList();

  /// Bultos que no aparecen. Solo cuenta casillas ya contadas.
  int get bultosFaltantes => casillas.fold(
        0,
        (int a, Casilla c) => a + (c.faltante ?? 0),
      );

  /// Lo que valen los bultos que no aparecen.
  Dinero get valorFaltante => casillas
      .map((Casilla c) => producto(c.sku).precio * (c.faltante ?? 0))
      .suma;

  Bodega conCasilla(Casilla actualizada) => Bodega(
        filas: filas,
        columnas: columnas,
        catalogo: catalogo,
        casillas: <Casilla>[
          for (final Casilla c in casillas)
            if (c.id == actualizada.id) actualizada else c,
        ],
      );

  /// Descarga [cantidad] bultos del SKU indicado, vaciando de adelante hacia
  /// atrás: primero la fila más cercana a la cabina, que es como se estiba de
  /// verdad. Devuelve la bodega nueva y cuántos bultos no se pudieron sacar.
  ({Bodega bodega, int sinDespachar}) despachar(String sku, int cantidad) {
    if (cantidad <= 0) return (bodega: this, sinDespachar: 0);

    final List<Casilla> orden = delSku(sku)
      ..sort((Casilla a, Casilla b) {
        final int porFila = a.fila.compareTo(b.fila);
        return porFila != 0 ? porFila : a.columna.compareTo(b.columna);
      });

    Bodega actual = this;
    int pendiente = cantidad;
    for (final Casilla c in orden) {
      if (pendiente == 0) break;
      final int saca = c.enCamion < pendiente ? c.enCamion : pendiente;
      if (saca == 0) continue;
      actual = actual.conCasilla(c.copyWith(vendido: c.vendido + saca));
      pendiente -= saca;
    }
    return (bodega: actual, sinDespachar: pendiente);
  }
}
