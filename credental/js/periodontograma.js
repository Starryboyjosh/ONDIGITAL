/* ==========================================================================
   PERIODONTOGRAMA.JS - CONTROLADOR DE EXAMEN PERIODONTAL Y GRÁFICAS DE SONDAJE
   Gestiona la cuadrícula interactiva de 32 dientes y grafica el margen/PS.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function() {
  // Verificar Sesión
  if (window.auth) {
    window.auth.checkSession();
  }

  // Clave compartida con odontograma para sincronizar paciente seleccionado
  const PATIENT_STORAGE_KEY = 'credental_selected_patient';

  // Referencias DOM
  const patientSelect = document.getElementById('perio-patient-select');
  const patientSubtitle = document.getElementById('perio-patient-subtitle');

  // --- Poblar el selector de pacientes ---
  function populatePatientSelect() {
    const patients = window.db.getPatients();
    patientSelect.innerHTML = '<option value="" disabled>Seleccione un Paciente...</option>';
    patients.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.name} (${p.rut})`;
      patientSelect.appendChild(opt);
    });
  }

  populatePatientSelect();

  // --- Determinar paciente inicial ---
  // Prioridad: 1) URL ?id=, 2) sessionStorage (último seleccionado), 3) primer disponible
  const urlParams = new URLSearchParams(window.location.search);
  let patientId = urlParams.get('id');

  if (!patientId) {
    patientId = sessionStorage.getItem(PATIENT_STORAGE_KEY);
  }

  // Validar que el paciente existe
  let patient = patientId ? window.db.getPatient(patientId) : null;

  if (!patient) {
    // Fallback al primer paciente disponible
    const patients = window.db.getPatients();
    if (patients && patients.length > 0) {
      patientId = patients[0].id;
      patient = window.db.getPatient(patientId);
    }
  }

  if (!patient) {
    window.showToast('No hay pacientes registrados en el sistema.', 'error');
    return;
  }

  // Guardar selección en sessionStorage para sincronizar con odontograma
  sessionStorage.setItem(PATIENT_STORAGE_KEY, patientId);

  // Seleccionar en el dropdown
  patientSelect.value = patientId;

  // Actualizar encabezado
  patientSubtitle.textContent = `Paciente: ${patient.name} (${patient.rut}) • Edad: ${patient.age} años`;

  // --- Cambio de paciente: recargar página con el nuevo ID ---
  // A diferencia del odontograma, que autoguarda en cada clic, aquí el sondaje
  // solo se persiste al pulsar Guardar: recargar sin avisar tira un examen de
  // 28 piezas sin dejar rastro.
  patientSelect.addEventListener('change', async function() {
    const newId = this.value;
    const ok = await window.confirmarAccion(
      'Los valores de sondaje que no haya guardado se perderán al cambiar de paciente.',
      {
        titulo: '¿Cambiar de paciente?',
        textoConfirmar: 'Cambiar sin guardar',
        textoCancelar: 'Seguir aquí'
      });
    if (!ok) {
      this.value = patientId;
      return;
    }
    sessionStorage.setItem(PATIENT_STORAGE_KEY, newId);
    // Recargar con el nuevo paciente en la URL para re-renderizar las cuadrículas
    window.location.href = `periodontograma.html?id=${encodeURIComponent(newId)}`;
  });

  // Las dos arcadas según norma FDI
  const upperTeeth = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
  const lowerTeeth = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

  // Estructura de datos periodontal
  let perioData = window.db.getPeriodontogram(patientId) || {};

  // Piezas que el odontograma del mismo paciente declara ausentes. El
  // periodontograma les abría inputs editables y guardaba sondajes de dientes
  // extraídos.
  const odontograma = window.db.getOdontogram(patientId) || {};
  const piezasAusentes = new Set(
    Object.keys(odontograma).filter(t => odontograma[t] && odontograma[t].condition === 'ausente')
  );

  // Inicializar cuadrículas y rellenar con datos existentes
  initArchGrid('upper', upperTeeth);
  initArchGrid('lower', lowerTeeth);

  // Graficar por primera vez
  updateChart();

  // Guardar datos
  document.getElementById('save-perio-btn').addEventListener('click', function() {
    // Solo se guardan las piezas con medición real. Antes se recolectaban las
    // 32 sin distinguir tocadas de no tocadas y con un valor por defecto de
    // 1 mm: abrir el periodontograma de un paciente nuevo y pulsar Guardar
    // dejaba 32 sondajes firmados como examen que nadie tomó.
    const updatedData = {};
    let medidas = 0;

    upperTeeth.concat(lowerTeeth).forEach(t => {
      const valores = getTeethValues(t);
      if (valores) {
        updatedData[t] = valores;
        medidas++;
      }
    });

    if (medidas === 0) {
      window.showToast('No hay ninguna medición registrada: escriba al menos el margen gingival o la profundidad de sondaje de una pieza.', 'warning');
      return;
    }

    window.db.savePeriodontogram(patientId, updatedData);
    window.showToast(`Periodontograma guardado: ${medidas} ${medidas === 1 ? 'pieza medida' : 'piezas medidas'}.`, 'success');
    
    // Registrar también en el historial de visitas/citas del paciente una anotación
    const appts = window.db.getAppointments().filter(a => a.patientId === patientId);
    if (appts.length > 0) {
      // Registrar notas de evolución en la última cita
      const lastAppt = appts.sort((a, b) => b.dateTime.localeCompare(a.dateTime))[0];
      lastAppt.notes = (lastAppt.notes ? lastAppt.notes + ' • ' : '') + 'Registró examen periodontal completo.';
      window.db.saveAppointment(lastAppt);
    }

    perioData = updatedData;
    updateChart();
  });

  // Generación interactiva de la cuadrícula
  function initArchGrid(archKey, teethList) {
    const rowNum = document.getElementById(`row-${archKey}-num`);
    const rowMg = document.getElementById(`row-${archKey}-mg`);
    const rowPs = document.getElementById(`row-${archKey}-ps`);
    const rowNic = document.getElementById(`row-${archKey}-nic`);
    const rowSs = document.getElementById(`row-${archKey}-ss`);
    const rowPb = document.getElementById(`row-${archKey}-pb`);

    teethList.forEach(t => {
      // Sin valor por defecto: una casilla vacía dice "no medido", y un 1 mm
      // escrito por el programa dice "sondaje normal comprobado". No son lo
      // mismo y la diferencia acaba en un expediente clínico.
      const toothValues = perioData[t] || { mg: '', ps: '', nic: '', ss: false, pb: false };
      // Una pieza que el odontograma declara ausente no se sondea: no hay
      // surco que medir. El campo se bloquea y se explica por qué.
      const ausente = piezasAusentes.has(String(t));

      // 1. Número de diente
      const th = document.createElement('th');
      th.textContent = t;
      if (ausente) {
        th.title = 'Pieza ausente en el odontograma.';
        th.style.opacity = '0.45';
      }
      rowNum.appendChild(th);

      const bloqueo = ausente
        ? ' disabled title="Pieza ausente en el odontograma." aria-label="Pieza ' + t + ' ausente"'
        : '';

      // 2. Input Margen Gingival (MG)
      const tdMg = document.createElement('td');
      tdMg.innerHTML = `<input type="number" id="mg-${t}" class="perio-input" min="-10" max="5" value="${ausente ? '' : toothValues.mg}" placeholder="—"${bloqueo}>`;
      rowMg.appendChild(tdMg);

      // 3. Input Profundidad de Sondaje (PS)
      const tdPs = document.createElement('td');
      tdPs.innerHTML = `<input type="number" id="ps-${t}" class="perio-input" min="0" max="15" value="${ausente ? '' : toothValues.ps}" placeholder="—"${bloqueo}>`;
      rowPs.appendChild(tdPs);

      // 4. NIC Calculado
      const tdNic = document.createElement('td');
      tdNic.innerHTML = `<span id="nic-${t}" class="nic-label">${ausente ? '—' : toothValues.nic}</span>`;
      rowNic.appendChild(tdNic);

      // 5. Sangrado al Sondaje (SS)
      const tdSs = document.createElement('td');
      tdSs.innerHTML = `<button type="button" id="ss-${t}" class="perio-btn ss-btn ${toothValues.ss ? 'active' : ''}"${bloqueo}></button>`;
      rowSs.appendChild(tdSs);

      // 6. Placa Bacteriana (PB)
      const tdPb = document.createElement('td');
      tdPb.innerHTML = `<button type="button" id="pb-${t}" class="perio-btn pb-btn ${toothValues.pb ? 'active' : ''}"${bloqueo}></button>`;
      rowPb.appendChild(tdPb);

      // --- Escuchadores de eventos para cálculos y gráficos en tiempo real ---
      const inputMg = document.getElementById(`mg-${t}`);
      const inputPs = document.getElementById(`ps-${t}`);
      const labelNic = document.getElementById(`nic-${t}`);
      const btnSs = document.getElementById(`ss-${t}`);
      const btnPb = document.getElementById(`pb-${t}`);

      const recalculateNic = () => {
        const textoPs = String(inputPs.value).trim();
        if (textoPs === '') {
          // Sin sondaje no hay nivel de inserción que calcular.
          labelNic.textContent = '—';
          inputPs.style.borderColor = 'var(--border-glow)';
          inputPs.style.color = 'var(--color-white)';
          updateChart();
          return;
        }
        const mg = parseInt(inputMg.value, 10) || 0;
        const ps = parseInt(textoPs, 10) || 0;
        // NIC = PS − MG. Con MG negativo (recesión: el margen se retiró hacia
        // apical y el LAC queda expuesto) la resta SUMA la recesión al
        // sondaje, que es exactamente la pérdida de inserción real.
        const nic = ps - mg;
        labelNic.textContent = nic;
        
        // Colores de alerta para bolsas periodontales en PS
        if (ps >= 4) {
          inputPs.style.borderColor = 'var(--state-caries)';
          inputPs.style.color = 'var(--state-caries)';
        } else {
          inputPs.style.borderColor = 'var(--border-glow)';
          inputPs.style.color = 'var(--color-white)';
        }
        
        updateChart();
      };

      if (!ausente) {
        inputMg.addEventListener('input', recalculateNic);
        inputPs.addEventListener('input', recalculateNic);

        // Toggles
        btnSs.addEventListener('click', function() {
          this.classList.toggle('active');
          updateChart();
        });
        btnPb.addEventListener('click', function() {
          this.classList.toggle('active');
          updateChart();
        });

        // Gatillar cálculo inicial
        recalculateNic();
      }
    });
  }

  // Recolecta los valores del DOM para un diente. Devuelve null cuando la pieza
  // no se midió: sin PS no hay sondaje, y sin sondaje no hay nada que firmar.
  function getTeethValues(toothNum) {
    const inputMg = document.getElementById(`mg-${toothNum}`);
    const inputPs = document.getElementById(`ps-${toothNum}`);
    if (!inputMg || !inputPs || inputPs.disabled) return null;

    const textoMg = String(inputMg.value).trim();
    const textoPs = String(inputPs.value).trim();
    if (textoPs === '') return null;

    const ps = parseInt(textoPs, 10);
    if (isNaN(ps)) return null;
    const mg = textoMg === '' ? 0 : (parseInt(textoMg, 10) || 0);
    const nic = ps - mg;
    const ss = document.getElementById(`ss-${toothNum}`).classList.contains('active');
    const pb = document.getElementById(`pb-${toothNum}`).classList.contains('active');

    return { mg, ps, nic, ss, pb };
  }

  // Dibuja la curva periodontal interactiva en el SVG
  function updateChart() {
    const allTeeth = [...upperTeeth, ...lowerTeeth];
    const width = 800;
    const height = 200;
    const totalPoints = allTeeth.length;
    const stepX = width / totalPoints;

    let mgPoints = [];
    let psPoints = [];
    let fillPoints = []; // Puntos para sombrear bolsas

    allTeeth.forEach((t, i) => {
      // Coordenada X
      const x = (i * stepX) + (stepX / 2);

      // Obtener valores en tiempo real del DOM si existen, sino usar perioData
      const elMg = document.getElementById(`mg-${t}`);
      const elPs = document.getElementById(`ps-${t}`);

      // Una pieza sin medir no se dibuja. Tratar la casilla vacía como 0 mm
      // trazaba una línea plana a ras de la escala que se lee como "sondaje
      // normal comprobado en las 32 piezas", que es justo lo contrario.
      const textoPs = elPs ? String(elPs.value).trim() : null;
      const guardado = perioData[t];
      let mg, ps;
      if (textoPs !== null) {
        if (textoPs === '' || elPs.disabled) return;
        ps = parseInt(textoPs, 10);
        if (isNaN(ps)) return;
        mg = parseInt(String(elMg.value).trim(), 10) || 0;
      } else if (guardado && guardado.ps !== '' && guardado.ps !== undefined && guardado.ps !== null) {
        ps = Number(guardado.ps);
        mg = Number(guardado.mg) || 0;
      } else {
        return;
      }

      // Mapear Y: 0mm -> Y=170, 10mm -> Y=20. Fórmula: Y = 170 - (val * 15)
      // Ajustar escala para que quede estético
      const yMg = 170 - (mg * 15);
      const yPs = 170 - (ps * 15);

      mgPoints.push(`${x},${yMg}`);
      psPoints.push(`${x},${yPs}`);

      // Si hay bolsa (PS >= 4mm), guardamos los puntos para la sombra
      if (ps >= 4) {
        fillPoints.push({ x, yMg, yPs });
      }
    });

    // Actualizar líneas. Con menos de dos puntos medidos no hay curva que
    // trazar: se deja el gráfico vacío en vez de inventar una recta.
    const mgPath = document.getElementById('mg-line-path');
    const psPath = document.getElementById('ps-line-path');

    if (mgPath) mgPath.setAttribute('d', mgPoints.length >= 2 ? `M ${mgPoints.join(' L ')}` : '');
    if (psPath) psPath.setAttribute('d', psPoints.length >= 2 ? `M ${psPoints.join(' L ')}` : '');

    // Relleno de bolsas periodontales
    const fillPath = document.getElementById('pocket-fill-path');
    if (fillPath) {
      if (fillPoints.length > 0) {
        // Generar un polígono que sombrea el espacio de la bolsa periodontal
        let d = '';
        fillPoints.forEach((pt, i) => {
          if (i === 0) {
            d += `M ${pt.x},${pt.yMg} L ${pt.x},${pt.yPs}`;
          } else {
            d += ` L ${pt.x},${pt.yPs}`;
          }
        });
        // Volver por la línea de margen
        for (let i = fillPoints.length - 1; i >= 0; i--) {
          d += ` L ${fillPoints[i].x},${fillPoints[i].yMg}`;
        }
        d += ' Z';
        fillPath.setAttribute('d', d);
      } else {
        fillPath.setAttribute('d', '');
      }
    }
  }
});
