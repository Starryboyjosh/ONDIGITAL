/* ==========================================================================
   PRESUPUESTOS.JS - GENERADOR Y PROCESADOR DE PRESUPUESTOS CLÍNICOS
   Realiza sumas automáticas, descuentos y exportación de facturas imprimibles
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function() {
  let activeTreatmentsList = []; // Buffer de procedimientos agregados al presupuesto
  let currentPatientId = null;

  // Referencias DOM - Formulario
  const patientSelect = document.getElementById('budget-patient');
  const dentistSelect = document.getElementById('budget-dentist');
  const treatmentSelect = document.getElementById('budget-treatment');
  const treatmentQty = document.getElementById('budget-qty');
  const addTreatmentBtn = document.getElementById('add-treatment-btn');
  const discountInput = document.getElementById('budget-discount');
  const statusSelect = document.getElementById('budget-status');
  const saveBudgetBtn = document.getElementById('save-budget-btn');

  // Referencias DOM - Vista de Impresión/Presupuesto (Derecha)
  const invIdEl = document.getElementById('inv-id');
  const invDateEl = document.getElementById('inv-date');
  const invPatientName = document.getElementById('inv-patient-name');
  const invPatientId = document.getElementById('inv-patient-id');
  const invPatientPhone = document.getElementById('inv-patient-phone');
  const invDentistName = document.getElementById('inv-dentist-name');
  const invTableBody = document.getElementById('inv-table-body');
  
  const invSubtotal = document.getElementById('inv-subtotal');
  const invDiscountRow = document.getElementById('inv-discount-row');
  const invDiscountVal = document.getElementById('inv-discount-val');
  const invGrandTotal = document.getElementById('inv-grand-total');

  const printBtn = document.getElementById('print-invoice-btn');

  // --- 1. CARGAR SELECTORES ---
  populateSelectors();

  // --- 2. GESTIONAR REDIRECCIÓN DE PACIENTE (?id=pat_1) ---
  const urlParams = new URLSearchParams(window.location.search);
  const urlId = urlParams.get('id');
  if (urlId) {
    patientSelect.value = urlId;
    updateInvoicePatient(urlId);
  }

  patientSelect.addEventListener('change', function() {
    updateInvoicePatient(this.value);
  });

  dentistSelect.addEventListener('change', function() {
    const dentist = window.db.getDentist(this.value);
    if (dentist) {
      invDentistName.textContent = `${dentist.name} (${dentist.specialty})`;
    }
  });

  // --- 3. AGREGAR TRATAMIENTOS AL BUFFER ---
  addTreatmentBtn.addEventListener('click', function() {
    const treatCode = treatmentSelect.value;
    const qty = parseInt(treatmentQty.value);

    if (!treatCode) {
      window.showToast('Elija un procedimiento del catálogo.', 'warning');
      return;
    }

    const catalog = window.db.getProcedures();
    const treatment = catalog.find(t => t.code === treatCode);

    if (treatment) {
      // Si ya existe en la lista, sumamos la cantidad
      const existing = activeTreatmentsList.find(item => item.code === treatCode);
      if (existing) {
        existing.qty += qty;
      } else {
        activeTreatmentsList.push({
          code: treatment.code,
          name: treatment.name,
          price: treatment.price,
          qty: qty
        });
      }

      window.showToast(`${treatment.name} agregado.`, 'success');
      renderInvoiceTable();
    }
  });

  // Único lector del campo de descuento. `presupuestos.html` no tiene ningún
  // <form>, así que `min`/`max` del input son decorativos: el navegador nunca
  // los valida. La vista previa y el registro guardado tienen que salir del
  // mismo número (con decimales) o el papel que firma el paciente dice un
  // total y Cobranzas cobra otro.
  function descuentoActual() {
    const raw = parseFloat(discountInput.value);
    return Number.isFinite(raw) ? Math.min(Math.max(raw, 0), 95) : 0;
  }

  // --- 4. RECALCULAR DESCUENTOS AL DIGITAR ---
  discountInput.addEventListener('input', function() {
    calculateTotals();
  });

  // --- 5. IMPRIMIR PRESUPUESTO CLINICO ---
  printBtn.addEventListener('click', function() {
    if (activeTreatmentsList.length === 0) {
      window.showToast('No puede imprimir un presupuesto vacío.', 'warning');
      return;
    }
    if (!patientSelect.value) {
      window.showToast('Asigne un paciente antes de imprimir.', 'warning');
      return;
    }

    // Gatillar diálogo nativo de impresión configurado con estilos CSS `@media print`
    window.print();
  });

  // --- 6. GUARDAR PRESUPUESTO EN LOCALSTORAGE ---
  saveBudgetBtn.addEventListener('click', function() {
    const patientId = patientSelect.value;
    const dentistId = dentistSelect.value;
    const rawDiscount = parseFloat(discountInput.value);
    if (Number.isFinite(rawDiscount) && (rawDiscount < 0 || rawDiscount > 95)) {
      window.showToast('El descuento debe estar entre 0% y 95%.', 'warning');
      return;
    }
    const discount = descuentoActual();
    const status = statusSelect.value;

    if (!patientId) {
      window.showToast('Por favor, seleccione un paciente.', 'warning');
      return;
    }
    if (!dentistId) {
      window.showToast('Por favor, asigne un dentista tratante.', 'warning');
      return;
    }
    if (activeTreatmentsList.length === 0) {
      window.showToast('Agregue al menos un procedimiento al presupuesto.', 'warning');
      return;
    }

    const budgetData = {
      patientId,
      dentistId,
      date: window.todayISO(),
      treatments: activeTreatmentsList,
      discount,
      status,
      paymentStatus: 'pendiente'
    };

    const savedBudget = window.db.saveBudget(budgetData);
    window.showToast('Presupuesto clínico guardado con éxito', 'success');

    // Limpiar formulario y re-inicializar
    activeTreatmentsList = [];
    discountInput.value = 0;
    treatmentQty.value = 1;
    renderInvoiceTable();
    invIdEl.textContent = siguienteFolio();
    renderBudgetList();
  });

  // --- MÉTODOS DE RENDERIZACIÓN ---

  function populateSelectors() {
    const patients = window.db.getPatients();
    const dentists = window.db.getDentists();
    const treatments = window.db.getProcedures();

    // Llenar pacientes
    patientSelect.innerHTML = '<option value="" disabled selected>Asignar Paciente...</option>';
    patients.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.name} (${p.rut})`;
      patientSelect.appendChild(opt);
    });

    // Llenar dentistas
    dentistSelect.innerHTML = '<option value="" disabled selected>Asignar Odontólogo...</option>';
    dentists.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = d.name;
      dentistSelect.appendChild(opt);
    });

    // Llenar catálogo
    treatmentSelect.innerHTML = '<option value="" disabled selected>Seleccione del catálogo...</option>';
    treatments.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.code;
      // Formatear precio para el selector
      const prFormatted = window.formatMoney(t.price);
      opt.textContent = `${t.name} — ${prFormatted}`;
      treatmentSelect.appendChild(opt);
    });

    // Cargar Branding de la Clínica Personalizado
    const currentCompany = window.auth ? window.auth.getCurrentCompany() : null;
    const clinicaConfig = window.db.getClinicaConfig(currentCompany ? currentCompany.id : null);
    if (clinicaConfig) {
      const pdfClinicaName = document.getElementById('pdf-clinica-name');
      const pdfClinicaContact = document.getElementById('pdf-clinica-contact');
      const pdfClinicaTagline = document.getElementById('pdf-clinica-tagline');

      if (pdfClinicaName) pdfClinicaName.textContent = clinicaConfig.nombreClinica;
      if (pdfClinicaContact) {
        // Solo se imprime lo que está configurado: un encabezado con huecos
        // vacíos delata que el documento salió de un sistema a medio llenar.
        const contacto = [clinicaConfig.correo, clinicaConfig.telefono]
          .filter(Boolean)
          .map(window.escapeHtml)
          .join(' • ');
        pdfClinicaContact.innerHTML =
          window.escapeHtml(clinicaConfig.direccion || '') +
          (contacto ? '<br>Contacto: ' + contacto : '');
      }
      if (pdfClinicaTagline) {
        pdfClinicaTagline.textContent = `${clinicaConfig.nombreClinica} - Especialidades Integrales`;
      }
    }

    // Metadatos del documento. El folio es el que realmente se asignará al
    // guardar (correlativo del inquilino), no un número aleatorio.
    invIdEl.textContent = siguienteFolio();
    invDateEl.textContent = window.formatDateEs(window.todayISO(), { day: 'numeric', month: 'long', year: 'numeric' });
  }

  // Correlativo que db.saveBudget asignará al siguiente presupuesto.
  function siguienteFolio() {
    let max = 0;
    window.db.getBudgets().forEach(b => {
      const m = /^P-(\d+)$/.exec(b.folio || '');
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    return 'P-' + String(max + 1).padStart(4, '0');
  }

  function updateInvoicePatient(patientId) {
    const patient = window.db.getPatient(patientId);
    if (patient) {
      currentPatientId = patientId;
      invPatientName.textContent = patient.name;
      invPatientId.textContent = patient.rut;
      invPatientPhone.textContent = patient.phone;
    }
  }

  function renderInvoiceTable() {
    invTableBody.innerHTML = '';

    if (activeTreatmentsList.length === 0) {
      invTableBody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align: center; color: var(--doc-muted); padding: 25px;">
            Todavía no hay procedimientos en este presupuesto.
          </td>
        </tr>
      `;
      calculateTotals();
      return;
    }

    activeTreatmentsList.forEach((item, index) => {
      const tr = document.createElement('tr');
      const subtotalRow = item.price * item.qty;

      const priceF = formatCurrency(item.price);
      const subtotalF = formatCurrency(subtotalRow);

      tr.innerHTML = `
        <td style="font-weight: 600;">${item.name}</td>
        <td style="text-align: center;">${item.qty}</td>
        <td>${priceF}</td>
        <td style="font-weight: 700; color: var(--doc-ink-soft);">
          ${subtotalF}
          <span class="no-print" onclick="window.removeRow(${index})" style="color: var(--color-red-text); cursor: pointer; font-size: 0.8rem; margin-left: 8px; font-weight: normal;">✕</span>
        </td>
      `;
      invTableBody.appendChild(tr);
    });

    calculateTotals();
  }

  // Eliminar un procedimiento del buffer
  window.removeRow = function(index) {
    activeTreatmentsList.splice(index, 1);
    window.showToast('Procedimiento quitado del presupuesto.', 'warning');
    renderInvoiceTable();
  };

  function calculateTotals() {
    const subtotal = activeTreatmentsList.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const discountPct = descuentoActual();
    const discountVal = subtotal * (discountPct / 100);
    const grandTotal = subtotal - discountVal;

    invSubtotal.textContent = formatCurrency(subtotal);

    if (discountPct > 0) {
      invDiscountRow.style.display = 'flex';
      invDiscountVal.textContent = `-${formatCurrency(discountVal)} (${discountPct}%)`;
    } else {
      invDiscountRow.style.display = 'none';
    }

    invGrandTotal.textContent = formatCurrency(grandTotal);
  }

  function formatCurrency(value) {
    return window.formatMoney(value);
  }

  // --- LISTADO DE PRESUPUESTOS REGISTRADOS ---

  const listBody = document.getElementById('bud-list-body');
  const listCount = document.getElementById('bud-list-count');

  function totalPresupuesto(b) {
    const bruto = (b.treatments || []).reduce((s, t) => s + (t.price || 0) * (t.qty || 1), 0);
    return bruto - bruto * ((b.discount || 0) / 100);
  }

  function renderBudgetList() {
    if (!listBody) return;
    const budgets = window.db.getBudgets().slice().sort((a, b) =>
      String(b.date || '').localeCompare(String(a.date || '')));

    listCount.textContent = budgets.length === 1
      ? '1 presupuesto'
      : budgets.length + ' presupuestos';

    if (budgets.length === 0) {
      listBody.innerHTML = '<tr><td colspan="7" class="table-empty-cell">Todavía no hay presupuestos registrados.</td></tr>';
      return;
    }

    const ESTADOS = {
      draft: ['badge-pending', 'Borrador'],
      accepted: ['badge-confirmed', 'Aceptado'],
      rejected: ['badge-canceled', 'Rechazado']
    };

    listBody.innerHTML = budgets.map(b => {
      const paciente = window.db.getPatient(b.patientId);
      const total = totalPresupuesto(b);
      const pagado = window.db.getPayments(b.id).reduce((s, p) => s + (p.amount || 0), 0);
      const saldo = Math.max(total - pagado, 0);
      const [cls, txt] = ESTADOS[b.status] || ['badge-pending', 'Borrador'];
      // Un borrador o un rechazado no es cartera: el paciente no ha aceptado
      // nada. Pintarles saldo en rojo con botón "Cobrar" inventaba cuentas por
      // cobrar que no existen y contradecía al Dashboard y a Cobranzas, que
      // solo suman los aceptados. El criterio es uno solo y vive en main.js
      // (`window.esCobrable`), compartido con Cobranzas y Comunicaciones.
      const cobrable = window.esCobrable(b);
      const motivo = b.status === 'rejected' ? 'Presupuesto rechazado: no genera saldo por cobrar.'
        : b.status !== 'accepted' ? 'Presupuesto en borrador: no genera saldo por cobrar hasta que el paciente lo acepte.'
        : b.paymentStatus === 'cancelado' ? 'Cobranza cancelada: el presupuesto ya no genera saldo por cobrar.'
        : 'Cobranza suspendida temporalmente.';
      const celdaSaldo = cobrable
        ? '<td class="num" style="font-weight:700;color:' + (saldo > 0 ? 'var(--color-red-text)' : 'var(--color-green-text)') + '">' + window.formatMoney(saldo) + '</td>'
        : '<td class="num" style="color:var(--color-gray)" title="' + window.escapeHtml(motivo) + '">—</td>';
      const celdaAccion = cobrable
        ? '<td class="num"><a class="btn btn-secondary btn-sm" href="cobranzas.html">Cobrar</a></td>'
        : '<td class="num"><span style="color:var(--color-gray)">—</span></td>';
      return '<tr>' +
        '<td><code class="tag">' + window.folioPresupuesto(b) + '</code></td>' +
        '<td>' + window.escapeHtml(paciente ? paciente.name : 'Paciente dado de baja') + '</td>' +
        '<td>' + window.formatDateEs(b.date) + '</td>' +
        '<td><span class="badge ' + cls + '">' + txt + '</span></td>' +
        '<td class="num">' + window.formatMoney(total) + '</td>' +
        celdaSaldo + celdaAccion +
        '</tr>';
    }).join('');
  }

  renderBudgetList();
});
