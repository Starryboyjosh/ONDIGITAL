# ONDIGITAL — Especificación del Sistema de Diseño Premium

> Esta especificación define las directrices visuales, fichas de tokens (colors, layout, spacing), recetas de glassmorphism y patrones de componentes interactivos (HTML/CSS) listos para usar, garantizando interfaces con terminación ultra-premium y consistentes.

---

## Reglas De Uso

- Usar este sistema como biblioteca de tokens y componentes, no como obligación de aplicar glassmorphism en toda pantalla.
- En SaaS, admin, CRM, ERP y sistemas internos, priorizar legibilidad, densidad escaneable y estados claros sobre efectos visuales.
- En landing pages, priorizar una primera pantalla con marca/oferta/acción clara y assets relevantes antes de añadir decoración.
- Realizar landing pages con un diseño premium, animaciones suaves y transiciones fluidas, sin botones flashy, buscar innovar, no buscar estandares aburridos.
- Usar imagenes cuando sea posible, y evitar usar solo colores y formas sin contexto visual.
- Evitar paletas dominadas por un solo hue. Combinar superficies neutrales con acentos funcionales y estados reconocibles.
- No usar texto de escala hero dentro de paneles, tablas, tarjetas compactas o dashboards.
- Validar contraste, responsive, foco visible, tamaño táctil y texto largo antes de entregar.

## 📋 Índice
1. [Tokens de Color (Paletas Temáticas)](#tokens-de-color-paletas-temáticas)
2. [Tipografía y Escala de Texto](#tipografía-y-escala-de-texto)
3. [Escala de Espaciado (Base 4px)](#escala-de-espaciado-base-4px)
4. [Efectos Visuales: Receta de Glassmorphism Premium](#efectos-visuales-receta-de-glassmorphism-premium)
5. [Animaciones y Tokens de Movimiento (CSS Transitions)](#animaciones-y-tokens-de-movimiento-css-transitions)
6. [Librería de Componentes Core (HTML/CSS)](#librería-de-componentes-core-htmlcss)
7. [Sistema de Iconos Vectoriales (SVGs Inline)](#sistema-de-iconos-vectoriales-svgs-inline)
8. [Breakpoints Responsivos e Integridad Adaptativa](#breakpoints-responsivos-e-integridad-adaptativa)

---

## Tokens de Color (Paletas Temáticas)

Definimos esquemas de color para diferentes tipos de negocios e identidades visuales. Los colores principales se gestionan mediante propiedades personalizadas CSS.

### 1. Paleta Dark Premium (SaaS, Tecnología, Lujo)
```css
:root {
  --color-bg-primary: #050b1a;      /* Azul espacial profundo */
  --color-bg-secondary: #0a1128;    /* Azul medianoche */
  --color-bg-card: rgba(255, 255, 255, 0.03);
  --color-border: rgba(255, 255, 255, 0.08);
  --color-text-primary: #ffffff;
  --color-text-secondary: rgba(255, 255, 255, 0.7);
  --color-accent-primary: #a78bfa;  /* Violeta */
}
```

### 2. Paleta Salud e Higiene (Clínicas, Consultorios, Farmacias)
```css
:root {
  --color-bg-primary: #050f2c;      /* Navy profundo */
  --color-bg-secondary: #0a1a3a;    /* Navy secundario */
  --color-bg-card: rgba(255, 255, 255, 0.02);
  --color-border: rgba(255, 255, 255, 0.08);
  --color-text-primary: #ffffff;
  --color-text-secondary: rgba(0, 229, 176, 0.85); /* Tinte verde-azul */
  --color-accent-primary: #00e5b0;  /* Verde azulado curativo */
  --color-accent-secondary: #2b8af7;/* Azul digital */
}
```

### 3. Paleta Comercial (Tiendas, E-commerce, Cafés)
```css
:root {
  --color-bg-primary: #0f0a0a;      /* Negro cálido */
  --color-bg-secondary: #1a1212;    /* Gris tierra */
  --color-bg-card: rgba(255, 255, 255, 0.03);
  --color-border: rgba(255, 255, 255, 0.06);
  --color-text-primary: #ffffff;
  --color-text-secondary: rgba(255, 255, 255, 0.65);
  --color-accent-primary: #ff7a59;  /* Naranja coral */
  --color-accent-secondary: #ffb859;/* Oro cálido */
}
```

---

## Tipografía y Escala de Texto

Utilizamos Google Fonts optimizadas. Cada tipo de letra tiene una función específica para proyectar profesionalismo.
* **Syne**: Tipografía experimental de gran carácter visual, reservada para encabezados principales y logos.
* **Outfit**: Tipografía sans-serif moderna con formas geométricas limpias, ideal para títulos secundarios y KPIs.
* **DM Sans**: Altamente legible a cualquier tamaño, usada para el cuerpo de texto, descripciones y tablas.
* **Space Grotesk**: Utilizada para números, códigos de identificación (RUT, RFC) e interfaces de estilo técnico.

### Escala de Tamaños Tipográficos CSS

```css
:root {
  --text-xs: 0.75rem;     /* 12px - Subtítulos pequeños, fechas */
  --text-sm: 0.875rem;    /* 14px - Texto de botones, tablas, inputs */
  --text-base: 1rem;      /* 16px - Texto de lectura general */
  --text-lg: 1.125rem;    /* 18px - Descripciones cortas, subtítulos */
  --text-xl: 1.25rem;     /* 20px - Títulos de tarjetas, modals */
  --text-2xl: 1.5rem;     /* 24px - Títulos de sección */
  --text-3xl: 1.875rem;   /* 30px - KPIs grandes */
  --text-4xl: 2.25rem;    /* 36px - Encabezados medianos */
  --text-5xl: 3rem;       /* 48px - Títulos Hero */
}
```

---

## Escala de Espaciado (Base 4px)

El ritmo visual requiere múltiplos consistentes para los rellenos (`padding`) y márgenes (`margin`).

| Variable CSS | Valor (rem) | Equivalencia (px) | Uso Sugerido |
|--------------|-------------|-------------------|--------------|
| `--space-1` | `0.25rem` | 4px | Margen mínimo, pequeños detalles |
| `--space-2` | `0.5rem` | 8px | Entre elementos de formulario |
| `--space-3` | `0.75rem` | 12px | Espaciado interno de inputs |
| `--space-4` | `1rem` | 16px | Relleno estándar de tarjetas móviles |
| `--space-6` | `1.5rem` | 24px | Relleno estándar de tarjetas desktop |
| `--space-8` | `2rem` | 32px | Distancia entre secciones de control |
| `--space-12` | `3rem` | 48px | Margen superior e inferior de layouts |
| `--space-16` | `4rem` | 64px | Relleno vertical de secciones Hero |

---

## Efectos Visuales: Receta de Glassmorphism Premium

El glassmorphism no consiste simplemente en añadir transparencias. Para verse premium, requiere un balance entre el color de fondo, el nivel de desenfoque, un contorno claro semitransparente que simule el brillo del cristal, y una sombra proyectada suave.

```css
/* EL ESTÁNDAR PREMIUM DE CRISTAL ONDIGITAL */
.glass-surface {
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-lg);
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3);
}

/* Efecto Hover interactivo de luz */
.glass-surface-interactive {
  transition: all var(--duration-normal) var(--ease-out);
}

.glass-surface-interactive:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.15);
  box-shadow: 0 12px 40px 0 rgba(167, 139, 250, 0.15); /* Brillo del acento */
  transform: translateY(-2px);
}
```

---

## Animaciones y Tokens de Movimiento (CSS Transitions)

Micro-interacciones refinadas mediante curvas Bézier fluidas para emular un comportamiento orgánico y dinámico.

```css
:root {
  /* Curva amortiguada clásica (Out) */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  
  /* Curva de rebote sutil (Spring) */
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);

  /* Duraciones */
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 450ms;
}

/* Efecto Shimmer (Brillo metálico de carga) */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.shimmer-loading {
  background: linear-gradient(90deg, 
    rgba(255,255,255,0.03) 25%, 
    rgba(255,255,255,0.08) 50%, 
    rgba(255,255,255,0.03) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite linear;
}
```

---

## Librería de Componentes Core (HTML/CSS)

### 1. Botones Premium
```html
<!-- Botón Primario Relleno -->
<button class="glass-btn">
  <span>Registrar Paciente</span>
  <svg class="btn-icon" viewBox="0 0 24 24"><!-- SVG --></svg>
</button>

<!-- Botón Secundario Transparente -->
<button class="glass-btn glass-btn-outline">
  <span>Cancelar</span>
</button>
```

### 2. Entradas de Texto (Inputs Glass)
```html
<div class="input-wrapper">
  <label class="input-label" for="txt-email">Correo Electrónico</label>
  <div class="input-container">
    <span class="input-icon">✉️</span>
    <input type="email" id="txt-email" class="glass-input" placeholder="correo@empresa.com" required>
  </div>
</div>
```

### 3. Componente de Búsqueda Autocompletable
```html
<div class="autocomplete-wrapper">
  <input type="text" id="patient-search" class="glass-input" placeholder="Buscar paciente por nombre o RUT...">
  <button class="btn-clear-search" id="btn-clear">×</button>
  
  <!-- Lista de resultados flotante glass -->
  <div class="autocomplete-results hidden" id="search-results">
    <div class="autocomplete-item" data-value="pat-1">
      <span class="item-title">Dr. Sebastián Escoto</span>
      <span class="item-subtitle">18.452.129-K - Ortodoncista</span>
    </div>
    <div class="autocomplete-item highlighted" data-value="pat-2">
      <span class="item-title">María González Ruiz</span>
      <span class="item-subtitle">12.548.963-2 - Limpieza</span>
    </div>
  </div>
</div>
```

### 4. Tabla de Datos Premium (Data Table)
```html
<div class="table-container glass-surface">
  <table class="data-table">
    <thead>
      <tr>
        <th>Paciente</th>
        <th>RUT / Cédula</th>
        <th>Fecha Cita</th>
        <th>Estado</th>
        <th>Acciones</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>
          <div class="td-profile">
            <div class="avatar-sm">AG</div>
            <span>Alberto Guerrero</span>
          </div>
        </td>
        <td class="font-mono">15.698.412-3</td>
        <td>31 May 2026, 16:30</td>
        <td><span class="badge badge-success">Confirmada</span></td>
        <td>
          <button class="btn-action">✏️</button>
          <button class="btn-action btn-action-danger">🗑️</button>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

---

## Sistema de Iconos Vectoriales (SVGs Inline)

Evite utilizar fuentes de iconos pesadas (como FontAwesome) que incrementan los tiempos de carga del sitio. En su lugar, utilice SVG en línea para un renderizado nítido de alta definición.

```html
<!-- Icono de Calendario / Agenda -->
<svg class="icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
  <line x1="16" y1="2" x2="16" y2="6"></line>
  <line x1="8" y1="2" x2="8" y2="6"></line>
  <line x1="3" y1="10" x2="21" y2="10"></line>
</svg>

<!-- Icono de Búsqueda -->
<svg class="icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="11" cy="11" r="8"></circle>
  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
</svg>
```

---

## Breakpoints Responsivos e Integridad Adaptativa

El diseño responsivo debe garantizar una visualización balanceada en todos los formatos.

```css
/* Breakpoints Estándar */
--breakpoint-sm: 640px;  /* Móviles grandes / Retrato */
--breakpoint-md: 768px;  /* Tablets vertical */
--breakpoint-lg: 1024px; /* Tablets horizontal / Laptops */
--breakpoint-xl: 1280px; /* Monitores estándar */

/* Regla dorada: Menú lateral móvil colapsable */
@media (max-width: 768px) {
  .sidebar {
    transform: translateX(-100%);
    position: fixed;
    transition: transform var(--duration-normal) var(--ease-out);
  }
  .sidebar.active {
    transform: translateX(0);
  }
  
  /* Tabla de datos simplificada para pantallas pequeñas */
  .data-table th:nth-child(2),
  .data-table td:nth-child(2) {
    display: none; /* Ocultar columnas secundarias */
  }
}
```
