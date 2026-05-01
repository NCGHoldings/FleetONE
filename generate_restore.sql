SELECT 'UPDATE chart_of_accounts SET level1 = ' || COALESCE('''' || replace(level1, '''', '''''') || '''', 'NULL') ||
       ', level2 = ' || COALESCE('''' || replace(level2, '''', '''''') || '''', 'NULL') ||
       ', level3 = ' || COALESCE('''' || replace(level3, '''', '''''') || '''', 'NULL') ||
       ', level4 = ' || COALESCE('''' || replace(level4, '''', '''''') || '''', 'NULL') ||
       ', level5 = ' || COALESCE('''' || replace(level5, '''', '''''') || '''', 'NULL') ||
       ', account_level = ' || COALESCE(account_level::text, 'NULL') ||
       ' WHERE id = ''' || id || ''';'
FROM chart_of_accounts;
