/// El controlador de la torre: arma la flota del día y la pone a andar.
///
/// ## Por qué la red no es obligatoria en ningún punto
///
/// La torre pide a OSRM el trazo real de calles, y esa llamada puede fallar:
/// el servidor público no tiene SLA, y la oficina de una micro empresa en
/// Tegucigalpa no siempre tiene internet estable. Si la app dependiera de esa
/// respuesta, un lunes sin red sería un lunes sin operación.
///
/// Por eso [preparar] nunca lanza: `OsrmService` ya cae a línea recta por su
/// cuenta, y esta capa solo registra si el trazo que se dibuja es de calle o
/// de compás. [trazosReales] existe para poder decirlo en pantalla en vez de
/// hacer pasar una línea recta por una ruta.
library;

import 'package:flutter/foundation.dart';
import 'package:latlong2/latlong.dart';

import '../../../data/semilla/semilla_tegucigalpa.dart';
import '../../../data/services/osrm_service.dart';
import '../../../data/services/simulador_flota.dart';
import '../../../domain/models/parada.dart';
import '../../../domain/models/ruta.dart';

class TorreController extends ChangeNotifier {
  TorreController({OsrmService? osrm, SimuladorFlota? simulador})
      : _osrm = osrm ?? OsrmService(),
        simulador = simulador ?? SimuladorFlota();

  final OsrmService _osrm;
  final SimuladorFlota simulador;

  final List<Ruta> rutas = <Ruta>[];
  final Map<String, List<LatLng>> trazos = <String, List<LatLng>>{};

  bool _listo = false;
  bool get listo => _listo;

  /// Cuántas de las rutas se dibujan sobre calle real. Menos que [rutas.length]
  /// significa que hubo que estimar, y la pantalla lo dice.
  int trazosReales = 0;

  String? camionSeleccionado;

  Future<void> preparar() async {
    if (_listo) return;

    for (int i = 0; i < camionesFlota.length; i++) {
      final Ruta ruta = rutaDelDia(variante: i);
      // Base → cada parada en orden → base. El regreso importa: el camión que
      // ya entregó todo sigue existiendo y sigue en el mapa hasta que llega.
      final List<LatLng> paradas = <LatLng>[
        ruta.base,
        for (final Parada p in ruta.paradas) p.cliente.posicion,
        ruta.base,
      ];

      final TrazoRuta trazo = await _osrm.trazar(paradas);
      if (trazo.esReal) trazosReales++;

      rutas.add(ruta);
      trazos[ruta.id] = trazo.puntos;
      simulador.agregar(
        camion: camionesFlota[i],
        ruta: ruta,
        trazo: trazo.puntos,
      );
    }

    _listo = true;
    notifyListeners();
  }

  void seleccionar(String? camionId) {
    camionSeleccionado = camionId;
    notifyListeners();
  }

  CamionSimulado? get seleccionado {
    final String? id = camionSeleccionado;
    if (id == null) return null;
    for (final CamionSimulado c in simulador.camiones) {
      if (c.camion.id == id) return c;
    }
    return null;
  }

  /// La flota en el orden en que la torre la quiere ver: primero quien todavía
  /// anda en la calle. Al dueño le sirve saber quién falta, no quién terminó.
  List<CamionSimulado> get flota {
    final List<CamionSimulado> l = List<CamionSimulado>.of(simulador.camiones);
    l.sort((CamionSimulado a, CamionSimulado b) {
      if (a.termino != b.termino) return a.termino ? 1 : -1;
      return b.fraccionRecorrida.compareTo(a.fraccionRecorrida);
    });
    return l;
  }

  @override
  void dispose() {
    simulador.pausar();
    simulador.dispose();
    super.dispose();
  }
}
