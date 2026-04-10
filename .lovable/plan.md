

# Build Full LC Management, Delivery Orders & Landed Cost System

## Current State

- **YutongLCManagement.tsx** — placeholder "coming soon"
- **YutongDeliveryOrderManagement.tsx** — placeholder "coming soon"
- **SinotrukLCManagement.tsx** — placeholder "coming soon"
- **LightVehicleLCManagement.tsx** — placeholder "coming soon"
- **Hook `useYutongFinanceManagement.ts`** — all CRUD functions already built (createLC, updateLCStatus, addLCAmendment, createDO, updateDOStatus, getLetterOfCredits, getDeliveryOrders)
- **Database tables** — `yutong_letter_of_credits` (23 columns), `yutong_delivery_orders` (21 columns), `landed_cost_vouchers/charges/items` all exist with proper schemas
- **Sinotruck & Light Vehicle** hooks already have identical LC/DO functions

The backend is 100% ready. Only the UI components are empty placeholders.

## Plan

### 1. Build YutongLCManagement.tsx — Full LC Interface

Replace the placeholder with a complete management screen:

- **LC List Table**: LC No, Order (bus model + qty), Bank, Amount (USD), Status badge, Issue/Expiry dates, Utilized/Remaining, Amendment count
- **Create LC Dialog**: Form with fields — select order (dropdown of Yutong orders), issuing bank name/branch/contact, beneficiary bank, LC amount, currency, LC type, issue date, expiry date, latest shipment date, notes
- **LC Detail View**: Click a row to expand/view full LC details
- **Status Actions**: Update status (issued → negotiating → utilized → expired/closed), record utilized amount
- **Amendment Dialog**: Add amendments with type, description, old/new values, date — appends to JSONB array
- **Color-coded status badges**: draft=gray, issued=blue, amended=yellow, utilized=green, expired=red

Uses existing `useYutongFinanceManagement` hook — no new backend code needed.

### 2. Build YutongDeliveryOrderManagement.tsx — Full DO Interface

Replace the placeholder with:

- **DO List Table**: DO No, Order, LC (linked), Bank, Amount, Vehicle Count, Status, Issue/Release/Collection dates
- **Create DO Dialog**: Select order, optionally link to LC, bank, amount, chassis/engine numbers (multi-input), vehicle count, commercial invoice no, bill of lading no, packing list no
- **Status Workflow**: pending → issued → released → collected (with release_date and collection_date auto-fill)
- **Collection tracking**: Record who collected (collected_by field)

Uses existing `useYutongFinanceManagement` hook.

### 3. Build Landed Cost Integration Tab

Add a "Landed Cost" tab to the Finance Dashboard showing:

- **Voucher List**: From `landed_cost_vouchers` table — voucher number, posting date, total additional cost, allocation method, status
- **Charges breakdown**: From `landed_cost_charges` — charge type, description, amount, vendor
- **Item allocation view**: From `landed_cost_items` — original cost, allocated cost, final cost per item
- **Link to orders**: Connect landed cost vouchers to Yutong orders for full cost tracking

### 4. Apply Same Pattern to Sinotruck & Light Vehicle

Copy the Yutong LC/DO components and adapt for:
- `SinotrukLCManagement.tsx` — uses `useSinotrukFinanceManagement` hook, queries `sinotruck_letter_of_credits`
- `LightVehicleLCManagement.tsx` — uses `useLightVehicleFinanceManagement` hook, queries `lightvehicle_letter_of_credits`

### 5. Add Finance Dashboard Interconnections

Update `YutongFinanceDashboard.tsx`:
- Add "Landed Cost" as 5th tab
- Overview tab: show LC utilization chart, payment vs outstanding breakdown, DO status summary
- Cross-link: clicking an LC shows related DOs, clicking a DO shows related LC and order

## Files to Change

- `src/components/yutong/YutongLCManagement.tsx` — build full LC CRUD interface
- `src/components/yutong/YutongDeliveryOrderManagement.tsx` — build full DO CRUD interface
- `src/components/yutong/YutongFinanceDashboard.tsx` — add Landed Cost tab, improve overview
- `src/components/sinotruck/SinotrukLCManagement.tsx` — build full LC interface for Sinotruck
- `src/components/lightvehicle/LightVehicleLCManagement.tsx` — build full LC interface for Light Vehicle

## Result

- All three vehicle sales modules get working LC management (create, amend, track status, utilization)
- Delivery Orders fully trackable from issuance to collection
- Landed cost charges visible and linked to orders
- Finance dashboard becomes the single source of truth for import finance operations
- Full interconnection: Order → LC → DO → Landed Cost → GL


## Files
- **Modify**: `src/components/accounting/DrillDownModal.tsx` — add per-row delete button + confirmation
- **Modify**: `src/components/accounting/settings/BalanceReconciliationTool.tsx` — add orphaned JE scanner section
