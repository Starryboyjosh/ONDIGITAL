/* ==========================================================================
   DB.JS - MOTOR DE BASE DE DATOS LOCAL (SESSIONSTORAGE)
   Simula operaciones de consulta y guardado relacional de datos clínicos
   con soporte multi-empresa y aislamiento de datos por tenant.
   ========================================================================== */

(function() {
  const DB_PREFIX = 'credental_';

  // Helper para obtener el companyId del usuario logueado en tiempo real
  function getCurrentCompanyId() {
    if (window.sessionStorage) {
      const session = sessionStorage.getItem('credental_session');
      if (session) {
        try {
          const user = JSON.parse(session);
          return user ? user.companyId : null;
        } catch (e) {
          return null;
        }
      }
    }
    return null;
  }

  // Hash de "1234" (SHA-256) — mismo algoritmo que auth.hashPassword
  const DEMO_ADMIN_PASSWORD_HASH =
    '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4';

  const DEMO_COMPANY_ID = 'co_credental_demo';
  const LEGACY_DEMO_COMPANY_ID = 'co_demo_credental';
  const DEMO_COMPANY = {
    id: DEMO_COMPANY_ID,
    name: 'CREDental',
    plan: 'demo',
    accent: '#cb6ce6'
  };

  // Usuarios de acceso local para la demostración. No representan autenticación real.
  function ensureDefaultAdmin() {
    const companies = get('companies', []);
    const companyIdx = companies.findIndex((c) => c.id === DEMO_COMPANY_ID);
    if (companyIdx === -1) {
      companies.push({ ...DEMO_COMPANY });
      set('companies', companies);
    } else if (companies[companyIdx].name !== DEMO_COMPANY.name || companies[companyIdx].accent !== DEMO_COMPANY.accent) {
      companies[companyIdx] = { ...companies[companyIdx], ...DEMO_COMPANY };
      set('companies', companies);
    }

    const users = get('users', []);
    const demoUsers = [
      {
        username: 'admin',
        name: 'Administrador CREDental',
        role: 'Administración',
        avatar: 'AD',
        password: DEMO_ADMIN_PASSWORD_HASH,
        companyId: DEMO_COMPANY_ID
      },
      {
        username: 'testing',
        name: 'Usuario de Pruebas',
        role: 'Administración',
        avatar: 'TS',
        password: DEMO_ADMIN_PASSWORD_HASH,
        companyId: DEMO_COMPANY_ID
      }
    ];

    let changed = false;
    demoUsers.forEach((demoUser) => {
      const idx = users.findIndex((u) => u.username === demoUser.username);
      if (idx === -1) {
        users.push(demoUser);
        changed = true;
      } else {
        // Nunca reasignar una cuenta existente de otra empresa. Solo se
        // actualizan cuentas creadas por esta demo o su identificador legado.
        const belongsToDemo = [DEMO_COMPANY_ID, LEGACY_DEMO_COMPANY_ID].includes(users[idx].companyId);
        if (belongsToDemo && (
          users[idx].password !== demoUser.password ||
          users[idx].role !== demoUser.role ||
          users[idx].companyId !== demoUser.companyId
        )) {
          users[idx] = { ...users[idx], ...demoUser };
          changed = true;
        }
      }
    });
    if (changed) {
      set('users', users);
      console.log('Credental: usuarios demo disponibles: testing / 1234.');
    }
  }

  // Inicialización de la Base de Datos
  function initDB() {
    if (!sessionStorage.getItem(DB_PREFIX + 'initialized')) {
      set('companies', []);
      set('users', []);
      set('dentists', []);
      set('treatments', []);
      set('patients', []);
      set('appointments', []);
      set('budgets', []);
      set('clinica_config', {});
      set('payments', []);
      set('periodontograms', {});
      set('initialized', true);
      console.log('Credental DB Multi-Empresa: Inicializada con éxito sobre sessionStorage vacía.');
    } else {
      // Garantizar que las tablas existan
      if (!sessionStorage.getItem(DB_PREFIX + 'clinica_config')) {
        set('clinica_config', {});
      }
      if (!sessionStorage.getItem(DB_PREFIX + 'payments')) {
        set('payments', []);
      }
      if (!sessionStorage.getItem(DB_PREFIX + 'periodontograms')) {
        set('periodontograms', {});
      }
      if (!sessionStorage.getItem(DB_PREFIX + 'users')) {
        set('users', []);
      }
      if (!sessionStorage.getItem(DB_PREFIX + 'companies')) {
        set('companies', []);
      }
    }

    ensureDefaultAdmin();

    // La sincronización es opt-in: solo ocurre si el conector fue cargado
    // explícitamente antes de inicializar la base local.
    if (window.firebaseConnector) syncAllFromFirebase();
  }

  // Helper para leer/escribir de sessionStorage con JSON
  function get(key, defaultValue) {
    const val = sessionStorage.getItem(DB_PREFIX + key);
    return val ? JSON.parse(val) : defaultValue;
  }

  function set(key, value) {
    sessionStorage.setItem(DB_PREFIX + key, JSON.stringify(value));
  }

  // Fecha en formato ISO (YYYY-MM-DD) usando la zona horaria del equipo.
  // Nunca usar `toISOString()` para "hoy": en Honduras (UTC-6) devuelve el día
  // siguiente a partir de las 18:00 y descuadra agenda, caja y reportes.
  function localDateISO(date) {
    const value = date || new Date();
    return value.getFullYear() + '-' +
      String(value.getMonth() + 1).padStart(2, '0') + '-' +
      String(value.getDate()).padStart(2, '0');
  }

  // Identificador único aunque se creen varios registros en el mismo
  // milisegundo (por ejemplo al cargar la semilla): Date.now() por sí solo
  // repetía ids y dos abonos podían quedar con la misma clave.
  let seq = 0;
  function nuevoId(prefijo) {
    seq = (seq + 1) % 1000;
    return prefijo + '_' + Date.now() + String(seq).padStart(3, '0');
  }

  // Se exponen globalmente porque db.js es el primer script de todas las páginas.
  window.localDateISO = localDateISO;
  window.todayISO = () => localDateISO(new Date());
  window.addDaysISO = (days, from) => {
    const base = from ? new Date(from + 'T00:00:00') : new Date();
    base.setDate(base.getDate() + days);
    return localDateISO(base);
  };

  // Sincronización asíncrona opcional hacia Firestore.
  // La ruta lleva la clínica activa (`clinicas/<clinicaId>/<colección>`) porque
  // es el modelo que aíslan las reglas de firebase/firestore.rules. Una
  // colección plana mezclaría los pacientes de todas las clínicas.
  function cloudPath(localKey) {
    const cid = getCurrentCompanyId();
    if (!cid) return null;
    return 'clinicas/' + cid + '/' + localKey;
  }

  function syncSave(localKey, docId, data) {
    if (!window.firebaseConnector) return;
    const path = cloudPath(localKey);
    if (!path) return;
    window.firebaseConnector.saveDoc(path, String(docId), data);
  }

  function syncDelete(localKey, docId) {
    if (!window.firebaseConnector) return;
    const path = cloudPath(localKey);
    if (!path) return;
    window.firebaseConnector.deleteDoc(path, String(docId));
  }

  async function syncCollection(localKey, firestoreColl, idField) {
    if (!firestoreColl) return;
    const localData = get(localKey, []);
    const cloudData = await window.firebaseConnector.getDocs(firestoreColl);
    if (cloudData.length === 0 && localData.length > 0) {
      // Migración inicial: subir local a Firestore
      for (const item of localData) {
        await window.firebaseConnector.saveDoc(firestoreColl, String(item[idField]), item);
      }
      console.log(`Migración inicial exitosa de ${localKey} a Firestore.`);
    } else if (cloudData.length > 0) {
      // Mezclar datos de la nube con los locales. Damos prioridad a los datos de la nube.
      const merged = [...localData];
      for (const cloudItem of cloudData) {
        const idx = merged.findIndex(item => String(item[idField]) === String(cloudItem[idField]));
        if (idx === -1) {
          merged.push(cloudItem);
        } else {
          merged[idx] = { ...merged[idx], ...cloudItem };
        }
      }
      set(localKey, merged);
    }
  }

  async function syncObjectCollection(localKey, firestoreColl) {
    if (!firestoreColl) return;
    const localObj = get(localKey, {});
    const cloudData = await window.firebaseConnector.getDocs(firestoreColl);
    if (cloudData.length === 0 && Object.keys(localObj).length > 0) {
      // Subir local a Firestore
      for (const [docId, data] of Object.entries(localObj)) {
        await window.firebaseConnector.saveDoc(firestoreColl, docId, data);
      }
    } else if (cloudData.length > 0) {
      // Mezclar
      const merged = { ...localObj };
      for (const cloudItem of cloudData) {
        const docId = cloudItem.id;
        const { id, ...data } = cloudItem;
        merged[docId] = data;
      }
      set(localKey, merged);
    }
  }

  async function syncAllFromFirebase() {
    if (!window.firebaseConnector) return;
    try {
      await window.firebaseConnector.init();
      await syncCollection('users', cloudPath('users'), 'username');
      await syncCollection('dentists', cloudPath('dentists'), 'id');
      await syncCollection('treatments', cloudPath('treatments'), 'code');
      await syncCollection('patients', cloudPath('patients'), 'id');
      await syncCollection('appointments', cloudPath('appointments'), 'id');
      await syncCollection('budgets', cloudPath('budgets'), 'id');
      await syncCollection('payments', cloudPath('payments'), 'id');
      await syncObjectCollection('clinica_config', cloudPath('clinica_config'));
      await syncObjectCollection('periodontograms', cloudPath('periodontograms'));
    } catch (e) {
      console.error("Error en sincronización en segundo plano:", e);
    }
  }

  // Objeto Global de Acceso a Base de Datos
  window.db = {
    init: initDB,

    // USUARIOS
    getUsers: () => get('users', []),
    getUser: (username) => {
      const normalized = username.toLowerCase().trim();
      const cid = getCurrentCompanyId();
      return get('users', []).find(u => u.username === normalized && (!cid || u.companyId === cid));
    },
    saveUser: (user) => {
      const users = get('users', []);
      const username = (user.username || '').toLowerCase().trim();
      const toSave = { ...user, username };
      const cid = getCurrentCompanyId();

      if (cid && toSave.companyId && toSave.companyId !== cid) return null;
      if (cid) toSave.companyId = cid;

      // Login espera SHA-256; hashear si viene en texto plano
      if (toSave.password && window.auth && typeof window.auth.hashPassword === 'function') {
        const looksHashed = /^[a-f0-9]{64}$/i.test(toSave.password);
        if (!looksHashed) {
          toSave.password = window.auth.hashPassword(toSave.password);
        }
      }

      const index = users.findIndex(u => u.username === username && (!cid || u.companyId === cid));
      if (index === -1) {
        users.push(toSave);
      } else {
        users[index] = { ...users[index], ...toSave };
      }
      set('users', users);
      syncSave('users', username, toSave);
      return toSave;
    },
    deleteUser: (username) => {
      const users = get('users', []);
      const cid = getCurrentCompanyId();
      if (!cid) return false;
      const normalized = username.toLowerCase().trim();
      const filtered = users.filter(u => !(u.username === normalized && u.companyId === cid));
      set('users', filtered);
      syncDelete('users', normalized);
      return filtered.length !== users.length;
    },

    // EMPRESAS (Tenants)
    getCompanies: () => get('companies', []),
    getCompany: (id) => get('companies', []).find(c => c.id === id),

    // DENTISTAS (Filtrados por la empresa activa del usuario)
    getDentists: () => {
      const dentists = get('dentists', []);
      const cid = getCurrentCompanyId();
      return cid ? dentists.filter(d => d.companyId === cid) : dentists;
    },
    getDentist: (id) => {
      const cid = getCurrentCompanyId();
      return get('dentists', []).find(d => d.id === id && (!cid || d.companyId === cid));
    },
    saveDentist: (dentist) => {
      const dentists = get('dentists', []);
      const cid = getCurrentCompanyId();
      const toSave = { ...dentist };
      if (cid && toSave.companyId && toSave.companyId !== cid) return null;
      if (cid) toSave.companyId = cid;
      if (!toSave.id) toSave.id = nuevoId('den');

      const index = dentists.findIndex(d => d.id === toSave.id && (!cid || d.companyId === cid));
      if (cid && index === -1 && dentists.some(d => d.id === toSave.id)) return null;
      if (index === -1) dentists.push(toSave);
      else dentists[index] = { ...dentists[index], ...toSave };

      set('dentists', dentists);
      syncSave('dentists', toSave.id, toSave);
      return toSave;
    },
    deleteDentist: (id) => {
      const dentists = get('dentists', []);
      const cid = getCurrentCompanyId();
      if (!cid) return false;
      const filtered = dentists.filter(d => !(d.id === id && d.companyId === cid));
      set('dentists', filtered);
      syncDelete('dentists', id);
      return filtered.length !== dentists.length;
    },

    // TRATAMIENTOS / PROCEDIMIENTOS (Catálogo del tenant)
    getTreatments: () => {
      const treatments = get('treatments', []);
      const cid = getCurrentCompanyId();
      return cid ? treatments.filter(t => t.companyId === cid || !t.companyId && cid === DEMO_COMPANY_ID) : treatments;
    },
    getProcedures: () => window.db.getTreatments(),
    saveProcedure: (procedure) => {
      const treatments = get('treatments', []);
      const cid = getCurrentCompanyId();
      const toSave = { ...procedure };
      if (cid && toSave.companyId && toSave.companyId !== cid) return null;
      if (cid) toSave.companyId = cid;
      const index = treatments.findIndex(t => t.code === toSave.code && (!cid || t.companyId === cid || !t.companyId && cid === DEMO_COMPANY_ID));
      if (index === -1) {
        treatments.push(toSave);
      } else {
        treatments[index] = { ...treatments[index], ...toSave };
      }
      set('treatments', treatments);
      syncSave('treatments', toSave.code, toSave);
      return toSave;
    },
    deleteProcedure: (code) => {
      const treatments = get('treatments', []);
      const cid = getCurrentCompanyId();
      if (!cid) return false;
      const filtered = treatments.filter(t => !(t.code === code && t.companyId === cid));
      set('treatments', filtered);
      syncDelete('treatments', code);
      return filtered.length !== treatments.length;
    },

    // CONFIGURACIÓN DE CLÍNICA (Aislada por sucursal/tenant)
    getClinicaConfig: (companyId) => {
      const configs = get('clinica_config', {});
      const activeCid = getCurrentCompanyId();
      const cid = companyId || activeCid;
      if (activeCid && cid !== activeCid) return {};
      if (cid && configs[cid]) {
        return configs[cid];
      }
      // Fallback a los datos de la empresa si no hay config
      const company = window.db.getCompany(cid);
      const isCredentalDemo = cid === DEMO_COMPANY_ID;
      // Para una empresa sin configurar se devuelven cadenas vacías: los
      // campos del formulario deben mostrar su placeholder y el encabezado
      // impreso debe omitir el dato, nunca imprimir "Teléfono no configurado".
      return {
        nombreClinica: company ? company.name : 'CREDental',
        direccion: isCredentalDemo
          ? 'Barrio Río Piedras, 26-29 avenida, 4 calle, San Pedro Sula, Cortés'
          : '',
        telefono: isCredentalDemo ? '+504 3243-3050' : '',
        correo: isCredentalDemo ? 'contacto@credentalhn.com' : ''
      };
    },
    saveClinicaConfig: (companyId, config) => {
      const configs = get('clinica_config', {});
      const activeCid = getCurrentCompanyId();
      const cid = companyId || activeCid;
      if (activeCid && cid !== activeCid) return false;
      if (cid) {
        configs[cid] = config;
        set('clinica_config', configs);
        syncSave('clinica_config', cid, config);
        return true;
      }
      return false;
    },

    // PACIENTES (Aislados por empresa activa)
    getPatients: () => {
      const patients = get('patients', []);
      const cid = getCurrentCompanyId();
      return cid ? patients.filter(p => p.companyId === cid) : patients;
    },
    getPatient: (id) => {
      const cid = getCurrentCompanyId();
      return get('patients', []).find(p => p.id === id && (!cid || p.companyId === cid));
    },
    savePatient: (patient) => {
      const patients = get('patients', []);
      const cid = getCurrentCompanyId();
      const toSave = { ...patient };
      
      if (cid && toSave.companyId && toSave.companyId !== cid) return null;
      if (cid) toSave.companyId = cid;
      
      if (!toSave.id) {
        // Registrar Paciente Nuevo
        toSave.id = nuevoId('pat');
        toSave.odontogram = {};
        toSave.motivoConsulta = toSave.motivoConsulta || 'Consulta general preventiva.';
        // Fecha de alta: la usan reportes para contar pacientes nuevos del periodo.
        if (!toSave.createdAt) toSave.createdAt = window.todayISO();
        patients.push(toSave);
      } else {
        // Modificar Paciente Existente
        const index = patients.findIndex(p => p.id === toSave.id && (!cid || p.companyId === cid));
        if (index !== -1) patients[index] = { ...patients[index], ...toSave };
        else if (cid && patients.some(p => p.id === toSave.id)) return null;
        else patients.push(toSave);
      }
      set('patients', patients);
      syncSave('patients', toSave.id, toSave);
      return toSave;
    },
    deletePatient: (id) => {
      const patients = get('patients', []);
      const cid = getCurrentCompanyId();
      if (!cid) return false;
      const target = patients.find(p => p.id === id && p.companyId === cid);
      if (!target) return false;
      const filtered = patients.filter(p => !(p.id === id && p.companyId === cid));
      set('patients', filtered);
      // Eliminar citas relacionadas
      const appts = get('appointments', []);
      set('appointments', appts.filter(a => !(a.patientId === id && a.companyId === cid)));
      const periodontograms = get('periodontograms', {});
      delete periodontograms[cid + ':' + id];
      delete periodontograms[id];
      set('periodontograms', periodontograms);
      syncDelete('patients', id);
      return true;
    },

    // CITAS / AGENDA (Aisladas por empresa activa)
    getAppointments: () => {
      const appts = get('appointments', []);
      const cid = getCurrentCompanyId();
      return cid ? appts.filter(a => a.companyId === cid) : appts;
    },
    getAppointment: (id) => {
      const cid = getCurrentCompanyId();
      return get('appointments', []).find(a => a.id === id && (!cid || a.companyId === cid));
    },
    saveAppointment: (appt) => {
      const appts = get('appointments', []);
      const cid = getCurrentCompanyId();
      const toSave = { ...appt };
      
      if (cid && toSave.companyId && toSave.companyId !== cid) return null;
      if (cid) toSave.companyId = cid;
      if (cid && toSave.patientId && !window.db.getPatient(toSave.patientId)) return null;
      if (cid && toSave.dentistId && !window.db.getDentist(toSave.dentistId)) return null;
      
      if (!toSave.id) {
        toSave.id = nuevoId('appt');
        appts.push(toSave);
      } else {
        const index = appts.findIndex(a => a.id === toSave.id && (!cid || a.companyId === cid));
        if (index !== -1) appts[index] = { ...appts[index], ...toSave };
        else if (cid && appts.some(a => a.id === toSave.id)) return null;
        else appts.push(toSave);
      }
      set('appointments', appts);
      syncSave('appointments', toSave.id, toSave);
      return toSave;
    },
    deleteAppointment: (id) => {
      const appts = get('appointments', []);
      const cid = getCurrentCompanyId();
      if (!cid) return false;
      const filtered = appts.filter(a => !(a.id === id && a.companyId === cid));
      set('appointments', filtered);
      syncDelete('appointments', id);
      return filtered.length !== appts.length;
    },

    // ODONTOGRAMA (Almacenamiento directo en el objeto Paciente)
    getOdontogram: (patientId) => {
      const patient = window.db.getPatient(patientId);
      return patient ? (patient.odontogram || {}) : {};
    },
    saveOdontogram: (patientId, odontogramData) => {
      const patient = window.db.getPatient(patientId);
      if (patient) {
        patient.odontogram = odontogramData;
        window.db.savePatient(patient);
        return true;
      }
      return false;
    },

    // PERIODONTOGRAMA (Almacenamiento directo o indexado por Paciente)
    getPeriodontogram: (patientId) => {
      if (!window.db.getPatient(patientId)) return null;
      const periodontograms = get('periodontograms', {});
      const cid = getCurrentCompanyId();
      return periodontograms[cid ? cid + ':' + patientId : patientId] || periodontograms[patientId] || null;
    },
    savePeriodontogram: (patientId, data) => {
      if (!window.db.getPatient(patientId)) return false;
      const periodontograms = get('periodontograms', {});
      const cid = getCurrentCompanyId();
      const key = cid ? cid + ':' + patientId : patientId;
      periodontograms[key] = data;
      if (key !== patientId) delete periodontograms[patientId];
      set('periodontograms', periodontograms);
      syncSave('periodontograms', key, data);
      return true;
    },

    // PRESUPUESTOS (Aislados por empresa activa)
    getBudgets: () => {
      const budgets = get('budgets', []);
      const cid = getCurrentCompanyId();
      return cid ? budgets.filter(b => b.companyId === cid) : budgets;
    },
    saveBudget: (budget) => {
      const budgets = get('budgets', []);
      const cid = getCurrentCompanyId();
      const toSave = { ...budget };
      
      if (cid && toSave.companyId && toSave.companyId !== cid) return null;
      if (cid) toSave.companyId = cid;
      if (cid && toSave.patientId && !window.db.getPatient(toSave.patientId)) return null;
      if (cid && toSave.dentistId && !window.db.getDentist(toSave.dentistId)) return null;
      
      if (!toSave.paymentStatus) {
        toSave.paymentStatus = 'pendiente';
      }

      // Folio legible para el usuario. El id interno (bud_...) nunca debe
      // mostrarse en pantalla ni en los comprobantes impresos.
      if (!toSave.folio) {
        const scope = cid ? budgets.filter(b => b.companyId === cid) : budgets;
        let max = 0;
        scope.forEach(b => {
          const m = /^P-(\d+)$/.exec(b.folio || '');
          if (m) max = Math.max(max, parseInt(m[1], 10));
        });
        toSave.folio = 'P-' + String(max + 1).padStart(4, '0');
      }
      
      if (!toSave.id) {
        toSave.id = nuevoId('bud');
        budgets.push(toSave);
      } else {
        const index = budgets.findIndex(b => b.id === toSave.id && (!cid || b.companyId === cid));
        if (index !== -1) budgets[index] = { ...budgets[index], ...toSave };
        else if (cid && budgets.some(b => b.id === toSave.id)) return null;
        else budgets.push(toSave);
      }
      set('budgets', budgets);
      syncSave('budgets', toSave.id, toSave);
      return toSave;
    },

    // COBRANZAS Y ABONOS (Gestión financiera)
    getPayments: (budgetId) => {
      const payments = get('payments', []);
      const cid = getCurrentCompanyId();
      const activeBudgetIds = cid
        ? new Set(window.db.getBudgets().map(b => b.id))
        : null;
      return payments.filter(p => {
        const belongsToTenant = !cid || p.companyId === cid || !p.companyId && activeBudgetIds.has(p.budgetId);
        return belongsToTenant && (!budgetId || p.budgetId === budgetId);
      });
    },
    registerPayment: (payment) => {
      const payments = get('payments', []);
      const cid = getCurrentCompanyId();
      const budget = window.db.getBudgets().find(b => b.id === payment.budgetId);
      if (!budget) return null;
      if (cid && payment.companyId && payment.companyId !== cid) return null;

      const toSave = { ...payment,
        id: nuevoId('pay'),
        date: payment.date || localDateISO(),
        // Hora del registro: la usa el libro de caja para ordenar el día.
        time: payment.time || new Date().toTimeString().slice(0, 5),
        companyId: cid || budget.companyId || payment.companyId
      };
      payments.push(toSave);
      set('payments', payments);
      syncSave('payments', toSave.id, toSave);

      // Actualizar automáticamente el estado del presupuesto
      const subtotal = budget.treatments.reduce((acc, t) => acc + (t.price * t.qty), 0);
      const total = subtotal * (1 - (budget.discount || 0) / 100);

      // Sumar solo los abonos visibles dentro del tenant activo.
      const budgetPayments = window.db.getPayments(budget.id);
      const totalPaid = budgetPayments.reduce((acc, p) => acc + parseFloat(p.amount), 0);

      if (totalPaid >= total) {
        budget.paymentStatus = 'pagado';
      } else if (totalPaid > 0) {
        budget.paymentStatus = 'parcial';
      } else {
        budget.paymentStatus = 'pendiente';
      }
      window.db.saveBudget(budget);
      return toSave;
    },
    updateBudgetPaymentStatus: (budgetId, paymentStatus) => {
      const budget = window.db.getBudgets().find(b => b.id === budgetId);
      if (budget) {
        budget.paymentStatus = paymentStatus;
        window.db.saveBudget(budget);
        return true;
      }
      return false;
    },
    
    // COMISIONES MÉDICAS (Calculador de ERP)
    getCommissions: () => {
      const budgets = get('budgets', []);
      const dentists = get('dentists', []);
      const cid = getCurrentCompanyId();
      
      const activeBudgets = cid ? budgets.filter(b => b.companyId === cid) : budgets;
      const commissions = {};
      
      dentists.forEach(d => {
        if (!cid || d.companyId === cid) {
          commissions[d.id] = {
            dentistId: d.id,
            dentistName: d.name,
            specialty: d.specialty,
            totalGenerated: 0,
            commissionAmount: 0
          };
        }
      });
      
      activeBudgets.forEach(b => {
        if (b.status === 'accepted' && commissions[b.dentistId]) {
          const subtotal = b.treatments.reduce((acc, t) => acc + (t.price * t.qty), 0);
          const valWithDiscount = subtotal * (1 - (b.discount || 0) / 100);
          commissions[b.dentistId].totalGenerated += valWithDiscount;
          commissions[b.dentistId].commissionAmount += valWithDiscount * 0.40; // 40% comisión
        }
      });
      
      return Object.values(commissions);
    },

    // CRM Y SEGUIMIENTO DE COBRANZA / RECALL
    getCrmTasks: () => {
      const patients = get('patients', []);
      const appointments = get('appointments', []);
      const budgets = get('budgets', []);
      const cid = getCurrentCompanyId();
      
      const activePatients = cid ? patients.filter(p => p.companyId === cid) : patients;
      const activeAppts = cid ? appointments.filter(a => a.companyId === cid) : appointments;
      const activeBudgets = cid ? budgets.filter(b => b.companyId === cid) : budgets;
      
      const tasks = [];
      
      activeBudgets.forEach(b => {
        if (b.status === 'draft') {
          const patient = activePatients.find(p => p.id === b.patientId);
          if (patient) {
            const subtotal = b.treatments.reduce((acc, t) => acc + (t.price * t.qty), 0);
            const total = subtotal * (1 - (b.discount || 0) / 100);
            tasks.push({
              id: 'crm_' + b.id,
              patientId: patient.id,
              patientName: patient.name,
              patientPhone: patient.phone,
              type: 'cobro',
              title: 'Presupuesto Borrador',
              desc: `Presupuesto de ${b.treatments.length} ítems por vencer.`,
              amount: total,
              targetId: b.id
            });
          }
        }
      });
      
      activePatients.forEach(p => {
        const patientAppointments = activeAppts.filter(a => a.patientId === p.id);
        const hasRecentAppt = patientAppointments.some(a => {
          const apptDate = new Date(a.dateTime);
          const threeMonthsAgo = new Date();
          threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
          return apptDate > threeMonthsAgo;
        });
        
        if (!hasRecentAppt) {
          tasks.push({
            id: 'crm_recall_' + p.id,
            patientId: p.id,
            patientName: p.name,
            patientPhone: p.phone,
            type: 'recall',
            title: 'Control preventivo pendiente',
            desc: 'Sin citas en los últimos 3 meses. Corresponde agendar higiene y control.',
            amount: null
          });
        }
      });
      
      return tasks;
    }
  };

  // Inicializar base de datos al cargar el script
  window.db.init();
})();
