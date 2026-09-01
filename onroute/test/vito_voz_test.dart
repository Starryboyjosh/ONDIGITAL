/// Pruebas de la voz de Vito. No prueban el widget: prueban que `redactar`
/// produce texto correcto, completo y sin acusaciones, para los 11 tipos de
/// [Hallazgo].
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:onroute/domain/logic/vito_analista.dart';
import 'package:onroute/domain/models/dinero.dart';
import 'package:onroute/ui/core/format/formatos.dart';
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
}
