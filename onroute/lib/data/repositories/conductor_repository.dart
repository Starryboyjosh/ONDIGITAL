/// El registro de conductores: quién maneja, quién anda libre y quién ya no
/// está en la rotación.
///
/// ## Por qué el registro también es dueño de la flota
///
/// Asignar a alguien a un camión toca dos cosas a la vez: el conductor gana un
/// `camionId` y el camión gana un nombre y un [Camion.conductorId]. Si vivieran
/// en dos dueños distintos, tarde o temprano una pantalla actualizaría uno y no
/// el otro, y la torre estaría rotulando «Marvin Aguilar» sobre un camión que
/// el registro cree vacío. Es la misma razón por la que `RutaRepository` hace la
/// entrega y el descargue de la parrilla en una sola operación.
///
/// ## Por qué nada se borra
///
/// [darDeBaja] deja al conductor en [EstadoConductor.inactivo] y le suelta el
/// camión. Borrarlo de verdad dejaría huérfanas las rutas que esa persona ya
/// manejó: el nombre seguiría impreso en la liquidación de ayer sin nadie
/// detrás. Un registro operativo tiene memoria; una lista de nombres, no.
library;

import 'package:flutter/foundation.dart';

import '../../domain/models/camion.dart';
import '../../domain/models/conductor.dart';

/// Por qué no se pudo hacer un cambio en el registro.
enum FalloConductor {
  /// El nombre, el DNI o el teléfono no pasan [ValidacionConductor].
  datosInvalidos,

  /// Ya hay otra persona con ese DNI. El DNI es la identidad real de alguien en
  /// Honduras: dos filas con el mismo número son la misma persona capturada dos
  /// veces, y a la hora de asignar nadie sabe cuál es la buena.
  dniRepetido,

  /// El conductor no existe en el registro.
  noExiste,

  /// El camión no existe en la flota.
  camionNoExiste,

  /// Se quiso asignar un camión a alguien dado de baja. Primero se reactiva.
  conductorInactivo,

  /// La licencia no alcanza para la unidad. Liviana sirve para la moto de
  /// mandados, no para el camión con parrilla.
  licenciaInsuficiente,
}

/// Resultado de un cambio en el registro.
///
/// Se devuelve en vez de lanzar por la misma razón que en `RutaRepository`:
/// «ese DNI ya está» no es un error de programación, es alguien capturando dos
/// veces a la misma persona un lunes por la mañana. La pantalla lo tiene que
/// poder contar con calma.
@immutable
class ResultadoConductor {
  const ResultadoConductor.ok(this.conductor)
      : fallo = null,
        mensaje = null;

  const ResultadoConductor.error(this.fallo, this.mensaje) : conductor = null;

  final FalloConductor? fallo;

  /// Qué decirle a quien está frente a la pantalla. Se guarda acá y no se arma
  /// en la vista porque el motivo exacto lo sabe el repositorio: es él quien
  /// vio el DNI repetido y sabe de quién era.
  final String? mensaje;

  /// El conductor tal como quedó guardado. `null` cuando hubo fallo.
  final Conductor? conductor;

  bool get exito => fallo == null;
}

class ConductorRepository extends ChangeNotifier {
  ConductorRepository({
    required List<Conductor> conductores,
    required List<Camion> camiones,
  })  : _conductores = List<Conductor>.of(conductores),
        _camiones = List<Camion>.of(camiones);

  final List<Conductor> _conductores;
  final List<Camion> _camiones;

  /// El registro completo, incluidos los dados de baja. Quien quiera solo a
  /// quienes manejan hoy usa [activos].
  List<Conductor> get conductores => List<Conductor>.unmodifiable(_conductores);

  List<Camion> get camiones => List<Camion>.unmodifiable(_camiones);

  List<Conductor> get activos =>
      _conductores.where((Conductor c) => c.activo).toList();

  /// Quienes pueden recibir una unidad ahora mismo: activos, con licencia
  /// pesada y sin camión encima.
  List<Conductor> get disponibles => _conductores
      .where((Conductor c) =>
          c.activo && c.puedeConducirCamion && c.camionId == null)
      .toList();

  Conductor? porId(String id) {
    for (final Conductor c in _conductores) {
      if (c.id == id) return c;
    }
    return null;
  }

  Camion? camionPorId(String id) {
    for (final Camion c in _camiones) {
      if (c.id == id) return c;
    }
    return null;
  }

  /// Quién maneja ese camión hoy, o `null` si nadie.
  Conductor? conductorDelCamion(String camionId) {
    for (final Conductor c in _conductores) {
      if (c.camionId == camionId) return c;
    }
    return null;
  }

  /// Da de alta a alguien nuevo. Sin camión: la asignación es un paso aparte y
  /// deliberado, porque quitarle la unidad a otra persona no es algo que deba
  /// pasar de refilón mientras se captura un teléfono.
  ResultadoConductor registrar({
    required String nombre,
    required String dni,
    required String telefono,
    required TipoLicencia licencia,
  }) {
    final String nom = nombre.trim();
    final String doc = ValidacionConductor.soloDigitos(dni);
    final String tel = ValidacionConductor.soloDigitos(telefono);

    final ResultadoConductor? malo = _revisarCampos(nom, doc, tel);
    if (malo != null) return malo;

    final Conductor? repetido = _porDni(doc, exceptoId: null);
    if (repetido != null) {
      return ResultadoConductor.error(
        FalloConductor.dniRepetido,
        'Ese DNI ya está registrado a nombre de ${repetido.nombre}',
      );
    }

    final Conductor nuevo = Conductor(
      id: _siguienteId(),
      nombre: nom,
      dni: doc,
      telefono: tel,
      licencia: licencia,
    );
    _conductores.add(nuevo);
    notifyListeners();
    return ResultadoConductor.ok(nuevo);
  }

  /// Corrige los datos de alguien que ya está. No toca ni el estado ni la
  /// asignación: para eso están [asignar], [liberar] y [darDeBaja].
  ResultadoConductor editar({
    required String id,
    required String nombre,
    required String dni,
    required String telefono,
    required TipoLicencia licencia,
  }) {
    final int i = _indice(id);
    if (i < 0) return _noExiste;

    final String nom = nombre.trim();
    final String doc = ValidacionConductor.soloDigitos(dni);
    final String tel = ValidacionConductor.soloDigitos(telefono);

    final ResultadoConductor? malo = _revisarCampos(nom, doc, tel);
    if (malo != null) return malo;

    final Conductor? repetido = _porDni(doc, exceptoId: id);
    if (repetido != null) {
      return ResultadoConductor.error(
        FalloConductor.dniRepetido,
        'Ese DNI ya está registrado a nombre de ${repetido.nombre}',
      );
    }

    Conductor actualizado = _conductores[i].copiaCon(
      nombre: nom,
      dni: doc,
      telefono: tel,
      licencia: licencia,
    );

    // Bajar la licencia a liviana mientras se lleva un camión encima dejaría a
    // alguien conduciendo una unidad que ya no puede conducir. Se le suelta el
    // camión en la misma operación y el camión queda visiblemente sin
    // tripulación, que es exactamente lo que pasó.
    final String? camion = actualizado.camionId;
    if (camion != null && !actualizado.puedeConducirCamion) {
      _liberarCamion(camion);
      actualizado = actualizado.copiaCon(limpiarCamion: true);
    }

    _conductores[i] = actualizado;
    notifyListeners();
    return ResultadoConductor.ok(actualizado);
  }

  /// Pone a alguien al volante de un camión.
  ///
  /// Es una sola operación con tres efectos porque los tres tienen que pasar o
  /// ninguno: quien tenía ese camión lo suelta, quien lo recibe suelta el suyo,
  /// y el camión cambia de nombre.
  ResultadoConductor asignar({
    required String conductorId,
    required String camionId,
  }) {
    final int i = _indice(conductorId);
    if (i < 0) return _noExiste;

    final int j = _indiceCamion(camionId);
    if (j < 0) {
      return const ResultadoConductor.error(
        FalloConductor.camionNoExiste,
        'Ese camión no está en la flota',
      );
    }

    final Conductor c = _conductores[i];
    if (!c.activo) {
      return ResultadoConductor.error(
        FalloConductor.conductorInactivo,
        '${c.nombre} está dado de baja. Reactivalo antes de asignarle unidad',
      );
    }
    if (!c.puedeConducirCamion) {
      return ResultadoConductor.error(
        FalloConductor.licenciaInsuficiente,
        '${c.nombre} tiene licencia ${c.licencia.etiqueta.toLowerCase()} y el '
        'camión pide pesada',
      );
    }
    if (c.camionId == camionId) return ResultadoConductor.ok(c);

    // Quien venía manejando ese camión se queda sin unidad, no se borra.
    final Conductor? anterior = conductorDelCamion(camionId);
    if (anterior != null) {
      _conductores[_indice(anterior.id)] =
          anterior.copiaCon(limpiarCamion: true);
    }

    // Y el camión que este conductor traía se queda sin nadie.
    final String? suyo = c.camionId;
    if (suyo != null) _liberarCamion(suyo);

    final Conductor asignado = c.copiaCon(camionId: camionId);
    _conductores[i] = asignado;
    _camiones[j] = _camiones[j].conConductor(
      conductor: asignado.nombre,
      conductorId: asignado.id,
    );

    notifyListeners();
    return ResultadoConductor.ok(asignado);
  }

  /// Le quita la unidad a alguien sin sacarlo del registro. Es lo que pasa
  /// cuando el camión entra al taller y el conductor sigue trabajando.
  ResultadoConductor liberar(String conductorId) {
    final int i = _indice(conductorId);
    if (i < 0) return _noExiste;

    final Conductor c = _conductores[i];
    final String? camion = c.camionId;
    if (camion == null) return ResultadoConductor.ok(c);

    _liberarCamion(camion);
    final Conductor libre = c.copiaCon(limpiarCamion: true);
    _conductores[i] = libre;
    notifyListeners();
    return ResultadoConductor.ok(libre);
  }

  /// Baja lógica: sale de la rotación, suelta el camión y se queda en la lista
  /// marcado como inactivo. Nunca se borra —ver la nota de la librería.
  ResultadoConductor darDeBaja(String conductorId) {
    final int i = _indice(conductorId);
    if (i < 0) return _noExiste;

    final Conductor c = _conductores[i];
    final String? camion = c.camionId;
    if (camion != null) _liberarCamion(camion);

    final Conductor baja = c.copiaCon(
      estado: EstadoConductor.inactivo,
      limpiarCamion: true,
    );
    _conductores[i] = baja;
    notifyListeners();
    return ResultadoConductor.ok(baja);
  }

  /// Vuelve a la rotación. Regresa sin camión: la unidad que tenía ya se la
  /// dieron a alguien más mientras no estaba.
  ResultadoConductor reactivar(String conductorId) {
    final int i = _indice(conductorId);
    if (i < 0) return _noExiste;

    final Conductor activo = _conductores[i].copiaCon(
      estado: EstadoConductor.activo,
      limpiarCamion: true,
    );
    _conductores[i] = activo;
    notifyListeners();
    return ResultadoConductor.ok(activo);
  }

  // ── Interno ────────────────────────────────────────────────────────────

  static const ResultadoConductor _noExiste = ResultadoConductor.error(
    FalloConductor.noExiste,
    'Ese conductor ya no está en el registro',
  );

  ResultadoConductor? _revisarCampos(String nombre, String dni, String tel) {
    final String? error = ValidacionConductor.nombre(nombre) ??
        ValidacionConductor.dni(dni) ??
        ValidacionConductor.telefono(tel);
    if (error == null) return null;
    return ResultadoConductor.error(FalloConductor.datosInvalidos, error);
  }

  Conductor? _porDni(String dni, {required String? exceptoId}) {
    for (final Conductor c in _conductores) {
      if (c.dni == dni && c.id != exceptoId) return c;
    }
    return null;
  }

  int _indice(String id) =>
      _conductores.indexWhere((Conductor c) => c.id == id);

  int _indiceCamion(String id) => _camiones.indexWhere((Camion c) => c.id == id);

  /// Deja el camión rotulado como lo que es: una unidad sin tripulación. El
  /// nombre no se borra a cadena vacía porque la torre lo pinta tal cual, y un
  /// marcador sin texto se lee como un error de la app, no como un camión libre.
  void _liberarCamion(String camionId) {
    final int j = _indiceCamion(camionId);
    if (j < 0) return;
    _camiones[j] = _camiones[j].conConductor(
      conductor: sinConductorAsignado,
    );
  }

  /// `con-05`, `con-06`… Se calcula sobre el máximo y no sobre la longitud:
  /// con una baja de por medio la longitud repetiría un id que ya existe.
  String _siguienteId() {
    int mayor = 0;
    for (final Conductor c in _conductores) {
      final int? n = int.tryParse(c.id.replaceAll(RegExp(r'[^\d]'), ''));
      if (n != null && n > mayor) mayor = n;
    }
    return 'con-${(mayor + 1).toString().padLeft(2, '0')}';
  }
}
