package httpapi

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/go-pdf/fpdf"
	"github.com/xuri/excelize/v2"

	"onstock/internal/store"
)

// fmtNum formatea 1234567.5 como "1,234,567.50".
func fmtNum(v float64) string {
	neg := v < 0
	if neg {
		v = -v
	}
	s := fmt.Sprintf("%.2f", v)
	parts := strings.SplitN(s, ".", 2)
	intPart := parts[0]
	var b strings.Builder
	for i, c := range intPart {
		if i > 0 && (len(intPart)-i)%3 == 0 {
			b.WriteByte(',')
		}
		b.WriteRune(c)
	}
	out := b.String() + "." + parts[1]
	if neg {
		return "-" + out
	}
	return out
}

func (a *API) company() (name, rtn, sym string) {
	s, _ := a.st.GetSettings()
	name, rtn, sym = s["company_name"], s["company_rtn"], s["currency_symbol"]
	if name == "" {
		name = "Mi Empresa"
	}
	if sym == "" {
		sym = "L"
	}
	return
}

func sendXLSX(w http.ResponseWriter, filename string, f *excelize.File) {
	w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	_ = f.Write(w)
}

func sendPDF(w http.ResponseWriter, filename string, pdf *fpdf.Fpdf) {
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	_ = pdf.Output(w)
}

// newPDF crea un PDF carta con encabezado de la empresa y devuelve también el traductor de acentos.
func newPDF(orientation, companyName, rtn, title, subtitle string) (*fpdf.Fpdf, func(string) string) {
	pdf := fpdf.New(orientation, "mm", "Letter", "")
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	pdf.SetAutoPageBreak(true, 18)
	pdf.AddPage()
	pdf.SetFont("Helvetica", "B", 15)
	pdf.SetTextColor(20, 24, 46)
	pdf.CellFormat(0, 8, tr(companyName), "", 1, "C", false, 0, "")
	if rtn != "" {
		pdf.SetFont("Helvetica", "", 9)
		pdf.SetTextColor(110, 110, 120)
		pdf.CellFormat(0, 5, tr("RTN: "+rtn), "", 1, "C", false, 0, "")
	}
	pdf.SetFont("Helvetica", "B", 12)
	pdf.SetTextColor(20, 24, 46)
	pdf.CellFormat(0, 8, tr(title), "", 1, "C", false, 0, "")
	if subtitle != "" {
		pdf.SetFont("Helvetica", "", 10)
		pdf.SetTextColor(110, 110, 120)
		pdf.CellFormat(0, 5, tr(subtitle), "", 1, "C", false, 0, "")
	}
	pdf.Ln(4)
	pdf.SetTextColor(0, 0, 0)
	return pdf, tr
}

// ── Estado de Resultados ────────────────────────────────

type isRow struct {
	label  string
	value  float64
	kind   string // "" | "sub" | "total" | "final" | "section"
	indent bool
}

// neg devuelve el monto con signo contrario, pero deja el cero en cero: sin
// esto una línea sin movimiento se imprimía como "-0.00".
func neg(v float64) float64 {
	if v == 0 {
		return 0
	}
	return -v
}

func incomeStatementRows(st store.IncomeStatement) []isRow {
	return []isRow{
		{label: "INGRESOS", kind: "section"},
		{label: "Ventas brutas", value: st.VentasBrutas, indent: true},
		{label: "(-) Descuentos y rebajas", value: neg(st.Descuentos), indent: true},
		{label: "Ventas netas", value: st.VentasNetas, kind: "sub"},
		{label: "(-) Costo de ventas", value: neg(st.CostoVentas), indent: true},
		{label: "UTILIDAD BRUTA", value: st.UtilidadBruta, kind: "total"},
		{label: "GASTOS DE OPERACIÓN", kind: "section"},
		{label: "Gastos de venta", value: neg(st.GastosVentas), indent: true},
		{label: "Gastos administrativos", value: neg(st.GastosAdministrativos), indent: true},
		{label: "Total gastos de operación", value: neg(st.GastosOperativos), kind: "sub"},
		{label: "UTILIDAD DE OPERACIÓN", value: st.UtilidadOperativa, kind: "total"},
		{label: "Gastos financieros", value: neg(st.GastosFinancieros), indent: true},
		{label: "Otros gastos", value: neg(st.OtrosGastos), indent: true},
		{label: "UTILIDAD ANTES DE ISR", value: st.UtilidadAntesISR, kind: "total"},
		{label: fmt.Sprintf("(-) ISR estimado (%.0f%%)", st.ISRRate), value: neg(st.ISR), indent: true},
		{label: "UTILIDAD NETA", value: st.UtilidadNeta, kind: "final"},
	}
}

func (a *API) exportIncomeStatement(w http.ResponseWriter, r *http.Request) {
	from, to := reportRange(r)
	st, err := a.st.IncomeStatement(from, to)
	if err != nil {
		writeErr(w, err)
		return
	}
	name, rtn, sym := a.company()
	period := fmt.Sprintf("Del %s al %s", from, to)
	rows := incomeStatementRows(st)

	if r.URL.Query().Get("format") == "pdf" {
		pdf, tr := newPDF("P", name, rtn, "Estado de Resultados", period+"  ·  Cifras en "+sym+" (netas de ISV)")
		for _, row := range rows {
			switch row.kind {
			case "section":
				pdf.Ln(2)
				pdf.SetFont("Helvetica", "B", 10)
				pdf.SetTextColor(70, 80, 180)
				pdf.CellFormat(0, 7, tr(row.label), "", 1, "L", false, 0, "")
				pdf.SetTextColor(0, 0, 0)
				continue
			case "total":
				pdf.SetFont("Helvetica", "B", 10)
			case "final":
				pdf.SetFont("Helvetica", "B", 11)
			case "sub":
				pdf.SetFont("Helvetica", "B", 10)
			default:
				pdf.SetFont("Helvetica", "", 10)
			}
			label := row.label
			if row.indent {
				label = "    " + label
			}
			border := ""
			if row.kind == "total" || row.kind == "sub" {
				border = "T"
			}
			if row.kind == "final" {
				border = "TB"
				pdf.SetFillColor(238, 240, 252)
			}
			pdf.CellFormat(130, 7, tr(label), border, 0, "L", row.kind == "final", 0, "")
			pdf.CellFormat(0, 7, sym+" "+fmtNum(row.value), border, 1, "R", row.kind == "final", 0, "")
		}
		pdf.Ln(6)
		pdf.SetFont("Helvetica", "I", 8)
		pdf.SetTextColor(120, 120, 130)
		pdf.MultiCell(0, 4, tr(fmt.Sprintf(
			"Notas: ventas y costos netos de ISV. ISV cobrado en el período (débito fiscal): %s %s. Ventas registradas: %d. "+
				"Margen bruto: %.1f%% · Margen neto: %.1f%%. El ISR es una estimación (%.0f%%) y no sustituye el cálculo fiscal oficial.",
			sym, fmtNum(st.ISVCobrado), st.NumVentas, st.MargenBruto, st.MargenNeto, st.ISRRate)), "", "L", false)
		pdf.SetFont("Helvetica", "", 8)
		pdf.CellFormat(0, 8, tr("Generado el "+time.Now().Format("02/01/2006 15:04")), "", 1, "L", false, 0, "")
		sendPDF(w, fmt.Sprintf("estado_resultados_%s_%s.pdf", from, to), pdf)
		return
	}

	// Excel
	f := excelize.NewFile()
	sheet := "Estado de Resultados"
	f.SetSheetName("Sheet1", sheet)
	_ = f.SetColWidth(sheet, "A", "A", 42)
	_ = f.SetColWidth(sheet, "B", "B", 18)

	titleStyle, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true, Size: 14}})
	subStyle, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Size: 10, Color: "666677"}})
	sectionStyle, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true, Color: "4650B4"}})
	numFmt := "#,##0.00"
	moneyStyle, _ := f.NewStyle(&excelize.Style{CustomNumFmt: &numFmt})
	boldMoney, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true}, CustomNumFmt: &numFmt,
		Border: []excelize.Border{{Type: "top", Style: 1, Color: "999999"}}})
	finalStyle, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true, Size: 12}, CustomNumFmt: &numFmt,
		Fill:   excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{"EEF0FC"}},
		Border: []excelize.Border{{Type: "top", Style: 2, Color: "4650B4"}, {Type: "bottom", Style: 6, Color: "4650B4"}}})
	boldLabel, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true},
		Border: []excelize.Border{{Type: "top", Style: 1, Color: "999999"}}})
	finalLabel, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true, Size: 12},
		Fill:   excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{"EEF0FC"}},
		Border: []excelize.Border{{Type: "top", Style: 2, Color: "4650B4"}, {Type: "bottom", Style: 6, Color: "4650B4"}}})

	f.SetCellValue(sheet, "A1", name)
	f.SetCellStyle(sheet, "A1", "A1", titleStyle)
	if rtn != "" {
		f.SetCellValue(sheet, "A2", "RTN: "+rtn)
		f.SetCellStyle(sheet, "A2", "A2", subStyle)
	}
	f.SetCellValue(sheet, "A3", "ESTADO DE RESULTADOS")
	f.SetCellStyle(sheet, "A3", "A3", titleStyle)
	f.SetCellValue(sheet, "A4", period+"  ·  Cifras en "+sym+" (netas de ISV)")
	f.SetCellStyle(sheet, "A4", "A4", subStyle)

	rowNum := 6
	for _, row := range rows {
		cellA := fmt.Sprintf("A%d", rowNum)
		cellB := fmt.Sprintf("B%d", rowNum)
		if row.kind == "section" {
			f.SetCellValue(sheet, cellA, row.label)
			f.SetCellStyle(sheet, cellA, cellA, sectionStyle)
			rowNum++
			continue
		}
		label := row.label
		if row.indent {
			label = "    " + label
		}
		f.SetCellValue(sheet, cellA, label)
		f.SetCellValue(sheet, cellB, row.value)
		switch row.kind {
		case "total", "sub":
			f.SetCellStyle(sheet, cellA, cellA, boldLabel)
			f.SetCellStyle(sheet, cellB, cellB, boldMoney)
		case "final":
			f.SetCellStyle(sheet, cellA, cellA, finalLabel)
			f.SetCellStyle(sheet, cellB, cellB, finalStyle)
		default:
			f.SetCellStyle(sheet, cellB, cellB, moneyStyle)
		}
		rowNum++
	}
	rowNum += 2
	notes := []string{
		fmt.Sprintf("ISV cobrado en el período (débito fiscal): %s %s", sym, fmtNum(st.ISVCobrado)),
		fmt.Sprintf("Ventas registradas: %d · Margen bruto: %.1f%% · Margen neto: %.1f%%", st.NumVentas, st.MargenBruto, st.MargenNeto),
		fmt.Sprintf("El ISR es una estimación (%.0f%%) y no sustituye el cálculo fiscal oficial.", st.ISRRate),
		"Generado el " + time.Now().Format("02/01/2006 15:04"),
	}
	for _, n := range notes {
		cell := fmt.Sprintf("A%d", rowNum)
		f.SetCellValue(sheet, cell, n)
		f.SetCellStyle(sheet, cell, cell, subStyle)
		rowNum++
	}
	sendXLSX(w, fmt.Sprintf("estado_resultados_%s_%s.xlsx", from, to), f)
}

// ── Resumen mensual ─────────────────────────────────────

var monthFullES = [...]string{"Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
	"Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"}

func (a *API) exportMonthlySummary(w http.ResponseWriter, r *http.Request) {
	year := int(qInt(r, "year"))
	month := int(qInt(r, "month"))
	now := time.Now()
	if year == 0 {
		year = now.Year()
	}
	if month < 1 || month > 12 {
		month = int(now.Month())
	}
	ms, err := a.st.MonthlySummary(year, month)
	if err != nil {
		writeErr(w, err)
		return
	}
	name, rtn, sym := a.company()
	st := ms.Statement
	period := fmt.Sprintf("%s %d", monthFullES[month-1], year)

	kpis := [][2]string{
		{"Ventas netas", sym + " " + fmtNum(st.VentasNetas)},
		{"Costo de ventas", sym + " " + fmtNum(st.CostoVentas)},
		{"Utilidad bruta", sym + " " + fmtNum(st.UtilidadBruta)},
		{"Gastos de operación", sym + " " + fmtNum(st.GastosOperativos)},
		{"Utilidad neta (estimada)", sym + " " + fmtNum(st.UtilidadNeta)},
		{"ISV cobrado (débito fiscal)", sym + " " + fmtNum(st.ISVCobrado)},
		{"Número de ventas", fmt.Sprintf("%d", st.NumVentas)},
		{"Ticket promedio", sym + " " + fmtNum(ms.TicketPromedio)},
		{"Compras recibidas", fmt.Sprintf("%s %s (%d órdenes)", sym, fmtNum(ms.ComprasRecibidas), ms.NumCompras)},
		{"Valor actual del inventario", sym + " " + fmtNum(ms.ValorInventario)},
		{"Margen bruto", fmt.Sprintf("%.1f%%", st.MargenBruto)},
		{"Margen neto", fmt.Sprintf("%.1f%%", st.MargenNeto)},
	}

	if r.URL.Query().Get("format") == "pdf" {
		pdf, tr := newPDF("P", name, rtn, "Resumen Mensual", period)
		pdf.SetFont("Helvetica", "B", 11)
		pdf.CellFormat(0, 7, tr("Indicadores del mes"), "", 1, "L", false, 0, "")
		pdf.SetFont("Helvetica", "", 10)
		for i, kpi := range kpis {
			fill := i%2 == 0
			pdf.SetFillColor(246, 247, 251)
			pdf.CellFormat(110, 7, tr(kpi[0]), "", 0, "L", fill, 0, "")
			pdf.CellFormat(0, 7, tr(kpi[1]), "", 1, "R", fill, 0, "")
		}
		pdf.Ln(5)
		pdf.SetFont("Helvetica", "B", 11)
		pdf.CellFormat(0, 7, tr("Productos más vendidos"), "", 1, "L", false, 0, "")
		pdf.SetFont("Helvetica", "B", 9)
		pdf.SetFillColor(70, 80, 180)
		pdf.SetTextColor(255, 255, 255)
		pdf.CellFormat(75, 7, tr("Producto"), "1", 0, "L", true, 0, "")
		pdf.CellFormat(30, 7, "SKU", "1", 0, "L", true, 0, "")
		pdf.CellFormat(22, 7, tr("Cantidad"), "1", 0, "R", true, 0, "")
		pdf.CellFormat(35, 7, tr("Ventas netas"), "1", 0, "R", true, 0, "")
		pdf.CellFormat(0, 7, tr("Utilidad"), "1", 1, "R", true, 0, "")
		pdf.SetTextColor(0, 0, 0)
		pdf.SetFont("Helvetica", "", 9)
		for _, t := range ms.TopProducts {
			nm := t.Name
			if len([]rune(nm)) > 42 {
				nm = string([]rune(nm)[:41]) + "…"
			}
			pdf.CellFormat(75, 6.5, tr(nm), "1", 0, "L", false, 0, "")
			pdf.CellFormat(30, 6.5, tr(t.SKU), "1", 0, "L", false, 0, "")
			pdf.CellFormat(22, 6.5, fmtNum(t.Qty), "1", 0, "R", false, 0, "")
			pdf.CellFormat(35, 6.5, sym+" "+fmtNum(t.Revenue), "1", 0, "R", false, 0, "")
			pdf.CellFormat(0, 6.5, sym+" "+fmtNum(t.Profit), "1", 1, "R", false, 0, "")
		}
		pdf.Ln(6)
		pdf.SetFont("Helvetica", "I", 8)
		pdf.SetTextColor(120, 120, 130)
		pdf.CellFormat(0, 5, tr("Generado el "+time.Now().Format("02/01/2006 15:04")), "", 1, "L", false, 0, "")
		sendPDF(w, fmt.Sprintf("resumen_%04d-%02d.pdf", year, month), pdf)
		return
	}

	f := excelize.NewFile()
	sheet := "Resumen"
	f.SetSheetName("Sheet1", sheet)
	_ = f.SetColWidth(sheet, "A", "A", 38)
	_ = f.SetColWidth(sheet, "B", "E", 18)
	titleStyle, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true, Size: 14}})
	subStyle, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Size: 10, Color: "666677"}})
	headStyle, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true, Color: "FFFFFF"},
		Fill: excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{"4650B4"}}})
	numFmt := "#,##0.00"
	moneyStyle, _ := f.NewStyle(&excelize.Style{CustomNumFmt: &numFmt})

	f.SetCellValue(sheet, "A1", name)
	f.SetCellStyle(sheet, "A1", "A1", titleStyle)
	f.SetCellValue(sheet, "A2", "RESUMEN MENSUAL — "+period)
	f.SetCellStyle(sheet, "A2", "A2", titleStyle)
	if rtn != "" {
		f.SetCellValue(sheet, "A3", "RTN: "+rtn)
		f.SetCellStyle(sheet, "A3", "A3", subStyle)
	}
	rowNum := 5
	for _, kpi := range kpis {
		f.SetCellValue(sheet, fmt.Sprintf("A%d", rowNum), kpi[0])
		f.SetCellValue(sheet, fmt.Sprintf("B%d", rowNum), kpi[1])
		rowNum++
	}
	rowNum += 1
	f.SetCellValue(sheet, fmt.Sprintf("A%d", rowNum), "PRODUCTOS MÁS VENDIDOS")
	f.SetCellStyle(sheet, fmt.Sprintf("A%d", rowNum), fmt.Sprintf("A%d", rowNum), titleStyle)
	rowNum++
	headers := []string{"Producto", "SKU", "Cantidad", "Ventas netas", "Utilidad"}
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, rowNum)
		f.SetCellValue(sheet, cell, h)
		f.SetCellStyle(sheet, cell, cell, headStyle)
	}
	rowNum++
	for _, t := range ms.TopProducts {
		f.SetCellValue(sheet, fmt.Sprintf("A%d", rowNum), t.Name)
		f.SetCellValue(sheet, fmt.Sprintf("B%d", rowNum), t.SKU)
		f.SetCellValue(sheet, fmt.Sprintf("C%d", rowNum), t.Qty)
		f.SetCellValue(sheet, fmt.Sprintf("D%d", rowNum), t.Revenue)
		f.SetCellValue(sheet, fmt.Sprintf("E%d", rowNum), t.Profit)
		f.SetCellStyle(sheet, fmt.Sprintf("C%d", rowNum), fmt.Sprintf("E%d", rowNum), moneyStyle)
		rowNum++
	}
	sendXLSX(w, fmt.Sprintf("resumen_%04d-%02d.xlsx", year, month), f)
}

// ── Inventario ──────────────────────────────────────────

func (a *API) exportInventory(w http.ResponseWriter, r *http.Request) {
	products, err := a.st.ListProducts(store.ProductFilter{Inactive: r.URL.Query().Get("inactive") == "1"})
	if err != nil {
		writeErr(w, err)
		return
	}
	name, rtn, sym := a.company()
	today := time.Now().Format("2006-01-02")
	var totalValue float64
	for _, p := range products {
		totalValue += p.Stock * p.Cost
	}

	if r.URL.Query().Get("format") == "pdf" {
		pdf, tr := newPDF("L", name, rtn, "Inventario de Productos",
			fmt.Sprintf("Al %s · %d productos · Valor total: %s %s", today, len(products), sym, fmtNum(totalValue)))
		pdf.SetFont("Helvetica", "B", 8)
		pdf.SetFillColor(70, 80, 180)
		pdf.SetTextColor(255, 255, 255)
		widths := []float64{28, 78, 32, 40, 22, 22, 18, 18, 24}
		heads := []string{"SKU", "Producto", "Categoría", "Proveedor", "Costo", "Precio", "Stock", "Mínimo", "Valor"}
		aligns := []string{"L", "L", "L", "L", "R", "R", "R", "R", "R"}
		for i, h := range heads {
			pdf.CellFormat(widths[i], 7, tr(h), "1", 0, aligns[i], true, 0, "")
		}
		pdf.Ln(-1)
		pdf.SetTextColor(0, 0, 0)
		pdf.SetFont("Helvetica", "", 8)
		fill := false
		for _, p := range products {
			pdf.SetFillColor(246, 247, 251)
			nm := p.Name
			if len([]rune(nm)) > 48 {
				nm = string([]rune(nm)[:47]) + "…"
			}
			cells := []string{p.SKU, nm, p.CategoryName, p.SupplierName,
				fmtNum(p.Cost), fmtNum(p.Price), fmtNum(p.Stock), fmtNum(p.MinStock), fmtNum(p.Stock * p.Cost)}
			for i, c := range cells {
				pdf.CellFormat(widths[i], 6, tr(c), "1", 0, aligns[i], fill, 0, "")
			}
			pdf.Ln(-1)
			fill = !fill
		}
		sendPDF(w, "inventario_"+today+".pdf", pdf)
		return
	}

	f := excelize.NewFile()
	sheet := "Inventario"
	f.SetSheetName("Sheet1", sheet)
	widths := map[string]float64{"A": 16, "B": 18, "C": 40, "D": 18, "E": 24, "F": 12, "G": 12, "H": 10, "I": 10, "J": 14, "K": 10}
	for col, wd := range widths {
		_ = f.SetColWidth(sheet, col, col, wd)
	}
	titleStyle, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true, Size: 14}})
	headStyle, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true, Color: "FFFFFF"},
		Fill: excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{"4650B4"}}})
	numFmt := "#,##0.00"
	moneyStyle, _ := f.NewStyle(&excelize.Style{CustomNumFmt: &numFmt})

	f.SetCellValue(sheet, "A1", name+" — Inventario al "+today)
	f.SetCellStyle(sheet, "A1", "A1", titleStyle)
	headers := []string{"SKU", "Código de barras", "Producto", "Categoría", "Proveedor", "Costo", "Precio", "ISV %", "Stock", "Stock mínimo", "Valor", "Activo"}
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 3)
		f.SetCellValue(sheet, cell, h)
		f.SetCellStyle(sheet, cell, cell, headStyle)
	}
	rowNum := 4
	for _, p := range products {
		active := "Sí"
		if !p.Active {
			active = "No"
		}
		vals := []any{p.SKU, p.Barcode, p.Name, p.CategoryName, p.SupplierName, p.Cost, p.Price, p.ISVRate, p.Stock, p.MinStock, p.Stock * p.Cost, active}
		for i, v := range vals {
			cell, _ := excelize.CoordinatesToCellName(i+1, rowNum)
			f.SetCellValue(sheet, cell, v)
		}
		f.SetCellStyle(sheet, fmt.Sprintf("F%d", rowNum), fmt.Sprintf("K%d", rowNum), moneyStyle)
		rowNum++
	}
	boldMoney, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true}, CustomNumFmt: &numFmt})
	f.SetCellValue(sheet, fmt.Sprintf("C%d", rowNum+1), "VALOR TOTAL DEL INVENTARIO")
	f.SetCellValue(sheet, fmt.Sprintf("K%d", rowNum+1), totalValue)
	f.SetCellStyle(sheet, fmt.Sprintf("K%d", rowNum+1), fmt.Sprintf("K%d", rowNum+1), boldMoney)
	sendXLSX(w, "inventario_"+today+".xlsx", f)
}

// ── Ventas ──────────────────────────────────────────────

func (a *API) exportSales(w http.ResponseWriter, r *http.Request) {
	from, to := reportRange(r)
	sales, err := a.st.SalesReportRows(from, to)
	if err != nil {
		writeErr(w, err)
		return
	}
	name, rtn, sym := a.company()
	var totNet, totISV, totTotal, totCost float64
	for _, v := range sales {
		if v.Status != "completada" {
			continue
		}
		totNet += v.Subtotal
		totISV += v.ISV
		totTotal += v.Total
		totCost += v.CostTotal
	}

	if r.URL.Query().Get("format") == "pdf" {
		pdf, tr := newPDF("L", name, rtn, "Reporte de Ventas", fmt.Sprintf("Del %s al %s", from, to))
		widths := []float64{24, 32, 60, 26, 28, 24, 28, 22, 18}
		heads := []string{"Número", "Fecha", "Cliente", "Subtotal", "ISV", "Total", "Utilidad", "Pago", "Estado"}
		aligns := []string{"L", "L", "L", "R", "R", "R", "R", "L", "L"}
		pdf.SetFont("Helvetica", "B", 8)
		pdf.SetFillColor(70, 80, 180)
		pdf.SetTextColor(255, 255, 255)
		for i, h := range heads {
			pdf.CellFormat(widths[i], 7, tr(h), "1", 0, aligns[i], true, 0, "")
		}
		pdf.Ln(-1)
		pdf.SetTextColor(0, 0, 0)
		pdf.SetFont("Helvetica", "", 8)
		fill := false
		for _, v := range sales {
			pdf.SetFillColor(246, 247, 251)
			cliente := v.CustomerName
			if cliente == "" {
				cliente = "Consumidor final"
			}
			if len([]rune(cliente)) > 36 {
				cliente = string([]rune(cliente)[:35]) + "…"
			}
			utilidad := v.Subtotal - v.CostTotal
			if v.Status != "completada" {
				utilidad = 0
			}
			cells := []string{v.SaleNumber, v.SaleDate, cliente, fmtNum(v.Subtotal), fmtNum(v.ISV),
				fmtNum(v.Total), fmtNum(utilidad), v.PaymentMethod, v.Status}
			for i, c := range cells {
				pdf.CellFormat(widths[i], 6, tr(c), "1", 0, aligns[i], fill, 0, "")
			}
			pdf.Ln(-1)
			fill = !fill
		}
		pdf.SetFont("Helvetica", "B", 8)
		pdf.CellFormat(widths[0]+widths[1]+widths[2], 7, tr("TOTALES (ventas completadas)"), "1", 0, "L", false, 0, "")
		pdf.CellFormat(widths[3], 7, fmtNum(totNet), "1", 0, "R", false, 0, "")
		pdf.CellFormat(widths[4], 7, fmtNum(totISV), "1", 0, "R", false, 0, "")
		pdf.CellFormat(widths[5], 7, fmtNum(totTotal), "1", 0, "R", false, 0, "")
		pdf.CellFormat(widths[6], 7, fmtNum(totNet-totCost), "1", 0, "R", false, 0, "")
		pdf.CellFormat(widths[7]+widths[8], 7, "", "1", 1, "L", false, 0, "")
		sendPDF(w, fmt.Sprintf("ventas_%s_%s.pdf", from, to), pdf)
		return
	}

	f := excelize.NewFile()
	sheet := "Ventas"
	f.SetSheetName("Sheet1", sheet)
	for col, wd := range map[string]float64{"A": 12, "B": 20, "C": 30, "D": 16, "E": 14, "F": 14, "G": 14, "H": 14, "I": 14, "J": 14, "K": 12} {
		_ = f.SetColWidth(sheet, col, col, wd)
	}
	titleStyle, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true, Size: 14}})
	headStyle, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true, Color: "FFFFFF"},
		Fill: excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{"4650B4"}}})
	numFmt := "#,##0.00"
	moneyStyle, _ := f.NewStyle(&excelize.Style{CustomNumFmt: &numFmt})
	boldMoney, _ := f.NewStyle(&excelize.Style{Font: &excelize.Font{Bold: true}, CustomNumFmt: &numFmt})

	f.SetCellValue(sheet, "A1", fmt.Sprintf("%s — Ventas del %s al %s (montos en %s)", name, from, to, sym))
	f.SetCellStyle(sheet, "A1", "A1", titleStyle)
	headers := []string{"Número", "Fecha", "Cliente", "RTN", "Subtotal", "Descuento", "ISV", "Total", "Costo", "Utilidad", "Pago", "Estado"}
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 3)
		f.SetCellValue(sheet, cell, h)
		f.SetCellStyle(sheet, cell, cell, headStyle)
	}
	rowNum := 4
	for _, v := range sales {
		utilidad := v.Subtotal - v.CostTotal
		if v.Status != "completada" {
			utilidad = 0
		}
		vals := []any{v.SaleNumber, v.SaleDate, v.CustomerName, v.CustomerRTN, v.Subtotal, v.Discount,
			v.ISV, v.Total, v.CostTotal, utilidad, v.PaymentMethod, v.Status}
		for i, val := range vals {
			cell, _ := excelize.CoordinatesToCellName(i+1, rowNum)
			f.SetCellValue(sheet, cell, val)
		}
		f.SetCellStyle(sheet, fmt.Sprintf("E%d", rowNum), fmt.Sprintf("J%d", rowNum), moneyStyle)
		rowNum++
	}
	rowNum++
	f.SetCellValue(sheet, fmt.Sprintf("C%d", rowNum), "TOTALES (completadas)")
	for col, v := range map[string]float64{"E": totNet, "G": totISV, "H": totTotal, "I": totCost, "J": totNet - totCost} {
		f.SetCellValue(sheet, col+fmt.Sprint(rowNum), v)
		f.SetCellStyle(sheet, col+fmt.Sprint(rowNum), col+fmt.Sprint(rowNum), boldMoney)
	}
	sendXLSX(w, fmt.Sprintf("ventas_%s_%s.xlsx", from, to), f)
}
