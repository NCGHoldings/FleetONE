-- Add vehicle sales invoice template types (using JSONB format)
INSERT INTO document_template_types (type_code, type_name, module, description, available_placeholders, display_order)
VALUES 
  ('yutong_order_invoice', 'Yutong Order Invoice', 'yutong_sales', 'Invoice for Yutong bus orders', 
   '["{{invoice_no}}", "{{quotation_no}}", "{{invoice_date}}", "{{customer_name}}", "{{company_name}}", "{{address}}", "{{contact}}", "{{attn}}", "{{make}}", "{{bus_model}}", "{{seating_capacity}}", "{{year_of_manufacture}}", "{{country_of_origin}}", "{{vehicle_condition}}", "{{fuel_type}}", "{{engine_capacity}}", "{{color_scheme}}", "{{engine_number}}", "{{chassis_number}}", "{{unit_price}}", "{{quantity}}", "{{subtotal}}", "{{total}}", "{{amount_in_words}}", "{{signatures}}", "{{bank_details}}"]'::jsonb, 50),
  ('sinotruck_order_invoice', 'Sinotruck Order Invoice', 'sinotruck_sales', 'Invoice for Sinotruck truck orders',
   '["{{invoice_no}}", "{{quotation_no}}", "{{invoice_date}}", "{{customer_name}}", "{{company_name}}", "{{address}}", "{{contact}}", "{{vehicle_model}}", "{{unit_price}}", "{{quantity}}", "{{subtotal}}", "{{total}}", "{{amount_in_words}}", "{{signatures}}", "{{bank_details}}"]'::jsonb, 51),
  ('light_vehicle_invoice', 'Light Vehicle Invoice', 'light_vehicle_sales', 'Invoice for light vehicle orders',
   '["{{invoice_no}}", "{{quotation_no}}", "{{invoice_date}}", "{{customer_name}}", "{{company_name}}", "{{address}}", "{{contact}}", "{{vehicle_model}}", "{{unit_price}}", "{{quantity}}", "{{subtotal}}", "{{total}}", "{{amount_in_words}}", "{{signatures}}", "{{bank_details}}"]'::jsonb, 52),
  ('yutong_cash_receipt', 'Yutong Cash Receipt', 'yutong_sales', 'Cash receipt for Yutong bus payments',
   '["{{receipt_no}}", "{{receipt_date}}", "{{customer_name}}", "{{amount}}", "{{amount_in_words}}", "{{payment_method}}", "{{reference}}", "{{received_by}}", "{{signatures}}"]'::jsonb, 53),
  ('sinotruck_cash_receipt', 'Sinotruck Cash Receipt', 'sinotruck_sales', 'Cash receipt for Sinotruck truck payments',
   '["{{receipt_no}}", "{{receipt_date}}", "{{customer_name}}", "{{amount}}", "{{amount_in_words}}", "{{payment_method}}", "{{reference}}", "{{received_by}}", "{{signatures}}"]'::jsonb, 54),
  ('light_vehicle_cash_receipt', 'Light Vehicle Cash Receipt', 'light_vehicle_sales', 'Cash receipt for light vehicle payments',
   '["{{receipt_no}}", "{{receipt_date}}", "{{customer_name}}", "{{amount}}", "{{amount_in_words}}", "{{payment_method}}", "{{reference}}", "{{received_by}}", "{{signatures}}"]'::jsonb, 55)
ON CONFLICT (type_code) DO UPDATE SET
  type_name = EXCLUDED.type_name,
  module = EXCLUDED.module,
  description = EXCLUDED.description,
  available_placeholders = EXCLUDED.available_placeholders,
  display_order = EXCLUDED.display_order;