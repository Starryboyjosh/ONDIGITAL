/// Pruebas del cuadre de fin de día.
///
/// Estas son las pruebas que más importan del repositorio. Todo lo demás, si
/// falla, se ve feo; si esto falla, la app le dice a una persona que le faltan
/// L 430 que sí entregó. Cada caso de aquí es una acusación que la app podría
/// hacer, y existe para comprobar que solo la hace cuando es cierta.
///
/// Las fixtures son mínimas y escritas a mano a propósito: no dependen de la
/// semilla de demo, para que cambiar los datos de demostración nunca pueda
/// romper —ni maquillar— la aritmética.
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'package:onroute/domain/logic/cuadre.dart';
import 'package:onroute/domain/logic/vito_analista.dart';
import 'package:onroute/domain/models/bodega.dart';
import 'package:onroute/domain/models/cliente.dart';
import 'package:onroute/domain/models/dinero.dart';
import 'package:onroute/domain/models/parada.dart';
import 'package:onroute/domain/models/producto.dart';
import 'package:onroute/domain/models/ruta.dart';

// ---------------------------------------------------------------- fixtures

/// Dos productos de precio redondo para que las cuentas se lean a simple vista.
const Producto harina = Producto(
  sku: 'HAR-25',
  nombre: 'Harina de maíz 25 lb',
  marca: 'Maseca',
  unidad: Unidad.saco,
  precio: Dinero.lps(600),
);

const Producto aceite = Producto(
  sku: 'ACE-12',
  nombre: 'Aceite 12x900 ml',
  marca: 'Clover',
  unidad: Unidad.caja,
  precio: Dinero.lps(720),
);

const Map<String, Producto> catalogo = <String, Producto>{
  'HAR-25': harina,
  'ACE-12': aceite,
};

Cliente cliente(String id) => Cliente(
      id: id,
      nombre: 'Pulpería $id',
      tipo: TipoCliente.pulperia,
      direccion: 'Comayagüela',
      posicion: const LatLng(14.09, -87.22),
    );

Bodega bodega({
  int salidaHarina = 10,
  int salidaAceite = 10,
  int vendidoHarina = 0,
  int vendidoAceite = 0,
  int? contadoHarina,
  int? contadoAceite,
}) =>
    Bodega(
      filas: 1,
      columnas: 2,
      catalogo: catalogo,
      casillas: <Casilla>[
        Casilla(
          id: 'c1',
          fila: 0,
          columna: 0,
          sku: 'HAR-25',
          salida: salidaHarina,
          vendido: vendidoHarina,
          contado: contadoHarina,
        ),
        Casilla(
          id: 'c2',
          fila: 0,
          columna: 1,
          sku: 'ACE-12',
          salida: salidaAceite,
          vendido: vendidoAceite,
          contado: contadoAceite,
        ),
      ],
    );

Ruta ruta({required List<Parada> paradas, required Bodega carga}) => Ruta(
      id: 'R-1',
      camionId: 'CAM-2',
      nombre: 'Comayagüela Sur',
      fecha: DateTime(2026, 8, 28),
      base: const LatLng(14.09, -87.22),
      horaSalida: DateTime(2026, 8, 28, 7, 30),
      paradas: paradas,
      bodega: carga,
    );

Parada visita(
  int orden, {
  Map<String, int> entregado = const <String, int>{},
  Dinero efectivo = Dinero.cero,
  Dinero transferencia = Dinero.cero,
  Dinero credito = Dinero.cero,
  EstadoVisita estado = EstadoVisita.cobrada,
  Map<String, int> pedido = const <String, int>{},
  MotivoOmision? motivo,
  int atrasoMin = 0,
}) {
  final DateTime plan = DateTime(2026, 8, 28, 8).add(
    Duration(minutes: 25 * orden),
  );
  return Parada(
    id: 'P-$orden',
    orden: orden,
    cliente: cliente('$orden'),
    horaEstimada: plan,
    estado: estado,
    pedidoEsperado: pedido,
    entregado: entregado,
    efectivo: efectivo,
    transferencia: transferencia,
    credito: credito,
    motivo: motivo,
    horaLlegada: estado == EstadoVisita.pendiente
        ? null
        : plan.add(Duration(minutes: atrasoMin)),
  );
}

bool tiene(List<Hallazgo> h, TipoHallazgo t) =>
    h.any((Hallazgo x) => x.tipo == t);

Hallazgo soloUno(List<Hallazgo> h, TipoHallazgo t) =>
    h.singleWhere((Hallazgo x) => x.tipo == t);

// ------------------------------------------------------------------- casos

void main() {
  group('Dinero', () {
    test('no arrastra el error de coma flotante', () {
      // El caso que motiva el tipo entero: con `double`, 0.1 + 0.1 + 0.1 da
      // 0.30000000000000004 y a la larga eso es un descuadre fantasma.
      const Dinero diezCentavos = Dinero(10);
      expect(diezCentavos + diezCentavos + diezCentavos, const Dinero(30));
      expect(0.1 + 0.1 + 0.1 == 0.3, isFalse, reason: 'por eso existe Dinero');
    });

    test('suma una colección sin perder centavos', () {
      final List<Dinero> montos = List<Dinero>.filled(100, const Dinero(1));
      expect(montos.suma, const Dinero(100));
    });

    test('la magnitud ignora el signo pero el signo se conserva aparte', () {
      const Dinero falta = Dinero(-43000);
      expect(falta.magnitud, const Dinero(43000));
      expect(falta.esNegativo, isTrue);
    });
  });

  group('Bodega', () {
    test('despacha vaciando primero la fila cercana a la cabina', () {
      const Bodega b = Bodega(
        filas: 2,
        columnas: 1,
        catalogo: catalogo,
        casillas: <Casilla>[
          Casilla(id: 'fondo', fila: 1, columna: 0, sku: 'HAR-25', salida: 10),
          Casilla(id: 'frente', fila: 0, columna: 0, sku: 'HAR-25', salida: 4),
        ],
      );

      final ({Bodega bodega, int sinDespachar}) r = b.despachar('HAR-25', 6);

      expect(r.sinDespachar, 0);
      expect(r.bodega.porId('frente')!.enCamion, 0, reason: 'se vació primero');
      expect(r.bodega.porId('fondo')!.enCamion, 8, reason: 'solo cedió 2');
    });

    test('avisa cuando no alcanza en vez de dejar negativo el inventario', () {
      final ({Bodega bodega, int sinDespachar}) r =
          bodega(salidaHarina: 3).despachar('HAR-25', 5);

      expect(r.sinDespachar, 2);
      expect(r.bodega.bultosEnCamion, greaterThanOrEqualTo(0));
    });

    test('sin conteo físico el faltante es desconocido, no cero', () {
      final Bodega b = bodega(vendidoHarina: 4);
      expect(b.conteoCompleto, isFalse);
      expect(b.porId('c1')!.faltante, isNull);
    });
  });

  group('cuadre', () {
    test('un día limpio cuadra en los tres libros', () {
      // Entregó 2 sacos (L 1,200) y 1 caja (L 720) = L 1,920, todo en efectivo.
      final Ruta r = ruta(
        carga: bodega(
          vendidoHarina: 2,
          vendidoAceite: 1,
          contadoHarina: 8,
          contadoAceite: 9,
        ),
        paradas: <Parada>[
          visita(
            1,
            entregado: <String, int>{'HAR-25': 2, 'ACE-12': 1},
            efectivo: Dinero.lps(1920),
          ),
        ],
      );

      final Liquidacion l = cuadrar(ruta: r, efectivoEntregado: Dinero.lps(1920));

      expect(l.valorEntregado, Dinero.lps(1920));
      expect(l.brechaVenta, Dinero.cero);
      expect(l.brechaCaja, Dinero.cero);
      expect(l.bultosFaltantes, 0);
      expect(l.todoCuadra, isTrue);
      expect(analizarLiquidacion(l).single.tipo, TipoHallazgo.diaLimpio);
    });

    test('el caso del plan: vendió L 4,320 y entregó L 3,890, faltan L 430', () {
      // 6 sacos (L 3,600) + 1 caja (L 720) = L 4,320 vendidos y cobrados.
      final Ruta r = ruta(
        carga: bodega(
          salidaHarina: 10,
          salidaAceite: 10,
          vendidoHarina: 6,
          vendidoAceite: 1,
          contadoHarina: 4,
          contadoAceite: 9,
        ),
        paradas: <Parada>[
          visita(
            1,
            entregado: <String, int>{'HAR-25': 6, 'ACE-12': 1},
            efectivo: Dinero.lps(4320),
          ),
        ],
      );

      final Liquidacion l = cuadrar(ruta: r, efectivoEntregado: Dinero.lps(3890));

      expect(l.brechaVenta, Dinero.cero, reason: 'las paradas sí cuadran');
      expect(l.brechaCaja, Dinero.lps(-430));
      expect(l.cajaCuadra, isFalse);
      expect(l.todoCuadra, isFalse);

      final Hallazgo h = soloUno(analizarLiquidacion(l), TipoHallazgo.cajaCorta);
      expect(h.severidad, Severidad.critico);
      expect(h.esperado, Dinero.lps(4320));
      expect(h.real, Dinero.lps(3890));
      expect(h.diferencia, Dinero.lps(430));
    });

    test('el crédito no es descuadre: es cartera', () {
      // Entregó L 1,920 y solo trajo L 1,200 porque fió L 720. Eso cuadra.
      final Ruta r = ruta(
        carga: bodega(
          vendidoHarina: 2,
          vendidoAceite: 1,
          contadoHarina: 8,
          contadoAceite: 9,
        ),
        paradas: <Parada>[
          visita(
            1,
            entregado: <String, int>{'HAR-25': 2, 'ACE-12': 1},
            efectivo: Dinero.lps(1200),
            credito: Dinero.lps(720),
            estado: EstadoVisita.credito,
          ),
        ],
      );

      final Liquidacion l = cuadrar(ruta: r, efectivoEntregado: Dinero.lps(1200));

      expect(l.brechaVenta, Dinero.cero);
      expect(l.brechaCaja, Dinero.cero);
      expect(l.credito, Dinero.lps(720));

      final List<Hallazgo> h = analizarLiquidacion(l);
      expect(tiene(h, TipoHallazgo.cajaCorta), isFalse,
          reason: 'fiar no es faltar');
      // Pero L 720 sobre L 1,920 es 37 % de cartera y eso sí se avisa.
      expect(tiene(h, TipoHallazgo.creditoAlto), isTrue);
    });

    test('la transferencia cobra pero no llega a la caja', () {
      final Ruta r = ruta(
        carga: bodega(
          vendidoHarina: 2,
          vendidoAceite: 1,
          contadoHarina: 8,
          contadoAceite: 9,
        ),
        paradas: <Parada>[
          visita(
            1,
            entregado: <String, int>{'HAR-25': 2, 'ACE-12': 1},
            efectivo: Dinero.lps(1200),
            transferencia: Dinero.lps(720),
          ),
        ],
      );

      // El sobre trae solo el billete; la transferencia cuadra contra el banco.
      final Liquidacion l = cuadrar(ruta: r, efectivoEntregado: Dinero.lps(1200));

      expect(l.cobrado, Dinero.lps(1920));
      expect(l.efectivoEsperado, Dinero.lps(1200));
      expect(l.cajaCuadra, isTrue);
      expect(r.paradas.single.medioPago, MedioPago.mixto);
    });

    test('producto que bajó sin quedar anotado sale como entrega sin registro',
        () {
      // Entregó L 1,920 pero solo justificó L 1,200. Faltan L 720 de papel.
      final Ruta r = ruta(
        carga: bodega(
          vendidoHarina: 2,
          vendidoAceite: 1,
          contadoHarina: 8,
          contadoAceite: 9,
        ),
        paradas: <Parada>[
          visita(
            1,
            entregado: <String, int>{'HAR-25': 2, 'ACE-12': 1},
            efectivo: Dinero.lps(1200),
          ),
        ],
      );

      final Liquidacion l = cuadrar(ruta: r, efectivoEntregado: Dinero.lps(1200));

      expect(l.brechaVenta, Dinero.lps(-720));
      final Hallazgo h =
          soloUno(analizarLiquidacion(l), TipoHallazgo.entregaSinRegistro);
      expect(h.severidad, Severidad.critico);
      expect(h.diferencia, Dinero.lps(720));
    });

    test('bultos que no aparecen en el conteo se reportan en bultos y en valor',
        () {
      // Vendió 2 sacos, deberían quedar 8, pero solo se contaron 6.
      final Ruta r = ruta(
        carga: bodega(
          vendidoHarina: 2,
          contadoHarina: 6,
          contadoAceite: 10,
        ),
        paradas: <Parada>[
          visita(
            1,
            entregado: <String, int>{'HAR-25': 2},
            efectivo: Dinero.lps(1200),
          ),
        ],
      );

      final Liquidacion l = cuadrar(ruta: r, efectivoEntregado: Dinero.lps(1200));

      expect(l.bultosFaltantes, 2);
      expect(l.valorCargaFaltante, Dinero.lps(1200));

      final Hallazgo h =
          soloUno(analizarLiquidacion(l), TipoHallazgo.cargaFaltante);
      expect(h.unidades, 2);
      expect(h.diferencia, Dinero.lps(1200));
    });

    test('sin contar la parrilla no se puede declarar el día cuadrado', () {
      final Ruta r = ruta(
        carga: bodega(vendidoHarina: 2), // nadie contó
        paradas: <Parada>[
          visita(
            1,
            entregado: <String, int>{'HAR-25': 2},
            efectivo: Dinero.lps(1200),
          ),
        ],
      );

      final Liquidacion l = cuadrar(ruta: r, efectivoEntregado: Dinero.lps(1200));

      expect(l.ventaCuadra, isTrue);
      expect(l.cajaCuadra, isTrue);
      expect(l.cargaCuadra, isFalse, reason: 'desconocido no es cuadrado');
      expect(l.todoCuadra, isFalse);

      final List<Hallazgo> h = analizarLiquidacion(l);
      expect(tiene(h, TipoHallazgo.conteoPendiente), isTrue);
      expect(tiene(h, TipoHallazgo.diaLimpio), isFalse);
    });

    test('el vuelto redondeado no dispara alarma, pero pasada la tolerancia sí',
        () {
      Liquidacion conSobre(Dinero entregado) => cuadrar(
            ruta: ruta(
              carga: bodega(
                vendidoHarina: 2,
                contadoHarina: 8,
                contadoAceite: 10,
              ),
              paradas: <Parada>[
                visita(
                  1,
                  entregado: <String, int>{'HAR-25': 2},
                  efectivo: Dinero.lps(1200),
                ),
              ],
            ),
            efectivoEntregado: entregado,
          );

      expect(conSobre(const Dinero(119700)).cajaCuadra, isTrue,
          reason: 'L 3 de vuelto no es un robo');
      expect(conSobre(const Dinero(119400)).cajaCuadra, isFalse,
          reason: 'L 6 ya pasa la tolerancia');
    });

    test('sobrar dinero también es un hallazgo, solo que menos grave', () {
      final Ruta r = ruta(
        carga: bodega(
          vendidoHarina: 2,
          contadoHarina: 8,
          contadoAceite: 10,
        ),
        paradas: <Parada>[
          visita(
            1,
            entregado: <String, int>{'HAR-25': 2},
            efectivo: Dinero.lps(1200),
          ),
        ],
      );

      final Liquidacion l = cuadrar(ruta: r, efectivoEntregado: Dinero.lps(1300));
      final Hallazgo h =
          soloUno(analizarLiquidacion(l), TipoHallazgo.cajaSobrada);

      expect(h.severidad, Severidad.atencion);
      expect(h.diferencia, Dinero.lps(100));
    });

    test('los hallazgos salen ordenados con lo crítico arriba', () {
      final Ruta r = ruta(
        carga: bodega(vendidoHarina: 2), // conteo pendiente: atención
        paradas: <Parada>[
          visita(
            1,
            entregado: <String, int>{'HAR-25': 2},
            efectivo: Dinero.lps(1200),
            atrasoMin: 90, // informativo
          ),
        ],
      );

      final List<Hallazgo> h = analizarLiquidacion(
        cuadrar(ruta: r, efectivoEntregado: Dinero.lps(900)), // crítico
      );

      expect(h.first.severidad, Severidad.critico);
      expect(h.last.severidad, Severidad.informativo);
    });
  });

  group('Vito en ruta abierta', () {
    test('avisa antes de que el producto se acabe en las paradas que faltan',
        () {
      // Quedan 3 sacos arriba y las dos paradas pendientes piden 7.
      final Ruta r = ruta(
        carga: bodega(salidaHarina: 10, vendidoHarina: 7),
        paradas: <Parada>[
          visita(
            1,
            entregado: <String, int>{'HAR-25': 7},
            efectivo: Dinero.lps(4200),
          ),
          visita(2,
              estado: EstadoVisita.pendiente,
              pedido: <String, int>{'HAR-25': 4}),
          visita(3,
              estado: EstadoVisita.pendiente,
              pedido: <String, int>{'HAR-25': 3}),
        ],
      );

      final Hallazgo h =
          soloUno(analizarRutaEnCurso(r), TipoHallazgo.productoNoAlcanza);

      expect(h.sku, 'HAR-25');
      expect(h.unidades, 4, reason: 'piden 7 y hay 3');
      expect(h.diferencia, Dinero.lps(2400));
    });

    test('no avisa cuando el producto sí alcanza', () {
      final Ruta r = ruta(
        carga: bodega(salidaHarina: 10, vendidoHarina: 2),
        paradas: <Parada>[
          visita(1,
              estado: EstadoVisita.pendiente,
              pedido: <String, int>{'HAR-25': 5}),
        ],
      );

      expect(
        tiene(analizarRutaEnCurso(r), TipoHallazgo.productoNoAlcanza),
        isFalse,
      );
    });

    test('la demanda pendiente ignora las paradas ya cerradas', () {
      // La parada omitida pedía 20 sacos; ya se cerró, no cuenta.
      final Ruta r = ruta(
        carga: bodega(salidaHarina: 10),
        paradas: <Parada>[
          visita(1,
              estado: EstadoVisita.omitida,
              motivo: MotivoOmision.cerrado,
              pedido: <String, int>{'HAR-25': 20}),
          visita(2,
              estado: EstadoVisita.pendiente,
              pedido: <String, int>{'HAR-25': 5}),
        ],
      );

      expect(
        tiene(analizarRutaEnCurso(r), TipoHallazgo.productoNoAlcanza),
        isFalse,
      );
    });

    test('un cliente cerrado se señala por su nombre para reordenar la ruta',
        () {
      final Ruta r = ruta(
        carga: bodega(),
        paradas: <Parada>[
          visita(1, estado: EstadoVisita.omitida, motivo: MotivoOmision.cerrado),
        ],
      );

      final Hallazgo h = soloUno(
        analizarRutaEnCurso(r),
        TipoHallazgo.clienteCerradoRepetido,
      );
      expect(h.clienteNombre, 'Pulpería 1');
      expect(h.severidad, Severidad.informativo);
    });
  });

  group('Ruta', () {
    test('el avance cuenta las omitidas: ya no se vuelven a visitar hoy', () {
      final Ruta r = ruta(
        carga: bodega(),
        paradas: <Parada>[
          visita(1),
          visita(2, estado: EstadoVisita.omitida, motivo: MotivoOmision.cerrado),
          visita(3, estado: EstadoVisita.pendiente),
          visita(4, estado: EstadoVisita.pendiente),
        ],
      );

      expect(r.atendidas, 1);
      expect(r.cerradas, 2);
      expect(r.avance, 0.5);
      expect(r.paradaActual?.orden, 3);
    });

    test('el atraso es el de la última parada visitada, no el promedio', () {
      final Ruta r = ruta(
        carga: bodega(),
        paradas: <Parada>[
          visita(1, atrasoMin: 5),
          visita(2, atrasoMin: 50),
          visita(3, estado: EstadoVisita.pendiente),
        ],
      );

      expect(r.atrasoMinutos, 50);
    });
  });
}
