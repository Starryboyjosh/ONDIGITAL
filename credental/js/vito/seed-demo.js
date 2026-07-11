/* ==========================================================================
   Seed demo Credental — datos para Vito / demo escolar (Fase 2.3)
   Solo rellena si no hay pacientes. Local-first; sync Firebase si existe.
   ========================================================================== */
(function (global) {
  'use strict';

  function ensureDemo() {
    if (!global.db || typeof global.db.getPatients !== 'function') return { seeded: false, reason: 'no-db' };
    const existing = global.db.getPatients() || [];
    if (existing.length > 0) return { seeded: false, reason: 'already-has-data', count: existing.length };

    const companyId = 'co_demo_credental';
    // Empresa demo (si no hay)
    const companies = (global.db.getCompanies && global.db.getCompanies()) || [];
    if (!companies.find(function (c) { return c.id === companyId; })) {
      try {
        const raw = sessionStorage.getItem('credental_companies');
        const list = raw ? JSON.parse(raw) : [];
        list.push({
          id: companyId,
          name: 'Clínica Sonrisa HN',
          accent: '#2b8af7',
          plan: 'demo'
        });
        sessionStorage.setItem('credental_companies', JSON.stringify(list));
      } catch (_) { /* */ }
    }

    // Sesión demo para filtrar por tenant (opcional)
    try {
      if (!sessionStorage.getItem('credental_session')) {
        sessionStorage.setItem('credental_session', JSON.stringify({
          username: 'demo',
          name: 'Recepcion Demo',
          companyId: companyId,
          role: 'admin'
        }));
      }
    } catch (_) { /* */ }

    const dentist = {
      id: 'den_demo_1',
      companyId: companyId,
      name: 'Dra. Laura Méndez',
      specialty: 'Odontología general',
      phone: '+504 9876-1100'
    };
    try {
      const dens = JSON.parse(sessionStorage.getItem('credental_dentists') || '[]');
      if (!dens.find(function (d) { return d.id === dentist.id; })) {
        dens.push(dentist);
        sessionStorage.setItem('credental_dentists', JSON.stringify(dens));
      }
    } catch (_) { /* */ }

    const patients = [
      {
        id: 'pat_demo_1', companyId: companyId,
        name: 'María Elena Castro', phone: '+504 9455-2200', rut: '0801-1990-12345',
        motivoConsulta: 'Limpieza y revisión general.'
      },
      {
        id: 'pat_demo_2', companyId: companyId,
        name: 'José Antonio Ruiz', phone: '+504 9333-4411', rut: '0801-1985-67890',
        motivoConsulta: 'Dolor molar inferior derecho.'
      },
      {
        id: 'pat_demo_3', companyId: companyId,
        name: 'Ana Sofía López', phone: '+504 9111-7788', rut: '0501-1995-11223',
        motivoConsulta: 'Ortodoncia de control.'
      }
    ];
    patients.forEach(function (p) {
      p.odontogram = {};
      // savePatient only updates if id exists in list — insert via empty list + id
      const list = JSON.parse(sessionStorage.getItem('credental_patients') || '[]');
      list.push(p);
      sessionStorage.setItem('credental_patients', JSON.stringify(list));
      if (global.db && global.db.savePatient) {
        // re-save through API for firebase sync hook when present
        try { global.db.savePatient(p); } catch (_) { /* */ }
      }
    });

    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = (function () {
      const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10);
    })();

    const appts = [
      { patientId: 'pat_demo_1', dentistId: dentist.id, dateTime: today + 'T09:00', duration: 40, specialty: 'Limpieza', status: 'confirmed', notes: 'Demo' },
      { patientId: 'pat_demo_2', dentistId: dentist.id, dateTime: today + 'T11:30', duration: 30, specialty: 'Urgencia', status: 'pending', notes: 'Dolor' },
      { patientId: 'pat_demo_3', dentistId: dentist.id, dateTime: tomorrow + 'T10:00', duration: 45, specialty: 'Control ortodoncia', status: 'pending', notes: 'Demo' },
      { patientId: 'pat_demo_1', dentistId: dentist.id, dateTime: tomorrow + 'T15:00', duration: 30, specialty: 'Revisión', status: 'pending', notes: 'Demo' }
    ];
    appts.forEach(function (a) {
      a.companyId = companyId;
      global.db.saveAppointment(a);
    });

    // Presupuesto aceptado con saldo
    const bud1 = global.db.saveBudget({
      companyId: companyId,
      patientId: 'pat_demo_2',
      dentistId: dentist.id,
      status: 'accepted',
      discount: 0,
      treatments: [
        { name: 'Resina molar', price: 1200, qty: 1 },
        { name: 'Radiografía', price: 350, qty: 1 }
      ],
      paymentStatus: 'parcial'
    });
    global.db.registerPayment({ budgetId: bud1.id, amount: 500, method: 'efectivo', notes: 'Abono demo' });

    const bud2 = global.db.saveBudget({
      companyId: companyId,
      patientId: 'pat_demo_3',
      dentistId: dentist.id,
      status: 'accepted',
      discount: 10,
      treatments: [
        { name: 'Control ortodoncia', price: 800, qty: 1 }
      ],
      paymentStatus: 'pendiente'
    });

    return {
      seeded: true,
      patients: 3,
      appointments: appts.length,
      budgets: 2,
      company: 'Clínica Sonrisa HN'
    };
  }

  global.CredentalDemo = {
    ensure: ensureDemo,
    force: function () {
      // wipe clinical tables for re-seed (demo only)
      ['patients', 'appointments', 'budgets', 'payments'].forEach(function (k) {
        sessionStorage.setItem('credental_' + k, JSON.stringify(k === 'payments' ? [] : []));
      });
      sessionStorage.removeItem('credental_session');
      return ensureDemo();
    }
  };
})(window);
