/* ==========================================================================
   PACIENTES.JS - LÓGICA DE FICHAS CLÍNICAS Y DIRECTORIO
   Controla la búsqueda, visualización detallada, registro e historial del paciente
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function() {
  const patientTableBody = document.getElementById('patient-list-body');
  const searchInput = document.getElementById('patient-search');
  const addPatientBtn = document.getElementById('add-patient-btn');
  const patientModal = document.getElementById('patient-modal');
  const patientForm = document.getElementById('patient-form');

  // Elementos de la Ficha Detallada (Derecha)
  const detailPanel = document.getElementById('patient-details-card');
  const detailEmpty = document.getElementById('patient-details-empty');
  
  const cardName = document.getElementById('card-patient-name');
  const cardAge = document.getElementById('card-patient-age');
  const cardRut = document.getElementById('card-patient-rut');
  const cardEmail = document.getElementById('card-patient-email');
  const cardPhone = document.getElementById('card-patient-phone');
  const cardReason = document.getElementById('card-patient-reason');
  const cardAllergies = document.getElementById('card-patient-allergies');
  const cardHistory = document.getElementById('card-patient-history');
  
  const cardLinkOdont = document.getElementById('card-link-odontograma');
  const cardLinkPerio = document.getElementById('card-link-periodontograma');
  const cardLinkBudget = document.getElementById('card-link-presupuesto');
  const cardTimeline = document.getElementById('card-patient-timeline');

  let selectedPatientId = null;

  // Registrar Cierre de Modales
  window.setupModalClosers(patientModal, document.getElementById('patient-modal-close'));

  // RENDERIZAR LISTA INICIAL
  renderPatientList();

  // BUSCADOR EN TIEMPO REAL
  searchInput.addEventListener('input', function() {
    renderPatientList(this.value);
  });

  // ABRIR CREACIÓN DE PACIENTE
  addPatientBtn.addEventListener('click', function() {
    patientForm.reset();
    document.getElementById('patient-id').value = ''; // Modo creación
    document.getElementById('modal-title-text').textContent = 'Registrar Nuevo Paciente';
    patientModal.classList.add('active');
  });

  // GUARDAR PACIENTE
  patientForm.addEventListener('submit', function(e) {
    e.preventDefault();

    const id = document.getElementById('patient-id').value;
    const name = document.getElementById('patient-name').value;
    const rut = document.getElementById('patient-rut').value;
    const age = parseInt(document.getElementById('patient-age').value);
    const email = document.getElementById('patient-email').value;
    const phone = document.getElementById('patient-phone').value;
    const reason = document.getElementById('patient-reason').value;
    const allergies = document.getElementById('patient-allergies').value || 'Ninguna';
    const medicalHistory = document.getElementById('patient-history').value || 'Sin antecedentes.';
    const tagsInput = document.getElementById('patient-tags').value;

    // Procesar etiquetas separadas por comas
    const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t.length > 0) : [];

    const patientData = {
      name,
      rut,
      age,
      email,
      phone,
      motivoConsulta: reason,
      allergies,
      medicalHistory,
      tags
    };

    if (id) {
      patientData.id = id;
    }

    const saved = window.db.savePatient(patientData);
    window.showToast(id ? 'Ficha de paciente actualizada' : 'Paciente registrado con éxito', 'success');

    patientModal.classList.remove('active');
    renderPatientList();
    window.selectPatient(saved.id);
  });

  // SELECCIONAR PACIENTE POR DEFECTO SI VIENE EN LA URL (?id=pat_1)
  const urlParams = new URLSearchParams(window.location.search);
  const paramId = urlParams.get('id');
  if (paramId) {
    window.selectPatient(paramId);
  }

  // --- MÉTODOS DE CONTROL ---

  // Renders de la tabla izquierda
  function renderPatientList(query = '') {
    const patients = window.db.getPatients();
    patientTableBody.innerHTML = '';

    // Filtrar pacientes
    const filtered = patients.filter(p => {
      const q = query.trim().toLowerCase();
      return p.name.toLowerCase().includes(q) || 
             p.rut.toLowerCase().includes(q) || 
             p.phone.includes(q);
    });

    if (filtered.length === 0) {
      patientTableBody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; color: var(--color-gray); padding: 30px;">
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
        <td style="font-weight: 600;">${p.name}</td>
        <td>${p.rut}</td>
        <td>${p.phone}</td>
        <td style="text-align: right;">
          <button onclick="event.stopPropagation(); window.editPatient('${p.id}')" class="btn btn-secondary" style="padding: 5px 10px; font-size: 0.75rem;">Editar</button>
        </td>
      `;

      tr.addEventListener('click', () => {
        window.selectPatient(p.id);
      });

      patientTableBody.appendChild(tr);
    });
  }

  // Selecciona un paciente y carga la ficha detallada (derecha)
  window.selectPatient = function(patientId) {
    selectedPatientId = patientId;
    
    // Resaltar la fila en la tabla
    const rows = patientTableBody.querySelectorAll('tr');
    const patients = window.db.getPatients();
    const index = patients.findIndex(p => p.id === patientId);
    
    // Volver a dibujar la tabla para marcar la fila activa
    renderPatientList(searchInput.value);

    const patient = window.db.getPatient(patientId);
    if (!patient) {
      detailPanel.style.display = 'none';
      detailEmpty.style.display = 'flex';
      return;
    }

    // Ocultar placeholder "seleccione un paciente" y mostrar panel
    detailEmpty.style.display = 'none';
    detailPanel.style.display = 'flex';

    // Rellenar Ficha Demográfica
    cardName.textContent = patient.name;
    cardAge.textContent = `${patient.age} años`;
    cardRut.textContent = patient.rut;
    cardEmail.textContent = patient.email;
    cardPhone.textContent = patient.phone;

    // Rellenar Motivo de Consulta, Alergias e Historial
    if (cardReason) cardReason.textContent = patient.motivoConsulta || 'Consulta general preventiva.';
    cardAllergies.textContent = patient.allergies;
    cardHistory.textContent = patient.medicalHistory;

    // Rellenar Etiquetas Clínicas
    const cardTags = document.getElementById('card-patient-tags');
    if (cardTags) {
      cardTags.innerHTML = '';
      if (patient.tags && patient.tags.length > 0) {
        patient.tags.forEach(t => {
          const tagSpan = document.createElement('span');
          tagSpan.className = `patient-tag ${t.toLowerCase() === 'alergias' ? 'tag-alergeno' : 'tag-control'}`;
          tagSpan.textContent = t;
          cardTags.appendChild(tagSpan);
        });
      } else {
        cardTags.innerHTML = '<span style="font-size: 0.8rem; color: var(--color-gray);">Sin etiquetas</span>';
      }
    }

    // Vincular accesos directos
    cardLinkOdont.href = `odontograma.html?id=${patient.id}`;
    if (cardLinkPerio) cardLinkPerio.href = `periodontograma.html?id=${patient.id}`;
    cardLinkBudget.href = `presupuestos.html?id=${patient.id}`;

    // RENDERIZAR CRONOLOGÍA DE CITAS
    const appointments = window.db.getAppointments();
    const patientAppointments = appointments.filter(a => a.patientId === patientId);
    
    // Ordenar por fecha cronológica inversa (más reciente primero)
    patientAppointments.sort((a, b) => b.dateTime.localeCompare(a.dateTime));

    cardTimeline.innerHTML = '';
    if (patientAppointments.length === 0) {
      cardTimeline.innerHTML = `
        <div style="font-size: 0.8rem; color: var(--color-gray); padding: 10px 0;">
          No registra citas agendadas ni tratamientos anteriores.
        </div>
      `;
    } else {
      patientAppointments.forEach(appt => {
        const dentist = window.db.getDentist(appt.dentistId) || { name: 'Desconocido' };
        
        // Mapear estado
        let badgeClass = 'badge-pending';
        let badgeText = 'Pendiente';
        if (appt.status === 'confirmed') { badgeClass = 'badge-confirmed'; badgeText = 'Confirmada'; }
        if (appt.status === 'completed') { badgeClass = 'badge-completed'; badgeText = 'Completada'; }
        if (appt.status === 'canceled') { badgeClass = 'badge-canceled'; badgeText = 'Cancelada'; }

        const dateObj = new Date(appt.dateTime);
        const dateStr = dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
        const hourStr = appt.dateTime.split('T')[1];

        const item = document.createElement('div');
        item.className = 'finding-item';
        
        // Asignar colores clínicos al timeline
        if (appt.status === 'completed') item.style.borderLeftColor = 'var(--color-teal)';
        if (appt.status === 'canceled') item.style.borderLeftColor = 'var(--state-caries)';
        if (appt.status === 'pending') item.style.borderLeftColor = '#ffb800';

        item.innerHTML = `
          <div class="finding-meta">
            <span>${dateStr} a las ${hourStr} hrs</span>
            <span class="badge ${badgeClass}">${badgeText}</span>
          </div>
          <div class="finding-desc" style="font-size: 0.82rem; margin-top: 4px;">
            <strong>${appt.specialty}</strong> con ${dentist.name}
          </div>
          ${appt.notes ? `<div style="font-size: 0.75rem; color: var(--color-gray); margin-top: 4px; font-style: italic;">Obs: ${appt.notes}</div>` : ''}
        `;
        cardTimeline.appendChild(item);
      });
    }
  };

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
});
