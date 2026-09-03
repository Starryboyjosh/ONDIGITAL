/// Pruebas de la voz de Vito. No prueban el widget: prueban que `redactar`
/// produce texto correcto, completo y sin acusaciones, para los 11 tipos de
/// [Hallazgo], y que ninguna de las dos superficies que hablan —el analista y
/// el chat— deja escapar el nombre de un proveedor de IA ni un identificador
/// interno.
library;

import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:onroute/data/repositories/ruta_repository.dart';
import 'package:onroute/data/semilla/semilla_san_pedro_sula.dart';
import 'package:onroute/data/services/vito_provider.dart';
import 'package:onroute/domain/logic/vito_analista.dart';
import 'package:onroute/domain/models/dinero.dart';
import 'package:onroute/ui/core/format/formatos.dart';
import 'package:onroute/ui/features/vito/views/vito_chat_view.dart';
import 'package:onroute/ui/features/vito/vito_voz.dart';

/// Un hallazgo mínimo de cada tipo, con los campos que `redactar` necesita
/// para no explotar. Los montos son arbitrarios salvo donde una prueba
/// puntual los fija.
Hallazgo _hallazgoDe(TipoHallazgo tipo) {
  switch (tipo) {
    case TipoHallazgo.cajaCorta:
      return const Hallazgo(
        tipo: TipoHallazgo.cajaCorta,
        severidad: Severidad.critico,
        esperado: Dinero.lps(4320),
        real: Dinero.lps(3890),
        diferencia: Dinero.lps(430),
      );
    case TipoHallazgo.cajaSobrada:
      return const Hallazgo(
        tipo: TipoHallazgo.cajaSobrada,
        severidad: Severidad.atencion,
        esperado: Dinero.lps(1000),
        real: Dinero.lps(1050),
        diferencia: Dinero.lps(50),
      );
    case TipoHallazgo.entregaSinRegistro:
      return const Hallazgo(
        tipo: TipoHallazgo.entregaSinRegistro,
        severidad: Severidad.critico,
        esperado: Dinero.lps(1000),
        real: Dinero.lps(700),
        diferencia: Dinero.lps(300),
      );
    case TipoHallazgo.cargaFaltante:
      return const Hallazgo(
        tipo: TipoHallazgo.cargaFaltante,
        severidad: Severidad.critico,
        unidades: 3,
        diferencia: Dinero.lps(450),
      );
    case TipoHallazgo.cargaSobrante:
      return const Hallazgo(
        tipo: TipoHallazgo.cargaSobrante,
        severidad: Severidad.atencion,
        unidades: 2,
        diferencia: Dinero.lps(300),
      );
    case TipoHallazgo.conteoPendiente:
      return const Hallazgo(
        tipo: TipoHallazgo.conteoPendiente,
        severidad: Severidad.atencion,
      );
    case TipoHallazgo.productoNoAlcanza:
      return const Hallazgo(
        tipo: TipoHallazgo.productoNoAlcanza,
        severidad: Severidad.atencion,
        unidades: 5,
        sku: 'galleta-maria',
        diferencia: Dinero.lps(250),
      );
    case TipoHallazgo.creditoAlto:
      return const Hallazgo(
        tipo: TipoHallazgo.creditoAlto,
        severidad: Severidad.atencion,
        esperado: Dinero.lps(2000),
        real: Dinero.lps(800),
        diferencia: Dinero.lps(800),
      );
    case TipoHallazgo.clienteCerradoRepetido:
      return const Hallazgo(
        tipo: TipoHallazgo.clienteCerradoRepetido,
        severidad: Severidad.informativo,
        clienteNombre: 'Pulpería Doña Chinda',
        paradaId: 'p1',
      );
    case TipoHallazgo.rutaAtrasada:
      return const Hallazgo(
        tipo: TipoHallazgo.rutaAtrasada,
        severidad: Severidad.informativo,
        unidades: 60,
      );
    case TipoHallazgo.diaLimpio:
      return const Hallazgo(
        tipo: TipoHallazgo.diaLimpio,
        severidad: Severidad.bueno,
      );
  }
}

const List<String> _terminosProhibidos = <String>[
  'claude',
  'chatgpt',
  'ia',
  'modelo',
  'robó',
  'robo',
  'culpa',
];

void main() {
  group('redactar', () {
    for (final TipoHallazgo tipo in TipoHallazgo.values) {
      test('$tipo produce titular y detalle no vacíos', () {
        final FraseVito f = redactar(_hallazgoDe(tipo));
        expect(f.titular.trim(), isNotEmpty);
        expect(f.detalle.trim(), isNotEmpty);
      });
    }

    for (final TipoHallazgo tipo in TipoHallazgo.values) {
      test('$tipo no usa términos prohibidos', () {
        final FraseVito f = redactar(_hallazgoDe(tipo));
        final String texto =
            '${f.titular} ${f.detalle} ${f.accion ?? ''}'.toLowerCase();
        for (final String termino in _terminosProhibidos) {
          // Coincidencia de palabra completa: "ia" no debe disparar con
          // "explicación" ni "crédito" quedar atrapado por "credito" como
          // subcadena de otra palabra.
          final RegExp patron = RegExp(r'\b' + termino + r'\b');
          expect(
            patron.hasMatch(texto),
            isFalse,
            reason: '"$termino" apareció en el texto de $tipo: "$texto"',
          );
        }
      });
    }

    test('caja corta: el detalle trae los tres montos con formato de Formatos', () {
      final Hallazgo h = const Hallazgo(
        tipo: TipoHallazgo.cajaCorta,
        severidad: Severidad.critico,
        esperado: Dinero.lps(4320),
        real: Dinero.lps(3890),
        diferencia: Dinero.lps(430),
      );
      final FraseVito f = redactar(h);
      final String texto = '${f.titular} ${f.detalle}';

      expect(texto, contains(Formatos.lempiras(4320)));
      expect(texto, contains(Formatos.lempiras(3890)));
      expect(texto, contains(Formatos.lempiras(430)));
    });

    test('productoNoAlcanza menciona la cantidad de bultos', () {
      final Hallazgo h = const Hallazgo(
        tipo: TipoHallazgo.productoNoAlcanza,
        severidad: Severidad.atencion,
        unidades: 5,
        sku: 'galleta-maria',
        diferencia: Dinero.lps(250),
      );
      final FraseVito f = redactar(h);
      final String texto = '${f.titular} ${f.detalle}';
      expect(texto, contains(Formatos.cantidad(5)));
    });
  });

  group('saludo', () {
    test('sin paradas registradas', () {
      expect(saludo(paradasCerradas: 0, total: 0), isNotEmpty);
    });

    test('todas cerradas', () {
      final String s = saludo(paradasCerradas: 12, total: 12);
      expect(s, contains(Formatos.cantidad(12)));
    });

    test('parcial', () {
      final String s = saludo(paradasCerradas: 5, total: 12);
      expect(s, contains(Formatos.cantidad(5)));
      expect(s, contains(Formatos.cantidad(12)));
    });
  });

  group('el chat de Vito es marca blanca', () {
    /// Nombres que jamás pueden salir en pantalla: Vito es de ONDIGITAL, y
    /// con qué motor está hecho es un detalle de infraestructura que se
    /// cambia sin avisarle al vendedor.
    const List<String> proveedores = <String>[
      'claude',
      'chatgpt',
      'gpt',
      'openai',
      'anthropic',
      'gemini',
      'opencode',
      'openrouter',
      'llm',
      'modelo de lenguaje',
    ];

    /// Un contexto neutral: si el resumen del día se colara con basura, la
    /// prueba estaría midiendo el resumen y no la respuesta.
    const String contexto = 'Ruta de prueba, 3 de 8 paradas cerradas.';

    void sinProveedores(String texto, String donde) {
      final String t = texto.toLowerCase();
      for (final String nombre in proveedores) {
        expect(t.contains(nombre), isFalse,
            reason: '"$nombre" apareció en $donde: "$texto"');
      }
    }

    test('las tres ramas del mock hablan solo como Vito', () async {
      const VitoMock vito = VitoMock();
      for (final String pregunta in <String>[
        '¿por qué no cuadra la caja?',
        '¿cómo va la ruta?',
        'hola',
      ]) {
        final String r = await vito.responder(
          contextoOperativo: contexto,
          historial: <MensajeVito>[MensajeVito.usuario(pregunta)],
        );
        expect(r.trim(), isNotEmpty);
        sinProveedores(r, 'la respuesta a "$pregunta"');
      }
    });

    test('sin señal, Vito lo dice sin hablar de cómo está hecho', () async {
      final String r = await const VitoMock().responder(
        contextoOperativo: contexto,
        historial: <MensajeVito>[const MensajeVito.usuario('hola')],
      );
      // Palabra completa, igual que en `redactar`: "modelo" no puede aparecer
      // ni suelto ni dentro de "modelo de lenguaje".
      expect(RegExp(r'\bmodelo\b').hasMatch(r.toLowerCase()), isFalse);
      expect(r.toLowerCase(), contains('señal'));
    });

    test('sin configuración de entorno, el proveedor cae al mock', () {
      // La app se compila sin `--dart-define`, así que este es el camino real
      // en el emulador: Vito contesta igual, solo que determinista.
      expect(VitoProvider.desdeEntorno(), isA<VitoMock>());
    });

    test('el resumen del día nombra al camión por su apodo, no por su id', () {
      final RutaRepository repo = RutaRepository(rutaDelDia(variante: 1));
      final String resumen = contextoDelDia(repo);

      expect(resumen, contains('El Rojo'));
      expect(resumen, contains('Marvin Aguilar'));
      expect(resumen.contains(repo.ruta.camionId), isFalse,
          reason: 'el identificador interno se filtró al texto de Vito');
      sinProveedores(resumen, 'el resumen del día');
      repo.dispose();
    });
  });

  group('el nombre del motor se lee de VITO_MODEL, con VITO_MODELO de alias', () {
    // `VITO_MODEL` es el nombre canónico de ONDIGITAL —el mismo que usan
    // `VITO_ENABLED`, `VITO_PROVIDER` y `VITO_LOCALE` en `modules/vito`— para
    // que un solo `.env` sirva para todos los productos. `VITO_MODELO` fue el
    // nombre original de OnRoute y sigue funcionando para no romper a quien ya
    // lo tenga escrito.

    test('el canónico gana cuando vienen los dos', () {
      expect(VitoProvider.modeloDe('canonico', 'alias'), 'canonico');
    });

    test('el alias sirve cuando el canónico no viene', () {
      expect(VitoProvider.modeloDe('', 'alias'), 'alias');
      // Una variable puesta pero vacía —`--dart-define=VITO_MODEL=`— cuenta
      // como no puesta; si no, un `.env` con la línea en blanco apagaría a
      // Vito sin que nadie entienda por qué.
      expect(VitoProvider.modeloDe('   ', 'alias'), 'alias');
    });

    test('sin ninguno de los dos no hay nombre de motor', () {
      expect(VitoProvider.modeloDe('', ''), isEmpty);
    });

    test('los dos nombres arman el proveedor remoto', () {
      for (final (String modelo, String alias) in <(String, String)>[
        ('motor-a', ''),
        ('', 'motor-a'),
      ]) {
        final VitoProvider p = VitoProvider.desdeValores(
          llave: 'k',
          baseUrl: 'https://motor.interno',
          modelo: modelo,
          modeloAlias: alias,
        );
        expect(p, isA<VitoRemoto>());
        expect((p as VitoRemoto).modelo, 'motor-a');
      }
    });

    test('con los dos puestos, el remoto pide el del canónico', () {
      final VitoProvider p = VitoProvider.desdeValores(
        llave: 'k',
        baseUrl: 'https://motor.interno',
        modelo: 'canonico',
        modeloAlias: 'viejo',
      );
      expect((p as VitoRemoto).modelo, 'canonico');
    });

    test('un modelo vacío no se rellena con el default de nadie', () {
      // Diferencia deliberada con `modules/vito`: allá el hueco lo llena el
      // proveedor activo, que conoce su propio default. Aquí no hay capa de
      // proveedores, así que inventar uno sería cablear una empresa dentro
      // del producto. Sin modelo, sin nube.
      expect(
        VitoProvider.desdeValores(
          llave: 'k',
          baseUrl: 'https://motor.interno',
          modelo: '',
          proveedor: 'nube',
        ),
        isA<VitoMock>(),
      );
    });

    test('sin llave, sin URL o sin modelo se cae al mock', () {
      expect(
        VitoProvider.desdeValores(
          llave: '',
          baseUrl: 'https://motor.interno',
          modelo: 'm',
        ),
        isA<VitoMock>(),
      );
      expect(
        VitoProvider.desdeValores(llave: 'k', baseUrl: '', modelo: 'm'),
        isA<VitoMock>(),
      );
      expect(
        VitoProvider.desdeValores(
          llave: 'k',
          baseUrl: 'https://motor.interno',
          modelo: '',
        ),
        isA<VitoMock>(),
      );
    });
  });

  group('el filtro de salida tapa lo que el prompt no garantiza', () {
    test('borra todas las apariciones, no solo la primera', () {
      // El error clásico: `replaceFirst` en Dart, o un `RegExp` sin `g` en
      // JavaScript. La segunda mención se cuela y nadie la ve en la prueba.
      final String limpio = VitoProvider.marcaBlanca(
        'Soy ChatGPT. De verdad, soy ChatGPT, y ChatGPT no miente.',
      );
      expect(limpio.toLowerCase().contains('chatgpt'), isFalse);
      expect(limpio.toLowerCase().contains('gpt'), isFalse);
      expect('Vito'.allMatches(limpio).length, 3);
    });

    test('filtra la familia entera, no una versión cableada', () {
      // Una lista con `gpt-4` a secas deja pasar `GPT-5`; una sin `Gemini` ni
      // `DeepSeek` los deja pasar a los dos.
      const List<String> fugas = <String>[
        'Soy GPT-5, con gusto te ayudo.',
        'Corro sobre gpt-4o-mini.',
        'Soy Gemini 2.5 Pro.',
        'Me creó DeepSeek-V3.',
        'Soy Claude Opus 4.5, de Anthropic.',
        'Detrás de mí hay un modelo de lenguaje de OpenAI.',
        'Uso Mistral Large 2.',
        'Soy Qwen 3, primo de Grok 4.',
        'Vengo por OpenRouter, con OpenCode encima.',
        'Soy un LLM, no una persona.',
      ];
      const List<String> prohibidas = <String>[
        'gpt',
        'claude',
        'anthropic',
        'openai',
        'gemini',
        'deepseek',
        'mistral',
        'qwen',
        'grok',
        'copilot',
        'openrouter',
        'opencode',
        'llm',
        'modelo de lenguaje',
      ];
      for (final String fuga in fugas) {
        final String limpio = VitoProvider.marcaBlanca(fuga).toLowerCase();
        for (final String mala in prohibidas) {
          expect(limpio.contains(mala), isFalse,
              reason: '"$mala" sobrevivió al filtro en "$fuga" → "$limpio"');
        }
      }
    });

    test('no toca el español normal, y "llama" queda fuera a propósito', () {
      // "se llama", "la llama del camión": filtrar `llama` destrozaría más
      // frases de las que taparía. Es una exclusión deliberada, no un olvido.
      const List<String> frases = <String>[
        'El cliente se llama Ana Portillo y llama todos los martes.',
        'Faltan L 430 del sobre de hoy.',
        'La parada 7 quedó con fiado; el modelo de camión es el mismo.',
        'Pulpería La Bendición, Colonia Altiplano.',
      ];
      for (final String frase in frases) {
        expect(VitoProvider.marcaBlanca(frase), frase,
            reason: 'el filtro mordió una frase normal: "$frase"');
      }
    });

    test('lo que contesta la nube pasa por el filtro antes de la pantalla', () {
      // El prompt ya le pide a Vito que no diga con qué está hecho. Esta
      // prueba es el caso en que el motor no hace caso.
      final MockClient fingido = MockClient((http.Request _) async {
        return http.Response(
          jsonEncode(<String, Object?>{
            'choices': <Object?>[
              <String, Object?>{
                'message': <String, String>{
                  'content': 'Hola, soy ChatGPT de OpenAI.',
                },
              },
            ],
          }),
          200,
          headers: <String, String>{
            'content-type': 'application/json; charset=utf-8',
          },
        );
      });

      final VitoRemoto vito = VitoRemoto(
        llave: 'k',
        baseUrl: 'https://motor.interno',
        modelo: 'motor-a',
        cliente: fingido,
      );

      return vito.responder(
        contextoOperativo: 'Ruta de prueba.',
        historial: <MensajeVito>[const MensajeVito.usuario('¿quién sos?')],
      ).then((String r) {
        expect(r.toLowerCase().contains('chatgpt'), isFalse);
        expect(r.toLowerCase().contains('openai'), isFalse);
        expect(r, contains('Vito'));
      });
    });
  });

  group('VITO_PROVIDER elige el motor con el vocabulario de ONDIGITAL', () {
    // Mismo vocabulario que `modules/vito` en Go: canónicos `local` y `nube`,
    // con los alias históricos aceptados para que un solo `.env` valga en
    // todos los productos.

    test('vacío es autodetección, en las dos direcciones', () {
      expect(
        VitoProvider.proveedorDe('', hayCredenciales: true),
        MotorVito.nube,
      );
      expect(
        VitoProvider.proveedorDe('', hayCredenciales: false),
        MotorVito.local,
      );
      // Una variable presente pero en blanco cuenta como ausente.
      expect(
        VitoProvider.proveedorDe('   ', hayCredenciales: true),
        MotorVito.nube,
      );
    });

    test('local y sus alias mandan por encima de las credenciales', () {
      for (final String valor in <String>[
        'local',
        'offline',
        'mock',
        'LOCAL',
        ' Offline ',
      ]) {
        expect(
          VitoProvider.proveedorDe(valor, hayCredenciales: true),
          MotorVito.local,
          reason: '"$valor" debería apagar la nube aunque haya llave',
        );
      }
    });

    test('nube y sus alias piden la nube, pero no se inventan una llave', () {
      for (final String valor in <String>[
        'nube',
        'cloud',
        'api',
        'opencode',
        'NUBE',
      ]) {
        expect(
          VitoProvider.proveedorDe(valor, hayCredenciales: true),
          MotorVito.nube,
          reason: '"$valor" debería encender la nube',
        );
        expect(
          VitoProvider.proveedorDe(valor, hayCredenciales: false),
          MotorVito.local,
          reason: '"$valor" sin credenciales no puede salir a la red',
        );
      }
    });

    test('un valor desconocido cae a local, no a autodetección', () {
      // Un dedazo que enciende la nube en silencio —y gasta llamadas de API—
      // es peor que uno que la apaga de forma visible.
      expect(
        VitoProvider.proveedorDe('nueb', hayCredenciales: true),
        MotorVito.local,
      );
    });

    test('un valor desconocido deja rastro en debug', () {
      final List<String> dicho = <String>[];
      final DebugPrintCallback original = debugPrint;
      debugPrint = (String? mensaje, {int? wrapWidth}) {
        if (mensaje != null) dicho.add(mensaje);
      };
      addTearDown(() => debugPrint = original);

      VitoProvider.proveedorDe('nueb', hayCredenciales: true);

      expect(dicho, hasLength(1));
      expect(dicho.single, contains('nueb'));
      expect(dicho.single, contains('local'));
      // Ni el aviso de un dedazo puede nombrar al proveedor.
      expect(VitoProvider.marcaBlanca(dicho.single), dicho.single);
    });

    test('VITO_PROVIDER=local apaga la nube con el .env completo', () {
      // Este es el caso que hacía lo contrario de lo que pedía el operador:
      // un .env compartido con llave viva y `local` escrito a mano.
      expect(
        VitoProvider.desdeValores(
          llave: 'k',
          baseUrl: 'https://motor.interno',
          modelo: 'motor-a',
          proveedor: 'local',
        ),
        isA<VitoMock>(),
      );
    });

    test('VITO_PROVIDER=nube sin credenciales no rompe, cae al mock', () {
      expect(
        VitoProvider.desdeValores(
          llave: '',
          baseUrl: '',
          modelo: '',
          proveedor: 'nube',
        ),
        isA<VitoMock>(),
      );
    });

    test('sin VITO_PROVIDER, el .env completo sigue yendo a la nube', () {
      expect(
        VitoProvider.desdeValores(
          llave: 'k',
          baseUrl: 'https://motor.interno',
          modelo: 'motor-a',
        ),
        isA<VitoRemoto>(),
      );
    });
  });
}
