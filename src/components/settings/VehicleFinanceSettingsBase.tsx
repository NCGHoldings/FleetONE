/**
 * Base Vehicle Finance Settings Component
 * Shared by Yutong, Sinotruck, and Light Vehicle finance settings
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Save, DollarSign, Building2, CreditCard, Calculator } from 'lucide-react';
import { 
  VehicleModule, 
  VehicleFinanceSettings,
  fetchVehicleFinanceSettings,
  saveVehicleFinanceSettings,
  NCG_HOLDING_ID 
} from '@/hooks/useVehicleSalesFinance';

interface VehicleFinanceSettingsBaseProps {
  module: VehicleModule;
  title: string;
  description: string;
}

interface GLAccount {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
}

export function VehicleFinanceSettingsBase({ 
  module, 
  title, 
  description 
}: VehicleFinanceSettingsBaseProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState<GLAccount[]>([]);
  const [settings, setSettings] = useState<Partial<VehicleFinanceSettings>>({
    sales_revenue_account_id: null,
    spare_parts_revenue_account_id: null,
    trade_receivable_account_id: null,
    customer_advance_account_id: null,
    default_bank_account_id: null,
    lc_bank_account_id: null,
    discount_expense_account_id: null,
    commission_expense_account_id: null,
    vat_output_account_id: null,
    wht_payable_account_id: null,
    auto_post_on_verify: true,
    auto_create_customer: true,
    invoice_prefix: `${module.toUpperCase().substring(0, 3)}-INV`,
    receipt_prefix: `${module.toUpperCase().substring(0, 3)}-RCT`,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load chart of accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code, account_name, account_type')
        .eq('company_id', NCG_HOLDING_ID)
        .eq('is_active', true)
        .order('account_code');

      if (accountsError) throw accountsError;
      setAccounts(accountsData || []);

      // Load existing settings
      const existingSettings = await fetchVehicleFinanceSettings(module, NCG_HOLDING_ID);
      if (existingSettings) {
        setSettings(existingSettings);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await saveVehicleFinanceSettings(module, settings, NCG_HOLDING_ID);
      if (result.success) {
        toast.success('Finance settings saved successfully');
      } else {
        throw new Error(result.error);
      }
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

  const renderAccountSelect = (
    label: string,
    field: keyof VehicleFinanceSettings,
    accountTypes: string[],
    placeholder: string
  ) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select
        value={settings[field] as string || ''}
        onValueChange={(value) => setSettings({ ...settings, [field]: value || null })}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">-- Not Configured --</SelectItem>
          {getAccountsByType(accountTypes).map((account) => (
            <SelectItem key={account.id} value={account.id}>
              {account.account_code} - {account.account_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

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
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Revenue Accounts */}
          <div>
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Revenue Accounts
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderAccountSelect(
                'Sales Revenue Account',
                'sales_revenue_account_id',
                ['revenue', 'income'],
                'Select revenue account'
              )}
              {renderAccountSelect(
                'Spare Parts Revenue Account',
                'spare_parts_revenue_account_id',
                ['revenue', 'income'],
                'Select spare parts revenue account'
              )}
            </div>
          </div>

          <Separator />

          {/* Receivable Accounts */}
          <div>
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Receivable & Liability Accounts
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderAccountSelect(
                'Trade Receivable Account',
                'trade_receivable_account_id',
                ['asset'],
                'Select trade receivable account'
              )}
              {renderAccountSelect(
                'Customer Advance Receipt (Liability)',
                'customer_advance_account_id',
                ['liability'],
                'Select customer advance account'
              )}
            </div>
          </div>

          <Separator />

          {/* Bank Accounts */}
          <div>
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Bank/Cash Accounts
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderAccountSelect(
                'Default Bank Account',
                'default_bank_account_id',
                ['asset'],
                'Select bank account'
              )}
              {renderAccountSelect(
                'LC Bank Account',
                'lc_bank_account_id',
                ['asset'],
                'Select LC bank account'
              )}
            </div>
          </div>

          <Separator />

          {/* Expense Accounts */}
          <div>
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Expense & Tax Accounts
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderAccountSelect(
                'Discount Expense Account',
                'discount_expense_account_id',
                ['expense'],
                'Select discount expense account'
              )}
              {renderAccountSelect(
                'Commission Expense Account',
                'commission_expense_account_id',
                ['expense'],
                'Select commission expense account'
              )}
              {renderAccountSelect(
                'VAT Output Account',
                'vat_output_account_id',
                ['liability'],
                'Select VAT output account'
              )}
              {renderAccountSelect(
                'WHT Payable Account',
                'wht_payable_account_id',
                ['liability'],
                'Select WHT payable account'
              )}
            </div>
          </div>

          <Separator />

          {/* Automation Settings */}
          <div>
            <h3 className="text-lg font-medium mb-4">Automation Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-post GL on Payment Verification</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically create GL entries when payments are verified
                  </p>
                </div>
                <Switch
                  checked={settings.auto_post_on_verify}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, auto_post_on_verify: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-create Finance Customer</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically create Finance module customer on first payment
                  </p>
                </div>
                <Switch
                  checked={settings.auto_create_customer}
                  onCheckedChange={(checked) => 
                    setSettings({ ...settings, auto_create_customer: checked })
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Numbering Prefixes */}
          <div>
            <h3 className="text-lg font-medium mb-4">Document Numbering</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Invoice Prefix</Label>
                <Input
                  value={settings.invoice_prefix || ''}
                  onChange={(e) => setSettings({ ...settings, invoice_prefix: e.target.value })}
                  placeholder="e.g., YUT-INV"
                />
              </div>
              <div className="space-y-2">
                <Label>Receipt Prefix</Label>
                <Input
                  value={settings.receipt_prefix || ''}
                  onChange={(e) => setSettings({ ...settings, receipt_prefix: e.target.value })}
                  placeholder="e.g., YUT-RCT"
                />
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
