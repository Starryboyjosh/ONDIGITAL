/* ==========================================================================
   DB.JS - MOTOR DE BASE DE DATOS LOCAL (LOCALSTORAGE)
   Simula operaciones de consulta y guardado relacional de datos clínicos
   con soporte multi-empresa y aislamiento de datos por tenant.
   ========================================================================== */

(function() {
  const DB_PREFIX = 'credental_';

  // Inyectar el cargador de Firebase
  function injectFirebaseConnector() {
    if (!document.querySelector('script[src="js/firebase/connection.js"]')) {
      const script = document.createElement('script');
      script.src = 'js/firebase/connection.js';
      document.head.appendChild(script);
    }
  }
  injectFirebaseConnector();

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
    }

    // Esperar a que firebaseConnector esté listo en window para sincronizar
    const checkConnector = setInterval(() => {
      if (window.firebaseConnector) {
        clearInterval(checkConnector);
        syncAllFromFirebase();
      }
    }, 200);
    // Timeout después de 10 segundos por si acaso offline
    setTimeout(() => clearInterval(checkConnector), 10000);
  }

  // Helper para leer/escribir de sessionStorage con JSON
  function get(key, defaultValue) {
    const val = sessionStorage.getItem(DB_PREFIX + key);
    return val ? JSON.parse(val) : defaultValue;
  }

  function set(key, value) {
    sessionStorage.setItem(DB_PREFIX + key, JSON.stringify(value));
  }

  // Sincronización asíncrona hacia Firebase
  function syncSave(localKey, docId, data) {
    if (window.firebaseConnector) {
      const firestoreColl = 'credental_' + localKey;
      window.firebaseConnector.saveDoc(firestoreColl, String(docId), data);
    }
  }

  function syncDelete(localKey, docId) {
    if (window.firebaseConnector) {
      const firestoreColl = 'credental_' + localKey;
      window.firebaseConnector.deleteDoc(firestoreColl, String(docId));
    }
  }

  async function syncCollection(localKey, firestoreColl, idField) {
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
      console.log("Iniciando sincronización con Firebase...");
      await syncCollection('companies', 'credental_companies', 'id');
      await syncCollection('users', 'credental_users', 'username');
      await syncCollection('dentists', 'credental_dentists', 'id');
      await syncCollection('treatments', 'credental_treatments', 'code');
      await syncCollection('patients', 'credental_patients', 'id');
      await syncCollection('appointments', 'credental_appointments', 'id');
      await syncCollection('budgets', 'credental_budgets', 'id');
      await syncCollection('payments', 'credental_payments', 'id');
      await syncObjectCollection('clinica_config', 'credental_clinica_config');
      await syncObjectCollection('periodontograms', 'credental_periodontograms');
      console.log("🔄 Base de datos sincronizada con Firebase Firestore.");
    } catch (e) {
      console.error("Error en sincronización en segundo plano:", e);
    }
  }

  // Objeto Global de Acceso a Base de Datos
  window.db = {
    init: initDB,

    // USUARIOS
    getUsers: () => get('users', []),
    getUser: (username) => get('users', []).find(u => u.username === username.toLowerCase().trim()),
    saveUser: (user) => {
      const users = get('users', []);
      const index = users.findIndex(u => u.username === user.username.toLowerCase().trim());
      if (index === -1) {
        users.push(user);
      } else {
        users[index] = { ...users[index], ...user };
      }
      set('users', users);
      syncSave('users', user.username.toLowerCase().trim(), user);
      return user;
    },
    deleteUser: (username) => {
      const users = get('users', []);
      const filtered = users.filter(u => u.username !== username.toLowerCase().trim());
      set('users', filtered);
      syncDelete('users', username.toLowerCase().trim());
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
    getDentist: (id) => get('dentists', []).find(d => d.id === id),

    // TRATAMIENTOS / PROCEDIMIENTOS (Catálogo del tenant)
    getTreatments: () => get('treatments', []),
    getProcedures: () => get('treatments', []),
    saveProcedure: (procedure) => {
      const treatments = get('treatments', []);
      const index = treatments.findIndex(t => t.code === procedure.code);
      if (index === -1) {
        treatments.push(procedure);
      } else {
        treatments[index] = procedure;
      }
      set('treatments', treatments);
      syncSave('treatments', procedure.code, procedure);
      return procedure;
    },
    deleteProcedure: (code) => {
      const treatments = get('treatments', []);
      const filtered = treatments.filter(t => t.code !== code);
      set('treatments', filtered);
      syncDelete('treatments', code);
    },

    // CONFIGURACIÓN DE CLÍNICA (Aislada por sucursal/tenant)
    getClinicaConfig: (companyId) => {
      const configs = get('clinica_config', {});
      const cid = companyId || getCurrentCompanyId();
      if (cid && configs[cid]) {
        return configs[cid];
      }
      // Fallback a los datos de la empresa si no hay config
      const company = window.db.getCompany(cid);
      return {
        nombreClinica: company ? company.name : 'Credental Clínica',
        direccion: 'Dirección no configurada',
        telefono: 'Teléfono no configurado',
        correo: 'Correo no configurado'
      };
    },
    saveClinicaConfig: (companyId, config) => {
      const configs = get('clinica_config', {});
      const cid = companyId || getCurrentCompanyId();
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
    getPatient: (id) => get('patients', []).find(p => p.id === id),
    savePatient: (patient) => {
      const patients = get('patients', []);
      const cid = getCurrentCompanyId();
      
      if (cid && !patient.companyId) {
        patient.companyId = cid;
      }
      
      if (!patient.id) {
        // Registrar Paciente Nuevo
        patient.id = 'pat_' + Date.now();
        patient.odontogram = {};
        patient.motivoConsulta = patient.motivoConsulta || 'Consulta general preventiva.';
        patients.push(patient);
      } else {
        // Modificar Paciente Existente
        const index = patients.findIndex(p => p.id === patient.id);
        if (index !== -1) {
          patients[index] = { ...patients[index], ...patient };
        }
      }
      set('patients', patients);
      syncSave('patients', patient.id, patient);
      return patient;
    },
    deletePatient: (id) => {
      const patients = get('patients', []);
      const filtered = patients.filter(p => p.id !== id);
      set('patients', filtered);
      // Eliminar citas relacionadas
      const appts = get('appointments', []);
      set('appointments', appts.filter(a => a.patientId !== id));
      syncDelete('patients', id);
    },

    // CITAS / AGENDA (Aisladas por empresa activa)
    getAppointments: () => {
      const appts = get('appointments', []);
      const cid = getCurrentCompanyId();
      return cid ? appts.filter(a => a.companyId === cid) : appts;
    },
    getAppointment: (id) => get('appointments', []).find(a => a.id === id),
    saveAppointment: (appt) => {
      const appts = get('appointments', []);
      const cid = getCurrentCompanyId();
      
      if (cid && !appt.companyId) {
        appt.companyId = cid;
      }
      
      if (!appt.id) {
        appt.id = 'appt_' + Date.now();
        appts.push(appt);
      } else {
        const index = appts.findIndex(a => a.id === appt.id);
        if (index !== -1) {
          appts[index] = appt;
        }
      }
      set('appointments', appts);
      syncSave('appointments', appt.id, appt);
      return appt;
    },
    deleteAppointment: (id) => {
      const appts = get('appointments', []);
      const filtered = appts.filter(a => a.id !== id);
      set('appointments', filtered);
      syncDelete('appointments', id);
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
      const periodontograms = get('periodontograms', {});
      return periodontograms[patientId] || null;
    },
    savePeriodontogram: (patientId, data) => {
      const periodontograms = get('periodontograms', {});
      periodontograms[patientId] = data;
      set('periodontograms', periodontograms);
      syncSave('periodontograms', patientId, data);
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
      
      if (cid && !budget.companyId) {
        budget.companyId = cid;
      }
      
      if (!budget.paymentStatus) {
        budget.paymentStatus = 'pendiente';
      }
      
      if (!budget.id) {
        budget.id = 'bud_' + Date.now();
        budgets.push(budget);
      } else {
        const index = budgets.findIndex(b => b.id === budget.id);
        if (index !== -1) {
          budgets[index] = budget;
        }
      }
      set('budgets', budgets);
      syncSave('budgets', budget.id, budget);
      return budget;
    },

    // COBRANZAS Y ABONOS (Gestión financiera)
    getPayments: (budgetId) => {
      const payments = get('payments', []);
      return budgetId ? payments.filter(p => p.budgetId === budgetId) : payments;
    },
    registerPayment: (payment) => {
      const payments = get('payments', []);
      payment.id = 'pay_' + Date.now();
      payment.date = payment.date || new Date().toISOString().split('T')[0];
      payments.push(payment);
      set('payments', payments);
      syncSave('payments', payment.id, payment);

      // Actualizar automáticamente el estado del presupuesto
      const budget = window.db.getBudgets().find(b => b.id === payment.budgetId);
      if (budget) {
        const subtotal = budget.treatments.reduce((acc, t) => acc + (t.price * t.qty), 0);
        const total = subtotal * (1 - (budget.discount || 0) / 100);
        
        // Sumar todos los abonos para este presupuesto
        const budgetPayments = payments.filter(p => p.budgetId === budget.id);
        const totalPaid = budgetPayments.reduce((acc, p) => acc + parseFloat(p.amount), 0);

        if (totalPaid >= total) {
          budget.paymentStatus = 'pagado';
        } else if (totalPaid > 0) {
          budget.paymentStatus = 'parcial';
        } else {
          budget.paymentStatus = 'pendiente';
        }
        window.db.saveBudget(budget);
      }
      return payment;
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
            title: 'Control Ausente',
            desc: `Higiene periódica retrasada.`,
            amount: 45000
          });
        }
      });
      
      return tasks;
    }
  };

  // Inicializar base de datos al cargar el script
  window.db.init();
})();
