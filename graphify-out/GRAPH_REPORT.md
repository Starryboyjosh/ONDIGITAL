# ONDIGITAL Graphify Report

> Generado el 2026-06-26. Esta corrida usa extracción AST local de archivos de código.
> La extracción semántica de Markdown, imágenes y otros documentos requiere una llave LLM
> (`GEMINI_API_KEY`, `GOOGLE_API_KEY`, `OPENAI_API_KEY`, etc.) y debe ejecutarse con
> `graphify extract .` cuando el equipo quiera el grafo completo.

# Graph Report - /home/starryboyjosh/Dev/Projects/ONDIGITAL  (2026-06-26)

## Corpus Check
- 165 files · ~156,255 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 507 nodes · 1197 edges · 31 communities (30 shown, 1 thin omitted)
- Extraction: 88% EXTRACTED · 12% INFERRED · 0% AMBIGUOUS · INFERRED: 143 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Comunidad 0|Comunidad 0]]
- [[_COMMUNITY_Comunidad 1|Comunidad 1]]
- [[_COMMUNITY_Comunidad 2|Comunidad 2]]
- [[_COMMUNITY_Comunidad 3|Comunidad 3]]
- [[_COMMUNITY_Comunidad 4|Comunidad 4]]
- [[_COMMUNITY_Comunidad 5|Comunidad 5]]
- [[_COMMUNITY_Comunidad 6|Comunidad 6]]
- [[_COMMUNITY_Comunidad 7|Comunidad 7]]
- [[_COMMUNITY_Comunidad 8|Comunidad 8]]
- [[_COMMUNITY_Comunidad 9|Comunidad 9]]
- [[_COMMUNITY_Comunidad 10|Comunidad 10]]
- [[_COMMUNITY_Comunidad 11|Comunidad 11]]
- [[_COMMUNITY_Comunidad 12|Comunidad 12]]
- [[_COMMUNITY_Comunidad 13|Comunidad 13]]
- [[_COMMUNITY_Comunidad 14|Comunidad 14]]
- [[_COMMUNITY_Comunidad 15|Comunidad 15]]
- [[_COMMUNITY_Comunidad 16|Comunidad 16]]
- [[_COMMUNITY_Comunidad 17|Comunidad 17]]
- [[_COMMUNITY_Comunidad 18|Comunidad 18]]
- [[_COMMUNITY_Comunidad 19|Comunidad 19]]
- [[_COMMUNITY_Comunidad 20|Comunidad 20]]
- [[_COMMUNITY_Comunidad 22|Comunidad 22]]

## God Nodes (most connected - your core abstractions)
1. `writeErr()` - 46 edges
2. `esc()` - 41 edges
3. `writeJSON()` - 40 edges
4. `Request` - 38 edges
5. `API` - 37 edges
6. `ResponseWriter` - 37 edges
7. `toastErr()` - 29 edges
8. `money()` - 28 edges
9. `toast()` - 24 edges
10. `New()` - 21 edges
11. `openModal()` - 21 edges
12. `pathID()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `buildReport()` --calls--> `fmt()`  [INFERRED]
  credental/js/reportes.js → onstock/legacy/public/js/app.js
- `newPDF()` --calls--> `New()`  [INFERRED]
  onstock/internal/httpapi/exports.go → onstock/internal/httpapi/api.go
- `main()` --calls--> `New()`  [INFERRED]
  onstock/main.go → onstock/internal/httpapi/api.go
- `rangeFor()` --calls--> `fmt()`  [INFERRED]
  onstock/web/js/pages/reportes.js → onstock/legacy/public/js/app.js
- `insertPOItems()` --calls--> `New()`  [INFERRED]
  onstock/internal/store/purchases.go → onstock/internal/httpapi/api.go
- `main()` --calls--> `Open()`  [INFERRED]
  onstock/main.go → onstock/internal/store/store.go
- `loadTable()` --calls--> `confirmDialog()`  [EXTRACTED]
  onstock/web/js/pages/compras.js → onstock/web/js/ui.js
- `loadTable()` --calls--> `esc()`  [EXTRACTED]
  onstock/web/js/pages/compras.js → onstock/web/js/ui.js

## Import Cycles
- None detected.

## Communities (31 total, 1 thin omitted)

### Community 0 - "Comunidad 0"
Cohesion: 0.00
Nodes (83): api, navigate(), refreshSettings(), routes, compact(), monthBarChart(), niceMax(), applyTheme() (+75 more)

### Community 1 - "Comunidad 1"
Cohesion: 0.00
Nodes (22): Category, Handler, decode(), logMiddleware(), New(), NewPOInput, Product, Store (+14 more)

### Community 2 - "Comunidad 2"
Cohesion: 0.00
Nodes (9): pathID(), qInt(), writeErr(), writeJSON(), Request, ResponseWriter, API, Request (+1 more)

### Community 3 - "Comunidad 3"
Cohesion: 0.00
Nodes (32): addOrderItemRow(), closeModal(), deleteOrder(), deleteProduct(), deleteSupplier(), editProduct(), editSupplier(), esc() (+24 more)

### Community 4 - "Comunidad 4"
Cohesion: 0.00
Nodes (17): Expense, Store, Product, Store, Product, Sale, Store, StockMovement (+9 more)

### Community 5 - "Comunidad 5"
Cohesion: 0.00
Nodes (24): author, bin, dependencies, better-sqlite3, body-parser, bwip-js, cors, exceljs (+16 more)

### Community 6 - "Comunidad 6"
Cohesion: 0.00
Nodes (13): File, Fpdf, fmtNum(), incomeStatementRows(), newPDF(), sendPDF(), sendXLSX(), reportRange() (+5 more)

### Community 7 - "Comunidad 7"
Cohesion: 0.00
Nodes (16): FS, Database, dataDir, db, dbPath, fs, path, app (+8 more)

### Community 8 - "Comunidad 8"
Cohesion: 0.00
Nodes (17): NewSaleItemInput, NewPOItemIn, PurchaseOrderItem, SaleItem, Category, Expense, NewPOInput, NewPOItemIn (+9 more)

### Community 9 - "Comunidad 9"
Cohesion: 0.00
Nodes (7): DB, defaultBaseDir(), isTempDir(), lanIP(), main(), truncatePath(), Open()

### Community 11 - "Comunidad 11"
Cohesion: 0.00
Nodes (6): gatherMovements(), readMovs(), renderAll(), renderEstado(), renderMovimientos(), renderSummary()

### Community 12 - "Comunidad 12"
Cohesion: 0.00
Nodes (4): get(), syncAllFromFirebase(), syncCollection(), syncObjectCollection()

### Community 13 - "Comunidad 13"
Cohesion: 0.00
Nodes (7): correlativoNum(), fmtDate(), rangeInfo(), renderAlerts(), renderAll(), renderDocs(), renderStatusCards()

### Community 14 - "Comunidad 14"
Cohesion: 0.00
Nodes (6): createCell(), deleteAppt(), initAllAutocompletes(), renderCalendar(), setupSearchAutocomplete(), updateApptStatus()

### Community 15 - "Comunidad 15"
Cohesion: 0.00
Nodes (5): NewSaleInput, Sale, Store, SaleFilter, scanSale()

### Community 16 - "Comunidad 16"
Cohesion: 0.00
Nodes (6): Barcode, barcodePNGBytes(), encodeBarcode(), API, Request, ResponseWriter

### Community 17 - "Comunidad 17"
Cohesion: 0.00
Nodes (5): diasParaVencer(), estadoInsumo(), renderAlerts(), renderAll(), renderTable()

### Community 18 - "Comunidad 18"
Cohesion: 0.00
Nodes (3): renderAll(), renderResumen(), renderTable()

### Community 19 - "Comunidad 19"
Cohesion: 0.00
Nodes (4): budgetDate(), buildReport(), renderBars(), tsFromId()

### Community 20 - "Comunidad 20"
Cohesion: 0.00
Nodes (4): handleFaceClick(), handleToothClick(), loadPatientOdontogram(), renderFindingsHistory()

### Community 22 - "Comunidad 22"
Cohesion: 0.00
Nodes (3): calculateTotals(), formatCurrency(), renderInvoiceTable()

## Knowledge Gaps
- **79 isolated node(s):** `T`, `Barcode`, `File`, `StockMovement`, `Product` (+74 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.