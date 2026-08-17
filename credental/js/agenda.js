/* ==========================================================================
   AGENDA.JS - LÓGICA DEL CALENDARIO CLÍNICO INTERACTIVO
   Controla la visualización del mes, creación, edición y cancelación de citas
   con soporte para buscadores autocompletables de pacientes y profesionales.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function() {
  let currentDate = new Date(); // Fecha pivote para navegar
  let selectedDentistFilter = 'all';

  // Modal de Agendamiento
  const apptModal = document.getElementById('appt-modal');
  const addApptBtn = document.getElementById('add-appt-btn');
  const apptForm = document.getElementById('appt-form');
  
  // Elementos del Modal de Detalle
  const detailModal = document.getElementById('detail-modal');
  const detailTime = document.getElementById('detail-time');
  const detailPatient = document.getElementById('detail-patient');
  const detailDentist = document.getElementById('detail-dentist');
  const detailSpecialty = document.getElementById('detail-specialty');
  const detailNotes = document.getElementById('detail-notes');
  const detailStatus = document.getElementById('detail-status');
  const detailCompleteBtn = document.getElementById('detail-complete-btn');
  const detailCancelBtn = document.getElementById('detail-cancel-btn');
  const detailDeleteBtn = document.getElementById('detail-delete-btn');
  
  let currentDetailApptId = null;

  // Registrar cierres de modales
  window.setupModalClosers(apptModal, document.getElementById('appt-modal-close'));
  window.setupModalClosers(detailModal, document.getElementById('detail-modal-close'));

  // Cargar Selectores del Calendario
  populateFilterSelector();

  // Inicializar Componentes de Autocompletado Búsqueda
  initAllAutocompletes();

  // Renderizar Calendario Inicial
  renderCalendar(currentDate);

  // Navegación del Calendario
  document.getElementById('prev-month-btn').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar(currentDate);
  });

  document.getElementById('next-month-btn').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar(currentDate);
  });

  document.getElementById('today-btn').addEventListener('click', () => {
    currentDate = new Date();
    renderCalendar(currentDate);
  });

  // Filtrado por Dentista
  const dentistFilterSelect = document.getElementById('dentist-filter');
  dentistFilterSelect.addEventListener('change', (e) => {
    selectedDentistFilter = e.target.value;
    renderCalendar(currentDate);
  });

  // Abrir Modal de Nueva Cita
  if (addApptBtn) {
    addApptBtn.addEventListener('click', () => {
      apptForm.reset();
      clearPatientAutocomplete();
      clearDentistAutocomplete();
      document.getElementById('appt-id').value = ''; // Modo creación
      
      // Colocar por defecto la fecha de hoy en el input
      const todayStr = new Date().toISOString().split('T')[0];
      document.getElementById('appt-date').value = todayStr;
      document.getElementById('appt-time').value = '09:00';

      apptModal.classList.add('active');
    });
  }

  // Guardar Cita (Creación / Modificación)
  apptForm.addEventListener('submit', function(e) {
    e.preventDefault();

    const id = document.getElementById('appt-id').value;
    const patientId = document.getElementById('appt-patient').value;
    const dentistId = document.getElementById('appt-dentist').value;
    const date = document.getElementById('appt-date').value;
    const time = document.getElementById('appt-time').value;
    const duration = parseInt(document.getElementById('appt-duration').value);
    const specialty = document.getElementById('appt-specialty').value;
    const notes = document.getElementById('appt-notes').value;

    if (!patientId) {
      window.showToast('Por favor, busque y seleccione un paciente clínico válido.', 'error');
      return;
    }
    if (!dentistId) {
      window.showToast('Por favor, busque y seleccione un odontólogo tratante.', 'error');
      return;
    }

    const apptData = {
      patientId,
      dentistId,
      dateTime: `${date}T${time}`,
      duration,
      specialty,
      notes,
      status: 'pending' // Estado inicial
    };

    if (id) {
      apptData.id = id;
      const original = window.db.getAppointment(id);
      if (original) apptData.status = original.status;
    }

    window.db.saveAppointment(apptData);
    window.showToast(id ? 'Cita actualizada con éxito' : 'Nueva cita agendada', 'success');
    
    apptModal.classList.remove('active');
    renderCalendar(currentDate);
  });

  // --- LÓGICA DETALLE DE CITA ---
  window.openApptDetails = function(apptId) {
    const appt = window.db.getAppointment(apptId);
    if (!appt) return;

    currentDetailApptId = apptId;
    const patient = window.db.getPatient(appt.patientId) || { name: 'Paciente Desconocido' };
    const dentist = window.db.getDentist(appt.dentistId) || { name: 'Dentista Desconocido' };

    // Formatear fecha y hora
    const dt = new Date(appt.dateTime);
    const dateFormatted = dt.toLocaleDateString('es-HN', { weekday: 'long', day: 'numeric', month: 'long' });
    const timeFormatted = appt.dateTime.split('T')[1];

    // Formatear duración de manera legible
    let durationText = `${appt.duration} min`;
    if (appt.duration >= 60) {
      const hours = Math.floor(appt.duration / 60);
      const mins = appt.duration % 60;
      durationText = `${hours}h ${mins > 0 ? mins + 'm' : ''}`;
    }

    detailTime.textContent = `${dateFormatted} a las ${timeFormatted} hrs (${durationText})`;
    detailPatient.innerHTML = `<strong>Paciente:</strong> <a href="pacientes.html?id=${patient.id}" style="color: var(--color-teal); text-decoration:none; font-weight:600;">${patient.name}</a>`;
    detailDentist.innerHTML = `<strong>Dentista:</strong> ${dentist.name} (${dentist.specialty})`;
    detailSpecialty.innerHTML = `<strong>Especialidad:</strong> <span class="tag">${appt.specialty}</span>`;
    detailNotes.innerHTML = `<strong>Observaciones:</strong> ${appt.notes || 'Ninguna'}`;
    
    // Mapear estado
    let badgeClass = 'badge-pending';
    let badgeText = 'Pendiente';
    if (appt.status === 'confirmed') { badgeClass = 'badge-confirmed'; badgeText = 'Confirmada'; }
    if (appt.status === 'completed') { badgeClass = 'badge-completed'; badgeText = 'Completada'; }
    if (appt.status === 'canceled') { badgeClass = 'badge-canceled'; badgeText = 'Cancelada'; }
    detailStatus.innerHTML = `<strong>Estado:</strong> <span class="badge ${badgeClass}">${badgeText}</span>`;

    // Visibilidad de botones según estado
    if (appt.status === 'pending') {
      detailCompleteBtn.style.display = 'none';
      detailCancelBtn.style.display = 'inline-flex';
      detailCancelBtn.textContent = 'Confirmar Cita';
      detailCancelBtn.className = 'btn btn-success';
      detailCancelBtn.onclick = () => updateApptStatus(apptId, 'confirmed');
    } else if (appt.status === 'confirmed') {
      detailCompleteBtn.style.display = 'inline-flex';
      detailCompleteBtn.onclick = () => updateApptStatus(apptId, 'completed');
      detailCancelBtn.style.display = 'inline-flex';
      detailCancelBtn.textContent = 'Cancelar Cita';
      detailCancelBtn.className = 'btn btn-danger';
      detailCancelBtn.onclick = () => updateApptStatus(apptId, 'canceled');
    } else {
      detailCompleteBtn.style.display = 'none';
      detailCancelBtn.style.display = 'none';
    }

    detailDeleteBtn.onclick = () => deleteAppt(apptId);

    detailModal.classList.add('active');
  };

  function updateApptStatus(apptId, status) {
    const appt = window.db.getAppointment(apptId);
    if (appt) {
      appt.status = status;
      window.db.saveAppointment(appt);
      window.showToast(status === 'completed' ? 'Tratamiento completado' : status === 'confirmed' ? 'Cita confirmada' : 'Cita cancelada', status === 'canceled' ? 'warning' : 'success');
      detailModal.classList.remove('active');
      renderCalendar(currentDate);
    }
  }

  function deleteAppt(apptId) {
    if (confirm('¿Está seguro de que desea eliminar permanentemente esta cita de la agenda?')) {
      window.db.deleteAppointment(apptId);
      window.showToast('Cita eliminada correctamente', 'error');
      detailModal.classList.remove('active');
      renderCalendar(currentDate);
    }
  }

  // --- COMPONENTES AUXILIARES ---
  function populateFilterSelector() {
    const dentists = window.db.getDentists();
    const filterSelect = document.getElementById('dentist-filter');
    filterSelect.innerHTML = '<option value="all">Todos los Profesionales</option>';

    dentists.forEach(d => {
      const optF = document.createElement('option');
      optF.value = d.id;
      optF.textContent = d.name;
      filterSelect.appendChild(optF);
    });
  }

  // --- BUSCADORES AUTOCOMPLETABLES ---
  function initAllAutocompletes() {
    setupSearchAutocomplete({
      inputEl: document.getElementById('patient-search-input'),
      hiddenEl: document.getElementById('appt-patient'),
      clearBtnEl: document.getElementById('btn-clear-patient'),
      toggleBtnEl: document.getElementById('btn-toggle-patient'),
      resultsEl: document.getElementById('patient-search-results'),
      getDataFn: () => window.db.getPatients().map(p => ({ id: p.id, title: p.name, subtitle: p.rut })),
      placeholderText: 'Buscar paciente por nombre o documento...'
    });

    setupSearchAutocomplete({
      inputEl: document.getElementById('dentist-search-input'),
      hiddenEl: document.getElementById('appt-dentist'),
      clearBtnEl: document.getElementById('btn-clear-dentist'),
      toggleBtnEl: document.getElementById('btn-toggle-dentist'),
      resultsEl: document.getElementById('dentist-search-results'),
      getDataFn: () => window.db.getDentists().map(d => ({ id: d.id, title: d.name, subtitle: d.specialty })),
      placeholderText: 'Buscar profesional por nombre o especialidad...'
    });
  }

  function setupSearchAutocomplete({ inputEl, hiddenEl, clearBtnEl, toggleBtnEl, resultsEl, getDataFn, placeholderText }) {
    let highlightedIndex = -1;
    let filteredList = [];

    // Capturar tipeo
    inputEl.addEventListener('input', function() {
      const query = this.value.trim().toLowerCase();
      highlightedIndex = -1;

      if (query.length < 2) {
        resultsEl.innerHTML = '';
        resultsEl.classList.add('hidden');
        clearBtnEl.style.display = 'none';
        hiddenEl.value = '';
        return;
      }

      clearBtnEl.style.display = 'block';
      const sourceDataList = getDataFn();
      
      // Filtrado difuso predictivo
      filteredList = sourceDataList.filter(item => 
        item.title.toLowerCase().includes(query) || 
        (item.subtitle && item.subtitle.toLowerCase().includes(query))
      );

      renderResults(filteredList, query);
    });

    // Controlador del botón desplegable (▼) para scroll de todas las opciones
    if (toggleBtnEl) {
      toggleBtnEl.addEventListener('click', function(e) {
        e.stopPropagation();
        const isOpen = !resultsEl.classList.contains('hidden') && resultsEl.innerHTML !== '';
        if (isOpen) {
          closeDropdown();
        } else {
          // Obtener lista completa
          filteredList = getDataFn();
          renderResults(filteredList, '');
          inputEl.focus();
        }
      });
    }

    // Renderizar lista flotante con marcado mark
    function renderResults(list, query) {
      resultsEl.innerHTML = '';
      
      if (list.length === 0) {
        resultsEl.innerHTML = `<div class="autocomplete-no-results">Sin coincidencias</div>`;
        resultsEl.classList.remove('hidden');
        return;
      }

      list.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = 'autocomplete-item';
        row.dataset.id = item.id;
        
        // Marcar concordancia (solo si query no está vacío)
        let highlightedTitle = item.title;
        let highlightedSubtitle = item.subtitle || '';
        
        if (query) {
          const regex = new RegExp(`(${query})`, 'gi');
          highlightedTitle = item.title.replace(regex, '<mark>$1</mark>');
          highlightedSubtitle = item.subtitle ? item.subtitle.replace(regex, '<mark>$1</mark>') : '';
        }

        row.innerHTML = `
          <div class="item-title">${highlightedTitle}</div>
          ${item.subtitle ? `<div class="item-subtitle">${highlightedSubtitle}</div>` : ''}
        `;

        row.addEventListener('click', () => selectItem(item));
        resultsEl.appendChild(row);
      });

      resultsEl.classList.remove('hidden');
    }

    // Controlador de Teclado
    inputEl.addEventListener('keydown', function(e) {
      const rows = resultsEl.querySelectorAll('.autocomplete-item');
      if (!rows.length) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        highlightedIndex = (highlightedIndex + 1) % rows.length;
        updateHighlight(rows);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        highlightedIndex = (highlightedIndex - 1 + rows.length) % rows.length;
        updateHighlight(rows);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (highlightedIndex > -1 && filteredList[highlightedIndex]) {
          selectItem(filteredList[highlightedIndex]);
        }
      } else if (e.key === 'Escape') {
        closeDropdown();
      }
    });

    function updateHighlight(rows) {
      rows.forEach((row, idx) => {
        if (idx === highlightedIndex) {
          row.classList.add('highlighted');
          row.scrollIntoView({ block: 'nearest' });
        } else {
          row.classList.remove('highlighted');
        }
      });
    }

    function selectItem(item) {
      inputEl.value = item.title;
      hiddenEl.value = item.id;
      clearBtnEl.style.display = 'block';
      closeDropdown();
    }

    function closeDropdown() {
      resultsEl.innerHTML = '';
      resultsEl.classList.add('hidden');
    }

    // Botón borrar
    clearBtnEl.addEventListener('click', () => {
      inputEl.value = '';
      hiddenEl.value = '';
      clearBtnEl.style.display = 'none';
      closeDropdown();
      inputEl.focus();
    });

    // Cerrar al clickear fuera
    document.addEventListener('click', (e) => {
      if (e.target !== inputEl && e.target !== resultsEl && e.target !== toggleBtnEl) {
        closeDropdown();
      }
    });
  }

  function clearPatientAutocomplete() {
    document.getElementById('patient-search-input').value = '';
    document.getElementById('appt-patient').value = '';
    document.getElementById('btn-clear-patient').style.display = 'none';
    document.getElementById('patient-search-results').classList.add('hidden');
    document.getElementById('patient-search-results').innerHTML = '';
  }

  function clearDentistAutocomplete() {
    document.getElementById('dentist-search-input').value = '';
    document.getElementById('appt-dentist').value = '';
    document.getElementById('btn-clear-dentist').style.display = 'none';
    document.getElementById('dentist-search-results').classList.add('hidden');
    document.getElementById('dentist-search-results').innerHTML = '';
  }

  // Algoritmo de Renderizado de Calendario
  function renderCalendar(date) {
    const appointments = window.db.getAppointments();
    const year = date.getFullYear();
    const month = date.getMonth();

    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    document.getElementById('calendar-month-name').textContent = `${monthNames[month]} ${year}`;

    const grid = document.getElementById('calendar-grid-cells');
    grid.innerHTML = '';

    // Obtener primer día del mes (0 = Lunes, 6 = Domingo)
    let firstDayIndex = new Date(year, month, 1).getDay();
    firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1; // Ajustar a Lunes = 0

    // Obtener total días en el mes actual y anterior
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();

    // Celdas del mes anterior (Muted/Gris)
    for (let i = firstDayIndex; i > 0; i--) {
      const dayNum = prevMonthTotalDays - i + 1;
      const cell = createCell(dayNum, true);
      grid.appendChild(cell);
    }

    // Celdas del mes actual
    const today = new Date();
    for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
      const isToday = today.getDate() === dayNum && 
                      today.getMonth() === month && 
                      today.getFullYear() === year;

      const cell = createCell(dayNum, false, isToday);

      const cellDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      
      const dayAppts = appointments.filter(appt => {
        const matchesDate = appt.dateTime.startsWith(cellDateStr);
        const matchesDentist = selectedDentistFilter === 'all' || appt.dentistId === selectedDentistFilter;
        return matchesDate && matchesDentist;
      });

      // Ordenar cronológicamente por hora
      dayAppts.sort((a, b) => a.dateTime.localeCompare(b.dateTime));

      // Añadir píldoras de cita a la celda
      const apptContainer = cell.querySelector('.calendar-appointments');
      dayAppts.forEach(appt => {
        const patient = window.db.getPatient(appt.patientId) || { name: 'S/N' };
        const timeStr = appt.dateTime.split('T')[1];
        
        let pillColor = 'rgba(255, 184, 0, 0.15)'; // Pendiente por defecto (amarillo)
        let pillBorder = '1px solid rgba(255, 184, 0, 0.3)';
        let textColor = '#ffb800';

        if (appt.status === 'confirmed') {
          pillColor = 'rgba(var(--brand-primary-rgb), 0.15)'; // Azul
          pillBorder = '1px solid rgba(var(--brand-primary-rgb), 0.3)';
          textColor = 'var(--color-blue-mid)';
        } else if (appt.status === 'completed') {
          pillColor = 'rgba(var(--brand-purple-rgb), 0.12)'; // Teal
          pillBorder = '1px solid rgba(var(--brand-purple-rgb), 0.25)';
          textColor = 'var(--color-teal)';
        } else if (appt.status === 'canceled') {
          pillColor = 'rgba(255, 74, 90, 0.12)'; // Rojo
          pillBorder = '1px solid rgba(255, 74, 90, 0.25)';
          textColor = 'var(--state-caries)';
        }

        const pill = document.createElement('div');
        pill.className = 'appt-pill';
        pill.style.background = pillColor;
        pill.style.border = pillBorder;
        pill.style.color = textColor;
        
        const firstName = patient.name.split(' ')[0];
        pill.textContent = `${timeStr} - ${firstName}`;
        
        pill.addEventListener('click', (e) => {
          e.stopPropagation(); // Evitar clics en la celda
          window.openApptDetails(appt.id);
        });

        apptContainer.appendChild(pill);
      });

      // Permitir hacer doble clic o clic en celda libre para crear cita en esa fecha
      cell.addEventListener('click', () => {
        apptForm.reset();
        clearPatientAutocomplete();
        clearDentistAutocomplete();
        document.getElementById('appt-id').value = '';
        document.getElementById('appt-date').value = cellDateStr;
        document.getElementById('appt-time').value = '09:00';
        apptModal.classList.add('active');
      });

      grid.appendChild(cell);
    }

    // Celdas del mes siguiente para completar la cuadrícula (siempre tiene 6 filas = 42 celdas)
    const totalCellsFilled = firstDayIndex + totalDays;
    const remainingCells = 42 - totalCellsFilled;
    for (let dayNum = 1; dayNum <= remainingCells; dayNum++) {
      const cell = createCell(dayNum, true);
      grid.appendChild(cell);
    }
  }

  // Helper para construir la caja DOM de la celda
  function createCell(dayNumber, isMuted = false, isToday = false) {
    const div = document.createElement('div');
    div.className = `calendar-cell ${isMuted ? 'muted' : ''} ${isToday ? 'today' : ''}`;
    
    div.innerHTML = `
      <div class="calendar-cell-num">${dayNumber}</div>
      <div class="calendar-appointments"></div>
    `;
    return div;
  }
});
