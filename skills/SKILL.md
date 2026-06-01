---
name: ondigital-web-generator
description: Skill maestro para generar, editar y revisar landing pages, SaaS, sistemas con datos, apps HTML y apps Flutter para MiPyMEs, incluyendo el sitio/app OnDental. Use when an agent needs ONDIGITAL production guidance, Spanish UI copy, design system rules, security gates, dental references, and the correct sub-skill selection.
---

# ONDIGITAL — Skill Maestro de Generación Web

> Este skill orquesta la creación de sitios web profesionales, plataformas SaaS
> y sistemas de gestión para MiPyMEs mexicanas y latinoamericanas.
> Todas las interfaces generadas DEBEN estar en **español**.

---

## Metadata

- Version: 2.3.0
- Author: ONDIGITAL
- Mode: prototype + production guidance
- Platform: desktop + mobile + Flutter
- Primary domains: web, SaaS, landing pages, database systems, Flutter, security, product UI, dental apps.

## Mapa De Carpetas

- `core/`: producción HTML y revisión visual/técnica.
- `product/`: landing pages, SaaS premium y patrones de UI operacional.
- `data/`: persistencia, CRUD, local-first y bases de datos.
- `flutter/`: producción Flutter y skills oficiales especializadas.
- `security/`: auth, access control, hardening web, auditoría de skills.
- `design/`: sistema visual, tokens y componentes.
- `support/`: utilidades reutilizables.

## Dependencias

- `skills/product/saas-platform/SKILL.md`
- `skills/product/landing-page/SKILL.md`
- `skills/product/saas-product-ui/SKILL.md`
- `skills/data/database-system/SKILL.md`
- `skills/core/html-app-production/SKILL.md`
- `skills/core/frontend-quality-review/SKILL.md`
- `skills/flutter/flutter-app-production/SKILL.md`
- `skills/flutter/flutter-add-integration-test/SKILL.md`
- `skills/flutter/flutter-add-widget-preview/SKILL.md`
- `skills/flutter/flutter-add-widget-test/SKILL.md`
- `skills/flutter/flutter-apply-architecture-best-practices/SKILL.md`
- `skills/flutter/flutter-build-responsive-layout/SKILL.md`
- `skills/flutter/flutter-fix-layout-issues/SKILL.md`
- `skills/flutter/flutter-implement-json-serialization/SKILL.md`
- `skills/flutter/flutter-setup-declarative-routing/SKILL.md`
- `skills/flutter/flutter-setup-localization/SKILL.md`
- `skills/flutter/flutter-use-http-package/SKILL.md`
- `skills/security/app-security-review/SKILL.md`
- `skills/security/auth-access-control/SKILL.md`
- `skills/security/web-security-hardening/SKILL.md`
- `skills/security/skill-supply-chain-audit/SKILL.md`
- `skills/design/design-systems/DESIGN.md`
- `skills/support/tools/TOOLS.md`
- `skills/dental-references.md`

## Precedencia

Cuando haya conflicto entre ejemplos antiguos y skills nuevas:

- Para HTML/apps, seguir primero `skills/core/html-app-production/SKILL.md`.
- Para SaaS, seguir primero `skills/product/saas-product-ui/SKILL.md`.
- Para seguridad, seguir primero `skills/security/auth-access-control/SKILL.md` y `skills/security/app-security-review/SKILL.md`.
- Para visual QA, cerrar con `skills/core/frontend-quality-review/SKILL.md`.

## 📋 Índice

1. [Filosofía de Diseño](#filosofía-de-diseño)
2. [Sistema de Diseño — Variables Globales](#sistema-de-diseño--variables-globales)
3. [Estética Glassmorphism Premium](#estética-glassmorphism-premium)
4. [Patrones de Código HTML/CSS/JS](#patrones-de-código-htmlcssjs)
5. [Patrones de Autenticación](#patrones-de-autenticación)
6. [Patrones de localStorage y Base de Datos](#patrones-de-localstorage-y-base-de-datos)
7. [Diseño Responsivo](#diseño-responsivo)
8. [Accesibilidad (a11y)](#accesibilidad-a11y)
9. [SEO](#seo)
10. [Interfaz en Español](#interfaz-en-español)
11. [Anti-Patrones](#anti-patrones)
12. [Checklist de Auto-Crítica](#checklist-de-auto-crítica)
13. [Selección de Sub-Skill](#selección-de-sub-skill)
14. [Reglas de Seguridad de Producción](#reglas-de-seguridad-de-producción)

---

## Filosofía de Diseño

### Principios Fundamentales

1. **Profesionalismo Accesible**: Diseños de nivel enterprise pero comprensibles para el dueño de una farmacia o tienda.
2. **Mobile-First Real**: No adaptar desktop a móvil; diseñar primero para la pantalla de 375px.
3. **Velocidad sobre Animación**: Priorizar carga rápida. Las animaciones son opcionales y sutiles.
4. **Español Nativo**: No traducir del inglés; redactar naturalmente en español mexicano.
5. **Funcionalidad Primero**: Cada elemento visual debe tener un propósito funcional claro.
6. **Autonomía del Cliente**: El resultado debe poder ser editado por alguien con conocimientos básicos.
7. **Cero Dependencias Pesadas**: Preferir vanilla JS + CSS custom properties. Frameworks solo si el proyecto lo justifica.

### Tipos de Proyecto

| Tipo | Contacto | Ejemplo | Sub-Skill |
|------|----------|---------|-----------|
| **Contacto Directo** | WhatsApp, teléfono, visita | Farmacia, clínica, taller | `landing-page` + `html-app-production` |
| **Contacto Indirecto** | Carrito, formulario, catálogo | Tienda online, consultoría | `landing-page` + `database-system` + `html-app-production` |
| **Plataforma SaaS** | Dashboard, multi-usuario | CRM, ERP, gestión | `saas-platform` + `saas-product-ui` + `database-system` |
| **Sistema Interno** | Solo empleados | Inventario, nómina | `saas-product-ui` + `database-system` |
| **App Flutter** | App móvil/web/desktop | POS, agenda, CRM móvil | `flutter-app-production` + skills Flutter específicas |

---

## Sistema de Diseño — Variables Globales

### Variables CSS Root

```css
:root {
  /* ═══ PALETA PRIMARIA (DARK PREMIUM) ═══ */
  --color-bg-primary: #0a0a0f;
  --color-bg-secondary: #12121a;
  --color-bg-tertiary: #1a1a2e;
  --color-bg-card: rgba(255, 255, 255, 0.03);
  --color-bg-card-hover: rgba(255, 255, 255, 0.06);
  --color-bg-input: rgba(255, 255, 255, 0.05);

  --color-text-primary: #ffffff;
  --color-text-secondary: rgba(255, 255, 255, 0.7);
  --color-text-tertiary: rgba(255, 255, 255, 0.4);
  --color-text-accent: #a78bfa;

  --color-accent-primary: #a78bfa;      /* Violeta premium */
  --color-accent-secondary: #818cf8;    /* Índigo */
  --color-accent-success: #34d399;      /* Verde esmeralda */
  --color-accent-warning: #fbbf24;      /* Ámbar */
  --color-accent-danger: #f87171;       /* Rojo coral */
  --color-accent-info: #38bdf8;         /* Azul cielo */

  --color-border: rgba(255, 255, 255, 0.08);
  --color-border-focus: var(--color-accent-primary);
  --color-border-hover: rgba(255, 255, 255, 0.15);

  /* ═══ PALETA LIGHT (PROFESIONAL LIMPIO) ═══ */
  --light-bg-primary: #fafafa;
  --light-bg-secondary: #ffffff;
  --light-bg-card: #ffffff;
  --light-text-primary: #1a1a2e;
  --light-text-secondary: #64748b;
  --light-border: #e2e8f0;

  /* ═══ TIPOGRAFÍA ═══ */
  --font-display: 'Syne', sans-serif;
  --font-heading: 'Outfit', sans-serif;
  --font-body: 'DM Sans', sans-serif;
  --font-mono: 'Space Grotesk', monospace;
  --font-ui: 'Inter', sans-serif;

  --text-xs: 0.75rem;     /* 12px */
  --text-sm: 0.875rem;    /* 14px */
  --text-base: 1rem;      /* 16px */
  --text-lg: 1.125rem;    /* 18px */
  --text-xl: 1.25rem;     /* 20px */
  --text-2xl: 1.5rem;     /* 24px */
  --text-3xl: 1.875rem;   /* 30px */
  --text-4xl: 2.25rem;    /* 36px */
  --text-5xl: 3rem;       /* 48px */
  --text-6xl: 3.75rem;    /* 60px */
  --text-7xl: 4.5rem;     /* 72px */

  --leading-tight: 1.15;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;

  --tracking-tight: -0.02em;
  --tracking-normal: 0;
  --tracking-wide: 0.05em;

  /* ═══ ESPACIADO (base 4px) ═══ */
  --space-0: 0;
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */
  --space-20: 5rem;     /* 80px */
  --space-24: 6rem;     /* 96px */
  --space-32: 8rem;     /* 128px */

  /* ═══ BORDES ═══ */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-2xl: 32px;
  --radius-full: 9999px;

  /* ═══ SOMBRAS ═══ */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.5);
  --shadow-xl: 0 16px 48px rgba(0, 0, 0, 0.6);
  --shadow-glow: 0 0 30px rgba(167, 139, 250, 0.15);
  --shadow-glow-accent: 0 0 40px rgba(167, 139, 250, 0.25);

  /* ═══ TRANSICIONES ═══ */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 400ms;
  --duration-slower: 600ms;

  /* ═══ Z-INDEX ═══ */
  --z-base: 1;
  --z-dropdown: 100;
  --z-sticky: 200;
  --z-overlay: 300;
  --z-modal: 400;
  --z-toast: 500;
  --z-tooltip: 600;

  /* ═══ LAYOUT ═══ */
  --container-sm: 640px;
  --container-md: 768px;
  --container-lg: 1024px;
  --container-xl: 1280px;
  --container-2xl: 1440px;
  --sidebar-width: 280px;
  --sidebar-collapsed: 72px;
  --header-height: 64px;
}
```

### Google Fonts Import

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300..700;1,9..40,300..700&family=Inter:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&family=Syne:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

---

## Estética Glassmorphism Premium

### Receta Base para Glassmorphism

```css
/* ═══ CARD GLASSMORPHISM ═══ */
.glass-card {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  transition: all var(--duration-normal) var(--ease-out);
}

.glass-card:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.15);
  box-shadow: var(--shadow-glow);
  transform: translateY(-2px);
}

/* ═══ GLASS CARD CON BORDE GRADIENTE ═══ */
.glass-card-gradient {
  position: relative;
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  overflow: hidden;
}

.glass-card-gradient::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(
    135deg,
    rgba(167, 139, 250, 0.3),
    rgba(129, 140, 248, 0.1),
    transparent 60%
  );
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}

/* ═══ INPUT GLASSMORPHISM ═══ */
.glass-input {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  background: var(--color-bg-input);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-family: var(--font-body);
  font-size: var(--text-base);
  transition: all var(--duration-fast) var(--ease-out);
  outline: none;
}

.glass-input:focus {
  border-color: var(--color-accent-primary);
  box-shadow: 0 0 0 3px rgba(167, 139, 250, 0.15);
  background: rgba(255, 255, 255, 0.07);
}

.glass-input::placeholder {
  color: var(--color-text-tertiary);
}

/* ═══ BOTÓN GLASSMORPHISM ═══ */
.glass-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-6);
  background: linear-gradient(135deg, var(--color-accent-primary), var(--color-accent-secondary));
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-family: var(--font-ui);
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  transition: all var(--duration-normal) var(--ease-out);
  position: relative;
  overflow: hidden;
}

.glass-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, transparent, rgba(255, 255, 255, 0.15));
  opacity: 0;
  transition: opacity var(--duration-fast);
}

.glass-btn:hover::before {
  opacity: 1;
}

.glass-btn:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-glow-accent);
}

.glass-btn:active {
  transform: translateY(0);
}

/* Variante outline */
.glass-btn-outline {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
}

.glass-btn-outline:hover {
  border-color: var(--color-accent-primary);
  color: var(--color-accent-primary);
  background: rgba(167, 139, 250, 0.05);
}
```

### Fondos con Orbes de Gradiente

```css
/* ═══ FONDO PREMIUM CON ORBES ═══ */
.bg-premium {
  background: var(--color-bg-primary);
  position: relative;
  overflow: hidden;
}

.bg-premium::before,
.bg-premium::after {
  content: '';
  position: fixed;
  border-radius: 50%;
  filter: blur(120px);
  pointer-events: none;
  z-index: 0;
}

.bg-premium::before {
  width: 600px;
  height: 600px;
  top: -200px;
  right: -100px;
  background: radial-gradient(circle, rgba(167, 139, 250, 0.08), transparent 70%);
}

.bg-premium::after {
  width: 500px;
  height: 500px;
  bottom: -150px;
  left: -100px;
  background: radial-gradient(circle, rgba(129, 140, 248, 0.06), transparent 70%);
}

/* Mesh gradient para fondos hero */
.bg-mesh {
  background:
    radial-gradient(at 20% 20%, rgba(167, 139, 250, 0.08) 0, transparent 50%),
    radial-gradient(at 80% 80%, rgba(56, 189, 248, 0.06) 0, transparent 50%),
    radial-gradient(at 50% 50%, rgba(52, 211, 153, 0.04) 0, transparent 50%),
    var(--color-bg-primary);
}
```

---

## Patrones de Código HTML/CSS/JS

### Estructura Base HTML

```html
<!DOCTYPE html>
<html lang="es-MX">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="[Descripción SEO en español — máximo 155 caracteres]">
  <meta name="theme-color" content="#0a0a0f">

  <!-- Open Graph -->
  <meta property="og:title" content="[Título del Negocio]">
  <meta property="og:description" content="[Descripción corta]">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="es_MX">

  <title>[Nombre del Negocio] — [Tagline]</title>

  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Outfit:wght@400;600;700&family=Syne:wght@700;800&display=swap" rel="stylesheet">

  <style>
    /* Variables CSS — importar desde design-systems/DESIGN.md */
    :root { /* ... */ }

    /* Reset mínimo */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body {
      font-family: var(--font-body);
      background: var(--color-bg-primary);
      color: var(--color-text-primary);
      line-height: var(--leading-normal);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    img { max-width: 100%; height: auto; display: block; }
    a { color: inherit; text-decoration: none; }
    button { cursor: pointer; border: none; background: none; font: inherit; }
    ul, ol { list-style: none; }
  </style>
</head>
<body class="bg-premium">
  <!-- Contenido aquí -->

  <script>
    // JavaScript vanilla — sin frameworks pesados
  </script>
</body>
</html>
```

### Patrón de Componente JS Reutilizable

```javascript
/**
 * Componente reutilizable — patrón ONDIGITAL
 * Cada componente es una función que retorna su elemento DOM
 */
const Componente = {
  /**
   * Crea una tarjeta glass con título y contenido
   * @param {Object} opciones
   * @param {string} opciones.titulo - Título de la tarjeta
   * @param {string} opciones.contenido - HTML del contenido
   * @param {string} [opciones.icono] - SVG inline del ícono
   * @returns {HTMLElement}
   */
  crearTarjeta({ titulo, contenido, icono = '' }) {
    const tarjeta = document.createElement('div');
    tarjeta.className = 'glass-card';
    tarjeta.innerHTML = `
      <div class="card-header">
        ${icono ? `<span class="card-icon">${icono}</span>` : ''}
        <h3 class="card-title">${titulo}</h3>
      </div>
      <div class="card-body">${contenido}</div>
    `;
    return tarjeta;
  },

  /**
   * Crea un sistema de notificaciones toast
   */
  crearToast(mensaje, tipo = 'info', duracion = 3000) {
    const contenedor = document.getElementById('toast-container') ||
      (() => {
        const c = document.createElement('div');
        c.id = 'toast-container';
        c.style.cssText = `
          position: fixed; top: var(--space-4); right: var(--space-4);
          display: flex; flex-direction: column; gap: var(--space-3);
          z-index: var(--z-toast); pointer-events: none;
        `;
        document.body.appendChild(c);
        return c;
      })();

    const colores = {
      success: 'var(--color-accent-success)',
      error: 'var(--color-accent-danger)',
      warning: 'var(--color-accent-warning)',
      info: 'var(--color-accent-info)'
    };

    const toast = document.createElement('div');
    toast.style.cssText = `
      background: var(--color-bg-tertiary);
      border: 1px solid var(--color-border);
      border-left: 3px solid ${colores[tipo]};
      border-radius: var(--radius-md);
      padding: var(--space-3) var(--space-4);
      color: var(--color-text-primary);
      font-family: var(--font-body);
      font-size: var(--text-sm);
      backdrop-filter: blur(12px);
      pointer-events: auto;
      animation: toastEntrar 0.3s var(--ease-out);
      max-width: 380px;
    `;
    toast.textContent = mensaje;
    contenedor.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'toastSalir 0.3s var(--ease-out) forwards';
      toast.addEventListener('animationend', () => toast.remove());
    }, duracion);
  }
};
```

---

## Patrones de Autenticación

### Multi-Tenant con localStorage (Demo)

```javascript
/**
 * Sistema de autenticación multi-empresa para demos
 * En producción, reemplazar con Firebase Auth / JWT
 */
const Auth = {
  STORAGE_KEY: 'ondigital_auth',
  EMPRESAS_KEY: 'ondigital_empresas',

  /**
   * Estructura de usuario
   * @typedef {Object} Usuario
   * @property {string} id
   * @property {string} nombre
   * @property {string} email
   * @property {string} empresaId
   * @property {string} rol - 'admin' | 'gerente' | 'empleado' | 'viewer'
   * @property {string} avatar
   * @property {number} creadoEn
   */

  /**
   * Estructura de empresa (tenant)
   * @typedef {Object} Empresa
   * @property {string} id
   * @property {string} nombre
   * @property {string} rfc
   * @property {string} plan - 'basico' | 'profesional' | 'enterprise'
   * @property {Object} config
   * @property {string} config.colorPrimario
   * @property {string} config.logo
   */

  iniciarSesion(email, contrasena) {
    const usuarios = JSON.parse(localStorage.getItem('ondigital_usuarios') || '[]');
    const usuario = usuarios.find(u => u.email === email);

    if (!usuario) {
      return { exito: false, error: 'Correo electrónico no registrado' };
    }

    // En demo: comparar directamente. Producción: bcrypt hash
    if (usuario.contrasena !== contrasena) {
      return { exito: false, error: 'Contraseña incorrecta' };
    }

    const sesion = {
      usuario: { ...usuario, contrasena: undefined },
      token: this._generarToken(),
      expira: Date.now() + (24 * 60 * 60 * 1000) // 24 horas
    };

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sesion));
    return { exito: true, sesion };
  },

  cerrarSesion() {
    localStorage.removeItem(this.STORAGE_KEY);
    window.location.href = '/login.html';
  },

  obtenerSesion() {
    const datos = localStorage.getItem(this.STORAGE_KEY);
    if (!datos) return null;

    const sesion = JSON.parse(datos);
    if (Date.now() > sesion.expira) {
      this.cerrarSesion();
      return null;
    }
    return sesion;
  },

  verificarPermiso(permiso) {
    const sesion = this.obtenerSesion();
    if (!sesion) return false;

    const permisos = {
      admin: ['todo'],
      gerente: ['leer', 'escribir', 'reportes', 'usuarios'],
      empleado: ['leer', 'escribir'],
      viewer: ['leer']
    };

    const rolPermisos = permisos[sesion.usuario.rol] || [];
    return rolPermisos.includes('todo') || rolPermisos.includes(permiso);
  },

  /**
   * Middleware: proteger página
   * Llamar al inicio de cada página protegida
   */
  protegerPagina(rolesPermitidos = []) {
    const sesion = this.obtenerSesion();
    if (!sesion) {
      window.location.href = '/login.html';
      return null;
    }
    if (rolesPermitidos.length > 0 && !rolesPermitidos.includes(sesion.usuario.rol)) {
      window.location.href = '/sin-acceso.html';
      return null;
    }
    return sesion;
  },

  _generarToken() {
    return 'tk_' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
  }
};
```

### Multi-Empresa: Aislar Datos por Tenant

```javascript
/**
 * Patrón para aislar datos por empresa en localStorage
 * Cada clave se prefija con el ID de la empresa
 */
const DatosEmpresa = {
  _prefix() {
    const sesion = Auth.obtenerSesion();
    if (!sesion) throw new Error('Sin sesión activa');
    return `emp_${sesion.usuario.empresaId}_`;
  },

  guardar(coleccion, datos) {
    const clave = this._prefix() + coleccion;
    const existente = JSON.parse(localStorage.getItem(clave) || '[]');
    if (Array.isArray(datos)) {
      localStorage.setItem(clave, JSON.stringify(datos));
    } else {
      datos.id = datos.id || crypto.randomUUID();
      datos.creadoEn = datos.creadoEn || Date.now();
      datos.actualizadoEn = Date.now();
      existente.push(datos);
      localStorage.setItem(clave, JSON.stringify(existente));
    }
    return datos;
  },

  obtener(coleccion) {
    const clave = this._prefix() + coleccion;
    return JSON.parse(localStorage.getItem(clave) || '[]');
  },

  actualizar(coleccion, id, cambios) {
    const items = this.obtener(coleccion);
    const indice = items.findIndex(i => i.id === id);
    if (indice === -1) return null;
    items[indice] = { ...items[indice], ...cambios, actualizadoEn: Date.now() };
    this.guardar(coleccion, items);
    return items[indice];
  },

  eliminar(coleccion, id) {
    const items = this.obtener(coleccion).filter(i => i.id !== id);
    this.guardar(coleccion, items);
  }
};
```

---

## Patrones de localStorage y Base de Datos

### Capa de Abstracción de Datos

```javascript
/**
 * Capa de abstracción que permite cambiar entre localStorage y Firebase
 * sin modificar el código de la aplicación
 */
class BaseDatos {
  constructor(backend = 'local') {
    this.backend = backend;
  }

  async obtenerTodos(coleccion, filtros = {}) {
    if (this.backend === 'local') {
      let datos = DatosEmpresa.obtener(coleccion);

      // Aplicar filtros
      Object.entries(filtros).forEach(([campo, valor]) => {
        datos = datos.filter(item => {
          if (typeof valor === 'string') {
            return String(item[campo]).toLowerCase().includes(valor.toLowerCase());
          }
          return item[campo] === valor;
        });
      });

      return datos;
    }

    // Firebase Firestore
    if (this.backend === 'firebase') {
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const q = query(collection(db, coleccion));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
  }

  async crear(coleccion, datos) {
    if (this.backend === 'local') {
      return DatosEmpresa.guardar(coleccion, datos);
    }
    if (this.backend === 'firebase') {
      const { collection, addDoc } = await import('firebase/firestore');
      const ref = await addDoc(collection(db, coleccion), {
        ...datos,
        creadoEn: new Date(),
        actualizadoEn: new Date()
      });
      return { id: ref.id, ...datos };
    }
  }

  async actualizar(coleccion, id, cambios) {
    if (this.backend === 'local') {
      return DatosEmpresa.actualizar(coleccion, id, cambios);
    }
    if (this.backend === 'firebase') {
      const { doc, updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, coleccion, id), {
        ...cambios,
        actualizadoEn: new Date()
      });
      return { id, ...cambios };
    }
  }

  async eliminar(coleccion, id) {
    if (this.backend === 'local') {
      return DatosEmpresa.eliminar(coleccion, id);
    }
    if (this.backend === 'firebase') {
      const { doc, deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, coleccion, id));
    }
  }
}
```

---

## Diseño Responsivo

### Breakpoints Estándar

```css
/* Mobile-first: estilos base son para móvil (< 640px) */

/* Tablet pequeña */
@media (min-width: 640px) {
  .container { max-width: var(--container-sm); }
}

/* Tablet */
@media (min-width: 768px) {
  .container { max-width: var(--container-md); }
}

/* Desktop */
@media (min-width: 1024px) {
  .container { max-width: var(--container-lg); }
}

/* Desktop grande */
@media (min-width: 1280px) {
  .container { max-width: var(--container-xl); }
}

/* Ultrawide */
@media (min-width: 1440px) {
  .container { max-width: var(--container-2xl); }
}
```

### Patrón Grid Responsivo

```css
.grid-responsive {
  display: grid;
  gap: var(--space-6);
  grid-template-columns: 1fr; /* Móvil: 1 columna */
}

@media (min-width: 640px) {
  .grid-responsive { grid-template-columns: repeat(2, 1fr); }
}

@media (min-width: 1024px) {
  .grid-responsive { grid-template-columns: repeat(3, 1fr); }
}

@media (min-width: 1280px) {
  .grid-responsive { grid-template-columns: repeat(4, 1fr); }
}

/* Layout con sidebar */
.layout-sidebar {
  display: grid;
  grid-template-columns: 1fr; /* Móvil: solo contenido */
  min-height: 100vh;
}

@media (min-width: 1024px) {
  .layout-sidebar {
    grid-template-columns: var(--sidebar-width) 1fr;
  }
}
```

---

## Accesibilidad (a11y)

### Reglas Obligatorias

1. **Contraste**: Texto sobre fondos dark debe tener ratio ≥ 4.5:1 (AA).
2. **Focus visible**: Todos los elementos interactivos deben mostrar indicador de foco.
3. **ARIA labels**: Cada ícono sin texto necesita `aria-label`.
4. **Semántica**: Usar `<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`, `<header>`, `<footer>`.
5. **Skip link**: Incluir enlace "Saltar al contenido principal" al inicio.
6. **Formularios**: Cada `<input>` debe tener `<label>` asociado o `aria-label`.

```html
<!-- Skip link -->
<a href="#contenido-principal" class="skip-link">Saltar al contenido principal</a>

<style>
  .skip-link {
    position: absolute;
    top: -40px;
    left: 0;
    background: var(--color-accent-primary);
    color: white;
    padding: var(--space-2) var(--space-4);
    z-index: 1000;
    transition: top 0.2s;
  }
  .skip-link:focus {
    top: 0;
  }
</style>

<!-- Focus visible global -->
<style>
  :focus-visible {
    outline: 2px solid var(--color-accent-primary);
    outline-offset: 2px;
  }
</style>

<!-- Formulario accesible -->
<form role="form" aria-label="Formulario de contacto">
  <div class="campo">
    <label for="nombre">Nombre completo</label>
    <input
      type="text"
      id="nombre"
      name="nombre"
      required
      aria-required="true"
      autocomplete="name"
      placeholder="Ej: María García López"
    >
    <span class="error" role="alert" aria-live="polite"></span>
  </div>
</form>
```

---

## SEO

### Meta Tags Obligatorios

```html
<head>
  <!-- Básicos -->
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="[Descripción del negocio — 120-155 caracteres]">
  <meta name="keywords" content="[palabras clave separadas por coma]">
  <meta name="author" content="[Nombre del negocio]">

  <!-- Open Graph (Facebook, WhatsApp) -->
  <meta property="og:title" content="[Título]">
  <meta property="og:description" content="[Descripción]">
  <meta property="og:image" content="[URL de imagen 1200x630]">
  <meta property="og:url" content="[URL canónica]">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="es_MX">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="[Título]">
  <meta name="twitter:description" content="[Descripción]">
  <meta name="twitter:image" content="[URL de imagen]">

  <!-- Canónica -->
  <link rel="canonical" href="[URL canónica]">

  <!-- Structured Data (JSON-LD) -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": "[Nombre del Negocio]",
    "description": "[Descripción]",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "[Calle]",
      "addressLocality": "[Ciudad]",
      "addressRegion": "[Estado]",
      "postalCode": "[CP]",
      "addressCountry": "MX"
    },
    "telephone": "+52[Teléfono]",
    "openingHours": "Mo-Fr 09:00-18:00",
    "priceRange": "$$"
  }
  </script>

  <title>[Nombre] — [Tagline descriptiva con palabra clave]</title>
</head>
```

### Reglas SEO

- Exactamente 1 `<h1>` por página con palabra clave principal.
- Jerarquía `<h2>` → `<h3>` sin saltar niveles.
- Imágenes con `alt` descriptivo en español.
- URLs amigables con palabras clave: `/servicios/limpieza-dental`.
- Texto mínimo 300 palabras por página.
- Velocidad: LCP < 2.5s, CLS < 0.1.

---

## Interfaz en Español

### Diccionario de Términos UI Estándar

```javascript
const UI_ES = {
  // Acciones
  guardar: 'Guardar',
  cancelar: 'Cancelar',
  eliminar: 'Eliminar',
  editar: 'Editar',
  crear: 'Crear nuevo',
  buscar: 'Buscar...',
  filtrar: 'Filtrar',
  exportar: 'Exportar',
  importar: 'Importar',
  cerrarSesion: 'Cerrar sesión',
  iniciarSesion: 'Iniciar sesión',
  registrarse: 'Crear cuenta',
  enviar: 'Enviar',
  confirmar: 'Confirmar',
  aceptar: 'Aceptar',
  rechazar: 'Rechazar',
  verMas: 'Ver más',
  verTodos: 'Ver todos',
  volver: 'Volver',
  siguiente: 'Siguiente',
  anterior: 'Anterior',
  descargar: 'Descargar',
  compartir: 'Compartir',

  // Estados
  activo: 'Activo',
  inactivo: 'Inactivo',
  pendiente: 'Pendiente',
  completado: 'Completado',
  enProceso: 'En proceso',
  cancelado: 'Cancelado',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',

  // Navegación
  inicio: 'Inicio',
  panel: 'Panel',
  configuracion: 'Configuración',
  perfil: 'Mi perfil',
  ayuda: 'Ayuda',
  notificaciones: 'Notificaciones',

  // Formularios
  nombre: 'Nombre',
  apellido: 'Apellido',
  correo: 'Correo electrónico',
  telefono: 'Teléfono',
  direccion: 'Dirección',
  contrasena: 'Contraseña',
  confirmarContrasena: 'Confirmar contraseña',
  campoRequerido: 'Este campo es requerido',
  correoInvalido: 'Ingresa un correo electrónico válido',
  contrasenaCorta: 'La contraseña debe tener al menos 8 caracteres',

  // Mensajes
  guardadoExitoso: '¡Guardado correctamente!',
  eliminadoExitoso: 'Eliminado correctamente',
  errorGeneral: 'Ocurrió un error. Intenta de nuevo.',
  confirmarEliminar: '¿Estás seguro de que deseas eliminar este elemento?',
  sinResultados: 'No se encontraron resultados',
  cargando: 'Cargando...',

  // Tablas
  mostrando: 'Mostrando',
  de: 'de',
  registros: 'registros',
  porPagina: 'por página',

  // Tiempo
  hoy: 'Hoy',
  ayer: 'Ayer',
  estaSemana: 'Esta semana',
  esteMes: 'Este mes',
  esteAno: 'Este año',
  hace: 'Hace',
  minutos: 'minutos',
  horas: 'horas',
  dias: 'días'
};
```

### Formato de Datos en Español Mexicano

```javascript
const Formato = {
  moneda(cantidad) {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency', currency: 'MXN'
    }).format(cantidad);
  },

  fecha(fecha) {
    return new Intl.DateTimeFormat('es-MX', {
      day: 'numeric', month: 'long', year: 'numeric'
    }).format(new Date(fecha));
  },

  fechaCorta(fecha) {
    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    }).format(new Date(fecha));
  },

  numero(n) {
    return new Intl.NumberFormat('es-MX').format(n);
  },

  telefono(tel) {
    const limpio = tel.replace(/\D/g, '');
    if (limpio.length === 10) {
      return `(${limpio.slice(0,3)}) ${limpio.slice(3,6)}-${limpio.slice(6)}`;
    }
    return tel;
  },

  tiempoRelativo(fecha) {
    const diff = Date.now() - new Date(fecha).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Justo ahora';
    if (mins < 60) return `Hace ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Hace ${hrs}h`;
    const dias = Math.floor(hrs / 24);
    if (dias < 7) return `Hace ${dias}d`;
    return Formato.fechaCorta(fecha);
  }
};
```

---

## Anti-Patrones

### ❌ Lo que NUNCA se debe hacer

| Anti-Patrón | Problema | Solución Correcta |
|-------------|----------|--------------------|
| Usar `px` para font-size | No respeta preferencias del usuario | Usar `rem` |
| Textos en inglés en UI | Público objetivo habla español | Todo en español (es-MX) |
| `!important` en CSS | Imposible de mantener | Usar especificidad correcta |
| `onclick="..."` inline | Mezcla HTML con JS | `addEventListener()` |
| `<div>` para todo | Sin semántica | Usar HTML5 semántico |
| Animaciones > 400ms | Se siente lento | Máximo 300ms para UI |
| `localStorage` sin validación | Datos corruptos | Siempre parsear con try/catch |
| Contraseñas en texto plano | Inseguro | Hash en producción |
| Colores sin suficiente contraste | Inaccesible | Ratio ≥ 4.5:1 |
| Scroll horizontal en móvil | UX terrible | `overflow-x: hidden` + diseño flexible |
| Imágenes sin `alt` | Inaccesible + mal SEO | Siempre `alt` descriptivo |
| Más de 3 fuentes | Carga lenta | Máximo 2-3 fuentes |
| z-index: 999999 | Imposible de gestionar | Usar escala de z-index |
| `alert()` / `confirm()` | Se ve poco profesional | Usar modales y toasts propios |

### ❌ Anti-Patrones de Diseño

- **NO** usar degradados rainbow / neón excesivo
- **NO** texto menor a 14px en contenido principal
- **NO** más de 2 call-to-action en una sección hero
- **NO** autoplay en video/audio sin consentimiento
- **NO** pop-ups al cargar la página (esperar ≥ 30 segundos)
- **NO** sidebar que no colapsa en móvil
- **NO** tablas que no son responsive
- **NO** formularios sin indicadores de campo requerido

---

## Checklist de Auto-Crítica

Antes de entregar cualquier resultado, evaluar en 5 dimensiones:

### 1. 🧠 Filosofía (Propósito)
- [ ] ¿El diseño resuelve un problema real del negocio?
- [ ] ¿El usuario final (dueño de MiPyME) puede entender y usar esto?
- [ ] ¿Se priorizó funcionalidad sobre estética?
- [ ] ¿Todo el texto está en español natural (no traducido)?

### 2. 📐 Jerarquía (Estructura)
- [ ] ¿Hay una clara jerarquía visual (título → subtítulo → contenido)?
- [ ] ¿La navegación es intuitiva y consistente?
- [ ] ¿El flujo de lectura sigue el patrón F o Z?
- [ ] ¿Los CTA están visualmente destacados?

### 3. 🔍 Detalle (Calidad)
- [ ] ¿Los bordes, sombras y espaciados son consistentes?
- [ ] ¿Se usan las variables CSS del sistema de diseño?
- [ ] ¿Las animaciones son sutiles y con propósito?
- [ ] ¿No hay errores de ortografía o gramática?

### 4. ⚡ Función (Rendimiento)
- [ ] ¿Funciona correctamente en móvil (375px)?
- [ ] ¿Los formularios validan correctamente?
- [ ] ¿localStorage se usa con try/catch?
- [ ] ¿Las imágenes están optimizadas (lazy loading)?
- [ ] ¿No hay console.log en producción?

### 5. 💡 Innovación (Diferenciación)
- [ ] ¿Hay al menos 1 elemento que sorprenda positivamente?
- [ ] ¿Se aprovechan las capacidades modernas de CSS/JS?
- [ ] ¿El resultado es notoriamente superior a un template genérico?
- [ ] ¿Se personalizó para la industria/negocio específico?

---

## Selección de Sub-Skill

Según el tipo de proyecto solicitado, activar el sub-skill correspondiente:

```
SI el proyecto es una landing page / página de negocio:
  → Leer: skills/product/landing-page/SKILL.md
  → Leer: skills/core/html-app-production/SKILL.md
  → Leer: skills/design/design-systems/DESIGN.md

SI el proyecto es una plataforma SaaS / dashboard:
  → Leer: skills/product/saas-platform/SKILL.md
  → Leer: skills/product/saas-product-ui/SKILL.md
  → Leer: skills/security/auth-access-control/SKILL.md
  → Leer: skills/security/app-security-review/SKILL.md
  → Leer: skills/core/html-app-production/SKILL.md
  → Leer: skills/data/database-system/SKILL.md
  → Leer: skills/design/design-systems/DESIGN.md
  → Leer: skills/support/tools/TOOLS.md
  → Leer: skills/dental-references.md si el proyecto es OnDental o clínica dental

SI el proyecto es un sistema de gestión con base de datos:
  → Leer: skills/product/saas-product-ui/SKILL.md
  → Leer: skills/security/auth-access-control/SKILL.md
  → Leer: skills/security/app-security-review/SKILL.md
  → Leer: skills/data/database-system/SKILL.md
  → Leer: skills/core/html-app-production/SKILL.md
  → Leer: skills/support/tools/TOOLS.md
  → Leer: skills/design/design-systems/DESIGN.md

SI el proyecto es una app Flutter:
  → Leer: skills/flutter/flutter-app-production/SKILL.md
  → Leer según necesidad:
      - skills/flutter/flutter-apply-architecture-best-practices/SKILL.md
      - skills/flutter/flutter-build-responsive-layout/SKILL.md
      - skills/flutter/flutter-fix-layout-issues/SKILL.md
      - skills/flutter/flutter-setup-declarative-routing/SKILL.md
      - skills/flutter/flutter-use-http-package/SKILL.md
      - skills/flutter/flutter-implement-json-serialization/SKILL.md
      - skills/flutter/flutter-setup-localization/SKILL.md
      - skills/flutter/flutter-add-widget-test/SKILL.md
      - skills/flutter/flutter-add-integration-test/SKILL.md
      - skills/flutter/flutter-add-widget-preview/SKILL.md

SI se pide pulir, auditar, corregir responsive o preparar para entrega:
  → Leer: skills/core/frontend-quality-review/SKILL.md
  → Leer: skills/security/app-security-review/SKILL.md
  → Leer: skills/security/web-security-hardening/SKILL.md

SI se trabaja login, roles, panel admin, usuarios, permisos, tenants o datos privados:
  → Leer: skills/security/auth-access-control/SKILL.md
  → Leer: skills/security/app-security-review/SKILL.md

SI se instalan o copian skills externas:
  → Leer: skills/security/skill-supply-chain-audit/SKILL.md

SIEMPRE leer:
  → skills/design/design-systems/DESIGN.md (variables y componentes)
  → Este archivo (SKILL.md) para patrones base
```

---

## Reglas de Seguridad de Producción

- `localStorage` y `sessionStorage` son aceptables para demos, preferencias UI y prototipos; no son una frontera de seguridad para producción.
- Un login visible no debe cargar, importar ni pedir datos del admin hasta que el servidor/API confirme sesión y permisos.
- Toda ruta/API privada debe validar autenticación, autorización, tenant/empresa y objeto en servidor.
- La UI puede ocultar botones por UX, pero el permiso real vive en backend, reglas de base de datos o proveedor de auth.
- Antes de entregar SaaS, dashboards, sistemas internos o apps con usuarios, ejecutar una pasada con `app-security-review`, `auth-access-control` y `web-security-hardening`.

## Notas de Implementación

- **Archivo único vs. múltiples**: Para demos y prototipos, preferir un solo archivo HTML con CSS y JS embebido. Para producción, separar en archivos.
- **Sin build tools**: No requerir webpack, vite ni npm para demos. Todo debe funcionar con un servidor estático.
- **Datos de ejemplo**: Siempre incluir datos de ejemplo realistas en español (nombres mexicanos, direcciones reales, RFCs de ejemplo).
- **Favicon**: Incluir emoji como favicon inline: `<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>💼</text></svg>">`.
