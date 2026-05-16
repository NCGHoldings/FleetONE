SELECT id, order_no, ar_invoice_id FROM yutong_orders WHERE order_no = 'YTO-2026-0043';
SELECT id, invoice_no, order_id, status FROM yutong_invoice_records WHERE order_id = (SELECT id FROM yutong_orders WHERE order_no = 'YTO-2026-0043');
