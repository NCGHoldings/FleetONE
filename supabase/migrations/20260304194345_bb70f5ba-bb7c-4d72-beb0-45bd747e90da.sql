INSERT INTO document_template_types (type_code, type_name, module, description, display_order, is_active, available_placeholders)
VALUES (
  'tax_invoice',
  'Sri Lanka Tax Invoice',
  'general',
  'Standard Sri Lankan Tax Invoice format compliant with government regulations (EOG 02/04/05). Includes mandatory fields: Supplier/Purchaser TIN, Date of Delivery, Place of Supply, and 18% VAT calculations.',
  56,
  true,
  '["{{invoice_date}}", "{{tax_invoice_no}}", "{{supplier_tin}}", "{{supplier_name}}", "{{supplier_address}}", "{{supplier_phone}}", "{{purchaser_tin}}", "{{purchaser_name}}", "{{purchaser_address}}", "{{purchaser_phone}}", "{{date_of_delivery}}", "{{place_of_supply}}", "{{additional_information}}", "{{line_items}}", "{{total_value_of_supply}}", "{{vat_rate}}", "{{vat_amount}}", "{{total_including_vat}}", "{{total_in_words}}", "{{mode_of_payment}}"]'::jsonb
)
ON CONFLICT (type_code) DO UPDATE SET
  type_name = EXCLUDED.type_name,
  module = EXCLUDED.module,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active,
  available_placeholders = EXCLUDED.available_placeholders;