/* ==========================================================================
   REPORTES.JS — INDICADORES DE GESTIÓN
   Calcula los indicadores sobre los datos reales de la clínica (window.db):
   presupuestos por su fecha de emisión, citas por su fecha de agenda,
   pacientes por su fecha de alta y abonos por su fecha de pago.
   Las gráficas son barras CSS (sin librerías). La exportación CSV se genera
   en el navegador y el PDF usa el diálogo de impresión del sistema.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function() {
  if (window.auth) window.auth.checkSession();

  const fmt = window.formatMoney;
  const fechaEs = window.formatDateEs;

  // --- Filtros ---
  const fromEl = document.getElementById('rep-from');
  const toEl = document.getElementById('rep-to');
  const dentistEl = document.getElementById('rep-dentist');
  const statusEl = document.getElementById('rep-status');

  // Rango por defecto: últimos 30 días. Se prefiere al "mes en curso" porque
  // los primeros días del mes dejarían el reporte casi vacío.
  fromEl.value = window.addDaysISO(-29);
  toEl.value = window.todayISO();

  // Poblar odontólogos
  window.db.getDentists().forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = d.name;
    dentistEl.appendChild(opt);
  });

  // --- Helpers ---
  // Respaldo para registros antiguos sin fecha explícita: el id incluye el
  // timestamp de creación (pat_1717171717171).
  function tsFromId(id) {
    const m = String(id || '').match(/(\d{10,})/);
    return m ? parseInt(m[1], 10) : null;
  }
  function fechaDeId(id) {
    const ts = tsFromId(id);
    return ts ? window.localDateISO(new Date(ts)) : null;
  }
  function dateInRange(dateStr, from, to) {
    if (!dateStr) return false;
    return dateStr >= from && dateStr <= to;
  }
  function budgetDate(b) {
    return b.date || fechaDeId(b.id);
  }
  function patientDate(p) {
    return p.createdAt || fechaDeId(p.id);
  }
  function budgetTotal(b) {
    const subtotal = (b.treatments || []).reduce((a, t) => a + (t.price * t.qty), 0);
    return subtotal * (1 - (b.discount || 0) / 100);
  }
  function budgetPaid(b) {
    return window.db.getPayments(b.id).reduce((a, p) => a + parseFloat(p.amount || 0), 0);
  }

  function renderBars(containerId, items) {
    const max = Math.max(...items.map(i => i.value), 1);
    const total = items.reduce((a, i) => a + i.value, 0);
    document.getElementById(containerId).innerHTML = items.map(i => `
      <div class="report-bar-row">
        <div class="report-bar-head">
          <span class="report-bar-label">${i.label}</span>
          <span class="report-bar-value">${i.value}${total ? ' · ' + Math.round((i.value / total) * 100) + '%' : ''}</span>
        </div>
        <div class="commission-bar"><div class="commission-bar-fill" style="width: ${(i.value / max) * 100}%; background: ${i.color};"></div></div>
      </div>
    `).join('');
  }

  // Última corrida del reporte: alimenta la exportación sin recalcular.
  let ultimo = null;

  // --- Reporte principal ---
  function buildReport() {
    const from = fromEl.value;
    const to = toEl.value;
    const dentistId = dentistEl.value;
    const status = statusEl.value;

    if (from && to && from > to) {
      window.showToast('La fecha inicial no puede ser posterior a la final.', 'error');
      return;
    }

    const matchDentist = (id) => dentistId === 'all' || id === dentistId;

    const allBudgets = window.db.getBudgets();
    const budgetsInRange = allBudgets.filter(b => matchDentist(b.dentistId) && dateInRange(budgetDate(b), from, to));
    const acceptedInRange = budgetsInRange.filter(b => b.status === 'accepted');

    const appts = window.db.getAppointments().filter(a => {
      const d = (a.dateTime || '').split('T')[0];
      return matchDentist(a.dentistId) && dateInRange(d, from, to);
    });
    const apptsFiltered = status === 'all' ? appts : appts.filter(a => a.status === status);

    const patients = window.db.getPatients();
    const nuevos = patients.filter(p => dateInRange(patientDate(p), from, to)).length;

    // Abonos recibidos dentro del periodo (dinero que efectivamente entró).
    const budgetIds = new Set(allBudgets.filter(b => matchDentist(b.dentistId)).map(b => b.id));
    const pagosPeriodo = window.db.getPayments().filter(p => budgetIds.has(p.budgetId) && dateInRange(p.date, from, to));
    const cobrado = pagosPeriodo.reduce((a, p) => a + parseFloat(p.amount || 0), 0);

    // KPIs
    const ventas = acceptedInRange.reduce((a, b) => a + budgetTotal(b), 0);
    let cobranza = 0;
    allBudgets.filter(b => matchDentist(b.dentistId) && b.status === 'accepted')
      .forEach(b => { cobranza += Math.max(budgetTotal(b) - budgetPaid(b), 0); });

    document.getElementById('rep-ventas').textContent = fmt(ventas);
    document.getElementById('rep-nuevos').textContent = nuevos;
    document.getElementById('rep-citas').textContent = apptsFiltered.length;
    document.getElementById('rep-cobranza').textContent = fmt(cobranza);

    const cobradoEl = document.getElementById('rep-cobrado');
    if (cobradoEl) cobradoEl.textContent = fmt(cobrado);
    const cobradoCountEl = document.getElementById('rep-cobrado-count');
    if (cobradoCountEl) {
      cobradoCountEl.textContent = pagosPeriodo.length === 1
        ? '1 abono registrado'
        : pagosPeriodo.length + ' abonos registrados';
    }

    const rangoEl = document.getElementById('rep-rango');
    if (rangoEl) {
      rangoEl.textContent = 'Del ' + fechaEs(from) + ' al ' + fechaEs(to) +
        (dentistId === 'all' ? ' · Todos los odontólogos' : ' · ' + dentistEl.options[dentistEl.selectedIndex].textContent);
    }

    // Citas por estado (sobre el rango/odontólogo, sin filtro de estado)
    const estados = { pending: 0, confirmed: 0, completed: 0, canceled: 0 };
    appts.forEach(a => { if (estados[a.status] !== undefined) estados[a.status]++; });
    const barrasCitas = [
      { label: 'Pendientes', value: estados.pending, color: 'var(--color-amber)' },
      { label: 'Confirmadas', value: estados.confirmed, color: 'var(--ink-blue)' },
      { label: 'Completadas', value: estados.completed, color: 'var(--color-green)' },
      { label: 'Canceladas', value: estados.canceled, color: 'var(--color-red)' }
    ];
    renderBars('rep-citas-estado', barrasCitas);

    // Presupuestos por estado
    const pe = { draft: 0, accepted: 0, rejected: 0 };
    budgetsInRange.forEach(b => { if (pe[b.status] !== undefined) pe[b.status]++; });
    const barrasPresupuestos = [
      { label: 'Aceptados', value: pe.accepted, color: 'var(--color-green)' },
      { label: 'Borrador / pendientes', value: pe.draft, color: 'var(--color-amber)' },
      { label: 'Rechazados', value: pe.rejected, color: 'var(--color-red)' }
    ];
    renderBars('rep-presupuestos', barrasPresupuestos);

    // Tratamientos más vendidos
    const treatMap = {};
    acceptedInRange.forEach(b => {
      (b.treatments || []).forEach(t => {
        if (!treatMap[t.name]) treatMap[t.name] = { qty: 0, revenue: 0 };
        treatMap[t.name].qty += t.qty;
        treatMap[t.name].revenue += t.price * t.qty;
      });
    });
    const treatRows = Object.entries(treatMap).sort((a, b) => b[1].qty - a[1].qty).slice(0, 8);
    const treatBody = document.getElementById('rep-tratamientos');
    treatBody.innerHTML = treatRows.length === 0
      ? '<tr><td colspan="3" class="table-empty-cell">Sin tratamientos vendidos en el periodo seleccionado.</td></tr>'
      : treatRows.map(([name, v]) => `
        <tr><td style="font-weight:600;">${window.escapeHtml(name)}</td><td class="num">${v.qty}</td><td class="num" style="font-weight:600;">${fmt(v.revenue)}</td></tr>
      `).join('');

    // Productividad por odontólogo
    const prodMap = {};
    acceptedInRange.forEach(b => {
      const d = window.db.getDentist(b.dentistId);
      const key = b.dentistId || 'sin';
      if (!prodMap[key]) prodMap[key] = { name: d ? d.name : 'Sin asignar', specialty: d ? d.specialty : '—', count: 0, total: 0 };
      prodMap[key].count++;
      prodMap[key].total += budgetTotal(b);
    });
    const prodRows = Object.values(prodMap).sort((a, b) => b.total - a.total);
    const prodBody = document.getElementById('rep-productividad');
    prodBody.innerHTML = prodRows.length === 0
      ? '<tr><td colspan="4" class="table-empty-cell">Sin presupuestos aceptados en el periodo seleccionado.</td></tr>'
      : prodRows.map(r => `
        <tr><td style="font-weight:600;">${window.escapeHtml(r.name)}</td><td><span class="tag">${window.escapeHtml(r.specialty)}</span></td><td class="num">${r.count}</td><td class="num" style="font-weight:600;">${fmt(r.total)}</td></tr>
      `).join('');

    // Caja de hoy
    const todayStr = window.todayISO();
    const idsTodos = new Set(allBudgets.map(b => b.id));
    const paysToday = window.db.getPayments().filter(p => idsTodos.has(p.budgetId) && p.date === todayStr);
    document.getElementById('rep-caja-hoy').textContent = fmt(paysToday.reduce((a, p) => a + parseFloat(p.amount || 0), 0));
    document.getElementById('rep-caja-count').textContent = paysToday.length;

    ultimo = {
      from: from,
      to: to,
      odontologo: dentistId === 'all' ? 'Todos' : dentistEl.options[dentistEl.selectedIndex].textContent,
      kpis: [
        ['Ventas del periodo', fmt(ventas)],
        ['Cobrado en el periodo', fmt(cobrado)],
        ['Pacientes nuevos', nuevos],
        ['Citas del periodo', apptsFiltered.length],
        ['Cobranza pendiente', fmt(cobranza)]
      ],
      citas: barrasCitas.map(b => [b.label, b.value]),
      presupuestos: barrasPresupuestos.map(b => [b.label, b.value]),
      tratamientos: treatRows.map(([name, v]) => [name, v.qty, v.revenue.toFixed(2)]),
      productividad: prodRows.map(r => [r.name, r.specialty, r.count, r.total.toFixed(2)])
    };
  }

  // --- Exportación ---
  function nombreArchivo(ext) {
    return 'credental-reporte-' + (ultimo ? ultimo.from + '_' + ultimo.to : window.todayISO()) + '.' + ext;
  }

  function exportarCSV() {
    if (!ultimo) return;
    const filas = [];
    filas.push(['CREDental — Reporte de gestión']);
    filas.push(['Periodo', ultimo.from + ' a ' + ultimo.to]);
    filas.push(['Odontólogo', ultimo.odontologo]);
    filas.push(['Generado', window.formatDateLargaEs(window.todayISO())]);
    filas.push([]);
    filas.push(['Indicador', 'Valor']);
    ultimo.kpis.forEach(r => filas.push(r));
    filas.push([]);
    filas.push(['Citas por estado', 'Cantidad']);
    ultimo.citas.forEach(r => filas.push(r));
    filas.push([]);
    filas.push(['Presupuestos por estado', 'Cantidad']);
    ultimo.presupuestos.forEach(r => filas.push(r));
    filas.push([]);
    filas.push(['Tratamiento', 'Cantidad', 'Ingresos (HNL)']);
    if (ultimo.tratamientos.length === 0) filas.push(['Sin tratamientos vendidos en el periodo']);
    ultimo.tratamientos.forEach(r => filas.push(r));
    filas.push([]);
    filas.push(['Odontólogo', 'Especialidad', 'Presupuestos', 'Total generado (HNL)']);
    if (ultimo.productividad.length === 0) filas.push(['Sin presupuestos aceptados en el periodo']);
    ultimo.productividad.forEach(r => filas.push(r));

    window.descargarArchivo(nombreArchivo('csv'), window.filasACSV(filas), 'text/csv');
    window.showToast('Se descargó ' + nombreArchivo('csv'), 'success');
  }

  function exportarPDF() {
    if (!ultimo) return;
    // Sin librerías: se arma una hoja imprimible y se usa el diálogo del
    // sistema, donde el usuario elige "Guardar como PDF".
    const hoja = document.getElementById('rep-print-sheet');
    const tabla = (titulo, encabezados, filas) => `
      <h3>${titulo}</h3>
      <table>
        <thead><tr>${encabezados.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${filas.length === 0
          ? `<tr><td colspan="${encabezados.length}">Sin registros en el periodo.</td></tr>`
          : filas.map(f => `<tr>${f.map(c => `<td>${window.escapeHtml(c)}</td>`).join('')}</tr>`).join('')}
        </tbody>
      </table>`;

    hoja.innerHTML = `
      <div class="print-sheet-header">
        <h1>CREDental — Reporte de gestión</h1>
        <p>Del ${fechaEs(ultimo.from)} al ${fechaEs(ultimo.to)} · Odontólogo: ${window.escapeHtml(ultimo.odontologo)}</p>
        <p>Generado el ${window.formatDateLargaEs(window.todayISO())}</p>
      </div>
      ${tabla('Indicadores', ['Indicador', 'Valor'], ultimo.kpis)}
      ${tabla('Citas por estado', ['Estado', 'Cantidad'], ultimo.citas)}
      ${tabla('Presupuestos por estado', ['Estado', 'Cantidad'], ultimo.presupuestos)}
      ${tabla('Tratamientos más vendidos', ['Tratamiento', 'Cantidad', 'Ingresos'], ultimo.tratamientos.map(r => [r[0], r[1], fmt(r[2])]))}
      ${tabla('Productividad por odontólogo', ['Odontólogo', 'Especialidad', 'Presupuestos', 'Total generado'], ultimo.productividad.map(r => [r[0], r[1], r[2], fmt(r[3])]))}
    `;
    window.print();
  }

  // --- Eventos ---
  document.getElementById('rep-apply').addEventListener('click', buildReport);
  [fromEl, toEl, dentistEl, statusEl].forEach(el => el.addEventListener('change', buildReport));
  document.getElementById('export-csv-btn').addEventListener('click', exportarCSV);
  document.getElementById('export-pdf-btn').addEventListener('click', exportarPDF);

  buildReport();
});
