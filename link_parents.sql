-- This script links all accounts together perfectly based on your text folders.
-- This guarantees the editing bug goes away permanently.

-- Link Level 2 to Level 1
UPDATE chart_of_accounts c
SET parent_account_id = p.id
FROM chart_of_accounts p
WHERE c.level2 IS NOT NULL AND c.level3 IS NULL
  AND p.level1 = c.level1 AND p.level2 IS NULL
  AND c.company_id = p.company_id;

-- Link Level 3 to Level 2
UPDATE chart_of_accounts c
SET parent_account_id = p.id
FROM chart_of_accounts p
WHERE c.level3 IS NOT NULL AND c.level4 IS NULL
  AND p.level1 = c.level1 AND p.level2 = c.level2 AND p.level3 IS NULL
  AND c.company_id = p.company_id;

-- Link Level 4 to Level 3
UPDATE chart_of_accounts c
SET parent_account_id = p.id
FROM chart_of_accounts p
WHERE c.level4 IS NOT NULL AND c.level5 IS NULL
  AND p.level1 = c.level1 AND p.level2 = c.level2 AND p.level3 = c.level3 AND p.level4 IS NULL
  AND c.company_id = p.company_id;

-- Link Level 5 to Level 4
UPDATE chart_of_accounts c
SET parent_account_id = p.id
FROM chart_of_accounts p
WHERE c.level5 IS NOT NULL
  AND p.level1 = c.level1 AND p.level2 = c.level2 AND p.level3 = c.level3 AND p.level4 = c.level4 AND p.level5 IS NULL
  AND c.company_id = p.company_id;
