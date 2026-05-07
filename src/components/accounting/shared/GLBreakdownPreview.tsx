import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { resolveCustomerARAccounts } from '@/hooks/useCustomerCategories';

import { SearchableFinanceAccountSelector } from '@/components/settings/SearchableFinanceAccountSelector';

interface GLBreakdownPreviewProps {
  customerId: string;
  companyId: string;
  amount: number;
  paymentType: 'advance' | 'balance' | 'full';
  customBankAccountId?: string;
  customCreditAccountId?: string;
  paymentMethod?: string;
  onOverridesChange?: (overrides: { bankId: string | null; creditId: string | null }) => void;
}

export function GLBreakdownPreview({
  customerId,
  companyId,
  amount,
  paymentType,
  customBankAccountId,
  customCreditAccountId,
  paymentMethod,
  onOverridesChange,
}: GLBreakdownPreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [resolvedData, setResolvedData] = useState<any>(null);
  const [accountNames, setAccountNames] = useState<Record<string, string>>({});
  const [allAccounts, setAllAccounts] = useState<any[]>([]);
  
  // Local overrides
  const [overrideBankId, setOverrideBankId] = useState<string | null>(null);
  const [overrideCreditId, setOverrideCreditId] = useState<string | null>(null);

  useEffect(() => {
    loadAllAccounts();
  }, [companyId]);

  useEffect(() => {
    if (onOverridesChange) {
      onOverridesChange({
        bankId: overrideBankId,
        creditId: overrideCreditId,
      });
    }
  }, [overrideBankId, overrideCreditId]);

  useEffect(() => {
    loadPreview();
  }, [customerId, companyId, amount, paymentType, customBankAccountId, customCreditAccountId]);

  const loadAllAccounts = async () => {
    try {
      const { data } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code, account_name, account_type')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('account_code');
      setAllAccounts(data || []);
    } catch (err) {
      console.error('Error loading accounts:', err);
    }
  };

  const loadPreview = async () => {
    setIsLoading(true);
    try {
      const resolved = await resolveCustomerARAccounts(customerId, companyId);
      
      const bankId = customBankAccountId || resolved.bankAccountId;
      const creditId = customCreditAccountId || 
                      (paymentType === 'advance' ? resolved.advanceAccountId : 
                       paymentType === 'balance' ? (resolved.arAccountId || resolved.revenueAccountId) : 
                       resolved.revenueAccountId);

      // Set initial overrides to resolved values
      if (bankId && !overrideBankId) setOverrideBankId(bankId);
      if (creditId && !overrideCreditId) setOverrideCreditId(creditId);

      // Fetch names for these accounts (including resolved ones)
      const idsToFetch = [bankId, creditId, overrideBankId, overrideCreditId].filter(Boolean) as string[];
      if (idsToFetch.length > 0) {
        const { data: accounts } = await supabase
          .from('chart_of_accounts')
          .select('id, account_code, account_name')
          .in('id', idsToFetch);
        
        const nameMap: Record<string, string> = {};
        accounts?.forEach(acc => {
          nameMap[acc.id] = `${acc.account_code} - ${acc.account_name}`;
        });
        setAccountNames(prev => ({ ...prev, ...nameMap }));
      }

      setResolvedData({
        ...resolved,
        bankId: overrideBankId || bankId,
        creditId: overrideCreditId || creditId,
      });
    } catch (err) {
      console.error('Error loading GL preview:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Calculating GL impact...</span>
      </div>
    );
  }

  const { bankId, creditId, missingAccounts, source } = resolvedData || {};

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium flex items-center gap-2">
          Proposed Ledger Entry 
          <Badge variant="outline" className="text-[10px] uppercase">
            Source: {source}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground italic">
          {paymentMethod === 'opening_balance' ? 'Opening Balance Entry' : 'Standard Payment Entry'}
        </div>
      </div>

      <Table className="border rounded-md">
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead>Account</TableHead>
            <TableHead className="text-right">Debit (LKR)</TableHead>
            <TableHead className="text-right">Credit (LKR)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* DEBIT LINE */}
          <TableRow>
            <TableCell className="w-[60%]">
              <div className="space-y-1">
                <SearchableFinanceAccountSelector
                  value={overrideBankId}
                  onValueChange={setOverrideBankId}
                  accounts={allAccounts}
                  placeholder="Select Bank/Asset Account"
                  className={!overrideBankId ? "border-red-300" : "border-blue-200"}
                />
                <span className="text-[10px] text-muted-foreground uppercase px-1">
                  Debit Side: Bank / Asset
                </span>
              </div>
            </TableCell>
            <TableCell className="text-right font-bold text-blue-700">
              {amount.toLocaleString()}
            </TableCell>
            <TableCell className="text-right">-</TableCell>
          </TableRow>

          {/* CREDIT LINE */}
          <TableRow>
            <TableCell className="w-[60%]">
              <div className="space-y-1">
                <SearchableFinanceAccountSelector
                  value={overrideCreditId}
                  onValueChange={setOverrideCreditId}
                  accounts={allAccounts}
                  placeholder="Select Credit Account"
                  className={!overrideCreditId ? "border-red-300" : "border-green-200"}
                />
                <span className="text-[10px] text-muted-foreground uppercase px-1">
                  Credit Side: {paymentType === 'advance' ? 'Liability (Advance)' : 'Asset (Receivable) / Revenue'}
                </span>
              </div>
            </TableCell>
            <TableCell className="text-right">-</TableCell>
            <TableCell className="text-right font-bold text-green-700">
              {amount.toLocaleString()}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      {missingAccounts?.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-md">
          <div className="text-xs font-bold text-red-700 flex items-center gap-1 mb-1">
            <AlertCircle className="h-3 w-3" /> Missing Configuration
          </div>
          <ul className="text-[10px] text-red-600 list-disc pl-4">
            {missingAccounts.map((msg: string, i: number) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      {!missingAccounts?.length && bankId && creditId && (
        <div className="text-[10px] text-green-600 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" /> Ready for posting to General Ledger
        </div>
      )}
    </div>
  );
}
