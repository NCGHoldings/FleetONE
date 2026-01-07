import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

interface PayrollSummary {
  staff_id: string;
  staff_name: string;
  staff_type: 'driver' | 'conductor';
  salary_type: 'monthly' | 'daily';
  monthly_salary: number;
  daily_rate: number;
  days_worked: number;
  expected_days: number;
  base_salary: number;
  total_commission: number;
  gross_pay: number;
  deductions: number;
  net_pay: number;
}

// Validate cron secret for scheduled job security
function validateCronSecret(req: Request): boolean {
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (!cronSecret) {
    console.warn('CRON_SECRET not configured - skipping auth check');
    return true; // Allow if not configured (for backward compatibility)
  }
  
  const authHeader = req.headers.get('x-cron-secret') || req.headers.get('authorization');
  const providedSecret = authHeader?.startsWith('Bearer ') 
    ? authHeader.replace('Bearer ', '') 
    : authHeader;
  
  return providedSecret === cronSecret;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Validate cron authentication
  if (!validateCronSecret(req)) {
    console.error('Unauthorized cron request attempt');
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { month, year, staffId } = await req.json().catch(() => ({}));
    
    const now = new Date();
    const targetMonth = month || now.getMonth() + 1;
    const targetYear = year || now.getFullYear();
    
    const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
    const endDate = new Date(targetYear, targetMonth, 0).toISOString().split('T')[0];

    console.log(`[generate-payroll] Generating payroll for ${targetMonth}/${targetYear}`);
    console.log(`[generate-payroll] Date range: ${startDate} to ${endDate}`);

    // Fetch payroll settings
    const { data: settings } = await supabase
      .from('payroll_settings')
      .select('setting_key, setting_value');

    const settingsMap = new Map(settings?.map(s => [s.setting_key, s.setting_value]) || []);
    const workingDaysPerMonth = (settingsMap.get('working_days_per_month') as any)?.value || 26;
    const minDaysForMonthly = (settingsMap.get('minimum_days_for_monthly') as any)?.value || 20;

    console.log(`[generate-payroll] Settings - Working days: ${workingDaysPerMonth}, Min days: ${minDaysForMonthly}`);

    // Fetch staff registry
    let staffQuery = supabase
      .from('staff_registry')
      .select('*')
      .eq('is_active', true);

    if (staffId) {
      staffQuery = staffQuery.eq('id', staffId);
    }

    const { data: staffList, error: staffError } = await staffQuery;

    if (staffError) {
      console.error('[generate-payroll] Error fetching staff:', staffError);
      throw staffError;
    }

    console.log(`[generate-payroll] Processing ${staffList?.length || 0} staff members`);

    const payrollSummaries: PayrollSummary[] = [];

    for (const staff of staffList || []) {
      // Count attendance days
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('staff_attendance')
        .select('id, daily_rate, status')
        .eq('staff_registry_id', staff.id)
        .gte('attendance_date', startDate)
        .lte('attendance_date', endDate)
        .eq('status', 'present');

      if (attendanceError) {
        console.error(`[generate-payroll] Error fetching attendance for ${staff.staff_name}:`, attendanceError);
        continue;
      }

      const daysWorked = attendanceData?.length || 0;
      console.log(`[generate-payroll] ${staff.staff_name}: ${daysWorked} days worked`);

      // Calculate base salary
      let baseSalary = 0;
      if (staff.salary_type === 'monthly') {
        // For monthly salary, prorate if less than minimum days
        if (daysWorked >= minDaysForMonthly) {
          baseSalary = staff.monthly_salary;
        } else {
          baseSalary = (staff.monthly_salary / workingDaysPerMonth) * daysWorked;
        }
      } else {
        // For daily rate, sum up all days
        baseSalary = attendanceData?.reduce((sum, a) => sum + (a.daily_rate || staff.daily_rate || 0), 0) || 0;
      }

      // Calculate total commission for the period
      const { data: commissionData, error: commissionError } = await supabase
        .from('staff_commissions')
        .select('commission_amount, status')
        .eq('staff_id', staff.id)
        .gte('trip_date', startDate)
        .lte('trip_date', endDate)
        .in('status', ['pending', 'approved']);

      if (commissionError) {
        console.error(`[generate-payroll] Error fetching commissions for ${staff.staff_name}:`, commissionError);
      }

      const totalCommission = commissionData?.reduce((sum, c) => sum + (c.commission_amount || 0), 0) || 0;

      const grossPay = baseSalary + totalCommission;
      const deductions = 0; // Can add deduction logic here
      const netPay = grossPay - deductions;

      payrollSummaries.push({
        staff_id: staff.id,
        staff_name: staff.staff_name,
        staff_type: staff.staff_type,
        salary_type: staff.salary_type,
        monthly_salary: staff.monthly_salary || 0,
        daily_rate: staff.daily_rate || 0,
        days_worked: daysWorked,
        expected_days: workingDaysPerMonth,
        base_salary: baseSalary,
        total_commission: totalCommission,
        gross_pay: grossPay,
        deductions: deductions,
        net_pay: netPay,
      });

      console.log(`[generate-payroll] ${staff.staff_name}: Base ${baseSalary}, Commission ${totalCommission}, Net ${netPay}`);
    }

    // Calculate totals
    const totalBaseSalary = payrollSummaries.reduce((sum, p) => sum + p.base_salary, 0);
    const totalCommissions = payrollSummaries.reduce((sum, p) => sum + p.total_commission, 0);
    const totalNetPay = payrollSummaries.reduce((sum, p) => sum + p.net_pay, 0);

    console.log(`[generate-payroll] Payroll complete. Total: ${payrollSummaries.length} staff, Net Pay: LKR ${totalNetPay.toFixed(2)}`);

    return new Response(
      JSON.stringify({
        success: true,
        period: {
          month: targetMonth,
          year: targetYear,
          startDate,
          endDate,
        },
        settings: {
          workingDaysPerMonth,
          minDaysForMonthly,
        },
        summary: {
          totalStaff: payrollSummaries.length,
          totalBaseSalary,
          totalCommissions,
          totalNetPay,
        },
        payroll: payrollSummaries,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorId = crypto.randomUUID().slice(0, 8);
    console.error(`[generate-payroll] Error ${errorId}:`, error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'An error occurred processing your request',
        errorId 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
