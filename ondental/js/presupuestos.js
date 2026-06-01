/* ==========================================================================
   PRESUPUESTOS.JS - GENERADOR Y PROCESADOR DE PRESUPUESTOS CLÍNICOS
   Realiza sumas automáticas, descuentos y exportación de facturas imprimibles
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function() {
  let activeTreatmentsList = []; // Buffer de tratamientos agregados al presupuesto
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
      window.showToast('Por favor, elija un tratamiento del catálogo.', 'warning');
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
    const discount = parseInt(discountInput.value) || 0;
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
      window.showToast('Agregue al menos un tratamiento al presupuesto.', 'warning');
      return;
    }

    const budgetData = {
      patientId,
      dentistId,
      date: new Date().toISOString().split('T')[0],
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
      const prFormatted = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(t.price);
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
        pdfClinicaContact.innerHTML = `${clinicaConfig.direccion}<br>Contacto: ${clinicaConfig.correo} • ${clinicaConfig.telefono}`;
      }
      if (pdfClinicaTagline) {
        pdfClinicaTagline.textContent = `${clinicaConfig.nombreClinica} - Especialidades Integrales`;
      }
    }

    // Cargar metadatos por defecto de factura
    invIdEl.textContent = 'OD-' + Math.floor(1000 + Math.random() * 9000);
    invDateEl.textContent = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
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
          <td colspan="4" style="text-align: center; color: #718096; padding: 25px;">
            Ningún tratamiento clínico cargado al listado.
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
        <td style="font-weight: 700; color: #2d3748;">
          ${subtotalF}
          <span class="no-print" onclick="window.removeRow(${index})" style="color: var(--state-caries); cursor: pointer; font-size: 0.8rem; margin-left: 8px; font-weight: normal;">✕</span>
        </td>
      `;
      invTableBody.appendChild(tr);
    });

    calculateTotals();
  }

  // Eliminar un tratamiento del buffer
  window.removeRow = function(index) {
    activeTreatmentsList.splice(index, 1);
    window.showToast('Ítem removido', 'warning');
    renderInvoiceTable();
  };

  function calculateTotals() {
    const subtotal = activeTreatmentsList.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const discountPct = parseFloat(discountInput.value) || 0;
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
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);
  }
});
