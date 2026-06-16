---
name: landing-page
description: Generate high-conversion Spanish landing pages for MiPyMEs and service businesses with SEO, responsive layout, WhatsApp/forms/maps integrations, strong first viewport hierarchy, real visual assets, and production HTML quality. Use for business pages, campaign pages, local service sites, catalogs, and contact-driven pages.
---

# ONDIGITAL — Generación de Landing Pages Premium de Alta Conversión

> Este skill instruye en el diseño y codificación de páginas de destino (landing pages) ultra-modernas con estética premium, animaciones fluidas y excelente rendimiento. Ideal para farmacias, tiendas, consultorías y clínicas. Todas las interfaces DEBEN estar redactadas en **español**.

---

## Metadata

- Version: 2.1.0
- Author: ONDIGITAL
- Domain: product/landing-page
- Pair with: `skills/core/html-app-production/SKILL.md`, `skills/core/frontend-quality-review/SKILL.md`, `skills/security/web-security-hardening/SKILL.md`.

## Reglas De Calidad Actualizadas

- La primera pantalla debe comunicar negocio, oferta, ubicación/canal y acción principal sin depender solo de nav.
- Usar imagen real o generada relevante cuando el usuario deba inspeccionar producto, lugar, persona o servicio.
- Evitar decoración genérica como orbes, gradientes o tarjetas excesivas cuando no aporten conversión.
- Mantener copy en español natural, específico para el giro y sin lenguaje de plantilla.
- Antes de entrega, validar responsive, assets, formularios, SEO básico y seguridad web.

## 📋 Índice
1. [Estructura de Conversión (AIDA)](#estructura-de-conversión-aida)
2. [Sección Hero Premium con Llamados a la Acción (CTA)](#sección-hero-premium-con-llamados-a-la-acción-cta)
3. [Sección de Servicios y Grilla de Características](#sección-de-servicios-y-grilla-de-características)
4. [Integración Directa con WhatsApp (Contacto Directo)](#integración-directa-con-whatsapp-contacto-directo)
5. [Formulario de Contacto y Captura con Validación](#formulario-de-contacto-y-captura-con-validación)
6. [Integración de Google Maps Interactiva](#integración-de-google-maps-interactiva)
7. [Sección de Testimonios y Precios (Social Proof)](#sección-de-testimonios-y-precios-social-proof)
8. [Plantillas Sectoriales (Farmacias, Clínicas, Tiendas)](#plantillas-sectoriales-farmacias-clínicas-tiendas)
9. [Optimización SEO y Metadatos Core](#optimización-seo-y-metadatos-core)

---

## Estructura de Conversión (AIDA)

Toda landing page de alto nivel debe seguir la estructura psicológica **AIDA** (Atención, Interés, Deseo, Acción):
1. **Atención**: Un encabezado hero de gran impacto (Syne) que deje claro qué ofrece el negocio en menos de 3 segundos.
2. **Interés**: Explicación de los beneficios clave y problemas que resuelve la solución.
3. **Deseo**: Testimonios, prueba social, fotos reales de alta calidad y garantías.
4. **Acción**: Formularios simplificados o enlaces directos a WhatsApp flotantes de fácil acceso.

---

## Sección Hero Premium con Llamados a la Acción (CTA)

Un Hero premium combina tipografía audaz, orbes de colores degradados en el fondo y botones con micro-interacciones.

### Código HTML Hero

```html
<section class="hero bg-premium" id="inicio">
  <div class="container hero-container">
    <div class="hero-content">
      <span class="hero-badge">⭐ Innovación Médica al Alcance</span>
      <h1 class="hero-title">Tu Salud Dental Rediseñada con Tecnología y Confort</h1>
      <p class="hero-description">
        Agenda tu evaluación hoy mismo en Credental y experimenta tratamientos sin dolor,
        respaldados por profesionales líderes y tecnología 3D de vanguardia.
      </p>
      <div class="hero-actions">
        <a href="#contacto" class="glass-btn">Agendar Cita Ahora</a>
        <a href="#servicios" class="glass-btn glass-btn-outline">Ver Tratamientos</a>
      </div>
    </div>
    <div class="hero-visual">
      <div class="visual-glow"></div>
      <img src="assets/hero-clinic.png" alt="Instalaciones de la Clínica Dental Premium" class="hero-img">
    </div>
  </div>
</section>
```

### Estilos CSS Hero

```css
.hero {
  padding: var(--space-20) 0;
  min-height: 80vh;
  display: flex;
  align-items: center;
  position: relative;
}

.hero-container {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: var(--space-12);
  align-items: center;
}

.hero-badge {
  display: inline-block;
  padding: var(--space-1.5) var(--space-4);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--radius-full);
  color: var(--color-accent-primary);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  margin-bottom: var(--space-6);
}

.hero-title {
  font-family: var(--font-display);
  font-size: var(--text-5xl);
  font-weight: 800;
  line-height: var(--leading-tight);
  color: var(--color-text-primary);
  margin-bottom: var(--space-6);
}

.hero-description {
  font-size: var(--text-lg);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-8);
  max-width: 540px;
}

.hero-actions {
  display: flex;
  gap: var(--space-4);
}

.hero-visual {
  position: relative;
  display: flex;
  justify-content: center;
}

.visual-glow {
  position: absolute;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, rgba(167, 139, 250, 0.2), transparent 70%);
  filter: blur(40px);
  z-index: 0;
}

.hero-img {
  position: relative;
  z-index: 1;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  border: 1px solid var(--color-border);
}

@media (max-width: 768px) {
  .hero-container {
    grid-template-columns: 1fr;
    text-align: center;
  }
  .hero-description {
    margin-left: auto;
    margin-right: auto;
  }
  .hero-actions {
    justify-content: center;
  }
}
```

---

## Sección de Servicios y Grilla de Características

Una cuadrícula fluida e interactiva de servicios que destaca con efectos glassmorphic en hover.

```html
<section class="services" id="servicios">
  <div class="container">
    <div class="section-header">
      <h2 class="section-title">Especialidades Dentales</h2>
      <p class="section-subtitle">Soluciones personalizadas para mantener una sonrisa sana y radiante</p>
    </div>
    
    <div class="services-grid">
      <!-- Servicio 1 -->
      <div class="service-card glass-card">
        <div class="service-icon">🦷</div>
        <h3 class="service-name">Implantes Dentales</h3>
        <p class="service-desc">Recupera la funcionalidad y estética natural de tu dentadura con implantes de titanio alemanes de alta durabilidad.</p>
      </div>

      <!-- Servicio 2 -->
      <div class="service-card glass-card">
        <div class="service-icon">✨</div>
        <h3 class="service-name">Diseño de Sonrisa</h3>
        <p class="service-desc">Carillas de porcelana ultra-delgadas y blanqueamientos premium para lucir una sonrisa de impacto.</p>
      </div>

      <!-- Servicio 3 -->
      <div class="service-card glass-card">
        <div class="service-icon">🦷</div>
        <h3 class="service-name">Ortodoncia Avanzada</h3>
        <p class="service-desc">Alineadores invisibles y brackets de zafiro de última generación para niños, jóvenes y adultos.</p>
      </div>
    </div>
  </div>
</section>
```

---

## Integración Directa con WhatsApp (Contacto Directo)

Para farmacias, restaurantes y tiendas locales, la comunicación por WhatsApp es el canal número uno de conversión. Implementamos un botón flotante dinámico con tooltip de llamada a la acción.

### Estructura HTML y JS WhatsApp

```html
<!-- BOTÓN FLOTANTE WHATSAPP -->
<div class="wa-float-wrapper" id="wa-float">
  <div class="wa-tooltip">💬 ¿Tienes dudas? ¡Escríbenos en vivo!</div>
  <a href="https://wa.me/5215512345678?text=Hola,%20quisiera%20solicitar%20información%20sobre%20una%20consulta." 
     target="_blank" 
     class="wa-float-btn"
     aria-label="Contactar por WhatsApp">
     <svg viewBox="0 0 24 24" class="wa-icon">
       <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.963C16.588 2.019 14.113 1 11.512 1c-5.44 0-9.866 4.372-9.87 9.802 0 1.706.463 3.375 1.34 4.86l-.997 3.644 3.76-.974.012-.006z"/>
     </svg>
  </a>
</div>
```

### Estilos CSS WhatsApp

```css
.wa-float-wrapper {
  position: fixed;
  bottom: var(--space-6);
  right: var(--space-6);
  z-index: var(--z-toast);
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.wa-float-btn {
  width: 60px;
  height: 60px;
  background-color: #25d366;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(37, 211, 102, 0.4);
  transition: all var(--duration-normal) var(--ease-spring);
}

.wa-float-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 8px 24px rgba(37, 211, 102, 0.6);
}

.wa-icon {
  width: 32px;
  height: 32px;
  fill: white;
}

.wa-tooltip {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-size: var(--text-xs);
  margin-bottom: var(--space-2);
  white-space: nowrap;
  box-shadow: var(--shadow-md);
  opacity: 0;
  transform: translateY(10px);
  transition: all var(--duration-normal) var(--ease-out);
  pointer-events: none;
}

.wa-float-wrapper:hover .wa-tooltip {
  opacity: 1;
  transform: translateY(0);
}
```

---

## Formulario de Contacto y Captura con Validación

El formulario de contacto debe validar las entradas en tiempo real e indicar visualmente si la información provista es la correcta antes de enviar.

```html
<form id="contact-form" class="glass-card contact-form" onsubmit="handleContactSubmit(event)">
  <h3 class="form-title">Escríbenos en un minuto</h3>
  
  <div class="form-group">
    <label for="contact-name">Nombre Completo</label>
    <input type="text" id="contact-name" class="glass-input" placeholder="Ej. Sebastián Escoto" required>
    <span class="error-msg" id="name-error"></span>
  </div>

  <div class="form-group">
    <label for="contact-phone">Teléfono Móvil</label>
    <input type="tel" id="contact-phone" class="glass-input" placeholder="Ej. +52 55 1234 5678" required>
    <span class="error-msg" id="phone-error"></span>
  </div>

  <div class="form-group">
    <label for="contact-service">Servicio de Interés</label>
    <select id="contact-service" class="glass-input" required>
      <option value="" disabled selected>Selecciona un servicio...</option>
      <option value="implante">Implantes Dentales</option>
      <option value="diseno">Diseño de Sonrisa</option>
      <option value="ortodoncia">Ortodoncia Avanzada</option>
    </select>
  </div>

  <button type="submit" class="glass-btn w-full">Enviar Mensaje</button>
</form>
```

---

## Integración de Google Maps Interactiva

Una sección premium de mapa interactivo con la ubicación física de la clínica o comercio, usando iframe optimizado o SDK.

```html
<section class="location-section" id="ubicacion">
  <div class="container location-container">
    <div class="location-info">
      <h2 class="section-title">¿Dónde encontrarnos?</h2>
      <p class="section-description">
        Visítanos en nuestras modernas instalaciones ubicadas en el corazón financiero de la ciudad.
      </p>
      <div class="info-list">
        <div class="info-item">📍 <p>Av. Paseo de la Reforma 123, Ciudad de México</p></div>
        <div class="info-item">📞 <p>+52 55 9876 5432</p></div>
        <div class="info-item">✉️ <p>contacto@credental.com</p></div>
      </div>
    </div>
    <div class="location-map glass-card">
      <iframe 
        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3762.533261623869!2d-99.1652416850933!3d19.429938886885375!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x85d1ff35f606e1cb%3A0xe5ef8211db428383!2sAv.%20Paseo%20de%20la%20Reforma%20123%2C%20Cuauht%C3%A9moc%2C%2006500%20Ciudad%20de%20M%C3%A9xico%2C%20CDMX!5e0!3m2!1ses-419!2smx!4v1620000000000!5m2!1ses-419!2smx" 
        width="100%" 
        height="400" 
        style="border:0; border-radius: var(--radius-md);" 
        allowfullscreen="" 
        loading="lazy"
        title="Ubicación de Credental Clínica Central">
      </iframe>
    </div>
  </div>
</section>
```

---

## Plantillas Sectoriales (Farmacias, Clínicas, Tiendas)

### 🏥 Clínica Médica/Dental
- **Enfoque**: Agenda de citas, perfiles de médicos, equipo tecnológico.
- **Acción Principal**: Cita online (CTA con formulario predictivo).
- **Tipografía**: Outfit & DM Sans.

### 💊 Farmacia de Contacto Directo
- **Enfoque**: Catálogo rápido de medicamentos con buscador, recetas, cotizador por foto.
- **Acción Principal**: Enviar foto de receta por WhatsApp (CTA directa con ícono).
- **Tipografía**: Inter & DM Sans.

### 🛍️ Tienda Local (Indirecto)
- **Enfoque**: Galería de productos filtrable, carritos de compra locales con persistencia.
- **Acción Principal**: Generar pedido e imprimir / enviar lista a tienda por WhatsApp.
- **Tipografía**: Space Grotesk & DM Sans.

---

## Optimización SEO y Metadatos Core

El SEO técnico garantiza la indexación en buscadores y el posicionamiento en MiPyMEs.

```html
<!-- Metatags Esenciales para SEO y Compartido Social -->
<title>Credental — Implantes Dentales y Ortodoncia en CDMX</title>
<meta name="description" content="Especialistas en implantes, ortodoncia invisible y diseño de sonrisa en Ciudad de México. Tratamientos sin dolor con tecnología 3D. Agenda tu cita.">
<meta name="keywords" content="dentista cdmx, implantes dentales, ortodoncia invisible, diseño de sonrisa, clinica dental reforma">
<link rel="canonical" href="https://www.credental.com">

<!-- Metatags Open Graph (Facebook/WhatsApp/LinkedIn) -->
<meta property="og:title" content="Credental — Tu Salud Dental Rediseñada con Tecnología">
<meta property="og:description" content="Clínica dental premium con odontología avanzada y estética de punta.">
<meta property="og:image" content="https://www.credental.com/assets/share-preview.png">
<meta property="og:url" content="https://www.credental.com">
<meta property="og:type" content="website">

<!-- Metatags Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Credental — Odontología Premium">
<meta name="twitter:description" content="Odontología digital y estética dental premium en Paseo de la Reforma.">
<meta name="twitter:image" content="https://www.credental.com/assets/share-preview.png">
```
