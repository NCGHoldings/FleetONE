-- ============================================================
-- BACKFILL: 9 Legacy Yutong Orders (No Quotation Exists)
-- Date: 2026-05-15
-- Purpose: Insert historical vehicle sales that were never
--          entered through the quotation workflow.
-- ============================================================

DO $$
DECLARE
  v_placeholder_quotation_id UUID;
  v_placeholder_quotation_id_2 UUID;
  v_placeholder_quotation_id_3 UUID;
BEGIN

  -- ========================================================
  -- STEP 1: Create placeholder quotations for the 3 groups
  -- ========================================================

  -- Group 1: NCG EXPRESS - ZK6128H LUXURY (3 units, LKR 41,300,000 each)
  INSERT INTO public.yutong_quotations (
    customer_name, customer_phone, customer_email, company_name,
    bus_model, quantity, unit_price, total_price,
    valid_days, valid_until, status
  ) VALUES (
    'NCG EXPRESS', '0000000000', 'ncg@ncgexpress.lk', 'NCG EXPRESS PRIVATE LIMITED',
    'Yutong C12 - YUCHAI ZK6128H LUXURY', 3, 41300000, 123900000,
    365, CURRENT_DATE + INTERVAL '365 days', 'converted_to_order'
  )
  RETURNING id INTO v_placeholder_quotation_id;

  -- Group 2: NCG EXPRESS - ZK6907H (4 units, LKR 29,400,000 each)
  INSERT INTO public.yutong_quotations (
    customer_name, customer_phone, customer_email, company_name,
    bus_model, quantity, unit_price, total_price,
    valid_days, valid_until, status
  ) VALUES (
    'NCG EXPRESS', '0000000000', 'ncg@ncgexpress.lk', 'NCG EXPRESS PRIVATE LIMITED',
    'Yutong C9 ZK6907H', 4, 29400000, 117600000,
    365, CURRENT_DATE + INTERVAL '365 days', 'converted_to_order'
  )
  RETURNING id INTO v_placeholder_quotation_id_2;

  -- Group 3: Individual customers - ZK6907H variants (2 units)
  INSERT INTO public.yutong_quotations (
    customer_name, customer_phone, customer_email, company_name,
    bus_model, quantity, unit_price, total_price,
    valid_days, valid_until, status
  ) VALUES (
    'BULK IMPORT - Individual Customers', '0000000000', 'import@ncg.lk', 'NCG Holdings',
    'Yutong C9 ZK6907H', 2, 37500000, 75000000,
    365, CURRENT_DATE + INTERVAL '365 days', 'converted_to_order'
  )
  RETURNING id INTO v_placeholder_quotation_id_3;

  -- ========================================================
  -- STEP 2: Insert the 9 orders
  -- ========================================================

  -- ---- Order 1: ZK6128H LUXURY - 25B451X-0610 ----
  INSERT INTO public.yutong_orders (
    quotation_id, bus_model, quantity, unit_price, total_amount,
    engine_number, chassis_number, engine_type, engine_capacity,
    color_scheme, seating_capacity, country_of_origin, vehicle_condition,
    payment_mode, current_phase, status, progress_percentage,
    total_paid, balance_due, notes,
    order_date
  ) VALUES (
    v_placeholder_quotation_id,
    'Yutong C12 - YUCHAI ZK6128H LUXURY', 1, 41300000, 41300000,
    '7525K018521', 'LZYTATF67S1042027', 'YUCHAI', 9500,
    'Blue/Grey', 53, 'CHINA', 'BRAND NEW',
    'cash', 'delivery', 'delivered', 100,
    41300000, 0, 'Legacy import - Item No: 25B451X-0610 | VIN: LZYTATF67S1042027 | Payment Completed | Seating: 51+1+1',
    CURRENT_DATE
  );

  -- ---- Order 2: ZK6128H LUXURY - 25B451X-0611 ----
  INSERT INTO public.yutong_orders (
    quotation_id, bus_model, quantity, unit_price, total_amount,
    engine_number, chassis_number, engine_type, engine_capacity,
    color_scheme, seating_capacity, country_of_origin, vehicle_condition,
    payment_mode, current_phase, status, progress_percentage,
    total_paid, balance_due, notes,
    order_date
  ) VALUES (
    v_placeholder_quotation_id,
    'Yutong C12 - YUCHAI ZK6128H LUXURY', 1, 41300000, 41300000,
    '7525K018530', 'LZYTATF69S1042028', 'YUCHAI', 9500,
    'Blue/Grey', 53, 'CHINA', 'BRAND NEW',
    'cash', 'delivery', 'delivered', 100,
    41300000, 0, 'Legacy import - Item No: 25B451X-0611 | VIN: LZYTATF69S1042028 | Payment Completed | Seating: 51+1+1',
    CURRENT_DATE
  );

  -- ---- Order 3: ZK6128H LUXURY - 25B451X-0612 ----
  INSERT INTO public.yutong_orders (
    quotation_id, bus_model, quantity, unit_price, total_amount,
    engine_number, chassis_number, engine_type, engine_capacity,
    color_scheme, seating_capacity, country_of_origin, vehicle_condition,
    payment_mode, current_phase, status, progress_percentage,
    total_paid, balance_due, notes,
    order_date
  ) VALUES (
    v_placeholder_quotation_id,
    'Yutong C12 - YUCHAI ZK6128H LUXURY', 1, 41300000, 41300000,
    '7525K018531', 'LZYTATF60S1042029', 'YUCHAI', 9500,
    'Blue/Grey', 53, 'CHINA', 'BRAND NEW',
    'cash', 'delivery', 'delivered', 100,
    41300000, 0, 'Legacy import - Item No: 25B451X-0612 | VIN: LZYTATF60S1042029 | Payment Completed | Seating: 51+1+1',
    CURRENT_DATE
  );

  -- ---- Order 4: ZK6907H - 25E371X-0008 ----
  INSERT INTO public.yutong_orders (
    quotation_id, bus_model, quantity, unit_price, total_amount,
    engine_number, chassis_number, engine_type, engine_capacity,
    color_scheme, seating_capacity, country_of_origin, vehicle_condition,
    payment_mode, current_phase, status, progress_percentage,
    total_paid, balance_due, notes,
    order_date
  ) VALUES (
    v_placeholder_quotation_id_2,
    'Yutong C9 ZK6907H', 1, 29400000, 29400000,
    'A5CYAS30150', 'LZYTDTD64S1042111', 'YUCHAI', 7500,
    'Blue/Grey', 39, 'CHINA', 'BRAND NEW',
    'cash', 'delivery', 'delivered', 100,
    29400000, 0, 'Legacy import - Item No: 25E371X-0008 | VIN: LZYTDTD64S1042111 | Payment Completed | Seating: 37+1+1',
    CURRENT_DATE
  );

  -- ---- Order 5: ZK6907H - 25E371X-0009 ----
  INSERT INTO public.yutong_orders (
    quotation_id, bus_model, quantity, unit_price, total_amount,
    engine_number, chassis_number, engine_type, engine_capacity,
    color_scheme, seating_capacity, country_of_origin, vehicle_condition,
    payment_mode, current_phase, status, progress_percentage,
    total_paid, balance_due, notes,
    order_date
  ) VALUES (
    v_placeholder_quotation_id_2,
    'Yutong C9 ZK6907H', 1, 29400000, 29400000,
    'A5CYAS30138', 'LZYTDTD66S1042112', 'YUCHAI', 7500,
    'Blue/Grey', 39, 'CHINA', 'BRAND NEW',
    'cash', 'delivery', 'delivered', 100,
    29400000, 0, 'Legacy import - Item No: 25E371X-0009 | VIN: LZYTDTD66S1042112 | Payment Completed | Seating: 37+1+1',
    CURRENT_DATE
  );

  -- ---- Order 6: ZK6907H - 25E371X-0010 ----
  INSERT INTO public.yutong_orders (
    quotation_id, bus_model, quantity, unit_price, total_amount,
    engine_number, chassis_number, engine_type, engine_capacity,
    color_scheme, seating_capacity, country_of_origin, vehicle_condition,
    payment_mode, current_phase, status, progress_percentage,
    total_paid, balance_due, notes,
    order_date
  ) VALUES (
    v_placeholder_quotation_id_2,
    'Yutong C9 ZK6907H', 1, 29400000, 29400000,
    'A5CYAS30144', 'LZYTDTD68S1042113', 'YUCHAI', 7500,
    'Blue/Grey', 39, 'CHINA', 'BRAND NEW',
    'cash', 'delivery', 'delivered', 100,
    29400000, 0, 'Legacy import - Item No: 25E371X-0010 | VIN: LZYTDTD68S1042113 | Payment Completed | Seating: 37+1+1',
    CURRENT_DATE
  );

  -- ---- Order 7: ZK6907H - 25E371X-0011 ----
  INSERT INTO public.yutong_orders (
    quotation_id, bus_model, quantity, unit_price, total_amount,
    engine_number, chassis_number, engine_type, engine_capacity,
    color_scheme, seating_capacity, country_of_origin, vehicle_condition,
    payment_mode, current_phase, status, progress_percentage,
    total_paid, balance_due, notes,
    order_date
  ) VALUES (
    v_placeholder_quotation_id_2,
    'Yutong C9 ZK6907H', 1, 29400000, 29400000,
    'A5CYAS30140', 'LZYTDTD6XS1042114', 'YUCHAI', 7500,
    'Blue/Grey', 39, 'CHINA', 'BRAND NEW',
    'cash', 'delivery', 'delivered', 100,
    29400000, 0, 'Legacy import - Item No: 25E371X-0011 | VIN: LZYTDTD6XS1042114 | Payment Completed | Seating: 37+1+1',
    CURRENT_DATE
  );

  -- ---- Order 8: ZK6907H (37+1+1) - 25E371X-0025 - MR. OSANDA ----
  INSERT INTO public.yutong_orders (
    quotation_id, bus_model, quantity, unit_price, total_amount,
    engine_number, chassis_number, engine_type, engine_capacity,
    color_scheme, seating_capacity, country_of_origin, vehicle_condition,
    payment_mode, current_phase, status, progress_percentage,
    total_paid, balance_due, notes,
    order_date
  ) VALUES (
    v_placeholder_quotation_id_3,
    'Yutong C9 ZK6907H', 1, 37500000, 37500000,
    'A5CYAS30186', 'LZYTDTD68T1003362', 'YUCHAI', 7500,
    'GREEN', 39, 'CHINA', 'BRAND NEW',
    'cash', 'delivery', 'delivered', 100,
    37500000, 0, 'Legacy import - Item No: 25E371X-0025 | VIN: LZYTDTD68T1003362 | Customer: MR. OSANDA | Payment Completed | Seating: 37+1+1',
    CURRENT_DATE
  );

  -- ---- Order 9: ZK6907H (35+1+1) - 25E371X-0031 - KOKU HENNADIGE ROSHAN MADURANGA ----
  INSERT INTO public.yutong_orders (
    quotation_id, bus_model, quantity, unit_price, total_amount,
    engine_number, chassis_number, engine_type, engine_capacity,
    color_scheme, seating_capacity, country_of_origin, vehicle_condition,
    payment_mode, current_phase, status, progress_percentage,
    total_paid, balance_due, notes,
    order_date
  ) VALUES (
    v_placeholder_quotation_id_3,
    'Yutong C9 ZK6907H', 1, 37500000, 37500000,
    'A5CYAS30190', 'LZYTDTD69T1003368', 'YUCHAI', 7500,
    'WHITE', 37, 'CHINA', 'BRAND NEW',
    'cash', 'delivery', 'delivered', 100,
    37500000, 0, 'Legacy import - Item No: 25E371X-0031 | VIN: LZYTDTD69T1003368 | Customer: KOKU HENNADIGE ROSHAN MADURANGA | Payment Completed | Seating: 35+1+1',
    CURRENT_DATE
  );

  RAISE NOTICE '✅ Successfully inserted 9 legacy Yutong orders with 3 placeholder quotations';

END $$;
