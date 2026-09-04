/// El controlador de la torre: arma la flota del día y la pone a andar.
///
/// ## Por qué la red no es obligatoria en ningún punto
///
/// La torre pide a OSRM el trazo real de calles, y esa llamada puede fallar:
/// el servidor público no tiene SLA, y la oficina de una micro empresa en
/// San Pedro Sula no siempre tiene internet estable. Si la app dependiera de esa
/// respuesta, un lunes sin red sería un lunes sin operación.
///
/// Por eso [preparar] nunca lanza: `OsrmService` ya cae a línea recta por su
/// cuenta, y esta capa solo registra si el trazo que se dibuja es de calle o
/// de compás. [trazosReales] existe para poder decirlo en pantalla en vez de
/// hacer pasar una línea recta por una ruta.
library;

import 'package:flutter/foundation.dart';
import 'package:latlong2/latlong.dart';

import '../../../data/semilla/semilla_san_pedro_sula.dart';
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

  /// `true` desde que [preparar] arranca hasta que el ruteador contesta. La
  /// torre lo usa para decir "trazando" en vez de afirmar "trazo estimado"
  /// mientras todavía no se sabe: hasta que llega la respuesta, `trazosReales`
  /// vale 0 y esa cifra se leía como "no hay conexión al ruteador" aunque la
  /// petición siguiera en vuelo.
  bool _preparando = false;
  bool get preparando => _preparando;

  /// Se marca en [dispose]. `preparar` puede tardar varios segundos esperando a
  /// OSRM, y en ese rato la pantalla se puede cerrar: sin esta bandera, el
  /// `notifyListeners` de la respuesta tardía cae sobre un `ChangeNotifier` ya
  /// desechado y tumba la app con un error de framework.
  bool _desechado = false;

  /// Cuántas de las rutas se dibujan sobre calle real. Menos que [rutas.length]
  /// significa que hubo que estimar, y la pantalla lo dice.
  int trazosReales = 0;

  String? camionSeleccionado;

  /// Dónde abre el mapa: sobre la base de operaciones mientras no haya rutas
  /// armadas, y sobre la base de la primera ruta apenas la haya.
  LatLng get centro => rutas.isEmpty ? baseOperaciones : rutas.first.base;

  /// Arma la flota del día: pide los tres trazos y monta los camiones.
  ///
  /// Las tres peticiones salen **a la vez**, no una tras otra. En serie, un día
  /// sin red costaba tres esperas encadenadas —`OsrmService` aguanta 8 s por
  /// llamada antes de caer al trazo recto, así que la torre podía tardar 24 s
  /// en aparecer—; en paralelo el peor caso es una sola espera. El tiempo
  /// límite se queda donde estaba: acortarlo abarataría la espera a costa de
  /// tirar respuestas buenas de un servidor gratuito que a veces es lento.
  ///
  /// `Future.wait` **conserva el orden de la lista**, no el de llegada, y de
  /// eso depende que `camionesFlota[i]` siga emparejado con `delDia[i]`: El
  /// Rojo con la ruta del Centro, La Mula con la del Suroeste, El Chele con la
  /// del Norte. Recolectar por orden de respuesta le cambiaría la ruta a cada
  /// camión según cuál contestara primero.
  Future<void> preparar() async {
    if (_listo || _preparando || _desechado) return;

    _preparando = true;
    notifyListeners();

    final List<Ruta> delDia = rutasDeLaFlota();
    final int cuantas =
        camionesFlota.length < delDia.length ? camionesFlota.length : delDia.length;

    final List<TrazoRuta> trazados = await Future.wait<TrazoRuta>(<Future<TrazoRuta>>[
      for (int i = 0; i < cuantas; i++) _osrm.trazar(_puntosDe(delDia[i])),
    ]);

    if (_desechado) return;

    for (int i = 0; i < cuantas; i++) {
      final Ruta ruta = delDia[i];
      final TrazoRuta trazo = trazados[i];
      if (trazo.esReal) trazosReales++;

      rutas.add(ruta);
      trazos[ruta.id] = trazo.puntos;
      simulador.agregar(
        camion: camionesFlota[i],
        ruta: ruta,
        trazo: trazo.puntos,
      );
    }

    _preparando = false;
    _listo = true;
    notifyListeners();
  }

  /// Base → cada parada en orden → base. El regreso importa: el camión que ya
  /// entregó todo sigue existiendo y sigue en el mapa hasta que llega.
  static List<LatLng> _puntosDe(Ruta ruta) => <LatLng>[
        ruta.base,
        for (final Parada p in ruta.paradas) p.cliente.posicion,
        ruta.base,
      ];

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
    _desechado = true;
    simulador.pausar();
    simulador.dispose();
    // El cliente HTTP del ruteador es nuestro mientras viva la torre. Sin este
    // cierre queda una conexión abierta por cada vez que se entra a la
    // pantalla.
    _osrm.cerrar();
    super.dispose();
  }
}
