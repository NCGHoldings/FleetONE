INSERT INTO document_template_types (type_code, type_name, module, description, display_order, is_active, available_placeholders)
VALUES (
  'tax_invoice',
  'Sri Lanka Tax Invoice',
  'general',
  'Sri Lankan government-mandated Tax Invoice format (EOG 02/04/05) for vehicle sales',
  56,
  true,
  '["{{invoice_date}}", "{{tax_invoice_no}}", "{{supplier_tin}}", "{{supplier_name}}", "{{supplier_address}}", "{{supplier_phone}}", "{{purchaser_tin}}", "{{purchaser_name}}", "{{purchaser_address}}", "{{purchaser_phone}}", "{{date_of_delivery}}", "{{place_of_supply}}", "{{additional_information}}", "{{line_items}}", "{{total_value_of_supply}}", "{{vat_rate}}", "{{vat_amount}}", "{{total_including_vat}}", "{{total_in_words}}", "{{mode_of_payment}}"]'::jsonb
)