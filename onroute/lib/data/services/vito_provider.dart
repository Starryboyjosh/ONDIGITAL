/// Vito, el asistente de OnRoute.
///
/// ## Misma arquitectura que en OnStock y Credental
///
/// El proveedor de lenguaje es un detalle de infraestructura, intercambiable,
/// nunca el nombre que ve el vendedor: en la UI solo existe "Vito". Igual que
/// en `modules/vito` de OnStock, hay un [VitoProvider] con dos
/// implementaciones —[VitoMock] y [VitoRemoto]— y la app arranca con
/// [VitoProvider.desdeEntorno], que cae a mock si no hay motor configurado.
/// Vito nunca deja a la app sin respuesta por falta de red o de llave.
///
/// ## Por qué ni el nombre del proveedor vive en el código
///
/// Las tres variables (`VITO_API_KEY`, `VITO_BASE_URL`, `VITO_MODEL`) son
/// neutrales y ninguna trae un valor por defecto que nombre a una empresa. No
/// es cosmética: quien compila el APK elige el motor —una API en la nube hoy,
/// un modelo corriendo en el servidor del cliente mañana— y ese cambio no debe
/// tocar una sola línea de este archivo. Si el código trajera un endpoint por
/// defecto, ese proveedor quedaría de hecho cableado en el producto.
///
/// Los nombres son los mismos que usa `modules/vito` en Go, para que un solo
/// `.env` de ONDIGITAL sirva para todos los productos. `VITO_MODELO`, que fue
/// el nombre original de este lado, sigue funcionando como alias; si vienen
/// las dos, manda `VITO_MODEL`. Ver [VitoProvider.modeloDe].
///
/// `VITO_PROVIDER` decide el motor con el mismo vocabulario que el Go —`local`
/// y `nube`, más los alias históricos— y vacío significa autodetección. Ver
/// [VitoProvider.proveedorDe].
///
/// Una diferencia deliberada con el Go: allá un `VITO_MODEL` vacío se rellena
/// con el modelo por defecto del proveedor activo, porque esa capa conoce a su
/// proveedor y es su trabajo. OnRoute no tiene capa de proveedores, así que
/// inventarle un default aquí sería cablear una empresa dentro del producto:
/// sin modelo, sin nube. Es la arquitectura hablando, no un descuido.
///
/// ## Por qué además hay un filtro de salida
///
/// El prompt le pide a Vito que no diga con qué está hecho, pero un prompt es
/// una petición, no una garantía: hay motores que se presentan por su nombre a
/// la primera pregunta. [VitoProvider.marcaBlanca] pasa por encima de todo lo
/// que devuelve la nube antes de que llegue a la pantalla. Es la red debajo
/// del trapecio, y existe precisamente para el motor que ignora su prompt.
///
/// ## Por qué la llave llega por `--dart-define` y no vive en el repo
///
/// El `.env.example` de OnStock dice "solo en el servidor, no en el
/// navegador" porque ese Vito corre en un backend Go. OnRoute no tiene
/// servidor propio: es un APK que corre en el teléfono de quien lo instale.
/// Empacar una llave real ahí la convierte en una credencial que viaja con el
/// archivo. `--dart-define=VITO_API_KEY=...` la deja fuera del código fuente y
/// del historial de git; quien compila decide si la incluye. Para un APK de
/// emulador, uso interno, es la salida razonable — para una distribución real
/// haría falta un backend propio, como en OnStock.
library;

import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

/// Un turno de la conversación.
@immutable
class MensajeVito {
  const MensajeVito.usuario(this.texto) : esUsuario = true;
  const MensajeVito.vito(this.texto) : esUsuario = false;

  final String texto;
  final bool esUsuario;
}

/// Con qué motor contesta Vito. Es una decisión de infraestructura: el
/// vendedor nunca ve esta palabra, solo nota si Vito contesta con matices o
/// por reglas.
enum MotorVito {
  /// Reglas deterministas dentro de la app. Sin red, sin llave, sin costo.
  local,

  /// Un servicio compatible con `chat/completions`, sea una API pública o un
  /// motor corriendo en el servidor del propio cliente.
  nube,
}

/// Contrato mínimo: dado un contexto operativo del día y el historial de la
/// conversación, devuelve la siguiente respuesta de Vito.
abstract class VitoProvider {
  const VitoProvider();

  Future<String> responder({
    required String contextoOperativo,
    required List<MensajeVito> historial,
  });

  /// Arma el proveedor real si el entorno lo pide y trae con qué, o [VitoMock]
  /// si no. Igual regla que `vito.NewServiceFromEnv` en OnStock: Vito nunca
  /// queda mudo por falta de configuración, solo se vuelve determinista.
  ///
  /// `String.fromEnvironment` solo existe en tiempo de compilación, así que un
  /// test no puede moverle el entorno: por eso toda la decisión vive en
  /// [VitoProvider.desdeValores], que sí se puede probar.
  factory VitoProvider.desdeEntorno() {
    const String llave = String.fromEnvironment('VITO_API_KEY');
    const String base = String.fromEnvironment('VITO_BASE_URL');
    const String modelo = String.fromEnvironment('VITO_MODEL');
    const String modeloAlias = String.fromEnvironment('VITO_MODELO');
    const String proveedor = String.fromEnvironment('VITO_PROVIDER');
    return VitoProvider.desdeValores(
      llave: llave,
      baseUrl: base,
      modelo: modelo,
      modeloAlias: modeloAlias,
      proveedor: proveedor,
    );
  }

  /// La misma regla que [VitoProvider.desdeEntorno], pero con los valores en
  /// la mano en vez de cableados al compilador.
  factory VitoProvider.desdeValores({
    required String llave,
    required String baseUrl,
    required String modelo,
    String modeloAlias = '',
    String proveedor = '',
  }) {
    final String elegido = modeloDe(modelo, modeloAlias);
    final bool hayCredenciales = llave.trim().isNotEmpty &&
        baseUrl.trim().isNotEmpty &&
        elegido.isNotEmpty;
    if (proveedorDe(proveedor, hayCredenciales: hayCredenciales) ==
        MotorVito.local) {
      return const VitoMock();
    }
    return VitoRemoto(
      llave: llave.trim(),
      baseUrl: baseUrl.trim(),
      modelo: elegido,
    );
  }

  /// Qué motor quiere el operador, resuelto contra lo que hay para encenderlo.
  ///
  /// `VITO_PROVIDER` habla el mismo vocabulario que `modules/vito` en Go, para
  /// que un solo `.env` de ONDIGITAL valga para todos los productos: canónicos
  /// `local` y `nube`, con `offline`/`mock` y `cloud`/`api`/`opencode` como
  /// alias históricos. Cuatro reglas, y ninguna es cosmética:
  ///
  /// 1. **Vacío es autodetección**, el comportamiento de siempre: con llave,
  ///    URL y modelo se usa la nube; sin eso, el motor local. Es el default
  ///    correcto porque no obliga a escribir nada para que la app arranque.
  /// 2. **`local` explícito manda por encima de las credenciales.** Un `.env`
  ///    con llave completa y `VITO_PROVIDER=local` quiere decir "hoy no
  ///    salgas a la red", y hasta ahora OnRoute hacía justo lo contrario.
  /// 3. **`nube` no puede inventarse una llave.** Sin credenciales completas
  ///    cae al motor local: pedir la nube no la crea.
  /// 4. **Un valor desconocido cae a `local`, no a autodetección**, y deja
  ///    rastro en debug. `VITO_PROVIDER=nueb` es un dedazo; que un dedazo
  ///    encienda la nube en silencio —y gaste llamadas de API— es peor que
  ///    que la apague de forma visible.
  static MotorVito proveedorDe(
    String valor, {
    required bool hayCredenciales,
  }) {
    final String v = valor.trim().toLowerCase();
    if (v.isEmpty) {
      return hayCredenciales ? MotorVito.nube : MotorVito.local;
    }
    switch (v) {
      case 'local':
      case 'offline':
      case 'mock':
        return MotorVito.local;
      case 'nube':
      case 'cloud':
      case 'api':
      case 'opencode':
        return hayCredenciales ? MotorVito.nube : MotorVito.local;
      default:
        debugPrint(
          'Vito: VITO_PROVIDER="$valor" no se reconoce. Se usa el motor local. '
          'Valores válidos: local, nube.',
        );
        return MotorVito.local;
    }
  }

  /// Qué motor se le pide a la nube. `VITO_MODEL` es el nombre canónico —el
  /// que comparten `VITO_ENABLED`, `VITO_PROVIDER` y `VITO_LOCALE` en el resto
  /// de ONDIGITAL— y `VITO_MODELO` es el alias que quedó de la primera versión
  /// de OnRoute. Gana el primero que traiga algo, empezando por el canónico:
  /// si un `.env` viejo y uno nuevo se cruzan en la misma máquina, la máquina
  /// no tiene que adivinar cuál manda.
  static String modeloDe(String primario, String alias) {
    final String p = primario.trim();
    return p.isNotEmpty ? p : alias.trim();
  }

  /// Borra de una respuesta cualquier rastro del proveedor antes de que llegue
  /// a la pantalla. Tres cosas que se hacen mal en todas partes y aquí no:
  ///
  /// 1. **Reemplaza todas las apariciones, no la primera.** En Dart eso es
  ///    `replaceAll`; usar `replaceFirst` dejaría pasar el segundo "soy X" del
  ///    mismo párrafo. (En JavaScript el mismo error se comete olvidando la
  ///    bandera `g`.)
  /// 2. **Filtra por familia, no por versión.** `gpt-4` cableado deja pasar
  ///    `GPT-5`, y una lista sin `Gemini` ni `DeepSeek` deja pasar los dos. Se
  ///    filtra la familia entera con su versión pegada, sea cual sea.
  /// 3. **Palabra completa.** Con `\b` a los lados, para no morder dentro de
  ///    otra palabra.
  ///
  /// `llama` queda deliberadamente fuera: en español "se llama Ana" o "la
  /// llama del camión" son frases normales, y filtrarla destrozaría la
  /// respuesta mucho más seguido de lo que taparía una fuga.
  static String marcaBlanca(String texto) {
    String salida = texto;
    for (final MapEntry<RegExp, String> regla in _reglasMarca.entries) {
      salida = salida.replaceAll(regla.key, regla.value);
    }
    return salida;
  }

  /// Familias conocidas y con qué se sustituyen.
  ///
  /// La versión pegada al nombre entra en la captura para que no quede
  /// colgando un `-5` huérfano: se acepta la forma unida (`gpt-4o`,
  /// `deepseek-v3`) y la separada solo cuando lo que sigue parece una versión
  /// (`GPT 5`, `Gemini 2.5`). Un espacio seguido de una palabra normal **no**
  /// entra, para no comerse la palabra siguiente de una frase en español.
  static final Map<RegExp, String> _reglasMarca = <RegExp, String>{
    RegExp(r'\bchat\s?gpt\b' + _version, caseSensitive: false): 'Vito',
    RegExp(r'\bgpt' + _version, caseSensitive: false): 'Vito',
    RegExp(
      r'\bclaude(?:\s+(?:opus|sonnet|haiku|instant))?' + _version,
      caseSensitive: false,
    ): 'Vito',
    RegExp(r'\banthropic\b', caseSensitive: false): 'Vito',
    RegExp(r'\bopen\s?ai\b', caseSensitive: false): 'Vito',
    RegExp(r'\bgemini' + _version, caseSensitive: false): 'Vito',
    RegExp(r'\bdeep\s?seek' + _version, caseSensitive: false): 'Vito',
    RegExp(r'\bmistral' + _version, caseSensitive: false): 'Vito',
    RegExp(r'\bqwen' + _version, caseSensitive: false): 'Vito',
    RegExp(r'\bgrok' + _version, caseSensitive: false): 'Vito',
    RegExp(r'\bcopilot\b', caseSensitive: false): 'Vito',
    RegExp(r'\bopen\s?router\b', caseSensitive: false): 'Vito',
    RegExp(r'\bopen\s?code\b', caseSensitive: false): 'Vito',
    RegExp(r'\bllms?\b', caseSensitive: false): 'asistente',
    RegExp(
      r'\bmodelos?\s+de\s+(?:lenguaje|ia)\b',
      caseSensitive: false,
    ): 'asistente',
  };

  /// Cola opcional de versión: unida por guión, punto o guión bajo
  /// (`-4o`, `.5`, `_v3`), o separada por espacio si empieza por dígito o por
  /// `v` y dígito (`GPT 5`, `Gemini 2.5`, `Qwen v3`).
  static const String _version = r'(?:[-._][\w.]+)*(?:\s+v?\d[\w.]*)?';
}

/// Respuestas por reglas, sin red. Es lo que corre en el emulador si nadie
/// pasó `--dart-define` con la configuración, y lo que sigue corriendo si la
/// llamada real falla: el vendedor no se queda sin Vito por falta de señal.
class VitoMock extends VitoProvider {
  const VitoMock();

  @override
  Future<String> responder({
    required String contextoOperativo,
    required List<MensajeVito> historial,
  }) async {
    final String pregunta = historial.isEmpty ? '' : historial.last.texto;
    final String p = pregunta.toLowerCase();

    if (p.contains('brecha') || p.contains('cuadr') || p.contains('falt')) {
      return 'Con el resumen de hoy: $contextoOperativo\n\n'
          'Revisa el cierre en la pestaña Cierre — ahí Vito ya señala cuál '
          'de los tres libros no cuadra y por cuánto.';
    }
    if (p.contains('parada') || p.contains('ruta')) {
      return 'Puedo ver el estado de la ruta en el resumen: $contextoOperativo. '
          '¿Sobre cuál parada quieres el detalle?';
    }
    // Sin señal, Vito contesta corto y con lo que ya tiene cargado. El texto
    // habla de lo que el vendedor puede comprobar —hay o no hay señal— y
    // nunca de cómo está hecho Vito por dentro.
    return 'Ahorita estoy sin señal, así que te contesto con lo que ya tengo '
        'cargado del día: $contextoOperativo\n\n'
        'Cuando agarres señal te puedo dar el detalle parada por parada.';
  }
}

/// Cliente compatible con el estándar `chat/completions`, igual contrato que
/// `modules/vito`: `POST {baseUrl}/chat/completions` con
/// `Authorization: Bearer`. Sirve tanto para una API en la nube como para un
/// motor corriendo en el servidor del cliente, que es justo el punto.
class VitoRemoto extends VitoProvider {
  const VitoRemoto({
    required this.llave,
    required this.baseUrl,
    required this.modelo,
    this.cliente,
  });

  final String llave;
  final String baseUrl;
  final String modelo;
  final http.Client? cliente;

  static const String _sistema =
      'Eres Vito, el asistente de OnRoute, una app de autoventa para '
      'vendedores de ruta en Honduras. Respondes en español hondureño, con '
      'tuteo, breve y operativo. Nunca inventas cifras: solo usas las que '
      'te da el resumen del día. Nunca acusas a nadie de una brecha de '
      'dinero: describes el hecho verificable ("faltan L 430 del sobre"), '
      'nunca la intención de una persona. Te llamas Vito y no mencionas '
      'nunca con qué tecnología estás hecho.';

  @override
  Future<String> responder({
    required String contextoOperativo,
    required List<MensajeVito> historial,
  }) async {
    final http.Client http_ = cliente ?? http.Client();
    try {
      final List<Map<String, String>> mensajes = <Map<String, String>>[
        <String, String>{
          'role': 'system',
          'content': '$_sistema\n\nResumen del día:\n$contextoOperativo',
        },
        for (final MensajeVito m in historial)
          <String, String>{
            'role': m.esUsuario ? 'user' : 'assistant',
            'content': m.texto,
          },
      ];

      final http.Response r = await http_
          .post(
            Uri.parse('$baseUrl/chat/completions'),
            headers: <String, String>{
              'Authorization': 'Bearer $llave',
              'Content-Type': 'application/json',
            },
            body: jsonEncode(<String, Object?>{
              'model': modelo,
              'messages': mensajes,
              'max_tokens': 400,
            }),
          )
          .timeout(const Duration(seconds: 20));

      if (r.statusCode != 200) {
        return await const VitoMock().responder(
          contextoOperativo: contextoOperativo,
          historial: historial,
        );
      }

      final Map<String, dynamic> cuerpo =
          jsonDecode(utf8.decode(r.bodyBytes)) as Map<String, dynamic>;
      final String? texto = ((cuerpo['choices'] as List<dynamic>?)
              ?.cast<Map<String, dynamic>>()
              .firstOrNull?['message'] as Map<String, dynamic>?)?['content']
          as String?;
      if (texto == null || texto.trim().isEmpty) {
        return await const VitoMock().responder(
          contextoOperativo: contextoOperativo,
          historial: historial,
        );
      }
      // Todo lo que viene de la nube pasa por el filtro. El prompt de arriba
      // ya se lo pidió; esto es lo que queda cuando el motor no hace caso.
      return VitoProvider.marcaBlanca(texto.trim());
    } catch (_) {
      // La red nunca es obligatoria, igual que en `osrm_service.dart`: si el
      // motor no contesta, Vito cae al mock en vez de dejar la conversación
      // colgada.
      return const VitoMock().responder(
        contextoOperativo: contextoOperativo,
        historial: historial,
      );
    } finally {
      if (cliente == null) http_.close();
    }
  }
}
