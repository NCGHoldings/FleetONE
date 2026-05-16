-- Migration: Create Crew Dashboard Data RPC
-- Description: Aggregates real-time performance and financial data for crew members

DROP FUNCTION IF EXISTS public.get_crew_dashboard_data(UUID);

CREATE OR REPLACE FUNCTION public.get_crew_dashboard_data(p_staff_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_base_salary NUMERIC := 0;
    v_daily_rate NUMERIC := 0;
    v_monthly_commission NUMERIC := 0;
    v_current_revenue NUMERIC := 0;
    v_monthly_target NUMERIC := 150000; -- Default fallback if no data
    v_targets_hit INTEGER := 0;
    v_advances NUMERIC := 0;
    v_loan_balance NUMERIC := 0;
    v_recent_performance JSONB;
    v_recent_transactions JSONB;
    v_start_of_month DATE;
BEGIN
    v_start_of_month := date_trunc('month', current_date)::DATE;

    -- 1. Base Salary from staff_registry
    SELECT COALESCE(monthly_salary, 0), COALESCE(daily_rate, 0)
    INTO v_base_salary, v_daily_rate
    FROM public.staff_registry
    WHERE id = p_staff_id;

    -- 2. Aggregate monthly commissions & revenue
    SELECT 
        COALESCE(SUM(commission_amount), 0),
        COALESCE(SUM(route_revenue), 0),
        COALESCE(SUM(target_amount), 150000), 
        COUNT(*) FILTER (WHERE excess_revenue > 0 OR commission_amount > 0)
    INTO 
        v_monthly_commission,
        v_current_revenue,
        v_monthly_target,
        v_targets_hit
    FROM public.staff_commissions
    WHERE staff_id = p_staff_id AND trip_date >= v_start_of_month;

    -- Override target to 150000 if sum was zero
    IF v_monthly_target = 0 THEN
        v_monthly_target := 150000;
    END IF;

    -- 3. Advances from payroll_adjustments
    SELECT COALESCE(SUM(pa.amount), 0)
    INTO v_advances
    FROM public.payroll_adjustments pa
    JOIN public.payroll_records pr ON pr.id = pa.payroll_record_id
    WHERE pr.staff_id = p_staff_id 
      AND pa.adjustment_type = 'deduction' 
      AND pa.description ILIKE '%advance%'
      AND pr.period_start_date >= v_start_of_month;

    -- 4. Recent Performance
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'date', sc.trip_date,
            'route', COALESCE(r.route_name, 'Unknown Route'),
            'revenue', sc.route_revenue,
            'targetHit', (sc.excess_revenue > 0 OR sc.commission_amount > 0)
        )
    ), '[]'::jsonb)
    INTO v_recent_performance
    FROM (
        SELECT trip_date, route_id, route_revenue, excess_revenue, commission_amount
        FROM public.staff_commissions
        WHERE staff_id = p_staff_id
        ORDER BY trip_date DESC
        LIMIT 5
    ) sc
    LEFT JOIN public.routes r ON r.id = sc.route_id;

    -- 5. Recent Transactions
    WITH combined_tx AS (
        SELECT 
            'Salary Paid' as type,
            net_pay as amount,
            period_end_date::TEXT as date,
            status::TEXT,
            created_at
        FROM public.payroll_records
        WHERE staff_id = p_staff_id

        UNION ALL

        SELECT 
            'Advance' as type,
            pa.amount,
            pr.period_end_date::TEXT as date,
            'Deducted' as status,
            pa.created_at
        FROM public.payroll_adjustments pa
        JOIN public.payroll_records pr ON pr.id = pa.payroll_record_id
        WHERE pr.staff_id = p_staff_id AND pa.adjustment_type = 'deduction' AND pa.description ILIKE '%advance%'

        UNION ALL

        SELECT 
            'Commission' as type,
            commission_amount as amount,
            paid_at::DATE::TEXT as date,
            status::TEXT,
            paid_at as created_at
        FROM public.staff_commissions
        WHERE staff_id = p_staff_id AND paid_at IS NOT NULL
    )
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'type', type,
            'amount', amount,
            'date', date,
            'status', status
        )
    ), '[]'::jsonb)
    INTO v_recent_transactions
    FROM (
        SELECT * FROM combined_tx ORDER BY created_at DESC LIMIT 5
    ) tx;

    -- Build final response
    RETURN jsonb_build_object(
        'current_salary', v_base_salary + v_monthly_commission,
        'monthly_target', v_monthly_target,
        'current_revenue', v_current_revenue,
        'targets_hit', v_targets_hit,
        'advances', v_advances,
        'loan_balance', v_loan_balance,
        'recent_performance', v_recent_performance,
        'recent_transactions', v_recent_transactions,
        'estimated_commission', v_monthly_commission
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_crew_dashboard_data(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_crew_dashboard_data(UUID) TO authenticated;
