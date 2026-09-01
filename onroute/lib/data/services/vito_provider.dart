/// Vito, el asistente de OnRoute.
///
/// ## Misma arquitectura que en OnStock y Credental
///
/// El proveedor de lenguaje es un detalle de infraestructura, intercambiable,
/// nunca el nombre que ve el vendedor: en la UI solo existe "Vito". Igual que
/// en `modules/vito` de OnStock, hay un [VitoProvider] con dos
/// implementaciones —[VitoMock] y [VitoOpenCode]— y la app arranca con
/// [VitoProvider.desdeEntorno], que cae a mock si no hay llave configurada.
/// Vito nunca deja a la app sin respuesta por falta de red o de llave.
///
/// ## Por qué la llave llega por `--dart-define` y no vive en el repo
///
/// El `.env.example` de OnStock dice "solo en el servidor, no en el
/// navegador" porque ese Vito corre en un backend Go. OnRoute no tiene
/// servidor propio: es un APK que corre en el teléfono de quien lo instale.
/// Empacar una llave real ahí la convierte en una credencial que viaja con el
/// archivo. `--dart-define=VITO_OPENCODE_API_KEY=...` la deja fuera del
/// código fuente y del historial de git; quien compila decide si la incluye.
/// Para un APK de emulador, uso interno, es la salida razonable — para una
/// distribución real haría falta un backend propio, como en OnStock.
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

/// Contrato mínimo: dado un contexto operativo del día y el historial de la
/// conversación, devuelve la siguiente respuesta de Vito.
abstract class VitoProvider {
  const VitoProvider();

  Future<String> responder({
    required String contextoOperativo,
    required List<MensajeVito> historial,
  });

  /// Arma el proveedor real si hay llave, o [VitoMock] si no. Igual regla que
  /// `vito.NewServiceFromEnv` en OnStock: Vito nunca queda mudo por falta de
  /// configuración, solo se vuelve determinista.
  factory VitoProvider.desdeEntorno() {
    const String llave = String.fromEnvironment('VITO_OPENCODE_API_KEY');
    if (llave.isEmpty) return const VitoMock();
    const String base = String.fromEnvironment(
      'VITO_OPENCODE_BASE_URL',
      defaultValue: 'https://openrouter.ai/api/v1',
    );
    const String modelo = String.fromEnvironment(
      'VITO_OPENCODE_MODEL',
      defaultValue: 'openai/gpt-4o-mini',
    );
    return VitoOpenCode(llave: llave, baseUrl: base, modelo: modelo);
  }
}

/// Respuestas por reglas, sin red. Es lo que corre en el emulador si nadie
/// pasó `--dart-define` con la llave, y lo que sigue corriendo si la llamada
/// real falla: el vendedor no se queda sin Vito por falta de señal.
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
    return 'Estoy corriendo sin conexión al modelo de lenguaje, así que '
        'contesto con reglas fijas por ahora. Esto es lo que tengo del día: '
        '$contextoOperativo';
  }
}

/// Cliente OpenAI-compatible, igual contrato que `modules/vito`:
/// `POST {baseUrl}/chat/completions` con `Authorization: Bearer`.
class VitoOpenCode extends VitoProvider {
  const VitoOpenCode({
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
      'nunca la intención de una persona.';

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
      return texto.trim();
    } catch (_) {
      // La red nunca es obligatoria, igual que en `osrm_service.dart`: si
      // OpenRouter no contesta, Vito cae al mock en vez de dejar la
      // conversación colgada.
      return const VitoMock().responder(
        contextoOperativo: contextoOperativo,
        historial: historial,
      );
    } finally {
      if (cliente == null) http_.close();
    }
  }
}
