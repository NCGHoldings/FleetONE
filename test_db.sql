SELECT 
    tx.id, 
    tx.student_id, 
    s.student_name, 
    s.is_active, 
    tx.amount_paid, 
    tx.reference_no
FROM school_payment_transactions tx
LEFT JOIN school_students s ON tx.student_id = s.id
WHERE tx.reference_no LIKE 'IMPORT-%'
ORDER BY tx.created_at DESC
LIMIT 20;
