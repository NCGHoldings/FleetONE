-- Step 1: Make customer_email nullable (if not already done)
ALTER TABLE yutong_quotations 
ALTER COLUMN customer_email DROP NOT NULL;

-- Step 5: Fix existing data - set latest version as active for each quotation family
UPDATE yutong_quotations 
SET is_active_version = true 
WHERE id IN (
  SELECT DISTINCT ON (COALESCE(parent_quotation_id, id))
    id
  FROM yutong_quotations
  ORDER BY COALESCE(parent_quotation_id, id), created_at DESC
);

-- Step 6a: Drop existing index if it exists and recreate it
DROP INDEX IF EXISTS idx_yutong_quotations_active_version;
CREATE UNIQUE INDEX idx_yutong_quotations_active_version 
ON yutong_quotations (COALESCE(parent_quotation_id, id)) 
WHERE is_active_version = true;

-- Step 6b: Drop existing function if it exists and recreate it
DROP FUNCTION IF EXISTS deactivate_old_yutong_quotation_versions CASCADE;

CREATE OR REPLACE FUNCTION deactivate_old_yutong_quotation_versions()
RETURNS TRIGGER AS $$
BEGIN
  -- If the new quotation is being set as active
  IF NEW.is_active_version = true THEN
    -- Deactivate all other versions in the same quotation family
    UPDATE yutong_quotations
    SET is_active_version = false
    WHERE id != NEW.id
    AND COALESCE(parent_quotation_id, id) = COALESCE(NEW.parent_quotation_id, NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Step 6c: Drop existing trigger if it exists and recreate it
DROP TRIGGER IF EXISTS trigger_deactivate_old_yutong_quotation_versions ON yutong_quotations;

CREATE TRIGGER trigger_deactivate_old_yutong_quotation_versions
BEFORE INSERT OR UPDATE OF is_active_version ON yutong_quotations
FOR EACH ROW
WHEN (NEW.is_active_version = true)
EXECUTE FUNCTION deactivate_old_yutong_quotation_versions();