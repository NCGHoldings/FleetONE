-- Add header_mode column to document_templates table
-- Modes: header_image (full banner), logo_only, html_only, logo_and_html (default)
ALTER TABLE document_templates 
ADD COLUMN IF NOT EXISTS header_mode VARCHAR(20) DEFAULT 'logo_and_html';

-- Add constraint for valid values
ALTER TABLE document_templates
ADD CONSTRAINT document_templates_header_mode_check 
CHECK (header_mode IN ('header_image', 'logo_only', 'html_only', 'logo_and_html'));

-- Add comment for documentation
COMMENT ON COLUMN document_templates.header_mode IS 'Header display mode: header_image (full banner), logo_only (centered logo), html_only (text only), logo_and_html (logo + company info)';