/* ==========================================================================
   DB.JS - MOTOR DE BASE DE DATOS LOCAL (LOCALSTORAGE)
   Simula operaciones de consulta y guardado relacional de datos clínicos
   ========================================================================== */

(function() {
  const DB_PREFIX = 'ondental_';

  // Datos Pre-cargados por Defecto (Seed Data)
  const defaultDentists = [
    { id: 'dent_1', name: 'Dr. Sebastián Escoto', specialty: 'Implantología y Estética' },
    { id: 'dent_2', name: 'Dra. Camila Fuentes', specialty: 'Ortodoncia General' },
    { id: 'dent_3', name: 'Dr. Andrés Silva', specialty: 'Endodoncia y Conservación' }
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

  const defaultAppointments = [
    {
      id: 'appt_1',
      patientId: 'pat_1',
      dentistId: 'dent_1',
      dateTime: formatDate(0, '09:00'),
      duration: 45,
      specialty: 'Limpieza',
      notes: 'Limpieza profunda periódica por sarro acumulado.',
      status: 'confirmed'
    },
    {
      id: 'appt_2',
      patientId: 'pat_2',
      dentistId: 'dent_2',
      dateTime: formatDate(0, '11:30'),
      duration: 30,
      specialty: 'Ortodoncia',
      notes: 'Control mensual de brackets, ajuste de arcos superiores.',
      status: 'pending'
    },
    {
      id: 'appt_3',
      patientId: 'pat_3',
      dentistId: 'dent_3',
      dateTime: formatDate(0, '15:00'),
      duration: 60,
      specialty: 'Endodoncia',
      notes: 'Inicio de tratamiento de conductos en pieza 26.',
      status: 'pending'
    },
    {
      id: 'appt_4',
      patientId: 'pat_4',
      dentistId: 'dent_1',
      dateTime: formatDate(1, '10:00'),
      duration: 60,
      specialty: 'Estética',
      notes: 'Evaluación y toma de moldes para carillas.',
      status: 'confirmed'
    },
    {
      id: 'appt_5',
      patientId: 'pat_1',
      dentistId: 'dent_1',
      dateTime: formatDate(-2, '16:00'),
      duration: 45,
      specialty: 'Limpieza',
      notes: 'Cita anterior realizada con éxito.',
      status: 'completed'
    }
  ];

  const defaultBudgets = [
    {
      id: 'bud_1',
      patientId: 'pat_1',
      date: today.toISOString().split('T')[0],
      dentistId: 'dent_1',
      treatments: [
        { code: 'TR_01', name: 'Profilaxis Completa y Limpieza', price: 45000, qty: 1 },
        { code: 'TR_02', name: 'Restauración de Resina Simple (Cara)', price: 35000, qty: 2 }
      ],
      discount: 10,
      status: 'accepted'
    },
    {
      id: 'bud_2',
      patientId: 'pat_3',
      date: today.toISOString().split('T')[0],
      dentistId: 'dent_3',
      treatments: [
        { code: 'TR_03', name: 'Endodoncia Unirradicular', price: 120000, qty: 1 },
        { code: 'TR_04', name: 'Corona Metal-Porcelana', price: 280000, qty: 1 }
      ],
      discount: 5,
      status: 'draft'
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
      set('dentists', defaultDentists);
      set('treatments', defaultTreatments);
      set('patients', defaultPatients);
      set('appointments', defaultAppointments);
      set('budgets', defaultBudgets);
      set('initialized', true);
      console.log('OnDental DB: Inicializada con éxito sobre LocalStorage.');
    }
  }

  // Objeto Global de Acceso a Base de Datos
  window.db = {
    init: initDB,

    // DENTISTAS
    getDentists: () => get('dentists', []),
    getDentist: (id) => get('dentists', []).find(d => d.id === id),

    // TRATAMIENTOS (Catálogo)
    getTreatments: () => get('treatments', []),

    // PACIENTES
    getPatients: () => get('patients', []),
    getPatient: (id) => get('patients', []).find(p => p.id === id),
    savePatient: (patient) => {
      const patients = get('patients', []);
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

    // CITAS (Agenda)
    getAppointments: () => get('appointments', []),
    getAppointment: (id) => get('appointments', []).find(a => a.id === id),
    saveAppointment: (appt) => {
      const appts = get('appointments', []);
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

    // PRESUPUESTOS (Billing)
    getBudgets: () => get('budgets', []),
    saveBudget: (budget) => {
      const budgets = get('budgets', []);
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
    }
  };

  // Inicializar base de datos al cargar el script
  window.db.init();
})();
