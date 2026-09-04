/* ==========================================================================
   AGENDA.JS - LÓGICA DEL CALENDARIO CLÍNICO INTERACTIVO
   Controla la visualización del mes, creación, edición y cancelación de citas
   con soporte para buscadores autocompletables de pacientes y odontólogos.
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
  const detailEditBtn = document.getElementById('btn-editar-cita');
  const apptModalTitle = document.getElementById('appt-modal-title');
  const apptSubmitBtn = document.querySelector('#appt-form button[type="submit"]');

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

  // Filtrado por odontólogo
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
      modoAlta();

      // Colocar por defecto la fecha de hoy en el input
      const todayStr = window.todayISO();
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

    // Un odontólogo no puede atender dos citas a la vez. Sin esta
    // comprobación el calendario apilaba las dos píldoras en la misma celda y
    // nadie se enteraba hasta que llegaban los dos pacientes.
    const inicio = new Date(`${date}T${time}`).getTime();
    const fin = inicio + duration * 60000;
    const choque = window.db.getAppointments().find(a => {
      if (a.id === id || a.dentistId !== dentistId || a.status === 'canceled') return false;
      const aIni = new Date(a.dateTime).getTime();
      if (isNaN(aIni)) return false;
      return inicio < aIni + (a.duration || 30) * 60000 && aIni < fin;
    });
    if (choque) {
      const ocupado = window.db.getPatient(choque.patientId);
      window.showToast(
        `El odontólogo ya tiene una cita a las ${window.formatHora(choque.dateTime)} con ${ocupado ? ocupado.name : 'otro paciente'}. Elija otro horario.`,
        'error');
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
    // Sin paciente no se enlaza: `pacientes.html?id=undefined` abría una ficha
    // en blanco. Y el odontólogo ausente imprimía «Dentista Desconocido ()»,
    // con el paréntesis vacío de la especialidad que no existe.
    const patient = window.db.getPatient(appt.patientId);
    const dentist = window.db.getDentist(appt.dentistId);

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
    detailPatient.innerHTML = patient
      ? `<strong>Paciente:</strong> <a href="pacientes.html?id=${encodeURIComponent(patient.id)}" style="color: var(--color-teal); text-decoration:none; font-weight:600;">${window.escapeHtml(patient.name)}</a>`
      : '<strong>Paciente:</strong> <span style="color: var(--color-gray);">Paciente no encontrado</span>';
    const especialidadDentista = dentist && dentist.specialty ? ` (${window.escapeHtml(dentist.specialty)})` : '';
    detailDentist.innerHTML = `<strong>Odontólogo:</strong> ${window.escapeHtml(dentist ? dentist.name : 'Sin asignar')}${especialidadDentista}`;
    detailSpecialty.innerHTML = `<strong>Especialidad:</strong> <span class="tag">${window.escapeHtml(appt.specialty)}</span>`;
    detailNotes.innerHTML = `<strong>Observaciones:</strong> ${window.escapeHtml(appt.notes || 'Ninguna')}`;
    
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
      detailCancelBtn.textContent = 'Confirmar cita';
      detailCancelBtn.className = 'btn btn-success';
      detailCancelBtn.onclick = () => updateApptStatus(apptId, 'confirmed');
    } else if (appt.status === 'confirmed') {
      detailCompleteBtn.style.display = 'inline-flex';
      detailCompleteBtn.onclick = () => updateApptStatus(apptId, 'completed');
      detailCancelBtn.style.display = 'inline-flex';
      detailCancelBtn.textContent = 'Cancelar cita';
      detailCancelBtn.className = 'btn btn-danger';
      detailCancelBtn.onclick = () => updateApptStatus(apptId, 'canceled');
    } else {
      detailCompleteBtn.style.display = 'none';
      detailCancelBtn.style.display = 'none';
    }

    detailDeleteBtn.onclick = () => deleteAppt(apptId);

    // Reprogramar: hasta ahora el modo edición del formulario era código
    // inalcanzable porque nada llenaba nunca `appt-id`. Mover una cita de las
    // 11:00 a las 15:00 obligaba a eliminarla y rehacerla, perdiendo notas y
    // estado. Una cita cancelada no se reprograma: se agenda una nueva.
    if (detailEditBtn) {
      const editable = appt.status !== 'canceled';
      detailEditBtn.style.display = editable ? 'inline-flex' : 'none';
      detailEditBtn.onclick = () => abrirEdicion(apptId);
    }

    detailModal.classList.add('active');
  };

  function modoAlta() {
    if (apptModalTitle) apptModalTitle.textContent = 'Agendar cita dental';
    if (apptSubmitBtn) apptSubmitBtn.textContent = 'Guardar en agenda';
  }

  // Rellena el formulario de alta con la cita seleccionada y lo pasa a modo
  // edición. El id oculto es lo que hace que el submit actualice en vez de
  // duplicar.
  function abrirEdicion(apptId) {
    const appt = window.db.getAppointment(apptId);
    if (!appt) return;

    apptForm.reset();
    clearPatientAutocomplete();
    clearDentistAutocomplete();

    document.getElementById('appt-id').value = appt.id;

    const paciente = window.db.getPatient(appt.patientId);
    if (paciente) {
      document.getElementById('patient-search-input').value = paciente.name;
      document.getElementById('appt-patient').value = paciente.id;
      document.getElementById('btn-clear-patient').style.display = 'block';
    }

    const odontologo = window.db.getDentist(appt.dentistId);
    if (odontologo) {
      document.getElementById('dentist-search-input').value = odontologo.name;
      document.getElementById('appt-dentist').value = odontologo.id;
      document.getElementById('btn-clear-dentist').style.display = 'block';
    }

    const [fecha, hora] = String(appt.dateTime || '').split('T');
    document.getElementById('appt-date').value = fecha || '';
    document.getElementById('appt-time').value = (hora || '').slice(0, 5);

    const selDuracion = document.getElementById('appt-duration');
    const duracion = String(appt.duration || 30);
    if (Array.from(selDuracion.options).some(o => o.value === duracion)) selDuracion.value = duracion;

    const selEspecialidad = document.getElementById('appt-specialty');
    if (appt.specialty && Array.from(selEspecialidad.options).some(o => o.value === appt.specialty)) {
      selEspecialidad.value = appt.specialty;
    }

    document.getElementById('appt-notes').value = appt.notes || '';

    if (apptModalTitle) apptModalTitle.textContent = 'Reprogramar cita';
    if (apptSubmitBtn) apptSubmitBtn.textContent = 'Guardar cambios';

    detailModal.classList.remove('active');
    apptModal.classList.add('active');
  }

  // Cancelar sí pregunta, igual que eliminar: la asimetría estaba al revés
  // —eliminar confirmaba y cancelar se ejecutaba con un clic— y cancelar una
  // cita ya confirmada libera el cupo y deja al paciente sin aviso. Confirmar y
  // completar no preguntan: son avances normales del día.
  async function updateApptStatus(apptId, status) {
    const appt = window.db.getAppointment(apptId);
    if (!appt) return;

    if (status === 'canceled') {
      const paciente = window.db.getPatient(appt.patientId);
      const cuando = window.formatDateEs(appt.dateTime.split('T')[0]) + ' a las ' + window.formatHora(appt.dateTime);
      const ok = await window.confirmarAccion(
        'Se cancelará la cita de ' + (paciente ? paciente.name : 'este paciente') + ' del ' + cuando +
        '. El cupo queda libre y el paciente no recibe aviso automático.',
        { titulo: '¿Cancelar la cita?', textoConfirmar: 'Cancelar la cita', textoCancelar: 'Dejarla como está' });
      if (!ok) return;
    }

    appt.status = status;
    window.db.saveAppointment(appt);
    window.showToast(status === 'completed' ? 'Tratamiento completado' : status === 'confirmed' ? 'Cita confirmada' : 'Cita cancelada', status === 'canceled' ? 'warning' : 'success');
    detailModal.classList.remove('active');
    renderCalendar(currentDate);
  }

  async function deleteAppt(apptId) {
    const confirmado = await window.confirmarAccion('¿Está seguro de que desea eliminar permanentemente esta cita de la agenda?', { textoConfirmar: 'Eliminar' });
    if (confirmado) {
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
    filterSelect.innerHTML = '<option value="all">Todos los odontólogos</option>';

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
      // Escribir invalida la selección anterior. Sin esta línea, corregir el
      // texto sobre una sugerencia ya elegida ("Rubén" → "María Elena Castro")
      // dejaba el id oculto apuntando al primer paciente: la cita se guardaba
      // a nombre de Rubén mientras la pantalla decía María.
      hiddenEl.value = '';

      const texto = this.value.trim();
      const query = window.normalizarBusqueda(texto);
      highlightedIndex = -1;

      if (query.length < 2) {
        resultsEl.innerHTML = '';
        resultsEl.classList.add('hidden');
        clearBtnEl.style.display = 'none';
        return;
      }

      clearBtnEl.style.display = 'block';
      const sourceDataList = getDataFn();

      // Filtrado difuso predictivo, sin acentos: en recepción nadie teclea la
      // tilde y "ruben" tiene que encontrar a Rubén Darío Sabillón.
      filteredList = sourceDataList.filter(item =>
        window.normalizarBusqueda(item.title).includes(query) ||
        (item.subtitle && window.normalizarBusqueda(item.subtitle).includes(query))
      );

      renderResults(filteredList, texto);
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

    // Envuelve en <mark> la parte del texto que coincide con lo tecleado,
    // ignorando acentos y mayúsculas. Devuelve HTML ya escapado.
    function resaltar(texto, consulta) {
      const original = String(texto == null ? '' : texto);
      const q = window.normalizarBusqueda(consulta);
      if (!q) return window.escapeHtml(original);
      const plano = window.normalizarBusqueda(original);
      if (plano.length !== original.length) return window.escapeHtml(original);
      const i = plano.indexOf(q);
      if (i === -1) return window.escapeHtml(original);
      return window.escapeHtml(original.slice(0, i)) +
        '<mark>' + window.escapeHtml(original.slice(i, i + q.length)) + '</mark>' +
        window.escapeHtml(original.slice(i + q.length));
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
        
        // El texto se escapa SIEMPRE antes de insertarse; solo <mark> es markup.
        // La coincidencia se busca sobre el texto sin acentos —igual que el
        // filtro— pero se resalta sobre el original: quitar la tilde no cambia
        // la longitud de la cadena, así que las posiciones siguen valiendo. Si
        // alguna vez no coincidieran, se muestra el texto sin resaltar en lugar
        // de recortar mal el nombre de un paciente.
        highlightedTitle = resaltar(highlightedTitle, query);
        highlightedSubtitle = highlightedSubtitle ? resaltar(highlightedSubtitle, query) : '';

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
        
        // El color de la píldora vive en CSS (appt-pill--<estado>): el amarillo
        // #ffb800 que estaba aquí daba 1.9:1 sobre fondo claro y era ilegible.
        const pill = document.createElement('div');
        pill.className = 'appt-pill appt-pill--' + (appt.status || 'pending');

        const firstName = patient.name.split(' ')[0];
        pill.textContent = `${window.formatHora(timeStr)} · ${firstName}`;
        pill.title = `${window.formatHora(timeStr)} · ${patient.name} · ${window.estadoCitaEs(appt.status)}`;
        
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
        modoAlta();
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
