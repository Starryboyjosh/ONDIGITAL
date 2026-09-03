/* ==========================================================================
   CONFIGURACION.JS - LÓGICA DE PERSONALIZACIÓN DE CLINICA Y SUCURSAL
   Permite al administrador configurar los datos corporativos para la sucursal activa.
   ========================================================================== */

document.addEventListener('DOMContentLoaded', function() {
  const currentUser = window.auth ? window.auth.getCurrentUser() : null;
  if (!currentUser) return;

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

  function updatePreview() {
    if (previewTitle) previewTitle.textContent = inputName.value.trim() || 'Nombre de la Clínica';
    if (previewAddress) previewAddress.textContent = inputAddress.value.trim() || 'Dirección de la Clínica';
    if (previewPhone) previewPhone.textContent = inputPhone.value.trim() || 'Teléfono';
    if (previewEmail) previewEmail.textContent = inputEmail.value.trim() || 'Correo Electrónico';

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
