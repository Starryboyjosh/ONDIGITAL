/* ==========================================================================
   LABORATORIOS.JS - ESQUELETO DE SEGUIMIENTO DE TRABAJOS DE LABORATORIO
   Órdenes con paciente, tratamiento, laboratorio, fechas, estado y costo.
   Datos locales (mock inicial + altas). Adjuntos y notificaciones automáticas
   no están implementados.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function() {
  if (window.auth) window.auth.checkSession();

  const company = window.auth ? window.auth.getCurrentCompany() : null;
  const companyId = company ? company.id : 'default';
  const KEY = 'ondental_laboratorios_' + companyId;

  const ESTADOS = {
    pendiente: { cls: 'badge-pending', txt: 'Pendiente' },
    enviado: { cls: 'badge-confirmed', txt: 'Enviado' },
    proceso: { cls: 'badge-confirmed', txt: 'En proceso' },
    recibido: { cls: 'badge-completed', txt: 'Recibido' },
    entregado: { cls: 'badge-completed', txt: 'Entregado' }
  };

  // Órdenes de ejemplo
  const seed = [
    { id: 'lab_1', paciente: 'María López', tratamiento: 'Corona de porcelana', laboratorio: 'Laboratorio Dental Premium', envio: '2026-05-28', esperada: '2026-06-08', estado: 'proceso', costo: 1200 },
    { id: 'lab_2', paciente: 'Carlos Banegas', tratamiento: 'Prótesis parcial removible', laboratorio: 'OrtoLab HN', envio: '2026-05-20', esperada: '2026-06-02', estado: 'recibido', costo: 2400 },
    { id: 'lab_3', paciente: 'Ana Discua', tratamiento: 'Carilla de cerámica', laboratorio: 'Laboratorio Dental Premium', envio: '', esperada: '', estado: 'pendiente', costo: 900 }
  ];

  function read() {
    try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch (e) { /* ignore */ }
    localStorage.setItem(KEY, JSON.stringify(seed));
    return seed.slice();
  }
  function write(list) { localStorage.setItem(KEY, JSON.stringify(list)); }

  let ordenes = read();

  function fmtDate(v) {
    if (!v) return '—';
    const d = new Date(v + 'T00:00:00');
    return isNaN(d.getTime()) ? v : d.toLocaleDateString('es-HN', { day: 'numeric', month: 'short' });
  }

  function renderResumen() {
    const count = (st) => ordenes.filter(o => o.estado === st).length;
    document.getElementById('lab-pendientes').textContent = count('pendiente');
    document.getElementById('lab-transito').textContent = count('enviado') + count('proceso');
    document.getElementById('lab-recibidas').textContent = count('recibido');
    document.getElementById('lab-entregadas').textContent = count('entregado');
  }

  function renderTable() {
    const filtro = document.getElementById('lab-filter-estado').value;
    const tbody = document.getElementById('lab-body');
    const list = filtro === 'all' ? ordenes : ordenes.filter(o => o.estado === filtro);

    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color: var(--color-gray); padding: 26px;">No hay órdenes con este estado.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(o => {
      const est = ESTADOS[o.estado] || { cls: 'badge-confirmed', txt: o.estado };
      return `
        <tr>
          <td style="font-weight:600;">${o.paciente}</td>
          <td>${o.tratamiento}</td>
          <td>${o.laboratorio}</td>
          <td>${fmtDate(o.envio)}</td>
          <td>${fmtDate(o.esperada)}</td>
          <td style="text-align:right; font-weight:600;">${o.costo ? window.formatMoney(o.costo) : '—'}</td>
          <td><span class="badge ${est.cls}">${est.txt}</span></td>
          <td><span class="tag">Sin adjuntos</span></td>
        </tr>
      `;
    }).join('');
  }

  function renderAll() {
    renderResumen();
    renderTable();
  }

  // Poblar selector de pacientes
  const pacienteSelect = document.getElementById('ord-paciente');
  function fillPacientes() {
    const patients = window.db.getPatients();
    pacienteSelect.innerHTML = patients.length
      ? patients.map(p => `<option value="${p.name}">${p.name}</option>`).join('')
      : '<option value="">Sin pacientes registrados</option>';
  }

  // --- Eventos ---
  document.getElementById('lab-filter-estado').addEventListener('change', renderTable);

  const ordenModal = document.getElementById('orden-modal');
  window.setupModalClosers(ordenModal, document.getElementById('orden-modal-close'));

  document.getElementById('add-orden-btn').addEventListener('click', function() {
    document.getElementById('orden-form').reset();
    fillPacientes();
    ordenModal.classList.add('active');
  });

  document.getElementById('orden-form').addEventListener('submit', function(e) {
    e.preventDefault();
    ordenes.push({
      id: 'lab_' + Date.now(),
      paciente: document.getElementById('ord-paciente').value,
      tratamiento: document.getElementById('ord-tratamiento').value.trim(),
      laboratorio: document.getElementById('ord-laboratorio').value.trim(),
      envio: document.getElementById('ord-envio').value,
      esperada: document.getElementById('ord-esperada').value,
      estado: document.getElementById('ord-estado').value,
      costo: parseFloat(document.getElementById('ord-costo').value) || 0
    });
    write(ordenes);
    ordenModal.classList.remove('active');
    renderAll();
    window.showToast('Orden de laboratorio registrada', 'success');
  });

  renderAll();
});
