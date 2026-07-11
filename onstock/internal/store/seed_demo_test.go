package store_test

import (
	"testing"

	"onstock/internal/store"
)

func TestSeedDemo(t *testing.T) {
	st, err := store.Open(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = st.Close() })

	rep, err := st.SeedDemo(false)
	if err != nil {
		t.Fatal(err)
	}
	if rep.Products < 15 || rep.Sales < 10 || rep.LowStock < 3 {
		t.Fatalf("seed too thin: %+v", rep)
	}

	// Second seed without force must fail
	if _, err := st.SeedDemo(false); err == nil {
		t.Fatal("expected error when products already exist")
	}

	// Force reseeds
	rep2, err := st.SeedDemo(true)
	if err != nil {
		t.Fatal(err)
	}
	if rep2.Products != rep.Products {
		t.Fatalf("force products %d vs %d", rep2.Products, rep.Products)
	}

	low, err := st.ListProducts(store.ProductFilter{LowStock: true})
	if err != nil {
		t.Fatal(err)
	}
	if len(low) < 3 {
		t.Fatalf("expected several low-stock products, got %d", len(low))
	}
}
