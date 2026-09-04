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
  const KEY = 'credental_inventario_' + companyId;

  // Fechas de vencimiento relativas a "hoy" (mismo patrón que
  // js/vito/seed-demo.js): con fechas fijas el inventario de demostración se
  // vuelve un almacén entero caducado al cabo de unos meses.
  const localDate = function (date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  };
  const hoyRef = new Date();
  const addDays = function (days) {
    const date = new Date(hoyRef);
    date.setDate(date.getDate() + days);
    return localDate(date);
  };

  // Insumos de ejemplo — contexto dental hondureño
  const seed = [
    { id: 'ins_1', nombre: 'Anestesia lidocaína 2%', categoria: 'Anestésicos', proveedor: 'Dental Supply HN', stock: 8, minimo: 15, lote: 'L-2026-02', vence: addDays(28) },
    { id: 'ins_2', nombre: 'Resina compuesta A2', categoria: 'Restauración', proveedor: 'OdontoCenter', stock: 22, minimo: 10, lote: 'R-115', vence: addDays(200) },
    { id: 'ins_3', nombre: 'Guantes de nitrilo (caja 100)', categoria: 'Bioseguridad', proveedor: '', stock: 4, minimo: 12, lote: 'G-908', vence: addDays(480) },
    { id: 'ins_4', nombre: 'Ácido grabador 37%', categoria: 'Restauración', proveedor: 'Dental Supply HN', stock: 18, minimo: 8, lote: 'A-441', vence: addDays(-54) },
    { id: 'ins_5', nombre: 'Agujas dentales cortas', categoria: 'Anestésicos', proveedor: 'OdontoCenter', stock: 30, minimo: 20, lote: 'AG-77', vence: addDays(430) },
    { id: 'ins_6', nombre: 'Fresas de diamante (surtido)', categoria: 'Instrumental', proveedor: 'OdontoCenter', stock: 46, minimo: 20, lote: 'F-233', vence: addDays(900) },
    { id: 'ins_7', nombre: 'Ionómero de vidrio', categoria: 'Restauración', proveedor: 'Dental Supply HN', stock: 12, minimo: 6, lote: 'IV-88', vence: addDays(150) },
    { id: 'ins_8', nombre: 'Hilo de sutura 3-0', categoria: 'Cirugía', proveedor: 'MediHonduras', stock: 9, minimo: 5, lote: 'S-301', vence: addDays(320) },
    { id: 'ins_9', nombre: 'Mascarillas quirúrgicas (caja 50)', categoria: 'Bioseguridad', proveedor: 'Dental Supply HN', stock: 26, minimo: 10, lote: 'MQ-55', vence: addDays(700) },
    { id: 'ins_10', nombre: 'Eyectores de saliva (bolsa 100)', categoria: 'Bioseguridad', proveedor: 'OdontoCenter', stock: 7, minimo: 10, lote: 'ES-12', vence: addDays(600) },
    { id: 'ins_11', nombre: 'Cemento temporal', categoria: 'Restauración', proveedor: 'OdontoCenter', stock: 15, minimo: 5, lote: 'CT-19', vence: addDays(45) },
    { id: 'ins_12', nombre: 'Alginato para impresiones', categoria: 'Impresión', proveedor: 'MediHonduras', stock: 11, minimo: 4, lote: 'AL-27', vence: addDays(260) }
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
    const dias = diasParaVencer(i.vence);
    // Un lote vencido no se puede usar en boca: manda sobre cualquier otra alerta.
    if (dias !== null && dias < 0) return { cls: 'badge-canceled', txt: 'Vencido' };
    if (i.stock <= i.minimo) return { cls: 'badge-canceled', txt: 'Stock bajo' };
    if (dias !== null && dias <= DIAS_VENCIMIENTO) return { cls: 'badge-pending', txt: 'Vence pronto' };
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
    // "Por vencer" y "vencido" son cosas distintas: contar un lote caducado
    // como próximo a vencer contradice su propia insignia en la tabla.
    const porVencer = insumos.filter(i => { const d = diasParaVencer(i.vence); return d !== null && d >= 0 && d <= DIAS_VENCIMIENTO; }).length;
    const vencidos = insumos.filter(i => { const d = diasParaVencer(i.vence); return d !== null && d < 0; }).length;
    const sinProv = insumos.filter(i => !i.proveedor).length;
    document.getElementById('inv-stock-bajo').textContent = bajo;
    document.getElementById('inv-vencimiento').textContent = porVencer;
    const notaVencidos = document.getElementById('inv-vencidos');
    if (notaVencidos) {
      notaVencidos.textContent = vencidos === 0
        ? 'Sin lotes vencidos'
        : (vencidos === 1 ? '1 lote ya vencido' : `${vencidos} lotes ya vencidos`);
      notaVencidos.style.color = vencidos > 0 ? 'var(--color-red-text)' : '';
    }
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
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color: var(--color-gray); padding: 26px;">No hay insumos que coincidan.</td></tr>';
      return;
    }

    const esc = window.escapeHtml || function (v) { return v; };
    tbody.innerHTML = list.map(i => {
      const est = estadoInsumo(i);
      const stockColor = i.stock <= i.minimo ? 'var(--color-red-text)' : 'var(--text-primary)';
      // La fecha se resalta cuando el lote está vencido o por vencer: de lo
      // contrario el contador de arriba señala lotes que la tabla no distingue.
      const dias = diasParaVencer(i.vence);
      let venceColor = 'var(--text-primary)';
      let venceTitulo = '';
      if (dias !== null && dias < 0) {
        venceColor = 'var(--color-red-text)';
        venceTitulo = 'Lote vencido';
      } else if (dias !== null && dias <= DIAS_VENCIMIENTO) {
        venceColor = 'var(--color-amber-text)';
        venceTitulo = `Vence en ${dias} día${dias === 1 ? '' : 's'}`;
      }
      return `
        <tr>
          <td style="font-weight:600;">${esc(i.nombre)}</td>
          <td><span class="tag">${esc(i.categoria) || '—'}</span></td>
          <td>${esc(i.proveedor) || '<span style="color: var(--color-gray);">Sin proveedor</span>'}</td>
          <td class="num" style="font-weight:700; color:${stockColor};">${i.stock}</td>
          <td class="num" style="color: var(--color-gray);">${i.minimo}</td>
          <td>${esc(i.lote) || '—'}</td>
          <td style="white-space:nowrap; color:${venceColor}; font-weight:${venceColor === 'var(--text-primary)' ? '400' : '600'};" title="${venceTitulo}">${fmtVence(i.vence)}</td>
          <td><span class="badge ${est.cls}">${est.txt}</span></td>
          <td class="num" style="white-space: nowrap;">
            <button type="button" class="btn btn-secondary btn-sm" data-mov="entrada" data-id="${esc(i.id)}" title="Sumar unidades recibidas">+ Entrada</button>
            <button type="button" class="btn btn-secondary btn-sm" data-mov="salida" data-id="${esc(i.id)}" title="Descontar unidades consumidas"${i.stock <= 0 ? ' disabled' : ''}>− Salida</button>
          </td>
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

  // --- Entradas y salidas de existencia -----------------------------------
  // Hasta ahora la única escritura del módulo era el alta: el stock no bajaba
  // nunca, así que el KPI "Stock bajo" y la insignia roja eran decorativos.
  const movModal = document.getElementById('mov-modal');
  const movForm = document.getElementById('mov-form');
  const movCantidad = document.getElementById('mov-cantidad');
  const movMotivo = document.getElementById('mov-motivo');
  let movActual = null; // { id, tipo }

  window.setupModalClosers(movModal, document.getElementById('mov-modal-close'));

  document.getElementById('inv-body').addEventListener('click', function(e) {
    const btn = e.target.closest('button[data-mov]');
    if (!btn) return;
    const insumo = insumos.find(i => i.id === btn.dataset.id);
    if (!insumo) return;
    abrirMovimiento(insumo, btn.dataset.mov);
  });

  function abrirMovimiento(insumo, tipo) {
    movActual = { id: insumo.id, tipo: tipo };
    const esSalida = tipo === 'salida';
    document.getElementById('mov-modal-title').textContent = esSalida ? 'Registrar salida' : 'Registrar entrada';
    document.getElementById('mov-insumo').textContent = insumo.nombre;
    document.getElementById('mov-existencia').textContent =
      `Existencia actual: ${insumo.stock} · mínimo ${insumo.minimo}` + (insumo.lote ? ` · lote ${insumo.lote}` : '');
    document.getElementById('mov-ayuda').textContent = esSalida
      ? `No puede salir más de lo que hay: quedan ${insumo.stock} unidades.`
      : 'Unidades recibidas que se suman a la existencia.';
    document.getElementById('mov-confirmar').textContent = esSalida ? 'Registrar salida' : 'Registrar entrada';
    movForm.reset();
    movCantidad.max = esSalida ? String(insumo.stock) : '';
    if (!esSalida) movCantidad.removeAttribute('max');
    movModal.classList.add('active');
    movCantidad.focus();
  }

  movForm.addEventListener('submit', function(e) {
    e.preventDefault();
    if (!movActual) return;
    const insumo = insumos.find(i => i.id === movActual.id);
    if (!insumo) return;

    const cantidad = parseInt(movCantidad.value, 10);
    if (!cantidad || cantidad <= 0) {
      window.showToast('Indique cuántas unidades entran o salen.', 'warning');
      return;
    }

    if (movActual.tipo === 'salida' && cantidad > insumo.stock) {
      window.showToast(`No hay existencia suficiente: quedan ${insumo.stock} unidades.`, 'warning');
      return;
    }

    const antes = insumo.stock;
    insumo.stock = movActual.tipo === 'salida' ? antes - cantidad : antes + cantidad;
    insumo.movimientos = (insumo.movimientos || []).concat([{
      fecha: window.todayISO(),
      hora: new Date().toTimeString().slice(0, 5),
      tipo: movActual.tipo,
      cantidad: cantidad,
      motivo: movMotivo.value.trim(),
      resultante: insumo.stock
    }]);

    write(insumos);
    movModal.classList.remove('active');
    movActual = null;
    renderAll();

    const bajoMinimo = insumo.stock <= insumo.minimo;
    window.showToast(
      `${insumo.nombre}: ${antes} → ${insumo.stock} unidades.` +
      (bajoMinimo ? ` Quedó en el mínimo o por debajo (${insumo.minimo}).` : ''),
      bajoMinimo ? 'warning' : 'success');
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
