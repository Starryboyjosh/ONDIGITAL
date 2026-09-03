/* ==========================================================================
   PACIENTES.JS - EXPEDIENTE CLÍNICO Y DIRECTORIO
   Directorio lateral + ficha del paciente con navegación por pestañas
   (resumen, datos, historia, evoluciones, clínico, finanzas, documentos,
   comunicaciones). Las secciones sin datos muestran estados vacíos.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function() {
  const patientTableBody = document.getElementById('patient-list-body');
  const searchInput = document.getElementById('patient-search');
  const addPatientBtn = document.getElementById('add-patient-btn');
  const patientModal = document.getElementById('patient-modal');
  const patientForm = document.getElementById('patient-form');

  const detailPanel = document.getElementById('patient-details-card');
  const detailEmpty = document.getElementById('patient-details-empty');

  let selectedPatientId = null;

  // Registrar Cierre de Modales
  window.setupModalClosers(patientModal, document.getElementById('patient-modal-close'));

  // Render inicial
  renderPatientList();

  // Buscador en tiempo real
  searchInput.addEventListener('input', function() {
    renderPatientList(this.value);
  });

  // Abrir creación de paciente
  addPatientBtn.addEventListener('click', function() {
    patientForm.reset();
    document.getElementById('patient-id').value = '';
    document.getElementById('modal-title-text').textContent = 'Registrar Nuevo Paciente';
    patientModal.classList.add('active');
  });

  // Botones de edición dentro del expediente
  ['record-edit-btn', 'record-edit-btn-2'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', function() {
        if (selectedPatientId) window.editPatient(selectedPatientId);
      });
    }
  });

  // Navegación por pestañas (delegación)
  const tabBar = document.getElementById('patient-tabs');
  if (tabBar) {
    tabBar.addEventListener('click', function(e) {
      const btn = e.target.closest('.patient-tab');
      if (btn) setActiveTab(btn.dataset.tab);
    });
  }

  function setActiveTab(tabKey) {
    document.querySelectorAll('.patient-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tabKey);
    });
    document.querySelectorAll('.patient-panel').forEach(p => {
      p.classList.toggle('active', p.dataset.panel === tabKey);
    });
  }

  // Guardar paciente
  patientForm.addEventListener('submit', function(e) {
    e.preventDefault();

    const id = document.getElementById('patient-id').value;
    const tagsInput = document.getElementById('patient-tags').value;
    const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0) : [];

    const patientData = {
      name: document.getElementById('patient-name').value,
      rut: document.getElementById('patient-rut').value,
      age: parseInt(document.getElementById('patient-age').value),
      email: document.getElementById('patient-email').value,
      phone: document.getElementById('patient-phone').value,
      motivoConsulta: document.getElementById('patient-reason').value,
      allergies: document.getElementById('patient-allergies').value || 'Ninguna',
      medicalHistory: document.getElementById('patient-history').value || 'Sin antecedentes.',
      tags
    };

    if (id) patientData.id = id;

    const saved = window.db.savePatient(patientData);
    window.showToast(id ? 'Ficha de paciente actualizada' : 'Paciente registrado con éxito', 'success');

    patientModal.classList.remove('active');
    renderPatientList(searchInput.value);
    window.selectPatient(saved.id);
  });


  // --- HELPERS ---

  function getInitials(name) {
    const w = (name || '').trim().split(/\s+/);
    if (w.length >= 2) return (w[0][0] + w[1][0]).toUpperCase();
    return (w[0] || 'P').slice(0, 2).toUpperCase();
  }

  function fmtDate(s) {
    return new Date(s).toLocaleDateString('es-HN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function budgetTotal(b) {
    const subtotal = b.treatments.reduce((acc, t) => acc + (t.price * t.qty), 0);
    return subtotal * (1 - (b.discount || 0) / 100);
  }

  function budgetPaid(b) {
    return window.db.getPayments(b.id).reduce((acc, p) => acc + parseFloat(p.amount || 0), 0);
  }

  // --- DIRECTORIO (RAIL IZQUIERDO) ---

  function renderPatientList(query = '') {
    const patients = window.db.getPatients();
    patientTableBody.innerHTML = '';

    const q = query.trim().toLowerCase();
    const filtered = patients.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.rut.toLowerCase().includes(q) ||
      p.phone.includes(q)
    );

    if (filtered.length === 0) {
      patientTableBody.innerHTML = `
        <tr>
          <td colspan="2" style="text-align: center; color: var(--color-gray); padding: 30px;">
            No se encontraron pacientes registrados.
          </td>
        </tr>
      `;
      return;
    }

    filtered.forEach(p => {
      const tr = document.createElement('tr');
      tr.style.cursor = 'pointer';
      tr.className = p.id === selectedPatientId ? 'active-row' : '';
      tr.innerHTML = `
        <td>
          <div class="patient-list-name">${window.escapeHtml(p.name)}</div>
          <div class="patient-list-doc">${window.escapeHtml(p.rut)}</div>
        </td>
        <td style="text-align: right;">
          <button onclick="event.stopPropagation(); window.editPatient('${window.escapeHtml(p.id)}')" class="btn btn-secondary btn-sm">Editar</button>
        </td>
      `;
      tr.addEventListener('click', () => window.selectPatient(p.id));
      patientTableBody.appendChild(tr);
    });
  }

  // --- SELECCIÓN Y CARGA DEL EXPEDIENTE ---

  window.selectPatient = function(patientId) {
    selectedPatientId = patientId;
    renderPatientList(searchInput.value);

    const patient = window.db.getPatient(patientId);
    if (!patient) {
      detailPanel.style.display = 'none';
      detailEmpty.style.display = 'flex';
      return;
    }

    detailEmpty.style.display = 'none';
    detailPanel.style.display = 'flex';
    setActiveTab('resumen');

    // Cabecera
    document.getElementById('record-avatar').textContent = getInitials(patient.name);
    document.getElementById('card-patient-name').textContent = patient.name;
    document.getElementById('record-sub').textContent = `${patient.age} años · ${patient.rut}`;
    renderTags(patient);

    // Accesos directos a herramientas clínicas
    document.getElementById('card-link-odontograma').href = `odontograma.html?id=${patient.id}`;
    document.getElementById('card-link-periodontograma').href = `periodontograma.html?id=${patient.id}`;
    document.getElementById('card-link-presupuesto').href = `presupuestos.html?id=${patient.id}`;

    renderResumen(patient);
    renderDatos(patient);
    renderHistoria(patient);
    renderEvoluciones(patient.id);
    renderClinico(patient);
    renderFinanzas(patient.id);
  };

  function renderTags(patient) {
    const cardTags = document.getElementById('card-patient-tags');
    cardTags.innerHTML = '';
    if (patient.tags && patient.tags.length > 0) {
      patient.tags.forEach(t => {
        const span = document.createElement('span');
        span.className = `patient-tag ${t.toLowerCase() === 'alergias' ? 'tag-alergeno' : 'tag-control'}`;
        span.textContent = t;
        cardTags.appendChild(span);
      });
    } else {
      cardTags.innerHTML = '<span style="font-size: 0.78rem; color: var(--color-gray);">Sin etiquetas</span>';
    }
  }

  function renderResumen(patient) {
    document.getElementById('record-motivo').textContent = patient.motivoConsulta || 'Consulta general preventiva.';

    const allergySection = document.getElementById('record-allergy-section');
    const hasAllergy = patient.allergies && patient.allergies.trim() &&
                       patient.allergies.trim().toLowerCase() !== 'ninguna';
    if (hasAllergy) {
      allergySection.style.display = 'block';
      document.getElementById('record-allergy-text').textContent = patient.allergies;
    } else {
      allergySection.style.display = 'none';
    }

    // Indicadores
    const appts = window.db.getAppointments().filter(a => a.patientId === patient.id);
    const now = new Date();
    const future = appts
      .filter(a => a.status !== 'canceled' && new Date(a.dateTime) >= now)
      .sort((a, b) => a.dateTime.localeCompare(b.dateTime));
    const past = appts
      .filter(a => a.status === 'completed' && new Date(a.dateTime) < now)
      .sort((a, b) => b.dateTime.localeCompare(a.dateTime));

    const budgets = window.db.getBudgets().filter(b => b.patientId === patient.id);
    let balance = 0;
    budgets.forEach(b => {
      if (b.status === 'accepted') balance += Math.max(budgetTotal(b) - budgetPaid(b), 0);
    });

    const stats = [
      { label: 'Próxima cita', value: future.length ? fmtDate(future[0].dateTime) : '—' },
      { label: 'Última visita', value: past.length ? fmtDate(past[0].dateTime) : '—' },
      { label: 'Presupuestos', value: budgets.length },
      { label: 'Saldo pendiente', value: window.formatMoney(balance) }
    ];
    document.getElementById('record-stats').innerHTML = stats.map(s => `
      <div class="record-stat">
        <div class="record-stat-label">${s.label}</div>
        <div class="record-stat-value">${s.value}</div>
      </div>
    `).join('');
  }

  function renderDatos(patient) {
    document.getElementById('data-name').textContent = patient.name;
    document.getElementById('card-patient-rut').textContent = patient.rut;
    document.getElementById('data-age').textContent = `${patient.age} años`;
    document.getElementById('card-patient-email').textContent = patient.email;
    document.getElementById('card-patient-phone').textContent = patient.phone;
  }

  function renderHistoria(patient) {
    document.getElementById('hist-motivo').textContent = patient.motivoConsulta || 'Consulta general preventiva.';
    document.getElementById('hist-allergies').textContent = patient.allergies || 'Ninguna';
    document.getElementById('hist-history').textContent = patient.medicalHistory || 'Sin antecedentes.';
  }

  function renderEvoluciones(patientId) {
    const timeline = document.getElementById('card-patient-timeline');
    const appointments = window.db.getAppointments().filter(a => a.patientId === patientId);
    appointments.sort((a, b) => b.dateTime.localeCompare(a.dateTime));

    timeline.innerHTML = '';
    if (appointments.length === 0) {
      timeline.innerHTML = `
        <div class="record-empty">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          <div class="record-empty-title">Sin evoluciones registradas</div>
          <div class="record-empty-desc">No hay citas ni tratamientos anteriores para este paciente.</div>
        </div>
      `;
      return;
    }

    appointments.forEach(appt => {
      const dentist = window.db.getDentist(appt.dentistId) || { name: 'Desconocido' };
      let badgeClass = 'badge-pending', badgeText = 'Pendiente';
      if (appt.status === 'confirmed') { badgeClass = 'badge-confirmed'; badgeText = 'Confirmada'; }
      if (appt.status === 'completed') { badgeClass = 'badge-completed'; badgeText = 'Completada'; }
      if (appt.status === 'canceled') { badgeClass = 'badge-canceled'; badgeText = 'Cancelada'; }

      const hourStr = appt.dateTime.split('T')[1];
      const item = document.createElement('div');
      item.className = 'finding-item';
      if (appt.status === 'completed') item.style.borderLeftColor = 'var(--color-green)';
      if (appt.status === 'canceled') item.style.borderLeftColor = 'var(--color-red)';
      if (appt.status === 'pending') item.style.borderLeftColor = 'var(--color-amber)';

      item.innerHTML = `
        <div class="finding-meta">
          <span>${fmtDate(appt.dateTime)} a las ${hourStr} hrs</span>
          <span class="badge ${badgeClass}">${badgeText}</span>
        </div>
        <div class="finding-desc" style="font-size: 0.82rem; margin-top: 4px;">
          <strong>${window.escapeHtml(appt.specialty)}</strong> con ${window.escapeHtml(dentist.name)}
        </div>
        ${appt.notes ? `<div style="font-size: 0.75rem; color: var(--color-gray); margin-top: 4px; font-style: italic;">Obs: ${window.escapeHtml(appt.notes)}</div>` : ''}
      `;
      timeline.appendChild(item);
    });
  }

  function renderClinico(patient) {
    // Odontograma
    const odo = patient.odontogram || {};
    let caries = 0, teeth = 0;
    Object.values(odo).forEach(t => {
      let hasFinding = false;
      if (t.faces) {
        Object.values(t.faces).forEach(fc => {
          if (fc === 'caries') { caries++; hasFinding = true; }
          else if (fc) { hasFinding = true; }
        });
      }
      if (t.condition && t.condition !== 'healthy') hasFinding = true;
      if (hasFinding) teeth++;
    });
    const odoEl = document.getElementById('odonto-summary');
    if (Object.keys(odo).length === 0 || teeth === 0) {
      odoEl.textContent = 'Sin registros en el odontograma. Abra el editor para iniciar el registro por pieza.';
    } else {
      odoEl.innerHTML = `${teeth} pieza(s) con hallazgos · <strong style="color: var(--color-red-text);">${caries} superficie(s) con caries</strong>.`;
    }

    // Periodontograma
    const perio = window.db.getPeriodontogram(patient.id);
    document.getElementById('perio-summary').textContent = perio
      ? 'Periodontograma registrado para este paciente.'
      : 'Sin periodontograma registrado todavía.';
  }

  function renderFinanzas(patientId) {
    const budgets = window.db.getBudgets().filter(b => b.patientId === patientId);
    const tbody = document.getElementById('patient-budgets-body');
    const payBox = document.getElementById('patient-payments');

    tbody.innerHTML = '';
    let totalPaid = 0, totalBalance = 0;
    const allPayments = [];

    if (budgets.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--color-gray); padding: 22px;">Sin presupuestos registrados.</td></tr>';
    } else {
      const statusMap = {
        draft: ['badge-pending', 'Borrador'],
        accepted: ['badge-confirmed', 'Aceptado'],
        rejected: ['badge-canceled', 'Rechazado']
      };
      budgets.forEach(b => {
        const total = budgetTotal(b);
        const paid = budgetPaid(b);
        const balance = Math.max(total - paid, 0);
        totalPaid += paid;
        totalBalance += balance;
        window.db.getPayments(b.id).forEach(p => allPayments.push(p));

        const [cls, txt] = statusMap[b.status] || ['badge-pending', b.status || '-'];
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><code class="tag">${window.folioPresupuesto(b)}</code></td>
          <td><span class="badge ${cls}">${txt}</span></td>
          <td style="text-align: right; font-weight: 600;">${window.formatMoney(total)}</td>
          <td style="text-align: right; font-weight: 700; color: ${balance > 0 ? 'var(--color-red-text)' : 'var(--color-green-text)'};">${window.formatMoney(balance)}</td>
        `;
        tbody.appendChild(tr);
      });
    }

    // Pagos
    if (allPayments.length === 0) {
      payBox.innerHTML = `
        <div class="record-empty">
          <svg viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
          <div class="record-empty-title">Sin pagos registrados</div>
          <div class="record-empty-desc">Los abonos del paciente se registran desde el módulo de Cobranzas.</div>
        </div>
      `;
      return;
    }

    allPayments.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const rows = allPayments.slice(0, 6).map(p => `
      <div class="finding-item">
        <div class="finding-meta">
          <span>${window.formatDateEs(p.date)} · ${window.metodoPagoEs(p.method)}</span>
          <span style="font-weight: 700; color: var(--color-green-text);">${window.formatMoney(p.amount)}</span>
        </div>
      </div>
    `).join('');

    payBox.innerHTML = `
      <div style="display: flex; gap: 12px; margin-bottom: 10px;">
        <div class="record-stat" style="flex: 1;">
          <div class="record-stat-label">Total abonado</div>
          <div class="record-stat-value" style="color: var(--color-green-text);">${window.formatMoney(totalPaid)}</div>
        </div>
        <div class="record-stat" style="flex: 1;">
          <div class="record-stat-label">Saldo pendiente</div>
          <div class="record-stat-value" style="color: ${totalBalance > 0 ? 'var(--color-red-text)' : 'var(--text-primary)'};">${window.formatMoney(totalBalance)}</div>
        </div>
      </div>
      <div class="findings-timeline">${rows}</div>
    `;
  }

  // Abrir edición del paciente
  window.editPatient = function(patientId) {
    const patient = window.db.getPatient(patientId);
    if (!patient) return;

    document.getElementById('patient-id').value = patient.id;
    document.getElementById('patient-name').value = patient.name;
    document.getElementById('patient-rut').value = patient.rut;
    document.getElementById('patient-age').value = patient.age;
    document.getElementById('patient-email').value = patient.email;
    document.getElementById('patient-phone').value = patient.phone;
    document.getElementById('patient-reason').value = patient.motivoConsulta || '';
    document.getElementById('patient-allergies').value = patient.allergies === 'Ninguna' ? '' : patient.allergies;
    document.getElementById('patient-history').value = patient.medicalHistory === 'Sin antecedentes.' ? '' : patient.medicalHistory;
    document.getElementById('patient-tags').value = patient.tags ? patient.tags.join(', ') : '';

    document.getElementById('modal-title-text').textContent = 'Modificar Ficha Paciente';
    patientModal.classList.add('active');
  };
  // Selección inicial. Va al final del archivo a propósito: window.selectPatient
  // se asigna más abajo, y llamarla antes deja la pantalla en blanco.
  // Con ?id=pat_x se abre ese expediente; sin parámetro, el primero del
  // directorio, para que el módulo nunca abra vacío.
  (function seleccionInicial() {
    const paramId = new URLSearchParams(window.location.search).get('id');
    if (paramId && window.db.getPatient(paramId)) {
      window.selectPatient(paramId);
      return;
    }
    const lista = window.db.getPatients();
    if (lista.length) window.selectPatient(lista[0].id);
  })();
});
