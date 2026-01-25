

# Complete Vehicle Sales Finance Integration - Remaining Tasks

## Current State Summary

| Component | Status | What's Needed |
|-----------|--------|---------------|
| **Database Schema** | DONE | Finance settings tables, order tables, link columns created |
| **useVehicleSalesFinance.ts** | DONE | Unified GL/AR/Customer functions created |
| **SinotruckPaymentTracking.tsx** | DONE | Full GL integration built |
| **LightVehiclePaymentTracking.tsx** | DONE | Full GL integration built |
| **YutongFinanceSettings.tsx** | DONE | Settings UI created |
| **SinotruckFinanceSettings.tsx** | DONE | Settings UI created |
| **LightVehicleFinanceSettings.tsx** | DONE | Settings UI created |
| **Settings.tsx** | NEEDS UPDATE | Add 3 new finance tabs |
| **EnhancedSinotrukOrderDetailsModal.tsx** | NEEDS UPDATE | Embed SinotruckPaymentTracking |
| **YutongPaymentTracking.tsx** | NEEDS UPDATE | Add GL posting on verify |
| **useSinotrukOrderManagement.ts** | NEEDS UPDATE | Use new sinotruck_orders table properly |

---

## Complete Flow Diagram - Vehicle Sales Finance Integration

```text
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           VEHICLE SALES FINANCE INTEGRATION                          │
│                         (Yutong / Sinotruck / Light Vehicle)                         │
└─────────────────────────────────────────────────────────────────────────────────────┘

                                    QUOTATION
                                        │
                                        ▼
                              ┌─────────────────┐
                              │ Convert to Order │
                              │ (Order Created) │
                              └────────┬────────┘
                                       │
                       ┌───────────────┼───────────────┐
                       │               │               │
                       ▼               ▼               ▼
                   YUTONG         SINOTRUCK      LIGHT VEHICLE
                   (YUT)           (SNT)           (LTV)
                       │               │               │
                       └───────────────┼───────────────┘
                                       │
                                       ▼
                        ┌────────────────────────────┐
                        │   PAYMENT RECORDED         │
                        │   (Status: pending)        │
                        └──────────────┬─────────────┘
                                       │
                                       ▼
                        ┌────────────────────────────┐
                        │   FINANCE VERIFIES         │
                        │   Click "Verify & Post GL" │
                        └──────────────┬─────────────┘
                                       │
              ┌────────────────────────┼────────────────────────┐
              │                        │                        │
              ▼                        ▼                        ▼
    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
    │ Create Customer │    │ Create AR       │    │ Post GL Entry   │
    │ (if not exists) │    │ Invoice         │    │                 │
    │                 │    │ (if first pay)  │    │ DR Bank         │
    │ Code: YUT-xxx   │    │ INV: YUT-INV-xx │    │ CR Advance/     │
    │       SNT-xxx   │    │      SNT-INV-xx │    │    Revenue      │
    │       LTV-xxx   │    │      LTV-INV-xx │    │                 │
    └────────┬────────┘    └────────┬────────┘    └────────┬────────┘
             │                      │                      │
             └──────────────────────┼──────────────────────┘
                                    │
                                    ▼
                        ┌────────────────────────────┐
                        │   Create AR Receipt        │
                        │   Link to AR Invoice       │
                        └──────────────┬─────────────┘
                                       │
                                       ▼
                        ┌────────────────────────────┐
                        │   Update Payment Status    │
                        │   Status: verified         │
                        │   Link: journal_entry_id   │
                        │   Link: ar_receipt_id      │
                        └──────────────┬─────────────┘
                                       │
                                       ▼
                        ┌────────────────────────────┐
                        │   Update Order Financials  │
                        │   total_paid increased     │
                        │   balance_due decreased    │
                        └────────────────────────────┘
```

---

## GL Posting Rules by Payment Type

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           GL POSTING RULES                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ADVANCE PAYMENT (Before Delivery)                                               │
│  ─────────────────────────────────                                               │
│  Entry: {YUT/SNT/LTV}-ADV-{OrderNo}-{timestamp}                                  │
│  Business Unit: YUT / SNT / LTV                                                  │
│                                                                                  │
│    DEBIT   Bank/Cash Account              {amount}                               │
│    CREDIT  Customer Advance Receipt       {amount}                               │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  BALANCE PAYMENT (After Delivery)                                                │
│  ────────────────────────────────                                                │
│  Entry: {YUT/SNT/LTV}-BAL-{OrderNo}-{timestamp}                                  │
│  Business Unit: YUT / SNT / LTV                                                  │
│                                                                                  │
│    DEBIT   Bank/Cash Account              {amount}                               │
│    CREDIT  Trade Receivable               {amount}                               │
│                                                                                  │
│    DEBIT   Customer Advance Receipt       {advance_amount}  (apply advance)      │
│    CREDIT  Trade Receivable               {advance_amount}                       │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  FULL PAYMENT (100% Upfront)                                                     │
│  ───────────────────────────                                                     │
│  Entry: {YUT/SNT/LTV}-REV-{OrderNo}-{timestamp}                                  │
│  Business Unit: YUT / SNT / LTV                                                  │
│                                                                                  │
│    DEBIT   Bank/Cash Account              {amount}                               │
│    CREDIT  Sales Revenue                  {amount}                               │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Details

### Part 1: Update Settings.tsx

Add three new finance tabs to the Settings page.

**Location:** `src/pages/Settings.tsx`

**Changes:**
1. Add imports for new finance settings components (lines 26-28)
2. Add 3 new TabsTrigger elements (after line 139)
3. Add 3 new TabsContent sections (after line 588)

**New Imports:**
```typescript
import { YutongFinanceSettings } from "@/components/settings/YutongFinanceSettings";
import { SinotruckFinanceSettings } from "@/components/settings/SinotruckFinanceSettings";
import { LightVehicleFinanceSettings } from "@/components/settings/LightVehicleFinanceSettings";
```

**New Tab Triggers (add after Special Hire Finance tab):**
```typescript
<TabsTrigger value="yutong-finance" className="flex items-center gap-1">
  <Truck className="h-3 w-3" />
  Yutong Finance
</TabsTrigger>
<TabsTrigger value="sinotruck-finance" className="flex items-center gap-1">
  <Truck className="h-3 w-3" />
  Sinotruck Finance
</TabsTrigger>
<TabsTrigger value="lightvehicle-finance" className="flex items-center gap-1">
  <Car className="h-3 w-3" />
  Light Vehicle Finance
</TabsTrigger>
```

**New Tab Contents (add after Special Hire Finance content):**
```typescript
<TabsContent value="yutong-finance" className="space-y-6 mt-6">
  <YutongFinanceSettings />
</TabsContent>

<TabsContent value="sinotruck-finance" className="space-y-6 mt-6">
  <SinotruckFinanceSettings />
</TabsContent>

<TabsContent value="lightvehicle-finance" className="space-y-6 mt-6">
  <LightVehicleFinanceSettings />
</TabsContent>
```

---

### Part 2: Update EnhancedSinotrukOrderDetailsModal.tsx

Replace placeholder with actual SinotruckPaymentTracking component.

**Location:** `src/components/sinotruck/EnhancedSinotrukOrderDetailsModal.tsx`

**Changes:**
1. Add import for SinotruckPaymentTracking (line 24)
2. Replace Financial tab placeholder content (lines 176-182)

**New Import:**
```typescript
import { SinotruckPaymentTracking } from './SinotruckPaymentTracking';
```

**Replace Financial TabsContent:**
```typescript
<TabsContent value="financial" className="space-y-6">
  <SinotruckPaymentTracking 
    orderId={order.id} 
    onRefresh={onRefresh} 
  />
</TabsContent>
```

---

### Part 3: Update YutongPaymentTracking.tsx

Add GL posting integration to the verify payment function.

**Location:** `src/components/yutong/YutongPaymentTracking.tsx`

**Changes:**
1. Add imports for vehicle finance functions (after line 19)
2. Enhance handleVerifyPayment function (lines 204-230)

**New Imports:**
```typescript
import {
  fetchVehicleFinanceSettings,
  createVehicleCustomer,
  createVehicleARInvoice,
  postVehiclePaymentToGL,
  createVehicleARReceipt,
  updateOrderFinanceLinks,
  NCG_HOLDING_ID,
} from '@/hooks/useVehicleSalesFinance';
```

**Enhanced handleVerifyPayment:**
```typescript
const handleVerifyPayment = async (paymentId: string) => {
  try {
    const payment = payments.find(p => p.id === paymentId);
    if (!payment) {
      toast.error('Payment not found');
      return;
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Authentication required');
      return;
    }

    // Fetch finance settings
    const settings = await fetchVehicleFinanceSettings('yutong', NCG_HOLDING_ID);
    if (!settings) {
      toast.error('Finance settings not configured. Please configure Yutong Finance Settings first.');
      return;
    }

    const customerName = orderDetails?.yutong_quotations?.customer_name || 'Unknown';
    const orderNo = orderDetails?.order_no;

    // 1. Create/Get Finance Customer
    let customerId = orderDetails?.finance_customer_id;
    if (!customerId && settings.auto_create_customer) {
      customerId = await createVehicleCustomer({
        module: 'yutong',
        customerName,
        companyId: NCG_HOLDING_ID,
      });

      if (customerId) {
        await updateOrderFinanceLinks({
          module: 'yutong',
          orderId: selectedOrderId!,
          financeCustomerId: customerId,
        });
      }
    }

    // 2. Create AR Invoice if not exists
    let invoiceId = orderDetails?.ar_invoice_id;
    if (!invoiceId && customerId) {
      const arResult = await createVehicleARInvoice({
        module: 'yutong',
        orderId: selectedOrderId!,
        orderNo,
        customerId,
        totalAmount: orderDetails?.total_amount || 0,
        advanceAmount: payment.payment_amount,
        companyId: NCG_HOLDING_ID,
        settings,
      });

      if (arResult) {
        invoiceId = arResult.invoiceId;
        await updateOrderFinanceLinks({
          module: 'yutong',
          orderId: selectedOrderId!,
          arInvoiceId: invoiceId,
        });
        toast.success(`AR Invoice created: ${arResult.invoiceNumber}`);
      }
    }

    // 3. Post to GL
    let journalEntryId: string | undefined;
    if (settings.auto_post_on_verify) {
      const paymentType = selectedSchedule?.milestone_name?.toLowerCase().includes('advance') ? 'advance' : 'balance';
      
      const glResult = await postVehiclePaymentToGL({
        module: 'yutong',
        orderNo,
        customerName,
        amount: payment.payment_amount,
        paymentType,
        paymentMethod: payment.payment_method,
        settings,
        effectiveCompanyId: NCG_HOLDING_ID,
      });

      if (glResult) {
        journalEntryId = glResult.journalEntryId;
        toast.success(`GL Entry posted: ${glResult.entryNumber}`);
      }
    }

    // 4. Create AR Receipt
    let receiptId: string | undefined;
    if (customerId) {
      const receiptResult = await createVehicleARReceipt({
        module: 'yutong',
        paymentId,
        invoiceId,
        customerId,
        amount: payment.payment_amount,
        paymentMethod: payment.payment_method,
        paymentDate: payment.payment_date,
        settings,
        effectiveCompanyId: NCG_HOLDING_ID,
      });

      if (receiptResult) {
        receiptId = receiptResult.receiptId;
      }
    }

    // 5. Update payment status with GL links
    const { error } = await supabase
      .from('yutong_customer_payments')
      .update({
        status: 'verified',
        verified_at: new Date().toISOString(),
        verified_by: user.id,
        journal_entry_id: journalEntryId,
        ar_receipt_id: receiptId,
      })
      .eq('id', paymentId);

    if (error) throw error;

    // Update order totals
    await updateOrderFinancials();

    // Regenerate invoices with updated payment data
    await regenerateOrderInvoices();

    toast.success('Payment verified and GL posted successfully');
    loadPaymentData();
    onRefresh();
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    toast.error('Failed to verify payment');
  }
};
```

---

### Part 4: Update useSinotrukOrderManagement.ts

Ensure proper integration with the sinotruck_orders table.

**Location:** `src/hooks/useSinotrukOrderManagement.ts`

**Changes:**
1. Add verifyPayment function for GL integration
2. Update recordCustomerPayment to set status as 'pending'
3. Add updateOrderFinancials function

**Add verifyPayment function:**
```typescript
// Verify payment and trigger GL posting
const verifyPayment = async (paymentId: string) => {
  try {
    setIsLoading(true);

    const { error } = await (supabase as any)
      .from('sinotruck_customer_payments')
      .update({
        status: 'verified',
        verified_at: new Date().toISOString(),
        verified_by: user?.id
      })
      .eq('id', paymentId);

    if (error) throw error;

    toast.success('Payment verified. GL posting triggered via payment tracking.');
    return { success: true };
  } catch (error) {
    console.error('Error verifying payment:', error);
    toast.error('Failed to verify payment');
    return { success: false, error };
  } finally {
    setIsLoading(false);
  }
};
```

**Update recordCustomerPayment status to 'pending':**
```typescript
// Change line 258: status: 'received' -> status: 'pending'
status: 'pending'
```

---

## Complete Integration Comparison

| Module | Settings Page | Payment Tracking | GL Integration | AR Integration |
|--------|---------------|------------------|----------------|----------------|
| **School Bus** | SchoolBusFinanceSettings | Auto via triggers | Auto on payment | Auto with FIFO |
| **Special Hire** | SpecialHireFinanceSettings | ConfirmedTripsTable | useFinanceApproval | createSPHARInvoice |
| **Yutong** | YutongFinanceSettings | YutongPaymentTracking | postVehiclePaymentToGL | createVehicleARInvoice |
| **Sinotruck** | SinotruckFinanceSettings | SinotruckPaymentTracking | postVehiclePaymentToGL | createVehicleARInvoice |
| **Light Vehicle** | LightVehicleFinanceSettings | LightVehiclePaymentTracking | postVehiclePaymentToGL | createVehicleARInvoice |

---

## Finance Module Visibility After Implementation

```text
Finance > Journal Entries:
├── Filter by YUT → All Yutong sales GL entries
├── Filter by SNT → All Sinotruck sales GL entries
├── Filter by LTV → All Light Vehicle sales GL entries
├── Filter by SPH → All Special Hire GL entries
└── Filter by SBO → All School Bus GL entries

Finance > Accounts Receivable > Invoices:
├── YUT-INV-2601-xxx → Yutong invoices
├── SNT-INV-2601-xxx → Sinotruck invoices
├── LTV-INV-2601-xxx → Light Vehicle invoices
├── SPH-INV-2601-xxx → Special Hire invoices
└── SBO-INV-xxx → School Bus invoices

Finance > Customers:
├── YUT-xxx customers (Yutong buyers)
├── SNT-xxx customers (Sinotruck buyers)
├── LTV-xxx customers (Light Vehicle buyers)
├── SPH-xxx customers (Special Hire clients)
└── SBO-xxx customers (School Bus students)
```

---

## Files Summary

### Files to Modify (4 files)

| File | Changes |
|------|---------|
| `src/pages/Settings.tsx` | Add 3 imports + 3 TabsTriggers + 3 TabsContents |
| `src/components/sinotruck/EnhancedSinotrukOrderDetailsModal.tsx` | Import and embed SinotruckPaymentTracking |
| `src/components/yutong/YutongPaymentTracking.tsx` | Add vehicle finance imports, enhance verify function |
| `src/hooks/useSinotrukOrderManagement.ts` | Update payment status to 'pending', add verifyPayment |

### Already Completed (7 files)

| File | Status |
|------|--------|
| Database migration (finance settings tables) | DONE |
| `src/hooks/useVehicleSalesFinance.ts` | DONE |
| `src/components/settings/YutongFinanceSettings.tsx` | DONE |
| `src/components/settings/SinotruckFinanceSettings.tsx` | DONE |
| `src/components/settings/LightVehicleFinanceSettings.tsx` | DONE |
| `src/components/sinotruck/SinotruckPaymentTracking.tsx` | DONE |
| `src/components/lightvehicle/LightVehiclePaymentTracking.tsx` | DONE |

---

## Testing Checklist

After implementation, verify:

1. **Settings Page**
   - Go to Settings → Yutong Finance tab appears
   - Go to Settings → Sinotruck Finance tab appears
   - Go to Settings → Light Vehicle Finance tab appears
   - Configure GL accounts for each module

2. **Yutong Payment Flow**
   - Open Yutong order → Record payment
   - Click Verify → Check GL Entry created with YUT tag
   - Check AR Invoice created in Finance module
   - Check Customer created with YUT code

3. **Sinotruck Payment Flow**
   - Open Sinotruck order → Financial tab shows payment tracking
   - Record and verify payment
   - Confirm GL Entry with SNT tag

4. **Light Vehicle Payment Flow**
   - Open Light Vehicle order
   - Record and verify payment
   - Confirm GL Entry with LTV tag

5. **Finance Module Filtering**
   - Journal Entries → Filter by YUT/SNT/LTV works
   - AR Invoices → Filter by business unit works
   - Customers → Filter by business unit works

