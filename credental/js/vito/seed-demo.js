/* ==========================================================================
   Seed demo Credental — datos sintéticos reproducibles para la feria.
   Se ejecuta solo con una sesión activa del tenant CREDental demo.
   ========================================================================== */
(function (global) {
  'use strict';

  const DEMO_COMPANY_ID = 'co_credental_demo';
  const LEGACY_COMPANY_ID = 'co_demo_credental';
  const DEMO_COMPANY_NAME = 'CREDental';
  const demoId = function (type, suffix) {
    return type + '_' + DEMO_COMPANY_ID + '_' + suffix;
  };

  const DEMO_IDS = {
    dentist: demoId('den', '1'),
    patients: {
      first: demoId('pat', '1'),
      second: demoId('pat', '2'),
      third: demoId('pat', '3')
    },
    appointments: {
      first: demoId('appt', '1'),
      second: demoId('appt', '2'),
      third: demoId('appt', '3'),
      fourth: demoId('appt', '4'),
      fifth: demoId('appt', '5')
    },
    budgets: {
      first: demoId('bud', '1'),
      second: demoId('bud', '2'),
      third: demoId('bud', '3')
    }
  };

  function readTable(name, fallback) {
    try {
      const raw = sessionStorage.getItem('credental_' + name);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function writeTable(name, value) {
    sessionStorage.setItem('credental_' + name, JSON.stringify(value));
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

    const dentist = {
      id: DEMO_IDS.dentist,
      companyId: companyId,
      name: 'Dra. Laura Méndez',
      specialty: 'Odontología general',
      phone: '+504 9999-0001'
    };
    const dentists = readTable('dentists', []);
    if (!dentists.some(function (item) { return item.id === dentist.id; })) {
      dentists.push(dentist);
      writeTable('dentists', dentists);
    }

    const patients = [
      {
        id: DEMO_IDS.patients.first,
        companyId: companyId,
        name: 'María Elena Castro',
        age: 34,
        phone: '+504 9999-0002',
        email: 'maria.castro@example.test',
        rut: '0801-1990-12345',
        motivoConsulta: 'Limpieza y revisión general.',
        allergies: 'Ninguna',
        medicalHistory: 'Sin antecedentes relevantes.',
        tags: ['Control semestral'],
        odontogram: {
          '16': { condition: 'healthy', faces: { occlusal: 'caries', distal: 'caries' } },
          '21': { condition: 'restaurado', faces: {} }
        }
      },
      {
        id: DEMO_IDS.patients.second,
        companyId: companyId,
        name: 'José Antonio Ruiz',
        age: 41,
        phone: '+504 9999-0003',
        email: 'jose.ruiz@example.test',
        rut: '0801-1985-67890',
        motivoConsulta: 'Dolor molar inferior derecho.',
        allergies: 'Penicilina',
        medicalHistory: 'Tratamiento restaurativo previo.',
        tags: ['Alergias', 'Urgencia'],
        odontogram: {
          '46': { condition: 'corona', faces: {} },
          '47': { condition: 'healthy', faces: { occlusal: 'caries' } }
        }
      },
      {
        id: DEMO_IDS.patients.third,
        companyId: companyId,
        name: 'Ana Sofía López',
        age: 19,
        phone: '+504 9999-0004',
        email: 'ana.lopez@example.test',
        rut: '0501-1995-11223',
        motivoConsulta: 'Ortodoncia de control.',
        allergies: 'Ninguna',
        medicalHistory: 'Paciente en control de ortodoncia.',
        tags: ['Ortodoncia'],
        odontogram: {}
      }
    ];
    patients.forEach(function (patient) { global.db.savePatient(patient); });

    [
      { code: 'LIM-001', companyId: companyId, name: 'Limpieza dental', price: 650, description: 'Profilaxis y revisión general.' },
      { code: 'RES-001', companyId: companyId, name: 'Resina dental', price: 1200, description: 'Restauración estética por pieza.' },
      { code: 'RAD-001', companyId: companyId, name: 'Radiografía periapical', price: 350, description: 'Imagen diagnóstica por pieza.' },
      { code: 'ORT-001', companyId: companyId, name: 'Control de ortodoncia', price: 800, description: 'Revisión y ajuste mensual.' }
    ].forEach(function (procedure) {
      if (global.db.saveProcedure) global.db.saveProcedure(procedure);
    });

    const localDate = function (date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return year + '-' + month + '-' + day;
    };
    const now = new Date();
    const today = localDate(now);
    const addDays = function (days) {
      const date = new Date(now);
      date.setDate(date.getDate() + days);
      return localDate(date);
    };
    const appointments = [
      { id: DEMO_IDS.appointments.first, patientId: DEMO_IDS.patients.first, dentistId: dentist.id, dateTime: today + 'T09:00', duration: 40, specialty: 'Limpieza', status: 'confirmed', notes: 'Control preventivo.', companyId: companyId },
      { id: DEMO_IDS.appointments.second, patientId: DEMO_IDS.patients.second, dentistId: dentist.id, dateTime: today + 'T11:30', duration: 30, specialty: 'Urgencia', status: 'pending', notes: 'Dolor molar.', companyId: companyId },
      { id: DEMO_IDS.appointments.third, patientId: DEMO_IDS.patients.third, dentistId: dentist.id, dateTime: addDays(1) + 'T10:00', duration: 45, specialty: 'Control ortodoncia', status: 'pending', notes: 'Ajuste mensual.', companyId: companyId },
      { id: DEMO_IDS.appointments.fourth, patientId: DEMO_IDS.patients.first, dentistId: dentist.id, dateTime: addDays(1) + 'T15:00', duration: 30, specialty: 'Revisión', status: 'pending', notes: 'Seguimiento de hallazgos.', companyId: companyId },
      { id: DEMO_IDS.appointments.fifth, patientId: DEMO_IDS.patients.first, dentistId: dentist.id, dateTime: addDays(-5) + 'T14:00', duration: 30, specialty: 'Evaluación', status: 'completed', notes: 'Registro inicial de demo.', companyId: companyId }
    ];
    appointments.forEach(function (appointment) { global.db.saveAppointment(appointment); });

    const budget1 = global.db.saveBudget({
      id: DEMO_IDS.budgets.first, companyId: companyId, patientId: DEMO_IDS.patients.second, dentistId: dentist.id,
      date: today, status: 'accepted', discount: 0,
      treatments: [{ name: 'Resina dental', price: 1200, qty: 1 }, { name: 'Radiografía periapical', price: 350, qty: 1 }],
      paymentStatus: 'parcial'
    });
    if (budget1) {
      global.db.registerPayment({ budgetId: budget1.id, amount: 500, method: 'efectivo', notes: 'Abono demo' });
    }

    global.db.saveBudget({
      id: DEMO_IDS.budgets.second, companyId: companyId, patientId: DEMO_IDS.patients.third, dentistId: dentist.id,
      date: today, status: 'accepted', discount: 10,
      treatments: [{ name: 'Control de ortodoncia', price: 800, qty: 1 }],
      paymentStatus: 'pendiente'
    });

    global.db.saveBudget({
      id: DEMO_IDS.budgets.third, companyId: companyId, patientId: DEMO_IDS.patients.first, dentistId: dentist.id,
      date: today, status: 'draft', discount: 0,
      treatments: [{ name: 'Limpieza dental', price: 650, qty: 1 }],
      paymentStatus: 'pendiente'
    });

    if (global.db.savePeriodontogram) {
      global.db.savePeriodontogram(DEMO_IDS.patients.first, {
        '16': { mg: 1, ps: 4, nic: 3, ss: true, pb: true },
        '26': { mg: 0, ps: 2, nic: 2, ss: false, pb: false },
        '36': { mg: 1, ps: 5, nic: 4, ss: true, pb: true }
      });
    }

    return {
      seeded: true,
      patients: patients.length,
      appointments: appointments.length,
      budgets: 3,
      company: (global.db.getCompany(companyId) || { name: DEMO_COMPANY_NAME }).name
    };
  }

  global.CredentalDemo = {
    ensure: ensureDemo
  };

  // La semilla se carga antes de la interfaz en las pantallas protegidas.
  if (activeUser()) {
    try { ensureDemo(); } catch (error) { console.warn('Credental demo: no se pudo cargar la semilla.', error); }
  }
})(window);
