const fs = require('fs');
const file = 'src/hooks/useDocumentTemplates.ts';
let content = fs.readFileSync(file, 'utf8');

// Replace the select and filter logic
content = content.replace(
  /.select\('\*, document_template_types\(type_name, type_code, module\)'\)/,
  ".select('*, document_template_types!inner(type_name, type_code, module)')"
);

// We should also handle if documentTypeCode is a UUID (from DocumentTemplateManager)
content = content.replace(
  /if \(documentTypeCode\) \{\n\s*query = query.eq\('document_template_types.type_code', documentTypeCode\);\n\s*\}/,
  `if (documentTypeCode) {
        if (documentTypeCode.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          query = query.eq('template_type_id', documentTypeCode);
        } else {
          query = query.eq('document_template_types.type_code', documentTypeCode);
        }
      }`
);

fs.writeFileSync(file, content);
console.log("Patched useDocumentTemplates.ts");
