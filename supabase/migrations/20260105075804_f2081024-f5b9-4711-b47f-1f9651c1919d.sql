-- Delete old 'feedback' permissions (users already have 'feedback_module' if needed)
DELETE FROM user_page_permissions 
WHERE page_identifier = 'feedback';