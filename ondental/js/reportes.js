/* ==========================================================================
   REPORTES.JS - ESQUELETO DE REPORTERÍA
   Indicadores calculados sobre datos locales (db). Filtros por rango de fechas,
   odontólogo y estado. Gráficas simples con barras CSS (sin librerías).
   La exportación CSV/PDF es placeholder; no genera archivos reales todavía.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function() {
  if (window.auth) window.auth.checkSession();

  const fmt = window.formatMoney;

  // --- Filtros ---
  const fromEl = document.getElementById('rep-from');
  const toEl = document.getElementById('rep-to');
  const dentistEl = document.getElementById('rep-dentist');
  const statusEl = document.getElementById('rep-status');

  // Rango por defecto: mes actual
  const now = new Date();
  fromEl.value = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  toEl.value = now.toISOString().split('T')[0];

  // Poblar odontólogos
  window.db.getDentists().forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = d.name;
    dentistEl.appendChild(opt);
  });

  // --- Helpers ---
  function tsFromId(id) {
    const m = String(id || '').match(/(\d{10,})/);
    return m ? parseInt(m[1], 10) : null;
  }
  function dateInRange(dateStr, from, to) {
    if (!dateStr) return false;
    return dateStr >= from && dateStr <= to;
  }
  function budgetDate(b) {
    const ts = tsFromId(b.id);
    return ts ? new Date(ts).toISOString().split('T')[0] : null;
  }
  function budgetTotal(b) {
    const subtotal = b.treatments.reduce((a, t) => a + (t.price * t.qty), 0);
    return subtotal * (1 - (b.discount || 0) / 100);
  }
  function budgetPaid(b) {
    return window.db.getPayments(b.id).reduce((a, p) => a + parseFloat(p.amount || 0), 0);
  }

  function renderBars(containerId, items) {
    const max = Math.max(...items.map(i => i.value), 1);
    const total = items.reduce((a, i) => a + i.value, 0);
    document.getElementById(containerId).innerHTML = items.map(i => `
      <div style="margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 4px;">
          <span style="color: var(--text-primary); font-weight: 500;">${i.label}</span>
          <span style="color: var(--color-gray);">${i.value}${total ? ' · ' + Math.round((i.value / total) * 100) + '%' : ''}</span>
        </div>
        <div class="commission-bar"><div class="commission-bar-fill" style="width: ${(i.value / max) * 100}%; background: ${i.color};"></div></div>
      </div>
    `).join('');
  }

  // --- Reporte principal ---
  function buildReport() {
    const from = fromEl.value;
    const to = toEl.value;
    const dentistId = dentistEl.value;
    const status = statusEl.value;

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
    const nuevos = patients.filter(p => {
      const ts = tsFromId(p.id);
      if (!ts) return false;
      return dateInRange(new Date(ts).toISOString().split('T')[0], from, to);
    }).length;

    // KPIs
    const ventas = acceptedInRange.reduce((a, b) => a + budgetTotal(b), 0);
    let cobranza = 0;
    allBudgets.filter(b => matchDentist(b.dentistId) && b.status === 'accepted')
      .forEach(b => { cobranza += Math.max(budgetTotal(b) - budgetPaid(b), 0); });

    document.getElementById('rep-ventas').textContent = fmt(ventas);
    document.getElementById('rep-nuevos').textContent = nuevos;
    document.getElementById('rep-citas').textContent = apptsFiltered.length;
    document.getElementById('rep-cobranza').textContent = fmt(cobranza);

    // Citas por estado (sobre el rango/odontólogo, sin filtro de estado)
    const estados = { pending: 0, confirmed: 0, completed: 0, canceled: 0 };
    appts.forEach(a => { if (estados[a.status] !== undefined) estados[a.status]++; });
    renderBars('rep-citas-estado', [
      { label: 'Pendientes', value: estados.pending, color: 'var(--color-amber)' },
      { label: 'Confirmadas', value: estados.confirmed, color: 'var(--color-blue-mid)' },
      { label: 'Completadas', value: estados.completed, color: 'var(--color-green)' },
      { label: 'Canceladas', value: estados.canceled, color: 'var(--color-red)' }
    ]);

    // Presupuestos por estado
    const pe = { draft: 0, accepted: 0, rejected: 0 };
    budgetsInRange.forEach(b => { if (pe[b.status] !== undefined) pe[b.status]++; });
    renderBars('rep-presupuestos', [
      { label: 'Aceptados', value: pe.accepted, color: 'var(--color-green)' },
      { label: 'Borrador / pendientes', value: pe.draft, color: 'var(--color-amber)' },
      { label: 'Rechazados', value: pe.rejected, color: 'var(--color-red)' }
    ]);

    // Tratamientos más vendidos
    const treatMap = {};
    acceptedInRange.forEach(b => {
      b.treatments.forEach(t => {
        if (!treatMap[t.name]) treatMap[t.name] = { qty: 0, revenue: 0 };
        treatMap[t.name].qty += t.qty;
        treatMap[t.name].revenue += t.price * t.qty;
      });
    });
    const treatRows = Object.entries(treatMap).sort((a, b) => b[1].qty - a[1].qty).slice(0, 8);
    const treatBody = document.getElementById('rep-tratamientos');
    treatBody.innerHTML = treatRows.length === 0
      ? '<tr><td colspan="3" style="text-align:center; color: var(--color-gray); padding: 22px;">Sin tratamientos vendidos en el periodo.</td></tr>'
      : treatRows.map(([name, v]) => `
        <tr><td style="font-weight:600;">${name}</td><td style="text-align:right;">${v.qty}</td><td style="text-align:right; font-weight:600;">${fmt(v.revenue)}</td></tr>
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
      ? '<tr><td colspan="4" style="text-align:center; color: var(--color-gray); padding: 22px;">Sin presupuestos aceptados en el periodo.</td></tr>'
      : prodRows.map(r => `
        <tr><td style="font-weight:600;">${r.name}</td><td><span class="tag">${r.specialty}</span></td><td style="text-align:right;">${r.count}</td><td style="text-align:right; font-weight:600;">${fmt(r.total)}</td></tr>
      `).join('');

    // Caja de hoy
    const todayStr = now.toISOString().split('T')[0];
    const budgetIds = new Set(allBudgets.map(b => b.id));
    const paysToday = window.db.getPayments().filter(p => budgetIds.has(p.budgetId) && p.date === todayStr);
    document.getElementById('rep-caja-hoy').textContent = fmt(paysToday.reduce((a, p) => a + parseFloat(p.amount || 0), 0));
    document.getElementById('rep-caja-count').textContent = paysToday.length;
  }

  // --- Eventos ---
  document.getElementById('rep-apply').addEventListener('click', buildReport);

  const exportNote = () => window.showToast('La exportación estará disponible próximamente.', 'info');
  document.getElementById('export-csv-btn').addEventListener('click', exportNote);
  document.getElementById('export-pdf-btn').addEventListener('click', exportNote);

  buildReport();
});
