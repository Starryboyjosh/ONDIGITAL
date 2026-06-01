/* ==========================================================================
   COBRANZAS.JS - CONTROLADOR DE PAGOS, SALDOS Y RECIBOS EN PDF
   Implementa el control de cobranzas por presupuesto y registro de transacciones.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function() {
  // Verificar Sesión
  if (window.auth) {
    window.auth.checkSession();
  }

  const tableBody = document.getElementById('cob-table-body');
  const searchInput = document.getElementById('cob-search');
  const statusFilter = document.getElementById('cob-filter-status');

  // Detalles de Ficha Derecha
  const detailCard = document.getElementById('cob-detail-card');
  const detailEmpty = document.getElementById('cob-detail-empty');
  
  const detailTitle = document.getElementById('detail-budget-title');
  const detailPatientName = document.getElementById('detail-patient-name');
  const detailStatusBadge = document.getElementById('detail-budget-status-badge');
  const detailTotalAmount = document.getElementById('detail-total-amount');
  const detailPaidAmount = document.getElementById('detail-paid-amount');
  const detailPendingAmount = document.getElementById('detail-pending-amount');
  
  const detailPaymentsTimeline = document.getElementById('detail-payments-timeline');

  // Botones de acción
  const btnConfirmPayment = document.getElementById('btn-confirm-payment');
  const btnSuspendBudget = document.getElementById('btn-suspend-budget');
  const btnCancelBudget = document.getElementById('btn-cancel-budget');
  const btnPrintReceipt = document.getElementById('btn-print-receipt');

  // Modal registrar pago
  const paymentModal = document.getElementById('payment-modal');
  const paymentForm = document.getElementById('payment-form');
  const paymentBudgetIdInput = document.getElementById('payment-budget-id');
  const modalPendingLabel = document.getElementById('modal-pending-label');
  const paymentAmountInput = document.getElementById('payment-amount');
  const paymentDateInput = document.getElementById('payment-date');

  let selectedBudgetId = null;

  // Registrar Cierre de Modales
  window.setupModalClosers(paymentModal, document.getElementById('payment-modal-close'));
  document.getElementById('btn-cancel-payment-modal').addEventListener('click', () => {
    paymentModal.classList.remove('active');
  });

  // Renderizar tabla al cargar
  renderTable();

  // Búsqueda y filtrado
  searchInput.addEventListener('input', renderTable);
  statusFilter.addEventListener('change', renderTable);

  // ABRIR REGISTRO DE PAGO
  btnConfirmPayment.addEventListener('click', function() {
    if (!selectedBudgetId) return;

    const budget = window.db.getBudgets().find(b => b.id === selectedBudgetId);
    if (!budget) return;

    const subtotal = budget.treatments.reduce((acc, t) => acc + (t.price * t.qty), 0);
    const total = subtotal * (1 - (budget.discount || 0) / 100);
    const payments = window.db.getPayments(selectedBudgetId);
    const totalPaid = payments.reduce((acc, p) => acc + parseFloat(p.amount), 0);
    const pending = total - totalPaid;

    if (pending <= 0) {
      window.showToast('Este presupuesto ya se encuentra totalmente pagado.', 'warning');
      return;
    }

    formReset();
    paymentBudgetIdInput.value = selectedBudgetId;
    modalPendingLabel.textContent = formatCurrency(pending);
    paymentAmountInput.max = pending;
    paymentAmountInput.value = pending; // Por defecto sugiere liquidar la deuda
    paymentDateInput.value = new Date().toISOString().split('T')[0];

    paymentModal.classList.add('active');
  });

  // GUARDAR ABONO / PAGO
  paymentForm.addEventListener('submit', function(e) {
    e.preventDefault();

    const budgetId = paymentBudgetIdInput.value;
    const amount = parseFloat(paymentAmountInput.value);
    const method = document.getElementById('payment-method').value;
    const date = paymentDateInput.value;
    const notes = document.getElementById('payment-notes').value.trim() || 'Abono registrado.';

    const payment = {
      budgetId: budgetId,
      amount: amount,
      method: method,
      date: date,
      notes: notes
    };

    window.db.registerPayment(payment);
    window.showToast('Pago registrado con éxito', 'success');
    paymentModal.classList.remove('active');
    
    // Recargar pantallas
    renderTable();
    window.selectBudget(budgetId);
  });

  // SUSPENDER PRESUPUESTO
  btnSuspendBudget.addEventListener('click', function() {
    if (!selectedBudgetId) return;
    if (confirm('¿Está seguro de que desea suspender la cobranza de este presupuesto?')) {
      window.db.updateBudgetPaymentStatus(selectedBudgetId, 'suspendido');
      window.showToast('Cobranza suspendida temporalmente.', 'warning');
      renderTable();
      window.selectBudget(selectedBudgetId);
    }
  });

  // CANCELAR PRESUPUESTO
  btnCancelBudget.addEventListener('click', function() {
    if (!selectedBudgetId) return;
    if (confirm('¿Está seguro de que desea cancelar este presupuesto y sus deudas?')) {
      window.db.updateBudgetPaymentStatus(selectedBudgetId, 'cancelado');
      window.showToast('Presupuesto cancelado permanentemente.', 'error');
      renderTable();
      window.selectBudget(selectedBudgetId);
    }
  });

  // GENERAR / IMPRIMIR COMPROBANTE RECIBO PDF
  btnPrintReceipt.addEventListener('click', function() {
    if (!selectedBudgetId) return;

    const budget = window.db.getBudgets().find(b => b.id === selectedBudgetId);
    if (!budget) return;

    const patient = window.db.getPatient(budget.patientId);
    const dentist = window.db.getDentist(budget.dentistId) || { name: 'Odontólogo' };
    const payments = window.db.getPayments(selectedBudgetId);

    const subtotal = budget.treatments.reduce((acc, t) => acc + (t.price * t.qty), 0);
    const total = subtotal * (1 - (budget.discount || 0) / 100);
    const totalPaid = payments.reduce((acc, p) => acc + parseFloat(p.amount), 0);
    const pending = total - totalPaid;

    // Cargar clínica branding personalizado
    const currentCompany = window.auth ? window.auth.getCurrentCompany() : null;
    const clinicaConfig = window.db.getClinicaConfig(currentCompany ? currentCompany.id : null);

    document.getElementById('receipt-clinic-name').textContent = clinicaConfig.nombreClinica;
    document.getElementById('receipt-clinic-contact').innerHTML = `${clinicaConfig.direccion}<br>Contacto: ${clinicaConfig.correo} • ${clinicaConfig.telefono}`;

    document.getElementById('receipt-budget-id').textContent = budget.id.toUpperCase();
    document.getElementById('receipt-date').textContent = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'numeric', year: 'numeric' });
    document.getElementById('receipt-patient-name').textContent = patient ? patient.name : 'Paciente';
    document.getElementById('receipt-patient-id').textContent = patient ? patient.rut : '-';
    document.getElementById('receipt-dentist-name').textContent = dentist.name;

    // Llenar tabla de abonos
    const receiptTableBody = document.getElementById('receipt-payments-table-body');
    receiptTableBody.innerHTML = '';

    if (payments.length === 0) {
      receiptTableBody.innerHTML = `
        <tr>
          <td colspan="4" style="padding: 10px; text-align: center; color: #718096;">
            No registra abonos cargados.
          </td>
        </tr>
      `;
    } else {
      payments.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${p.date}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">${p.method}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; color: #718096;">${p.notes}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700;">${formatCurrency(p.amount)}</td>
        `;
        receiptTableBody.appendChild(tr);
      });
    }

    // Llenar totales
    document.getElementById('receipt-total-budget').textContent = formatCurrency(total);
    document.getElementById('receipt-total-paid').textContent = formatCurrency(totalPaid);
    document.getElementById('receipt-total-pending').textContent = formatCurrency(pending);

    // Gatillar impresión nativa
    window.print();
  });

  // RENDERIZAR TABLA DE PRESUPUESTOS
  function renderTable() {
    const budgets = window.db.getBudgets();
    tableBody.innerHTML = '';

    const query = searchInput.value.toLowerCase().trim();
    const filter = statusFilter.value;

    const filtered = budgets.filter(b => {
      const patient = window.db.getPatient(b.patientId);
      const patientName = patient ? patient.name.toLowerCase() : '';
      const matchQuery = patientName.includes(query);
      const matchFilter = filter === 'todos' || b.paymentStatus === filter;
      return matchQuery && matchFilter;
    });

    if (filtered.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: var(--color-gray); padding: 30px;">
            No se encontraron registros de cobros.
          </td>
        </tr>
      `;
      return;
    }

    filtered.forEach(b => {
      const patient = window.db.getPatient(b.patientId) || { name: 'Paciente' };
      const subtotal = b.treatments.reduce((acc, t) => acc + (t.price * t.qty), 0);
      const total = subtotal * (1 - (b.discount || 0) / 100);

      // Calcular abonos
      const payments = window.db.getPayments(b.id);
      const totalPaid = payments.reduce((acc, p) => acc + parseFloat(p.amount), 0);
      const pending = total - totalPaid;

      // Obtener insignia de estado
      const badge = getStatusBadgeHtml(b.paymentStatus);

      const tr = document.createElement('tr');
      tr.style.cursor = 'pointer';
      if (b.id === selectedBudgetId) tr.className = 'active-row';

      tr.innerHTML = `
        <td><code class="tag">${b.id.toUpperCase()}</code></td>
        <td style="font-weight: 600;">${patient.name}</td>
        <td style="text-align: right; font-weight: 500;">${formatCurrency(total)}</td>
        <td style="text-align: right; font-weight: 700; color: ${pending > 0 ? 'var(--state-caries)' : 'var(--color-teal)'};">${formatCurrency(pending)}</td>
        <td>${badge}</td>
        <td style="text-align: right;">
          <button onclick="event.stopPropagation(); window.selectBudget('${b.id}')" class="btn btn-secondary" style="padding: 5px 10px; font-size: 0.75rem;">Gestionar</button>
        </td>
      `;

      tr.addEventListener('click', () => {
        window.selectBudget(b.id);
      });

      tableBody.appendChild(tr);
    });
  }

  // CARGAR FICHA DE PRESUPUESTO
  window.selectBudget = function(budgetId) {
    selectedBudgetId = budgetId;
    
    // Refrescar tabla para marcar fila activa
    renderTable();

    const budget = window.db.getBudgets().find(b => b.id === budgetId);
    if (!budget) {
      detailCard.style.display = 'none';
      detailEmpty.style.display = 'flex';
      return;
    }

    detailEmpty.style.display = 'none';
    detailCard.style.display = 'flex';

    const patient = window.db.getPatient(budget.patientId) || { name: 'Paciente' };
    
    // Totales
    const subtotal = budget.treatments.reduce((acc, t) => acc + (t.price * t.qty), 0);
    const total = subtotal * (1 - (budget.discount || 0) / 100);
    const payments = window.db.getPayments(budgetId);
    const totalPaid = payments.reduce((acc, p) => acc + parseFloat(p.amount), 0);
    const pending = total - totalPaid;

    // Ficha
    detailTitle.textContent = `Presupuesto N° ${budget.id.toUpperCase()}`;
    detailPatientName.textContent = `Paciente: ${patient.name} (${patient.rut})`;
    
    // Badge
    detailStatusBadge.textContent = budget.paymentStatus.toUpperCase();
    detailStatusBadge.className = 'badge ' + getBadgeClass(budget.paymentStatus);

    detailTotalAmount.textContent = formatCurrency(total);
    detailPaidAmount.textContent = formatCurrency(totalPaid);
    detailPendingAmount.textContent = formatCurrency(pending);

    // Timeline de abonos
    detailPaymentsTimeline.innerHTML = '';

    if (payments.length === 0) {
      detailPaymentsTimeline.innerHTML = `
        <div style="font-size: 0.8rem; color: var(--color-gray); padding: 10px 0;">
          No se registran abonos a este presupuesto.
        </div>
      `;
    } else {
      payments.forEach(p => {
        const item = document.createElement('div');
        item.className = 'finding-item';
        item.style.borderLeftColor = 'var(--color-teal)';
        item.innerHTML = `
          <div class="finding-meta">
            <span>${p.date}</span>
            <span class="badge badge-completed" style="font-size: 0.65rem;">${p.method}</span>
          </div>
          <div class="finding-desc" style="font-size: 0.82rem; margin-top: 4px; font-weight: 700; color: var(--color-white);">
            + ${formatCurrency(p.amount)}
          </div>
          <div style="font-size: 0.75rem; color: var(--color-gray); margin-top: 4px; font-style: italic;">
            Obs: ${p.notes}
          </div>
        `;
        detailPaymentsTimeline.appendChild(item);
      });
    }
  };

  // Helpers auxiliares
  function formReset() {
    paymentForm.reset();
  }

  function getBadgeClass(status) {
    if (status === 'pendiente') return 'badge-pending';
    if (status === 'parcial') return 'badge-confirmed';
    if (status === 'pagado') return 'badge-completed';
    if (status === 'cancelado') return 'badge-canceled';
    return 'badge-pending'; // suspendido u otros
  }

  function getStatusBadgeHtml(status) {
    let badgeClass = 'badge-pending';
    let text = 'Pendiente';

    if (status === 'pendiente') { badgeClass = 'badge-pending'; text = 'Pendiente'; }
    else if (status === 'parcial') { badgeClass = 'badge-confirmed'; text = 'Abonado'; }
    else if (status === 'pagado') { badgeClass = 'badge-completed'; text = 'Saldado'; }
    else if (status === 'suspendido') { badgeClass = 'badge-pending'; text = 'Suspendido'; }
    else if (status === 'cancelado') { badgeClass = 'badge-canceled'; text = 'Cancelado'; }

    return `<span class="badge ${badgeClass}">${text}</span>`;
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value);
  }
});
