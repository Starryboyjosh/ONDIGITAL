/* ==========================================================================
   Seed demo Credental — datos sintéticos reproducibles.

   Objetivo: que cualquier pantalla del sistema abra con información coherente
   entre módulos (la cita de la agenda existe en el expediente, el saldo de
   cobranzas cuadra con el presupuesto, el abono de hoy aparece en caja y en
   reportes). Todos los datos son ficticios: nombres, DNI, teléfonos y correos
   no corresponden a personas reales y los dominios usan el TLD reservado
   `.test`, que nunca resuelve.

   Se ejecuta solo con una sesión activa del tenant CREDental demo y solo si
   la base local está vacía.
   ========================================================================== */
(function (global) {
  'use strict';

  const DEMO_COMPANY_ID = 'co_credental_demo';
  const LEGACY_COMPANY_ID = 'co_demo_credental';
  const DEMO_COMPANY_NAME = 'CREDental';
  const demoId = function (type, suffix) {
    return type + '_' + DEMO_COMPANY_ID + '_' + suffix;
  };

  function readTable(name, fallback) {
    try {
      const raw = localStorage.getItem('credental_' + name);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function writeTable(name, value) {
    localStorage.setItem('credental_' + name, JSON.stringify(value));
  }

  function activeUser() {
    return global.auth && typeof global.auth.getCurrentUser === 'function'
      ? global.auth.getCurrentUser()
      : null;
  }

  function migrateLegacyTenant(companyId) {
    if (companyId !== DEMO_COMPANY_ID) return;

    ['dentists', 'patients', 'appointments', 'budgets'].forEach(function (name) {
      const rows = readTable(name, []);
      let changed = false;
      const migrated = rows.map(function (row) {
        if (row.companyId !== LEGACY_COMPANY_ID) return row;
        changed = true;
        return Object.assign({}, row, { companyId: companyId });
      });
      if (changed) writeTable(name, migrated);
    });
  }

  function ensureCompany(companyId) {
    const companies = (global.db.getCompanies && global.db.getCompanies()) || [];
    if (companies.some(function (company) { return company.id === companyId; })) return;

    companies.push({
      id: companyId,
      name: DEMO_COMPANY_NAME,
      accent: '#cb6ce6',
      plan: 'demo'
    });
    writeTable('companies', companies);
  }

  // --- Fechas relativas a "hoy" en hora local (nunca toISOString) -----------
  const localDate = function (date) {
    return date.getFullYear() + '-' +
      String(date.getMonth() + 1).padStart(2, '0') + '-' +
      String(date.getDate()).padStart(2, '0');
  };
  const NOW = new Date();
  const TODAY = localDate(NOW);
  const addDays = function (days) {
    const date = new Date(NOW);
    date.setDate(date.getDate() + days);
    return localDate(date);
  };

  // --- Catálogo de procedimientos (aranceles en lempiras) -------------------
  const PROCEDURES = [
    { code: 'LIM-001', name: 'Limpieza dental (profilaxis)', price: 650, description: 'Destartraje supragingival y pulido.' },
    { code: 'SEL-001', name: 'Sellante de fosas y fisuras', price: 450, description: 'Prevención por pieza, indicado en molares jóvenes.' },
    { code: 'RAD-001', name: 'Radiografía periapical', price: 350, description: 'Imagen diagnóstica por pieza.' },
    { code: 'RES-001', name: 'Resina compuesta', price: 1200, description: 'Restauración estética por pieza.' },
    { code: 'EXO-001', name: 'Exodoncia simple', price: 1500, description: 'Extracción sin complicación quirúrgica.' },
    { code: 'END-001', name: 'Endodoncia unirradicular', price: 4500, description: 'Tratamiento de conducto en pieza anterior.' },
    { code: 'END-002', name: 'Endodoncia multirradicular', price: 6800, description: 'Tratamiento de conducto en molar.' },
    { code: 'COR-001', name: 'Corona de porcelana', price: 8500, description: 'Incluye provisional y prueba de metal.' },
    { code: 'PRO-001', name: 'Prótesis parcial removible', price: 9800, description: 'Acrílico con retenedores metálicos.' },
    { code: 'BLQ-001', name: 'Blanqueamiento en consultorio', price: 3500, description: 'Sesión única con lámpara LED.' },
    { code: 'ORT-001', name: 'Control de ortodoncia', price: 800, description: 'Revisión y ajuste mensual.' },
    { code: 'ORT-002', name: 'Instalación de brackets metálicos', price: 12500, description: 'Aparatología fija, ambas arcadas.' }
  ];

  function precio(code) {
    const found = PROCEDURES.find(function (p) { return p.code === code; });
    return found ? found.price : 0;
  }
  function nombre(code) {
    const found = PROCEDURES.find(function (p) { return p.code === code; });
    return found ? found.name : code;
  }
  function item(code, qty) {
    return { code: code, name: nombre(code), price: precio(code), qty: qty || 1 };
  }

  const DENTISTS = [
    { id: demoId('den', '1'), name: 'Dra. Laura Méndez', specialty: 'Odontología general', phone: '+504 9712-4408' },
    { id: demoId('den', '2'), name: 'Dr. Marco Villeda', specialty: 'Endodoncia', phone: '+504 9712-4409' },
    { id: demoId('den', '3'), name: 'Dra. Karla Zelaya', specialty: 'Ortodoncia', phone: '+504 9712-4410' }
  ];
  const DEN1 = DENTISTS[0].id;
  const DEN2 = DENTISTS[1].id;
  const DEN3 = DENTISTS[2].id;

  // Caras válidas del odontograma: top (vestibular), bottom (lingual/palatina),
  // left (mesial), right (distal), center (oclusal/incisal).
  // Condiciones de pieza completa: healthy | ausente | corona | implante.
  const PATIENTS = [
    {
      id: demoId('pat', '1'),
      name: 'María Elena Castro',
      createdAt: addDays(-420),
      age: 34, phone: '+504 9788-1201', email: 'maria.castro@example.test',
      rut: '0801-1990-12345',
      motivoConsulta: 'Limpieza y revisión general semestral.',
      allergies: 'Ninguna',
      medicalHistory: 'Sin antecedentes patológicos relevantes. No fumadora.',
      tags: ['Control semestral'],
      odontogram: {
        '16': { condition: 'healthy', faces: { center: 'caries', right: 'caries' } },
        '26': { condition: 'healthy', faces: { center: 'restaurado' } },
        '36': { condition: 'healthy', faces: { center: 'caries' } }
      }
    },
    {
      id: demoId('pat', '2'),
      name: 'José Antonio Ruiz',
      createdAt: addDays(-300),
      age: 41, phone: '+504 9788-1202', email: 'jose.ruiz@example.test',
      rut: '0801-1985-67890',
      motivoConsulta: 'Dolor en molar inferior derecho al masticar.',
      allergies: 'Penicilina',
      medicalHistory: 'Restauraciones previas en sector posterior. Refiere bruxismo nocturno.',
      tags: ['Alergias', 'Urgencia'],
      odontogram: {
        '46': { condition: 'corona', faces: {} },
        '47': { condition: 'healthy', faces: { center: 'caries', left: 'caries' } },
        '45': { condition: 'healthy', faces: { center: 'restaurado' } }
      }
    },
    {
      id: demoId('pat', '3'),
      name: 'Ana Sofía López',
      createdAt: addDays(-250),
      age: 19, phone: '+504 9788-1203', email: 'ana.lopez@example.test',
      rut: '0501-1995-11223',
      motivoConsulta: 'Control mensual de ortodoncia.',
      allergies: 'Ninguna',
      medicalHistory: 'En tratamiento de ortodoncia fija desde hace 8 meses.',
      tags: ['Ortodoncia'],
      odontogram: {
        '11': { condition: 'healthy', faces: { top: 'restaurado' } }
      }
    },
    {
      id: demoId('pat', '4'),
      name: 'Carlos Fernando Discua',
      createdAt: addDays(-16),
      age: 52, phone: '+504 9788-1204', email: 'carlos.discua@example.test',
      rut: '0801-1974-33210',
      motivoConsulta: 'Rehabilitación de sector posterior superior.',
      allergies: 'Ninguna',
      medicalHistory: 'Hipertensión controlada con losartán. Requiere control de presión previo a cirugía.',
      tags: ['Riesgo médico'],
      odontogram: {
        '17': { condition: 'ausente', faces: {} },
        '27': { condition: 'implante', faces: {} },
        '24': { condition: 'healthy', faces: { center: 'restaurado', right: 'restaurado' } }
      }
    },
    {
      id: demoId('pat', '5'),
      name: 'Gabriela Nohemí Padilla',
      createdAt: addDays(-8),
      age: 28, phone: '+504 9788-1205', email: 'gabriela.padilla@example.test',
      rut: '0501-1998-44556',
      motivoConsulta: 'Sangrado de encías al cepillado.',
      allergies: 'Ninguna',
      medicalHistory: 'Embarazo de 22 semanas. Evitar radiografías y anestésicos con vasoconstrictor.',
      tags: ['Embarazo', 'Riesgo médico'],
      odontogram: {
        '31': { condition: 'healthy', faces: { bottom: 'caries' } },
        '41': { condition: 'healthy', faces: { bottom: 'caries' } }
      }
    },
    {
      id: demoId('pat', '6'),
      name: 'Óscar Iván Maradiaga',
      createdAt: addDays(-13),
      age: 37, phone: '+504 9788-1206', email: 'oscar.maradiaga@example.test',
      rut: '0801-1989-77881',
      motivoConsulta: 'Desgaste dental y sensibilidad.',
      allergies: 'Ninguna',
      medicalHistory: 'Bruxismo severo. Se indicó placa miorrelajante.',
      tags: ['Bruxismo'],
      odontogram: {
        '14': { condition: 'healthy', faces: { center: 'restaurado' } },
        '15': { condition: 'healthy', faces: { center: 'restaurado' } },
        '25': { condition: 'healthy', faces: { center: 'caries' } }
      }
    },
    {
      id: demoId('pat', '7'),
      name: 'Lucía Mariel Fajardo',
      createdAt: addDays(-6),
      age: 8, phone: '+504 9788-1207', email: 'representante.fajardo@example.test',
      rut: '0801-2018-90122',
      motivoConsulta: 'Primera consulta odontopediátrica y aplicación de sellantes.',
      allergies: 'Ninguna',
      medicalHistory: 'Paciente pediátrica. Acude con su madre, Sra. Delia Fajardo.',
      tags: ['Odontopediatría'],
      odontogram: {
        '36': { condition: 'healthy', faces: { center: 'caries' } }
      }
    },
    {
      id: demoId('pat', '8'),
      name: 'Rubén Darío Sabillón',
      createdAt: addDays(-190),
      age: 63, phone: '+504 9788-1208', email: 'ruben.sabillon@example.test',
      rut: '0301-1963-55447',
      motivoConsulta: 'Adaptación de prótesis parcial removible superior.',
      allergies: 'Ninguna',
      medicalHistory: 'Diabetes tipo 2 controlada. Cicatrización lenta, controlar post-operatorio.',
      tags: ['Riesgo médico', 'Prótesis'],
      odontogram: {
        '16': { condition: 'ausente', faces: {} },
        '15': { condition: 'ausente', faces: {} },
        '26': { condition: 'corona', faces: {} },
        '46': { condition: 'ausente', faces: {} }
      }
    }
  ];
  const P = PATIENTS.map(function (p) { return p.id; });

  // --- Agenda: mes en curso, con historial y próximos días ------------------
  function cita(n, patientIdx, dentistId, dia, hora, duracion, especialidad, estado, notas) {
    return {
      id: demoId('appt', String(n)),
      patientId: P[patientIdx],
      dentistId: dentistId,
      dateTime: addDays(dia) + 'T' + hora,
      duration: duracion,
      specialty: especialidad,
      status: estado,
      notes: notas
    };
  }

  const APPOINTMENTS = [
    // Historial reciente
    cita(1, 0, DEN1, -21, '09:00', 40, 'Limpieza', 'completed', 'Profilaxis completa. Se detectan caries en 16.'),
    cita(2, 1, DEN2, -18, '10:30', 60, 'Endodoncia', 'completed', 'Se inicia tratamiento de conducto en 46.'),
    cita(3, 3, DEN1, -15, '08:30', 45, 'Evaluación', 'completed', 'Plan de rehabilitación superior. Presión 128/82.'),
    cita(4, 2, DEN3, -14, '16:00', 30, 'Control ortodoncia', 'completed', 'Cambio de ligas. Buena higiene.'),
    cita(5, 5, DEN1, -12, '11:00', 40, 'Evaluación', 'completed', 'Se confirma desgaste por bruxismo. Se toma impresión.'),
    cita(6, 7, DEN1, -9, '14:00', 60, 'Prótesis', 'completed', 'Prueba de estructura metálica.'),
    cita(7, 4, DEN1, -7, '09:30', 30, 'Periodoncia', 'completed', 'Sangrado generalizado. Se indica control estricto.'),
    cita(8, 6, DEN1, -5, '15:00', 30, 'Odontopediatría', 'completed', 'Primera visita. Paciente colaboradora.'),
    cita(9, 1, DEN2, -3, '10:00', 45, 'Endodoncia', 'completed', 'Obturación de conductos en 46. Se indica corona.'),
    cita(10, 0, DEN1, -2, '16:30', 30, 'Revisión', 'canceled', 'La paciente reprograma por viaje.'),

    // Hoy
    cita(11, 0, DEN1, 0, '08:30', 40, 'Limpieza', 'confirmed', 'Control semestral.'),
    cita(12, 1, DEN2, 0, '09:30', 60, 'Endodoncia', 'confirmed', 'Cementado de corona en 46.'),
    cita(13, 4, DEN1, 0, '11:00', 30, 'Periodoncia', 'pending', 'Control de higiene. Paciente embarazada: sin radiografías.'),
    cita(14, 3, DEN1, 0, '14:00', 60, 'Cirugía', 'confirmed', 'Exodoncia de 17. Verificar presión arterial.'),
    cita(15, 2, DEN3, 0, '15:30', 30, 'Control ortodoncia', 'pending', 'Ajuste mensual.'),
    cita(16, 5, DEN1, 0, '16:30', 30, 'Revisión', 'pending', 'Entrega de placa miorrelajante.'),

    // Próximos días
    cita(17, 6, DEN1, 1, '09:00', 45, 'Odontopediatría', 'confirmed', 'Aplicación de sellantes en molares.'),
    cita(18, 7, DEN1, 1, '10:30', 60, 'Prótesis', 'confirmed', 'Instalación de prótesis parcial superior.'),
    cita(19, 0, DEN1, 1, '15:00', 45, 'Operatoria', 'pending', 'Resina en 16.'),
    cita(20, 5, DEN1, 2, '09:00', 45, 'Operatoria', 'pending', 'Resina en 25.'),
    cita(21, 3, DEN1, 3, '08:30', 30, 'Control post-operatorio', 'pending', 'Revisión de cicatrización.'),
    cita(22, 2, DEN3, 4, '16:00', 30, 'Control ortodoncia', 'pending', 'Siguiente ajuste.'),
    cita(23, 4, DEN1, 7, '11:00', 40, 'Periodoncia', 'pending', 'Reevaluación periodontal.'),
    cita(24, 1, DEN1, 10, '10:00', 40, 'Limpieza', 'pending', 'Profilaxis de mantenimiento.')
  ];

  // Resto del mes. Se generan por programa —y no a mano— porque el calendario
  // se abre en la vista mensual: con solo dos semanas cargadas, una clínica en
  // marcha se veía como una agenda vacía. Se salta el domingo y el sábado
  // queda con media jornada.
  const PLANTILLA_CITAS = [
    { den: DEN1, esp: 'Limpieza', dur: 40, nota: 'Profilaxis y control de higiene.' },
    { den: DEN1, esp: 'Operatoria', dur: 45, nota: 'Restauración de resina.' },
    { den: DEN2, esp: 'Endodoncia', dur: 60, nota: 'Sesión de tratamiento de conducto.' },
    { den: DEN3, esp: 'Control ortodoncia', dur: 30, nota: 'Ajuste mensual de aparatología.' },
    { den: DEN1, esp: 'Periodoncia', dur: 40, nota: 'Control periodontal de mantenimiento.' },
    { den: DEN1, esp: 'Revisión', dur: 30, nota: 'Revisión general y presupuesto de tratamiento.' },
    { den: DEN1, esp: 'Odontopediatría', dur: 30, nota: 'Control preventivo infantil.' },
    { den: DEN1, esp: 'Prótesis', dur: 60, nota: 'Prueba y ajuste de prótesis.' }
  ];
  const HORAS_AGENDA = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];

  (function completarAgendaDelMes() {
    let n = 25;
    let k = 0;
    for (let dia = 3; dia <= 27; dia++) {
      const fecha = new Date(addDays(dia) + 'T12:00:00');
      const diaSemana = fecha.getDay();
      if (diaSemana === 0) continue;
      const cuantas = diaSemana === 6 ? 2 : 3;
      for (let i = 0; i < cuantas; i++) {
        const plantilla = PLANTILLA_CITAS[k % PLANTILLA_CITAS.length];
        APPOINTMENTS.push(cita(
          n++,
          (k * 3 + dia) % PATIENTS.length,
          plantilla.den,
          dia,
          HORAS_AGENDA[(dia + i * 2) % HORAS_AGENDA.length],
          plantilla.dur,
          plantilla.esp,
          dia <= 6 ? 'confirmed' : 'pending',
          plantilla.nota
        ));
        k++;
      }
    }
  })();

  // --- Presupuestos y abonos ------------------------------------------------
  // status: draft (borrador) | accepted (aceptado) | rejected (rechazado)
  const BUDGETS = [
    {
      n: 1, folio: 'P-0001', patient: 1, dentist: DEN2, date: addDays(-18), status: 'accepted', discount: 0,
      treatments: [item('END-002'), item('COR-001'), item('RAD-001', 2)],
      payments: [
        { amount: 5000, method: 'efectivo', date: addDays(-18), notes: 'Abono inicial al aceptar el plan.' },
        { amount: 4000, method: 'transferencia', date: addDays(-3), notes: 'Segundo abono tras obturación.' },
        { amount: 3000, method: 'tarjeta', date: TODAY, time: '09:55', notes: 'Abono al cementar la corona.' }
      ]
    },
    {
      n: 2, folio: 'P-0002', patient: 3, dentist: DEN1, date: addDays(-15), status: 'accepted', discount: 5,
      treatments: [item('EXO-001'), item('COR-001'), item('RAD-001')],
      payments: [
        { amount: 4000, method: 'transferencia', date: addDays(-15), notes: 'Abono inicial.' }
      ]
    },
    {
      n: 3, folio: 'P-0003', patient: 2, dentist: DEN3, date: addDays(-240), status: 'accepted', discount: 0,
      treatments: [item('ORT-002'), item('ORT-001', 8)],
      payments: [
        { amount: 6000, method: 'efectivo', date: addDays(-240), notes: 'Cuota de instalación.' },
        { amount: 6400, method: 'transferencia', date: addDays(-120), notes: 'Cuotas mensuales al día.' },
        { amount: 4000, method: 'efectivo', date: addDays(-30), notes: 'Cuotas de mantenimiento.' }
      ]
    },
    {
      n: 4, folio: 'P-0004', patient: 7, dentist: DEN1, date: addDays(-9), status: 'accepted', discount: 10,
      treatments: [item('PRO-001')],
      payments: [
        { amount: 4410, method: 'efectivo', date: addDays(-9), notes: 'Anticipo del 50%.' }
      ]
    },
    {
      n: 5, folio: 'P-0005', patient: 5, dentist: DEN1, date: addDays(-12), status: 'accepted', discount: 0,
      treatments: [item('RES-001', 3), item('LIM-001')],
      payments: [
        { amount: 4250, method: 'tarjeta', date: addDays(-12), notes: 'Pago total del tratamiento.' }
      ]
    },
    {
      n: 6, folio: 'P-0006', patient: 6, dentist: DEN1, date: addDays(-5), status: 'accepted', discount: 0,
      treatments: [item('SEL-001', 4), item('LIM-001')],
      payments: [
        { amount: 1200, method: 'efectivo', date: TODAY, time: '11:35', notes: 'Abono de la madre en recepción.' }
      ]
    },
    {
      n: 7, folio: 'P-0007', patient: 0, dentist: DEN1, date: addDays(-2), status: 'accepted', discount: 0,
      treatments: [item('RES-001', 2), item('LIM-001'), item('RAD-001')],
      payments: []
    },
    {
      n: 8, folio: 'P-0008', patient: 4, dentist: DEN1, date: addDays(-7), status: 'draft', discount: 0,
      treatments: [item('LIM-001'), item('RAD-001', 2)],
      payments: []
    },
    {
      n: 9, folio: 'P-0009', patient: 0, dentist: DEN1, date: addDays(-1), status: 'draft', discount: 0,
      treatments: [item('BLQ-001')],
      payments: []
    },
    {
      n: 10, folio: 'P-0010', patient: 5, dentist: DEN1, date: addDays(-11), status: 'rejected', discount: 0,
      treatments: [item('BLQ-001'), item('COR-001')],
      payments: []
    }
  ];

  // --- Periodontogramas -----------------------------------------------------
  // Convención del margen gingival (la misma que rotula periodontograma.html):
  // MG negativo = RECESIÓN, el margen se retiró hacia apical y el LAC queda
  // expuesto; MG positivo = hiperplasia, el margen cubre el LAC. Con
  // NIC = PS − MG, una recesión de 2 mm sobre una bolsa de 6 mm da NIC 8 mm.
  // La semilla usaba el signo al revés y el error caía siempre del lado
  // peligroso: el paciente parecía más sano de lo que está.
  function perioNormal(teeth, ps) {
    const out = {};
    teeth.forEach(function (t) { out[t] = { mg: 0, ps: ps, nic: ps, ss: false, pb: false }; });
    return out;
  }
  const UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
  const LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

  function perioGabriela() {
    // Gingivitis del embarazo: sangrado y placa generalizados, bolsas leves.
    const data = Object.assign(perioNormal(UPPER, 2), perioNormal(LOWER, 2));
    [16, 26, 36, 46, 31, 41, 32, 42].forEach(function (t) {
      data[t] = { mg: 0, ps: 4, nic: 4, ss: true, pb: true };
    });
    [11, 21, 12, 22, 33, 43].forEach(function (t) {
      data[t] = { mg: 0, ps: 3, nic: 3, ss: true, pb: true };
    });
    return data;
  }

  function perioRuben() {
    // Periodontitis del adulto: recesiones y bolsas profundas en molares.
    const data = Object.assign(perioNormal(UPPER, 3), perioNormal(LOWER, 3));
    [17, 27, 37, 47].forEach(function (t) {
      data[t] = { mg: -2, ps: 6, nic: 8, ss: true, pb: true }; // recesión 2 mm
    });
    [14, 24, 34, 44].forEach(function (t) {
      data[t] = { mg: -1, ps: 5, nic: 6, ss: true, pb: false }; // recesión 1 mm
    });
    // Las piezas ausentes no se sondean: no llevan medición. El
    // periodontograma las bloquea leyendo el odontograma del mismo paciente.
    [16, 15, 46].forEach(function (t) { delete data[t]; });
    return data;
  }

  function perioMaria() {
    const data = Object.assign(perioNormal(UPPER, 2), perioNormal(LOWER, 2));
    [16, 36].forEach(function (t) {
      data[t] = { mg: -1, ps: 4, nic: 5, ss: true, pb: true }; // recesión 1 mm
    });
    return data;
  }

  function ensureDemo() {
    if (!global.db || typeof global.db.getPatients !== 'function') {
      return { seeded: false, reason: 'no-db' };
    }

    const user = activeUser();
    if (!user) return { seeded: false, reason: 'no-session' };

    const activeCompanyId = user.companyId;
    if (activeCompanyId !== DEMO_COMPANY_ID && activeCompanyId !== LEGACY_COMPANY_ID) {
      return { seeded: false, reason: 'not-credental-demo-tenant' };
    }

    // Migrar únicamente el tenant demo legado conocido; nunca sembrar datos
    // sintéticos en una empresa ajena que tenga una sesión activa.
    if (activeCompanyId === LEGACY_COMPANY_ID) {
      migrateLegacyTenant(DEMO_COMPANY_ID);
      const migratedUser = Object.assign({}, user, { companyId: DEMO_COMPANY_ID });
      sessionStorage.setItem('credental_session', JSON.stringify(migratedUser));
    }
    const companyId = DEMO_COMPANY_ID;
    migrateLegacyTenant(companyId);
    const existing = global.db.getPatients() || [];
    if (existing.length > 0) {
      return { seeded: false, reason: 'already-has-data', count: existing.length };
    }

    ensureCompany(companyId);

    // Datos de la sucursal (encabezado de presupuestos y recibos).
    if (global.db.saveClinicaConfig) {
      global.db.saveClinicaConfig(companyId, {
        nombreClinica: 'CREDental',
        direccion: 'Barrio Río Piedras, 26-29 avenida, 4 calle, San Pedro Sula, Cortés',
        telefono: '+504 3243-3050',
        correo: 'contacto@credentalhn.com'
      });
    }

    const dentists = readTable('dentists', []);
    DENTISTS.forEach(function (d) {
      if (!dentists.some(function (item) { return item.id === d.id; })) {
        dentists.push(Object.assign({ companyId: companyId }, d));
      }
    });
    writeTable('dentists', dentists);

    PATIENTS.forEach(function (patient) {
      global.db.savePatient(Object.assign({ companyId: companyId }, patient));
    });

    PROCEDURES.forEach(function (procedure) {
      if (global.db.saveProcedure) {
        global.db.saveProcedure(Object.assign({ companyId: companyId }, procedure));
      }
    });

    APPOINTMENTS.forEach(function (appointment) {
      global.db.saveAppointment(Object.assign({ companyId: companyId }, appointment));
    });

    BUDGETS.forEach(function (b) {
      const saved = global.db.saveBudget({
        id: demoId('bud', String(b.n)),
        folio: b.folio,
        companyId: companyId,
        patientId: P[b.patient],
        dentistId: b.dentist,
        date: b.date,
        status: b.status,
        discount: b.discount,
        treatments: b.treatments,
        // Un presupuesto rechazado no es una cuenta por cobrar: si quedara en
        // 'pendiente', Cobranzas lo mostraría como saldo vivo y contradiría al
        // Dashboard y a Reportes, que solo suman los aceptados.
        paymentStatus: b.status === 'rejected' ? 'cancelado' : 'pendiente'
      });
      if (!saved) return;
      b.payments.forEach(function (pay) {
        global.db.registerPayment({
          budgetId: saved.id,
          amount: pay.amount,
          method: pay.method,
          date: pay.date,
          time: pay.time,
          notes: pay.notes
        });
      });
    });

    // Equipo de la clínica. Sin esto, Gestión de Usuarios abría con solo las
    // dos cuentas de acceso mientras el resto del sistema nombraba a tres
    // odontólogas y un odontólogo; además permite ver el control de acceso por
    // rol (una recepcionista no ve Usuarios ni Configuración).
    if (global.db.saveUser) {
      const EQUIPO = [
        { username: 'laura.mendez', name: 'Dra. Laura Méndez', role: 'Odontólogo(a) principal', avatar: 'LM' },
        { username: 'marco.villeda', name: 'Dr. Marco Villeda', role: 'Odontólogo(a) general', avatar: 'MV' },
        { username: 'karla.zelaya', name: 'Dra. Karla Zelaya', role: 'Ortodoncista', avatar: 'KZ' },
        { username: 'sofia.recepcion', name: 'Sofía Elena Bonilla', role: 'Recepcionista', avatar: 'SB' },
        { username: 'daniela.asistente', name: 'Daniela Marcela Cruz', role: 'Asistente dental', avatar: 'DC' }
      ];
      const registrados = (global.db.getUsers() || []).map(function (u) { return u.username; });
      EQUIPO.forEach(function (miembro) {
        if (registrados.indexOf(miembro.username) !== -1) return;
        // Contraseña sintética compartida por toda la demostración; saveUser la
        // convierte al mismo hash que usa el inicio de sesión.
        global.db.saveUser(Object.assign({ companyId: companyId, password: '1234' }, miembro));
      });
    }

    if (global.db.savePeriodontogram) {
      global.db.savePeriodontogram(P[0], perioMaria());
      global.db.savePeriodontogram(P[4], perioGabriela());
      global.db.savePeriodontogram(P[7], perioRuben());
    }

    return {
      seeded: true,
      patients: PATIENTS.length,
      dentists: DENTISTS.length,
      procedures: PROCEDURES.length,
      appointments: APPOINTMENTS.length,
      budgets: BUDGETS.length,
      company: (global.db.getCompany(companyId) || { name: DEMO_COMPANY_NAME }).name
    };
  }

  global.CredentalDemo = {
    ensure: ensureDemo,
    // Los módulos con almacenamiento propio (laboratorios, inventario, caja,
    // facturación, comunicaciones) leen de aquí para no inventar pacientes
    // que no existan en el expediente.
    pacientesDemo: function () {
      return PATIENTS.map(function (p) { return { id: p.id, name: p.name, rut: p.rut, phone: p.phone, email: p.email }; });
    }
  };

  // La semilla se carga antes de la interfaz en las pantallas protegidas.
  if (activeUser()) {
    try { ensureDemo(); } catch (error) { console.warn('Credental demo: no se pudo cargar la semilla.', error); }
  }
})(window);
