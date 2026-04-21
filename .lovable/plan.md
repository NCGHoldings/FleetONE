

# Fix: Direct Payment account selector is empty + add live balance & validation

## Root Cause (the bug you're seeing)

In `src/pages/SchoolBusExpenseImport.tsx` the dropdown is wired to a state called `directAccounts`, but there is **no code that ever fetches and fills it**. The `useEffect` on line 78 loads branches, buses, vendors, and petty cash — but skips the chart-of-accounts query for asset float/bank accounts. So the dropdown opens empty.

## What I'll change

### 1. Load the Pay-From accounts from the database

Add a Supabase query inside `initData` that fetches all **active asset** accounts whose name contains FLOAT, BANK, or CASH (incl. the SBS fuel float you need: code `13005002` = FUEL FLOAT - DIALOG TOUCH_SBS, current balance Rs 5,000,000). Order by account_code so SBS sits next to the other floats.

### 2. Default to FUEL FLOAT - DIALOG TOUCH_SBS

After the fetch, auto-select the SBS float (account code `13005002`) so the user doesn't need to pick it manually for the common case. They can change it if needed.

### 3. Show the live balance next to each option

Each `<SelectItem>` will render: account_code + account_name + current_balance in Rs. So the dropdown looks like:

```
13005001  FUEL FLOAT - DIALOG TOUCH         Rs 0.00
13005002  FUEL FLOAT - DIALOG TOUCH_SBS     Rs 5,000,000.00   ← default
13005003  FUEL FLOAT - DIALOG TOUCH_SHS     Rs 3,841,959.72
13001006  NTB BANK C/A - 100530011672       Rs 3,923,411.50
... (banks)
```

### 4. Add live validation panel below the dropdown

Once an account is selected AND the Excel preview has rows, show a small validation card:

```
Selected Account Balance:    Rs 5,000,000.00
Excel Import Total:          Rs   473,562.40   (sum of Fuel Cost column)
Balance After Posting:       Rs 4,526,437.60   ← green if ≥ 0
                                                  ← red + warning if < 0
```

If the Excel total exceeds the available balance, show a red alert "**Insufficient float balance — top up the float account before importing**" and **disable the Confirm & Post GL button**.

### 5. Lock the Confirm button when nothing is selected

Currently the Confirm button only checks branch + valid rows. Add: when payment mode is `direct`, require `directPaymentAccountId` to be set AND `excelTotal ≤ accountBalance`.

## Files touched

| File | Change |
|---|---|
| `src/pages/SchoolBusExpenseImport.tsx` | (a) Add COA fetch in `initData`. (b) Auto-default to `13005002`. (c) Render code + name + balance in each dropdown item. (d) Compute `excelTotal = sum(parsedData.amount)` and `remainingBalance = balance − excelTotal`; render the validation card. (e) Extend the Confirm button's `disabled` condition. |

No DB schema changes, no new edge functions, no changes to `useSchoolBusBulkExpenses.ts`.

## What you'll see after the fix

1. Open `/school-bus/import-expenses` → pick **Direct Payment** mode.
2. The "Pay From Account" dropdown now lists all asset float + bank + cash accounts with their **current balance shown next to each name**.
3. **FUEL FLOAT - DIALOG TOUCH_SBS (Rs 5,000,000)** is pre-selected by default.
4. After uploading the Excel file, a validation card appears showing: account balance, Excel import total, and balance after posting (green if OK, red + alert if insufficient).
5. The "Confirm & Post GL" button is disabled until everything checks out.

