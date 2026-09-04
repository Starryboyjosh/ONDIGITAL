/// El reloj que hace vivir el mapa.
///
/// ## Qué simula y qué no
///
/// Este servicio mueve camiones sobre el trazo real de calles y avisa cuando
/// uno llega a una parada. **No toca el estado de negocio**: no marca cobros,
/// no vacía la parrilla, no cierra paradas. Esa frontera es deliberada. Un
/// simulador que además registrara ventas estaría metiendo dinero inventado en
/// el mismo cuadre que el producto promete auditar, y la demo dejaría de
/// demostrar nada. Cobrar lo hace una persona, o el modo demo, pero siempre
/// pasando por el repositorio y quedando registrado como lo que es.
///
/// El día real dura ocho horas y la demo tiene que caber en minutos, así que el
/// tiempo va comprimido por [factorTiempo]. Todo lo demás —velocidad, tiempo de
/// atención en cada parada— está en unidades del mundo real y se comprime al
/// aplicarse, para que los números del código se puedan discutir con un
/// vendedor sin traducir nada.
///
/// [avanzar] es público y toma el delta a mano a propósito: así las pruebas
/// simulan media hora sin esperar media hora.
library;

import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:latlong2/latlong.dart' as latlng;

import '../../domain/models/camion.dart';
import '../../domain/models/parada.dart';
import '../../domain/models/ruta.dart';
import 'recorrido.dart';

/// Margen para dar por llegado el final del trazo. Medio metro: la geodesia
/// acumula redondeos y exigir igualdad exacta dejaría al camión eternamente a
/// un centímetro de la base.
const double _metroDeGracia = 0.5;

/// Estado de simulación de un camión: dónde va sobre su recorrido.
class CamionSimulado {
  CamionSimulado({
    required this.camion,
    required this.ruta,
    required this.recorrido,
    required this.distanciaParadas,
    this.avance = 0,
    this.proximaParada = 0,
  });

  Camion camion;
  final Ruta ruta;
  final Recorrido recorrido;

  /// Metros desde el inicio del trazo a los que cae cada parada, en orden.
  final List<double> distanciaParadas;

  /// Metros ya recorridos.
  double avance;

  /// Índice de la próxima parada a la que va. Igual al total = ya terminó.
  int proximaParada;

  /// Segundos simulados que le faltan de atención en la parada actual.
  double esperaRestante = 0;

  /// Ya no le queda ninguna parada por visitar. No es lo mismo que haber
  /// terminado: todavía le falta manejar de vuelta a la base.
  bool get paradasCompletas => proximaParada >= distanciaParadas.length;

  /// Terminó de verdad: visitó todas las paradas **y** llegó al final del
  /// trazo, que es la base. Antes bastaba con la última parada, y el camión se
  /// quedaba clavado ahí con la barra de avance a media asta y el rótulo "De
  /// regreso" encima de un camión que no se movía.
  bool get termino =>
      paradasCompletas && avance >= recorrido.largo - _metroDeGracia;

  /// Volviendo a la base, pero todavía en la calle.
  bool get regresando => paradasCompletas && !termino;

  bool get atendiendo => esperaRestante > 0;

  double get fraccionRecorrida =>
      recorrido.largo == 0 ? 0 : (avance / recorrido.largo).clamp(0.0, 1.0);
}

class SimuladorFlota extends ChangeNotifier {
  SimuladorFlota({
    this.factorTiempo = 90,
    this.velocidadKmH = 22,
    this.atencionPorParada = const Duration(minutes: 6),
  });

  /// Cuántos segundos simulados pasan por segundo real. 90× mete una jornada de
  /// ocho horas en poco más de cinco minutos.
  double factorTiempo;

  /// Velocidad de crucero urbana de un camión de reparto en San Pedro Sula.
  final double velocidadKmH;

  /// Cuánto se queda el vendedor en cada pulpería.
  final Duration atencionPorParada;

  final List<CamionSimulado> _camiones = <CamionSimulado>[];
  List<CamionSimulado> get camiones => List<CamionSimulado>.unmodifiable(_camiones);

  Timer? _timer;
  bool get corriendo => _timer != null;

  /// Se dispara cuando un camión llega a una parada. Lleva el id de la parada,
  /// no el objeto: quien escucha decide qué hacer con esa información.
  void Function(String camionId, String paradaId)? alLlegar;

  void agregar({
    required Camion camion,
    required Ruta ruta,
    required List<latlng.LatLng> trazo,
  }) {
    final Recorrido r = Recorrido(trazo);
    _camiones.add(
      CamionSimulado(
        camion: camion,
        ruta: ruta,
        recorrido: r,
        distanciaParadas: <double>[
          for (final Parada p in ruta.paradas) r.distanciaHasta(p.cliente.posicion),
        ],
      ),
    );
    notifyListeners();
  }

  /// Cambia quién maneja un camión ya simulado, sin tocarle nada más.
  ///
  /// Existe porque el simulador se queda con su **propia copia** del camión al
  /// agregarlo: sin esta puerta, asignar un conductor en el registro no
  /// llegaría nunca al marcador del mapa —el registro diría una cosa y la torre
  /// seguiría rotulando otra.
  ///
  /// Se transplantan solo los dos campos del conductor y no el [Camion]
  /// entero, aunque el registro tenga uno completo a mano: su copia trae el
  /// rastro y el estado de cuando arrancó el día, y pisarlos acá teletransporta
  /// el camión de vuelta a la base a media ruta.
  void reasignarConductor({
    required String camionId,
    required String conductor,
    String? conductorId,
  }) {
    for (final CamionSimulado c in _camiones) {
      if (c.camion.id != camionId) continue;
      if (c.camion.conductor == conductor &&
          c.camion.conductorId == conductorId) {
        return;
      }
      c.camion = c.camion.conConductor(
        conductor: conductor,
        conductorId: conductorId,
      );
      notifyListeners();
      return;
    }
  }

  void iniciar({Duration cadencia = const Duration(milliseconds: 500)}) {
    if (_timer != null) return;
    _timer = Timer.periodic(cadencia, (_) => avanzar(cadencia));
    notifyListeners();
  }

  void pausar() {
    _timer?.cancel();
    _timer = null;
    notifyListeners();
  }

  /// Devuelve la flota a la puerta de la bodega, con la jornada por delante.
  ///
  /// A 90× una jornada de ocho horas se agota en poco más de cinco minutos, y
  /// sin esta puerta la torre quedaba con tres camiones clavados en la base sin
  /// más salida que cerrar la app. Se reinicia **solo el recorrido**: el trazo,
  /// la ruta y quién maneja cada camión no se tocan, porque no son parte de la
  /// jornada sino del día que se está simulando —reasignar un conductor y que
  /// reiniciar se lo revirtiera sería otro error, no un arreglo.
  ///
  /// No arranca el reloj: si estaba corriendo sigue corriendo, y si estaba en
  /// pausa se queda en pausa con la flota lista para salir.
  void reiniciar() {
    if (_camiones.isEmpty) return;
    for (final CamionSimulado c in _camiones) {
      c.avance = 0;
      c.proximaParada = 0;
      c.esperaRestante = 0;
      _publicar(c, detenido: false);
    }
    notifyListeners();
  }

  /// Adelanta la simulación [real] de tiempo de reloj.
  void avanzar(Duration real) {
    final double segundosSimulados =
        real.inMicroseconds / 1e6 * factorTiempo;
    if (segundosSimulados <= 0) return;

    bool cambio = false;
    for (final CamionSimulado c in _camiones) {
      if (_avanzarUno(c, segundosSimulados)) cambio = true;
    }
    if (cambio) notifyListeners();
  }

  /// Consume un presupuesto de [segundos] simulados, alternando entre rodar y
  /// atender. Se modela como presupuesto de **tiempo** y no de distancia porque
  /// las dos cosas que hace un camión —moverse y estar parado— solo son
  /// comparables en tiempo. Con esto un solo tick puede cubrir varias paradas
  /// sin saltarse la llegada de ninguna, que es lo que pasa apenas se sube
  /// [factorTiempo].
  bool _avanzarUno(CamionSimulado c, double segundos) {
    if (c.termino) return false;

    final double metrosPorSegundo = velocidadKmH * 1000 / 3600;
    double restante = segundos;

    while (restante > 0 && !c.termino) {
      // Atender consume tiempo y nada de distancia.
      if (c.esperaRestante > 0) {
        final double gasta = math.min(restante, c.esperaRestante);
        c.esperaRestante -= gasta;
        restante -= gasta;
        continue;
      }

      // Mientras queden paradas, la meta es la próxima. Cuando ya no quedan,
      // la meta es el final del trazo: el regreso a la base.
      final bool volviendo = c.paradasCompletas;
      final double meta =
          volviendo ? c.recorrido.largo : c.distanciaParadas[c.proximaParada];
      final double falta = meta - c.avance;

      if (falta <= 0) {
        if (volviendo) {
          c.avance = meta;
          break;
        }
        // El trazo ya pasó por esta parada: se llega sin rodar más.
        _llegar(c);
        continue;
      }

      final double segundosHastaMeta = falta / metrosPorSegundo;
      if (segundosHastaMeta > restante) {
        c.avance += restante * metrosPorSegundo;
        restante = 0;
      } else {
        c.avance = meta;
        restante -= segundosHastaMeta;
        if (!volviendo) _llegar(c);
      }
    }

    _publicar(c, detenido: c.atendiendo || c.termino);
    return true;
  }

  /// Registra la llegada a la parada en curso y arranca su tiempo de atención.
  /// `proximaParada` siempre avanza, así que el bucle de [_avanzarUno] termina
  /// aunque dos paradas caigan en el mismo punto del trazo.
  void _llegar(CamionSimulado c) {
    final String paradaId = c.ruta.paradas[c.proximaParada].id;
    c.proximaParada++;
    c.esperaRestante = atencionPorParada.inSeconds.toDouble();
    alLlegar?.call(c.camion.id, paradaId);
  }

  void _publicar(CamionSimulado c, {required bool detenido}) {
    final PuntoEnRuta p = c.recorrido.en(c.avance);
    c.camion = c.camion.conRastro(
      Rastro(
        posicion: p.punto,
        rumbo: p.rumbo,
        velocidadKmH: detenido ? 0 : velocidadKmH,
        momento: DateTime.now(),
      ),
    );
    if (c.termino) {
      c.camion = c.camion.conEstado(EstadoCamion.enBase);
    } else if (c.regresando) {
      c.camion = c.camion.conEstado(EstadoCamion.regresando);
    } else if (detenido) {
      c.camion = c.camion.conEstado(EstadoCamion.enParada);
    } else {
      c.camion = c.camion.conEstado(EstadoCamion.enRuta);
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _timer = null;
    super.dispose();
  }
}
