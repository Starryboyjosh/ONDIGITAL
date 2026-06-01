/* ==========================================================================
   PERIODONTOGRAMA.JS - CONTROLADOR DE EXAMEN PERIODONTAL Y GRÁFICAS DE SONDAJE
   Gestiona la cuadrícula interactiva de 32 dientes y grafica el margen/PS.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function() {
  // Verificar Sesión
  if (window.auth) {
    window.auth.checkSession();
  }

  // Obtener ID del paciente de la URL
  const urlParams = new URLSearchParams(window.location.search);
  const patientId = urlParams.get('id');

  if (!patientId) {
    window.showToast('No se especificó un paciente válido.', 'error');
    setTimeout(() => window.location.href = 'pacientes.html', 1500);
    return;
  }

  const patient = window.db.getPatient(patientId);
  if (!patient) {
    window.showToast('El paciente no existe en el sistema.', 'error');
    setTimeout(() => window.location.href = 'pacientes.html', 1500);
    return;
  }

  // Encabezado
  document.getElementById('perio-patient-subtitle').textContent = `Paciente: ${patient.name} (${patient.rut}) • Edad: ${patient.age} años`;

  // Las dos arcadas según norma FDI
  const upperTeeth = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
  const lowerTeeth = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

  // Estructura de datos periodontal
  let perioData = window.db.getPeriodontogram(patientId) || {};

  // Inicializar cuadrículas y rellenar con datos existentes
  initArchGrid('upper', upperTeeth);
  initArchGrid('lower', lowerTeeth);

  // Graficar por primera vez
  updateChart();

  // Guardar datos
  document.getElementById('save-perio-btn').addEventListener('click', function() {
    // Recolectar datos de los inputs
    const updatedData = {};
    
    // Recolectar superior
    upperTeeth.forEach(t => {
      updatedData[t] = getTeethValues(t);
    });

    // Recolectar inferior
    lowerTeeth.forEach(t => {
      updatedData[t] = getTeethValues(t);
    });

    window.db.savePeriodontogram(patientId, updatedData);
    window.showToast('Periodontograma guardado con éxito.', 'success');
    
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
      const toothValues = perioData[t] || { mg: 0, ps: 1, nic: 1, ss: false, pb: false };

      // 1. Número de diente
      const th = document.createElement('th');
      th.textContent = t;
      rowNum.appendChild(th);

      // 2. Input Margen Gingival (MG)
      const tdMg = document.createElement('td');
      tdMg.innerHTML = `<input type="number" id="mg-${t}" class="perio-input" min="-5" max="10" value="${toothValues.mg}">`;
      rowMg.appendChild(tdMg);

      // 3. Input Profundidad de Sondaje (PS)
      const tdPs = document.createElement('td');
      tdPs.innerHTML = `<input type="number" id="ps-${t}" class="perio-input" min="0" max="15" value="${toothValues.ps}">`;
      rowPs.appendChild(tdPs);

      // 4. NIC Calculado
      const tdNic = document.createElement('td');
      tdNic.innerHTML = `<span id="nic-${t}" class="nic-label">${toothValues.nic}</span>`;
      rowNic.appendChild(tdNic);

      // 5. Sangrado al Sondaje (SS)
      const tdSs = document.createElement('td');
      tdSs.innerHTML = `<button type="button" id="ss-${t}" class="perio-btn ss-btn ${toothValues.ss ? 'active' : ''}"></button>`;
      rowSs.appendChild(tdSs);

      // 6. Placa Bacteriana (PB)
      const tdPb = document.createElement('td');
      tdPb.innerHTML = `<button type="button" id="pb-${t}" class="perio-btn pb-btn ${toothValues.pb ? 'active' : ''}"></button>`;
      rowPb.appendChild(tdPb);

      // --- Escuchadores de eventos para cálculos y gráficos en tiempo real ---
      const inputMg = document.getElementById(`mg-${t}`);
      const inputPs = document.getElementById(`ps-${t}`);
      const labelNic = document.getElementById(`nic-${t}`);
      const btnSs = document.getElementById(`ss-${t}`);
      const btnPb = document.getElementById(`pb-${t}`);

      const recalculateNic = () => {
        const mg = parseInt(inputMg.value) || 0;
        const ps = parseInt(inputPs.value) || 0;
        const nic = ps - mg; // NIC = PS - MG
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
    });
  }

  // Recolecta los valores del DOM para un diente
  function getTeethValues(toothNum) {
    const mg = parseInt(document.getElementById(`mg-${toothNum}`).value) || 0;
    const ps = parseInt(document.getElementById(`ps-${toothNum}`).value) || 0;
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
      
      const mg = elMg ? (parseInt(elMg.value) || 0) : (perioData[t] ? perioData[t].mg : 0);
      const ps = elPs ? (parseInt(elPs.value) || 0) : (perioData[t] ? perioData[t].ps : 1);

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

    // Actualizar líneas
    const mgPath = document.getElementById('mg-line-path');
    const psPath = document.getElementById('ps-line-path');

    if (mgPath) mgPath.setAttribute('d', `M ${mgPoints.join(' L ')}`);
    if (psPath) psPath.setAttribute('d', `M ${psPoints.join(' L ')}`);

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
