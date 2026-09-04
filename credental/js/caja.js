/* ==========================================================================
   CAJA.JS — CAJA DIARIA
   Operación del día: apertura, movimientos (ingresos, gastos y anulaciones),
   resumen por método de pago, arqueo de efectivo y cierre.
   Los ingresos por abonos se leen de Cobranzas (solo lectura). Los movimientos
   manuales, el arqueo y el estado de caja se guardan localmente; no realiza
   conciliación bancaria real ni toca el expediente clínico.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function() {
  if (window.auth) window.auth.checkSession();

  const company = window.auth ? window.auth.getCurrentCompany() : null;
  const companyId = company ? company.id : 'default';
  const CAJA_KEY = 'credental_caja_' + companyId;
  const MOV_KEY = 'credental_caja_mov_' + companyId;

  const todayStr = window.todayISO();

  // --- Estado de caja (local) ---
  function readCaja() {
    try {
      const raw = JSON.parse(localStorage.getItem(CAJA_KEY));
      if (raw && raw.fecha === todayStr) return raw;
    } catch (e) { /* ignore */ }
    return { fecha: todayStr, abierta: false, apertura: 0, arqueo: null };
  }
  function writeCaja(c) { localStorage.setItem(CAJA_KEY, JSON.stringify(c)); }

  // --- Movimientos manuales (local) ---
  // `readAllMovs` devuelve el histórico completo; `readMovs` solo el día que se
  // está operando. La escritura siempre parte del histórico: si se guardara la
  // lista filtrada, cada movimiento nuevo borraría los días anteriores, y como
  // esta clave vive en localStorage la pérdida sería definitiva.
  function readAllMovs() {
    try {
      const lista = JSON.parse(localStorage.getItem(MOV_KEY));
      return Array.isArray(lista) ? lista : [];
    } catch (e) { return []; }
  }
  function readMovs() { return readAllMovs().filter(m => m.fecha === todayStr); }
  function writeMovs(list) { localStorage.setItem(MOV_KEY, JSON.stringify(list)); }

  let caja = readCaja();

  // La demostración llega con abonos cobrados hoy (Cobranzas). Si la caja
  // apareciera "cerrada / sin apertura registrada", la pantalla se
  // contradiría a sí misma: movimientos del día sobre una caja que nunca se
  // abrió, y el botón de registrar movimiento inhabilitado. Se abre una sola
  // vez con un fondo inicial sintético y a partir de ahí manda lo que haga el
  // usuario (si la cierra, se queda cerrada).
  // `window.CredentalDemo` está definido en las 17 pantallas pase lo que pase,
  // así que no distingue una clínica real de la demostración: una clínica que
  // estrena el producto abría su caja con un fondo de L 500.00 que nadie
  // depositó. La guarda correcta es la empresa activa.
  const esDemo = companyId === 'co_credental_demo';

  if (!caja.abierta && localStorage.getItem(CAJA_KEY) === null && esDemo) {
    caja = { fecha: todayStr, abierta: true, apertura: 500, arqueo: null };
    writeCaja(caja);
  }

  // --- Método normalizado ---
  function normMetodo(m) {
    const s = (m || '').toLowerCase();
    if (s.includes('tarjeta')) return 'Tarjeta';
    if (s.includes('transfer')) return 'Transferencia';
    return 'Efectivo';
  }

  function horaDeAbono(p) {
    if (p.time) return p.time;
    const m = String(p.id || '').match(/(\d{13})/);
    if (!m) return '—';
    const d = new Date(parseInt(m[1], 10));
    return isNaN(d.getTime()) ? '—' : d.toTimeString().slice(0, 5);
  }

  // --- Reunir movimientos del día (abonos reales + manuales) ---
  function gatherMovements() {
    const budgets = window.db.getBudgets();
    const budgetIds = new Set(budgets.map(b => b.id));
    const payments = window.db.getPayments().filter(p => budgetIds.has(p.budgetId) && p.date === todayStr);

    const porId = {};
    budgets.forEach(b => { porId[b.id] = b; });

    const fromPayments = payments.map(p => {
      const budget = porId[p.budgetId];
      const paciente = budget ? window.db.getPatient(budget.patientId) : null;
      const folio = budget ? window.folioPresupuesto(budget) : 'presupuesto';
      return {
        hora: horaDeAbono(p),
        tipo: 'ingreso',
        concepto: 'Abono presupuesto ' + folio + (paciente ? ' · ' + paciente.name : ''),
        metodo: normMetodo(p.method),
        monto: parseFloat(p.amount || 0),
        origen: 'Cobranzas'
      };
    });

    const manual = readMovs().map(m => ({
      hora: m.hora,
      tipo: m.tipo,
      concepto: m.concepto,
      metodo: m.metodo,
      monto: parseFloat(m.monto || 0),
      origen: 'Manual'
    }));

    // `caja.desde` solo existe cuando el turno se reabrió después de un cierre:
    // marca la hora desde la que cuenta el turno actual. Sin ella, reabrir
    // declarando el efectivo contado —que ya incluye lo cobrado por la mañana—
    // volvía a sumar los movimientos del turno anterior sobre el nuevo fondo.
    const desde = caja.desde || null;
    const delTurno = m => !desde || (m.hora && m.hora !== '—' && m.hora >= desde);

    return fromPayments.concat(manual)
      .filter(delTurno)
      .sort((a, b) => (b.hora || '').localeCompare(a.hora || ''));
  }

  // --- Render ---
  function renderEstado() {
    const label = document.getElementById('caja-estado-label');
    const info = document.getElementById('caja-apertura-info');
    if (caja.abierta) {
      label.innerHTML = '<span class="badge badge-completed">Abierta</span>';
      info.textContent = caja.desde
        ? `Turno reabierto a las ${caja.desde} con ${window.formatMoney(caja.apertura)}`
        : `Apertura del día: ${window.formatMoney(caja.apertura)}`;
    } else {
      label.innerHTML = '<span class="badge badge-canceled">Cerrada</span>';
      info.textContent = caja.cierre
        ? 'Caja cerrada a las ' + caja.cierre.hora + ' por ' + (caja.cierre.usuario || 'recepción') + '.'
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

    // El fondo de apertura no deja de existir porque se cierre el turno: con
    // `caja.abierta ? apertura : 0` la métrica caía de L 1,700.00 a L 1,200.00
    // sin que se moviera un lempira, y si la recepcionista reabría declarando
    // lo que había contado, el mismo fondo se sumaba dos veces.
    const efectivoEnCaja = (caja.apertura || 0) + efectivoNeto;

    document.getElementById('caja-ingresos').textContent = window.formatMoney(ingresos);
    document.getElementById('caja-gastos').textContent = window.formatMoney(gastos);
    document.getElementById('caja-anulaciones').textContent = window.formatMoney(anulaciones);
    document.getElementById('caja-efectivo').textContent = window.formatMoney(efectivoEnCaja);

    document.getElementById('met-efectivo').textContent = window.formatMoney(porMetodo.Efectivo);
    document.getElementById('met-tarjeta').textContent = window.formatMoney(porMetodo.Tarjeta);
    document.getElementById('met-transferencia').textContent = window.formatMoney(porMetodo.Transferencia);

    return { efectivoEnCaja, ingresos, gastos, anulaciones, porMetodo };
  }

  // --- Arqueo de efectivo ---
  function renderArqueo(esperado) {
    const cont = document.getElementById('arqueo-content');
    const btn = document.getElementById('btn-arqueo');
    if (btn) btn.disabled = !caja.abierta;

    if (!caja.arqueo) {
      cont.innerHTML = `
        <div class="record-empty">
          <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M16 2v4M8 2v4M3 10h18"></path></svg>
          <div class="record-empty-title">Arqueo no realizado</div>
          <div class="record-empty-desc">${caja.abierta
            ? 'Registre el conteo físico de efectivo para compararlo con el saldo del sistema.'
            : 'Abra la caja para poder registrar el conteo físico de efectivo.'}</div>
        </div>`;
      return;
    }

    // El resultado se calcula contra el efectivo que el sistema espera AHORA,
    // no contra el que esperaba en el momento del conteo: la tarjeta seguía
    // diciendo "Caja cuadrada" después de registrar un gasto, contradiciendo
    // al "Efectivo en caja" que tenía al lado en la misma pantalla.
    const esperadoAhora = typeof esperado === 'number' ? esperado : caja.arqueo.esperado;
    const dif = caja.arqueo.contado - esperadoAhora;
    const cuadra = Math.abs(dif) < 0.01;
    const desactualizado = Math.abs(esperadoAhora - caja.arqueo.esperado) >= 0.01;
    const color = cuadra ? 'var(--color-green-text)' : (dif > 0 ? 'var(--color-amber-text)' : 'var(--color-red-text)');
    const etiqueta = cuadra ? 'Caja cuadrada' : (dif > 0 ? 'Sobrante' : 'Faltante');
    cont.innerHTML = `
      <div class="record-field-grid">
        <div><div class="record-field-label">Efectivo esperado</div><div class="record-field-value">${window.formatMoney(esperadoAhora)}</div></div>
        <div><div class="record-field-label">Efectivo contado</div><div class="record-field-value">${window.formatMoney(caja.arqueo.contado)}</div></div>
        <div><div class="record-field-label">Diferencia</div><div class="record-field-value" style="color: ${color};">${dif > 0 ? '+' : ''}${window.formatMoney(dif)}</div></div>
        <div><div class="record-field-label">Resultado</div><div class="record-field-value"><span class="badge ${cuadra ? 'badge-completed' : 'badge-pending'}">${etiqueta}</span></div></div>
      </div>
      <p class="form-hint" style="margin-top: 12px;">Conteo registrado a las ${caja.arqueo.hora} por ${window.escapeHtml(caja.arqueo.usuario || 'recepción')}.</p>
      ${desactualizado ? `<p class="form-hint" style="margin-top: 6px; color: var(--color-amber-text); font-weight: 600;">Arqueo desactualizado: hubo movimientos después del conteo. En ese momento se esperaban ${window.formatMoney(caja.arqueo.esperado)}. Vuelva a contar el efectivo.</p>` : ''}`;
  }

  function renderMovimientos(movs) {
    const tbody = document.getElementById('movimientos-body');
    if (movs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="table-empty-cell">Sin movimientos registrados hoy. Los abonos cobrados en Cobranzas aparecen aquí automáticamente.</td></tr>';
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
      const color = m.tipo === 'ingreso' ? 'var(--color-green-text)' : 'var(--color-red-text)';
      return `
        <tr>
          <td>${m.hora || '—'}</td>
          <td><span class="badge ${cls}">${txt}</span></td>
          <td>${window.escapeHtml(m.concepto)} ${m.origen === 'Cobranzas' ? '<span class="tag">Cobranzas</span>' : ''}</td>
          <td>${m.metodo}</td>
          <td class="num" style="font-weight: 700; color: ${color};">${signo}${window.formatMoney(m.monto)}</td>
        </tr>
      `;
    }).join('');
  }

  function renderAll() {
    const movs = gatherMovements();
    renderEstado();
    const resumen = renderSummary(movs);
    renderMovimientos(movs);
    renderArqueo(resumen.efectivoEnCaja);
    return resumen;
  }

  // --- Acciones ---
  const usuarioActual = () => {
    const u = window.auth && window.auth.getCurrentUser ? window.auth.getCurrentUser() : null;
    return u ? (u.name || u.username) : 'recepción';
  };

  document.getElementById('btn-abrir-caja').addEventListener('click', async function() {
    const val = await window.pedirDato('Monto de apertura', {
      titulo: 'Abrir caja del día',
      etiqueta: 'Efectivo inicial en caja (L)',
      tipo: 'number',
      valor: '0',
      textoConfirmar: 'Abrir caja',
      ayuda: 'Es el fondo con el que inicia el día. Se usa como base para el arqueo.'
    });
    if (val === null) return;
    // Reapertura: si hoy ya hubo un cierre, el turno nuevo arranca en este
    // instante y solo cuenta lo que pase de aquí en adelante. La primera
    // apertura del día no lleva sello y cuenta el día entero.
    const reapertura = !!caja.cierre;
    caja = {
      fecha: todayStr,
      abierta: true,
      apertura: parseFloat(val) || 0,
      arqueo: null,
      desde: reapertura ? new Date().toTimeString().slice(0, 5) : null
    };
    writeCaja(caja);
    renderAll();
    window.showToast(
      (reapertura ? 'Turno reabierto con ' : 'Caja abierta con ') + window.formatMoney(caja.apertura) +
      (reapertura ? ': se contabilizan los movimientos a partir de las ' + caja.desde + '.' : ''),
      'success');
  });

  const btnArqueo = document.getElementById('btn-arqueo');
  if (btnArqueo) {
    btnArqueo.addEventListener('click', async function() {
      if (!caja.abierta) {
        window.showToast('Abra la caja antes de registrar el arqueo.', 'warning');
        return;
      }
      const esperado = renderAll().efectivoEnCaja;
      const val = await window.pedirDato('Efectivo contado', {
        titulo: 'Arqueo de efectivo',
        etiqueta: 'Efectivo contado físicamente (L)',
        tipo: 'number',
        valor: esperado.toFixed(2),
        textoConfirmar: 'Registrar arqueo',
        ayuda: 'El sistema espera ' + window.formatMoney(esperado) + ' en efectivo.'
      });
      if (val === null) return;
      caja.arqueo = {
        esperado: esperado,
        contado: parseFloat(val) || 0,
        hora: new Date().toTimeString().slice(0, 5),
        usuario: usuarioActual()
      };
      writeCaja(caja);
      renderAll();
      const dif = caja.arqueo.contado - caja.arqueo.esperado;
      window.showToast(Math.abs(dif) < 0.01
        ? 'Arqueo registrado: la caja cuadra.'
        : 'Arqueo registrado: diferencia de ' + window.formatMoney(dif) + '.',
        Math.abs(dif) < 0.01 ? 'success' : 'warning');
    });
  }

  document.getElementById('btn-cerrar-caja').addEventListener('click', async function() {
    if (!caja.abierta) return;
    const ok = await window.confirmarAccion(
      'No se podrán registrar más movimientos hasta la próxima apertura.',
      { titulo: '¿Cerrar la caja del día?', textoConfirmar: 'Cerrar caja', peligroso: true }
    );
    if (!ok) return;
    caja.abierta = false;
    caja.cierre = { hora: new Date().toTimeString().slice(0, 5), usuario: usuarioActual() };
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
    const list = readAllMovs();
    list.push(mov);
    writeMovs(list);
    movementModal.classList.remove('active');
    renderAll();
    window.showToast('Movimiento registrado', 'success');
  });

  // Inicializar
  renderAll();
});
