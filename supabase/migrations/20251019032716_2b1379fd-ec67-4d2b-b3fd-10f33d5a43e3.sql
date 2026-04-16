-- Drop the old file type constraint
ALTER TABLE accident_documents 
DROP CONSTRAINT IF EXISTS accident_documents_file_type_check;

-- Add new constraint with all allowed file types
ALTER TABLE accident_documents 
ADD CONSTRAINT accident_documents_file_type_check 
CHECK (file_type = ANY (ARRAY[
  -- Images
  'PDF', 'JPG', 'JPEG', 'PNG', 'GIF', 'BMP', 'TIFF', 'WEBP', 'SVG',
  -- Documents  
  'DOC', 'DOCX', 'XLS', 'XLSX', 'PPT', 'PPTX', 'TXT', 'RTF', 'ODT',
  -- Archives
  'ZIP', 'RAR', '7Z',
  -- Other
  'CSV', 'JSON', 'XML'
]));