-- CRITICAL SECURITY FIX: Protect student PII from public exposure
-- Current issue: Anonymous users can SELECT all student records with full PII
-- This migration creates a safe admission verification function and removes public access

-- Step 1: Create secure admission verification function
-- This function uses SECURITY DEFINER to bypass RLS and only returns minimal data
CREATE OR REPLACE FUNCTION public.verify_admission_number(p_admission_no text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student record;
BEGIN
  -- Fetch only minimal data needed for receipt upload
  SELECT 
    id,
    student_name,
    admission_no,
    grade,
    branch_id,
    fixed_monthly_amount,
    payment_balance,
    current_amount_due,
    payment_status
  INTO v_student
  FROM school_students
  WHERE admission_no = p_admission_no 
    AND is_active = true;
    
  -- Return not found if student doesn't exist or is inactive
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'found', false,
      'message', 'Student not found or inactive'
    );
  END IF;
  
  -- Return minimal student data (no PII like phone numbers, addresses, parent names)
  RETURN jsonb_build_object(
    'found', true,
    'student', jsonb_build_object(
      'id', v_student.id,
      'student_name', v_student.student_name,
      'admission_no', v_student.admission_no,
      'grade', v_student.grade,
      'branch_id', v_student.branch_id,
      'fixed_monthly_amount', v_student.fixed_monthly_amount,
      'payment_balance', v_student.payment_balance,
      'current_amount_due', v_student.current_amount_due,
      'payment_status', v_student.payment_status
    )
  );
END;
$$;

-- Add function comment for documentation
COMMENT ON FUNCTION public.verify_admission_number(text) IS 
'Securely verifies admission number for public receipt uploads. Returns minimal student data without exposing PII (contact numbers, addresses, parent names, emergency contacts). Use this instead of direct SELECT queries from public forms.';

-- Step 2: Drop the dangerous anonymous SELECT policy
DROP POLICY IF EXISTS "Anonymous users can search students by admission number" ON public.school_students;

-- Step 3: Grant execute permission on the function to anonymous users
GRANT EXECUTE ON FUNCTION public.verify_admission_number(text) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_admission_number(text) TO authenticated;

-- Document the security fix
COMMENT ON TABLE public.school_students IS 
'Contains student PII including contact numbers, addresses, parent names. RLS policies restrict direct SELECT to authenticated users only. Public receipt uploads must use verify_admission_number() function which returns minimal non-PII data.';