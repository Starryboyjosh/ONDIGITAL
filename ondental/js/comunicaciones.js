/* ==========================================================================
   COMUNICACIONES.JS - ESQUELETO DE RECORDATORIOS Y SEGUIMIENTO
   Plantillas profesionales + historial de mensajes (datos de ejemplo).
   El envío real por WhatsApp/correo no está integrado: las acciones son
   demostrativas (placeholder).
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function() {
  if (window.auth) window.auth.checkSession();

  const templates = [
    {
      tipo: 'Recordatorio de cita',
      desc: 'Conecta con la Agenda para confirmar asistencia.',
      texto: 'Hola {paciente}, le recordamos su cita en {clinica} el {fecha} a las {hora}. Por favor confirme su asistencia. ¡Le esperamos!'
    },
    {
      tipo: 'Seguimiento de presupuesto',
      desc: 'Reactiva presupuestos en borrador desde Presupuestos.',
      texto: 'Hola {paciente}, su presupuesto de tratamiento sigue disponible. Con gusto le ayudamos a agendar y resolver cualquier duda para iniciar.'
    },
    {
      tipo: 'Cobranza',
      desc: 'Recuerda saldos pendientes desde Cobranzas.',
      texto: 'Estimado/a {paciente}, le recordamos que tiene un saldo pendiente de {monto} por su tratamiento. Puede acercarse a la clínica o coordinar su pago.'
    },
    {
      tipo: 'Cumpleaños / reactivación',
      desc: 'Reactiva pacientes sin control reciente.',
      texto: '¡Feliz cumpleaños, {paciente}! En {clinica} le deseamos un excelente día. Si desea retomar su control dental, con gusto le agendamos.'
    }
  ];

  const mockMensajes = [
    { paciente: 'María López', tipo: 'Recordatorio', canal: 'WhatsApp', fecha: '2026-06-03', estado: 'Enviado', estadoCls: 'badge-completed' },
    { paciente: 'Carlos Banegas', tipo: 'Cobranza', canal: 'WhatsApp', fecha: '2026-06-02', estado: 'Enviado', estadoCls: 'badge-completed' },
    { paciente: 'Ana Discua', tipo: 'Presupuesto', canal: 'Correo', fecha: '2026-06-01', estado: 'Programado', estadoCls: 'badge-pending' },
    { paciente: 'José Munguía', tipo: 'Reactivación', canal: 'WhatsApp', fecha: '2026-05-30', estado: 'Sin respuesta', estadoCls: 'badge-confirmed' }
  ];

  const iconWhats = '<svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"></path></svg>';
  const iconMail = '<svg viewBox="0 0 24 24"><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>';
  const iconClock = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>';

  function renderTemplates() {
    const grid = document.getElementById('templates-grid');
    grid.innerHTML = templates.map(t => `
      <div class="crm-task-card type-recall">
        <div class="crm-task-icon recall">${iconMail}</div>
        <div class="crm-task-body">
          <div class="crm-task-title">${t.tipo}</div>
          <div class="crm-task-patient">${t.desc}</div>
          <div class="crm-task-desc" style="font-style: italic; line-height: 1.5;">${t.texto}</div>
          <div class="crm-task-actions">
            <button class="btn-whatsapp js-send" data-tipo="${t.tipo}">${iconWhats} WhatsApp</button>
            <button class="btn-schedule js-send" data-tipo="${t.tipo}">${iconMail} Email</button>
            <button class="btn-schedule js-send" data-tipo="${t.tipo}">${iconClock} Programar</button>
          </div>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.js-send').forEach(btn => {
      btn.addEventListener('click', function() {
        window.showToast('Envío demostrativo: la integración de mensajería aún no está activa.', 'info');
      });
    });
  }

  function renderMensajes() {
    const filtro = document.getElementById('msg-filter-tipo').value;
    const tbody = document.getElementById('msg-body');
    const list = filtro === 'all' ? mockMensajes : mockMensajes.filter(m => m.tipo === filtro);

    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: var(--color-gray); padding: 26px;">No hay mensajes de este tipo.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(m => {
      const d = new Date(m.fecha + 'T00:00:00');
      const fecha = isNaN(d.getTime()) ? m.fecha : d.toLocaleDateString('es-HN', { day: 'numeric', month: 'short', year: 'numeric' });
      return `
        <tr>
          <td style="font-weight:600;">${m.paciente}</td>
          <td><span class="tag">${m.tipo}</span></td>
          <td>${m.canal}</td>
          <td>${fecha}</td>
          <td><span class="badge ${m.estadoCls}">${m.estado}</span></td>
        </tr>
      `;
    }).join('');
  }

  document.getElementById('msg-filter-tipo').addEventListener('change', renderMensajes);

  renderTemplates();
  renderMensajes();
});
