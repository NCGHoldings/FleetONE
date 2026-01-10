-- Update existing yutong_quotations with seating_capacity from bus models
UPDATE yutong_quotations q
SET seating_capacity = m.capacity
FROM yutong_bus_models m
WHERE q.bus_model_id = m.id
AND (q.seating_capacity IS NULL OR q.seating_capacity = '');