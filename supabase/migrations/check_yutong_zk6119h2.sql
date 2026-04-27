-- Cross-check Yutong ZK6119H2 (LKR 21,691,000) across all sales tables

-- 1. Check in items/bus_models catalog
SELECT 'ITEMS' as source, id, item_code, item_name, selling_price, standard_cost
FROM items WHERE item_name ILIKE '%ZK6119%' OR item_code ILIKE '%ZK6119%';

-- 2. Check in bus_models
SELECT 'BUS_MODELS' as source, id, model_name, model_number, selling_price, capacity
FROM bus_models WHERE model_name ILIKE '%ZK6119%' OR model_number ILIKE '%ZK6119%';

-- 3. Check Yutong sales orders for this model
SELECT 'SALES_ORDERS' as source, so.id, so.order_number, so.order_date, so.total_amount, so.status,
  sol.description, sol.quantity, sol.unit_price, sol.line_total
FROM sales_orders so
JOIN sales_order_lines sol ON sol.sales_order_id = so.id
WHERE sol.description ILIKE '%ZK6119%' OR sol.description ILIKE '%6119%'
ORDER BY so.order_date DESC;

-- 4. Check Yutong quotations
SELECT 'QUOTATIONS' as source, q.id, q.quotation_number, q.quotation_date, q.total_amount, q.status,
  ql.description, ql.quantity, ql.unit_price, ql.line_total
FROM quotations q
JOIN quotation_lines ql ON ql.quotation_id = q.id
WHERE ql.description ILIKE '%ZK6119%' OR ql.description ILIKE '%6119%'
ORDER BY q.quotation_date DESC;

-- 5. Check AR Invoices for this amount or model
SELECT 'AR_INVOICES' as source, id, invoice_number, invoice_date, total_amount, status, notes
FROM ar_invoices 
WHERE total_amount = 21691000 OR total_amount = 21692000
  OR notes ILIKE '%ZK6119%'
ORDER BY invoice_date DESC;

-- 6. Check journal entries for this amount
SELECT 'JOURNAL_ENTRIES' as source, entry_number, entry_date, description, total_debit, status, business_unit_code
FROM journal_entries
WHERE (total_debit = 21691000 OR total_debit = 21692000)
  OR description ILIKE '%ZK6119%'
ORDER BY entry_date DESC;

-- 7. Check purchase orders
SELECT 'PURCHASE_ORDERS' as source, po.id, po.po_number, po.po_date, po.total_amount, po.status
FROM purchase_orders po
JOIN purchase_order_lines pol ON pol.purchase_order_id = po.id
WHERE pol.description ILIKE '%ZK6119%' OR pol.description ILIKE '%6119%'
ORDER BY po.po_date DESC;
