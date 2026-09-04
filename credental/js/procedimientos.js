/* ==========================================================================
   PROCEDIMIENTOS.JS - LÓGICA DEL CATÁLOGO DE ARANCELES / TRATAMIENTOS
   Maneja las operaciones CRUD de procedimientos clínicos persistidos en DB local.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function() {
  // Verificar Sesión
  if (window.auth) {
    window.auth.checkSession();
  }

  const tableBody = document.getElementById('proc-table-body');
  const searchInput = document.getElementById('proc-search');
  const addBtn = document.getElementById('add-proc-btn');
  const modal = document.getElementById('proc-modal');
  const form = document.getElementById('proc-form');
  const closeBtn = document.getElementById('proc-modal-close');
  const cancelBtn = document.getElementById('btn-cancel-proc');
  const modalTitle = document.getElementById('modal-title-text');

  let editingCode = null;

  // Registrar Cierre de Modales
  window.setupModalClosers(modal, closeBtn);
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => modal.classList.remove('active'));
  }

  // Renderizar tabla inicial
  renderTable();

  // Búsqueda en tiempo real
  searchInput.addEventListener('input', function() {
    renderTable(this.value);
  });

  // Abrir Modal de Creación
  addBtn.addEventListener('click', function() {
    editingCode = null;
    form.reset();
    document.getElementById('proc-code').disabled = false;
    modalTitle.textContent = 'Agregar procedimiento';
    modal.classList.add('active');
  });

  // Guardar (Crear/Modificar) Procedimiento
  form.addEventListener('submit', function(e) {
    e.preventDefault();

    const code = document.getElementById('proc-code').value.trim().toUpperCase();
    const name = document.getElementById('proc-name').value.trim();
    const price = parseFloat(document.getElementById('proc-price').value);
    const description = document.getElementById('proc-desc').value.trim() || 'Sin descripción.';

    // Validar duplicados si es nuevo
    if (!editingCode) {
      const existing = window.db.getProcedures().find(p => p.code === code);
      if (existing) {
        window.showToast('El código de procedimiento ya existe.', 'error');
        return;
      }
    }

    const procedure = {
      code: code,
      name: name,
      price: price,
      description: description
    };

    window.db.saveProcedure(procedure);
    window.showToast(editingCode ? 'Procedimiento actualizado con éxito' : 'Procedimiento creado con éxito', 'success');
    modal.classList.remove('active');
    renderTable();
  });

  // Renderizar la tabla de procedimientos
  function renderTable(query = '') {
    const list = window.db.getProcedures();
    tableBody.innerHTML = '';

    const filtered = list.filter(p => {
      const q = query.toLowerCase().trim();
      return p.code.toLowerCase().includes(q) || 
             p.name.toLowerCase().includes(q) || 
             (p.description && p.description.toLowerCase().includes(q));
    });

    if (filtered.length === 0) {
      const buscado = String(query || '').trim();
      const vacio = buscado
        ? 'No hay procedimientos que coincidan con «' + window.escapeHtml(buscado) + '».'
        : 'Todavía no hay procedimientos en el catálogo. Use «Agregar procedimiento» para crear el primero.';
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: var(--color-gray); padding: 30px;">
            ${vacio}
          </td>
        </tr>
      `;
      return;
    }

    filtered.forEach(p => {
      const tr = document.createElement('tr');
      
      // Formatear precio (Lempira hondureño)
      const priceFormatted = window.formatMoney(p.price);

      tr.innerHTML = `
        <td><code class="tag" style="font-weight: 700; font-size: 0.8rem; white-space: nowrap;">${window.escapeHtml(p.code)}</code></td>
        <td style="font-weight: 600;">${window.escapeHtml(p.name)}</td>
        <td class="num" style="font-weight: 700; color: var(--color-teal);">${priceFormatted}</td>
        <td style="font-size: 0.85rem; color: var(--color-gray); font-style: italic;">${window.escapeHtml(p.description || '')}</td>
        <td class="num">
          <!-- El flex va en un contenedor interno: aplicarlo al propio <td>
               saca la celda del layout de la tabla y desalinea el separador
               de fila respecto al resto de las columnas. -->
          <div style="display: flex; gap: 8px; justify-content: flex-end;">
            <button onclick="window.editProcedure('${window.escapeHtml(p.code)}')" class="btn btn-secondary btn-sm">Editar</button>
            <button onclick="window.deleteProcedure('${window.escapeHtml(p.code)}')" class="btn btn-danger btn-sm">Eliminar</button>
          </div>
        </td>
      `;

      tableBody.appendChild(tr);
    });
  }

  // Función de edición expuesta globalmente
  window.editProcedure = function(code) {
    const p = window.db.getProcedures().find(item => item.code === code);
    if (!p) return;

    editingCode = code;
    document.getElementById('proc-code').value = p.code;
    document.getElementById('proc-code').disabled = true; // No permitir cambiar código al editar
    document.getElementById('proc-name').value = p.name;
    document.getElementById('proc-price').value = p.price;
    document.getElementById('proc-desc').value = p.description || '';

    modalTitle.textContent = 'Editar procedimiento';
    modal.classList.add('active');
  };

  // Función de eliminación expuesta globalmente
  window.deleteProcedure = async function(code) {
    const confirmado = await window.confirmarAccion(`¿Está seguro de que desea eliminar el procedimiento '${code}' del catálogo?`, { textoConfirmar: 'Eliminar' });
    if (confirmado) {
      window.db.deleteProcedure(code);
      window.showToast('Procedimiento eliminado del catálogo.', 'warning');
      renderTable(searchInput.value);
    }
  };
});
