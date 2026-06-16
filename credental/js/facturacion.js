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

  // Valores por defecto (esqueleto de ejemplo, contexto hondureño)
  const defaultFiscal = {
    rtn: '08019995123456',
    nombreLegal: 'Credental Clínica Dental S. de R.L.',
    direccionFiscal: 'Col. Palmira, Ave. República de Argentina, Tegucigalpa, Honduras',
    telefono: '+504 2234-5678',
    correo: 'facturacion@credental.hn'
  };
  const defaultCai = {
    cai: 'A1B2C3-D4E5F6-7890AB-CDEF12-3456GH-78',
    rangoInicial: '000-001-01-00000001',
    rangoFinal: '000-001-01-00001000',
    correlativo: '000-001-01-00000247',
    fechaLimite: '2026-12-31',
    estado: 'activo'
  };

  // Documentos emitidos (datos de ejemplo para mostrar la estructura)
  const mockDocs = [
    { tipo: 'Factura', num: '000-001-01-00000247', fecha: '2026-06-03', cliente: 'María López', total: 2500, estado: 'Emitida', estadoCls: 'badge-completed', cfe: 'Pendiente' },
    { tipo: 'Factura', num: '000-001-01-00000246', fecha: '2026-06-02', cliente: 'Carlos Banegas', total: 1800, estado: 'Emitida', estadoCls: 'badge-completed', cfe: 'Pendiente' },
    { tipo: 'Recibo interno', num: 'REC-000312', fecha: '2026-06-02', cliente: 'Ana Discua', total: 900, estado: 'Registrado', estadoCls: 'badge-confirmed', cfe: 'No aplica' },
    { tipo: 'Nota de crédito', num: '—', fecha: '—', cliente: '—', total: null, estado: 'Placeholder', estadoCls: 'badge-pending', cfe: '—' },
    { tipo: 'Anulación', num: '—', fecha: '—', cliente: '—', total: null, estado: 'Placeholder', estadoCls: 'badge-pending', cfe: '—' }
  ];

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

  function renderDocs() {
    const tbody = document.getElementById('fiscal-docs-body');
    tbody.innerHTML = mockDocs.map(d => {
      const isPlaceholder = d.estado === 'Placeholder';
      const totalTxt = (d.total === null) ? '—' : window.formatMoney(d.total);
      const rowStyle = isPlaceholder ? ' style="color: var(--color-gray);"' : '';
      return `
        <tr${rowStyle}>
          <td style="font-weight: 600;">${d.tipo}</td>
          <td>${d.num}</td>
          <td>${d.fecha}</td>
          <td>${d.cliente}</td>
          <td style="text-align: right; font-weight: 600;">${totalTxt}</td>
          <td><span class="badge ${d.estadoCls}">${d.estado === 'Placeholder' ? 'Placeholder' : d.estado}</span></td>
          <td><span class="tag">${d.cfe}</span></td>
        </tr>
      `;
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

  document.getElementById('emit-doc-btn').addEventListener('click', function() {
    window.showToast('La emisión fiscal estará disponible al integrar el autoimpresor / SAR.', 'info');
  });

  // Inicializar
  fillForms();
  renderAll();
});
