-- Fix security warning: add search_path to function
CREATE OR REPLACE FUNCTION public.update_shipment_group_phase()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shipment_id UUID;
  v_min_phase TEXT;
BEGIN
  v_shipment_id := COALESCE(NEW.shipment_group_id, OLD.shipment_group_id);
  
  SELECT o.current_phase INTO v_min_phase
  FROM public.yutong_shipment_group_orders so
  JOIN public.yutong_orders o ON so.order_id = o.id
  WHERE so.shipment_group_id = v_shipment_id
  ORDER BY 
    CASE o.current_phase
      WHEN 'order_confirmation' THEN 1
      WHEN 'lc_issuance' THEN 2
      WHEN 'production_order' THEN 3
      WHEN 'manufacturing' THEN 4
      WHEN 'shipping_booking' THEN 5
      WHEN 'customs_clearance' THEN 6
      WHEN 'port_operations' THEN 7
      WHEN 'vehicle_processing' THEN 8
      WHEN 'rmv_registration' THEN 9
      WHEN 'final_inspection' THEN 10
      WHEN 'delivery' THEN 11
    END
  LIMIT 1;
  
  IF v_min_phase IS NOT NULL THEN
    UPDATE public.yutong_shipment_groups
    SET current_phase = v_min_phase
    WHERE id = v_shipment_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;