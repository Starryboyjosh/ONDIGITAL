/* ==========================================================================
   COMUNICACIONES.JS - RECORDATORIOS Y SEGUIMIENTO
   Plantillas que se completan con los datos reales del paciente (próxima cita
   en Agenda, saldo en Cobranzas) y se envían por WhatsApp (wa.me) o correo
   (mailto:) desde el equipo de la clínica. El envío automático programado sí
   requiere una pasarela contratada y se muestra como tal.
   El historial de envíos se guarda por empresa en localStorage.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function() {
  if (window.auth) window.auth.checkSession();

  const templates = [
    {
      clave: 'Recordatorio',
      tipo: 'Recordatorio de cita',
      desc: 'Conecta con la Agenda para confirmar asistencia.',
      texto: 'Hola {paciente}, le recordamos su cita en {clinica} el {fecha} a las {hora}. Por favor confirme su asistencia. ¡Le esperamos!'
    },
    {
      clave: 'Presupuesto',
      tipo: 'Seguimiento de presupuesto',
      desc: 'Reactiva presupuestos en borrador desde Presupuestos.',
      texto: 'Hola {paciente}, su presupuesto de tratamiento sigue disponible. Con gusto le ayudamos a agendar y resolver cualquier duda para iniciar.'
    },
    {
      clave: 'Cobranza',
      tipo: 'Cobranza',
      desc: 'Recuerda saldos pendientes desde Cobranzas.',
      texto: 'Estimado/a {paciente}, le recordamos que tiene un saldo pendiente de {monto} por su tratamiento. Puede acercarse a la clínica o coordinar su pago.'
    },
    {
      clave: 'Reactivación',
      tipo: 'Cumpleaños / reactivación',
      desc: 'Reactiva pacientes sin control reciente.',
      texto: '¡Feliz cumpleaños, {paciente}! En {clinica} le deseamos un excelente día. Si desea retomar su control dental, con gusto le agendamos.'
    }
  ];

  const iconWhats = '<svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"></path></svg>';
  const iconMail = '<svg viewBox="0 0 24 24"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>';
  const iconClock = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>';

  const company = window.auth ? window.auth.getCurrentCompany() : null;
  const companyId = company ? company.id : 'default';
  const HIST_KEY = 'credental_envios_' + companyId;

  const clinica = window.db.getClinicaConfig
    ? (window.db.getClinicaConfig(companyId) || {})
    : {};
  const nombreClinica = clinica.nombreClinica || 'CREDental';

  // --- Datos reales del paciente para completar la plantilla ---

  // Las citas se guardan con `dateTime` ISO (db.js:491, seed-demo.js), no con
  // campos `date`/`time` separados: leerlos daba siempre cadena vacía y el
  // filtro devolvía cero citas habiendo decenas agendadas.
  function proximaCita(patientId) {
    const hoy = window.todayISO();
    return window.db.getAppointments()
      .filter(a => a.patientId === patientId &&
        String(a.dateTime || '').split('T')[0] >= hoy && a.status !== 'canceled')
      .sort((a, b) => String(a.dateTime).localeCompare(String(b.dateTime)))[0] || null;
  }

  // Solo los presupuestos cobrables generan saldo, con el mismo criterio único
  // que usan Cobranzas, Presupuestos y Pacientes (`window.esCobrable`, main.js).
  // Mirar solo `status` dejaba fuera la cancelación y la suspensión, así que
  // {monto} seguía reclamando por WhatsApp el saldo viejo de una cobranza que
  // la propia clínica ya había cerrado desde Cobranzas.
  function saldoPaciente(patientId) {
    return window.db.getBudgets()
      .filter(b => b.patientId === patientId && window.esCobrable(b))
      .reduce((total, b) => {
        const bruto = (b.treatments || []).reduce((acc, t) => acc + (t.price || 0) * (t.qty || 1), 0);
        const neto = bruto - bruto * ((b.discount || 0) / 100);
        const pagado = window.db.getPayments(b.id).reduce((acc, p) => acc + (p.amount || 0), 0);
        return total + Math.max(neto - pagado, 0);
      }, 0);
  }

  function completarPlantilla(texto, patient) {
    const cita = proximaCita(patient.id);
    return texto
      .replace(/\{paciente\}/g, patient.name.split(' ')[0])
      .replace(/\{clinica\}/g, nombreClinica)
      .replace(/\{fecha\}/g, cita ? window.formatDateLargaEs(String(cita.dateTime).split('T')[0]) : 'la fecha acordada')
      .replace(/\{hora\}/g, cita ? window.formatHora(cita.dateTime) : 'la hora acordada')
      .replace(/\{monto\}/g, window.formatMoney(saldoPaciente(patient.id)));
  }

  // --- Historial persistido ---

  function leerHistorial() {
    try {
      const raw = localStorage.getItem(HIST_KEY);
      const lista = raw ? JSON.parse(raw) : [];
      return Array.isArray(lista) ? lista : [];
    } catch (e) {
      return [];
    }
  }

  // Primera carga: el historial se construye a partir de lo que realmente hay
  // en Agenda y Cobranzas, para que coincida con el resto de los módulos.
  function sembrarHistorial() {
    if (localStorage.getItem(HIST_KEY)) return;
    const entradas = [];

    window.db.getAppointments()
      .filter(a => (a.date || '') >= window.todayISO() && a.status === 'confirmed')
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
      .slice(0, 3)
      .forEach(a => {
        const p = window.db.getPatient(a.patientId);
        if (!p) return;
        entradas.push({
          paciente: p.name, tipo: 'Recordatorio', canal: 'WhatsApp',
          fecha: window.addDaysISO(-1), estado: 'Enviado', estadoCls: 'badge-completed'
        });
      });

    window.db.getPatients()
      .filter(p => saldoPaciente(p.id) > 0)
      .slice(0, 2)
      .forEach((p, i) => {
        entradas.push({
          paciente: p.name, tipo: 'Cobranza', canal: i === 0 ? 'WhatsApp' : 'Correo',
          fecha: window.addDaysISO(-2 - i), estado: i === 0 ? 'Enviado' : 'Sin respuesta',
          estadoCls: i === 0 ? 'badge-completed' : 'badge-confirmed'
        });
      });

    const borrador = window.db.getBudgets().find(b => b.status === 'draft');
    if (borrador) {
      const p = window.db.getPatient(borrador.patientId);
      if (p) {
        entradas.push({
          paciente: p.name, tipo: 'Presupuesto', canal: 'Correo',
          fecha: window.addDaysISO(-5), estado: 'Enviado', estadoCls: 'badge-completed'
        });
      }
    }

    entradas.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
    localStorage.setItem(HIST_KEY, JSON.stringify(entradas));
  }

  function registrarEnvio(entrada) {
    const lista = leerHistorial();
    lista.unshift(entrada);
    localStorage.setItem(HIST_KEY, JSON.stringify(lista.slice(0, 60)));
  }

  // --- Modal de envío ---

  const sendModal = document.getElementById('send-modal');
  const sendTitle = document.getElementById('send-modal-title');
  const sendPaciente = document.getElementById('send-paciente');
  const sendContacto = document.getElementById('send-contacto');
  const sendTexto = document.getElementById('send-texto');
  const sendSubmit = document.getElementById('send-submit');
  let canalActivo = 'WhatsApp';
  let plantillaActiva = templates[0];

  window.setupModalClosers(sendModal, document.getElementById('send-modal-close'));

  function llenarPacientes() {
    const patients = window.db.getPatients();
    sendPaciente.innerHTML = '';
    patients.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      sendPaciente.appendChild(opt);
    });
  }

  function refrescarMensaje() {
    const patient = window.db.getPatient(sendPaciente.value);
    if (!patient) {
      sendContacto.textContent = '—';
      sendTexto.value = '';
      return;
    }
    sendContacto.textContent = canalActivo === 'WhatsApp'
      ? 'WhatsApp: ' + (patient.phone || 'sin teléfono registrado')
      : 'Correo: ' + (patient.email || 'sin correo registrado');
    sendTexto.value = completarPlantilla(plantillaActiva.texto, patient);
  }

  sendPaciente.addEventListener('change', refrescarMensaje);

  function abrirEnvio(clave, canal) {
    plantillaActiva = templates.find(t => t.clave === clave) || templates[0];
    canalActivo = canal;
    sendTitle.textContent = plantillaActiva.tipo + ' · ' + canal;
    sendSubmit.textContent = canal === 'WhatsApp' ? 'Abrir WhatsApp' : 'Abrir correo';
    llenarPacientes();
    refrescarMensaje();
    sendModal.classList.add('active');
  }

  document.getElementById('send-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const patient = window.db.getPatient(sendPaciente.value);
    if (!patient) return;
    const texto = sendTexto.value;

    if (canalActivo === 'WhatsApp') {
      const numero = window.telefonoWhatsApp(patient.phone);
      if (!numero) {
        window.showToast('El paciente no tiene un teléfono válido registrado.', 'warning');
        return;
      }
      window.open('https://wa.me/' + numero + '?text=' + encodeURIComponent(texto), '_blank', 'noopener');
    } else {
      if (!patient.email) {
        window.showToast('El paciente no tiene correo registrado en su ficha.', 'warning');
        return;
      }
      const asunto = plantillaActiva.tipo + ' · ' + nombreClinica;
      window.location.href = 'mailto:' + encodeURIComponent(patient.email) +
        '?subject=' + encodeURIComponent(asunto) +
        '&body=' + encodeURIComponent(texto);
    }

    registrarEnvio({
      paciente: patient.name,
      tipo: plantillaActiva.clave,
      canal: canalActivo === 'WhatsApp' ? 'WhatsApp' : 'Correo',
      fecha: window.todayISO(),
      estado: 'Enviado',
      estadoCls: 'badge-completed'
    });

    sendModal.classList.remove('active');
    renderMensajes();
    window.showToast('Mensaje preparado para ' + patient.name.split(' ')[0], 'success');
  });

  function renderTemplates() {
    const grid = document.getElementById('templates-grid');
    grid.innerHTML = templates.map(t => `
      <div class="crm-task-card type-recall">
        <div class="crm-task-icon recall">${iconMail}</div>
        <div class="crm-task-body">
          <div class="crm-task-title">${t.tipo}</div>
          <div class="crm-task-patient">${t.desc}</div>
          <div class="crm-task-desc" style="font-style: italic; line-height: 1.5;">${window.escapeHtml(t.texto)}</div>
          <div class="crm-task-actions" style="align-items: center;">
            <button type="button" class="btn-whatsapp js-send" data-clave="${t.clave}" data-canal="WhatsApp">${iconWhats} WhatsApp</button>
            <button type="button" class="btn-schedule js-send" data-clave="${t.clave}" data-canal="Correo">${iconMail} Correo</button>
            <span class="badge-soon" title="El envío automático programado requiere contratar la pasarela de mensajería">${iconClock} Envío programado: próximamente</span>
          </div>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.js-send').forEach(btn => {
      btn.addEventListener('click', function() {
        abrirEnvio(this.dataset.clave, this.dataset.canal);
      });
    });
  }

  function renderMensajes() {
    const filtro = document.getElementById('msg-filter-tipo').value;
    const tbody = document.getElementById('msg-body');
    const historial = leerHistorial();
    const list = filtro === 'all' ? historial : historial.filter(m => m.tipo === filtro);

    if (list.length === 0) {
      tbody.innerHTML = historial.length === 0
        ? '<tr><td colspan="5" class="table-empty-cell">Todavía no se ha enviado ningún mensaje. Use una plantilla para escribirle a un paciente.</td></tr>'
        : '<tr><td colspan="5" class="table-empty-cell">No hay mensajes de este tipo.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(m => (
      '<tr>' +
        '<td style="font-weight:600;">' + window.escapeHtml(m.paciente) + '</td>' +
        '<td><span class="tag">' + window.escapeHtml(m.tipo) + '</span></td>' +
        '<td>' + window.escapeHtml(m.canal) + '</td>' +
        '<td>' + window.formatDateEs(m.fecha) + '</td>' +
        '<td><span class="badge ' + (m.estadoCls || 'badge-completed') + '">' + window.escapeHtml(m.estado) + '</span></td>' +
      '</tr>'
    )).join('');
  }

  document.getElementById('msg-filter-tipo').addEventListener('change', renderMensajes);

  sembrarHistorial();
  renderTemplates();
  renderMensajes();
});
