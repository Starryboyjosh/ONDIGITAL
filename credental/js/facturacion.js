/* ==========================================================================
   FACTURACION.JS - ESQUELETO DE FACTURACIÓN HONDURAS
   Estructura visual y de datos inicial: datos fiscales, rango CAI, documentos
   emitidos (datos de ejemplo) y preparación para CFE/CAEE.
   NO integra SAR, no genera XML real y no implementa firma electrónica.
   Persistencia local (localStorage) por empresa; no toca el storage clínico.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function() {
  if (window.auth) window.auth.checkSession();

  const company = window.auth ? window.auth.getCurrentCompany() : null;
  const companyId = company ? company.id : 'default';
  const FISCAL_KEY = 'credental_fiscal_' + companyId;
  const CAI_KEY = 'credental_cai_' + companyId;
  const DOCS_KEY = 'credental_docs_' + companyId;

  // Valores por defecto (esqueleto de ejemplo, contexto hondureño)
  const defaultFiscal = {
    rtn: '08019995123456',
    nombreLegal: 'CREDental Clínica Dental',
    direccionFiscal: 'Barrio Río Piedras, 26-29 avenida, 4 calle, San Pedro Sula, Cortés',
    telefono: '+504 3243-3050',
    correo: 'contacto@credentalhn.com'
  };
  const defaultCai = {
    cai: 'A1B2C3-D4E5F6-7890AB-CDEF12-3456GH-78',
    rangoInicial: '000-001-01-00000001',
    rangoFinal: '000-001-01-00001000',
    correlativo: '000-001-01-00000247',
    fechaLimite: '2026-12-31',
    estado: 'activo'
  };

  // --- Persistencia local ---
  function readConfig(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? Object.assign({}, fallback, JSON.parse(raw)) : Object.assign({}, fallback);
    } catch (e) {
      return Object.assign({}, fallback);
    }
  }
  function writeConfig(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  let fiscal = readConfig(FISCAL_KEY, defaultFiscal);
  let cai = readConfig(CAI_KEY, defaultCai);

  // --- Helpers de rango / fechas ---
  function correlativoNum(s) {
    const m = String(s || '').match(/(\d+)\s*$/);
    return m ? parseInt(m[1], 10) : 0;
  }

  function fmtDate(s) {
    if (!s) return '—';
    const d = new Date(s + 'T00:00:00');
    if (isNaN(d.getTime())) return s;
    return d.toLocaleDateString('es-HN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function rangeInfo() {
    const actual = correlativoNum(cai.correlativo);
    const final = correlativoNum(cai.rangoFinal);
    const restantes = Math.max(final - actual, 0);
    let dias = null;
    if (cai.fechaLimite) {
      const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
      const limite = new Date(cai.fechaLimite + 'T00:00:00');
      if (!isNaN(limite.getTime())) dias = Math.ceil((limite - hoy) / 86400000);
    }
    return { restantes, dias };
  }

  const estadoBadge = {
    activo: ['badge-completed', 'Activo'],
    porvencer: ['badge-pending', 'Por vencer'],
    vencido: ['badge-canceled', 'Vencido'],
    cerrado: ['badge-confirmed', 'Cerrado']
  };

  // --- Render ---
  function renderStatusCards() {
    const { restantes } = rangeInfo();
    const [cls, txt] = estadoBadge[cai.estado] || ['badge-pending', cai.estado || '—'];
    document.getElementById('fiscal-estado').innerHTML = `<span class="badge ${cls}">${txt}</span>`;
    document.getElementById('fiscal-correlativo').textContent = cai.correlativo || '—';
    document.getElementById('fiscal-restantes').textContent = `${restantes} folios`;
    document.getElementById('fiscal-fechalimite').textContent = fmtDate(cai.fechaLimite);
    document.getElementById('fiscal-cai-tag').textContent = 'CAI ' + (cai.cai ? cai.cai.slice(0, 13) + '…' : '—');
  }

  function renderAlerts() {
    const box = document.getElementById('fiscal-alerts');
    const { restantes, dias } = rangeInfo();
    const alerts = [];

    if (cai.estado === 'vencido' || (dias !== null && dias < 0) || restantes <= 0) {
      alerts.push({ level: 'danger', html: 'El rango CAI está agotado o vencido. Solicite un nuevo CAI antes de emitir documentos.' });
    }
    if (restantes > 0 && restantes <= 50) {
      alerts.push({ level: 'warn', html: `Quedan <strong>${restantes}</strong> folios en el rango autorizado.` });
    }
    if (dias !== null && dias >= 0 && dias <= 30) {
      alerts.push({ level: 'warn', html: `El rango CAI vence el <strong>${fmtDate(cai.fechaLimite)}</strong> (en ${dias} día(s)).` });
    }

    if (alerts.length === 0) {
      box.innerHTML = '<div class="dashboard-empty">El rango fiscal está vigente y con folios disponibles.</div>';
      return;
    }
    box.innerHTML = alerts.map(a => `
      <div class="alert-item ${a.level}">
        <span class="alert-dot"></span>
        <span class="alert-text">${a.html}</span>
      </div>
    `).join('');
  }

  // --- Documentos ---
  // La tabla no inventa cifras: los recibos salen de los abonos reales que se
  // registran en Cobranzas (los mismos que cuadran la Caja) y las facturas son
  // las que se emiten desde este módulo, guardadas por empresa.
  function documentosEmitidos() {
    try {
      const raw = localStorage.getItem(DOCS_KEY);
      const lista = raw ? JSON.parse(raw) : [];
      return Array.isArray(lista) ? lista : [];
    } catch (e) {
      return [];
    }
  }

  function guardarDocumentos(lista) {
    localStorage.setItem(DOCS_KEY, JSON.stringify(lista));
  }

  function nombrePaciente(patientId) {
    const p = window.db.getPatient(patientId);
    return p ? p.name : 'Paciente dado de baja';
  }

  function recibosDeAbonos() {
    const budgets = window.db.getBudgets();
    const porId = {};
    budgets.forEach(b => { porId[b.id] = b; });

    return window.db.getPayments()
      .slice()
      .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))
      .map((p, i) => {
        const budget = porId[p.budgetId];
        return {
          tipo: 'Recibo de pago',
          num: 'REC-' + String(i + 1).padStart(6, '0'),
          fecha: p.date,
          cliente: budget ? nombrePaciente(budget.patientId) : '—',
          referencia: budget ? window.folioPresupuesto(budget) : '—',
          total: p.amount,
          estado: 'Registrado',
          estadoCls: 'badge-confirmed',
          cfe: 'No aplica'
        };
      });
  }

  function todosLosDocumentos() {
    return recibosDeAbonos()
      .concat(documentosEmitidos())
      .sort((a, b) => String(b.fecha || '').localeCompare(String(a.fecha || '')));
  }

  function renderDocs() {
    const tbody = document.getElementById('fiscal-docs-body');
    const docs = todosLosDocumentos().slice(0, 15);

    if (docs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="table-empty-cell">Todavía no hay documentos. Los recibos aparecen al registrar abonos en Cobranzas.</td></tr>';
      return;
    }

    tbody.innerHTML = docs.map(d => {
      const totalTxt = (d.total === null || d.total === undefined) ? '—' : window.formatMoney(d.total);
      const ref = d.referencia
        ? '<div class="cell-sub">' + window.escapeHtml(d.referencia) + '</div>'
        : '';
      return '<tr>' +
        '<td style="font-weight: 600;">' + window.escapeHtml(d.tipo) + ref + '</td>' +
        '<td>' + window.escapeHtml(d.num) + '</td>' +
        '<td>' + fmtDate(d.fecha) + '</td>' +
        '<td>' + window.escapeHtml(d.cliente) + '</td>' +
        '<td class="num">' + totalTxt + '</td>' +
        '<td><span class="badge ' + d.estadoCls + '">' + window.escapeHtml(d.estado) + '</span></td>' +
        '<td><span class="tag">' + window.escapeHtml(d.cfe) + '</span></td>' +
        '</tr>';
    }).join('');
  }

  function renderAll() {
    renderStatusCards();
    renderAlerts();
    renderDocs();
  }

  // --- Poblar formularios ---
  function fillForms() {
    document.getElementById('fiscal-rtn').value = fiscal.rtn || '';
    document.getElementById('fiscal-nombre-legal').value = fiscal.nombreLegal || '';
    document.getElementById('fiscal-direccion').value = fiscal.direccionFiscal || '';
    document.getElementById('fiscal-telefono').value = fiscal.telefono || '';
    document.getElementById('fiscal-correo').value = fiscal.correo || '';

    document.getElementById('cai-codigo').value = cai.cai || '';
    document.getElementById('cai-rango-inicial').value = cai.rangoInicial || '';
    document.getElementById('cai-rango-final').value = cai.rangoFinal || '';
    document.getElementById('cai-correlativo').value = cai.correlativo || '';
    document.getElementById('cai-fecha-limite').value = cai.fechaLimite || '';
    document.getElementById('cai-estado').value = cai.estado || 'activo';
  }

  // --- Eventos ---
  document.getElementById('fiscal-data-form').addEventListener('submit', function(e) {
    e.preventDefault();
    fiscal = {
      rtn: document.getElementById('fiscal-rtn').value.trim(),
      nombreLegal: document.getElementById('fiscal-nombre-legal').value.trim(),
      direccionFiscal: document.getElementById('fiscal-direccion').value.trim(),
      telefono: document.getElementById('fiscal-telefono').value.trim(),
      correo: document.getElementById('fiscal-correo').value.trim()
    };
    writeConfig(FISCAL_KEY, fiscal);
    window.showToast('Datos fiscales guardados', 'success');
  });

  document.getElementById('cai-form').addEventListener('submit', function(e) {
    e.preventDefault();
    cai = {
      cai: document.getElementById('cai-codigo').value.trim(),
      rangoInicial: document.getElementById('cai-rango-inicial').value.trim(),
      rangoFinal: document.getElementById('cai-rango-final').value.trim(),
      correlativo: document.getElementById('cai-correlativo').value.trim(),
      fechaLimite: document.getElementById('cai-fecha-limite').value,
      estado: document.getElementById('cai-estado').value
    };
    writeConfig(CAI_KEY, cai);
    renderAll();
    window.showToast('Configuración CAI actualizada', 'success');
  });

  // --- Emisión de documentos ---
  const emitModal = document.getElementById('emit-modal');
  const emitTipo = document.getElementById('emit-tipo');
  const emitPresupuesto = document.getElementById('emit-presupuesto');
  const emitDetalle = document.getElementById('emit-detalle');
  const emitMonto = document.getElementById('emit-monto');
  const emitNumero = document.getElementById('emit-numero');

  window.setupModalClosers(emitModal, document.getElementById('emit-modal-close'));

  function totalPresupuesto(b) {
    const bruto = (b.treatments || []).reduce((acc, t) => acc + (t.price || 0) * (t.qty || 1), 0);
    return bruto - bruto * ((b.discount || 0) / 100);
  }

  function saldoPresupuesto(b) {
    const pagado = window.db.getPayments(b.id).reduce((acc, p) => acc + (p.amount || 0), 0);
    return Math.max(totalPresupuesto(b) - pagado, 0);
  }

  // Siguiente número del rango CAI, sin pasarse del rango final autorizado.
  function siguienteNumero() {
    const partes = String(cai.correlativo || '').split('-');
    const actual = correlativoNum(cai.correlativo);
    const ancho = partes.length ? partes[partes.length - 1].length : 8;
    partes[partes.length - 1] = String(actual + 1).padStart(ancho, '0');
    return partes.join('-');
  }

  function llenarPresupuestos() {
    const budgets = window.db.getBudgets();
    emitPresupuesto.innerHTML = '';
    if (budgets.length === 0) {
      emitPresupuesto.innerHTML = '<option value="">No hay presupuestos registrados</option>';
      return;
    }
    budgets.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = window.folioPresupuesto(b) + ' · ' + nombrePaciente(b.patientId);
      emitPresupuesto.appendChild(opt);
    });
  }

  function refrescarDetalle() {
    const budget = window.db.getBudgets().find(b => b.id === emitPresupuesto.value);
    if (!budget) {
      emitDetalle.textContent = '—';
      emitMonto.value = '';
      return;
    }
    const total = totalPresupuesto(budget);
    const saldo = saldoPresupuesto(budget);
    emitDetalle.textContent = 'Total ' + window.formatMoney(total) + ' · saldo pendiente ' + window.formatMoney(saldo);
    emitMonto.value = (saldo > 0 ? saldo : total).toFixed(2);
  }

  emitPresupuesto.addEventListener('change', refrescarDetalle);

  document.getElementById('emit-doc-btn').addEventListener('click', function() {
    const { restantes } = rangeInfo();
    if (restantes <= 0) {
      window.showToast('El rango CAI no tiene folios disponibles. Actualice la autorización antes de emitir.', 'warning');
      return;
    }
    llenarPresupuestos();
    refrescarDetalle();
    emitNumero.value = siguienteNumero();
    emitModal.classList.add('active');
  });

  document.getElementById('emit-form').addEventListener('submit', function(e) {
    e.preventDefault();
    const budget = window.db.getBudgets().find(b => b.id === emitPresupuesto.value);
    const monto = parseFloat(emitMonto.value);
    if (!budget) {
      window.showToast('Seleccione un presupuesto.', 'warning');
      return;
    }
    if (!monto || monto <= 0) {
      window.showToast('Indique el monto a documentar.', 'warning');
      return;
    }

    const esNota = emitTipo.value.indexOf('Nota') === 0;
    const numero = siguienteNumero();
    const docs = documentosEmitidos();
    docs.push({
      tipo: emitTipo.value,
      num: numero,
      fecha: window.todayISO(),
      cliente: nombrePaciente(budget.patientId),
      referencia: window.folioPresupuesto(budget),
      total: monto,
      estado: esNota ? 'Nota emitida' : 'Emitida',
      estadoCls: esNota ? 'badge-pending' : 'badge-completed',
      cfe: 'Pendiente'
    });
    guardarDocumentos(docs);

    // Consumir el folio del rango autorizado.
    cai.correlativo = numero;
    writeConfig(CAI_KEY, cai);

    emitModal.classList.remove('active');
    fillForms();
    renderAll();
    window.showToast(emitTipo.value + ' ' + numero + ' emitida en modo demostración', 'success');
  });

  // Inicializar
  fillForms();
  renderAll();
});
