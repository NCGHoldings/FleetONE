/**
 * NCG Express Finance Settings Component
 * Maps operational expense/revenue categories to GL accounts for automated posting
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
import { Loader2, Save, DollarSign, TrendingUp, TrendingDown, Settings2, Bus } from 'lucide-react';
import { SearchableFinanceAccountSelector } from './SearchableFinanceAccountSelector';

// NCG Express Company ID (standalone from NCG Holding)
const NCG_EXPRESS_COMPANY_ID = '7ece7595-8b7b-46de-8bfc-c1e8e0da7513';

interface GLAccount {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
}

interface NCGExpressSettings {
  id?: string;
  company_id?: string;
  // Revenue
  ticket_revenue_account_id: string | null;
  route_revenue_account_id: string | null;
  cash_account_id: string | null;
  // Expenses
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
  // Auto-posting
  auto_post_revenue: boolean;
  auto_post_expenses: boolean;
  revenue_prefix: string;
  expense_prefix: string;
}

const defaultSettings: NCGExpressSettings = {
  ticket_revenue_account_id: null,
  route_revenue_account_id: null,
  cash_account_id: null,
  fuel_expense_account_id: null,
  repair_expense_account_id: null,
  tyre_expense_account_id: null,
  salary_expense_account_id: null,
  police_expense_account_id: null,
  food_expense_account_id: null,
  emission_fitness_expense_account_id: null,
  permits_expense_account_id: null,
  staff_accommodation_expense_account_id: null,
  highway_expense_account_id: null,
  accident_expense_account_id: null,
  parking_expense_account_id: null,
  log_sheet_expense_account_id: null,
  vehicle_hire_expense_account_id: null,
  ntc_expense_account_id: null,
  runner_expense_account_id: null,
  short_misc_expense_account_id: null,
  temporary_permit_expense_account_id: null,
  body_wash_expense_account_id: null,
  legal_court_expense_account_id: null,
  other_expense_account_id: null,
  expense_cash_account_id: null,
  auto_post_revenue: false,
  auto_post_expenses: false,
  revenue_prefix: 'NCGE-REV',
  expense_prefix: 'NCGE-EXP',
};

export function NCGExpressFinanceSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState<GLAccount[]>([]);
  const [settings, setSettings] = useState<NCGExpressSettings>(defaultSettings);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load chart of accounts for NCG Express
      const { data: accountsData, error: accountsError } = await supabase
        .from('chart_of_accounts')
        .select('id, account_code, account_name, account_type')
        .eq('company_id', NCG_EXPRESS_COMPANY_ID)
        .eq('is_active', true)
        .order('account_code');

      if (accountsError) throw accountsError;
      setAccounts(accountsData || []);

      // Load existing settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('ncg_express_finance_settings')
        .select('*')
        .eq('company_id', NCG_EXPRESS_COMPANY_ID)
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

  const handleSave = async () => {
    // Basic validation
    if (!settings.cash_account_id || !settings.ticket_revenue_account_id) {
      toast.error('Cash Account and Ticket Revenue Account are required');
      return;
    }

    setSaving(true);
    try {
      const saveData = {
        ...settings,
        company_id: NCG_EXPRESS_COMPANY_ID,
      };

      const { error } = await supabase
        .from('ncg_express_finance_settings')
        .upsert(saveData, { onConflict: 'company_id' });

      if (error) throw error;
      toast.success('NCG Express finance settings saved successfully');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error(`Failed to save settings: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const renderAccountSelect = (
    label: string,
    field: keyof NCGExpressSettings,
    placeholder: string,
    required = false
  ) => {
    const value = settings[field] as string | null;
    const hasError = required && !value;

    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-1">
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
        <SearchableFinanceAccountSelector
          value={value}
          onValueChange={(v) => setSettings({ ...settings, [field]: v })}
          accounts={accounts}
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
            <Bus className="h-5 w-5" />
            NCG Express Public Transport Finance Settings
          </CardTitle>
          <CardDescription>
            Configure GL account mappings for automated revenue and expense posting from daily trips and bus expenses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Revenue Account Mappings */}
          <div>
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Revenue Account Mappings
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Map trip ticket income to the appropriate GL accounts. All COA accounts are available — search by code or name.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderAccountSelect(
                'Cash/Bank Account (DR)',
                'cash_account_id',
                'Select cash/bank account',
                true
              )}
              {renderAccountSelect(
                'Ticket Revenue Account (CR)',
                'ticket_revenue_account_id',
                'Select ticket revenue account',
                true
              )}
              {renderAccountSelect(
                'Route Revenue Account (Optional)',
                'route_revenue_account_id',
                'Select route-specific revenue account'
              )}
            </div>
          </div>

          <Separator />

          {/* Expense Account Mappings */}
          <div>
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              Expense Account Mappings
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Map each daily bus expense category to the appropriate GL expense account. All COA accounts are available — search by code (e.g. 500) or name.
            </p>

            {/* Cash/Bank for expenses */}
            <div className="mb-6">
              {renderAccountSelect(
                'Expense Cash/Bank Account (CR)',
                'expense_cash_account_id',
                'Select cash account for expense payments',
                true
              )}
            </div>

            {/* Expense categories grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {renderAccountSelect(
                'Fuel/Diesel Expense',
                'fuel_expense_account_id',
                'Select fuel expense account'
              )}
              {renderAccountSelect(
                'Repair & Maintenance',
                'repair_expense_account_id',
                'Select repair expense account'
              )}
              {renderAccountSelect(
                'Tyre & Tube',
                'tyre_expense_account_id',
                'Select tyre expense account'
              )}
              {renderAccountSelect(
                'Salary & Wages',
                'salary_expense_account_id',
                'Select salary expense account'
              )}
              {renderAccountSelect(
                'Police Fines',
                'police_expense_account_id',
                'Select police fines account'
              )}
              {renderAccountSelect(
                'Food & Staff Welfare',
                'food_expense_account_id',
                'Select food expense account'
              )}
              {renderAccountSelect(
                'Emission & Fitness',
                'emission_fitness_expense_account_id',
                'Select emission/fitness account'
              )}
              {renderAccountSelect(
                'Permits & Renewals',
                'permits_expense_account_id',
                'Select permits expense account'
              )}
              {renderAccountSelect(
                'Staff Accommodation',
                'staff_accommodation_expense_account_id',
                'Select accommodation account'
              )}
              {renderAccountSelect(
                'Highway Charges/Tolls',
                'highway_expense_account_id',
                'Select highway charges account'
              )}
              {renderAccountSelect(
                'Accident Compensation',
                'accident_expense_account_id',
                'Select accident expense account'
              )}
              {renderAccountSelect(
                'Parking Charges',
                'parking_expense_account_id',
                'Select parking expense account'
              )}
              {renderAccountSelect(
                'Log Sheet',
                'log_sheet_expense_account_id',
                'Select log sheet expense account'
              )}
              {renderAccountSelect(
                'Vehicle Hire',
                'vehicle_hire_expense_account_id',
                'Select vehicle hire account'
              )}
              {renderAccountSelect(
                'NTC Charges',
                'ntc_expense_account_id',
                'Select NTC expense account'
              )}
              {renderAccountSelect(
                'Runner',
                'runner_expense_account_id',
                'Select runner expense account'
              )}
              {renderAccountSelect(
                'Short/Misc',
                'short_misc_expense_account_id',
                'Select short/misc account'
              )}
              {renderAccountSelect(
                'Temporary Permit',
                'temporary_permit_expense_account_id',
                'Select temp permit account'
              )}
              {renderAccountSelect(
                'Body Wash',
                'body_wash_expense_account_id',
                'Select body wash account'
              )}
              {renderAccountSelect(
                'Legal/Court',
                'legal_court_expense_account_id',
                'Select legal/court account'
              )}
              {renderAccountSelect(
                'Other Expenses',
                'other_expense_account_id',
                'Select other expenses account'
              )}
            </div>
          </div>

          <Separator />

          {/* Automation Settings */}
          <div>
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Automation Settings
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-post Revenue on Trip Entry</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically create GL entry when daily trip income is saved
                  </p>
                </div>
                <Switch
                  checked={settings.auto_post_revenue}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, auto_post_revenue: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-post Expenses on Save</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically create GL entry when daily bus expenses are saved
                  </p>
                </div>
                <Switch
                  checked={settings.auto_post_expenses}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, auto_post_expenses: checked })
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Document Numbering */}
          <div>
            <h3 className="text-lg font-medium mb-4">Journal Entry Prefixes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Revenue JE Prefix</Label>
                <Input
                  value={settings.revenue_prefix}
                  onChange={(e) => setSettings({ ...settings, revenue_prefix: e.target.value })}
                  placeholder="e.g., NCGE-REV"
                />
              </div>
              <div className="space-y-2">
                <Label>Expense JE Prefix</Label>
                <Input
                  value={settings.expense_prefix}
                  onChange={(e) => setSettings({ ...settings, expense_prefix: e.target.value })}
                  placeholder="e.g., NCGE-EXP"
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