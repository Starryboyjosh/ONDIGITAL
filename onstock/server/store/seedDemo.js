// Traducción de internal/store/seed_demo.go.
//
// ÚNICA DIVERGENCIA DELIBERADA DEL PORT COMPLETO
// ----------------------------------------------
// El original usa math/rand con semilla fija (20260214). Ese generador es el
// lagged Fibonacci de Go, cuyo estado inicial es una tabla de 607 constantes
// que vive dentro del runtime: no se puede reproducir desde fuera. Aquí se usa
// mulberry32 con la MISMA semilla, así que el resultado es igual de
// reproducible (misma semilla → mismos datos, siempre) pero la secuencia de
// números no coincide con la del binario de Go.
//
// Qué implica en la práctica: la forma del dataset es idéntica —mismos
// productos, mismos proveedores, misma densidad de tickets por mes, mismo
// escalado de costos, mismos gastos fijos, mismos cinco SKU en rojo y los tres
// estancados— pero los tickets concretos (qué día, cuánto, a quién) difieren.
// Los totales caen en el mismo orden de magnitud, no en el mismo centavo.
//
// Esto solo afecta a `-seed-demo`, que genera datos nuevos. Una base ya sembrada
// —como onstock/data/onstock.db— no se toca y se lee exactamente igual.
import { round2, BizError } from '../db.js';
import { ymd, ymdhms, addDate, primerDiaDelMes } from '../lib/fechas.js';

// mulberry32: generador determinista de 32 bits, corto y sin dependencias.
function nuevoAzar(semilla) {
  let a = semilla >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    float64: next,
    intn: (n) => Math.floor(next() * n),
  };
}

export function seedDemo(store, force) {
  const db = store.db;
  const n = db.scalar('SELECT COUNT(*) FROM products');
  if (n > 0 && !force) {
    throw new BizError(`ya hay ${n} productos; usa -seed-demo-force para reemplazar con datos de demo`);
  }
  if (force) clearDemoTables(db);

  // Empresa demo (HN)
  store.setSettings({
    company_name: 'Abarrotes El Progreso',
    company_rtn: '08019001234567',
    company_address: 'Barrio Guamilito, San Pedro Sula, Cortés',
    company_phone: '+504 2222-3344',
    currency_symbol: 'L',
    prices_include_isv: '1',
    isv_rate_default: '15',
    demo_seeded: '1',
  });

  // Categorías
  const cats = [
    { name: 'Abarrotes', prefix: 'ABA' },
    { name: 'Bebidas', prefix: 'BEB' },
    { name: 'Limpieza', prefix: 'LIM' },
    { name: 'Snacks', prefix: 'SNK' },
  ];
  const catIDs = {};
  for (const c of cats) {
    let id = db.scalar('SELECT id FROM categories WHERE name=?', c.name);
    if (id === undefined) id = store.createCategory({ name: c.name, prefix: c.prefix }).id;
    catIDs[c.name] = id;
  }

  // Proveedores
  const supA = store.createSupplier({
    name: 'Distribuidora del Valle',
    rtn: '08019009876543',
    contact_name: 'María López',
    phone: '+504 9876-5432',
    email: 'ventas@valle.hn',
    address: 'Bulevar del Norte, San Pedro Sula',
  });
  const supB = store.createSupplier({
    name: 'Importadora Caribe SA',
    rtn: '05019001112233',
    contact_name: 'Carlos Méndez',
    phone: '+504 9456-1122',
    email: 'pedidos@caribe.hn',
    address: 'Zona Industrial, Villanueva, Cortés',
  });
  const idA = supA.id;
  const idB = supB.id;

  // Los códigos son EAN-13 válidos (dígito verificador correcto) con el prefijo
  // 744 de Honduras. Son sintéticos: no pertenecen a ningún fabricante real, pero
  // se escanean como los de verdad, así la caja se puede probar con una pistola
  // desde el primer arranque y las etiquetas salen con código legible.
  // [sku, barcode, name, cat, sup, cost, price, stock, min, isv]
  const prods = [
    // Stock saludable + alto movimiento
    ['ABA-001', '7441210000016', 'Arroz Premium 5 lb', 'Abarrotes', idA, 45, 68, 80, 20, 15],
    ['ABA-002', '7441210000023', 'Frijol rojo 2 lb', 'Abarrotes', idA, 28, 42, 60, 15, 15],
    ['ABA-003', '7441210000030', 'Aceite vegetal 1 L', 'Abarrotes', idA, 38, 55, 45, 12, 15],
    ['ABA-004', '7441210000047', 'Azúcar blanca 2 lb', 'Abarrotes', idA, 22, 34, 50, 15, 15],
    ['ABA-005', '7441210000054', 'Sal de mesa 400 g', 'Abarrotes', idA, 8, 14, 70, 20, 15],
    // Bebidas
    ['BEB-001', '7441220000013', 'Agua purificada 600 ml', 'Bebidas', idB, 5, 12, 120, 30, 15],
    ['BEB-002', '7441220000020', 'Refresco cola 2 L', 'Bebidas', idB, 22, 35, 40, 12, 15],
    ['BEB-003', '7441220000037', 'Jugo de naranja 1 L', 'Bebidas', idB, 18, 32, 25, 10, 15],
    // Limpieza
    ['LIM-001', '7441230000010', 'Detergente en polvo 1 kg', 'Limpieza', idB, 48, 75, 22, 8, 15],
    ['LIM-002', '7441230000027', 'Cloro 1 L', 'Limpieza', idA, 15, 28, 18, 6, 15],
    ['LIM-003', '7441230000034', 'Jabón de barra 3-pack', 'Limpieza', idA, 20, 35, 30, 10, 15],
    // Snacks
    ['SNK-001', '7441240000017', 'Galletas de soda', 'Snacks', idB, 12, 22, 55, 15, 15],
    ['SNK-002', '7441240000024', 'Churros de maíz', 'Snacks', idB, 8, 15, 40, 12, 15],
    // Stock bajo / por agotarse (para Vito)
    ['ABA-010', '7441210000108', 'Leche en polvo 400 g', 'Abarrotes', idA, 95, 135, 3, 12, 15],
    ['ABA-011', '7441210000115', 'Café molido 400 g', 'Abarrotes', idA, 85, 125, 2, 10, 15],
    ['BEB-010', '7441220000105', 'Leche UHT 1 L', 'Bebidas', idB, 22, 36, 4, 15, 15],
    ['LIM-010', '7441230000102', 'Papel higiénico 12 rollos', 'Limpieza', idB, 68, 110, 1, 8, 15],
    ['SNK-010', '7441240000109', 'Chocolate de mesa', 'Snacks', idA, 25, 42, 0, 6, 15],
    // Lento / estancado (poco o nada se vende, stock alto)
    ['ABA-090', '7441210000900', 'Sardinas en lata (caja 24)', 'Abarrotes', idA, 180, 260, 18, 4, 15],
    ['LIM-090', '7441230000904', 'Ambientador en aerosol', 'Limpieza', idB, 35, 58, 25, 5, 15],
    ['SNK-090', '7441240000901', 'Gomitas importadas', 'Snacks', idB, 40, 70, 22, 5, 15],
  ];

  // Descripción corta por categoría: lo que un dueño escribiría de verdad en la
  // ficha del producto. Nunca texto de relleno ni la palabra "demo".
  const descPorCategoria = {
    Abarrotes: 'Abarrote de rotación diaria · se vende por unidad.',
    Bebidas: 'Bebida para refrigerador · unidad y paca.',
    Limpieza: 'Producto de limpieza para el hogar.',
    Snacks: 'Snack de exhibidor · caja abierta al detalle.',
  };

  const prodBySKU = {};
  // Costo y stock de lista: el histórico compra contra el costo de lista (no
  // contra el promedio ya movido) y al final devuelve las existencias a estos
  // números, para que la pantalla de Productos sea la que este archivo declara.
  const costoBase = {};
  const stockBase = {};
  const supBySKU = {};
  for (const [sku, barcode, name, cat, sup, cost, price, stock, min, isv] of prods) {
    const p = store.createProduct({
      sku, barcode, name, category_id: catIDs[cat], supplier_id: sup,
      cost, price, stock, min_stock: min, isv_rate: isv, active: true,
      description: descPorCategoria[cat],
    });
    prodBySKU[sku] = p;
    costoBase[sku] = cost;
    stockBase[sku] = stock;
    supBySKU[sku] = sup;
  }

  const now = new Date();
  let poCount = 0;

  // Crea una orden ya recibida y la fecha en el pasado: setPOStatus siempre
  // sella la recepción "hoy", y el histórico necesita su fecha real.
  const compraRecibida = (sup, orden, plazoDias, nota, items) => {
    if (items.length === 0) return;
    const po = store.createPurchaseOrder({
      supplier_id: sup,
      order_date: ymd(orden),
      expected_date: ymd(addDate(orden, 0, 0, plazoDias)),
      notes: nota,
      items,
    });
    store.setPOStatus(po.id, 'recibida');
    let recibida = addDate(orden, 0, 0, plazoDias);
    if (recibida > now) recibida = now;
    db.run('UPDATE purchase_orders SET received_date=? WHERE id=?', ymd(recibida), po.id);
    poCount++;
  };

  // ── Histórico de doce meses ──────────────────────────────────────────────
  //
  // El tablero abre con una serie de doce meses y los informes se filtran por
  // período: sin histórico ambos se ven vacíos y la demo parece rota. Aquí se
  // genera mes a mes, con semilla fija para que sea reproducible, y en el
  // orden en que ocurre de verdad — primero entra la compra del mes, después
  // se vende contra ella. El volumen crece a lo largo del año (el negocio
  // prospera) y el costo sube ~12 % de punta a punta, así que el margen que
  // reportan los informes es el que realmente resultó y no un número puesto a
  // mano.
  const rnd = nuevoAzar(20260214);

  // Solo lo que de verdad rota: los cinco SKU en rojo y los tres estancados
  // quedan fuera a propósito, porque son el material de las preguntas a Vito.
  // [sku, peso, min, max]
  const rotables = [
    ['ABA-001', 10, 1, 8], ['ABA-002', 9, 1, 6], ['ABA-003', 8, 1, 4],
    ['ABA-004', 8, 1, 5], ['ABA-005', 5, 1, 3],
    ['BEB-001', 12, 4, 24], ['BEB-002', 8, 1, 6], ['BEB-003', 4, 1, 3],
    ['LIM-001', 5, 1, 3], ['LIM-002', 4, 1, 3], ['LIM-003', 5, 1, 3],
    ['SNK-001', 9, 2, 12], ['SNK-002', 7, 2, 8],
  ].map(([sku, peso, min, max]) => ({ sku, peso, min, max }));
  let pesoTotal = 0;
  for (const r of rotables) pesoTotal += r.peso;
  const escoger = () => {
    let k = rnd.intn(pesoTotal);
    for (const r of rotables) {
      if (k < r.peso) return r;
      k -= r.peso;
    }
    return rotables[0];
  };

  const clientesHab = [
    'Cliente mostrador', 'Cliente mostrador', 'Cliente mostrador', 'Cliente mostrador',
    'Pulpería La Esquina', 'Comedor Doña Luz', 'Ana García', 'José Martínez',
    'Cafetería Guamilito', 'Tienda Doña Marta', 'Oficina Contable HN',
  ];
  const pagosHab = ['efectivo', 'efectivo', 'efectivo', 'efectivo', 'tarjeta', 'transferencia'];
  const mesesES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  // Ventas de vitrina: clientes con nombre en los últimos ~25 días. Se declara
  // aquí arriba porque el histórico mensual descuenta estos tickets de su
  // presupuesto: si no, el último mes cerrado sale inflado y rompe la curva.
  // [daysAgo, customer, items[[sku,qty]], pay]
  const plans = [
    [0, 'Cliente mostrador', [['ABA-001', 2], ['BEB-001', 6], ['SNK-001', 3]], 'efectivo'],
    [0, 'Ana García', [['ABA-002', 1], ['ABA-003', 1], ['LIM-001', 1]], 'tarjeta'],
    [1, 'Cliente mostrador', [['BEB-002', 4], ['SNK-002', 5], ['ABA-004', 2]], 'efectivo'],
    [2, 'Pulpería La Esquina', [['ABA-001', 5], ['ABA-002', 4], ['BEB-001', 12]], 'transferencia'],
    [3, 'Cliente mostrador', [['LIM-002', 2], ['LIM-003', 1], ['ABA-005', 3]], 'efectivo'],
    [4, 'José Martínez', [['BEB-003', 2], ['SNK-001', 4], ['ABA-003', 2]], 'tarjeta'],
    [5, 'Cliente mostrador', [['ABA-001', 1], ['BEB-002', 2]], 'efectivo'],
    [6, 'Comedor Doña Luz', [['ABA-001', 8], ['ABA-002', 6], ['ABA-004', 4], ['ABA-003', 3]], 'transferencia'],
    [7, 'Cliente mostrador', [['SNK-002', 8], ['BEB-001', 10]], 'efectivo'],
    [8, 'Oficina Contable HN', [['BEB-001', 24], ['SNK-001', 12]], 'transferencia'],
    [10, 'Cliente mostrador', [['ABA-003', 3], ['LIM-001', 2]], 'efectivo'],
    [12, 'Pulpería La Esquina', [['ABA-001', 6], ['BEB-002', 6], ['ABA-010', 2]], 'efectivo'],
    [14, 'Cliente mostrador', [['BEB-010', 3], ['ABA-011', 1]], 'tarjeta'],
    [18, 'Ana García', [['ABA-002', 2], ['LIM-003', 2], ['SNK-001', 2]], 'efectivo'],
    [21, 'Cliente mostrador', [['ABA-001', 3], ['BEB-001', 8], ['ABA-005', 2]], 'efectivo'],
    [24, 'Comedor Doña Luz', [['ABA-001', 10], ['ABA-002', 8], ['ABA-003', 4]], 'transferencia'],
  ].map(([daysAgo, customer, items, pay]) => ({ daysAgo, customer, items, pay }));

  // Tickets por mes, del más viejo al actual.
  const densidad = [26, 28, 31, 34, 37, 40, 44, 48, 52, 56, 60, 66];

  // Las ventas de vitrina caen todas en las últimas semanas y son más gordas
  // que el ticket corriente (~L420 contra ~L300). Si se suman encima del
  // histórico, el último mes cerrado se dispara y la curva de doce meses
  // parece un error de datos. Así que se descuentan del presupuesto del mes
  // donde caen, ponderadas por lo que pesan de más.
  const pesoVitrina = 1.4;
  const vitrinaPorMes = new Map();
  for (const sp of plans) {
    const f = addDate(now, 0, 0, -sp.daysAgo);
    const mesesAtras = (now.getFullYear() - f.getFullYear()) * 12 + (now.getMonth() - f.getMonth());
    vitrinaPorMes.set(mesesAtras, (vitrinaPorMes.get(mesesAtras) ?? 0) + 1);
  }

  let histVentas = 0;
  for (let idx = 0; idx < densidad.length; idx++) {
    let tickets = densidad[idx];
    const mesesAtras = densidad.length - 1 - idx;
    const primero = addDate(primerDiaDelMes(now), 0, -mesesAtras, 0);
    const diasDelMes = addDate(primero, 0, 1, -1).getDate();
    let ultimoDia = diasDelMes;
    if (mesesAtras === 0) {
      // Mes en curso: solo hasta hoy, y el volumen a prorrata.
      ultimoDia = now.getDate();
      tickets = Math.trunc((tickets * ultimoDia) / diasDelMes) + 2;
    }
    tickets -= Math.round((vitrinaPorMes.get(mesesAtras) ?? 0) * pesoVitrina);
    if (tickets < 4) tickets = 4;

    // 1) Qué se vende este mes, y por tanto qué hay que comprar.
    const planes = [];
    const requerido = {};
    for (let i = 0; i < tickets; i++) {
      const tp = {
        dia: 1 + rnd.intn(ultimoDia),
        hora: 8 + rnd.intn(11),
        minuto: rnd.intn(60),
        quien: clientesHab[rnd.intn(clientesHab.length)],
        pago: pagosHab[rnd.intn(pagosHab.length)],
        lineas: [],
      };
      const vistos = new Set();
      const cuantas = 2 + rnd.intn(3);
      for (let j = 0; j < cuantas; j++) {
        const r = escoger();
        if (vistos.has(r.sku)) continue;
        vistos.add(r.sku);
        const q = r.min + rnd.intn(r.max - r.min + 1);
        tp.lineas.push({ sku: r.sku, qty: q });
        requerido[r.sku] = (requerido[r.sku] ?? 0) + q;
      }
      if (tp.lineas.length === 0) continue;
      planes.push(tp);
    }
    // Estable, como sort.SliceStable.
    planes.sort((a, b) => (a.dia !== b.dia ? a.dia - b.dia : a.hora - b.hora));

    // 2) La compra del mes, dimensionada contra ese consumo y separada por
    //    proveedor. El costo de lista sube poco a poco: el promedio
    //    ponderado que ven los informes se mueve solo, como en la vida real.
    const factorCosto = 0.88 + 0.011 * idx;
    const porProveedor = new Map();
    for (const r of rotables) {
      const need = requerido[r.sku] ?? 0;
      if (need <= 0) continue;
      const sup = supBySKU[r.sku];
      if (sup === undefined) continue;
      if (!porProveedor.has(sup)) porProveedor.set(sup, []);
      porProveedor.get(sup).push({
        product_id: prodBySKU[r.sku].id,
        qty: Math.ceil(need) + 2,
        unit_cost: round2(costoBase[r.sku] * factorCosto),
      });
    }
    let diaOrden = 2;
    if (diaOrden > ultimoDia) diaOrden = ultimoDia;
    const orden = new Date(primero.getFullYear(), primero.getMonth(), diaOrden);
    const nombreMes = mesesES[primero.getMonth()];
    for (const sup of [idA, idB]) {
      const items = porProveedor.get(sup) ?? [];
      if (items.length === 0) continue;
      const nota = sup === idB
        ? `Reposición de ${nombreMes} · bebidas, limpieza y snacks`
        : `Reposición de ${nombreMes} · granos y abarrotes`;
      compraRecibida(sup, orden, 2, nota, items);
    }

    // 3) Las ventas del mes, contra el inventario que acaba de entrar.
    for (const tp of planes) {
      const items = tp.lineas.map((l) => ({ product_id: prodBySKU[l.sku].id, qty: l.qty }));
      const venta = store.createSale({
        customer_name: tp.quien,
        payment_method: tp.pago,
        items,
      });
      const cuando = new Date(primero.getFullYear(), primero.getMonth(), tp.dia, tp.hora, tp.minuto, 0);
      db.run('UPDATE sales SET sale_date=? WHERE id=?', ymdhms(cuando), venta.id);
      histVentas++;
    }
  }

  // Órdenes de compra abiertas. El histórico ya dejó la página de Compras
  // llena de recibidas; estas cuatro son las que muestran los otros estados:
  // lo que va en camino, lo que está en borrador y una que se cayó.
  const poAbiertas = [
    { sup: idB, daysAgo: 6, expectedDays: 3, status: 'cancelada', notes: 'Cancelada: el proveedor no tuvo existencia', items: [['SNK-090', 30, 39]] },
    { sup: idA, daysAgo: 2, expectedDays: 3, status: 'enviada', notes: 'Urgente · reposición de faltantes', items: [['ABA-010', 24, 93], ['ABA-011', 20, 83], ['SNK-010', 18, 24]] },
    { sup: idB, daysAgo: 1, expectedDays: 4, status: 'enviada', notes: 'Lácteos y papel · confirmado por teléfono', items: [['BEB-010', 48, 21.50], ['LIM-010', 20, 66]] },
    { sup: idA, daysAgo: 0, expectedDays: 5, status: 'borrador', notes: 'Pendiente de confirmar precio de lista', items: [['ABA-003', 36, 37], ['LIM-002', 24, 14.50], ['LIM-003', 24, 19]] },
  ];
  for (const pp of poAbiertas) {
    const items = [];
    for (const [sku, qty, cost] of pp.items) {
      const p = prodBySKU[sku];
      if (!p) continue;
      items.push({ product_id: p.id, qty, unit_cost: cost });
    }
    if (items.length === 0) continue;
    const orderDay = addDate(now, 0, 0, -pp.daysAgo);
    const po = store.createPurchaseOrder({
      supplier_id: pp.sup,
      order_date: ymd(orderDay),
      expected_date: ymd(addDate(orderDay, 0, 0, pp.expectedDays)),
      notes: pp.notes,
      items,
    });
    if (pp.status !== 'borrador') store.setPOStatus(po.id, pp.status);
    poCount++;
  }

  // Refresca el caché: doce meses de compras y ventas movieron stock y costo.
  for (const sku of Object.keys(prodBySKU)) {
    prodBySKU[sku] = store.getProduct(prodBySKU[sku].id);
  }

  let salesCount = 0;
  for (const sp of plans) {
    const items = [];
    for (const [sku, qty] of sp.items) {
      let p = prodBySKU[sku];
      if (!p || qty <= 0) continue;
      if (p.stock < qty) {
        // Sube el stock para que la venta sembrada pase.
        store.adjustStock(p.id, 'entrada', qty + 5, 'Recepción de mercadería');
        p = store.getProduct(p.id);
        prodBySKU[sku] = p;
      }
      items.push({ product_id: p.id, qty });
    }
    if (items.length === 0) continue;
    const sale = store.createSale({
      customer_name: sp.customer,
      payment_method: sp.pay,
      items,
    });
    // Retrocede la fecha para los reportes y los períodos de Vito.
    const day = ymd(addDate(now, 0, 0, -sp.daysAgo));
    db.run('UPDATE sales SET sale_date=? WHERE id=?', `${day} 12:00:00`, sale.id);
    for (const [sku] of sp.items) {
      if (prodBySKU[sku]) prodBySKU[sku] = store.getProduct(prodBySKU[sku].id);
    }
    salesCount++;
  }

  // Dos tickets que completan el cuadro operativo. Sin ellos el Estado de
  // Resultados siempre muestra "Descuentos y rebajas L 0.00" y la página de
  // Ventas nunca enseña cómo se ve —ni cómo se reversa— una anulación.
  const extraVentas = [
    {
      daysAgo: 3, cliente: 'Pulpería La Esquina', pago: 'transferencia', descuento: 145, anular: false,
      notas: 'Descuento de mayoreo acordado con el cliente',
      lineas: [['ABA-001', 12], ['BEB-001', 24], ['ABA-004', 6]],
    },
    {
      daysAgo: 9, cliente: 'Cliente mostrador', pago: 'efectivo', descuento: 0, anular: true,
      notas: 'Anulada: el cliente se arrepintió antes de salir',
      lineas: [['BEB-002', 3], ['SNK-002', 2]],
    },
  ];
  for (const ev of extraVentas) {
    const items = [];
    for (const [sku, qty] of ev.lineas) {
      let p = prodBySKU[sku];
      if (!p) continue;
      if (p.stock < qty) {
        store.adjustStock(p.id, 'entrada', qty + 5, 'Recepción de mercadería');
        p = store.getProduct(p.id);
        prodBySKU[sku] = p;
      }
      items.push({ product_id: p.id, qty });
    }
    if (items.length === 0) continue;
    const venta = store.createSale({
      customer_name: ev.cliente,
      payment_method: ev.pago,
      discount: ev.descuento,
      notes: ev.notas,
      items,
    });
    const day = ymd(addDate(now, 0, 0, -ev.daysAgo));
    db.run('UPDATE sales SET sale_date=? WHERE id=?', `${day} 16:30:00`, venta.id);
    if (ev.anular) store.voidSale(venta.id);
    else salesCount++;
    for (const [sku] of ev.lineas) {
      if (prodBySKU[sku]) prodBySKU[sku] = store.getProduct(prodBySKU[sku].id);
    }
  }

  // Conteo físico de cierre. Un año de compras y ventas deja las existencias a
  // la deriva; este ajuste las devuelve a los números que declara la tabla de
  // productos, para que la pantalla de Productos sea exactamente el dataset
  // diseñado — incluidos los cinco SKU en rojo que sostienen las preguntas a
  // Vito y los tres estancados.
  const metas = Object.keys(stockBase).sort();
  for (const sku of metas) {
    const p = prodBySKU[sku];
    if (!p || !p.id) continue;
    const cur = store.getProduct(p.id);
    if (cur.stock === stockBase[sku]) continue;
    store.adjustStock(p.id, 'ajuste', stockBase[sku], 'Conteo físico de inventario');
  }

  // Gastos fijos recurrentes de los últimos doce meses. Sin ellos el estado de
  // resultados y la utilidad neta de los informes salen inflados, y la página
  // de Gastos abre casi vacía. Cada uno cae en su día del mes, así que el
  // gasto acumulado del mes en curso crece junto con el mes, como de verdad.
  // [dia, cat, desc, monto, ajuste]
  const fijos = [
    [2, 'ventas', 'Combustible del reparto', 520, 60],
    [4, 'otros', 'Bolsas y empaque', 240, 35],
    [8, 'administrativos', 'Energía eléctrica', 1150, 180],
    [12, 'administrativos', 'Internet y teléfono', 890, 0],
    [20, 'ventas', 'Publicidad Facebook local', 380, 70],
  ];
  let expCount = 0;
  for (let i = 11; i >= 0; i--) {
    const mes = addDate(primerDiaDelMes(now), 0, -i, 0);
    for (const [dia, cat, desc, monto0, ajuste] of fijos) {
      const fecha = new Date(mes.getFullYear(), mes.getMonth(), dia);
      if (fecha > now) continue; // todavía no toca pagarlo este mes
      let monto = monto0;
      if (ajuste > 0) monto = round2(monto0 + (rnd.float64() * 2 - 1) * ajuste);
      store.createExpense({
        expense_date: ymd(fecha),
        category: cat,
        description: desc,
        amount: monto,
      });
      expCount++;
    }
  }
  // Un par de gastos extraordinarios, para que la categoría "otros" no sea
  // siempre la misma línea.
  const extras = [
    { expense_date: ymd(addDate(now, 0, 0, -12)), category: 'otros', description: 'Mantenimiento de refrigerador', amount: 1200 },
    { expense_date: ymd(addDate(now, 0, -4, 0)), category: 'administrativos', description: 'Renovación de permiso de operación', amount: 2400 },
    { expense_date: ymd(addDate(now, 0, -7, 0)), category: 'financieros', description: 'Comisión por datáfono', amount: 640 },
  ];
  for (const e of extras) {
    store.createExpense(e);
    expCount++;
  }

  // El histórico se arma por bloques (doce meses, vitrina reciente, casos
  // especiales) y cada bloque toma el siguiente correlativo libre antes de que
  // la venta se retroceda de fecha. Sin este paso la lista de Ventas abriría
  // con V-000460 encima de V-000429, que es lo primero que revisa un contador.
  renumberSales(db);

  // El movimiento de inventario lo sella el reloj al crearse, así que después
  // de retroceder las ventas y las compras el kardex seguía mostrando el año
  // entero con la fecha de instalación: Ventas decía noviembre y el mismo
  // movimiento decía hoy.
  backdateMovements(db);

  const low = db.scalar('SELECT COUNT(*) FROM products WHERE active=1 AND stock <= min_stock');

  return {
    forced: !!force,
    categories: cats.length,
    suppliers: 2,
    products: prods.length,
    purchases: poCount,
    sales: salesCount + histVentas,
    expenses: expCount,
    low_stock: low,
  };
}

// backdateMovements alinea cada movimiento de inventario con la fecha del
// documento que lo originó: la venta con su fecha de venta, la compra con el día
// en que se recibió y el saldo de apertura con el día previo a la primera orden.
// Se ejecuta después de renumberSales porque la referencia guardada en el
// movimiento es justamente el correlativo que esa función reasigna.
function backdateMovements(db) {
  db.transaction(() => {
    db.run(`UPDATE stock_movements
	  SET created_at = (SELECT v.sale_date FROM sales v WHERE v.sale_number = stock_movements.reference)
	  WHERE type IN ('venta','anulacion')
	    AND EXISTS (SELECT 1 FROM sales v WHERE v.sale_number = stock_movements.reference)`);

    // La mercadería entra al stock el día de la recepción, no el de la orden.
    db.run(`UPDATE stock_movements
	  SET created_at = (SELECT po.received_date || ' 09:00:00' FROM purchase_orders po
	                    WHERE po.po_number = stock_movements.reference AND po.received_date <> '')
	  WHERE type = 'compra'
	    AND EXISTS (SELECT 1 FROM purchase_orders po
	                WHERE po.po_number = stock_movements.reference AND po.received_date <> '')`);

    // Saldo de apertura: un día antes de la primera compra, para que el kardex
    // no abra con una entrada posterior al primer ingreso de mercadería.
    db.run(`UPDATE stock_movements
	  SET created_at = (SELECT date(MIN(po.order_date), '-1 day') || ' 08:00:00' FROM purchase_orders po)
	  WHERE reference = 'Inventario inicial'
	    AND (SELECT COUNT(*) FROM purchase_orders) > 0`);
  });
}

// renumberSales reasigna los correlativos para que asciendan con la fecha de
// venta, arrastrando la referencia guardada en los movimientos de inventario.
// Va en dos pasadas porque sale_number es UNIQUE y una renumeración en sitio
// chocaría contra los números todavía ocupados.
function renumberSales(db) {
  const ventas = db.all('SELECT id, sale_number FROM sales ORDER BY sale_date, id');
  db.transaction(() => {
    const mover = (from, to) => {
      db.run('UPDATE sales SET sale_number=? WHERE sale_number=?', to, from);
      db.run("UPDATE stock_movements SET reference=? WHERE reference=? AND type IN ('venta','anulacion')", to, from);
    };
    for (const v of ventas) mover(v.sale_number, `tmp-${v.id}`);
    for (let i = 0; i < ventas.length; i++) {
      mover(`tmp-${ventas[i].id}`, `V-${String(i + 1).padStart(6, '0')}`);
    }
  });
}

function clearDemoTables(db) {
  // El orden respeta las claves foráneas y las dependencias lógicas.
  const stmts = [
    'DELETE FROM sale_items',
    'DELETE FROM sales',
    'DELETE FROM purchase_order_items',
    'DELETE FROM purchase_orders',
    'DELETE FROM stock_movements',
    'DELETE FROM expenses',
    'DELETE FROM products',
    'DELETE FROM suppliers',
    // Las categorías se conservan salvo las que agregó la demo.
    "DELETE FROM categories WHERE name != 'General'",
    // Reinicia los contadores: si no, al recargar el set las ventas siguen
    // numerando V-000478 en adelante y los IDs quedan con huecos.
    `DELETE FROM sqlite_sequence WHERE name IN
		   ('sales','sale_items','purchase_orders','purchase_order_items','stock_movements','expenses','products','suppliers')`,
  ];
  for (const q of stmts) {
    try {
      db.run(q);
    } catch (err) {
      throw new Error(`limpiando demo (${q}): ${err.message}`);
    }
  }
}
