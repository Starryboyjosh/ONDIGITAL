/// Quién maneja. Hasta ahora el conductor era un `String` suelto dentro de
/// [Camion]: se podía pintar en el mapa y nada más. No se podía dar de alta a
/// alguien nuevo, ni corregirle el teléfono, ni saber a quién llamar cuando el
/// camión se atrasa, ni sacar de la rotación a quien ya no maneja.
///
/// ## Por qué el nombre sigue viviendo también en el camión
///
/// [Camion.conductor] se queda como el nombre que sale a pantalla y acá vive la
/// persona completa. No es duplicación por descuido: la torre tiene que poder
/// rotular un camión aunque nadie haya abierto Ajustes, y el registro tiene que
/// poder sobrevivir a que un camión salga del taller. El puente entre los dos
/// es [Camion.conductorId].
library;

/// Si la persona sigue en la rotación.
///
/// No hay borrado en este registro. Un conductor que se fue sigue apareciendo
/// en las rutas que ya manejó, y borrarlo dejaría esas rutas firmadas por
/// nadie; darlo de baja lo saca de las asignaciones y conserva la historia.
enum EstadoConductor {
  activo('Activo'),
  inactivo('Inactivo');

  const EstadoConductor(this.etiqueta);

  final String etiqueta;
}

/// Clase de licencia según la Dirección Nacional de Vialidad y Transporte.
///
/// Solo las dos que importan en reparto: un camión de carga con parrilla pide
/// pesada, y las motos de mensajería piden liviana. Quien tenga liviana no
/// puede quedar asignado a un camión, y el formulario lo dice antes de dejar
/// guardar la asignación.
enum TipoLicencia {
  liviana('Liviana'),
  pesada('Pesada');

  const TipoLicencia(this.etiqueta);

  final String etiqueta;
}

/// Lo que la torre pinta sobre un camión sin tripulación asignada.
///
/// Es una constante y no un literal suelto porque lo escriben dos lugares —el
/// repositorio al liberar un camión y la semilla— y basta que uno diga "sin
/// conductor" en minúscula para que la pantalla muestre dos vacíos distintos.
const String sinConductorAsignado = 'Sin conductor asignado';

/// Una persona del registro de conductores.
final class Conductor {
  const Conductor({
    required this.id,
    required this.nombre,
    required this.dni,
    required this.telefono,
    required this.licencia,
    this.estado = EstadoConductor.activo,
    this.camionId,
  });

  final String id;

  /// Nombre completo, tal como sale en pantalla y en la voz de Vito.
  final String nombre;

  /// Documento Nacional de Identificación: trece dígitos, sin guiones. Se
  /// guarda crudo y se formatea al mostrar, para que buscar por DNI no dependa
  /// de cómo lo escribió quien lo capturó.
  final String dni;

  /// Ocho dígitos hondureños, sin el `+504`. El prefijo lo pone la pantalla:
  /// nadie en el patio dicta su número con código de país.
  final String telefono;

  final TipoLicencia licencia;
  final EstadoConductor estado;

  /// El camión que tiene asignado hoy, o `null` si anda sin unidad.
  final String? camionId;

  bool get activo => estado == EstadoConductor.activo;

  /// Puede manejar un camión de reparto. La licencia liviana alcanza para una
  /// moto, no para la unidad con parrilla.
  bool get puedeConducirCamion => licencia == TipoLicencia.pesada;

  /// El DNI como se lee en voz alta y como aparece impreso: `0501-1990-01234`.
  String get dniFormateado => dni.length == 13
      ? '${dni.substring(0, 4)}-${dni.substring(4, 8)}-${dni.substring(8)}'
      : dni;

  /// El teléfono listo para marcar desde Honduras: `+504 9876-5432`.
  String get telefonoFormateado => telefono.length == 8
      ? '+504 ${telefono.substring(0, 4)}-${telefono.substring(4)}'
      : telefono;

  /// Iniciales para el avatar de la lista. Dos letras como mucho: tres ya no se
  /// leen dentro de un círculo de 40 px.
  String get iniciales {
    final List<String> partes = nombre
        .trim()
        .split(RegExp(r'\s+'))
        .where((String p) => p.isNotEmpty)
        .toList();
    if (partes.isEmpty) return '?';
    if (partes.length == 1) {
      final String p = partes.first;
      return (p.length >= 2 ? p.substring(0, 2) : p).toUpperCase();
    }
    return '${partes.first[0]}${partes[1][0]}'.toUpperCase();
  }

  Conductor copiaCon({
    String? nombre,
    String? dni,
    String? telefono,
    TipoLicencia? licencia,
    EstadoConductor? estado,
    String? camionId,
    bool limpiarCamion = false,
  }) =>
      Conductor(
        id: id,
        nombre: nombre ?? this.nombre,
        dni: dni ?? this.dni,
        telefono: telefono ?? this.telefono,
        licencia: licencia ?? this.licencia,
        estado: estado ?? this.estado,
        camionId: limpiarCamion ? null : (camionId ?? this.camionId),
      );

  @override
  bool operator ==(Object other) => other is Conductor && other.id == id;

  @override
  int get hashCode => id.hashCode;

  @override
  String toString() => 'Conductor($id, $nombre)';
}

/// Las reglas de un formulario de conductor, en un solo lugar.
///
/// Devuelven el mensaje de error en español o `null` si el campo pasa. Viven
/// acá y no dentro del `TextField` porque el repositorio las vuelve a correr
/// antes de guardar: un formulario es una cortesía, no una garantía —quien
/// llame al repositorio desde otra pantalla merece el mismo rechazo.
abstract final class ValidacionConductor {
  /// El DNI hondureño tiene exactamente trece dígitos: cuatro de código de
  /// municipio, cuatro de año de nacimiento y cinco de correlativo.
  static const int digitosDni = 13;

  /// Los teléfonos hondureños tienen ocho dígitos. El `+504` no se captura.
  static const int digitosTelefono = 8;

  /// Primeros dígitos válidos: 2 y 4 fijos, 3/7/8/9 móviles. Un número que
  /// empieza en 0, 1, 5 o 6 no existe en Honduras y no sirve para llamar a
  /// quien va manejando.
  static const String prefijosTelefono = '234789';

  static String? nombre(String valor) {
    final String v = valor.trim();
    if (v.isEmpty) return 'Escribí el nombre del conductor';
    if (v.length < 3) return 'El nombre es demasiado corto';
    if (!v.contains(RegExp(r'\s'))) return 'Poné nombre y apellido';
    return null;
  }

  static String? dni(String valor) {
    final String v = valor.trim();
    if (v.isEmpty) return 'Escribí el DNI';
    if (!RegExp(r'^\d+$').hasMatch(v)) return 'El DNI lleva solo números';
    if (v.length != digitosDni) {
      return 'El DNI son $digitosDni dígitos, van ${v.length}';
    }
    return null;
  }

  static String? telefono(String valor) {
    final String v = valor.trim();
    if (v.isEmpty) return 'Escribí el teléfono';
    if (!RegExp(r'^\d+$').hasMatch(v)) return 'El teléfono lleva solo números';
    if (v.length != digitosTelefono) {
      return 'El teléfono son $digitosTelefono dígitos, van ${v.length}';
    }
    if (!prefijosTelefono.contains(v[0])) {
      return 'Un número de Honduras no empieza en ${v[0]}';
    }
    return null;
  }

  /// Deja solo dígitos. Se aplica antes de guardar para que `0501-1990-01234`
  /// y `0501199001234` sean el mismo DNI y el registro no acepte dos.
  static String soloDigitos(String valor) =>
      valor.replaceAll(RegExp(r'[^\d]'), '');

  /// El formulario entero pasa. Se usa para habilitar el botón de guardar sin
  /// tener que repetir las tres llamadas en la vista.
  static bool formularioValido({
    required String nombre,
    required String dni,
    required String telefono,
  }) =>
      ValidacionConductor.nombre(nombre) == null &&
      ValidacionConductor.dni(dni) == null &&
      ValidacionConductor.telefono(telefono) == null;
}
