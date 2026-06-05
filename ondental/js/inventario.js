/* ==========================================================================
   INVENTARIO.JS - ESQUELETO DE CONTROL DE INSUMOS CLÍNICOS
   Insumos con stock, mínimo, lote, vencimiento y proveedor. Alertas de stock
   bajo, próximo vencimiento y sin proveedor. Datos locales (mock inicial +
   altas del usuario). No implementa compras ni proveedores reales.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function() {
  if (window.auth) window.auth.checkSession();

  const company = window.auth ? window.auth.getCurrentCompany() : null;
  const companyId = company ? company.id : 'default';
  const KEY = 'ondental_inventario_' + companyId;

  // Insumos de ejemplo (esqueleto) — contexto dental
  const seed = [
    { id: 'ins_1', nombre: 'Anestesia lidocaína 2%', categoria: 'Anestésicos', proveedor: 'Dental Supply HN', stock: 8, minimo: 15, lote: 'L-2026-02', vence: '2026-09-30' },
    { id: 'ins_2', nombre: 'Resina compuesta A2', categoria: 'Restauración', proveedor: 'OdontoCenter', stock: 22, minimo: 10, lote: 'R-115', vence: '2027-03-15' },
    { id: 'ins_3', nombre: 'Guantes nitrilo (caja)', categoria: 'Bioseguridad', proveedor: '', stock: 4, minimo: 12, lote: 'G-908', vence: '2028-01-01' },
    { id: 'ins_4', nombre: 'Ácido grabador 37%', categoria: 'Restauración', proveedor: 'Dental Supply HN', stock: 18, minimo: 8, lote: 'A-441', vence: '2026-07-10' },
    { id: 'ins_5', nombre: 'Agujas dentales cortas', categoria: 'Anestésicos', proveedor: 'OdontoCenter', stock: 30, minimo: 20, lote: 'AG-77', vence: '2027-11-20' }
  ];

  function read() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* ignore */ }
    localStorage.setItem(KEY, JSON.stringify(seed));
    return seed.slice();
  }
  function write(list) { localStorage.setItem(KEY, JSON.stringify(list)); }

  let insumos = read();

  const DIAS_VENCIMIENTO = 60;

  function diasParaVencer(vence) {
    if (!vence) return null;
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const d = new Date(vence + 'T00:00:00');
    if (isNaN(d.getTime())) return null;
    return Math.ceil((d - hoy) / 86400000);
  }

  function estadoInsumo(i) {
    if (i.stock <= i.minimo) return { cls: 'badge-canceled', txt: 'Stock bajo' };
    const dias = diasParaVencer(i.vence);
    if (dias !== null && dias <= DIAS_VENCIMIENTO) return { cls: 'badge-pending', txt: dias < 0 ? 'Vencido' : 'Vence pronto' };
    if (!i.proveedor) return { cls: 'badge-confirmed', txt: 'Sin proveedor' };
    return { cls: 'badge-completed', txt: 'Disponible' };
  }

  function fmtVence(v) {
    if (!v) return '—';
    const d = new Date(v + 'T00:00:00');
    return isNaN(d.getTime()) ? v : d.toLocaleDateString('es-HN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function renderAlerts() {
    const bajo = insumos.filter(i => i.stock <= i.minimo).length;
    const venc = insumos.filter(i => { const d = diasParaVencer(i.vence); return d !== null && d <= DIAS_VENCIMIENTO; }).length;
    const sinProv = insumos.filter(i => !i.proveedor).length;
    document.getElementById('inv-stock-bajo').textContent = bajo;
    document.getElementById('inv-vencimiento').textContent = venc;
    document.getElementById('inv-sin-proveedor').textContent = sinProv;
    document.getElementById('inv-total').textContent = insumos.length;
  }

  function renderTable(query = '') {
    const tbody = document.getElementById('inv-body');
    const q = query.trim().toLowerCase();
    const list = insumos.filter(i =>
      i.nombre.toLowerCase().includes(q) || (i.categoria || '').toLowerCase().includes(q)
    );

    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color: var(--color-gray); padding: 26px;">No hay insumos que coincidan.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(i => {
      const est = estadoInsumo(i);
      const stockColor = i.stock <= i.minimo ? 'var(--color-red)' : 'var(--text-primary)';
      return `
        <tr>
          <td style="font-weight:600;">${i.nombre}</td>
          <td><span class="tag">${i.categoria || '—'}</span></td>
          <td>${i.proveedor || '<span style="color: var(--color-gray);">Sin proveedor</span>'}</td>
          <td style="text-align:right; font-weight:700; color:${stockColor};">${i.stock}</td>
          <td style="text-align:right; color: var(--color-gray);">${i.minimo}</td>
          <td>${i.lote || '—'}</td>
          <td>${fmtVence(i.vence)}</td>
          <td><span class="badge ${est.cls}">${est.txt}</span></td>
        </tr>
      `;
    }).join('');
  }

  function renderAll() {
    renderAlerts();
    renderTable(document.getElementById('inv-search').value);
  }

  // --- Eventos ---
  document.getElementById('inv-search').addEventListener('input', function() {
    renderTable(this.value);
  });

  const insumoModal = document.getElementById('insumo-modal');
  window.setupModalClosers(insumoModal, document.getElementById('insumo-modal-close'));

  document.getElementById('add-insumo-btn').addEventListener('click', function() {
    document.getElementById('insumo-form').reset();
    insumoModal.classList.add('active');
  });

  document.getElementById('insumo-form').addEventListener('submit', function(e) {
    e.preventDefault();
    insumos.push({
      id: 'ins_' + Date.now(),
      nombre: document.getElementById('ins-nombre').value.trim(),
      categoria: document.getElementById('ins-categoria').value.trim(),
      proveedor: document.getElementById('ins-proveedor').value.trim(),
      stock: parseInt(document.getElementById('ins-stock').value) || 0,
      minimo: parseInt(document.getElementById('ins-minimo').value) || 0,
      lote: document.getElementById('ins-lote').value.trim(),
      vence: document.getElementById('ins-vence').value
    });
    write(insumos);
    insumoModal.classList.remove('active');
    renderAll();
    window.showToast('Insumo registrado', 'success');
  });

  renderAll();
});
