-- ============================================================
-- FIX: Correct total_paid for 9 Legacy Yutong Orders
-- Only updates the 9 orders inserted by the previous migration.
-- Uses actual ADVANCE + 2ND ADVANCE amounts from the master list.
-- Does NOT touch any other orders or invoices.
-- ============================================================

-- NCG EXPRESS orders (Order 451482 - ZK6128H LUXURY x3) - No advances recorded
-- These are internal NCG company buses, no customer advance tracking
UPDATE public.yutong_orders
SET total_paid = 0, balance_due = total_amount
WHERE engine_number = '7525K018521' AND chassis_number = 'LZYTATF67S1042027';

UPDATE public.yutong_orders
SET total_paid = 0, balance_due = total_amount
WHERE engine_number = '7525K018530' AND chassis_number = 'LZYTATF69S1042028';

UPDATE public.yutong_orders
SET total_paid = 0, balance_due = total_amount
WHERE engine_number = '7525K018531' AND chassis_number = 'LZYTATF60S1042029';

-- NCG EXPRESS orders (Order 451432 - ZK6907H x4) - No advances recorded
UPDATE public.yutong_orders
SET total_paid = 0, balance_due = total_amount
WHERE engine_number = 'A5CYAS30150' AND chassis_number = 'LZYTDTD64S1042111';

UPDATE public.yutong_orders
SET total_paid = 0, balance_due = total_amount
WHERE engine_number = 'A5CYAS30138' AND chassis_number = 'LZYTDTD66S1042112';

UPDATE public.yutong_orders
SET total_paid = 0, balance_due = total_amount
WHERE engine_number = 'A5CYAS30144' AND chassis_number = 'LZYTDTD68S1042113';

UPDATE public.yutong_orders
SET total_paid = 0, balance_due = total_amount
WHERE engine_number = 'A5CYAS30140' AND chassis_number = 'LZYTDTD6XS1042114';

-- MR. OSANDA (Order 454104) - ADVANCE: 3,750,000 + 2ND: 33,750,000 = 37,500,000 (FULLY PAID)
UPDATE public.yutong_orders
SET total_paid = 37500000, balance_due = 0
WHERE engine_number = 'A5CYAS30186' AND chassis_number = 'LZYTDTD68T1003362';

-- KOKU HENNADIGE ROSHAN MADURANGA (Order 454134) - ADVANCE: 1,000,000 + 2ND: 7,625,000 = 8,625,000
UPDATE public.yutong_orders
SET total_paid = 8625000, balance_due = 37500000 - 8625000
WHERE engine_number = 'A5CYAS30190' AND chassis_number = 'LZYTDTD69T1003368';
