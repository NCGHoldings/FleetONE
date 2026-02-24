-- =====================================================
-- ADD BUSINESS UNIT TAGGING FOR CONSOLIDATED GL
-- Keep sub-company COAs but add consolidated GL tagging
-- =====================================================

-- Step 1: Add business_unit columns to journal_entries
ALTER TABLE journal_entries
ADD COLUMN IF NOT EXISTS business_unit_id UUID REFERENCES companies(id),
ADD COLUMN IF NOT EXISTS business_unit_code TEXT;

-- Step 2: Add business_unit_code to journal_entry_lines for detailed tracking
ALTER TABLE journal_entry_lines
ADD COLUMN IF NOT EXISTS business_unit_code TEXT;

-- Step 3: Create index for efficient filtering by business unit
CREATE INDEX IF NOT EXISTS idx_journal_entries_business_unit ON journal_entries(business_unit_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_business_unit_code ON journal_entries(business_unit_code);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_business_unit ON journal_entry_lines(business_unit_code);

-- Step 4: Backfill existing sub-company journal entries with business unit info
UPDATE journal_entries je
SET 
  business_unit_id = je.company_id,
  business_unit_code = c.short_code
FROM companies c
WHERE je.company_id = c.id
  AND c.parent_company_id IS NOT NULL
  AND je.business_unit_id IS NULL;

-- Step 5: Update journal_entry_lines with business unit code
UPDATE journal_entry_lines jel
SET business_unit_code = je.business_unit_code
FROM journal_entries je
WHERE jel.journal_entry_id = je.id
  AND je.business_unit_code IS NOT NULL
  AND jel.business_unit_code IS NULL;

-- Step 6: Migrate sub-company journal entries to NCG Holding (keeping business_unit tags)
-- This makes all sub-company entries appear in NCG Holding's consolidated GL
UPDATE journal_entries je
SET company_id = c.parent_company_id
FROM companies c
WHERE je.company_id = c.id
  AND c.parent_company_id IS NOT NULL
  AND je.business_unit_id IS NOT NULL;

-- Step 7: Add comment for documentation
COMMENT ON COLUMN journal_entries.business_unit_id IS 'References the originating sub-company for consolidated GL entries';
COMMENT ON COLUMN journal_entries.business_unit_code IS 'Short code (SBO, YUT, SPH, etc.) for quick filtering and display';
COMMENT ON COLUMN journal_entry_lines.business_unit_code IS 'Copied from parent journal entry for efficient line-level filtering';