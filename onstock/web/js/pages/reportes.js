// Reportes: Estado de Resultados (Honduras), resumen mensual y exportaciones.
import { api } from '../api.js';
import { $, esc, money, num, qty, icons, toastErr, download, today } from '../ui.js';

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function rangeFor(preset) {
  const now = new Date();
  const y = now.getFullYear(), mo = now.getMonth();
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  switch (preset) {
    case 'mes': return [fmt(new Date(y, mo, 1)), today()];
    case 'mes-anterior': return [fmt(new Date(y, mo - 1, 1)), fmt(new Date(y, mo, 0))];
    case 'trimestre': return [fmt(new Date(y, mo - 2, 1)), today()];
    case 'anio': return [fmt(new Date(y, 0, 1)), today()];
    default: return [fmt(new Date(y, mo, 1)), today()];
  }
}

export async function render(page) {
  const [defFrom, defTo] = rangeFor('mes');
  const now = new Date();

  page.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Reportes</h1>
        <div class="sub">Estado de Resultados, resumen mensual y exportaciones</div>
      </div>
    </div>

    <div class="card mb">
      <h2>Estado de Resultados <span class="muted">formato Honduras · cifras netas de ISV</span></h2>
      <div class="toolbar">
        <select class="input" id="is-preset">
          <option value="mes">Mes actual</option>
          <option value="mes-anterior">Mes anterior</option>
          <option value="trimestre">Últimos 3 meses</option>
          <option value="anio">Este año</option>
          <option value="custom">Personalizado</option>
        </select>
        <input class="input" type="date" id="is-from" value="${defFrom}">
        <input class="input" type="date" id="is-to" value="${defTo}">
        <button class="btn btn-primary btn-sm" id="is-go">Generar</button>
        <div class="spacer"></div>
        <button class="btn btn-outline btn-sm" id="is-xlsx">${icons.download} Excel</button>
        <button class="btn btn-outline btn-sm" id="is-pdf">${icons.download} PDF</button>
      </div>
      <div id="is-result" class="card-pad"></div>
    </div>

    <div class="card mb">
      <h2>Resumen mensual</h2>
      <div class="toolbar">
        <select class="input" id="ms-month">
          ${MONTHS.map((m, i) => `<option value="${i + 1}" ${i === now.getMonth() ? 'selected' : ''}>${m}</option>`).join('')}
        </select>
        <select class="input" id="ms-year">
          ${[0, 1, 2, 3].map(d => `<option value="${now.getFullYear() - d}">${now.getFullYear() - d}</option>`).join('')}
        </select>
        <button class="btn btn-primary btn-sm" id="ms-go">Ver resumen</button>
        <div class="spacer"></div>
        <button class="btn btn-outline btn-sm" id="ms-xlsx">${icons.download} Excel</button>
        <button class="btn btn-outline btn-sm" id="ms-pdf">${icons.download} PDF</button>
      </div>
      <div id="ms-result" class="card-pad" style="display:none"></div>
    </div>

    <div class="card">
      <h2>Otras exportaciones</h2>
      <div class="card-pad flex" style="flex-wrap:wrap">
        <button class="btn btn-outline" id="inv-xlsx">${icons.download} Inventario (Excel)</button>
        <button class="btn btn-outline" id="inv-pdf">${icons.download} Inventario (PDF)</button>
        <button class="btn btn-outline" id="sal-xlsx">${icons.download} Ventas del período (Excel)</button>
        <button class="btn btn-outline" id="sal-pdf">${icons.download} Ventas del período (PDF)</button>
      </div>
    </div>`;

  const presetSel = $('#is-preset', page);
  presetSel.addEventListener('change', () => {
    if (presetSel.value !== 'custom') {
      const [f, t] = rangeFor(presetSel.value);
      $('#is-from', page).value = f;
      $('#is-to', page).value = t;
      loadStatement(page);
    }
  });
  ['is-from', 'is-to'].forEach(id => $('#' + id, page).addEventListener('change', () => { presetSel.value = 'custom'; }));
  $('#is-go', page).addEventListener('click', () => loadStatement(page));
  $('#is-xlsx', page).addEventListener('click', () =>
    download(`/api/reports/income-statement/export?from=${$('#is-from', page).value}&to=${$('#is-to', page).value}`));
  $('#is-pdf', page).addEventListener('click', () =>
    download(`/api/reports/income-statement/export?format=pdf&from=${$('#is-from', page).value}&to=${$('#is-to', page).value}`));

  $('#ms-go', page).addEventListener('click', () => loadMonthly(page));
  $('#ms-xlsx', page).addEventListener('click', () =>
    download(`/api/reports/monthly-summary/export?year=${$('#ms-year', page).value}&month=${$('#ms-month', page).value}`));
  $('#ms-pdf', page).addEventListener('click', () =>
    download(`/api/reports/monthly-summary/export?format=pdf&year=${$('#ms-year', page).value}&month=${$('#ms-month', page).value}`));

  $('#inv-xlsx', page).addEventListener('click', () => download('/api/reports/inventory/export'));
  $('#inv-pdf', page).addEventListener('click', () => download('/api/reports/inventory/export?format=pdf'));
  $('#sal-xlsx', page).addEventListener('click', () =>
    download(`/api/reports/sales/export?from=${$('#is-from', page).value}&to=${$('#is-to', page).value}`));
  $('#sal-pdf', page).addEventListener('click', () =>
    download(`/api/reports/sales/export?format=pdf&from=${$('#is-from', page).value}&to=${$('#is-to', page).value}`));

  await loadStatement(page);
}

async function loadStatement(page) {
  const root = $('#is-result', page);
  root.innerHTML = '<div class="skeleton"><div class="spin"></div>Calculando…</div>';
  let st;
  try {
    st = await api.get(`/api/reports/income-statement?from=${$('#is-from', page).value}&to=${$('#is-to', page).value}`);
  } catch (err) { toastErr(err); root.innerHTML = ''; return; }

  const row = (label, value, cls = '', indent = false) => `
    <tr class="${cls} ${indent ? 'is-indent' : ''}">
      <td>${label}</td>
      <td class="num">${money(value)}</td>
    </tr>`;
  const section = (label) => `<tr class="is-section"><td colspan="2">${label}</td></tr>`;

  root.innerHTML = `
    <table class="is-table">
      ${section('INGRESOS')}
      ${row('Ventas brutas', st.ventas_brutas, '', true)}
      ${row('(-) Descuentos y rebajas', -st.descuentos, '', true)}
      ${row('Ventas netas', st.ventas_netas, 'is-sub')}
      ${row('(-) Costo de ventas', -st.costo_ventas, '', true)}
      ${row('UTILIDAD BRUTA', st.utilidad_bruta, 'is-total')}
      ${section('GASTOS DE OPERACIÓN')}
      ${row('Gastos de venta', -st.gastos_ventas, '', true)}
      ${row('Gastos administrativos', -st.gastos_administrativos, '', true)}
      ${row('UTILIDAD DE OPERACIÓN', st.utilidad_operativa, 'is-total')}
      ${row('Gastos financieros', -st.gastos_financieros, '', true)}
      ${row('Otros gastos', -st.otros_gastos, '', true)}
      ${row('UTILIDAD ANTES DE ISR', st.utilidad_antes_isr, 'is-total')}
      ${row(`(-) ISR estimado (${num(st.isr_rate)}%)`, -st.isr, '', true)}
      ${row('UTILIDAD NETA', st.utilidad_neta, 'is-final')}
    </table>
    <div class="flex mt" style="flex-wrap:wrap; gap:18px; font-size:13px; color:var(--text-2)">
      <span>Ventas: <b>${st.num_ventas}</b></span>
      <span>ISV cobrado (débito fiscal): <b>${money(st.isv_cobrado)}</b></span>
      <span>Margen bruto: <b>${num(st.margen_bruto)}%</b></span>
      <span>Margen neto: <b>${num(st.margen_neto)}%</b></span>
    </div>
    <p class="muted" style="font-size:12px; margin-bottom:0">El ISR mostrado es una estimación para fines gerenciales y no sustituye la declaración fiscal oficial ante el SAR.</p>`;
}

async function loadMonthly(page) {
  const root = $('#ms-result', page);
  root.style.display = '';
  root.innerHTML = '<div class="skeleton"><div class="spin"></div>Calculando…</div>';
  let ms;
  try {
    ms = await api.get(`/api/reports/monthly-summary?year=${$('#ms-year', page).value}&month=${$('#ms-month', page).value}`);
  } catch (err) { toastErr(err); root.innerHTML = ''; return; }

  const st = ms.statement;
  const kpi = (label, value, cls = '') => `
    <div class="card kpi">
      <div class="kpi-label">${label}</div>
      <div class="kpi-value ${cls}" style="font-size:19px">${value}</div>
    </div>`;

  root.innerHTML = `
    <div class="grid grid-4 mb">
      ${kpi('Ventas netas', money(st.ventas_netas))}
      ${kpi('Utilidad bruta', money(st.utilidad_bruta), 'text-green')}
      ${kpi('Gastos', money(st.gastos_operativos + st.gastos_financieros + st.otros_gastos))}
      ${kpi('Utilidad neta est.', money(st.utilidad_neta), st.utilidad_neta >= 0 ? 'text-green' : 'text-red')}
    </div>
    <div class="grid grid-4 mb">
      ${kpi('Núm. de ventas', st.num_ventas)}
      ${kpi('Ticket promedio', money(ms.ticket_promedio))}
      ${kpi('Compras recibidas', money(ms.compras_recibidas))}
      ${kpi('Valor inventario', money(ms.valor_inventario))}
    </div>
    ${ms.top_products.length ? `
    <h3 style="font-size:14px; margin:18px 0 10px">Productos más vendidos</h3>
    <div class="table-wrap" style="border:1px solid var(--border); border-radius:10px">
      <table class="table">
        <thead><tr><th>Producto</th><th>SKU</th><th class="num">Cant.</th><th class="num">Ventas netas</th><th class="num">Utilidad</th></tr></thead>
        <tbody>
          ${ms.top_products.map(t => `
            <tr>
              <td class="cell-main">${esc(t.name)}</td>
              <td class="mono">${esc(t.sku)}</td>
              <td class="num">${qty(t.qty)}</td>
              <td class="num">${money(t.revenue)}</td>
              <td class="num text-green">${money(t.profit)}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>` : '<p class="muted">Sin ventas en el mes seleccionado.</p>'}`;
}
