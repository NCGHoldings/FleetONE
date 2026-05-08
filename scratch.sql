SELECT pg_get_triggerdef(oid) FROM pg_trigger WHERE tgname = 'gl_guardian_tenant_isolation';
SELECT pg_get_triggerdef(oid) FROM pg_trigger WHERE tgrelid = 'journal_entry_lines'::regclass;
