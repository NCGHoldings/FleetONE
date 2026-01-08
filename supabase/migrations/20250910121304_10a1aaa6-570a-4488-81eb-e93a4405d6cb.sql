-- Create storage bucket for school receipts with proper RLS policies
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'school-receipts',
  'school-receipts',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for school-receipts bucket
CREATE POLICY "Authenticated users can view receipts in school-receipts bucket"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'school-receipts' AND 
  auth.role() = 'authenticated'
);

CREATE POLICY "Parents can upload receipts to school-receipts bucket"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'school-receipts' AND
  auth.uid()::text = (storage.foldername(name))[3] -- Third folder level should be user ID
);

CREATE POLICY "Staff can manage all receipts in school-receipts bucket"
ON storage.objects FOR ALL
USING (
  bucket_id = 'school-receipts' AND
  (has_role(auth.uid(), 'super_admin'::app_role) OR 
   has_role(auth.uid(), 'admin'::app_role) OR 
   has_role(auth.uid(), 'supervisor'::app_role))
);

-- Update existing school_receipts table to add missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_school_receipts_student_id ON school_receipts(student_id);
CREATE INDEX IF NOT EXISTS idx_school_receipts_branch_id ON school_receipts(branch_id);
CREATE INDEX IF NOT EXISTS idx_school_receipts_verification_status ON school_receipts(verification_status);
CREATE INDEX IF NOT EXISTS idx_school_receipts_created_at ON school_receipts(created_at);

-- Add indexes on school_students for better performance
CREATE INDEX IF NOT EXISTS idx_school_students_branch_payment_status ON school_students(branch_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_school_students_payment_status ON school_students(payment_status);
CREATE INDEX IF NOT EXISTS idx_school_students_is_active ON school_students(is_active);

-- Add indexes on school_branches for better performance
CREATE INDEX IF NOT EXISTS idx_school_branches_is_active ON school_branches(is_active);