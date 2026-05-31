# ONDIGITAL — Caja de Herramientas y Utilidades Premium

> Esta guía técnica detalla la implementación de utilidades interactivas, componentes dinámicos de interfaz (modales, toasts, autocompletado) y librerías clave, optimizados para proyectos de alto rendimiento. Todos los ejemplos de código y comentarios explicativos están en **español**.

---

## 📋 Índice
1. [Componente Autocomplete Inteligente (Buscador)](#componente-autocomplete-inteligente-buscador)
2. [Sistema Reactivo de Notificaciones (Toasts Engine)](#sistema-reactivo-de-notificaciones-toasts-engine)
3. [Controlador de Ventanas Modales Adaptativas](#controlador-de-ventanas-modales-adaptativas)
4. [Administrador de Menú Lateral (Sidebar Manager)](#administrador-de-menú-lateral-sidebar-manager)
5. [Motor de Ordenamiento y Filtrado de Tablas de Datos](#motor-de-ordenamiento-y-filtrado-de-tablas-de-datos)
6. [Generador de Reportes PDF Profesionales (`window.print`)](#generador-de-reportes-pdf-profesionales-windowprint)
7. [Validación Dinámica y Animada de Formularios](#validación-dinámica-y-animada-de-formularios)
8. [Integraciones Rápidas (WhatsApp Link, QR, Geolocalización)](#integraciones-rápidas-whatsapp-link-qr-geolocalización)

---

## Componente Autocomplete Inteligente (Buscador)

Un componente reutilizable de autocompletado en Vanilla JS que soporta navegación mediante teclado (↑ ↓ Enter Esc) y filtrado predictivo en tiempo real.

```javascript
/**
 * Inicializador de autocompletado predictivo
 * @param {Object} config
 * @param {HTMLInputElement} config.input - Campo de texto origen
 * @param {HTMLElement} config.resultsContainer - Contenedor de resultados
 * @param {Array} config.dataList - Datos a filtrar [{id, title, subtitle}]
 * @param {Function} config.onSelect - Callback al seleccionar registro
 */
function initAutocomplete({ input, resultsContainer, dataList, onSelect }) {
  let highlightedIndex = -1;
  let filteredList = [];

  // Al escribir en el campo
  input.addEventListener('input', (e) => {
    const val = e.target.value.trim().toLowerCase();
    highlightedIndex = -1;

    if (val.length < 2) {
      resultsContainer.innerHTML = '';
      resultsContainer.classList.add('hidden');
      return;
    }

    // Filtrar coincidencias
    filteredList = dataList.filter(item => 
      item.title.toLowerCase().includes(val) || 
      (item.subtitle && item.subtitle.toLowerCase().includes(val))
    );

    renderResults(filteredList, val);
  });

  // Renderiza la lista flotante
  function renderResults(list, query) {
    resultsContainer.innerHTML = '';
    if (list.length === 0) {
      resultsContainer.innerHTML = `<div class="autocomplete-no-results">Sin coincidencias</div>`;
      resultsContainer.classList.remove('hidden');
      return;
    }

    list.forEach((item, index) => {
      const el = document.createElement('div');
      el.className = 'autocomplete-item';
      el.dataset.id = item.id;
      
      // Resaltado de coincidencia (text highlighting)
      const regex = new RegExp(`(${query})`, 'gi');
      const highlightedTitle = item.title.replace(regex, '<mark>$1</mark>');

      el.innerHTML = `
        <div class="item-title">${highlightedTitle}</div>
        ${item.subtitle ? `<div class="item-subtitle">${item.subtitle}</div>` : ''}
      `;

      el.addEventListener('click', () => selectItem(item));
      resultsContainer.appendChild(el);
    });

    resultsContainer.classList.remove('hidden');
  }

  // Controlador de Teclado
  input.addEventListener('keydown', (e) => {
    const items = resultsContainer.querySelectorAll('.autocomplete-item');
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      highlightedIndex = (highlightedIndex + 1) % items.length;
      updateHighlight(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlightedIndex = (highlightedIndex - 1 + items.length) % items.length;
      updateHighlight(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex > -1 && filteredList[highlightedIndex]) {
        selectItem(filteredList[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      closeResults();
    }
  });

  function updateHighlight(items) {
    items.forEach((item, idx) => {
      if (idx === highlightedIndex) {
        item.classList.add('highlighted');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('highlighted');
      }
    });
  }

  function selectItem(item) {
    input.value = item.title;
    closeResults();
    onSelect(item);
  }

  function closeResults() {
    resultsContainer.innerHTML = '';
    resultsContainer.classList.add('hidden');
  }

  // Cerrar al hacer clic fuera del componente
  document.addEventListener('click', (e) => {
    if (e.target !== input && e.target !== resultsContainer) {
      closeResults();
    }
  });
}
```

---

## Sistema Reactivo de Notificaciones (Toasts Engine)

Permite alertar al usuario de forma reactiva con notificaciones flotantes con aspecto premium.

```javascript
const Toast = {
  container: null,

  _getContainer() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container-fixed';
      document.body.appendChild(this.container);
    }
    return this.container;
  },

  /**
   * Dispara una alerta flotante en pantalla
   * @param {string} message - Mensaje a mostrar
   * @param {'success'|'error'|'warning'|'info'} [type] - Tipo de alerta
   * @param {number} [duration] - Duración en milisegundos
   */
  show(message, type = 'info', duration = 3500) {
    const container = this._getContainer();
    const toast = document.createElement('div');
    
    // Iconos temáticos
    const icons = {
      success: '✨',
      error: '🛑',
      warning: '⚠️',
      info: 'ℹ️'
    };

    toast.className = `toast-card toast-${type} glass-surface`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type]}</span>
      <div class="toast-content">${message}</div>
      <button class="toast-close">×</button>
    `;

    // Botón de cerrar manual
    toast.querySelector('.toast-close').addEventListener('click', () => {
      this.dismiss(toast);
    });

    container.appendChild(toast);

    // Auto-destrucción
    setTimeout(() => this.dismiss(toast), duration);
  },

  dismiss(toast) {
    toast.classList.add('dismissing');
    toast.addEventListener('transitionend', () => toast.remove());
  }
};
```

---

## Controlador de Ventanas Modales Adaptativas

Maneja de manera accesible e interactiva la apertura y cierre de diálogos modales en la interfaz.

```javascript
const Modal = {
  /**
   * Abre una ventana modal aplicando clases de animación
   * @param {HTMLElement} modalEl
   */
  open(modalEl) {
    modalEl.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Evita scroll de fondo
    
    // Enfocar primer input si existe
    const firstInput = modalEl.querySelector('input, select, textarea');
    if (firstInput) firstInput.focus();

    // Evento Esc para cerrar
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        this.close(modalEl);
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  },

  /**
   * Cierra la ventana modal
   * @param {HTMLElement} modalEl
   */
  close(modalEl) {
    modalEl.classList.add('hidden');
    document.body.style.overflow = ''; // Restablece scroll
  }
};
```

---

## Administrador de Menú Lateral (Sidebar Manager)

Utilidad para recordar el estado de apertura/cierre de la barra lateral entre transiciones de páginas usando `localStorage`.

```javascript
const SidebarManager = {
  init() {
    const btn = document.getElementById('btn-toggle');
    const sidebar = document.getElementById('sidebar');
    if (!btn || !sidebar) return;

    // Recuperar estado previo
    const isCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
    if (isCollapsed) {
      sidebar.classList.add('collapsed');
    }

    btn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      localStorage.setItem('sidebar_collapsed', sidebar.classList.contains('collapsed'));
    });
  }
};
```

---

## Motor de Ordenamiento y Filtrado de Tablas de Datos

Permite convertir tablas HTML estáticas en interfaces interactivas capaces de ordenarse por campos al hacer clic en las cabeceras.

```javascript
/**
 * Configura ordenamiento en una tabla HTML
 * @param {HTMLTableElement} table - Elemento tabla
 */
function enableTableSort(table) {
  const headers = table.querySelectorAll('th[data-sortable]');
  let sortDirection = 1; // 1 = ASC, -1 = DESC

  headers.forEach((header, index) => {
    header.addEventListener('click', () => {
      const tbody = table.querySelector('tbody');
      const rows = Array.from(tbody.querySelectorAll('tr'));
      const dataType = header.dataset.type || 'string';

      // Ordenar filas
      const sortedRows = rows.sort((a, b) => {
        const aColText = a.cells[index].textContent.trim();
        const bColText = b.cells[index].textContent.trim();

        if (dataType === 'number') {
          return (parseFloat(aColText) - parseFloat(bColText)) * sortDirection;
        }
        
        return aColText.localeCompare(bColText) * sortDirection;
      });

      // Alternar dirección
      sortDirection *= -1;

      // Actualizar DOM
      tbody.innerHTML = '';
      tbody.append(...sortedRows);

      // Clases visuales de dirección
      headers.forEach(h => h.classList.remove('sort-asc', 'sort-desc'));
      header.classList.add(sortDirection === 1 ? 'sort-desc' : 'sort-asc');
    });
  });
}
```

---

## Generador de Reportes PDF Profesionales (`window.print`)

El navegador provee un generador de PDFs nativo de alto nivel si se configuran adecuadamente las reglas de impresión en CSS para eliminar elementos innecesarios (menús, botones).

### Estilos CSS de Impresión (`print.css`)

```css
@media print {
  /* Ocultar elementos de navegación y control */
  .saas-sidebar, 
  .saas-header, 
  .hero-actions, 
  .btn-logout, 
  .glass-btn,
  .toast-container-fixed {
    display: none !important;
  }

  /* Resetear fondos y márgenes de impresión */
  body, .saas-layout, .saas-main {
    background: white !important;
    color: black !important;
    margin: 0 !important;
    padding: 0 !important;
    height: auto !important;
    overflow: visible !important;
  }

  /* Adaptar tarjetas para que no se corten en páginas */
  .glass-card, .table-container {
    border: none !important;
    background: transparent !important;
    box-shadow: none !important;
    page-break-inside: avoid;
  }

  /* Configuración de página */
  @page {
    size: letter;
    margin: 1.5cm;
  }
}
```

---

## Validación Dinámica y Animada de Formularios

Una rutina que valida formatos de correo y teléfono, aplicando clases de error y animaciones shake si falla la verificación.

```javascript
const FormValidator = {
  validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  validatePhone(phone) {
    // Valida números de teléfono internacionales y locales
    return /^\+?[0-9]{10,15}$/.test(phone.replace(/[\s-]/g, ''));
  },

  /**
   * Aplica efecto de sacudida a un formulario si falla
   * @param {HTMLFormElement} formEl
   */
  shake(formEl) {
    formEl.classList.add('animation-shake');
    formEl.addEventListener('animationend', () => {
      formEl.classList.remove('animation-shake');
    }, { once: true });
  }
};
```
