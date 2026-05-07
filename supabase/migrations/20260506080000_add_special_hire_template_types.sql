-- Migration: Add Special Hire Document Template Types
-- Description: Adds sph_invoice, sph_receipt, and sph_quotation to document_template_types

-- Add Special Hire document types
INSERT INTO document_template_types (type_code, type_name, module, description, available_placeholders, is_active, display_order)
VALUES 
('sph_invoice', 'Special Hire Invoice', 'ar', 'Professional invoice for Special Hire business unit', 
 ARRAY['{{invoice_number}}', '{{invoice_date}}', '{{due_date}}', '{{customer_name}}', '{{customer_code}}', '{{customer_address}}', '{{customer_phone}}', '{{reference}}', '{{total_amount}}', '{{paid_amount}}', '{{balance}}', '{{line_items}}', '{{notes}}', '{{prepared_by}}', '{{verified_by}}', '{{approved_by}}'], 
 true, 150),
('sph_receipt', 'Special Hire Receipt', 'ar', 'Professional receipt for Special Hire payments', 
 ARRAY['{{receipt_number}}', '{{receipt_date}}', '{{customer_name}}', '{{payment_method}}', '{{reference}}', '{{amount}}', '{{total_amount}}', '{{currency}}', '{{notes}}', '{{prepared_by}}'], 
 true, 160),
('sph_quotation', 'Special Hire Quotation', 'ar', 'Quotation for Special Hire inquiries', 
 ARRAY['{{quotation_number}}', '{{quotation_date}}', '{{customer_name}}', '{{customer_address}}', '{{customer_phone}}', '{{reference}}', '{{total_amount}}', '{{notes}}', '{{prepared_by}}'], 
 true, 170)
ON CONFLICT (type_code) DO UPDATE 
SET type_name = EXCLUDED.type_name,
    module = EXCLUDED.module,
    description = EXCLUDED.description,
    available_placeholders = EXCLUDED.available_placeholders;
