/* ==========================================================================
   ODONTOGRAMA.JS - DIBUJO Y OPERACIONES DEL MAPA DENTAL INTERACTIVO
   Crea y gestiona la estructura SVG y estados de los 32 dientes
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function() {
  let activeTool = 'caries'; // Herramienta por defecto
  let currentPatientId = null;
  let odontogramData = {}; // Objeto que mantiene el estado actual en memoria

  // Clave compartida con periodontograma para sincronizar paciente seleccionado
  const PATIENT_STORAGE_KEY = 'credental_selected_patient';

  // Referencias DOM
  const patientSelect = document.getElementById('odont-patient-select');
  const patientNameHeader = document.getElementById('patient-name-header');
  const patientAllergiesBox = document.getElementById('patient-allergies-alert');
  const allergiesText = document.getElementById('allergies-text');
  
  const archUpperLeft = document.getElementById('arch-upper-left');
  const archUpperRight = document.getElementById('arch-upper-right');
  const archLowerLeft = document.getElementById('arch-lower-left');
  const archLowerRight = document.getElementById('arch-lower-right');
  
  const clinicalTimeline = document.getElementById('clinical-findings-timeline');

  // --- 1. RENDERIZAR DIENTES SVG DINÁMICAMENTE ---
  // Rango FDI Arcadas
  const upperRightTeeth = ['18', '17', '16', '15', '14', '13', '12', '11'];
  const upperLeftTeeth = ['21', '22', '23', '24', '25', '26', '27', '28'];
  const lowerLeftTeeth = ['31', '32', '33', '34', '35', '36', '37', '38'];
  const lowerRightTeeth = ['48', '47', '46', '45', '44', '43', '42', '41'];

  buildArchTeeth(archUpperRight, upperRightTeeth);
  buildArchTeeth(archUpperLeft, upperLeftTeeth);
  buildArchTeeth(archLowerRight, lowerRightTeeth);
  buildArchTeeth(archLowerLeft, lowerLeftTeeth);

  // --- 2. CONTROL DE HERRAMIENTAS ---
  const toolButtons = document.querySelectorAll('.treatment-tool-btn');
  toolButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      toolButtons.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      activeTool = this.getAttribute('data-tool');
      window.showToast(`Herramienta seleccionada: ${this.textContent.trim()}`, 'success');
    });
  });

  // --- 3. SELECCIÓN DE PACIENTE ---
  populatePatientSelect();

  patientSelect.addEventListener('change', function() {
    const selectedId = this.value;
    // Guardar en sessionStorage para sincronizar con periodontograma
    sessionStorage.setItem(PATIENT_STORAGE_KEY, selectedId);
    loadPatientOdontogram(selectedId);
  });

  // Determinar paciente inicial
  // Prioridad: 1) URL ?id=, 2) sessionStorage (último seleccionado), 3) primer disponible
  const urlParams = new URLSearchParams(window.location.search);
  const urlId = urlParams.get('id');

  if (urlId && window.db.getPatient(urlId)) {
    patientSelect.value = urlId;
    sessionStorage.setItem(PATIENT_STORAGE_KEY, urlId);
    loadPatientOdontogram(urlId);
  } else {
    // Intentar con sessionStorage
    const storedId = sessionStorage.getItem(PATIENT_STORAGE_KEY);
    if (storedId && window.db.getPatient(storedId)) {
      patientSelect.value = storedId;
      loadPatientOdontogram(storedId);
    } else {
      // Fallback: primer paciente disponible
      const firstPat = patientSelect.querySelector('option:not([disabled])');
      if (firstPat) {
        patientSelect.value = firstPat.value;
        sessionStorage.setItem(PATIENT_STORAGE_KEY, firstPat.value);
        loadPatientOdontogram(firstPat.value);
      }
    }
  }

  // --- CONSTRUCCIÓN DE CELDAS SVG ---
  function buildArchTeeth(containerEl, teethArray) {
    if (!containerEl) return;
    containerEl.innerHTML = '';

    teethArray.forEach(toothNum => {
      const toothContainer = document.createElement('div');
      toothContainer.className = 'tooth-container';
      toothContainer.id = `container-${toothNum}`;
      
      // Dibujar SVG con 5 caras poligonal (FDI standard)
      toothContainer.innerHTML = `
        <span class="tooth-number">${toothNum}</span>
        <svg class="tooth-svg" id="svg-${toothNum}" viewBox="0 0 40 40">
          <!-- Cara Superior / Vestibular (top) -->
          <polygon class="tooth-face" data-face="top" points="0,0 40,0 28,12 12,12" id="face-${toothNum}-top"></polygon>
          
          <!-- Cara Derecha / Distal o Mesial (right) -->
          <polygon class="tooth-face" data-face="right" points="40,0 40,40 28,28 28,12" id="face-${toothNum}-right"></polygon>
          
          <!-- Cara Inferior / Palatina-Lingual (bottom) -->
          <polygon class="tooth-face" data-face="bottom" points="12,28 28,28 40,40 0,40" id="face-${toothNum}-bottom"></polygon>
          
          <!-- Cara Izquierda / Mesial o Distal (left) -->
          <polygon class="tooth-face" data-face="left" points="0,0 12,12 12,28 0,40" id="face-${toothNum}-left"></polygon>
          
          <!-- Cara Central / Oclusal-Incisal (center) -->
          <polygon class="tooth-face" data-face="center" points="12,12 28,12 28,28 12,28" id="face-${toothNum}-center"></polygon>
        </svg>
      `;

      // Vincular eventos de clic a las caras del diente
      const faces = toothContainer.querySelectorAll('.tooth-face');
      faces.forEach(facePolygon => {
        facePolygon.addEventListener('click', function(e) {
          e.stopPropagation();
          handleFaceClick(toothNum, this.getAttribute('data-face'));
        });
      });

      // Vincular doble clic o click en el diente entero (para condiciones globales como extracción/corona/implante)
      const toothSvg = toothContainer.querySelector('.tooth-svg');
      toothSvg.addEventListener('click', function() {
        if (['ausente', 'corona', 'implante', 'healthy'].includes(activeTool)) {
          handleToothClick(toothNum);
        }
      });

      containerEl.appendChild(toothContainer);
    });
  }

  // Cargar datos clínicos del paciente
  function loadPatientOdontogram(patientId) {
    currentPatientId = patientId;
    const patient = window.db.getPatient(patientId);
    if (!patient) return;

    // Actualizar Encabezado
    patientNameHeader.textContent = patient.name;
    
    // Alergias
    if (patient.allergies && patient.allergies.toLowerCase() !== 'ninguna') {
      allergiesText.textContent = `Alergias: ${patient.allergies}`;
      patientAllergiesBox.style.display = 'block';
    } else {
      patientAllergiesBox.style.display = 'none';
    }

    // Cargar Datos del Odontograma
    odontogramData = window.db.getOdontogram(patientId);

    // Limpiar clases anteriores de todos los SVG
    document.querySelectorAll('.tooth-svg').forEach(svg => {
      svg.className.baseVal = 'tooth-svg';
    });
    document.querySelectorAll('.tooth-face').forEach(polygon => {
      polygon.classList.remove('caries', 'restaurado');
    });

    // Pintar los estados guardados
    Object.keys(odontogramData).forEach(toothNum => {
      const state = odontogramData[toothNum];
      const svgEl = document.getElementById(`svg-${toothNum}`);

      if (svgEl) {
        // Estado global del diente
        if (state.condition && state.condition !== 'healthy') {
          svgEl.classList.add(state.condition);
        }

        // Estado individual de las caras
        if (state.faces) {
          Object.keys(state.faces).forEach(faceName => {
            const condition = state.faces[faceName];
            const faceEl = document.getElementById(`face-${toothNum}-${faceName}`);
            if (faceEl && condition !== 'healthy') {
              faceEl.classList.add(condition);
            }
          });
        }
      }
    });

    // Renderizar registros de hallazgos en la barra lateral
    renderFindingsHistory();
  }

  // Nomenclatura clínica de las caras y de los estados. Son declaraciones de
  // función (no const) a propósito: el primer render ocurre más arriba en el
  // archivo y una const todavía sin inicializar reventaría la pantalla.
  // El nombre anatómico de una cara depende del cuadrante FDI. En el esquema
  // las arcadas se dibujan 18…11 | 21…28 arriba y 48…41 | 31…38 abajo, así que
  // el lado que apunta a la línea media cambia de mitad: en los cuadrantes 1 y
  // 4 la mesial queda a la derecha en pantalla; en los cuadrantes 2 y 3, a la
  // izquierda. Vertical: en la arcada superior la vestibular va hacia arriba y
  // la palatina hacia el centro; en la inferior es al revés.
  function caraEs(cara, pieza) {
    const cuadrante = parseInt(String(pieza || '').charAt(0), 10);
    const conocido = cuadrante >= 1 && cuadrante <= 4;
    const superior = cuadrante === 1 || cuadrante === 2;
    const mesialDerecha = cuadrante === 1 || cuadrante === 4;
    if (cara === 'center') return 'Oclusal';
    if (!conocido) {
      const genericos = {
        top: 'Vestibular',
        bottom: 'Lingual/Palatina',
        left: 'Mesial',
        right: 'Distal'
      };
      return genericos[cara] || 'Superficie ' + (cara || 'no especificada');
    }
    if (cara === 'top') return superior ? 'Vestibular' : 'Lingual';
    if (cara === 'bottom') return superior ? 'Palatina' : 'Vestibular';
    if (cara === 'left') return mesialDerecha ? 'Distal' : 'Mesial';
    if (cara === 'right') return mesialDerecha ? 'Mesial' : 'Distal';
    return 'Superficie ' + (cara || 'no especificada');
  }

  // Etiqueta corta para la insignia del hallazgo: si es larga se parte en dos
  // líneas y empuja el número de pieza. El detalle va en el texto de abajo.
  function condicionEs(cond) {
    const nombres = {
      caries: 'Caries',
      restaurado: 'Restauración',
      corona: 'Corona',
      implante: 'Implante',
      ausente: 'Ausente'
    };
    return nombres[cond] || 'Hallazgo';
  }

  function detalleCondicion(cond) {
    const textos = {
      caries: 'Caries activa pendiente de tratamiento.',
      restaurado: 'Restauración de resina en buen estado.',
      corona: 'Pieza rehabilitada con corona de cerámica.',
      implante: 'Pieza sustituida por implante de titanio.',
      ausente: 'Pieza ausente o extraída previamente.'
    };
    return textos[cond] || 'Condición clínica general de la pieza dental completa.';
  }

  // Manejar clic en una cara del diente
  function handleFaceClick(toothNum, faceName) {
    if (!currentPatientId) return;

    // Si se hace clic en una cara, no aplica para herramientas de diente completo
    if (['ausente', 'corona', 'implante'].includes(activeTool)) {
      handleToothClick(toothNum);
      return;
    }

    // Inicializar diente en memoria si no existe
    if (!odontogramData[toothNum]) {
      odontogramData[toothNum] = { condition: 'healthy', faces: {} };
    }

    const faceEl = document.getElementById(`face-${toothNum}-${faceName}`);
    
    // Remover estados previos visuales
    faceEl.classList.remove('caries', 'restaurado');

    if (activeTool === 'caries') {
      faceEl.classList.add('caries');
      odontogramData[toothNum].faces[faceName] = 'caries';
    } else if (activeTool === 'restaurado') {
      faceEl.classList.add('restaurado');
      odontogramData[toothNum].faces[faceName] = 'restaurado';
    } else if (activeTool === 'healthy') {
      // Eliminar el estado de esa cara
      delete odontogramData[toothNum].faces[faceName];
    }

    // Auto-limpieza en memoria del diente si queda limpio
    if (Object.keys(odontogramData[toothNum].faces).length === 0 && odontogramData[toothNum].condition === 'healthy') {
      delete odontogramData[toothNum];
    }

    // Guardar en la base de datos local
    window.db.saveOdontogram(currentPatientId, odontogramData);
    window.showToast(`Pieza ${toothNum} · cara ${caraEs(faceName, toothNum).toLowerCase()}: estado actualizado`, 'success');

    renderFindingsHistory();
  }

  // Manejar click/acción en el Diente Entero
  function handleToothClick(toothNum) {
    if (!currentPatientId) return;

    if (!odontogramData[toothNum]) {
      odontogramData[toothNum] = { condition: 'healthy', faces: {} };
    }

    const svgEl = document.getElementById(`svg-${toothNum}`);
    
    // Limpiar clases globales previas
    svgEl.classList.remove('ausente', 'corona', 'implante');

    if (activeTool === 'ausente') {
      svgEl.classList.add('ausente');
      odontogramData[toothNum].condition = 'ausente';
      // Limpiar caras porque el diente no existe
      odontogramData[toothNum].faces = {};
      // Quitar clases de las caras visualmente
      document.querySelectorAll(`#svg-${toothNum} .tooth-face`).forEach(face => {
        face.classList.remove('caries', 'restaurado');
      });
    } else if (activeTool === 'corona') {
      svgEl.classList.add('corona');
      odontogramData[toothNum].condition = 'corona';
    } else if (activeTool === 'implante') {
      svgEl.classList.add('implante');
      odontogramData[toothNum].condition = 'implante';
      odontogramData[toothNum].faces = {};
      document.querySelectorAll(`#svg-${toothNum} .tooth-face`).forEach(face => {
        face.classList.remove('caries', 'restaurado');
      });
    } else if (activeTool === 'healthy') {
      // Restablecer diente completo a sano
      odontogramData[toothNum].condition = 'healthy';
      odontogramData[toothNum].faces = {};
      document.querySelectorAll(`#svg-${toothNum} .tooth-face`).forEach(face => {
        face.classList.remove('caries', 'restaurado');
      });
    }

    // Auto-limpieza
    if (Object.keys(odontogramData[toothNum].faces).length === 0 && odontogramData[toothNum].condition === 'healthy') {
      delete odontogramData[toothNum];
    }

    window.db.saveOdontogram(currentPatientId, odontogramData);
    window.showToast(`Pieza ${toothNum}: estado clínico actualizado`, 'success');
    renderFindingsHistory();
  }

  // Genera el listado cronológico de hallazgos dentales
  function renderFindingsHistory() {
    clinicalTimeline.innerHTML = '';

    const activeEntries = Object.keys(odontogramData);
    
    if (activeEntries.length === 0) {
      clinicalTimeline.innerHTML = `
        <div style="font-size: 0.8rem; color: var(--color-gray); padding: 15px 0; text-align: center;">
          Paciente sin hallazgos patológicos ni tratamientos activos registrados.
        </div>
      `;
      return;
    }


    activeEntries.sort().forEach(toothNum => {
      const state = odontogramData[toothNum];

      // 1. Mostrar estado de caras individuales
      if (state.faces && Object.keys(state.faces).length > 0) {
        Object.keys(state.faces).forEach(faceName => {
          const condition = state.faces[faceName];
          const div = document.createElement('div');
          div.className = `finding-item ${condition}`;

          const condText = condicionEs(condition);
          div.innerHTML = `
            <div class="finding-meta">
              <strong>Pieza ${toothNum}</strong>
              <span class="badge ${condition === 'caries' ? 'badge-canceled' : 'badge-confirmed'}">${condText}</span>
            </div>
            <div style="font-size: 0.78rem; margin-top: 4px;">
              Cara <strong>${caraEs(faceName, toothNum)}</strong> · ${detalleCondicion(condition)}
            </div>
          `;
          clinicalTimeline.appendChild(div);
        });
      }

      // 2. Mostrar estado global del diente
      if (state.condition && state.condition !== 'healthy') {
        const div = document.createElement('div');
        div.className = `finding-item ${state.condition}`;

        const BADGE_CONDICION = {
          ausente: 'badge-pending',
          corona: 'badge-confirmed',
          implante: 'badge-completed'
        };
        const condText = condicionEs(state.condition);
        const badgeClass = BADGE_CONDICION[state.condition] || 'badge-pending';

        div.innerHTML = `
          <div class="finding-meta">
            <strong>Pieza ${toothNum}</strong>
            <span class="badge ${badgeClass}">${condText}</span>
          </div>
          <div style="font-size: 0.78rem; margin-top: 4px;">
            ${detalleCondicion(state.condition)}
          </div>
        `;
        clinicalTimeline.appendChild(div);
      }
    });
  }

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
});
