
-- Backfill missing bus_model_id, seating_capacity, customer_id using recursive parent chain
WITH RECURSIVE chain AS (
  SELECT id, parent_quotation_id, bus_model_id, seating_capacity, customer_id
  FROM yutong_quotations
  WHERE bus_model_id IS NOT NULL
  UNION ALL
  SELECT child.id, child.parent_quotation_id, chain.bus_model_id, chain.seating_capacity, COALESCE(child.customer_id, chain.customer_id)
  FROM yutong_quotations child
  JOIN chain ON child.parent_quotation_id = chain.id
  WHERE child.bus_model_id IS NULL
)
UPDATE yutong_quotations q
SET bus_model_id = chain.bus_model_id,
    seating_capacity = chain.seating_capacity,
    customer_id = COALESCE(q.customer_id, chain.customer_id)
FROM chain
WHERE q.id = chain.id AND q.bus_model_id IS NULL;
