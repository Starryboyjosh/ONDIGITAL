/// El registro de conductores tiene dos promesas que vale la pena blindar:
///
/// 1. **Un camión no puede tener dos conductores.** Asignar es una operación
///    con tres efectos —el anterior suelta, el nuevo recibe, el camión cambia
///    de nombre— y si alguno se saltara, la torre rotularía a alguien que el
///    registro ya no cree que va manejando.
/// 2. **Nadie se borra.** La baja es lógica: quien se fue sigue en la lista,
///    inactivo, porque su nombre sigue firmando las rutas que ya manejó.
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'package:onroute/data/repositories/conductor_repository.dart';
import 'package:onroute/data/services/simulador_flota.dart';
import 'package:onroute/data/semilla/semilla_san_pedro_sula.dart';
import 'package:onroute/domain/models/camion.dart';
import 'package:onroute/domain/models/conductor.dart';
import 'package:onroute/domain/models/parada.dart';
import 'package:onroute/domain/models/ruta.dart';

ConductorRepository _repo() => ConductorRepository(
      conductores: conductoresSemilla,
      camiones: camionesFlota,
    );

void main() {
  group('el modelo', () {
    const Conductor marvin = Conductor(
      id: 'con-01',
      nombre: 'Marvin Aguilar',
      dni: '0501198501234',
      telefono: '98001182',
      licencia: TipoLicencia.pesada,
    );

    test('el DNI se muestra en los tres bloques de la tarjeta', () {
      expect(marvin.dniFormateado, '0501-1985-01234');
    });

    test('el teléfono se muestra listo para marcar desde Honduras', () {
      expect(marvin.telefonoFormateado, '+504 9800-1182');
    });

    test('las iniciales salen del nombre y del primer apellido', () {
      expect(marvin.iniciales, 'MA');
      expect(
        const Conductor(
          id: 'x',
          nombre: 'Denia',
          dni: '0501199007765',
          telefono: '98008840',
          licencia: TipoLicencia.pesada,
        ).iniciales,
        'DE',
      );
    });

    test('la licencia liviana no habilita un camión de reparto', () {
      expect(marvin.puedeConducirCamion, isTrue);
      expect(
        marvin.copiaCon(licencia: TipoLicencia.liviana).puedeConducirCamion,
        isFalse,
      );
    });

    test('copiaCon puede soltar el camión, cosa que un null no logra', () {
      final Conductor conUnidad = marvin.copiaCon(camionId: 'cam-01');
      // `camionId: null` es indistinguible de "no lo cambiés": por eso existe
      // la bandera explícita.
      expect(conUnidad.copiaCon(camionId: null).camionId, 'cam-01');
      expect(conUnidad.copiaCon(limpiarCamion: true).camionId, isNull);
    });
  });

  group('la validación del formulario', () {
    test('el DNI hondureño son trece dígitos, ni doce ni catorce', () {
      expect(ValidacionConductor.dni('0501198501234'), isNull);
      expect(ValidacionConductor.dni('050119850123'), contains('13 dígitos'));
      expect(ValidacionConductor.dni('05011985012345'), isNotNull);
      expect(ValidacionConductor.dni('0501-1985-0123'), contains('números'));
      expect(ValidacionConductor.dni(''), isNotNull);
    });

    test('el teléfono son ocho dígitos con prefijo hondureño', () {
      expect(ValidacionConductor.telefono('98001182'), isNull);
      expect(ValidacionConductor.telefono('32118840'), isNull,
          reason: 'el 3 es prefijo móvil hondureño válido');
      expect(ValidacionConductor.telefono('9945118'), contains('8 dígitos'));
      expect(ValidacionConductor.telefono('19945118'), contains('no empieza'));
    });

    test('el nombre pide nombre y apellido, no una sola palabra', () {
      expect(ValidacionConductor.nombre('Marvin Aguilar'), isNull);
      expect(ValidacionConductor.nombre('Marvin'), contains('apellido'));
      expect(ValidacionConductor.nombre('  '), isNotNull);
    });

    test('el DNI capturado con guiones es el mismo DNI', () {
      expect(
        ValidacionConductor.soloDigitos('0501-1985-01234'),
        '0501198501234',
      );
    });
  });

  group('el repositorio', () {
    late ConductorRepository repo;

    setUp(() => repo = _repo());
    tearDown(() => repo.dispose());

    test('arranca con la semilla y con cada camión rotulado', () {
      expect(repo.conductores.length, conductoresSemilla.length);
      expect(repo.conductorDelCamion('cam-01')?.nombre, 'Marvin Aguilar');
      expect(repo.camionPorId('cam-01')?.conductorId, 'con-01');
    });

    test('disponibles deja fuera a quien tiene unidad y a la licencia liviana',
        () {
      final List<String> ids =
          repo.disponibles.map((Conductor c) => c.id).toList();
      expect(ids, isEmpty,
          reason: 'con-04 tiene licencia liviana y los otros tres van en ruta');

      repo.liberar('con-02');
      expect(repo.disponibles.map((Conductor c) => c.id), <String>['con-02']);
    });

    test('dar de alta suma al registro y no reparte camiones solo', () {
      final ResultadoConductor r = repo.registrar(
        nombre: 'Elder Munguía',
        dni: '0501-1996-04412',
        telefono: '98004412',
        licencia: TipoLicencia.pesada,
      );

      expect(r.exito, isTrue);
      expect(r.conductor!.id, 'con-05');
      expect(r.conductor!.dni, '0501199604412', reason: 'los guiones se caen');
      expect(r.conductor!.camionId, isNull);
      expect(repo.conductores.length, conductoresSemilla.length + 1);
    });

    test('el mismo DNI dos veces es la misma persona, y se rechaza', () {
      final ResultadoConductor r = repo.registrar(
        nombre: 'Marvin A. Aguilar',
        dni: '0501198501234',
        telefono: '98001111',
        licencia: TipoLicencia.pesada,
      );

      expect(r.exito, isFalse);
      expect(r.fallo, FalloConductor.dniRepetido);
      expect(r.mensaje, contains('Marvin Aguilar'));
      expect(repo.conductores.length, conductoresSemilla.length);
    });

    test('un formulario inválido no llega a guardarse', () {
      final ResultadoConductor r = repo.registrar(
        nombre: 'Elder Munguía',
        dni: '05011996',
        telefono: '98004412',
        licencia: TipoLicencia.pesada,
      );

      expect(r.fallo, FalloConductor.datosInvalidos);
      expect(r.mensaje, contains('13 dígitos'));
      expect(repo.conductores.length, conductoresSemilla.length);
    });

    test('editar corrige datos sin moverle el camión', () {
      final ResultadoConductor r = repo.editar(
        id: 'con-01',
        nombre: 'Marvin Aguilar',
        dni: '0501198501234',
        telefono: '98005566',
        licencia: TipoLicencia.pesada,
      );

      expect(r.exito, isTrue);
      expect(r.conductor!.telefono, '98005566');
      expect(r.conductor!.camionId, 'cam-01');
      expect(repo.camionPorId('cam-01')?.conductor, 'Marvin Aguilar');
    });

    test('bajarle la licencia a quien lleva camión le suelta el camión', () {
      final ResultadoConductor r = repo.editar(
        id: 'con-01',
        nombre: 'Marvin Aguilar',
        dni: '0501198501234',
        telefono: '98001182',
        licencia: TipoLicencia.liviana,
      );

      expect(r.exito, isTrue);
      expect(r.conductor!.camionId, isNull);
      expect(repo.camionPorId('cam-01')?.conductor, sinConductorAsignado);
      expect(repo.camionPorId('cam-01')?.conductorId, isNull);
    });

    test('asignar mueve al conductor y rotula el camión', () {
      repo.liberar('con-02');
      final ResultadoConductor r =
          repo.asignar(conductorId: 'con-02', camionId: 'cam-02');

      expect(r.exito, isTrue);
      final Camion? cam = repo.camionPorId('cam-02');
      expect(cam?.conductor, 'Denia Zelaya');
      expect(cam?.conductorId, 'con-02');
    });

    test('un camión no queda nunca con dos conductores', () {
      repo.liberar('con-03');
      final ResultadoConductor r =
          repo.asignar(conductorId: 'con-03', camionId: 'cam-01');

      expect(r.exito, isTrue);
      expect(repo.porId('con-01')!.camionId, isNull,
          reason: 'a quien lo traía se le tuvo que soltar');
      expect(repo.conductorDelCamion('cam-01')?.id, 'con-03');
      expect(repo.camionPorId('cam-01')?.conductor, 'Wilmer Cruz');
      // Y el camión que Wilmer traía queda visiblemente sin nadie.
      expect(repo.camionPorId('cam-03')?.conductor, sinConductorAsignado);
      expect(repo.conductorDelCamion('cam-03'), isNull);
    });

    test('la licencia liviana no puede recibir un camión', () {
      final ResultadoConductor r =
          repo.asignar(conductorId: 'con-04', camionId: 'cam-01');

      expect(r.fallo, FalloConductor.licenciaInsuficiente);
      expect(r.mensaje, contains('pesada'));
      expect(repo.conductorDelCamion('cam-01')?.id, 'con-01',
          reason: 'el camión no se movió de dueño');
    });

    test('un camión que no está en la flota no se puede asignar', () {
      repo.liberar('con-02');
      expect(
        repo.asignar(conductorId: 'con-02', camionId: 'cam-99').fallo,
        FalloConductor.camionNoExiste,
      );
    });

    test('dar de baja NO borra: deja inactivo y libera el camión', () {
      final int antes = repo.conductores.length;
      final ResultadoConductor r = repo.darDeBaja('con-01');

      expect(r.exito, isTrue);
      expect(repo.conductores.length, antes,
          reason: 'la baja es lógica, no un borrado');
      expect(repo.porId('con-01')!.estado, EstadoConductor.inactivo);
      expect(repo.porId('con-01')!.camionId, isNull);
      expect(repo.activos.map((Conductor c) => c.id), isNot(contains('con-01')));
      expect(repo.camionPorId('cam-01')?.conductor, sinConductorAsignado);
      expect(repo.camionPorId('cam-01')?.conductorId, isNull);
    });

    test('a quien está de baja no se le asigna unidad', () {
      repo.darDeBaja('con-02');
      final ResultadoConductor r =
          repo.asignar(conductorId: 'con-02', camionId: 'cam-02');

      expect(r.fallo, FalloConductor.conductorInactivo);
      expect(r.mensaje, contains('Denia Zelaya'));
    });

    test('reactivar devuelve a la rotación, sin unidad', () {
      repo.darDeBaja('con-03');
      final ResultadoConductor r = repo.reactivar('con-03');

      expect(r.conductor!.activo, isTrue);
      expect(r.conductor!.camionId, isNull);
      expect(repo.disponibles.map((Conductor c) => c.id), contains('con-03'));
    });

    test('el id nuevo no repite uno dado de baja', () {
      repo.darDeBaja('con-04');
      final ResultadoConductor r = repo.registrar(
        nombre: 'Elder Munguía',
        dni: '0501199604412',
        telefono: '98004412',
        licencia: TipoLicencia.pesada,
      );

      expect(r.conductor!.id, 'con-05');
    });

    test('tocar el registro no muta la semilla compartida', () {
      repo.darDeBaja('con-01');

      expect(conductoresSemilla.first.estado, EstadoConductor.activo);
      expect(camionesFlota.first.conductor, 'Marvin Aguilar');
      expect(_repo().porId('con-01')!.activo, isTrue,
          reason: 'un registro nuevo tiene que abrir limpio');
    });

    test('cada cambio avisa a quien esté escuchando', () {
      int avisos = 0;
      repo.addListener(() => avisos++);

      repo.liberar('con-01');
      repo.asignar(conductorId: 'con-01', camionId: 'cam-01');
      repo.darDeBaja('con-01');

      expect(avisos, 3);
    });
  });

  _pruebasDeSincronia();
}

/// El registro y el mapa tienen que contar la misma historia. El simulador se
/// queda con su **propia copia** del camión al arrancar la torre, así que el
/// cambio hecho en Ajustes tiene que tener una puerta para llegar hasta él —y
/// esa puerta no puede pisar la posición ni el estado, que los lleva el
/// simulador y no el registro.
void _pruebasDeSincronia() {
  group('lo que se decide en el registro llega al mapa', () {
    SimuladorFlota enRuta() {
      final Ruta ruta = rutaDelDia(variante: 0);
      final SimuladorFlota s = SimuladorFlota();
      s.agregar(
        camion: camionesFlota.first,
        ruta: ruta,
        trazo: <LatLng>[
          ruta.base,
          for (final Parada p in ruta.paradas) p.cliente.posicion,
          ruta.base,
        ],
      );
      return s;
    }

    test('reasignar cambia el nombre del marcador', () {
      final SimuladorFlota s = enRuta();
      s.reasignarConductor(
        camionId: 'cam-01',
        conductor: 'Wilmer Cruz',
        conductorId: 'con-03',
      );

      expect(s.camiones.single.camion.conductor, 'Wilmer Cruz');
      expect(s.camiones.single.camion.conductorId, 'con-03');
      s.dispose();
    });

    test('reasignar no teletransporta el camión de vuelta a la base', () {
      final SimuladorFlota s = enRuta();
      s.avanzar(const Duration(minutes: 30));
      final LatLng donde = s.camiones.single.camion.rastro.posicion;
      final EstadoCamion estado = s.camiones.single.camion.estado;
      final double avance = s.camiones.single.avance;

      s.reasignarConductor(
        camionId: 'cam-01',
        conductor: sinConductorAsignado,
      );

      expect(s.camiones.single.camion.rastro.posicion, donde);
      expect(s.camiones.single.camion.estado, estado);
      expect(s.camiones.single.avance, avance);
      s.dispose();
    });

    test('un camión que no está simulado no rompe nada', () {
      final SimuladorFlota s = enRuta();
      s.reasignarConductor(camionId: 'cam-99', conductor: 'Nadie');

      expect(s.camiones.single.camion.conductor, 'Marvin Aguilar');
      s.dispose();
    });

    test('reasignar al mismo no vuelve a avisar: la torre no repinta de gratis',
        () {
      final SimuladorFlota s = enRuta();
      int avisos = 0;
      s.addListener(() => avisos++);

      s.reasignarConductor(
        camionId: 'cam-01',
        conductor: 'Marvin Aguilar',
        conductorId: 'con-01',
      );

      expect(avisos, 0);
      s.dispose();
    });
  });
}
