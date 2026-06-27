// Configuración: datos de la empresa, parámetros fiscales (ISV, propina, CAI) y tema visual.
import { api } from '../api.js';
import { $, $$, esc, toast, toastErr, state } from '../ui.js';
import { getTheme, setTheme } from '../theme.js';
import { refreshSettings } from '../app.js';

export async function render(page) {
  const s = await api.get('/api/settings');
  const v = (k) => esc(s[k] || '');

  page.innerHTML = `
    <div class="page-head"><div><h1>Configuración</h1><div class="sub">Datos del negocio, impuestos y apariencia</div></div></div>

    <div class="grid grid-2">
      <div class="card">
        <h2>Empresa</h2>
        <div class="card-pad">
          <div class="form-grid">
            <label class="field full">Nombre del restaurante
              <input class="input" id="company_name" value="${v('company_name')}"></label>
            <label class="field">RTN
              <input class="input" id="company_rtn" value="${v('company_rtn')}" placeholder="0801…"></label>
            <label class="field">Teléfono
              <input class="input" id="company_phone" value="${v('company_phone')}" placeholder="+504 …"></label>
            <label class="field full">Dirección
              <input class="input" id="company_address" value="${v('company_address')}"></label>
          </div>
        </div>
      </div>

      <div class="card">
        <h2>Impuestos y propina</h2>
        <div class="card-pad">
          <div class="form-grid">
            <label class="field">ISV por defecto (%)
              <input class="input" id="isv_rate_default" type="number" step="0.01" value="${v('isv_rate_default')}"></label>
            <label class="field">ISR estimado (%)
              <input class="input" id="isr_rate" type="number" step="0.01" value="${v('isr_rate')}"></label>
            <label class="field">Propina sugerida (%)
              <input class="input" id="tip_suggest_rate" type="number" step="0.5" value="${v('tip_suggest_rate')}"></label>
            <label class="field">Precios del menú
              <select class="input" id="prices_include_isv">
                <option value="1" ${s.prices_include_isv === '1' ? 'selected' : ''}>Con ISV incluido</option>
                <option value="0" ${s.prices_include_isv !== '1' ? 'selected' : ''}>Sin ISV (se agrega)</option>
              </select></label>
          </div>
          <p class="muted" style="margin:10px 0 0; font-size:12.5px">La propina no es ingreso gravable: se cobra aparte del ISV y se entrega al personal de servicio.</p>
        </div>
      </div>

      <div class="card">
        <h2>Facturación (Honduras · SAR)</h2>
        <div class="card-pad">
          <div class="form-grid">
            <label class="field">Tipo de documento
              <select class="input" id="fiscal_doc_type">
                <option value="factura" ${s.fiscal_doc_type !== 'recibo' ? 'selected' : ''}>Factura</option>
                <option value="recibo" ${s.fiscal_doc_type === 'recibo' ? 'selected' : ''}>Recibo</option>
              </select></label>
            <label class="field">CAI
              <input class="input" id="cai" value="${v('cai')}" placeholder="Código de autorización"></label>
            <label class="field">Rango autorizado
              <input class="input" id="cai_range" value="${v('cai_range')}" placeholder="000-001-01-…"></label>
            <label class="field">Vence
              <input class="input" id="cai_expires" type="date" value="${v('cai_expires')}"></label>
          </div>
          <p class="muted" style="margin:10px 0 0; font-size:12.5px">Esquema listo para SAR. La emisión electrónica (XML/CAEE) y la validación con la Oficina Virtual son una fase posterior; verifica las reglas vigentes del SAR antes de producción.</p>
        </div>
      </div>

      <div class="card">
        <h2>Apariencia</h2>
        <div class="card-pad">
          <p class="muted" style="margin:0 0 12px; font-size:13px">El robot ONDIGITAL siempre acompaña la marca. Elige el tema de la interfaz.</p>
          <div class="theme-options" id="theme-options">
            <button class="theme-option" data-theme-pick="light">
              <span class="theme-swatch theme-swatch-light"></span>
              <span class="theme-option-label">Blanco <small>Predeterminado</small></span>
            </button>
            <button class="theme-option" data-theme-pick="company">
              <span class="theme-swatch theme-swatch-company"></span>
              <span class="theme-option-label">Colores de la empresa <small>Azul ONDIGITAL</small></span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="page-actions" style="margin-top:18px">
      <button class="btn btn-primary" id="btn-save">Guardar cambios</button>
    </div>`;

  const markTheme = () => {
    const cur = getTheme();
    $$('[data-theme-pick]', page).forEach(b => b.classList.toggle('active', b.dataset.themePick === cur));
  };
  markTheme();
  $$('[data-theme-pick]', page).forEach(b => b.addEventListener('click', () => { setTheme(b.dataset.themePick); markTheme(); }));

  $('#btn-save', page).addEventListener('click', async () => {
    const keys = ['company_name', 'company_rtn', 'company_phone', 'company_address',
      'isv_rate_default', 'isr_rate', 'tip_suggest_rate', 'prices_include_isv',
      'fiscal_doc_type', 'cai', 'cai_range', 'cai_expires'];
    const body = {};
    keys.forEach(k => { body[k] = String($('#' + k, page).value).trim(); });
    try {
      await api.put('/api/settings', body);
      state.settings = await api.get('/api/settings');
      await refreshSettings();
      toast('Configuración guardada');
    } catch (err) { toastErr(err); }
  });
}
