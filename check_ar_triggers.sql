SELECT event_object_table AS table_name, trigger_name, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'school_ar_invoices';
