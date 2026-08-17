# Credental — Documentación

Prototipo serio de **software de gestión clínica dental** para Honduras. Interfaz
clínica/administrativa, multi‑empresa, en HTML/CSS/JS sin framework ni build.

> Estado actual: **prototipo funcional con dirección de producto**. La estética,
> la localización (Honduras) y el esqueleto de los módulos operativos están listos.
> La **base de datos definitiva** y la **seguridad productiva** siguen pendientes.
> La ejecución consolidada está en [plan-implementacion-super-v2.md](plan-implementacion-super-v2.md),
> respaldada por la [auditoría estática](auditoria-estatica-ondigital.md).

## Índice de documentación

- [funcionalidades.md](funcionalidades.md) — Qué hace cada módulo y en qué estado está.
- [arquitectura.md](arquitectura.md) — Estructura técnica, capa de datos y dónde tocar
  para base de datos y seguridad.
- [plan-implementacion-super-v2.md](plan-implementacion-super-v2.md) — Fuente única de ejecución,
  fases, dependencias, aprobación, evidencia y criterios de producción.
- [auditoria-estatica-ondigital.md](auditoria-estatica-ondigital.md) — Baseline de riesgos y
  hallazgos que originaron la versión v2.
- [plan-maestro.md](plan-maestro.md) — Histórico del cierre de Fases 1–4.

## Cómo ejecutarlo

No requiere instalación ni build. Servir la carpeta `credental/` con un servidor estático
local y abrir `index.html` para que carguen los scripts. El acceso de demostración es:

```text
Usuario: testing
Contraseña: 1234
```

La semilla clínica se carga automáticamente en la sesión del navegador e incluye pacientes,
citas, presupuestos, procedimientos y datos para Vito.

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
