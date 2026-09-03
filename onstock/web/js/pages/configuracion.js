// Configuración: datos de la empresa y parámetros fiscales.
import { api } from '../api.js';
import { $, $$, esc, toast, toastErr, state } from '../ui.js';
import { refreshSettings } from '../app.js';
import { getTheme, setTheme } from '../theme.js';

export async function render(page) {
  const s = await api.get('/api/settings');

  page.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Configuración</h1>
        <div class="sub">Datos de la empresa y parámetros del sistema</div>
      </div>
    </div>

    <div class="grid grid-2" style="align-items:start">
      <div class="card">
        <h2>Empresa</h2>
        <div class="card-pad form-grid">
          <label class="field full">Nombre de la empresa
            <input class="input" id="c-name" value="${esc(s.company_name || '')}">
          </label>
          <label class="field">RTN
            <input class="input" id="c-rtn" value="${esc(s.company_rtn || '')}" placeholder="14 dígitos">
          </label>
          <label class="field">Teléfono
            <input class="input" id="c-phone" value="${esc(s.company_phone || '')}">
          </label>
          <label class="field full">Dirección
            <input class="input" id="c-address" value="${esc(s.company_address || '')}">
          </label>
        </div>
      </div>

      <div class="card">
        <h2>Parámetros fiscales y de venta</h2>
        <div class="card-pad form-grid">
          <label class="field">Símbolo de moneda
            <input class="input" id="c-currency" value="${esc(s.currency_symbol || 'L')}" maxlength="4">
          </label>
          <label class="field">Tasa ISV por defecto (%)
            <select class="input" id="c-isv">
              <option value="15" ${s.isv_rate_default === '15' ? 'selected' : ''}>15% (tasa general)</option>
              <option value="18" ${s.isv_rate_default === '18' ? 'selected' : ''}>18%</option>
              <option value="0" ${s.isv_rate_default === '0' ? 'selected' : ''}>0% (exento)</option>
            </select>
          </label>
          <label class="field">Tasa ISR estimada (%)
            <input class="input" id="c-isr" type="number" min="0" max="60" step="0.5" value="${esc(s.isr_rate || '25')}">
          </label>
          <div></div>
          <label class="checkbox full">
            <input type="checkbox" id="c-incl" ${s.prices_include_isv === '1' ? 'checked' : ''}>
            Los precios de venta incluyen ISV (precio de góndola)
          </label>
          <label class="checkbox full">
            <input type="checkbox" id="c-negative" ${s.allow_negative_stock === '1' ? 'checked' : ''}>
            Permitir vender sin stock (stock negativo)
          </label>
        </div>
      </div>
    </div>

    <div class="card mt">
      <h2>Caja / registradora</h2>
      <div class="card-pad form-grid">
        <label class="field full">PIN para salir del modo cajero
          <input class="input" id="c-caja-pin" type="password" inputmode="numeric" autocomplete="new-password"
            value="${esc(s.caja_exit_pin || '')}" placeholder="Ej. 1234 (recomendado)">
        </label>
        <p class="full muted" style="margin:0; font-size:13px; line-height:1.45">
          El <b>modo cajero</b> oculta Dashboard, reportes, gastos, compras, Vito y configuración.
          Solo deja la caja. Para volver al menú completo se pide este PIN.
          Déjalo vacío solo en demos (cualquiera puede salir del turno).
        </p>
      </div>
    </div>

    <div class="flex mt" style="justify-content:flex-end">
      <button class="btn btn-primary" id="c-save" style="padding:10px 26px">Guardar configuración</button>
    </div>

    <div class="card mt">
      <h2>Apariencia <span class="muted">Se guarda en este equipo</span></h2>
      <div class="card-pad">
        <div class="sub" style="color:var(--text-2); margin-bottom:14px">
          Elige la paleta de colores de la interfaz. El robot ONDIGITAL es el logotipo del sistema.
        </div>
        <div class="theme-options">
          <button type="button" class="theme-option" data-theme-pick="light">
            <span class="theme-swatch theme-swatch-light"></span>
            <span class="theme-option-label">Blanco <small>Predeterminado</small></span>
          </button>
          <button type="button" class="theme-option" data-theme-pick="company">
            <span class="theme-swatch theme-swatch-company"></span>
            <span class="theme-option-label">Colores de la empresa <small>Marca ONDIGITAL</small></span>
          </button>
        </div>
      </div>
    </div>

    <div class="card mt">
      <h2>Acerca del sistema</h2>
      <div class="card-pad" style="padding-top:0">
        <dl class="about-grid">
          <dt>Versión</dt><dd id="ab-version" class="mono">—</dd>
          <dt>Asistente Vito</dt><dd id="ab-vito">—</dd>
          <dt>Base de datos</dt><dd>SQLite, en la carpeta <span class="mono">data/</span> junto al ejecutable.
            Para respaldar, copia esa carpeta con el sistema cerrado.</dd>
          <dt>Otros equipos</dt><dd>De fábrica el sistema solo atiende a esta computadora. Para que la
            caja o la oficina entren desde la red local, inícialo con
            <span class="mono">onstock -host 0.0.0.0</span>: al arrancar mostrará la dirección IP que
            deben escribir los demás equipos.</dd>
        </dl>
      </div>
    </div>`;

  cargarAcerca(page);

  // Apariencia (solo visual, se aplica al instante y se guarda por equipo)
  const syncTheme = () => $$('.theme-option', page)
    .forEach(b => b.classList.toggle('active', b.dataset.themePick === getTheme()));
  $$('.theme-option', page).forEach(b => b.addEventListener('click', () => {
    setTheme(b.dataset.themePick);
    syncTheme();
    toast('Apariencia actualizada');
  }));
  syncTheme();

  $('#c-save', page).addEventListener('click', async () => {
    const body = {
      company_name: $('#c-name', page).value.trim(),
      company_rtn: $('#c-rtn', page).value.trim(),
      company_phone: $('#c-phone', page).value.trim(),
      company_address: $('#c-address', page).value.trim(),
      currency_symbol: $('#c-currency', page).value.trim() || 'L',
      isv_rate_default: $('#c-isv', page).value,
      isr_rate: String(+$('#c-isr', page).value || 25),
      prices_include_isv: $('#c-incl', page).checked ? '1' : '0',
      allow_negative_stock: $('#c-negative', page).checked ? '1' : '0',
      caja_exit_pin: $('#c-caja-pin', page).value.trim(),
    };
    try {
      await api.put('/api/settings', body);
      await refreshSettings();
      toast('Configuración guardada');
    } catch (err) { toastErr(err); }
  });
}

// Datos reales del sistema: la versión sale del catálogo de módulos y el estado
// del asistente de su propio endpoint. Antes esta tarjeta era un párrafo fijo.
async function cargarAcerca(page) {
  const ver = $('#ab-version', page);
  const vito = $('#ab-vito', page);
  try {
    const mods = await api.get('/api/modules');
    const m = (mods.modules || []).find((x) => x.id === 'onstock') || (mods.modules || [])[0];
    if (ver && m) ver.textContent = `${m.name} ${m.version}`;
  } catch { if (ver) ver.textContent = 'OnStock'; }
  try {
    const st = await api.get('/api/vito/status');
    if (vito) {
      vito.innerHTML = st.enabled
        ? '<span class="badge badge-green">Activo</span> Consulta tus datos y prepara órdenes de compra.'
        : '<span class="badge badge-gray">Desactivado</span> El sistema funciona igual; el asistente es opcional.';
    }
  } catch { if (vito) vito.textContent = 'No disponible'; }
}
