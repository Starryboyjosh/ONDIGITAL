/* ==========================================================================
   LABORATORIOS.JS - ESQUELETO DE SEGUIMIENTO DE TRABAJOS DE LABORATORIO
   Órdenes con paciente, tratamiento, laboratorio, fechas, estado y costo.
   Almacenamiento propio por empresa (localStorage). Las órdenes iniciales se
   construyen con los pacientes reales del expediente. La carga de archivos
   adjuntos y las notificaciones automáticas al laboratorio no están
   implementadas y se muestran como tales.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function() {
  if (window.auth) window.auth.checkSession();

  const company = window.auth ? window.auth.getCurrentCompany() : null;
  const companyId = company ? company.id : 'default';
  const KEY = 'credental_laboratorios_' + companyId;

  const ESTADOS = {
    pendiente: { cls: 'badge-pending', txt: 'Pendiente' },
    enviado: { cls: 'badge-confirmed', txt: 'Enviado' },
    proceso: { cls: 'badge-confirmed', txt: 'En proceso' },
    recibido: { cls: 'badge-completed', txt: 'Recibido' },
    entregado: { cls: 'badge-completed', txt: 'Entregado' }
  };

  // Orden real del flujo con el laboratorio. La tabla avanza la orden un paso
  // a la vez con el botón de la última columna, en lugar de obligar a borrarla
  // y volverla a crear para cambiarle el estado.
  const FLUJO = ['pendiente', 'enviado', 'proceso', 'recibido', 'entregado'];
  const SIGUIENTE_TXT = {
    pendiente: 'Enviar',
    enviado: 'En proceso',
    proceso: 'Recibir',
    recibido: 'Entregar'
  };
  const SIGUIENTE_TITULO = {
    pendiente: 'Marcar la orden como enviada al laboratorio',
    enviado: 'Marcar la orden como en proceso en el laboratorio',
    proceso: 'Marcar la orden como recibida en la clínica',
    recibido: 'Marcar la orden como entregada al paciente'
  };
  function siguienteEstado(estado) {
    const i = FLUJO.indexOf(estado);
    return (i === -1 || i === FLUJO.length - 1) ? null : FLUJO[i + 1];
  }

  // Fechas relativas a "hoy" (mismo patrón que js/vito/seed-demo.js)
  const localDate = function (date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  };
  const hoy = new Date();
  const addDays = function (days) {
    const date = new Date(hoy);
    date.setDate(date.getDate() + days);
    return localDate(date);
  };

  // Órdenes iniciales. Los nombres no se escriben a mano: salen del mismo
  // expediente que ve el resto de la aplicación, así que si el usuario edita
  // o borra un paciente no queda un nombre huérfano en este módulo.
  function seedOrdenes() {
    // `window.CredentalDemo` está definido en las 17 pantallas, así que no
    // distingue la demostración de una clínica real: una clínica que estrena el
    // producto abría Laboratorios con seis órdenes de pacientes que no son
    // suyos. La guarda correcta es la empresa activa.
    const empresa = window.auth && window.auth.getCurrentCompany ? window.auth.getCurrentCompany() : null;
    const esDemo = !!empresa && empresa.id === 'co_credental_demo';
    if (!esDemo) return [];

    const pacientes = window.CredentalDemo && window.CredentalDemo.pacientesDemo
      ? window.CredentalDemo.pacientesDemo()
      : window.db.getPatients();
    const plantilla = [
      { tratamiento: 'Corona de porcelana', laboratorio: 'Laboratorio Dental Premium', envio: addDays(-6), esperada: addDays(5), estado: 'proceso', costo: 1200, adjuntos: 2 },
      { tratamiento: 'Prótesis parcial removible', laboratorio: 'OrtoLab HN', envio: addDays(-14), esperada: addDays(-2), estado: 'recibido', costo: 2400, adjuntos: 1 },
      { tratamiento: 'Carilla de cerámica', laboratorio: 'Laboratorio Dental Premium', envio: '', esperada: '', estado: 'pendiente', costo: 900, adjuntos: 0 },
      { tratamiento: 'Guarda oclusal nocturna', laboratorio: 'OrtoLab HN', envio: addDays(-3), esperada: addDays(8), estado: 'enviado', costo: 1500, adjuntos: 1 },
      { tratamiento: 'Puente fijo de 3 unidades', laboratorio: 'Dental Center Lab', envio: addDays(-21), esperada: addDays(-9), estado: 'entregado', costo: 3600, adjuntos: 3 },
      { tratamiento: 'Incrustación de porcelana', laboratorio: 'Dental Center Lab', envio: addDays(-9), esperada: addDays(2), estado: 'proceso', costo: 1750, adjuntos: 1 }
    ];
    return plantilla.slice(0, pacientes.length).map(function (o, i) {
      return Object.assign({ id: 'lab_' + (i + 1), paciente: pacientes[i].name }, o);
    });
  }

  function read() {
    try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch (e) { /* ignore */ }
    const inicial = seedOrdenes();
    localStorage.setItem(KEY, JSON.stringify(inicial));
    return inicial;
  }
  function write(list) { localStorage.setItem(KEY, JSON.stringify(list)); }

  let ordenes = read();

  function fmtDate(v) {
    if (!v) return '—';
    const d = new Date(v + 'T00:00:00');
    return isNaN(d.getTime()) ? v : d.toLocaleDateString('es-HN', { day: 'numeric', month: 'short' });
  }

  // La carga de archivos todavía no está implementada: la columna refleja los
  // adjuntos declarados en la orden, no un archivo subido a la aplicación.
  function adjuntosTag(o) {
    const n = o.adjuntos || 0;
    if (!n) return '<span class="tag" style="opacity:0.7;">Sin adjuntos</span>';
    return '<span class="tag">' + n + (n === 1 ? ' archivo' : ' archivos') + '</span>';
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
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color: var(--color-gray); padding: 26px;">No hay órdenes con este estado.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(o => {
      const est = ESTADOS[o.estado] || { cls: 'badge-confirmed', txt: o.estado };
      const siguiente = siguienteEstado(o.estado);
      const accion = siguiente
        ? `<button type="button" class="btn btn-secondary btn-sm js-avanzar" data-id="${o.id}" title="${SIGUIENTE_TITULO[o.estado]}">${SIGUIENTE_TXT[o.estado]}</button>`
        : '<span class="lab-cerrada">Cerrada</span>';
      return `
        <tr>
          <td class="lab-col-paciente">${window.escapeHtml(o.paciente)}</td>
          <td>${window.escapeHtml(o.tratamiento)}</td>
          <td>${window.escapeHtml(o.laboratorio)}</td>
          <td class="lab-col-fecha">${fmtDate(o.envio)}</td>
          <td class="lab-col-fecha">${fmtDate(o.esperada)}</td>
          <td class="lab-col-costo">${o.costo ? window.formatMoney(o.costo) : '—'}</td>
          <td class="lab-col-estado"><span class="badge ${est.cls}">${est.txt}</span></td>
          <td class="lab-col-estado">${adjuntosTag(o)}</td>
          <td class="lab-col-accion">${accion}</td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.js-avanzar').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const orden = ordenes.find(o => o.id === btn.getAttribute('data-id'));
        if (!orden) return;
        const siguiente = siguienteEstado(orden.estado);
        if (!siguiente) return;
        orden.estado = siguiente;
        if (siguiente === 'enviado' && !orden.envio) orden.envio = addDays(0);
        write(ordenes);
        renderAll();
        window.showToast(`Orden de ${orden.paciente}: ${ESTADOS[siguiente].txt}`, 'success');
      });
    });
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
      costo: parseFloat(document.getElementById('ord-costo').value) || 0,
      adjuntos: 0
    });
    write(ordenes);
    ordenModal.classList.remove('active');
    renderAll();
    window.showToast('Orden de laboratorio registrada', 'success');
  });

  renderAll();
});
