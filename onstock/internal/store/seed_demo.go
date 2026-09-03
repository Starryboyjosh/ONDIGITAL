package store

import (
	"fmt"
	"math"
	"math/rand"
	"sort"
	"strings"
	"time"
)

// SeedReport summarizes what was loaded for demos.
type SeedReport struct {
	Forced     bool `json:"forced"`
	Categories int  `json:"categories"`
	Suppliers  int  `json:"suppliers"`
	Products   int  `json:"products"`
	Purchases  int  `json:"purchases"`
	Sales      int  `json:"sales"`
	Expenses   int  `json:"expenses"`
	LowStock   int  `json:"low_stock"`
}

// SeedDemo loads a full Honduras-style demo dataset for Vito / school demos.
// If force is false and products already exist, it returns an error without writing.
// If force is true, transactional demo tables are cleared first (settings kept, then company overwritten).
func (s *Store) SeedDemo(force bool) (SeedReport, error) {
	var n int
	if err := s.db.QueryRow(`SELECT COUNT(*) FROM products`).Scan(&n); err != nil {
		return SeedReport{}, err
	}
	if n > 0 && !force {
		return SeedReport{}, fmt.Errorf("ya hay %d productos; usa -seed-demo-force para reemplazar con datos de demo", n)
	}

	if force {
		if err := s.clearDemoTables(); err != nil {
			return SeedReport{}, err
		}
	}

	// Empresa demo (HN)
	_ = s.SetSettings(map[string]string{
		"company_name":       "Abarrotes El Progreso",
		"company_rtn":        "08019001234567",
		"company_address":    "Barrio Guamilito, San Pedro Sula, Cortés",
		"company_phone":      "+504 2222-3344",
		"currency_symbol":    "L",
		"prices_include_isv": "1",
		"isv_rate_default":   "15",
		"demo_seeded":        "1",
	})

	// Categorías
	cats := []struct{ name, prefix string }{
		{"Abarrotes", "ABA"},
		{"Bebidas", "BEB"},
		{"Limpieza", "LIM"},
		{"Snacks", "SNK"},
	}
	catIDs := map[string]int64{}
	for _, c := range cats {
		// Reuse if name exists
		var id int64
		err := s.db.QueryRow(`SELECT id FROM categories WHERE name=?`, c.name).Scan(&id)
		if err != nil {
			created, cerr := s.CreateCategory(Category{Name: c.name, Prefix: c.prefix})
			if cerr != nil {
				return SeedReport{}, cerr
			}
			id = created.ID
		}
		catIDs[c.name] = id
	}

	// Proveedores
	supA, err := s.CreateSupplier(Supplier{
		Name: "Distribuidora del Valle", RTN: "08019009876543",
		ContactName: "María López", Phone: "+504 9876-5432",
		Email: "ventas@valle.hn", Address: "Bulevar del Norte, San Pedro Sula",
	})
	if err != nil {
		return SeedReport{}, err
	}
	supB, err := s.CreateSupplier(Supplier{
		Name: "Importadora Caribe SA", RTN: "05019001112233",
		ContactName: "Carlos Méndez", Phone: "+504 9456-1122",
		Email: "pedidos@caribe.hn", Address: "Zona Industrial, Villanueva, Cortés",
	})
	if err != nil {
		return SeedReport{}, err
	}
	idA, idB := supA.ID, supB.ID

	type pdef struct {
		sku, barcode, name, cat string
		sup                     *int64
		cost, price             float64
		stock, min              float64
		isv                     float64
	}
	// Los códigos son EAN-13 válidos (dígito verificador correcto) con el prefijo
	// 744 de Honduras. Son sintéticos: no pertenecen a ningún fabricante real, pero
	// se escanean como los de verdad, así la caja se puede probar con una pistola
	// desde el primer arranque y las etiquetas salen con código legible.
	prods := []pdef{
		// Stock saludable + alto movimiento
		{"ABA-001", "7441210000016", "Arroz Premium 5 lb", "Abarrotes", &idA, 45, 68, 80, 20, 15},
		{"ABA-002", "7441210000023", "Frijol rojo 2 lb", "Abarrotes", &idA, 28, 42, 60, 15, 15},
		{"ABA-003", "7441210000030", "Aceite vegetal 1 L", "Abarrotes", &idA, 38, 55, 45, 12, 15},
		{"ABA-004", "7441210000047", "Azúcar blanca 2 lb", "Abarrotes", &idA, 22, 34, 50, 15, 15},
		{"ABA-005", "7441210000054", "Sal de mesa 400 g", "Abarrotes", &idA, 8, 14, 70, 20, 15},
		// Bebidas
		{"BEB-001", "7441220000013", "Agua purificada 600 ml", "Bebidas", &idB, 5, 12, 120, 30, 15},
		{"BEB-002", "7441220000020", "Refresco cola 2 L", "Bebidas", &idB, 22, 35, 40, 12, 15},
		{"BEB-003", "7441220000037", "Jugo de naranja 1 L", "Bebidas", &idB, 18, 32, 25, 10, 15},
		// Limpieza
		{"LIM-001", "7441230000010", "Detergente en polvo 1 kg", "Limpieza", &idB, 48, 75, 22, 8, 15},
		{"LIM-002", "7441230000027", "Cloro 1 L", "Limpieza", &idA, 15, 28, 18, 6, 15},
		{"LIM-003", "7441230000034", "Jabón de barra 3-pack", "Limpieza", &idA, 20, 35, 30, 10, 15},
		// Snacks
		{"SNK-001", "7441240000017", "Galletas de soda", "Snacks", &idB, 12, 22, 55, 15, 15},
		{"SNK-002", "7441240000024", "Churros de maíz", "Snacks", &idB, 8, 15, 40, 12, 15},
		// Stock bajo / por agotarse (para Vito)
		{"ABA-010", "7441210000108", "Leche en polvo 400 g", "Abarrotes", &idA, 95, 135, 3, 12, 15},
		{"ABA-011", "7441210000115", "Café molido 400 g", "Abarrotes", &idA, 85, 125, 2, 10, 15},
		{"BEB-010", "7441220000105", "Leche UHT 1 L", "Bebidas", &idB, 22, 36, 4, 15, 15},
		{"LIM-010", "7441230000102", "Papel higiénico 12 rollos", "Limpieza", &idB, 68, 110, 1, 8, 15},
		{"SNK-010", "7441240000109", "Chocolate de mesa", "Snacks", &idA, 25, 42, 0, 6, 15},
		// Lento / estancado (poco o nada se vende, stock alto)
		{"ABA-090", "7441210000900", "Sardinas en lata (caja 24)", "Abarrotes", &idA, 180, 260, 18, 4, 15},
		{"LIM-090", "7441230000904", "Ambientador en aerosol", "Limpieza", &idB, 35, 58, 25, 5, 15},
		{"SNK-090", "7441240000901", "Gomitas importadas", "Snacks", &idB, 40, 70, 22, 5, 15},
	}

	// Descripción corta por categoría: lo que un dueño escribiría de verdad en la
	// ficha del producto. Nunca texto de relleno ni la palabra "demo".
	descPorCategoria := map[string]string{
		"Abarrotes": "Abarrote de rotación diaria · se vende por unidad.",
		"Bebidas":   "Bebida para refrigerador · unidad y paca.",
		"Limpieza":  "Producto de limpieza para el hogar.",
		"Snacks":    "Snack de exhibidor · caja abierta al detalle.",
	}

	prodBySKU := map[string]Product{}
	// Costo y stock de lista: el histórico compra contra el costo de lista (no
	// contra el promedio ya movido) y al final devuelve las existencias a estos
	// números, para que la pantalla de Productos sea la que este archivo declara.
	costoBase := map[string]float64{}
	stockBase := map[string]float64{}
	supBySKU := map[string]int64{}
	for _, d := range prods {
		cid := catIDs[d.cat]
		p, err := s.CreateProduct(Product{
			SKU: d.sku, Barcode: d.barcode, Name: d.name, CategoryID: &cid, SupplierID: d.sup,
			Cost: d.cost, Price: d.price, Stock: d.stock, MinStock: d.min,
			ISVRate: d.isv, Active: true,
			Description: descPorCategoria[d.cat],
		})
		if err != nil {
			return SeedReport{}, fmt.Errorf("producto %s: %w", d.sku, err)
		}
		prodBySKU[d.sku] = p
		costoBase[d.sku] = d.cost
		stockBase[d.sku] = d.stock
		if d.sup != nil {
			supBySKU[d.sku] = *d.sup
		}
	}

	now := time.Now()
	poCount := 0

	// Crea una orden ya recibida y la fecha en el pasado: SetPOStatus siempre
	// sella la recepción "hoy", y el histórico necesita su fecha real.
	compraRecibida := func(sup int64, orden time.Time, plazoDias int, nota string, items []NewPOItemIn) error {
		if len(items) == 0 {
			return nil
		}
		po, err := s.CreatePurchaseOrder(NewPOInput{
			SupplierID:   sup,
			OrderDate:    orden.Format("2006-01-02"),
			ExpectedDate: orden.AddDate(0, 0, plazoDias).Format("2006-01-02"),
			Notes:        nota,
			Items:        items,
		})
		if err != nil {
			return err
		}
		if _, err := s.SetPOStatus(po.ID, "recibida"); err != nil {
			return fmt.Errorf("recibir %s: %w", po.PONumber, err)
		}
		recibida := orden.AddDate(0, 0, plazoDias)
		if recibida.After(now) {
			recibida = now
		}
		if _, err := s.db.Exec(`UPDATE purchase_orders SET received_date=? WHERE id=?`,
			recibida.Format("2006-01-02"), po.ID); err != nil {
			return err
		}
		poCount++
		return nil
	}

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
	rnd := rand.New(rand.NewSource(20260214))

	type rotacion struct {
		sku      string
		peso     int // con qué frecuencia cae en una canasta
		min, max int // unidades por ticket
	}
	// Solo lo que de verdad rota: los cinco SKU en rojo y los tres estancados
	// quedan fuera a propósito, porque son el material de las preguntas a Vito.
	rotables := []rotacion{
		{"ABA-001", 10, 1, 8}, {"ABA-002", 9, 1, 6}, {"ABA-003", 8, 1, 4},
		{"ABA-004", 8, 1, 5}, {"ABA-005", 5, 1, 3},
		{"BEB-001", 12, 4, 24}, {"BEB-002", 8, 1, 6}, {"BEB-003", 4, 1, 3},
		{"LIM-001", 5, 1, 3}, {"LIM-002", 4, 1, 3}, {"LIM-003", 5, 1, 3},
		{"SNK-001", 9, 2, 12}, {"SNK-002", 7, 2, 8},
	}
	pesoTotal := 0
	for _, r := range rotables {
		pesoTotal += r.peso
	}
	escoger := func() rotacion {
		n := rnd.Intn(pesoTotal)
		for _, r := range rotables {
			if n < r.peso {
				return r
			}
			n -= r.peso
		}
		return rotables[0]
	}

	clientesHab := []string{
		"Cliente mostrador", "Cliente mostrador", "Cliente mostrador", "Cliente mostrador",
		"Pulpería La Esquina", "Comedor Doña Luz", "Ana García", "José Martínez",
		"Cafetería Guamilito", "Tienda Doña Marta", "Oficina Contable HN",
	}
	pagosHab := []string{"efectivo", "efectivo", "efectivo", "efectivo", "tarjeta", "transferencia"}
	mesesES := [...]string{
		"enero", "febrero", "marzo", "abril", "mayo", "junio",
		"julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
	}

	// Ventas de vitrina: clientes con nombre en los últimos ~25 días. Se declara
	// aquí arriba porque el histórico mensual descuenta estos tickets de su
	// presupuesto: si no, el último mes cerrado sale inflado y rompe la curva.
	type salePlan struct {
		daysAgo  int
		customer string
		items    []struct {
			sku string
			qty float64
		}
		pay string
	}
	plans := []salePlan{
		{0, "Cliente mostrador", []struct {
			sku string
			qty float64
		}{{"ABA-001", 2}, {"BEB-001", 6}, {"SNK-001", 3}}, "efectivo"},
		{0, "Ana García", []struct {
			sku string
			qty float64
		}{{"ABA-002", 1}, {"ABA-003", 1}, {"LIM-001", 1}}, "tarjeta"},
		{1, "Cliente mostrador", []struct {
			sku string
			qty float64
		}{{"BEB-002", 4}, {"SNK-002", 5}, {"ABA-004", 2}}, "efectivo"},
		{2, "Pulpería La Esquina", []struct {
			sku string
			qty float64
		}{{"ABA-001", 5}, {"ABA-002", 4}, {"BEB-001", 12}}, "transferencia"},
		{3, "Cliente mostrador", []struct {
			sku string
			qty float64
		}{{"LIM-002", 2}, {"LIM-003", 1}, {"ABA-005", 3}}, "efectivo"},
		{4, "José Martínez", []struct {
			sku string
			qty float64
		}{{"BEB-003", 2}, {"SNK-001", 4}, {"ABA-003", 2}}, "tarjeta"},
		{5, "Cliente mostrador", []struct {
			sku string
			qty float64
		}{{"ABA-001", 1}, {"BEB-002", 2}}, "efectivo"},
		{6, "Comedor Doña Luz", []struct {
			sku string
			qty float64
		}{{"ABA-001", 8}, {"ABA-002", 6}, {"ABA-004", 4}, {"ABA-003", 3}}, "transferencia"},
		{7, "Cliente mostrador", []struct {
			sku string
			qty float64
		}{{"SNK-002", 8}, {"BEB-001", 10}}, "efectivo"},
		{8, "Oficina Contable HN", []struct {
			sku string
			qty float64
		}{{"BEB-001", 24}, {"SNK-001", 12}}, "transferencia"},
		{10, "Cliente mostrador", []struct {
			sku string
			qty float64
		}{{"ABA-003", 3}, {"LIM-001", 2}}, "efectivo"},
		{12, "Pulpería La Esquina", []struct {
			sku string
			qty float64
		}{{"ABA-001", 6}, {"BEB-002", 6}, {"ABA-010", 2}}, "efectivo"},
		{14, "Cliente mostrador", []struct {
			sku string
			qty float64
		}{{"BEB-010", 3}, {"ABA-011", 1}}, "tarjeta"},
		{18, "Ana García", []struct {
			sku string
			qty float64
		}{{"ABA-002", 2}, {"LIM-003", 2}, {"SNK-001", 2}}, "efectivo"},
		{21, "Cliente mostrador", []struct {
			sku string
			qty float64
		}{{"ABA-001", 3}, {"BEB-001", 8}, {"ABA-005", 2}}, "efectivo"},
		{24, "Comedor Doña Luz", []struct {
			sku string
			qty float64
		}{{"ABA-001", 10}, {"ABA-002", 8}, {"ABA-003", 4}}, "transferencia"},
	}

	// Tickets por mes, del más viejo al actual.
	densidad := []int{26, 28, 31, 34, 37, 40, 44, 48, 52, 56, 60, 66}

	// Las ventas de vitrina caen todas en las últimas semanas y son más gordas
	// que el ticket corriente (~L420 contra ~L300). Si se suman encima del
	// histórico, el último mes cerrado se dispara y la curva de doce meses
	// parece un error de datos. Así que se descuentan del presupuesto del mes
	// donde caen, ponderadas por lo que pesan de más.
	const pesoVitrina = 1.4
	vitrinaPorMes := map[int]int{} // mesesAtras -> tickets equivalentes
	for _, sp := range plans {
		f := now.AddDate(0, 0, -sp.daysAgo)
		mesesAtras := int(now.Year()-f.Year())*12 + int(now.Month()-f.Month())
		vitrinaPorMes[mesesAtras]++
	}

	type lineaVenta struct {
		sku string
		qty float64
	}
	type ticketPlan struct {
		dia, hora, minuto int
		quien, pago       string
		lineas            []lineaVenta
	}

	histVentas := 0
	for idx, tickets := range densidad {
		mesesAtras := len(densidad) - 1 - idx
		primero := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()).
			AddDate(0, -mesesAtras, 0)
		diasDelMes := primero.AddDate(0, 1, -1).Day()
		ultimoDia := diasDelMes
		if mesesAtras == 0 {
			// Mes en curso: solo hasta hoy, y el volumen a prorrata.
			ultimoDia = now.Day()
			tickets = tickets*ultimoDia/diasDelMes + 2
		}
		tickets -= int(math.Round(float64(vitrinaPorMes[mesesAtras]) * pesoVitrina))
		if tickets < 4 {
			tickets = 4
		}

		// 1) Qué se vende este mes, y por tanto qué hay que comprar.
		planes := make([]ticketPlan, 0, tickets)
		requerido := map[string]float64{}
		for i := 0; i < tickets; i++ {
			tp := ticketPlan{
				dia:    1 + rnd.Intn(ultimoDia),
				hora:   8 + rnd.Intn(11),
				minuto: rnd.Intn(60),
				quien:  clientesHab[rnd.Intn(len(clientesHab))],
				pago:   pagosHab[rnd.Intn(len(pagosHab))],
			}
			vistos := map[string]bool{}
			for j := 0; j < 2+rnd.Intn(3); j++ {
				r := escoger()
				if vistos[r.sku] {
					continue
				}
				vistos[r.sku] = true
				q := float64(r.min + rnd.Intn(r.max-r.min+1))
				tp.lineas = append(tp.lineas, lineaVenta{r.sku, q})
				requerido[r.sku] += q
			}
			if len(tp.lineas) == 0 {
				continue
			}
			planes = append(planes, tp)
		}
		sort.SliceStable(planes, func(a, b int) bool {
			if planes[a].dia != planes[b].dia {
				return planes[a].dia < planes[b].dia
			}
			return planes[a].hora < planes[b].hora
		})

		// 2) La compra del mes, dimensionada contra ese consumo y separada por
		//    proveedor. El costo de lista sube poco a poco: el promedio
		//    ponderado que ven los informes se mueve solo, como en la vida real.
		factorCosto := 0.88 + 0.011*float64(idx)
		porProveedor := map[int64][]NewPOItemIn{}
		for _, r := range rotables {
			need := requerido[r.sku]
			if need <= 0 {
				continue
			}
			sup, ok := supBySKU[r.sku]
			if !ok {
				continue
			}
			porProveedor[sup] = append(porProveedor[sup], NewPOItemIn{
				ProductID: prodBySKU[r.sku].ID,
				Qty:       math.Ceil(need) + 2,
				UnitCost:  round2(costoBase[r.sku] * factorCosto),
			})
		}
		diaOrden := 2
		if diaOrden > ultimoDia {
			diaOrden = ultimoDia
		}
		orden := time.Date(primero.Year(), primero.Month(), diaOrden, 0, 0, 0, 0, now.Location())
		nombreMes := mesesES[int(primero.Month())-1]
		for _, sup := range []int64{idA, idB} {
			items := porProveedor[sup]
			if len(items) == 0 {
				continue
			}
			nota := fmt.Sprintf("Reposición de %s · granos y abarrotes", nombreMes)
			if sup == idB {
				nota = fmt.Sprintf("Reposición de %s · bebidas, limpieza y snacks", nombreMes)
			}
			if err := compraRecibida(sup, orden, 2, nota, items); err != nil {
				return SeedReport{}, fmt.Errorf("compra de %s: %w", nombreMes, err)
			}
		}

		// 3) Las ventas del mes, contra el inventario que acaba de entrar.
		for _, tp := range planes {
			items := make([]NewSaleItemInput, 0, len(tp.lineas))
			for _, l := range tp.lineas {
				items = append(items, NewSaleItemInput{ProductID: prodBySKU[l.sku].ID, Qty: l.qty})
			}
			venta, err := s.CreateSale(NewSaleInput{
				CustomerName:  tp.quien,
				PaymentMethod: tp.pago,
				Items:         items,
			})
			if err != nil {
				return SeedReport{}, fmt.Errorf("venta de %s: %w", nombreMes, err)
			}
			cuando := time.Date(primero.Year(), primero.Month(), tp.dia, tp.hora, tp.minuto, 0, 0, now.Location())
			if _, err := s.db.Exec(`UPDATE sales SET sale_date=? WHERE id=?`,
				cuando.Format("2006-01-02 15:04:05"), venta.ID); err != nil {
				return SeedReport{}, err
			}
			histVentas++
		}
	}

	// Órdenes de compra abiertas. El histórico ya dejó la página de Compras
	// llena de recibidas; estas cuatro son las que muestran los otros estados:
	// lo que va en camino, lo que está en borrador y una que se cayó.
	type poItem struct {
		sku       string
		qty, cost float64
	}
	poAbiertas := []struct {
		sup          int64
		daysAgo      int
		expectedDays int
		status       string
		notes        string
		items        []poItem
	}{
		{idB, 6, 3, "cancelada", "Cancelada: el proveedor no tuvo existencia", []poItem{
			{"SNK-090", 30, 39},
		}},
		{idA, 2, 3, "enviada", "Urgente · reposición de faltantes", []poItem{
			{"ABA-010", 24, 93}, {"ABA-011", 20, 83}, {"SNK-010", 18, 24},
		}},
		{idB, 1, 4, "enviada", "Lácteos y papel · confirmado por teléfono", []poItem{
			{"BEB-010", 48, 21.50}, {"LIM-010", 20, 66},
		}},
		{idA, 0, 5, "borrador", "Pendiente de confirmar precio de lista", []poItem{
			{"ABA-003", 36, 37}, {"LIM-002", 24, 14.50}, {"LIM-003", 24, 19},
		}},
	}
	for _, pp := range poAbiertas {
		var items []NewPOItemIn
		for _, it := range pp.items {
			p, ok := prodBySKU[it.sku]
			if !ok {
				continue
			}
			items = append(items, NewPOItemIn{ProductID: p.ID, Qty: it.qty, UnitCost: it.cost})
		}
		if len(items) == 0 {
			continue
		}
		orderDay := now.AddDate(0, 0, -pp.daysAgo)
		po, err := s.CreatePurchaseOrder(NewPOInput{
			SupplierID:   pp.sup,
			OrderDate:    orderDay.Format("2006-01-02"),
			ExpectedDate: orderDay.AddDate(0, 0, pp.expectedDays).Format("2006-01-02"),
			Notes:        pp.notes,
			Items:        items,
		})
		if err != nil {
			return SeedReport{}, fmt.Errorf("orden de compra demo: %w", err)
		}
		if pp.status != "borrador" {
			if _, err := s.SetPOStatus(po.ID, pp.status); err != nil {
				return SeedReport{}, fmt.Errorf("orden %s: %w", po.PONumber, err)
			}
		}
		poCount++
	}

	// Refresca el caché: doce meses de compras y ventas movieron stock y costo.
	for sku, p := range prodBySKU {
		if np, err := s.GetProduct(p.ID); err == nil {
			prodBySKU[sku] = np
		}
	}

	salesCount := 0
	for _, sp := range plans {
		var items []NewSaleItemInput
		for _, it := range sp.items {
			p, ok := prodBySKU[it.sku]
			if !ok || it.qty <= 0 {
				continue
			}
			// ensure enough stock for seed sale
			if p.Stock < it.qty {
				// bump stock so sale succeeds
				_, _ = s.AdjustStock(p.ID, "entrada", it.qty+5, "Recepción de mercadería")
				p, _ = s.GetProduct(p.ID)
				prodBySKU[it.sku] = p
			}
			items = append(items, NewSaleItemInput{ProductID: p.ID, Qty: it.qty})
		}
		if len(items) == 0 {
			continue
		}
		sale, err := s.CreateSale(NewSaleInput{
			CustomerName:  sp.customer,
			PaymentMethod: sp.pay,
			Items:         items,
		})
		if err != nil {
			return SeedReport{}, fmt.Errorf("venta demo: %w", err)
		}
		// Backdate for reports / Vito periods
		day := now.AddDate(0, 0, -sp.daysAgo).Format("2006-01-02")
		if _, err := s.db.Exec(`UPDATE sales SET sale_date=? WHERE id=?`, day+" 12:00:00", sale.ID); err != nil {
			return SeedReport{}, err
		}
		// refresh stock cache
		for _, it := range sp.items {
			if p, ok := prodBySKU[it.sku]; ok {
				np, _ := s.GetProduct(p.ID)
				prodBySKU[it.sku] = np
			}
		}
		salesCount++
	}

	// Dos tickets que completan el cuadro operativo. Sin ellos el Estado de
	// Resultados siempre muestra "Descuentos y rebajas L 0.00" y la página de
	// Ventas nunca enseña cómo se ve —ni cómo se reversa— una anulación.
	type lineaSku struct {
		sku string
		qty float64
	}
	extraVentas := []struct {
		daysAgo   int
		cliente   string
		pago      string
		descuento float64
		anular    bool
		notas     string
		lineas    []lineaSku
	}{
		{3, "Pulpería La Esquina", "transferencia", 145, false,
			"Descuento de mayoreo acordado con el cliente",
			[]lineaSku{{"ABA-001", 12}, {"BEB-001", 24}, {"ABA-004", 6}}},
		{9, "Cliente mostrador", "efectivo", 0, true,
			"Anulada: el cliente se arrepintió antes de salir",
			[]lineaSku{{"BEB-002", 3}, {"SNK-002", 2}}},
	}
	for _, ev := range extraVentas {
		var items []NewSaleItemInput
		for _, l := range ev.lineas {
			p, ok := prodBySKU[l.sku]
			if !ok {
				continue
			}
			if p.Stock < l.qty {
				_, _ = s.AdjustStock(p.ID, "entrada", l.qty+5, "Recepción de mercadería")
				p, _ = s.GetProduct(p.ID)
				prodBySKU[l.sku] = p
			}
			items = append(items, NewSaleItemInput{ProductID: p.ID, Qty: l.qty})
		}
		if len(items) == 0 {
			continue
		}
		venta, err := s.CreateSale(NewSaleInput{
			CustomerName:  ev.cliente,
			PaymentMethod: ev.pago,
			Discount:      ev.descuento,
			Notes:         ev.notas,
			Items:         items,
		})
		if err != nil {
			return SeedReport{}, fmt.Errorf("venta de ejemplo: %w", err)
		}
		day := now.AddDate(0, 0, -ev.daysAgo).Format("2006-01-02")
		if _, err := s.db.Exec(`UPDATE sales SET sale_date=? WHERE id=?`, day+" 16:30:00", venta.ID); err != nil {
			return SeedReport{}, err
		}
		if ev.anular {
			if _, err := s.VoidSale(venta.ID); err != nil {
				return SeedReport{}, fmt.Errorf("anulando venta de ejemplo: %w", err)
			}
		} else {
			salesCount++
		}
		for _, l := range ev.lineas {
			if p, ok := prodBySKU[l.sku]; ok {
				np, _ := s.GetProduct(p.ID)
				prodBySKU[l.sku] = np
			}
		}
	}

	// Conteo físico de cierre. Un año de compras y ventas deja las existencias a
	// la deriva; este ajuste las devuelve a los números que declara la tabla de
	// productos, para que la pantalla de Productos sea exactamente el dataset
	// diseñado — incluidos los cinco SKU en rojo que sostienen las preguntas a
	// Vito y los tres estancados.
	objetivos := map[string]float64{}
	for sku, st := range stockBase {
		objetivos[sku] = st
	}
	metas := make([]string, 0, len(objetivos))
	for sku := range objetivos {
		metas = append(metas, sku)
	}
	sort.Strings(metas)
	for _, sku := range metas {
		p := prodBySKU[sku]
		if p.ID == 0 {
			continue
		}
		cur, err := s.GetProduct(p.ID)
		if err != nil {
			return SeedReport{}, err
		}
		if cur.Stock == objetivos[sku] {
			continue
		}
		if _, err := s.AdjustStock(p.ID, "ajuste", objetivos[sku], "Conteo físico de inventario"); err != nil {
			return SeedReport{}, err
		}
	}

	// Gastos fijos recurrentes de los últimos doce meses. Sin ellos el estado de
	// resultados y la utilidad neta de los informes salen inflados, y la página
	// de Gastos abre casi vacía. Cada uno cae en su día del mes, así que el
	// gasto acumulado del mes en curso crece junto con el mes, como de verdad.
	type gastoFijo struct {
		dia    int
		cat    string
		desc   string
		monto  float64
		ajuste float64 // variación mes a mes, para que no sean doce filas idénticas
	}
	fijos := []gastoFijo{
		{2, "ventas", "Combustible del reparto", 520, 60},
		{4, "otros", "Bolsas y empaque", 240, 35},
		{8, "administrativos", "Energía eléctrica", 1150, 180},
		{12, "administrativos", "Internet y teléfono", 890, 0},
		{20, "ventas", "Publicidad Facebook local", 380, 70},
	}
	expCount := 0
	for i := 11; i >= 0; i-- {
		mes := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location()).AddDate(0, -i, 0)
		for _, g := range fijos {
			fecha := time.Date(mes.Year(), mes.Month(), g.dia, 0, 0, 0, 0, now.Location())
			if fecha.After(now) {
				continue // todavía no toca pagarlo este mes
			}
			monto := g.monto
			if g.ajuste > 0 {
				monto = round2(g.monto + (rnd.Float64()*2-1)*g.ajuste)
			}
			if _, err := s.CreateExpense(Expense{
				ExpenseDate: fecha.Format("2006-01-02"),
				Category:    g.cat,
				Description: g.desc,
				Amount:      monto,
			}); err != nil {
				return SeedReport{}, err
			}
			expCount++
		}
	}
	// Un par de gastos extraordinarios, para que la categoría "otros" no sea
	// siempre la misma línea.
	extras := []Expense{
		{ExpenseDate: now.AddDate(0, 0, -12).Format("2006-01-02"), Category: "otros", Description: "Mantenimiento de refrigerador", Amount: 1200},
		{ExpenseDate: now.AddDate(0, -4, 0).Format("2006-01-02"), Category: "administrativos", Description: "Renovación de permiso de operación", Amount: 2400},
		{ExpenseDate: now.AddDate(0, -7, 0).Format("2006-01-02"), Category: "financieros", Description: "Comisión por datáfono", Amount: 640},
	}
	for _, e := range extras {
		if _, err := s.CreateExpense(e); err != nil {
			return SeedReport{}, err
		}
		expCount++
	}

	// El histórico se arma por bloques (doce meses, vitrina reciente, casos
	// especiales) y cada bloque toma el siguiente correlativo libre antes de que
	// la venta se retroceda de fecha. Sin este paso la lista de Ventas abriría
	// con V-000460 encima de V-000429, que es lo primero que revisa un contador.
	if err := s.renumberSales(); err != nil {
		return SeedReport{}, err
	}

	// El movimiento de inventario lo sella el reloj al crearse, así que después
	// de retroceder las ventas y las compras el kardex seguía mostrando el año
	// entero con la fecha de instalación: Ventas decía noviembre y el mismo
	// movimiento decía hoy.
	if err := s.backdateMovements(); err != nil {
		return SeedReport{}, err
	}

	var low int
	_ = s.db.QueryRow(`SELECT COUNT(*) FROM products WHERE active=1 AND stock <= min_stock`).Scan(&low)

	return SeedReport{
		Forced:     force,
		Categories: len(cats),
		Suppliers:  2,
		Products:   len(prods),
		Purchases:  poCount,
		Sales:      salesCount + histVentas,
		Expenses:   expCount,
		LowStock:   low,
	}, nil
}

// backdateMovements alinea cada movimiento de inventario con la fecha del
// documento que lo originó: la venta con su fecha de venta, la compra con el día
// en que se recibió y el saldo de apertura con el día previo a la primera orden.
// Se ejecuta después de renumberSales porque la referencia guardada en el
// movimiento es justamente el correlativo que esa función reasigna.
func (s *Store) backdateMovements() error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(`UPDATE stock_movements
	  SET created_at = (SELECT v.sale_date FROM sales v WHERE v.sale_number = stock_movements.reference)
	  WHERE type IN ('venta','anulacion')
	    AND EXISTS (SELECT 1 FROM sales v WHERE v.sale_number = stock_movements.reference)`); err != nil {
		return err
	}

	// La mercadería entra al stock el día de la recepción, no el de la orden.
	if _, err := tx.Exec(`UPDATE stock_movements
	  SET created_at = (SELECT po.received_date || ' 09:00:00' FROM purchase_orders po
	                    WHERE po.po_number = stock_movements.reference AND po.received_date <> '')
	  WHERE type = 'compra'
	    AND EXISTS (SELECT 1 FROM purchase_orders po
	                WHERE po.po_number = stock_movements.reference AND po.received_date <> '')`); err != nil {
		return err
	}

	// Saldo de apertura: un día antes de la primera compra, para que el kardex
	// no abra con una entrada posterior al primer ingreso de mercadería.
	if _, err := tx.Exec(`UPDATE stock_movements
	  SET created_at = (SELECT date(MIN(po.order_date), '-1 day') || ' 08:00:00' FROM purchase_orders po)
	  WHERE reference = 'Inventario inicial'
	    AND (SELECT COUNT(*) FROM purchase_orders) > 0`); err != nil {
		return err
	}
	return tx.Commit()
}

// renumberSales reasigna los correlativos para que asciendan con la fecha de
// venta, arrastrando la referencia guardada en los movimientos de inventario.
// Va en dos pasadas porque sale_number es UNIQUE y una renumeración en sitio
// chocaría contra los números todavía ocupados.
func (s *Store) renumberSales() error {
	type venta struct {
		id  int64
		old string
	}
	var ventas []venta
	rows, err := s.db.Query(`SELECT id, sale_number FROM sales ORDER BY sale_date, id`)
	if err != nil {
		return err
	}
	for rows.Next() {
		var v venta
		if err := rows.Scan(&v.id, &v.old); err != nil {
			rows.Close()
			return err
		}
		ventas = append(ventas, v)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return err
	}

	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	mover := func(from, to string) error {
		if _, err := tx.Exec(`UPDATE sales SET sale_number=? WHERE sale_number=?`, to, from); err != nil {
			return err
		}
		_, err := tx.Exec(`UPDATE stock_movements SET reference=? WHERE reference=? AND type IN ('venta','anulacion')`, to, from)
		return err
	}
	for _, v := range ventas {
		if err := mover(v.old, fmt.Sprintf("tmp-%d", v.id)); err != nil {
			return err
		}
	}
	for i, v := range ventas {
		if err := mover(fmt.Sprintf("tmp-%d", v.id), fmt.Sprintf("V-%06d", i+1)); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (s *Store) clearDemoTables() error {
	// Order respects FKs (if any) / logical deps
	stmts := []string{
		`DELETE FROM sale_items`,
		`DELETE FROM sales`,
		`DELETE FROM purchase_order_items`,
		`DELETE FROM purchase_orders`,
		`DELETE FROM stock_movements`,
		`DELETE FROM expenses`,
		`DELETE FROM products`,
		`DELETE FROM suppliers`,
		// keep categories except we may add demo ones; clear non-default optional
		`DELETE FROM categories WHERE name != 'General'`,
		// Reinicia los contadores: si no, al recargar el set las ventas siguen
		// numerando V-000478 en adelante y los IDs quedan con huecos.
		`DELETE FROM sqlite_sequence WHERE name IN
		   ('sales','sale_items','purchase_orders','purchase_order_items','stock_movements','expenses','products','suppliers')`,
	}
	for _, q := range stmts {
		if _, err := s.db.Exec(q); err != nil {
			return fmt.Errorf("limpiando demo (%s): %w", q, err)
		}
	}
	return nil
}

// IsEmpty reports whether the catalog has never been used (no products at all).
// Se usa en el primer arranque para decidir si cargar el set de ejemplo.
func (s *Store) IsEmpty() (bool, error) {
	var n int
	err := s.db.QueryRow(`SELECT COUNT(*) FROM products`).Scan(&n)
	return n == 0, err
}

// HasDemoSeed reports whether demo settings flag is set.
func (s *Store) HasDemoSeed() bool {
	return strings.TrimSpace(s.settingString("demo_seeded", "")) == "1"
}

func (s *Store) settingString(key, fallback string) string {
	var v string
	err := s.db.QueryRow(`SELECT value FROM settings WHERE key=?`, key).Scan(&v)
	if err != nil || v == "" {
		return fallback
	}
	return v
}
