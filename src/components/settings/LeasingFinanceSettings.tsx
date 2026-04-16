/**
 * Leasing Finance Settings Component
 * Maps fleet leasing operations to GL accounts for automated AP and GL posting
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Save, DollarSign, Building2, CreditCard, Calculator, FileText } from 'lucide-react';
import { SearchableFinanceAccountSelector } from './SearchableFinanceAccountSelector';

// NCG Holding ID for consolidated GL
const NCG_HOLDING_ID = 'a0000000-0000-0000-0000-000000000001';

interface GLAccount {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
}

interface LeasingFinanceSettingsData {
  id?: string;
  company_id?: string;
  business_unit_code: string;
  // Vendor/Lender mapping
  auto_create_vendor: boolean;
  // GL Account Mappings
  bank_account_id: string | null;
  leasing_liability_account_id: string | null;
  interest_expense_account_id: string | null;
  lease_asset_account_id: string | null;
  // Automation toggles
  auto_create_ap_invoice: boolean;
  auto_post_gl_on_payment: boolean;
  ap_prefix: string;
  gl_prefix: string;
}

const defaultSettings: LeasingFinanceSettingsData = {
  business_unit_code: 'FLEET',
  auto_create_vendor: true,
  bank_account_id: null,
  leasing_liability_account_id: null,
  interest_expense_account_id: null,
  lease_asset_account_id: null,
  auto_create_ap_invoice: true,
  auto_post_gl_on_payment: true,
  ap_prefix: 'LEASE-AP',
  gl_prefix: 'LEASE-GL',
};

export function LeasingFinanceSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState<GLAccount[]>([]);
  const [settings, setSettings] = useState<LeasingFinanceSettingsData>(defaultSettings);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load chart of accounts for NCG Holding
      const { data: accountsData, error: accountsError } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code, account_name, account_type')
        .eq('company_id', NCG_HOLDING_ID)
        .eq('is_active', true)
        .order('account_code');

      if (accountsError) throw accountsError;
      setAccounts(accountsData || []);

      // Load existing settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('leasing_finance_settings')
        .select('*')
        .eq('company_id', NCG_HOLDING_ID)
        .maybeSingle();

      if (settingsError) throw settingsError;
      
      if (settingsData) {
        setSettings({
          ...defaultSettings,
          ...settingsData,
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const validateSettings = (): boolean => {
    const requiredFields = [
      { key: 'bank_account_id', label: 'Bank Account' },
      { key: 'leasing_liability_account_id', label: 'Leasing Liability Account' },
      { key: 'interest_expense_account_id', label: 'Interest Expense Account' },
    ];
    
    const missingFields = requiredFields.filter(f => !(settings as any)[f.key]);
    
    if (missingFields.length > 0) {
      toast.error(`Required accounts missing: ${missingFields.map(f => f.label).join(', ')}`);
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateSettings()) {
      return;
    }

    setSaving(true);
    try {
      const saveData = {
        ...settings,
        company_id: NCG_HOLDING_ID,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('leasing_finance_settings')
        .upsert(saveData, { onConflict: 'company_id' });

      if (error) throw error;
      toast.success('Leasing finance settings saved successfully');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error(`Failed to save settings: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const getAccountsByType = (types: string[]) => {
    return accounts.filter(a => types.includes(a.account_type));
  };

  const isRequiredField = (field: keyof LeasingFinanceSettingsData): boolean => {
    return [
      'bank_account_id', 
      'leasing_liability_account_id',
      'interest_expense_account_id'
    ].includes(field);
  };

  const renderAccountSelect = (
    label: string,
    field: keyof LeasingFinanceSettingsData,
    accountTypes: string[],
    placeholder: string,
    description?: string
  ) => {
    const required = isRequiredField(field);
    const value = settings[field] as string | null;
    const hasError = required && !value;

    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-1">
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        <SearchableFinanceAccountSelector
          value={value}
          onValueChange={(v) => setSettings({ ...settings, [field]: v })}
          accounts={getAccountsByType(accountTypes)}
          placeholder={placeholder}
          required={required}
          hasError={hasError}
        />
        {hasError && (
          <p className="text-xs text-destructive">This field is required</p>
        )}
      </div>
    );
  };

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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Fleet Leasing Finance Settings
          </CardTitle>
          <CardDescription>
            Configure GL account mappings and automation settings for fleet leasing/loan finance integration.
            When payments are made, the system will automatically create AP invoices and post GL entries.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Bank Account */}
          <div>
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Bank/Cash Account
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderAccountSelect(
                'Bank Account (CR on Payment)',
                'bank_account_id',
                ['asset'],
                'Select bank account for EMI payments',
                'This account will be credited when lease payments are made'
              )}
            </div>
          </div>

          <Separator />

          {/* Liability & Expense Accounts */}
          <div>
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Liability & Expense Accounts
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Configure accounts for lease liability and interest expense tracking
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderAccountSelect(
                'Leasing Liability Account (DR on Payment)',
                'leasing_liability_account_id',
                ['liability'],
                'Select leasing liability account',
                'Principal portion of EMI will debit this account'
              )}
              {renderAccountSelect(
                'Interest Expense Account (DR on Payment)',
                'interest_expense_account_id',
                ['expense'],
                'Select interest expense account',
                'Interest portion of EMI will debit this account'
              )}
            </div>
          </div>

          <Separator />

          {/* Asset Account (Optional) */}
          <div>
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Asset Account (Finance Lease)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderAccountSelect(
                'Leased Asset Account (Optional)',
                'lease_asset_account_id',
                ['asset'],
                'Select leased asset account',
                'For finance leases - initial loan recognition (DR Asset / CR Liability)'
              )}
            </div>
          </div>

          <Separator />

          {/* Automation Settings */}
          <div>
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Automation Settings
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-create Vendor from Lender</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically create a Finance vendor when a new loan is added
                  </p>
                </div>
                <Switch
                  checked={settings.auto_create_vendor}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, auto_create_vendor: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-create AP Invoice on Due Date</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically create AP invoices from the amortization schedule
                  </p>
                </div>
                <Switch
                  checked={settings.auto_create_ap_invoice}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, auto_create_ap_invoice: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-post GL on Payment</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically create GL entries when payments are marked as paid
                  </p>
                </div>
                <Switch
                  checked={settings.auto_post_gl_on_payment}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, auto_post_gl_on_payment: checked })
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Document Numbering */}
          <div>
            <h3 className="text-lg font-medium mb-4">Document Numbering Prefixes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>AP Invoice Prefix</Label>
                <Input
                  value={settings.ap_prefix}
                  onChange={(e) => setSettings({ ...settings, ap_prefix: e.target.value })}
                  placeholder="e.g., LEASE-AP"
                />
              </div>
              <div className="space-y-2">
                <Label>GL Entry Prefix</Label>
                <Input
                  value={settings.gl_prefix}
                  onChange={(e) => setSettings({ ...settings, gl_prefix: e.target.value })}
                  placeholder="e.g., LEASE-GL"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Accounting Entry Preview */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium mb-3">Accounting Entry Preview (Monthly EMI Payment)</h4>
            <div className="text-sm space-y-1 font-mono">
              <div className="flex justify-between">
                <span>DR Interest Expense</span>
                <span className="text-muted-foreground">Interest Portion</span>
              </div>
              <div className="flex justify-between">
                <span>DR Leasing Liability</span>
                <span className="text-muted-foreground">Principal Portion</span>
              </div>
              <div className="flex justify-between">
                <span className="ml-4">CR Bank Account</span>
                <span className="text-muted-foreground">Total EMI Amount</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
