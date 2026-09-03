package store_test

import (
	"math"
	"testing"
	"time"

	"onstock/internal/store"
)

func openStore(t *testing.T) *store.Store {
	t.Helper()
	st, err := store.Open(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = st.Close() })
	return st
}

// El reporte "Top productos" y el Estado de Resultados se miran en la misma
// pantalla: si no suman lo mismo, el dueño deja de creerle al sistema.
func TestTopProductsCuadraConEstadoDeResultados(t *testing.T) {
	st := openStore(t)
	if _, err := st.SeedDemo(false); err != nil {
		t.Fatal(err)
	}

	from, to := "2000-01-01", time.Now().Format("2006-01-02")
	is, err := st.IncomeStatement(from, to)
	if err != nil {
		t.Fatal(err)
	}
	if is.Descuentos <= 0 {
		t.Fatal("el set de ejemplo no tiene ninguna venta con descuento; la prueba no probaría nada")
	}

	top, err := st.TopProducts(from, to, 1000)
	if err != nil {
		t.Fatal(err)
	}
	if len(top) == 0 {
		t.Fatal("sin productos vendidos")
	}

	var revenue, profit float64
	for _, p := range top {
		revenue += p.Revenue
		profit += p.Profit
	}
	// Cada fila viene redondeada a dos decimales; el error acumulable es el
	// redondeo, no la fórmula.
	tol := 0.02*float64(len(top)) + 0.05
	if math.Abs(revenue-is.VentasNetas) > tol {
		t.Fatalf("ingresos de top productos %.2f != ventas netas %.2f (tolerancia %.2f)", revenue, is.VentasNetas, tol)
	}
	// La utilidad arrastra además el redondeo de sales.cost_total (uno por venta).
	tolCosto := tol + 0.01*float64(is.NumVentas)
	if math.Abs(profit-is.UtilidadBruta) > tolCosto {
		t.Fatalf("utilidad de top productos %.2f != utilidad bruta %.2f (tolerancia %.2f)", profit, is.UtilidadBruta, tolCosto)
	}
}

// Una venta anulada repone el stock y sale de todos los reportes.
func TestVentaAnuladaNoEntraEnLosReportes(t *testing.T) {
	st := openStore(t)
	p, err := st.CreateProduct(store.Product{
		Name: "Producto de prueba", SKU: "TST-001",
		Cost: 10, Price: 23, ISVRate: 15, Stock: 50, MinStock: 5, Active: true,
	})
	if err != nil {
		t.Fatal(err)
	}
	venta, err := st.CreateSale(store.NewSaleInput{
		CustomerName: "Cliente mostrador",
		Items:        []store.NewSaleItemInput{{ProductID: p.ID, Qty: 10}},
	})
	if err != nil {
		t.Fatal(err)
	}
	hoy := time.Now().Format("2006-01-02")
	antes, err := st.IncomeStatement(hoy, hoy)
	if err != nil {
		t.Fatal(err)
	}
	if antes.VentasNetas <= 0 {
		t.Fatal("la venta no llegó al estado de resultados")
	}
	if _, err := st.VoidSale(venta.ID); err != nil {
		t.Fatal(err)
	}
	despues, err := st.IncomeStatement(hoy, hoy)
	if err != nil {
		t.Fatal(err)
	}
	if despues.VentasNetas != 0 || despues.CostoVentas != 0 || despues.NumVentas != 0 {
		t.Fatalf("la venta anulada sigue en el reporte: %+v", despues)
	}
	top, err := st.TopProducts(hoy, hoy, 10)
	if err != nil {
		t.Fatal(err)
	}
	if len(top) != 0 {
		t.Fatalf("la venta anulada sigue en top productos: %+v", top)
	}
	back, err := st.GetProduct(p.ID)
	if err != nil {
		t.Fatal(err)
	}
	if back.Stock != 50 {
		t.Fatalf("el stock no se repuso: %g", back.Stock)
	}
}

// Una salida manual (merma) no puede dejar el inventario en negativo salvo que
// el dueño lo haya permitido explícitamente en Configuración.
func TestSalidaManualRespetaStockDisponible(t *testing.T) {
	st := openStore(t)
	p, err := st.CreateProduct(store.Product{
		Name: "Merma", SKU: "TST-002", Cost: 5, Price: 12, ISVRate: 15, Stock: 4, Active: true,
	})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := st.AdjustStock(p.ID, "salida", 9, "Merma"); err == nil {
		t.Fatal("se permitió sacar más de lo que hay con stock negativo deshabilitado")
	}
	if got, _ := st.GetProduct(p.ID); got.Stock != 4 {
		t.Fatalf("la salida rechazada movió el stock: %g", got.Stock)
	}
	if err := st.SetSettings(map[string]string{"allow_negative_stock": "1"}); err != nil {
		t.Fatal(err)
	}
	if _, err := st.AdjustStock(p.ID, "salida", 9, "Merma"); err != nil {
		t.Fatalf("con stock negativo permitido debería pasar: %v", err)
	}
	if got, _ := st.GetProduct(p.ID); got.Stock != -5 {
		t.Fatalf("stock esperado -5, obtenido %g", got.Stock)
	}
}
