---
name: ondigital-saas-platform
description: >
  Skill especializado en la generación de plataformas SaaS premium, incluyendo
  arquitecturas multi-tenant, paneles de control (dashboards), gestión de roles,
  configuraciones, facturación/suscripciones e integraciones API. Todo en español.
mode: prototype
platform: desktop+mobile
scenario: design
version: 2.0.0
author: ONDIGITAL
---

# ONDIGITAL — Generación de Plataformas SaaS Premium

> Este skill instruye al agente en el desarrollo de arquitecturas SaaS multi-tenant y de alto impacto visual (glassmorphic, responsive, premium) enfocadas en MiPyMEs y servicios profesionales. Todo el contenido y las interfaces de usuario DEBEN estar en **español**.

---

## 📋 Índice
1. [Arquitectura Multi-Tenant (Aislamiento de Datos)](#arquitectura-multi-tenant-aislamiento-de-datos)
2. [Layout de Dashboard con Sidebar y Header](#layout-de-dashboard-con-sidebar-y-header)
3. [Tarjetas KPI y Gráficos Interactivos](#tarjetas-kpi-y-gráficos-interactivos)
4. [Gestión de Usuarios, Roles y Permisos](#gestión-de-usuarios-roles-y-permisos)
5. [Facturación, Planes y Suscripciones](#facturación-planes-y-suscripciones)
6. [Pantalla de Configuración del Sistema](#pantalla-de-configuración-del-sistema)
7. [Módulo CRM (Gestión de Clientes y Leads)](#módulo-crm-gestión-de-clientes-y-leads)
8. [Integración con APIs (Fetch, Loading y Errores)](#integración-con-apis-fetch-loading-y-errores)
9. [Checklist de Validación SaaS](#checklist-de-validación-saas)

---

## Arquitectura Multi-Tenant (Aislamiento de Datos)

En un entorno SaaS, es crítico garantizar el aislamiento de datos entre diferentes clientes (tenants/empresas). Para prototipos robustos, utilizamos un aislamiento basado en prefijos de claves en `localStorage` o `sessionStorage`.

### Patrón de Aislamiento de Datos por Empresa

```javascript
/**
 * Gestor del Estado Multi-Tenant
 */
const TenantManager = {
  // Clave del usuario actual en sesión
  SESSION_KEY: 'saas_session_active',

  /**
   * Obtiene la empresa activa de la sesión actual
   * @returns {string} ID del tenant/empresa
   */
  getTenantId() {
    const session = JSON.parse(sessionStorage.getItem(this.SESSION_KEY));
    if (!session || !session.user || !session.user.companyId) {
      throw new Error('Sesión no activa o tenant no definido');
    }
    return session.user.companyId;
  },

  /**
   * Genera una clave única prefijada para el tenant activo
   * @param {string} key - Clave original
   * @returns {string} Clave aislada
   */
  tenantKey(key) {
    const tenantId = this.getTenantId();
    return `tenant_${tenantId}_${key}`;
  },

  /**
   * Guarda datos en el ámbito de la empresa activa
   */
  saveData(key, data) {
    const prefixedKey = this.tenantKey(key);
    localStorage.setItem(prefixedKey, JSON.stringify(data));
  },

  /**
   * Lee datos del ámbito de la empresa activa
   */
  readData(key) {
    const prefixedKey = this.tenantKey(key);
    const data = localStorage.getItem(prefixedKey);
    return data ? JSON.parse(data) : [];
  }
};
```

---

## Layout de Dashboard con Sidebar y Header

Un dashboard moderno y premium utiliza un diseño colapsable fluido con efectos de glassmorphism y barras de herramientas superiores con branding dinámico de la empresa.

### Estructura HTML Base (`dashboard.html`)

```html
<div class="saas-layout">
  <!-- SIDEBAR LATERAL -->
  <aside class="saas-sidebar" id="sidebar">
    <div class="sidebar-brand">
      <div class="brand-logo" id="company-logo">🏢</div>
      <div class="brand-info">
        <h2 class="brand-name" id="company-name">Cargando...</h2>
        <span class="brand-tagline">Panel Central</span>
      </div>
    </div>
    
    <nav class="sidebar-nav">
      <ul>
        <li>
          <a href="dashboard.html" class="nav-item active">
            <span class="nav-icon">📊</span>
            <span class="nav-text">Dashboard</span>
          </a>
        </li>
        <li>
          <a href="agenda.html" class="nav-item">
            <span class="nav-icon">📅</span>
            <span class="nav-text">Agenda</span>
          </a>
        </li>
        <li>
          <a href="pacientes.html" class="nav-item">
            <span class="nav-icon">👥</span>
            <span class="nav-text">Pacientes</span>
          </a>
        </li>
        <li>
          <a href="presupuestos.html" class="nav-item">
            <span class="nav-icon">💵</span>
            <span class="nav-text">Presupuestos</span>
          </a>
        </li>
        <li>
          <a href="configuracion.html" class="nav-item">
            <span class="nav-icon">⚙️</span>
            <span class="nav-text">Configuración</span>
          </a>
        </li>
      </ul>
    </nav>

    <div class="sidebar-footer">
      <button class="btn-logout" onclick="Auth.logout()">
        <span class="nav-icon">🚪</span>
        <span class="nav-text">Cerrar Sesión</span>
      </button>
    </div>
  </aside>

  <!-- CONTENEDOR PRINCIPAL -->
  <main class="saas-main">
    <!-- HEADER SUPERIOR -->
    <header class="saas-header">
      <div class="header-left">
        <button class="btn-toggle-sidebar" id="btn-toggle" aria-label="Alternar menú">
          🍔
        </button>
        <h1 class="page-title">Resumen Operativo</h1>
      </div>
      <div class="header-right">
        <!-- Notificaciones -->
        <div class="header-notification dropdown">
          <button class="btn-icon" id="btn-notifications">🔔<span class="badge">3</span></button>
        </div>
        <!-- Perfil Usuario -->
        <div class="header-profile">
          <div class="user-avatar" id="user-avatar">SE</div>
          <div class="user-meta">
            <span class="user-name" id="user-name">Dr. Sebastián</span>
            <span class="user-role" id="user-role">Dentista Principal</span>
          </div>
        </div>
      </div>
    </header>

    <!-- ÁREA DE CONTENIDO -->
    <div class="saas-content">
      <!-- Inyección dinámica de widgets/paneles -->
    </div>
  </main>
</div>
```

### Estilos CSS Core (`dashboard.css`)

```css
.saas-layout {
  display: flex;
  min-height: 100vh;
  background: var(--color-bg-primary);
  overflow: hidden;
}

.saas-sidebar {
  width: var(--sidebar-width);
  background: var(--color-bg-secondary);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  transition: width var(--duration-normal) var(--ease-out);
  z-index: var(--z-sticky);
}

.saas-sidebar.collapsed {
  width: var(--sidebar-collapsed);
}

.saas-sidebar.collapsed .nav-text,
.saas-sidebar.collapsed .brand-info,
.saas-sidebar.collapsed .brand-tagline {
  display: none;
}

.sidebar-brand {
  height: var(--header-height);
  padding: 0 var(--space-4);
  display: flex;
  align-items: center;
  gap: var(--space-3);
  border-bottom: 1px solid var(--color-border);
}

.brand-logo {
  font-size: var(--text-2xl);
  min-width: 40px;
  text-align: center;
}

.brand-name {
  font-family: var(--font-heading);
  font-size: var(--text-base);
  font-weight: 700;
  color: var(--color-text-primary);
}

.brand-tagline {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.sidebar-nav {
  flex: 1;
  padding: var(--space-4) 0;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-5);
  color: var(--color-text-secondary);
  border-left: 3px solid transparent;
  transition: all var(--duration-fast) var(--ease-out);
}

.nav-item:hover, .nav-item.active {
  color: var(--color-text-primary);
  background: var(--color-bg-card-hover);
  border-left-color: var(--company-accent, var(--color-accent-primary));
}

.nav-icon {
  font-size: var(--text-lg);
  min-width: 24px;
  text-align: center;
}

.saas-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow-y: auto;
}

.saas-header {
  height: var(--header-height);
  background: rgba(18, 18, 26, 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-6);
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
}

.header-left, .header-right {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.btn-toggle-sidebar {
  font-size: var(--text-xl);
  color: var(--color-text-secondary);
  display: none; /* Se activa en responsivo */
}

@media (max-width: 768px) {
  .btn-toggle-sidebar {
    display: block;
  }
  .saas-sidebar {
    position: fixed;
    left: -100%;
    height: 100vh;
  }
  .saas-sidebar.active {
    left: 0;
    width: var(--sidebar-width);
  }
}
```

---

## Tarjetas KPI y Gráficos Interactivos

Los indicadores clave de rendimiento (KPIs) deben presentarse de manera clara y llamativa, con micro-interacciones de hover y gráficos embebidos (ej. usando Chart.js).

### Grid de KPI Moderno

```html
<div class="kpi-grid">
  <!-- Tarjeta KPI Individual -->
  <div class="kpi-card glass-card">
    <div class="kpi-header">
      <span class="kpi-title">Ingresos Mensuales</span>
      <span class="kpi-icon">💰</span>
    </div>
    <div class="kpi-value" id="kpi-revenue">$4,850.00</div>
    <div class="kpi-trend trend-up">
      <span>▲ 12.5%</span> desde el mes pasado
    </div>
  </div>

  <div class="kpi-card glass-card">
    <div class="kpi-header">
      <span class="kpi-title">Nuevos Pacientes</span>
      <span class="kpi-icon">👥</span>
    </div>
    <div class="kpi-value" id="kpi-patients">48</div>
    <div class="kpi-trend trend-up">
      <span>▲ 8.3%</span> esta semana
    </div>
  </div>

  <div class="kpi-card glass-card">
    <div class="kpi-header">
      <span class="kpi-title">Tasa de Ocupación</span>
      <span class="kpi-icon">📅</span>
    </div>
    <div class="kpi-value" id="kpi-occupancy">87%</div>
    <div class="kpi-trend trend-down">
      <span>▼ 2.1%</span> vs promedio anual
    </div>
  </div>
</div>
```

### Integración de Gráficos (Chart.js)

```javascript
/**
 * Inicialización de gráficos premium en el Dashboard
 */
function initCharts() {
  const ctx = document.getElementById('revenueChart').getContext('2d');
  
  // Color de acento dinámico de la empresa
  const accentColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--company-accent').trim() || '#a78bfa';

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
      datasets: [{
        label: 'Ventas Mensuales ($)',
        data: [1200, 1900, 3000, 5000, 4800, 6500],
        borderColor: accentColor,
        backgroundColor: 'rgba(167, 139, 250, 0.05)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
        pointBackgroundColor: accentColor
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: 'rgba(255, 255, 255, 0.5)' }
        },
        x: {
          grid: { display: false },
          ticks: { color: 'rgba(255, 255, 255, 0.5)' }
        }
      }
    }
  });
}
```

---

## Gestión de Usuarios, Roles y Permisos

Para soportar SaaS empresarial, el sistema debe administrar perfiles y restringir accesos según el nivel del usuario.

### Roles Estándar y Definición de Permisos

```javascript
const RBAC = {
  Roles: {
    ADMIN: 'admin',
    DENTIST: 'dentist',
    RECEPTIONIST: 'receptionist',
    SUPPORT: 'support'
  },

  Permissions: {
    VIEW_FINANCES: 'view_finances',
    MANAGE_DENTISTS: 'manage_dentists',
    EDIT_CLINIC_HISTORY: 'edit_clinic_history',
    BOOK_APPOINTMENTS: 'book_appointments',
    DELETE_RECORDS: 'delete_records'
  },

  // Matriz de Roles vs Permisos
  RolePermissions: {
    admin: ['view_finances', 'manage_dentists', 'edit_clinic_history', 'book_appointments', 'delete_records'],
    dentist: ['edit_clinic_history', 'book_appointments'],
    receptionist: ['book_appointments'],
    support: ['view_finances', 'manage_dentists']
  },

  /**
   * Valida si el usuario activo tiene un permiso específico
   * @param {string} permission - Nombre del permiso
   * @returns {boolean}
   */
  hasPermission(permission) {
    const activeUser = JSON.parse(sessionStorage.getItem('active_user'));
    if (!activeUser || !activeUser.role) return false;
    
    const userPermissions = this.RolePermissions[activeUser.role] || [];
    return userPermissions.includes(permission);
  },

  /**
   * Guarda de UI: oculta elementos que requieran permisos no asignados
   */
  secureUI() {
    document.querySelectorAll('[data-require-permission]').forEach(el => {
      const permission = el.getAttribute('data-require-permission');
      if (!this.hasPermission(permission)) {
        el.style.display = 'none'; // U ocultar de forma segura
      }
    });
  }
};
```

---

## Facturación, Planes y Suscripciones

La visualización e interactividad del módulo de cobro deben generar confianza. Se implementa una interfaz de selección de planes y visualización del estado de facturación.

### UI de Selección de Planes (Pricing Layout)

```html
<div class="pricing-container">
  <div class="plan-card glass-card">
    <h3 class="plan-name">Básico</h3>
    <div class="plan-price">$29<span>/mes</span></div>
    <ul class="plan-features">
      <li>✓ Hasta 150 Pacientes</li>
      <li>✓ Agenda Digital Completa</li>
      <li>✓ 1 Profesional Incluido</li>
      <li>✗ Soporte 24/7</li>
    </ul>
    <button class="glass-btn glass-btn-outline">Elegir Plan</button>
  </div>

  <div class="plan-card glass-card popular">
    <div class="badge-popular">Recomendado</div>
    <h3 class="plan-name">Clínica Pro</h3>
    <div class="plan-price">$79<span>/mes</span></div>
    <ul class="plan-features">
      <li>✓ Pacientes Ilimitados</li>
      <li>✓ Agenda e Historias Clínicas</li>
      <li>✓ Odontograma SVG Interactivo</li>
      <li>✓ Hasta 5 Profesionales</li>
      <li>✓ Soporte Prioritario</li>
    </ul>
    <button class="glass-btn">Activar Pro</button>
  </div>
</div>
```

---

## Pantalla de Configuración del Sistema

Permite a las MiPyMEs configurar su identidad corporativa, que luego será utilizada para personalizar las interfaces del sistema y los PDFs generados.

```html
<form id="settings-form" class="settings-form glass-card" onsubmit="saveSettings(event)">
  <h2 class="form-title">Configuración de la Clínica</h2>
  
  <div class="form-group">
    <label for="clinic-name">Nombre de la Clínica</label>
    <input type="text" id="clinic-name" class="glass-input" required>
  </div>

  <div class="form-group">
    <label for="clinic-accent">Color de Acento Principal</label>
    <div class="color-picker-wrapper">
      <input type="color" id="clinic-accent" class="color-picker">
      <span class="color-value">#a78bfa</span>
    </div>
  </div>

  <div class="form-group">
    <label for="clinic-currency">Moneda de Facturación</label>
    <select id="clinic-currency" class="glass-input">
      <option value="MXN">Peso Mexicano (MXN)</option>
      <option value="USD">Dólar Estadounidense (USD)</option>
      <option value="CLP">Peso Chileno (CLP)</option>
    </select>
  </div>

  <button type="submit" class="glass-btn">Guardar Configuración</button>
</form>
```

---

## Módulo CRM (Gestión de Clientes y Leads)

Para captar clientes e impulsar negocios, se requiere un módulo ágil para monitorear prospectos y automatizar el contacto de cobranza o recordatorio.

```javascript
/**
 * Lógica básica de CRM y Seguimiento
 */
const CRMModule = {
  STORAGE_KEY: 'crm_leads',

  getLeads() {
    return TenantManager.readData(this.STORAGE_KEY) || [];
  },

  addLead(leadData) {
    const leads = this.getLeads();
    const newLead = {
      id: crypto.randomUUID(),
      name: leadData.name,
      phone: leadData.phone,
      email: leadData.email,
      status: 'prospecto', // 'prospecto' | 'contactado' | 'agendado' | 'perdido'
      notes: leadData.notes || '',
      createdAt: Date.now()
    };
    leads.push(newLead);
    TenantManager.saveData(this.STORAGE_KEY, leads);
    return newLead;
  },

  updateLeadStatus(leadId, newStatus) {
    const leads = this.getLeads();
    const lead = leads.find(l => l.id === leadId);
    if (lead) {
      lead.status = newStatus;
      TenantManager.saveData(this.STORAGE_KEY, leads);
    }
  },

  sendWhatsAppReminder(lead) {
    const message = `Hola ${lead.name}, te escribimos de ${document.getElementById('company-name').textContent} para recordar que tu cita o cotización está lista. ¡Contáctanos!`;
    const url = `https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  }
};
```

---

## Integración con APIs (Fetch, Loading y Errores)

Las solicitudes a servidores externos deben proveer retroalimentación visual al usuario en caso de carga o problemas de red.

```javascript
/**
 * Conector de API Seguro e Premium
 */
const APIConnector = {
  /**
   * Realiza un fetch seguro con spinner de carga y control de errores
   * @param {string} url
   * @param {Object} [options]
   */
  async request(url, options = {}) {
    this.showSpinner();
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('saas_token')}`
        },
        ...options
      });
      
      if (!response.ok) {
        throw new Error(`Error del Servidor: ${response.statusText} (${response.status})`);
      }
      
      return await response.json();
    } catch (error) {
      this.showToast(error.message, 'error');
      throw error;
    } finally {
      this.hideSpinner();
    }
  },

  showSpinner() {
    const loader = document.getElementById('global-loader') || (() => {
      const div = document.createElement('div');
      div.id = 'global-loader';
      div.className = 'loader-overlay';
      div.innerHTML = `<div class="spinner"></div>`;
      document.body.appendChild(div);
      return div;
    })();
    loader.classList.add('visible');
  },

  hideSpinner() {
    const loader = document.getElementById('global-loader');
    if (loader) loader.classList.remove('visible');
  },

  showToast(msg, type) {
    if (window.Componente && window.Componente.crearToast) {
      window.Componente.crearToast(msg, type);
    } else {
      alert(`${type.toUpperCase()}: ${msg}`);
    }
  }
};
```

---

## Checklist de Validación SaaS

Antes de desplegar cualquier plataforma SaaS, valide lo siguiente:
- [ ] **Aislamiento Multi-Tenant**: Verifique que los datos creados por la Empresa A no sean visibles de ninguna manera al iniciar sesión con la Empresa B.
- [ ] **Seguridad de Rutas (RBAC)**: Si un usuario tiene rol `receptionist`, asegure que los módulos financieros no carguen en su pantalla.
- [ ] **Consistencia de Marca**: Valide que los colores primarios y logos cambien inmediatamente sin parpadeos visuales al cambiar de cuenta.
- [ ] **Manejo de Errores en APIs**: Desconecte la red local y verifique que la interfaz informe adecuadamente el error de conexión sin bloquear la app.
