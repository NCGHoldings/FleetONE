import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Save, Settings2, Building2 } from 'lucide-react';
import { SearchableFinanceAccountSelector } from './SearchableFinanceAccountSelector';
import { useCompany } from '@/contexts/CompanyContext';

interface GLAccount {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
}

interface CoreGLSettingsData {
  id?: string;
  company_id?: string;
  // Core Auto-Posting accounts
  trade_receivable_account_id: string | null;
  trade_payable_account_id: string | null;
  sales_revenue_account_id: string | null;
  default_expense_account_id: string | null;
  customer_advance_account_id: string | null;
  wht_payable_account_id: string | null;
  // Tax accounts
  input_tax_account_id: string | null;      // Input VAT (AP side - asset)
  tax_payable_account_id: string | null;     // Output VAT (AR side - liability)
  // Banking
  bank_account_id: string | null;            // Default bank for receipts/payments
}

const defaultSettings: CoreGLSettingsData = {
  trade_receivable_account_id: null,
  trade_payable_account_id: null,
  sales_revenue_account_id: null,
  default_expense_account_id: null,
  customer_advance_account_id: null,
  wht_payable_account_id: null,
  input_tax_account_id: null,
  tax_payable_account_id: null,
  bank_account_id: null,
};

export function CoreGLSettings() {
  const { selectedCompanyId, selectedCompany } = useCompany();
  const companyName = selectedCompany?.name || 'Unknown';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState<GLAccount[]>([]);
  const [settings, setSettings] = useState<CoreGLSettingsData>(defaultSettings);

  useEffect(() => {
    if (selectedCompanyId) {
      loadData(selectedCompanyId);
    }
  }, [selectedCompanyId]);

  const loadData = async (companyId: string) => {
    setLoading(true);
    try {
      // Load chart of accounts for the selected company
      const { data: accountsData, error: accountsError } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code, account_name, account_type')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('account_code');

      if (accountsError) throw accountsError;
      setAccounts(accountsData || []);

      // Load existing settings
      const { data: settingsData, error: settingsError } = await (supabase as any)
        .from('gl_settings')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      if (settingsError && settingsError.code !== 'PGRST116') throw settingsError;

      if (settingsData) {
        setSettings({
          ...defaultSettings,
          ...settingsData,
        });
      } else {
        setSettings({ ...defaultSettings, company_id: companyId }); // Reset if none exists
      }
    } catch (error) {
      console.error('Error loading core GL settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedCompanyId) {
      toast.error('No company selected');
      return;
    }

    setSaving(true);
    try {
      const saveData = {
        ...settings,
        company_id: selectedCompanyId,
      };

      const { error } = await (supabase as any)
        .from('gl_settings')
        .upsert(saveData, { onConflict: 'company_id' });

      if (error) throw error;
      toast.success('Core GL settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(`Failed to save settings: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  const renderAccountSelect = (
    label: string,
    field: keyof CoreGLSettingsData,
    placeholder: string,
    description?: string
  ) => {
    const value = settings[field] as string | null;

    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
        <SearchableFinanceAccountSelector
          value={value}
          onValueChange={(v) => setSettings({ ...settings, [field]: v })}
          accounts={accounts}
          placeholder={placeholder}
        />
      </div>
    );
  };

  if (!selectedCompanyId) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6 text-muted-foreground">
          Select a company to configure GL settings
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Core GL Settings ({companyName})
          </CardTitle>
          <CardDescription>
            Map the default Accounts Receivable (AR) and Accounts Payable (AP) accounts used for standard invoice and payment GL postings for the selected company.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Accounts Receivable (AR) Default Accounts
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderAccountSelect(
                'Trade Receivable Account (Asset)',
                'trade_receivable_account_id',
                'Select Trade Receivable Account',
                'Default account to debit when creating AR Invoices'
              )}
              {renderAccountSelect(
                'Sales Revenue Account (Revenue)',
                'sales_revenue_account_id',
                'Select Sales Revenue Account',
                'Default account to credit when creating AR Invoices'
              )}
              {renderAccountSelect(
                'Customer Advance Account (Liability)',
                'customer_advance_account_id',
                'Select Customer Advance Account',
                'Account to credit for advance receipts before invoicing'
              )}
              {renderAccountSelect(
                'Output VAT / Tax Payable (Liability)',
                'tax_payable_account_id',
                'Select Output Tax Account',
                'CR when VAT is charged on AR Invoices (e.g. 18% VAT on sales)'
              )}
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-destructive" />
              Accounts Payable (AP) Default Accounts
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderAccountSelect(
                'Trade Payable Account (Liability)',
                'trade_payable_account_id',
                'Select Trade Payable Account',
                'Default account to credit when creating AP Invoices'
              )}
              {renderAccountSelect(
                'Default Expense Account',
                'default_expense_account_id',
                'Select Expense Account',
                'Default account to debit for AP Invoices (can be overridden per invoice)'
              )}
              {renderAccountSelect(
                'WHT Payable Account (Liability)',
                'wht_payable_account_id',
                'Select WHT Payable Account',
                'Account to credit when Withholding Tax is deducted from payments'
              )}
              {renderAccountSelect(
                'Input VAT / Tax Receivable (Asset)',
                'input_tax_account_id',
                'Select Input Tax Account',
                'DR when VAT is paid on AP Invoices (e.g. 18% VAT on purchases)'
              )}
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-blue-500" />
              Banking
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderAccountSelect(
                'Default Bank / Cash Account (Asset)',
                'bank_account_id',
                'Select Bank Account',
                'Default bank account for AR Receipts and AP Payments'
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save GL Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
