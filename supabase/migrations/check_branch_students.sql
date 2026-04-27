-- Cross-check: Do the 11 bank statement students exist in this branch?
-- Branch ID from URL: dd387300-dc45-4c1e-ae24-933760c7ba9e

-- STEP 1: Check ALL students in this branch + see what columns exist
SELECT COUNT(*) AS total_students_in_branch
FROM school_students
WHERE branch_id = 'dd387300-dc45-4c1e-ae24-933760c7ba9e';


-- STEP 2: Show column names for school_students table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'school_students'
ORDER BY ordinal_position;


-- STEP 3: Search by the exact student names from the bank statement
SELECT 
  s.admission_no,
  s.student_name,
  s.parent_name,
  s.fixed_monthly_amount,
  s.branch_id,
  CASE 
    WHEN s.student_name ILIKE '%TARA RANASINGHE%' THEN 'NEX-000W12869'
    WHEN s.student_name ILIKE '%ROSHAN RANASINGHE%' THEN 'NEX-000W12870'
    WHEN s.student_name ILIKE '%CHATHUNI%THILAKERATNE%' THEN 'NEX-000W12457'
    WHEN s.student_name ILIKE '%SASMI%WALLAGODA%' THEN 'NEX-000W11860'
    WHEN s.student_name ILIKE '%DHIRSHA%JAYKUMAR%' THEN 'NEX-000W13235'
    WHEN s.student_name ILIKE '%THINUGA RAKNAATH%' THEN 'NEX-000W12986'
    WHEN s.student_name ILIKE '%FRANCIS LEVAN%' THEN 'NEX-000W13954'
    WHEN s.student_name ILIKE '%ONEKI%PERERA%' THEN 'NEX-000W13520'
    WHEN s.student_name ILIKE '%ABHILASH%WEERASOORIYA%' THEN 'NEX-000W15405'
    WHEN s.student_name ILIKE '%MILINDU%UDUMULLA%' THEN 'NEX-000W10232'
    WHEN s.student_name ILIKE '%THINUKA%UDUMULLA%' THEN 'NEX-000W12697'
    ELSE NULL
  END AS bank_nex_code
FROM school_students s
WHERE s.branch_id = 'dd387300-dc45-4c1e-ae24-933760c7ba9e'
  AND (
    s.student_name ILIKE '%TARA RANASINGHE%'
    OR s.student_name ILIKE '%ROSHAN RANASINGHE%'
    OR s.student_name ILIKE '%CHATHUNI%THILAKERATNE%'
    OR s.student_name ILIKE '%SASMI%WALLAGODA%'
    OR s.student_name ILIKE '%DHIRSHA%JAYKUMAR%'
    OR s.student_name ILIKE '%THINUGA RAKNAATH%'
    OR s.student_name ILIKE '%FRANCIS LEVAN%'
    OR s.student_name ILIKE '%ONEKI%PERERA%'
    OR s.student_name ILIKE '%ABHILASH%WEERASOORIYA%'
    OR s.student_name ILIKE '%MILINDU%UDUMULLA%'
    OR s.student_name ILIKE '%THINUKA%UDUMULLA%'
  )
ORDER BY s.student_name;


-- STEP 4: Search by admission number digits (12869, 12870, etc.)
SELECT 
  s.admission_no,
  s.student_name,
  s.branch_id
FROM school_students s
WHERE s.branch_id = 'dd387300-dc45-4c1e-ae24-933760c7ba9e'
  AND (
    s.admission_no ILIKE '%12869%'
    OR s.admission_no ILIKE '%12870%'
    OR s.admission_no ILIKE '%12457%'
    OR s.admission_no ILIKE '%11860%'
    OR s.admission_no ILIKE '%13235%'
    OR s.admission_no ILIKE '%12986%'
    OR s.admission_no ILIKE '%13954%'
    OR s.admission_no ILIKE '%13520%'
    OR s.admission_no ILIKE '%15405%'
    OR s.admission_no ILIKE '%10232%'
    OR s.admission_no ILIKE '%12697%'
  )
ORDER BY s.admission_no;


-- STEP 5: Show first 30 admission numbers (to see the format pattern)
SELECT admission_no, student_name
FROM school_students
WHERE branch_id = 'dd387300-dc45-4c1e-ae24-933760c7ba9e'
ORDER BY admission_no
LIMIT 30;
