// @ts-nocheck
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export interface BankDepositRow {
  id: string;
  deposit_date: string;
  amount: number;
  bank_account_gl: string;
  reference_no: string;
  offset_expenses: any;
  status: string;
  notes: string;
}

export function useBankDeposits(date: Date) {
  const [deposits, setDeposits] = useState<BankDepositRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalUnsettledCash, setTotalUnsettledCash] = useState(0);

  const fetchData = async () => {
    try {
      setLoading(true);
      const targetDate = format(date, 'yyyy-MM-dd');

      // Fetch all deposits for this date
      const { data: depData, error: depError } = await supabase
        .from('bank_deposits')
        .select('*')
        .eq('deposit_date', targetDate)
        .order('created_at', { ascending: false });

      if (depError) throw depError;
      setDeposits(depData as any);

      // To find total unsettled cash, we could sum ALL time settlements minus ALL time deposits.
      // For performance in this demo, we'll just sum settlements up to today minus deposits up to today.
      const { data: allSetts } = await supabase
        .from('daily_cash_settlements')
        .select('actual_cash, status')
        .eq('status', 'Settled')
        .lte('settlement_date', targetDate);

      const { data: allDeps } = await supabase
        .from('bank_deposits')
        .select('amount, offset_expenses')
        .lte('deposit_date', targetDate);

      let totalIn = 0;
      (allSetts || []).forEach(s => totalIn += Number(s.actual_cash));

      let totalOut = 0;
      (allDeps || []).forEach(d => {
        totalOut += Number(d.amount);
        if (d.offset_expenses) {
          // sum values inside offset_expenses object
          Object.values(d.offset_expenses).forEach(val => totalOut += Number(val || 0));
        }
      });

      setTotalUnsettledCash(totalIn - totalOut);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [date]);

  const recordDeposit = async (payload: Partial<BankDepositRow>) => {
    const { error } = await supabase
      .from('bank_deposits')
      .insert([{
        deposit_date: format(date, 'yyyy-MM-dd'),
        ...payload
      }]);
    
    if (error) throw error;
    fetchData();
  };

  return { deposits, totalUnsettledCash, loading, recordDeposit };
}
