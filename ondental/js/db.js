/* ==========================================================================
   DB.JS - MOTOR DE BASE DE DATOS LOCAL (LOCALSTORAGE)
   Simula operaciones de consulta y guardado relacional de datos clínicos
   con soporte multi-empresa y aislamiento de datos por tenant.
   ========================================================================== */

(function() {
  const DB_PREFIX = 'ondental_';

  // Helper para obtener el companyId del usuario logueado en tiempo real
  function getCurrentCompanyId() {
    if (window.sessionStorage) {
      const session = sessionStorage.getItem('ondental_session');
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

  // 1. Catálogo de Empresas (Tenants)
  const defaultCompanies = [
    { id: 'credental', name: 'Credental', accent: '#00e5b0', description: 'Empresa principal de gestión dental' },
    { id: 'ondental-central', name: 'OnDental Clínica Central', accent: '#2b8af7', description: 'Clínica central de operaciones' },
    { id: 'sonrisa-perfecta', name: 'Sonrisa Perfecta', accent: '#f5a623', description: 'Clínica especializada en estética dental' },
    { id: 'dentpro', name: 'DentPro Consultores', accent: '#9b59b6', description: 'Consultores dentales especializados' }
  ];

  // 1.5. Usuarios válidos por defecto
  const defaultUsers = [
    { username: 'admin', name: 'Administrador General', role: 'Administración', avatar: 'AG', companyId: 'credental', password: '1234' },
    { username: 'dentista', name: 'Dr. Sebastián Escoto', role: 'Dentista Principal', avatar: 'SE', companyId: 'credental', password: '1234' },
    { username: 'recepcion', name: 'María González Ruiz', role: 'Recepcionista', avatar: 'MG', companyId: 'ondental-central', password: '1234' },
    { username: 'dra.lopez', name: 'Dra. Ana López Herrera', role: 'Odontóloga General', avatar: 'AL', companyId: 'ondental-central', password: '1234' },
    { username: 'dr.martinez', name: 'Dr. Carlos Martínez Vega', role: 'Cirujano Maxilofacial', avatar: 'CM', companyId: 'sonrisa-perfecta', password: '1234' },
    { username: 'higienista', name: 'Laura Fernández Díaz', role: 'Higienista Dental', avatar: 'LF', companyId: 'sonrisa-perfecta', password: '1234' },
    { username: 'dr.ramirez', name: 'Dr. Roberto Ramírez Soto', role: 'Ortodoncista', avatar: 'RR', companyId: 'dentpro', password: '1234' },
    { username: 'asistente', name: 'Patricia Morales Cruz', role: 'Asistente Dental', avatar: 'PM', companyId: 'dentpro', password: '1234' }
  ];

  // 2. Dentistas de muestra vinculados a empresas
  const defaultDentists = [
    { id: 'dentista', name: 'Dr. Sebastián Escoto', specialty: 'Implantología y Estética', companyId: 'credental' },
    { id: 'dra.lopez', name: 'Dra. Ana López Herrera', specialty: 'Odontología General', companyId: 'ondental-central' },
    { id: 'dr.martinez', name: 'Dr. Carlos Martínez Vega', specialty: 'Cirujano Maxilofacial', companyId: 'sonrisa-perfecta' },
    { id: 'dr.ramirez', name: 'Dr. Roberto Ramírez Soto', specialty: 'Ortodoncista', companyId: 'dentpro' }
  ];

  const defaultTreatments = [
    { code: 'TR_01', name: 'Profilaxis Completa y Limpieza', price: 45000 },
    { code: 'TR_02', name: 'Restauración de Resina Simple (Cara)', price: 35000 },
    { code: 'TR_03', name: 'Endodoncia Unirradicular', price: 120000 },
    { code: 'TR_04', name: 'Corona Metal-Porcelana', price: 280000 },
    { code: 'TR_05', name: 'Implante Dental de Titanio (Solo Fase Quirúrgica)', price: 450000 },
    { code: 'TR_06', name: 'Extracción Dental Simple', price: 50000 },
    { code: 'TR_07', name: 'Blanqueamiento Dental Laser (Sesión)', price: 150000 },
    { code: 'TR_08', name: 'Aparatología Ortodoncia Metálica (Instalación)', price: 320000 }
  ];

  // 3. Pacientes distribuidos en las 4 empresas
  const defaultPatients = [
    {
      id: 'pat_1',
      name: 'Gabriel Mendoza Rojas',
      rut: '17.342.915-K',
      age: 34,
      email: 'gabriel.mendoza@gmail.com',
      phone: '+56 9 8472 1928',
      allergies: 'Penicilina',
      medicalHistory: 'Hipertensión controlada con Losartán. Sin otros antecedentes crónicos.',
      tags: ['Alergias', 'Control Trimestral'],
      companyId: 'credental',
      odontogram: {
        '18': { condition: 'ausente', faces: {} },
        '16': { condition: 'healthy', faces: { top: 'caries', right: 'caries' } },
        '24': { condition: 'healthy', faces: { center: 'restaurado' } },
        '36': { condition: 'implante', faces: {} },
        '47': { condition: 'healthy', faces: { top: 'caries' } }
      }
    },
    {
      id: 'pat_2',
      name: 'Valentina Silva Contreras',
      rut: '19.821.554-3',
      age: 26,
      email: 'valesilva@outlook.cl',
      phone: '+56 9 7384 1029',
      allergies: 'Ninguna',
      medicalHistory: 'Paciente sana. Tratamiento de ortodoncia activo.',
      tags: ['Ortodoncia'],
      companyId: 'ondental-central',
      odontogram: {
        '12': { condition: 'corona', faces: {} },
        '38': { condition: 'ausente', faces: {} },
        '48': { condition: 'ausente', faces: {} }
      }
    },
    {
      id: 'pat_3',
      name: 'Héctor Tapia Valdés',
      rut: '12.449.182-0',
      age: 48,
      email: 'hector.tapia@yahoo.com',
      phone: '+56 9 6482 9102',
      allergies: 'Aspirina',
      medicalHistory: 'Diabetes tipo II bajo dieta y Metformina.',
      tags: ['Control Semestral'],
      companyId: 'sonrisa-perfecta',
      odontogram: {
        '14': { condition: 'healthy', faces: { center: 'restaurado' } },
        '15': { condition: 'healthy', faces: { center: 'restaurado' } },
        '26': { condition: 'healthy', faces: { top: 'caries' } },
        '46': { condition: 'ausente', faces: {} }
      }
    },
    {
      id: 'pat_4',
      name: 'Sofía Morán Alarcón',
      rut: '21.092.385-2',
      age: 22,
      email: 'sofia.moran@live.com',
      phone: '+56 9 5592 1083',
      allergies: 'Ninguna',
      medicalHistory: 'Sin condiciones médicas de cuidado.',
      tags: ['Estética'],
      companyId: 'dentpro',
      odontogram: {}
    },
    {
      id: 'pat_5',
      name: 'Andrés Castro Prieto',
      rut: '15.228.495-2',
      age: 41,
      email: 'andres.castro@gmail.com',
      phone: '+56 9 7784 1209',
      allergies: 'Ninguna',
      medicalHistory: 'Sano.',
      tags: ['Control Semestral'],
      companyId: 'credental',
      odontogram: {
        '11': { condition: 'healthy', faces: { center: 'restaurado' } }
      }
    },
    {
      id: 'pat_6',
      name: 'Camila Reyes Ortiz',
      rut: '18.903.412-1',
      age: 29,
      email: 'camilareyes@outlook.com',
      phone: '+56 9 6692 8401',
      allergies: 'Látex',
      medicalHistory: 'Fobia dental leve.',
      tags: ['Control Anual'],
      companyId: 'ondental-central',
      odontogram: {}
    }
  ];

  // Generamos citas relativas a la fecha actual para mantener el dashboard vivo
  const today = new Date();
  const formatDate = (daysOffset, hourStr) => {
    const d = new Date(today);
    d.setDate(today.getDate() + daysOffset);
    const dateStr = d.toISOString().split('T')[0];
    return `${dateStr}T${hourStr}`;
  };

  // Citas de muestra asignadas a empresas y dentistas específicos
  const defaultAppointments = [
    {
      id: 'appt_1',
      patientId: 'pat_1',
      dentistId: 'dentista',
      dateTime: formatDate(0, '09:00'),
      duration: 45,
      specialty: 'Limpieza',
      notes: 'Limpieza profunda periódica por sarro acumulado.',
      status: 'confirmed',
      companyId: 'credental'
    },
    {
      id: 'appt_2',
      patientId: 'pat_2',
      dentistId: 'dra.lopez',
      dateTime: formatDate(0, '11:30'),
      duration: 30,
      specialty: 'Ortodoncia',
      notes: 'Control mensual de brackets, ajuste de arcos superiores.',
      status: 'pending',
      companyId: 'ondental-central'
    },
    {
      id: 'appt_3',
      patientId: 'pat_3',
      dentistId: 'dr.martinez',
      dateTime: formatDate(0, '15:00'),
      duration: 60,
      specialty: 'Endodoncia',
      notes: 'Inicio de tratamiento de conductos en pieza 26.',
      status: 'pending',
      companyId: 'sonrisa-perfecta'
    },
    {
      id: 'appt_4',
      patientId: 'pat_4',
      dentistId: 'dr.ramirez',
      dateTime: formatDate(1, '10:00'),
      duration: 60,
      specialty: 'Estética',
      notes: 'Evaluación y toma de moldes para carillas.',
      status: 'confirmed',
      companyId: 'dentpro'
    },
    {
      id: 'appt_5',
      patientId: 'pat_1',
      dentistId: 'dentista',
      dateTime: formatDate(-2, '16:00'),
      duration: 45,
      specialty: 'Limpieza',
      notes: 'Cita anterior realizada con éxito.',
      status: 'completed',
      companyId: 'credental'
    },
    {
      id: 'appt_6',
      patientId: 'pat_5',
      dentistId: 'dentista',
      dateTime: formatDate(0, '14:30'),
      duration: 120, // 2 Horas
      specialty: 'Estética',
      notes: 'Instalación de carilla en pieza 11.',
      status: 'pending',
      companyId: 'credental'
    }
  ];

  const defaultBudgets = [
    {
      id: 'bud_1',
      patientId: 'pat_1',
      date: today.toISOString().split('T')[0],
      dentistId: 'dentista',
      treatments: [
        { code: 'TR_01', name: 'Profilaxis Completa y Limpieza', price: 45000, qty: 1 },
        { code: 'TR_02', name: 'Restauración de Resina Simple (Cara)', price: 35000, qty: 2 }
      ],
      discount: 10,
      status: 'accepted',
      companyId: 'credental'
    },
    {
      id: 'bud_2',
      patientId: 'pat_3',
      date: today.toISOString().split('T')[0],
      dentistId: 'dr.martinez',
      treatments: [
        { code: 'TR_03', name: 'Endodoncia Unirradicular', price: 120000, qty: 1 },
        { code: 'TR_04', name: 'Corona Metal-Porcelana', price: 280000, qty: 1 }
      ],
      discount: 5,
      status: 'draft',
      companyId: 'sonrisa-perfecta'
    }
  ];

  // Helper para leer/escribir de LocalStorage con JSON
  function get(key, defaultValue) {
    const val = localStorage.getItem(DB_PREFIX + key);
    return val ? JSON.parse(val) : defaultValue;
  }

  function set(key, value) {
    localStorage.setItem(DB_PREFIX + key, JSON.stringify(value));
  }

  // Inicialización de la Base de Datos
  function initDB() {
    if (!localStorage.getItem(DB_PREFIX + 'initialized')) {
      set('companies', defaultCompanies);
      set('users', defaultUsers);
      set('dentists', defaultDentists);
      set('treatments', defaultTreatments);
      set('patients', defaultPatients);
      set('appointments', defaultAppointments);
      set('budgets', defaultBudgets);
      set('initialized', true);
      console.log('OnDental DB Multi-Empresa: Inicializada con éxito sobre LocalStorage.');
    } else if (!localStorage.getItem(DB_PREFIX + 'users')) {
      // Por si ya estaba inicializada pero sin la clave de usuarios
      set('users', defaultUsers);
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
      return user;
    },
    deleteUser: (username) => {
      const users = get('users', []);
      const filtered = users.filter(u => u.username !== username.toLowerCase().trim());
      set('users', filtered);
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

    // TRATAMIENTOS (Catálogo común)
    getTreatments: () => get('treatments', []),

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
        patients.push(patient);
      } else {
        // Modificar Paciente Existente
        const index = patients.findIndex(p => p.id === patient.id);
        if (index !== -1) {
          patients[index] = { ...patients[index], ...patient };
        }
      }
      set('patients', patients);
      return patient;
    },
    deletePatient: (id) => {
      const patients = get('patients', []);
      const filtered = patients.filter(p => p.id !== id);
      set('patients', filtered);
      // Eliminar citas relacionadas
      const appts = get('appointments', []);
      set('appointments', appts.filter(a => a.patientId !== id));
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
      return appt;
    },
    deleteAppointment: (id) => {
      const appts = get('appointments', []);
      const filtered = appts.filter(a => a.id !== id);
      set('appointments', filtered);
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
      return budget;
    },
    
    // COMISIONES MÉDICAS (Calculador de ERP inspirado en Dentalink/Doctocliq)
    getCommissions: () => {
      const budgets = get('budgets', []);
      const dentists = get('dentists', []);
      const cid = getCurrentCompanyId();
      
      // Filtrar presupuestos de la empresa activa
      const activeBudgets = cid ? budgets.filter(b => b.companyId === cid) : budgets;
      
      const commissions = {};
      
      // Inicializar odontólogos del tenant
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
      
      // Calcular comisiones (40% de los presupuestos aceptados)
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

    // CRM Y SEGUIMIENTO DE COBRANZA / RECALL (Inspirado en Dentalink/Doctocliq)
    getCrmTasks: () => {
      const patients = get('patients', []);
      const appointments = get('appointments', []);
      const budgets = get('budgets', []);
      const cid = getCurrentCompanyId();
      
      const activePatients = cid ? patients.filter(p => p.companyId === cid) : patients;
      const activeAppts = cid ? appointments.filter(a => a.companyId === cid) : appointments;
      const activeBudgets = cid ? budgets.filter(b => b.companyId === cid) : budgets;
      
      const tasks = [];
      
      // 1. Cobranza: Presupuestos aceptados con saldo sin pagar, o presupuestos en borrador sin aceptar
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
      
      // 2. CRM Recall: Pacientes sin citas registradas en los próximos días o con última cita hace más de 3 meses
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
