-- ============================================================
-- BACKFILL: 9 Legacy Yutong Orders (No Quotation Exists)
-- Date: 2026-05-15
-- Purpose: Insert historical vehicle sales that were never
--          entered through the quotation workflow.
-- SAFE: Uses engine_number + chassis_number WHERE clause
--       so it will NOT duplicate if run again.
-- ============================================================

DO $$
DECLARE
  v_quotation_ncg_128h UUID;
  v_quotation_ncg_907h UUID;
  v_quotation_individual UUID;
  v_exists BOOLEAN;
BEGIN

  -- ========================================================
  -- SAFETY CHECK: Skip if orders already exist
  -- ========================================================
  SELECT EXISTS(
    SELECT 1 FROM public.yutong_orders WHERE engine_number = '7525K018521'
  ) INTO v_exists;

  IF v_exists THEN
    RAISE NOTICE '⚠️ Orders already exist. Skipping insert. Run the correction migration instead.';
    RETURN;
  END IF;

  -- ========================================================
  -- STEP 1: Create placeholder quotations for the 3 groups
  -- ========================================================

  -- Group 1: NCG EXPRESS - ZK6128H LUXURY (Ref Order 451482, 3 units)
  INSERT INTO public.yutong_quotations (
    customer_name, customer_phone, customer_email, company_name,
    bus_model, quantity, unit_price, total_price,
    valid_days, valid_until, status
  ) VALUES (
    'NCG EXPRESS', '0000000000', 'ncg@ncgexpress.lk', 'NCG EXPRESS PRIVATE LIMITED',
    'Yutong C12 - YUCHAI ZK6128H LUXURY', 3, 41300000, 123900000,
    365, CURRENT_DATE + INTERVAL '365 days', 'converted_to_order'
  )
  RETURNING id INTO v_quotation_ncg_128h;

  -- Group 2: NCG EXPRESS - ZK6907H (Ref Order 451432, 4 units)
  INSERT INTO public.yutong_quotations (
    customer_name, customer_phone, customer_email, company_name,
    bus_model, quantity, unit_price, total_price,
    valid_days, valid_until, status
  ) VALUES (
    'NCG EXPRESS', '0000000000', 'ncg@ncgexpress.lk', 'NCG EXPRESS PRIVATE LIMITED',
    'Yutong C9 ZK6907H', 4, 29400000, 117600000,
    365, CURRENT_DATE + INTERVAL '365 days', 'converted_to_order'
  )
  RETURNING id INTO v_quotation_ncg_907h;

  -- Group 3: Individual customers (MR. OSANDA + KOKU HENNADIGE)
  INSERT INTO public.yutong_quotations (
    customer_name, customer_phone, customer_email, company_name,
    bus_model, quantity, unit_price, total_price,
    valid_days, valid_until, status
  ) VALUES (
    'BULK IMPORT - Individual Customers', '0000000000', 'import@ncg.lk', 'NCG Holdings',
    'Yutong C9 ZK6907H', 2, 37500000, 75000000,
    365, CURRENT_DATE + INTERVAL '365 days', 'converted_to_order'
  )
  RETURNING id INTO v_quotation_individual;

  -- ========================================================
  -- STEP 2: Insert 9 orders with ACTUAL paid amounts
  -- ========================================================

  -- ---- 1. ZK6128H LUXURY - 25B451X-0610 (Ref 451482, NCG EXPRESS) ----
  INSERT INTO public.yutong_orders (
    quotation_id, bus_model, quantity, unit_price, total_amount,
    engine_number, chassis_number, engine_type, engine_capacity,
    color_scheme, seating_capacity, country_of_origin, vehicle_condition,
    payment_mode, current_phase, status, progress_percentage,
    total_paid, balance_due, notes, order_date
  ) VALUES (
    v_quotation_ncg_128h,
    'Yutong C12 - YUCHAI ZK6128H LUXURY', 1, 41300000, 41300000,
    '7525K018521', 'LZYTATF67S1042027', 'YUCHAI', 9500,
    'Blue/Grey', 53, 'CHINA', 'BRAND NEW',
    'cash', 'delivery', 'delivered', 100,
    0, 41300000,
    'Legacy import | Ref Order: 451482 | Item: 25B451X-0610 | Seating: 51+1+1 | No advance recorded',
    CURRENT_DATE
  );

  -- ---- 2. ZK6128H LUXURY - 25B451X-0611 (Ref 451482, NCG EXPRESS) ----
  INSERT INTO public.yutong_orders (
    quotation_id, bus_model, quantity, unit_price, total_amount,
    engine_number, chassis_number, engine_type, engine_capacity,
    color_scheme, seating_capacity, country_of_origin, vehicle_condition,
    payment_mode, current_phase, status, progress_percentage,
    total_paid, balance_due, notes, order_date
  ) VALUES (
    v_quotation_ncg_128h,
    'Yutong C12 - YUCHAI ZK6128H LUXURY', 1, 41300000, 41300000,
    '7525K018530', 'LZYTATF69S1042028', 'YUCHAI', 9500,
    'Blue/Grey', 53, 'CHINA', 'BRAND NEW',
    'cash', 'delivery', 'delivered', 100,
    0, 41300000,
    'Legacy import | Ref Order: 451482 | Item: 25B451X-0611 | Seating: 51+1+1 | No advance recorded',
    CURRENT_DATE
  );

  -- ---- 3. ZK6128H LUXURY - 25B451X-0612 (Ref 451482, NCG EXPRESS) ----
  INSERT INTO public.yutong_orders (
    quotation_id, bus_model, quantity, unit_price, total_amount,
    engine_number, chassis_number, engine_type, engine_capacity,
    color_scheme, seating_capacity, country_of_origin, vehicle_condition,
    payment_mode, current_phase, status, progress_percentage,
    total_paid, balance_due, notes, order_date
  ) VALUES (
    v_quotation_ncg_128h,
    'Yutong C12 - YUCHAI ZK6128H LUXURY', 1, 41300000, 41300000,
    '7525K018531', 'LZYTATF60S1042029', 'YUCHAI', 9500,
    'Blue/Grey', 53, 'CHINA', 'BRAND NEW',
    'cash', 'delivery', 'delivered', 100,
    0, 41300000,
    'Legacy import | Ref Order: 451482 | Item: 25B451X-0612 | Seating: 51+1+1 | No advance recorded',
    CURRENT_DATE
  );

  -- ---- 4. ZK6907H - 25E371X-0008 (Ref 451432, NCG EXPRESS) ----
  INSERT INTO public.yutong_orders (
    quotation_id, bus_model, quantity, unit_price, total_amount,
    engine_number, chassis_number, engine_type, engine_capacity,
    color_scheme, seating_capacity, country_of_origin, vehicle_condition,
    payment_mode, current_phase, status, progress_percentage,
    total_paid, balance_due, notes, order_date
  ) VALUES (
    v_quotation_ncg_907h,
    'Yutong C9 ZK6907H', 1, 29400000, 29400000,
    'A5CYAS30150', 'LZYTDTD64S1042111', 'YUCHAI', 7500,
    'Blue/Grey', 39, 'CHINA', 'BRAND NEW',
    'cash', 'delivery', 'delivered', 100,
    0, 29400000,
    'Legacy import | Ref Order: 451432 | Item: 25E371X-0008 | Seating: 37+1+1 | No advance recorded',
    CURRENT_DATE
  );

  -- ---- 5. ZK6907H - 25E371X-0009 (Ref 451432, NCG EXPRESS) ----
  INSERT INTO public.yutong_orders (
    quotation_id, bus_model, quantity, unit_price, total_amount,
    engine_number, chassis_number, engine_type, engine_capacity,
    color_scheme, seating_capacity, country_of_origin, vehicle_condition,
    payment_mode, current_phase, status, progress_percentage,
    total_paid, balance_due, notes, order_date
  ) VALUES (
    v_quotation_ncg_907h,
    'Yutong C9 ZK6907H', 1, 29400000, 29400000,
    'A5CYAS30138', 'LZYTDTD66S1042112', 'YUCHAI', 7500,
    'Blue/Grey', 39, 'CHINA', 'BRAND NEW',
    'cash', 'delivery', 'delivered', 100,
    0, 29400000,
    'Legacy import | Ref Order: 451432 | Item: 25E371X-0009 | Seating: 37+1+1 | No advance recorded',
    CURRENT_DATE
  );

  -- ---- 6. ZK6907H - 25E371X-0010 (Ref 451432, NCG EXPRESS) ----
  INSERT INTO public.yutong_orders (
    quotation_id, bus_model, quantity, unit_price, total_amount,
    engine_number, chassis_number, engine_type, engine_capacity,
    color_scheme, seating_capacity, country_of_origin, vehicle_condition,
    payment_mode, current_phase, status, progress_percentage,
    total_paid, balance_due, notes, order_date
  ) VALUES (
    v_quotation_ncg_907h,
    'Yutong C9 ZK6907H', 1, 29400000, 29400000,
    'A5CYAS30144', 'LZYTDTD68S1042113', 'YUCHAI', 7500,
    'Blue/Grey', 39, 'CHINA', 'BRAND NEW',
    'cash', 'delivery', 'delivered', 100,
    0, 29400000,
    'Legacy import | Ref Order: 451432 | Item: 25E371X-0010 | Seating: 37+1+1 | No advance recorded',
    CURRENT_DATE
  );

  -- ---- 7. ZK6907H - 25E371X-0011 (Ref 451432, NCG EXPRESS) ----
  INSERT INTO public.yutong_orders (
    quotation_id, bus_model, quantity, unit_price, total_amount,
    engine_number, chassis_number, engine_type, engine_capacity,
    color_scheme, seating_capacity, country_of_origin, vehicle_condition,
    payment_mode, current_phase, status, progress_percentage,
    total_paid, balance_due, notes, order_date
  ) VALUES (
    v_quotation_ncg_907h,
    'Yutong C9 ZK6907H', 1, 29400000, 29400000,
    'A5CYAS30140', 'LZYTDTD6XS1042114', 'YUCHAI', 7500,
    'Blue/Grey', 39, 'CHINA', 'BRAND NEW',
    'cash', 'delivery', 'delivered', 100,
    0, 29400000,
    'Legacy import | Ref Order: 451432 | Item: 25E371X-0011 | Seating: 37+1+1 | No advance recorded',
    CURRENT_DATE
  );

  -- ---- 8. ZK6907H - 25E371X-0025 (Ref 454104, MR. OSANDA) ----
  -- ADVANCE: 3,750,000 + 2ND: 33,750,000 = 37,500,000 (FULLY PAID ✅)
  INSERT INTO public.yutong_orders (
    quotation_id, bus_model, quantity, unit_price, total_amount,
    engine_number, chassis_number, engine_type, engine_capacity,
    color_scheme, seating_capacity, country_of_origin, vehicle_condition,
    payment_mode, current_phase, status, progress_percentage,
    total_paid, balance_due, notes, order_date
  ) VALUES (
    v_quotation_individual,
    'Yutong C9 ZK6907H', 1, 37500000, 37500000,
    'A5CYAS30186', 'LZYTDTD68T1003362', 'YUCHAI', 7500,
    'GREEN', 39, 'CHINA', 'BRAND NEW',
    'cash', 'delivery', 'delivered', 100,
    37500000, 0,
    'Legacy import | Ref Order: 454104 | Item: 25E371X-0025 | Customer: MR. OSANDA | Seating: 37+1+1 | ADV: 3,750,000 + 2ND: 33,750,000 = 37,500,000 FULLY PAID',
    CURRENT_DATE
  );

  -- ---- 9. ZK6907H - 25E371X-0031 (Ref 454134, KOKU HENNADIGE) ----
  -- ADVANCE: 1,000,000 + 2ND: 7,625,000 = 8,625,000 (PARTIAL)
  INSERT INTO public.yutong_orders (
    quotation_id, bus_model, quantity, unit_price, total_amount,
    engine_number, chassis_number, engine_type, engine_capacity,
    color_scheme, seating_capacity, country_of_origin, vehicle_condition,
    payment_mode, current_phase, status, progress_percentage,
    total_paid, balance_due, notes, order_date
  ) VALUES (
    v_quotation_individual,
    'Yutong C9 ZK6907H', 1, 37500000, 37500000,
    'A5CYAS30190', 'LZYTDTD69T1003368', 'YUCHAI', 7500,
    'WHITE', 37, 'CHINA', 'BRAND NEW',
    'cash', 'delivery', 'delivered', 100,
    8625000, 28875000,
    'Legacy import | Ref Order: 454134 | Item: 25E371X-0031 | Customer: KOKU HENNADIGE ROSHAN MADURANGA | Seating: 35+1+1 | ADV: 1,000,000 + 2ND: 7,625,000 = 8,625,000',
    CURRENT_DATE
  );

  RAISE NOTICE '✅ Successfully inserted 9 legacy Yutong orders with correct paid amounts';

END $$;
