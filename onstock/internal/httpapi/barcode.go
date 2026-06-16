package httpapi

import (
	"bytes"
	"fmt"
	"image/png"
	"net/http"
	"strings"

	"github.com/boombuler/barcode"
	"github.com/boombuler/barcode/code128"
	"github.com/boombuler/barcode/ean"
	"github.com/go-pdf/fpdf"
)

// encodeBarcode genera un código EAN-8/13 si el texto es numérico de 8/12/13 dígitos;
// si no, usa Code128 (acepta cualquier texto, estándar en retail interno).
func encodeBarcode(code string) (barcode.Barcode, error) {
	digitsOnly := len(code) > 0
	for _, c := range code {
		if c < '0' || c > '9' {
			digitsOnly = false
			break
		}
	}
	if digitsOnly && (len(code) == 8 || len(code) == 12 || len(code) == 13) {
		if bc, err := ean.Encode(code); err == nil {
			return bc, nil
		}
	}
	return code128.Encode(code)
}

func barcodePNGBytes(code string, w, h int) ([]byte, error) {
	bc, err := encodeBarcode(code)
	if err != nil {
		return nil, err
	}
	scaled, err := barcode.Scale(bc, w, h)
	if err != nil {
		return nil, err
	}
	var buf bytes.Buffer
	if err := png.Encode(&buf, scaled); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// GET /api/barcode/{code} — PNG del código de barras.
func (a *API) barcodePNG(w http.ResponseWriter, r *http.Request) {
	code := strings.TrimSuffix(r.PathValue("code"), ".png")
	if code == "" {
		writeErr(w, fmt.Errorf("código vacío"))
		return
	}
	width := int(qInt(r, "w"))
	height := int(qInt(r, "h"))
	if width <= 0 {
		width = 300
	}
	if height <= 0 {
		height = 80
	}
	data, err := barcodePNGBytes(code, width, height)
	if err != nil {
		writeErr(w, fmt.Errorf("no se pudo generar el código de barras: %w", err))
		return
	}
	w.Header().Set("Content-Type", "image/png")
	w.Header().Set("Cache-Control", "max-age=86400")
	_, _ = w.Write(data)
}

// GET /api/labels/pdf?ids=1,2,3&copies=2 — hoja de etiquetas con código de barras (carta, 3 columnas).
func (a *API) labelsPDF(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	copies := int(qInt(r, "copies"))
	if copies <= 0 {
		copies = 1
	}
	if copies > 100 {
		copies = 100
	}
	var ids []int64
	for _, part := range strings.Split(q.Get("ids"), ",") {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		var id int64
		if _, err := fmt.Sscanf(part, "%d", &id); err == nil && id > 0 {
			ids = append(ids, id)
		}
	}
	if len(ids) == 0 {
		writeErr(w, fmt.Errorf("indica al menos un producto (ids=1,2,3)"))
		return
	}

	settings, _ := a.st.GetSettings()
	sym := settings["currency_symbol"]
	if sym == "" {
		sym = "L"
	}

	pdf := fpdf.New("P", "mm", "Letter", "")
	pdf.SetAutoPageBreak(false, 0)
	tr := pdf.UnicodeTranslatorFromDescriptor("")
	pdf.AddPage()

	const (
		marginX = 8.0
		marginY = 10.0
		cols    = 3
		rowsPP  = 9
	)
	pageW, pageH := 215.9, 279.4
	_ = pageH
	labelW := (pageW - 2*marginX) / cols
	labelH := 28.0

	col, row := 0, 0
	n := 0
	for _, id := range ids {
		p, err := a.st.GetProduct(id)
		if err != nil {
			continue
		}
		code := p.Barcode
		if code == "" {
			code = p.SKU
		}
		imgData, err := barcodePNGBytes(code, 360, 90)
		if err != nil {
			continue
		}
		imgName := fmt.Sprintf("bc-%d", id)
		pdf.RegisterImageOptionsReader(imgName, fpdf.ImageOptions{ImageType: "PNG"}, bytes.NewReader(imgData))

		for c := 0; c < copies; c++ {
			if row >= rowsPP {
				pdf.AddPage()
				row, col = 0, 0
			}
			x := marginX + float64(col)*labelW
			y := marginY + float64(row)*labelH

			name := p.Name
			if len([]rune(name)) > 38 {
				name = string([]rune(name)[:37]) + "…"
			}
			pdf.SetFont("Helvetica", "B", 8)
			pdf.SetXY(x+2, y+2)
			pdf.CellFormat(labelW-4, 4, tr(name), "", 0, "C", false, 0, "")

			pdf.ImageOptions(imgName, x+labelW/2-22, y+7, 44, 11, false, fpdf.ImageOptions{ImageType: "PNG"}, 0, "")

			pdf.SetFont("Helvetica", "", 7)
			pdf.SetXY(x+2, y+18.5)
			pdf.CellFormat(labelW-4, 3.5, tr(code), "", 0, "C", false, 0, "")

			pdf.SetFont("Helvetica", "B", 9)
			pdf.SetXY(x+2, y+22.5)
			pdf.CellFormat(labelW-4, 4, tr(fmt.Sprintf("%s %s", sym, fmtNum(p.Price))), "", 0, "C", false, 0, "")

			col++
			if col >= cols {
				col = 0
				row++
			}
			n++
		}
	}
	if n == 0 {
		writeErr(w, fmt.Errorf("ningún producto válido para etiquetas"))
		return
	}
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", `attachment; filename="etiquetas.pdf"`)
	_ = pdf.Output(w)
}
