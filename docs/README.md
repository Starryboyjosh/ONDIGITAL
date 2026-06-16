# Credental — Documentación

Prototipo serio de **software de gestión clínica dental** para Honduras. Interfaz
clínica/administrativa, multi‑empresa, en HTML/CSS/JS sin framework ni build.

> Estado actual: **prototipo funcional con dirección de producto**. La estética,
> la localización (Honduras) y el esqueleto de los módulos operativos están listos.
> La **base de datos definitiva** y la **seguridad productiva** quedan por definir
> con el equipo (ver [roadmap-y-pendientes.md](roadmap-y-pendientes.md)).

## Índice de documentación

- [funcionalidades.md](funcionalidades.md) — Qué hace cada módulo y en qué estado está.
- [arquitectura.md](arquitectura.md) — Estructura técnica, capa de datos y dónde tocar
  para base de datos y seguridad.
- [roadmap-y-pendientes.md](roadmap-y-pendientes.md) — Pasos completados, pendientes
  y decisiones abiertas (datos, seguridad, integraciones).

## Cómo ejecutarlo

No requiere instalación ni build. Abrir `credental/index.html` en el navegador
(idealmente servido por un servidor estático local para que carguen los scripts).

Es un prototipo: los usuarios y datos de demostración provienen de `js/db.js` y de
la sincronización opcional con Firebase. No usar con datos reales de pacientes hasta
resolver datos y seguridad.

## Mapa rápido del código

```
credental/
  *.html            Pantallas (una por módulo)
  css/styles.css    Sistema de diseño (tokens, tema claro/oscuro, componentes)
  js/
    main.js         Navegación central, tema, branding, helper de moneda (HNL)
    db.js           Capa de datos local (sessionStorage) + sync Firebase opcional
    auth.js         Sesión y guardas de ruta (demo)
    <modulo>.js     Lógica por pantalla (pacientes, agenda, caja, reportes, ...)
    firebase/       Conector Firebase (opcional)
```
