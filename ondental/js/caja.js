/* ==========================================================================
   CAJA.JS - ESQUELETO DE CAJA Y FINANZAS
   Operación diaria: apertura/cierre, movimientos (ingresos/gastos/anulaciones),
   resumen por método y placeholders de arqueo/conciliación.
   Los ingresos por abonos se leen de Cobranzas (solo lectura). Los movimientos
   manuales y el estado de caja se guardan localmente; no toca el storage clínico
   ni realiza conciliación bancaria real.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function() {
  if (window.auth) window.auth.checkSession();

  const company = window.auth ? window.auth.getCurrentCompany() : null;
  const companyId = company ? company.id : 'default';
  const CAJA_KEY = 'ondental_caja_' + companyId;
  const MOV_KEY = 'ondental_caja_mov_' + companyId;

  const todayStr = new Date().toISOString().split('T')[0];

  // --- Estado de caja (local) ---
  function readCaja() {
    try {
      const raw = JSON.parse(localStorage.getItem(CAJA_KEY));
      if (raw && raw.fecha === todayStr) return raw;
    } catch (e) { /* ignore */ }
    return { fecha: todayStr, abierta: false, apertura: 0 };
  }
  function writeCaja(c) { localStorage.setItem(CAJA_KEY, JSON.stringify(c)); }

  // --- Movimientos manuales (local) ---
  function readMovs() {
    try { return (JSON.parse(localStorage.getItem(MOV_KEY)) || []).filter(m => m.fecha === todayStr); }
    catch (e) { return []; }
  }
  function writeMovs(list) { localStorage.setItem(MOV_KEY, JSON.stringify(list)); }

  let caja = readCaja();

  // --- Método normalizado ---
  function normMetodo(m) {
    const s = (m || '').toLowerCase();
    if (s.includes('tarjeta')) return 'Tarjeta';
    if (s.includes('transfer')) return 'Transferencia';
    return 'Efectivo';
  }

  function horaFromId(id) {
    const m = String(id || '').match(/(\d{10,})/);
    if (!m) return '—';
    const d = new Date(parseInt(m[1], 10));
    return isNaN(d.getTime()) ? '—' : d.toTimeString().slice(0, 5);
  }

  // --- Reunir movimientos del día (abonos reales + manuales) ---
  function gatherMovements() {
    const budgets = window.db.getBudgets();
    const budgetIds = new Set(budgets.map(b => b.id));
    const payments = window.db.getPayments().filter(p => budgetIds.has(p.budgetId) && p.date === todayStr);

    const fromPayments = payments.map(p => ({
      hora: horaFromId(p.id),
      tipo: 'ingreso',
      concepto: 'Abono ' + (p.budgetId ? p.budgetId.toUpperCase() : 'presupuesto'),
      metodo: normMetodo(p.method),
      monto: parseFloat(p.amount || 0),
      origen: 'Cobranzas'
    }));

    const manual = readMovs().map(m => ({
      hora: m.hora,
      tipo: m.tipo,
      concepto: m.concepto,
      metodo: m.metodo,
      monto: parseFloat(m.monto || 0),
      origen: 'Manual'
    }));

    return fromPayments.concat(manual).sort((a, b) => (b.hora || '').localeCompare(a.hora || ''));
  }

  // --- Render ---
  function renderEstado() {
    const label = document.getElementById('caja-estado-label');
    const info = document.getElementById('caja-apertura-info');
    if (caja.abierta) {
      label.innerHTML = '<span class="badge badge-completed">Abierta</span>';
      info.textContent = `Apertura del día: ${window.formatMoney(caja.apertura)}`;
    } else {
      label.innerHTML = '<span class="badge badge-canceled">Cerrada</span>';
      info.textContent = caja.fecha === todayStr && caja.apertura
        ? 'Caja cerrada para el día de hoy.'
        : 'Sin apertura registrada hoy.';
    }
    document.getElementById('btn-abrir-caja').disabled = caja.abierta;
    document.getElementById('btn-cerrar-caja').disabled = !caja.abierta;
    document.getElementById('add-movement-btn').disabled = !caja.abierta;
  }

  function renderSummary(movs) {
    let ingresos = 0, gastos = 0, anulaciones = 0;
    let efectivoNeto = 0;
    const porMetodo = { Efectivo: 0, Tarjeta: 0, Transferencia: 0 };

    movs.forEach(m => {
      if (m.tipo === 'ingreso') {
        ingresos += m.monto;
        if (porMetodo[m.metodo] !== undefined) porMetodo[m.metodo] += m.monto;
        if (m.metodo === 'Efectivo') efectivoNeto += m.monto;
      } else if (m.tipo === 'gasto') {
        gastos += m.monto;
        if (m.metodo === 'Efectivo') efectivoNeto -= m.monto;
      } else if (m.tipo === 'anulacion') {
        anulaciones += m.monto;
        if (m.metodo === 'Efectivo') efectivoNeto -= m.monto;
      }
    });

    const efectivoEnCaja = (caja.abierta ? caja.apertura : 0) + efectivoNeto;

    document.getElementById('caja-ingresos').textContent = window.formatMoney(ingresos);
    document.getElementById('caja-gastos').textContent = window.formatMoney(gastos);
    document.getElementById('caja-anulaciones').textContent = window.formatMoney(anulaciones);
    document.getElementById('caja-efectivo').textContent = window.formatMoney(efectivoEnCaja);

    document.getElementById('met-efectivo').textContent = window.formatMoney(porMetodo.Efectivo);
    document.getElementById('met-tarjeta').textContent = window.formatMoney(porMetodo.Tarjeta);
    document.getElementById('met-transferencia').textContent = window.formatMoney(porMetodo.Transferencia);
  }

  function renderMovimientos(movs) {
    const tbody = document.getElementById('movimientos-body');
    if (movs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--color-gray); padding: 26px;">Sin movimientos registrados hoy.</td></tr>';
      return;
    }
    const tipoBadge = {
      ingreso: ['badge-completed', 'Ingreso'],
      gasto: ['badge-canceled', 'Gasto'],
      anulacion: ['badge-pending', 'Anulación']
    };
    tbody.innerHTML = movs.map(m => {
      const [cls, txt] = tipoBadge[m.tipo] || ['badge-confirmed', m.tipo];
      const signo = m.tipo === 'ingreso' ? '' : '−';
      const color = m.tipo === 'ingreso' ? 'var(--color-green)' : 'var(--color-red)';
      return `
        <tr>
          <td>${m.hora || '—'}</td>
          <td><span class="badge ${cls}">${txt}</span></td>
          <td>${m.concepto} ${m.origen === 'Cobranzas' ? '<span class="tag">Cobranzas</span>' : ''}</td>
          <td>${m.metodo}</td>
          <td style="text-align: right; font-weight: 700; color: ${color};">${signo}${window.formatMoney(m.monto)}</td>
        </tr>
      `;
    }).join('');
  }

  function renderAll() {
    const movs = gatherMovements();
    renderEstado();
    renderSummary(movs);
    renderMovimientos(movs);
  }

  // --- Acciones ---
  document.getElementById('btn-abrir-caja').addEventListener('click', function() {
    const val = prompt('Monto de apertura de caja (efectivo inicial, en lempiras):', '0');
    if (val === null) return;
    const apertura = parseFloat(val) || 0;
    caja = { fecha: todayStr, abierta: true, apertura };
    writeCaja(caja);
    renderAll();
    window.showToast('Caja abierta', 'success');
  });

  document.getElementById('btn-cerrar-caja').addEventListener('click', function() {
    if (!caja.abierta) return;
    if (!confirm('¿Cerrar la caja del día? No se podrán registrar más movimientos hasta la próxima apertura.')) return;
    caja.abierta = false;
    writeCaja(caja);
    renderAll();
    window.showToast('Caja cerrada', 'warning');
  });

  // --- Modal de movimiento ---
  const movementModal = document.getElementById('movement-modal');
  window.setupModalClosers(movementModal, document.getElementById('movement-modal-close'));

  document.getElementById('add-movement-btn').addEventListener('click', function() {
    if (!caja.abierta) {
      window.showToast('Abra la caja antes de registrar movimientos.', 'warning');
      return;
    }
    document.getElementById('movement-form').reset();
    movementModal.classList.add('active');
  });

  document.getElementById('movement-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const mov = {
      id: 'mov_' + Date.now(),
      fecha: todayStr,
      hora: new Date().toTimeString().slice(0, 5),
      tipo: document.getElementById('mov-tipo').value,
      metodo: document.getElementById('mov-metodo').value,
      concepto: document.getElementById('mov-concepto').value.trim(),
      monto: parseFloat(document.getElementById('mov-monto').value) || 0
    };
    const list = readMovs();
    list.push(mov);
    writeMovs(list);
    movementModal.classList.remove('active');
    renderAll();
    window.showToast('Movimiento registrado', 'success');
  });

  // Inicializar
  renderAll();
});
