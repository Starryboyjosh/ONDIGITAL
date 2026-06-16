// Nueva venta (POS): escáner de código de barras, carrito y cobro con ISV.
import { api } from '../api.js';
import {
  $, $$, esc, money, num, icons, toast, toastErr,
  openModal, productPicker, state,
} from '../ui.js';

let cart = []; // {product, qty, unitPrice}  unitPrice tal como se muestra (con/sin ISV según config)

export async function render(page) {
  cart = [];
  const inclISV = state.settings.prices_include_isv === '1';

  page.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Nueva venta</h1>
        <div class="sub">Escanea el código de barras o busca el producto · precios ${inclISV ? 'con ISV incluido' : 'sin ISV'}</div>
      </div>
      <div class="page-actions">
        <a href="#/ventas" class="btn btn-outline">← Volver a ventas</a>
      </div>
    </div>

    <div class="pos-grid">
      <div>
        <div class="card card-pad mb">
          <div class="search-wrap">${icons.search}
            <input class="input" id="pos-search" placeholder="Escanea el código de barras o escribe para buscar… (Enter)" style="font-size:15.5px; padding:12px 12px 12px 36px" autofocus>
          </div>
        </div>
        <div class="card">
          <h2>Carrito <span class="muted" id="cart-count">0 productos</span></h2>
          <div id="cart-table"></div>
        </div>
      </div>

      <div class="card card-pad" style="position:sticky; top:20px">
        <div class="pos-total-row"><span>Subtotal (sin ISV)</span><span id="t-sub">—</span></div>
        <div class="pos-total-row"><span>ISV</span><span id="t-isv">—</span></div>
        <div class="pos-total-row" style="align-items:center">
          <span>Descuento (${esc(state.settings.currency_symbol || 'L')})</span>
          <input class="input price-input" id="t-disc" type="number" min="0" step="0.01" value="0">
        </div>
        <div class="pos-total-row grand"><span>Total</span><span id="t-total">${money(0)}</span></div>

        <hr class="sep">
        <div class="form-grid" style="grid-template-columns:1fr">
          <label class="field">Cliente (opcional)
            <input class="input" id="c-name" placeholder="Consumidor final">
          </label>
          <label class="field">RTN (opcional)
            <input class="input" id="c-rtn" placeholder="0801…">
          </label>
          <label class="field">Método de pago
            <select class="input" id="c-pay">
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
              <option value="credito">Crédito</option>
            </select>
          </label>
          <label class="field">Notas
            <input class="input" id="c-notes" placeholder="Opcional">
          </label>
        </div>
        <button class="btn btn-green" id="btn-charge" style="width:100%; margin-top:14px; padding:12px; font-size:15px" disabled>
          ${icons.check} Cobrar (F2)
        </button>
      </div>
    </div>`;

  const searchInput = $('#pos-search', page);
  productPicker(searchInput, (p) => addToCart(p, page));

  $('#t-disc', page).addEventListener('input', () => updateTotals(page));
  $('#btn-charge', page).addEventListener('click', () => charge(page));

  const onKey = (e) => {
    if (e.key === 'F2') { e.preventDefault(); charge(page); }
  };
  document.addEventListener('keydown', onKey);
  window.addEventListener('hashchange', () => document.removeEventListener('keydown', onKey), { once: true });

  renderCart(page);
}

function addToCart(p, page) {
  if (p.stock <= 0 && state.settings.allow_negative_stock !== '1') {
    toast(`"${p.name}" no tiene stock disponible`, 'error');
    return;
  }
  const existing = cart.find(l => l.product.id === p.id);
  if (existing) existing.qty += 1;
  else cart.push({ product: p, qty: 1, unitPrice: p.price });
  renderCart(page);
  $('#pos-search', page).focus();
}

function renderCart(page) {
  const root = $('#cart-table', page);
  $('#cart-count', page).textContent = `${cart.length} producto${cart.length === 1 ? '' : 's'}`;

  if (!cart.length) {
    root.innerHTML = '<div class="empty-state"><b>Carrito vacío</b>Escanea un código de barras o busca un producto arriba.</div>';
    updateTotals(page);
    return;
  }

  root.innerHTML = `
    <div class="table-wrap"><table class="table">
      <thead><tr>
        <th>Producto</th><th class="num">Precio</th><th class="num">Cant.</th>
        <th class="num">Importe</th><th></th>
      </tr></thead>
      <tbody>
        ${cart.map((l, i) => `
          <tr data-i="${i}">
            <td>
              <div class="cell-main">${esc(l.product.name)}</div>
              <div class="cell-sub mono">${esc(l.product.sku)} · stock ${num(l.product.stock)}</div>
            </td>
            <td class="num"><input class="input price-input" data-price type="number" min="0" step="0.01" value="${l.unitPrice}"></td>
            <td class="num"><input class="input qty-input" data-qty type="number" min="0.01" step="any" value="${l.qty}"></td>
            <td class="num cell-main" data-amount>${money(l.unitPrice * l.qty)}</td>
            <td class="actions-cell">
              <button class="btn btn-sm btn-ghost btn-icon" data-remove title="Quitar">${icons.x}</button>
            </td>
          </tr>`).join('')}
      </tbody>
    </table></div>`;

  $$('tr[data-i]', root).forEach(row => {
    const i = +row.dataset.i;
    row.querySelector('[data-price]').addEventListener('input', (e) => {
      cart[i].unitPrice = +e.target.value || 0;
      row.querySelector('[data-amount]').textContent = money(cart[i].unitPrice * cart[i].qty);
      updateTotals(page);
    });
    row.querySelector('[data-qty]').addEventListener('input', (e) => {
      cart[i].qty = +e.target.value || 0;
      row.querySelector('[data-amount]').textContent = money(cart[i].unitPrice * cart[i].qty);
      updateTotals(page);
    });
    row.querySelector('[data-remove]').addEventListener('click', () => {
      cart.splice(i, 1);
      renderCart(page);
    });
  });

  updateTotals(page);
}

// Refleja la misma lógica del servidor para que el usuario vea los montos exactos.
function computeTotals() {
  const inclISV = state.settings.prices_include_isv === '1';
  let gross = 0, net = 0;
  for (const l of cart) {
    const rate = l.product.isv_rate / 100;
    const lineUnit = l.unitPrice;
    let lineGross, lineNet;
    if (inclISV) { lineGross = lineUnit * l.qty; lineNet = lineGross / (1 + rate); }
    else { lineNet = lineUnit * l.qty; lineGross = lineNet * (1 + rate); }
    gross += lineGross;
    net += lineNet;
  }
  return { gross, net };
}

function updateTotals(page) {
  const { gross, net } = computeTotals();
  let disc = +$('#t-disc', page).value || 0;
  if (disc < 0) disc = 0;
  if (disc > gross) disc = gross;
  const factor = gross > 0 ? (gross - disc) / gross : 1;
  const netTotal = net * factor;
  const total = gross - disc;
  const isv = total - netTotal;

  $('#t-sub', page).textContent = money(netTotal);
  $('#t-isv', page).textContent = money(isv);
  $('#t-total', page).textContent = money(total);
  $('#btn-charge', page).disabled = cart.length === 0 || total < 0 || cart.some(l => l.qty <= 0);
}

async function charge(page) {
  if (!cart.length) return;
  const btn = $('#btn-charge', page);
  if (btn.disabled) return;
  btn.disabled = true;

  const body = {
    customer_name: $('#c-name', page).value.trim(),
    customer_rtn: $('#c-rtn', page).value.trim(),
    discount: +$('#t-disc', page).value || 0,
    payment_method: $('#c-pay', page).value,
    notes: $('#c-notes', page).value,
    items: cart.map(l => ({
      product_id: l.product.id,
      qty: l.qty,
      unit_price: l.unitPrice !== l.product.price ? l.unitPrice : undefined,
    })),
  };

  try {
    const sale = await api.post('/api/sales', body);
    const m = openModal({
      title: '✓ Venta registrada',
      body: `
        <div style="text-align:center; padding:8px 0">
          <div style="font-size:14px; color:var(--text-2)">Venta <b class="mono">${esc(sale.sale_number)}</b></div>
          <div style="font-size:34px; font-weight:800; margin:8px 0">${money(sale.total)}</div>
          <div class="muted">Subtotal ${money(sale.subtotal)} · ISV ${money(sale.isv)}</div>
        </div>`,
      footer: `
        <a href="#/ventas" class="btn btn-outline">Ver ventas</a>
        <button class="btn btn-primary" data-next>${icons.cart} Siguiente venta</button>`,
      onClose: () => { cart = []; renderCart(page); },
    });
    m.el.querySelector('[data-next]').addEventListener('click', () => {
      m.close();
      $('#pos-search', page).focus();
    });
    cart = [];
    renderCart(page);
    ['c-name', 'c-rtn', 'c-notes'].forEach(id => { $('#' + id, page).value = ''; });
    $('#t-disc', page).value = '0';
  } catch (err) {
    toastErr(err);
    btn.disabled = false;
  }
}
