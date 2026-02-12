/**
 * NCG Express Finance Integration Hook
 * Handles GL posting for Public Transport operations (Daily Trips & Bus Expenses)
 * 
 * NCG Express is a STANDALONE company (separate from NCG Holding)
 * Company ID: 7ece7595-8b7b-46de-8bfc-c1e8e0da7513
 * Business Unit Code: NCGE
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

// NCG Express standalone company
export const NCG_EXPRESS_COMPANY_ID = '7ece7595-8b7b-46de-8bfc-c1e8e0da7513';
export const BUSINESS_UNIT_CODE = 'NCGE';

export interface NCGExpressFinanceSettings {
  id?: string;
  company_id?: string;
  // Revenue accounts
  ticket_revenue_account_id: string | null;
  route_revenue_account_id: string | null;
  cash_account_id: string | null;
  // Expense accounts
  fuel_expense_account_id: string | null;
  repair_expense_account_id: string | null;
  tyre_expense_account_id: string | null;
  salary_expense_account_id: string | null;
  police_expense_account_id: string | null;
  food_expense_account_id: string | null;
  emission_fitness_expense_account_id: string | null;
  permits_expense_account_id: string | null;
  staff_accommodation_expense_account_id: string | null;
  highway_expense_account_id: string | null;
  accident_expense_account_id: string | null;
  parking_expense_account_id: string | null;
  log_sheet_expense_account_id: string | null;
  vehicle_hire_expense_account_id: string | null;
  ntc_expense_account_id: string | null;
  runner_expense_account_id: string | null;
  short_misc_expense_account_id: string | null;
  temporary_permit_expense_account_id: string | null;
  body_wash_expense_account_id: string | null;
  legal_court_expense_account_id: string | null;
  other_expense_account_id: string | null;
  expense_cash_account_id: string | null;
  // Automation
  auto_post_revenue: boolean;
  auto_post_expenses: boolean;
  revenue_prefix: string;
  expense_prefix: string;
}

export interface DailyTripForGL {
  id: string;
  trip_no?: string;
  trip_date: string;
  bus_id?: string;
  bus_no?: string;
  route_id?: string;
  route_name?: string;
  income: number;
  buses?: { bus_no: string };
  routes?: { route_name: string };
}

export interface DailyExpenseForGL {
  id: string;
  expense_date: string;
  bus_id: string;
  fuel_cost: number;
  repair: number;
  tyre_tube: number;
  salary: number;
  police: number;
  food: number;
  emission_fitness: number;
  permits_renewal: number;
  staff_accommodation: number;
  highway_charges: number;
  accident_compensation: number;
  parking: number;
  log_sheet: number;
  vehicle_hire: number;
  ntc: number;
  runner: number;
  short_misc: number;
  temporary_permit: number;
  body_wash: number;
  legal_court: number;
  other: number;
  buses?: { bus_no: string };
}

/**
 * Hook to fetch and manage NCG Express finance settings
 */
export function useNCGExpressFinanceSettings() {
  const [settings, setSettings] = useState<NCGExpressFinanceSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('ncg_express_finance_settings')
        .select('*')
        .eq('company_id', NCG_EXPRESS_COMPANY_ID)
        .maybeSingle();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error('Error fetching NCG Express finance settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return { settings, loading, refetch: fetchSettings };
}

/**
 * Update COA balance based on account type
 * Asset/Expense = Debit Normal (debits increase, credits decrease)
 * Liability/Equity/Revenue/Income = Credit Normal (credits increase, debits decrease)
 */
async function updateAccountBalance(accountId: string, amount: number, isDebit: boolean) {
  // Get the account to check its type
  const { data: account, error: fetchError } = await supabase
    .from('chart_of_accounts')
    .select('current_balance, account_type')
    .eq('id', accountId)
    .single();

  if (fetchError || !account) {
    console.error('Error fetching account for balance update:', fetchError);
    return;
  }

  const currentBalance = account.current_balance || 0;
  let newBalance: number;

  // Determine if account is debit normal based on account_type
  const debitNormalTypes = ['asset', 'expense'];
  const isDebitNormal = debitNormalTypes.includes(account.account_type?.toLowerCase() || '');

  // Debit normal accounts: debits increase, credits decrease
  // Credit normal accounts: credits increase, debits decrease
  if (isDebitNormal) {
    newBalance = isDebit ? currentBalance + amount : currentBalance - amount;
  } else {
    newBalance = isDebit ? currentBalance - amount : currentBalance + amount;
  }

  const { error: updateError } = await supabase
    .from('chart_of_accounts')
    .update({ current_balance: newBalance })
    .eq('id', accountId);

  if (updateError) {
    console.error('Error updating account balance:', updateError);
  }
}

/**
 * Post daily trip revenue to GL
 * DR Cash/Bank | CR Ticket Revenue
 */
export async function postTripRevenueToGL(
  trip: DailyTripForGL,
  settings: NCGExpressFinanceSettings
): Promise<{ success: boolean; journalEntryId?: string; error?: string }> {
  try {
    // Validate settings
    if (!settings.cash_account_id || !settings.ticket_revenue_account_id) {
      return { success: false, error: 'Revenue account mappings not configured' };
    }

    if (!trip.income || trip.income <= 0) {
      return { success: false, error: 'No income to post' };
    }

    const busNo = trip.bus_no || trip.buses?.bus_no || 'Unknown';
    const routeName = trip.route_name || trip.routes?.route_name || 'Unknown Route';
    const tripDate = format(new Date(trip.trip_date), 'yyyy-MM-dd');

    // Create journal entry
    const entryNumber = `${settings.revenue_prefix}-${busNo}-${tripDate}`;

    const { data: journalEntry, error: jeError } = await supabase
      .from('journal_entries')
      .insert({
        entry_number: entryNumber,
        entry_date: trip.trip_date,
        description: `Daily Trip Revenue - ${routeName} - Bus ${busNo}`,
        total_debit: trip.income,
        total_credit: trip.income,
        status: 'posted',
        company_id: NCG_EXPRESS_COMPANY_ID,
        business_unit_code: BUSINESS_UNIT_CODE,
        reference: `daily_trip:${trip.id}`,
      })
      .select()
      .single();

    if (jeError) throw jeError;

    // Create journal entry lines with bus/route metadata for multi-dimensional reporting
    const lines = [
      {
        journal_entry_id: journalEntry.id,
        account_id: settings.cash_account_id,
        debit: trip.income,
        credit: 0,
        description: `Cash from trip - ${routeName}`,
        company_id: NCG_EXPRESS_COMPANY_ID,
        bus_id: trip.bus_id || null,
        route_id: trip.route_id || null,
        trip_id: trip.id,
      },
      {
        journal_entry_id: journalEntry.id,
        account_id: settings.ticket_revenue_account_id,
        debit: 0,
        credit: trip.income,
        description: `Ticket revenue - ${routeName}`,
        company_id: NCG_EXPRESS_COMPANY_ID,
        bus_id: trip.bus_id || null,
        route_id: trip.route_id || null,
        trip_id: trip.id,
      },
    ];

    const { error: linesError } = await supabase
      .from('journal_entry_lines')
      .insert(lines);

    if (linesError) throw linesError;

    // Update COA balances
    await updateAccountBalance(settings.cash_account_id, trip.income, true);
    await updateAccountBalance(settings.ticket_revenue_account_id, trip.income, false);

    // Link trip to journal entry
    const { error: updateError } = await supabase
      .from('daily_trips')
      .update({
        journal_entry_id: journalEntry.id,
        gl_posted: true
      })
      .eq('id', trip.id);

    if (updateError) throw updateError;

    return { success: true, journalEntryId: journalEntry.id };
  } catch (error: any) {
    console.error('Error posting trip revenue to GL:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Post daily bus expenses to GL
 * DR [Expense Accounts] | CR Cash/Bank
 */
export async function postExpensesToGL(
  expense: DailyExpenseForGL,
  settings: NCGExpressFinanceSettings
): Promise<{ success: boolean; journalEntryId?: string; error?: string }> {
  try {
    // Validate settings
    if (!settings.expense_cash_account_id) {
      return { success: false, error: 'Expense cash account not configured' };
    }

    // Map expense categories to account IDs
    const expenseMapping: { field: keyof DailyExpenseForGL; accountField: keyof NCGExpressFinanceSettings; label: string }[] = [
      { field: 'fuel_cost', accountField: 'fuel_expense_account_id', label: 'Fuel/Diesel' },
      { field: 'repair', accountField: 'repair_expense_account_id', label: 'Repairs' },
      { field: 'tyre_tube', accountField: 'tyre_expense_account_id', label: 'Tyre & Tube' },
      { field: 'salary', accountField: 'salary_expense_account_id', label: 'Salary' },
      { field: 'police', accountField: 'police_expense_account_id', label: 'Police' },
      { field: 'food', accountField: 'food_expense_account_id', label: 'Food' },
      { field: 'emission_fitness', accountField: 'emission_fitness_expense_account_id', label: 'Emission/Fitness' },
      { field: 'permits_renewal', accountField: 'permits_expense_account_id', label: 'Permits' },
      { field: 'staff_accommodation', accountField: 'staff_accommodation_expense_account_id', label: 'Accommodation' },
      { field: 'highway_charges', accountField: 'highway_expense_account_id', label: 'Highway' },
      { field: 'accident_compensation', accountField: 'accident_expense_account_id', label: 'Accident' },
      { field: 'parking', accountField: 'parking_expense_account_id', label: 'Parking' },
      { field: 'log_sheet', accountField: 'log_sheet_expense_account_id', label: 'Log Sheet' },
      { field: 'vehicle_hire', accountField: 'vehicle_hire_expense_account_id', label: 'Vehicle Hire' },
      { field: 'ntc', accountField: 'ntc_expense_account_id', label: 'NTC' },
      { field: 'runner', accountField: 'runner_expense_account_id', label: 'Runner' },
      { field: 'short_misc', accountField: 'short_misc_expense_account_id', label: 'Short/Misc' },
      { field: 'temporary_permit', accountField: 'temporary_permit_expense_account_id', label: 'Temp Permit' },
      { field: 'body_wash', accountField: 'body_wash_expense_account_id', label: 'Body Wash' },
      { field: 'legal_court', accountField: 'legal_court_expense_account_id', label: 'Legal/Court' },
      { field: 'other', accountField: 'other_expense_account_id', label: 'Other' },
    ];

    // Build expense lines (only non-zero amounts)
    const expenseLines: { accountId: string; amount: number; label: string }[] = [];
    let totalExpenses = 0;

    for (const mapping of expenseMapping) {
      const amount = (expense[mapping.field] as number) || 0;
      const accountId = settings[mapping.accountField] as string | null;

      if (amount > 0 && accountId) {
        expenseLines.push({ accountId, amount, label: mapping.label });
        totalExpenses += amount;
      }
    }

    if (totalExpenses === 0) {
      return { success: false, error: 'No expenses to post' };
    }

    const busNo = expense.buses?.bus_no || 'Unknown';
    const expenseDate = format(new Date(expense.expense_date), 'yyyy-MM-dd');

    // Create journal entry
    const entryNumber = `${settings.expense_prefix}-${busNo}-${expenseDate}`;

    const { data: journalEntry, error: jeError } = await supabase
      .from('journal_entries')
      .insert({
        entry_number: entryNumber,
        entry_date: expense.expense_date,
        description: `Daily Bus Expenses - Bus ${busNo} - ${expenseDate}`,
        total_debit: totalExpenses,
        total_credit: totalExpenses,
        status: 'posted',
        company_id: NCG_EXPRESS_COMPANY_ID,
        business_unit_code: BUSINESS_UNIT_CODE,
        reference: `daily_bus_expense:${expense.id}`,
      })
      .select()
      .single();

    if (jeError) throw jeError;

    // Create journal entry lines for each expense category with bus metadata
    const jeLines = expenseLines.map(line => ({
      journal_entry_id: journalEntry.id,
      account_id: line.accountId,
      debit: line.amount,
      credit: 0,
      description: `${line.label} - Bus ${busNo}`,
      company_id: NCG_EXPRESS_COMPANY_ID,
      bus_id: expense.bus_id || null,
      expense_id: expense.id,
    }));

    // Add the credit line for cash with bus metadata
    jeLines.push({
      journal_entry_id: journalEntry.id,
      account_id: settings.expense_cash_account_id,
      debit: 0,
      credit: totalExpenses,
      description: `Cash paid for expenses - Bus ${busNo}`,
      company_id: NCG_EXPRESS_COMPANY_ID,
      bus_id: expense.bus_id || null,
      expense_id: expense.id,
    });

    const { error: linesError } = await supabase
      .from('journal_entry_lines')
      .insert(jeLines);

    if (linesError) throw linesError;

    // Update COA balances
    for (const line of expenseLines) {
      await updateAccountBalance(line.accountId, line.amount, true);
    }
    await updateAccountBalance(settings.expense_cash_account_id, totalExpenses, false);

    // Link expense to journal entry
    const { error: updateError } = await supabase
      .from('daily_bus_expenses')
      .update({
        journal_entry_id: journalEntry.id,
        gl_posted: true
      })
      .eq('id', expense.id);

    if (updateError) throw updateError;

    return { success: true, journalEntryId: journalEntry.id };
  } catch (error: any) {
    console.error('Error posting expenses to GL:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Hook to get unposted trips
 */
export function useUnpostedTrips(date?: Date) {
  const [trips, setTrips] = useState<DailyTripForGL[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUnposted = useCallback(async () => {
    try {
      let query = supabase
        .from('daily_trips')
        .select(`
          id, trip_date, bus_id, route_id, income,
          buses(bus_no),
          routes(route_name)
        `)
        .or('gl_posted.is.null,gl_posted.eq.false')
        .gt('income', 0)
        .order('trip_date', { ascending: false });

      if (date) {
        const dateStr = format(date, 'yyyy-MM-dd');
        query = query.eq('trip_date', dateStr);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      setTrips(data || []);
    } catch (error) {
      console.error('Error fetching unposted trips:', error);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchUnposted();
  }, [fetchUnposted]);

  return { trips, loading, refetch: fetchUnposted };
}

/**
 * Hook to get unposted expenses
 */
export function useUnpostedExpenses(date?: Date) {
  const [expenses, setExpenses] = useState<DailyExpenseForGL[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUnposted = useCallback(async () => {
    try {
      let query = supabase
        .from('daily_bus_expenses')
        .select(`
          *,
          buses(bus_no)
        `)
        .or('gl_posted.is.null,gl_posted.eq.false')
        .order('expense_date', { ascending: false });

      if (date) {
        const dateStr = format(date, 'yyyy-MM-dd');
        query = query.eq('expense_date', dateStr);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error('Error fetching unposted expenses:', error);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchUnposted();
  }, [fetchUnposted]);

  return { expenses, loading, refetch: fetchUnposted };
}

/**
 * Bulk post multiple trips to GL
 */
export async function bulkPostTripsToGL(
  trips: DailyTripForGL[],
  settings: NCGExpressFinanceSettings
): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const trip of trips) {
    const result = await postTripRevenueToGL(trip, settings);
    if (result.success) {
      success++;
    } else {
      failed++;
      errors.push(`Trip ${trip.id}: ${result.error}`);
    }
  }

  return { success, failed, errors };
}

/**
 * Bulk post multiple expenses to GL
 */
export async function bulkPostExpensesToGL(
  expenses: DailyExpenseForGL[],
  settings: NCGExpressFinanceSettings
): Promise<{ success: number; failed: number; errors: string[] }> {
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const expense of expenses) {
    const result = await postExpensesToGL(expense, settings);
    if (result.success) {
      success++;
    } else {
      failed++;
      errors.push(`Expense ${expense.id}: ${result.error}`);
    }
  }

  return { success, failed, errors };
}

/**
 * Auto-post a single trip to GL if auto_post_revenue is enabled in settings.
 * Call this after saving/updating a trip. It fetches settings internally.
 * Silently skips if auto-posting is disabled or settings not configured.
 */
export async function autoPostTripIfEnabled(tripId: string): Promise<void> {
  try {
    // Fetch settings
    const { data: settingsData } = await supabase
      .from('ncg_express_finance_settings')
      .select('*')
      .eq('company_id', NCG_EXPRESS_COMPANY_ID)
      .maybeSingle();

    if (!settingsData?.auto_post_revenue) return; // Auto-post disabled
    if (!settingsData?.cash_account_id || !settingsData?.ticket_revenue_account_id) return; // Not configured

    // Fetch the trip with bus and route info
    const { data: trip } = await supabase
      .from('daily_trips')
      .select(`
        id, trip_no, trip_date, bus_id, route_id, income, gl_posted,
        buses:bus_id(bus_no),
        routes:route_id(route_name)
      `)
      .eq('id', tripId)
      .single();

    if (!trip || trip.gl_posted || !trip.income || trip.income <= 0) return;

    const settings: NCGExpressFinanceSettings = {
      ticket_revenue_account_id: settingsData.ticket_revenue_account_id,
      route_revenue_account_id: settingsData.route_revenue_account_id,
      cash_account_id: settingsData.cash_account_id,
      fuel_expense_account_id: settingsData.fuel_expense_account_id,
      repair_expense_account_id: settingsData.repair_expense_account_id,
      tyre_expense_account_id: settingsData.tyre_expense_account_id,
      salary_expense_account_id: settingsData.salary_expense_account_id,
      police_expense_account_id: settingsData.police_expense_account_id,
      food_expense_account_id: settingsData.food_expense_account_id,
      emission_fitness_expense_account_id: settingsData.emission_fitness_expense_account_id,
      permits_expense_account_id: settingsData.permits_expense_account_id,
      staff_accommodation_expense_account_id: settingsData.staff_accommodation_expense_account_id,
      highway_expense_account_id: settingsData.highway_expense_account_id,
      accident_expense_account_id: settingsData.accident_expense_account_id,
      parking_expense_account_id: settingsData.parking_expense_account_id,
      log_sheet_expense_account_id: settingsData.log_sheet_expense_account_id,
      vehicle_hire_expense_account_id: settingsData.vehicle_hire_expense_account_id,
      ntc_expense_account_id: settingsData.ntc_expense_account_id,
      runner_expense_account_id: settingsData.runner_expense_account_id,
      short_misc_expense_account_id: settingsData.short_misc_expense_account_id,
      temporary_permit_expense_account_id: settingsData.temporary_permit_expense_account_id,
      body_wash_expense_account_id: settingsData.body_wash_expense_account_id,
      legal_court_expense_account_id: settingsData.legal_court_expense_account_id,
      other_expense_account_id: settingsData.other_expense_account_id,
      expense_cash_account_id: settingsData.expense_cash_account_id,
      auto_post_revenue: settingsData.auto_post_revenue ?? false,
      auto_post_expenses: settingsData.auto_post_expenses ?? false,
      revenue_prefix: settingsData.revenue_prefix || 'NCGE-REV',
      expense_prefix: settingsData.expense_prefix || 'NCGE-EXP',
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const busNo = (trip.buses as any)?.bus_no || 'Unknown';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const routeName = (trip.routes as any)?.route_name || 'Unknown';

    await postTripRevenueToGL(
      {
        id: trip.id,
        trip_no: trip.trip_no || '',
        trip_date: trip.trip_date,
        bus_id: trip.bus_id || undefined,
        bus_no: busNo,
        route_id: trip.route_id || undefined,
        route_name: routeName,
        income: trip.income || 0,
      },
      settings
    );
  } catch (error) {
    console.error('Auto-post trip failed (non-blocking):', error);
    // Silently fail — auto-posting should never block the user's save
  }
}

/**
 * Auto-post a single expense record to GL if auto_post_expenses is enabled.
 * Call this after saving/updating an expense record.
 * Silently skips if auto-posting is disabled or settings not configured.
 */
export async function autoPostExpenseIfEnabled(busId: string, expenseDate: string): Promise<void> {
  try {
    // Fetch settings
    const { data: settingsData } = await supabase
      .from('ncg_express_finance_settings')
      .select('*')
      .eq('company_id', NCG_EXPRESS_COMPANY_ID)
      .maybeSingle();

    if (!settingsData?.auto_post_expenses) return; // Auto-post disabled
    if (!settingsData?.expense_cash_account_id) return; // Not configured

    // Fetch the expense with bus info
    const { data: expense } = await supabase
      .from('daily_bus_expenses')
      .select(`*, buses:bus_id(bus_no)`)
      .eq('bus_id', busId)
      .eq('expense_date', expenseDate)
      .maybeSingle();

    if (!expense || expense.gl_posted) return;

    const settings: NCGExpressFinanceSettings = {
      ticket_revenue_account_id: settingsData.ticket_revenue_account_id,
      route_revenue_account_id: settingsData.route_revenue_account_id,
      cash_account_id: settingsData.cash_account_id,
      fuel_expense_account_id: settingsData.fuel_expense_account_id,
      repair_expense_account_id: settingsData.repair_expense_account_id,
      tyre_expense_account_id: settingsData.tyre_expense_account_id,
      salary_expense_account_id: settingsData.salary_expense_account_id,
      police_expense_account_id: settingsData.police_expense_account_id,
      food_expense_account_id: settingsData.food_expense_account_id,
      emission_fitness_expense_account_id: settingsData.emission_fitness_expense_account_id,
      permits_expense_account_id: settingsData.permits_expense_account_id,
      staff_accommodation_expense_account_id: settingsData.staff_accommodation_expense_account_id,
      highway_expense_account_id: settingsData.highway_expense_account_id,
      accident_expense_account_id: settingsData.accident_expense_account_id,
      parking_expense_account_id: settingsData.parking_expense_account_id,
      log_sheet_expense_account_id: settingsData.log_sheet_expense_account_id,
      vehicle_hire_expense_account_id: settingsData.vehicle_hire_expense_account_id,
      ntc_expense_account_id: settingsData.ntc_expense_account_id,
      runner_expense_account_id: settingsData.runner_expense_account_id,
      short_misc_expense_account_id: settingsData.short_misc_expense_account_id,
      temporary_permit_expense_account_id: settingsData.temporary_permit_expense_account_id,
      body_wash_expense_account_id: settingsData.body_wash_expense_account_id,
      legal_court_expense_account_id: settingsData.legal_court_expense_account_id,
      other_expense_account_id: settingsData.other_expense_account_id,
      expense_cash_account_id: settingsData.expense_cash_account_id,
      auto_post_revenue: settingsData.auto_post_revenue ?? false,
      auto_post_expenses: settingsData.auto_post_expenses ?? false,
      revenue_prefix: settingsData.revenue_prefix || 'NCGE-REV',
      expense_prefix: settingsData.expense_prefix || 'NCGE-EXP',
    };

    await postExpensesToGL(expense as DailyExpenseForGL, settings);
  } catch (error) {
    console.error('Auto-post expense failed (non-blocking):', error);
    // Silently fail — auto-posting should never block the user's save
  }
}