/* ==========================================================================
   CONFIGURACION.JS - LÓGICA DE PERSONALIZACIÓN DE CLINICA Y SUCURSAL
   Permite al administrador configurar los datos corporativos para la sucursal activa.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function() {
  const currentUser = window.auth ? window.auth.getCurrentUser() : null;
  if (!currentUser) return;

  // --- Apariencia (todos los roles) ---------------------------------------
  // El alternador vivía en la barra lateral: dos estados, sin decir qué hacía
  // ni qué colores aplicaba, y solo el administrador entraba aquí. Ahora las
  // dos opciones se ven a la vez con su muestra de color. La clave que se
  // escribe es la misma `credental_theme` que lee el arranque de main.js, así
  // que el tema se sigue pintando antes del primer repintado, sin parpadeo.
  const radiosTema = document.querySelectorAll('input[name="tema"]');
  if (radiosTema.length) {
    const temaActual = localStorage.getItem('credental_theme') === 'dark' ? 'dark' : 'light';
    radiosTema.forEach(function(radio) {
      radio.checked = radio.value === temaActual;
      radio.addEventListener('change', function() {
        if (!this.checked) return;
        const oscuro = this.value === 'dark';
        document.documentElement.classList.toggle('dark-theme', oscuro);
        localStorage.setItem('credental_theme', oscuro ? 'dark' : 'light');
        if (window.applyThemeColor) window.applyThemeColor(oscuro);
        window.showToast(oscuro ? 'Apariencia oscura aplicada.' : 'Apariencia clara aplicada.', 'success');
      });
    });
  }

  // --- Datos de la sucursal (solo administrador) ---------------------------
  // El bloque queda oculto en el HTML y solo se descubre aquí: quien no es
  // administrador entra a esta página por la apariencia y no ve el formulario
  // de branding ni el botón de reinicio de la demostración.
  const esAdmin = !!(window.auth && window.auth.isAdmin(currentUser));
  const bloqueAdmin = document.getElementById('config-admin');
  const subtitulo = document.getElementById('config-subtitle');
  if (!esAdmin) {
    if (bloqueAdmin) bloqueAdmin.remove();
    return;
  }
  if (bloqueAdmin) bloqueAdmin.hidden = false;
  if (subtitulo) subtitulo.textContent = 'Apariencia de la aplicación y datos de la sucursal que se imprimen en presupuestos y recibos.';

  const form = document.getElementById('config-form');
  const inputName = document.getElementById('config-name');
  const inputAddress = document.getElementById('config-address');
  const inputPhone = document.getElementById('config-phone');
  const inputEmail = document.getElementById('config-email');

  // Elementos de la vista previa
  const previewTitle = document.getElementById('preview-title');
  const previewAddress = document.getElementById('preview-address');
  const previewPhone = document.getElementById('preview-phone');
  const previewEmail = document.getElementById('preview-email');
  const previewFolio = document.getElementById('preview-folio');
  const previewFecha = document.getElementById('preview-fecha');

  // Cargar configuración actual
  const config = window.db.getClinicaConfig(currentUser.companyId);
  if (config) {
    inputName.value = config.nombreClinica || '';
    inputAddress.value = config.direccion || '';
    inputPhone.value = config.telefono || '';
    inputEmail.value = config.correo || '';
    
    // Rellenar vista previa inicial
    updatePreview();
  }

  // Escuchadores de eventos para actualizar vista previa en tiempo real
  inputName.addEventListener('input', updatePreview);
  inputAddress.addEventListener('input', updatePreview);
  inputPhone.addEventListener('input', updatePreview);
  inputEmail.addEventListener('input', updatePreview);

  // Formulario submit
  form.addEventListener('submit', function(e) {
    e.preventDefault();

    const nombre = inputName.value.trim();
    const direccion = inputAddress.value.trim();
    const telefono = inputPhone.value.trim();
    const correo = inputEmail.value.trim();

    const updatedConfig = {
      nombreClinica: nombre,
      direccion: direccion,
      telefono: telefono,
      correo: correo
    };

    const success = window.db.saveClinicaConfig(currentUser.companyId, updatedConfig);
    if (success) {
      window.showToast('Configuración guardada exitosamente.', 'success');
    } else {
      window.showToast('Error al guardar la configuración.', 'error');
    }
  });

  // --- Reiniciar demostración ---
  // Ahora que todo el producto persiste en localStorage (expediente, dinero,
  // inventario, laboratorios y mensajes), la presentación se ensucia entre
  // ensayos. Este botón borra las claves `credental_` de datos y deja que
  // db.js y la semilla reconstruyan el estado inicial al recargar. Respeta
  // `credental_theme` (preferencia visual del equipo, no dato de la demo) y la
  // sesión activa, que vive en sessionStorage y no se toca.
  const btnReiniciar = document.getElementById('btn-reiniciar-demo');
  if (btnReiniciar) {
    btnReiniciar.addEventListener('click', async function() {
      const ok = await window.confirmarAccion(
        'Se borrará todo lo capturado en este equipo y se volverán a cargar los datos de ejemplo. Esta acción no se puede deshacer.',
        {
          titulo: '¿Reiniciar la demostración?',
          textoConfirmar: 'Borrar y recargar',
          textoCancelar: 'Cancelar',
          peligroso: true
        });
      if (!ok) return;

      const CONSERVAR = ['credental_theme'];
      const aBorrar = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.indexOf('credental_') === 0 && CONSERVAR.indexOf(key) === -1) {
          aBorrar.push(key);
        }
      }
      aBorrar.forEach(function(key) { localStorage.removeItem(key); });
      window.location.reload();
    });
  }

  function updatePreview() {
    if (previewTitle) previewTitle.textContent = inputName.value.trim() || 'Nombre de la clínica';
    if (previewAddress) previewAddress.textContent = inputAddress.value.trim() || 'Dirección de la clínica';
    if (previewPhone) previewPhone.textContent = inputPhone.value.trim() || 'Teléfono';
    if (previewEmail) previewEmail.textContent = inputEmail.value.trim() || 'Correo electrónico';

    // El folio y la fecha del encabezado son los que realmente se imprimirían
    // hoy, no un número de ejemplo escrito a mano.
    if (previewFolio) {
      let max = 0;
      window.db.getBudgets().forEach(b => {
        const m = /^P-(\d+)$/.exec(b.folio || '');
        if (m) max = Math.max(max, parseInt(m[1], 10));
      });
      previewFolio.textContent = 'P-' + String(max + 1).padStart(4, '0');
    }
    if (previewFecha) previewFecha.textContent = window.formatDateEs(window.todayISO());
  }
});
