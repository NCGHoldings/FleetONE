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
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Save, DollarSign, Building2, CreditCard, Calculator, RefreshCw } from 'lucide-react';
import { SearchableFinanceAccountSelector } from './SearchableFinanceAccountSelector';
import { 
  VehicleModule, 
  VehicleFinanceSettings,
  fetchVehicleFinanceSettings,
  saveVehicleFinanceSettings,
  NCG_HOLDING_ID 
} from '@/hooks/useVehicleSalesFinance';
import { 
  useActiveCustomerCategories, 
  useUpdateCustomerCategory,
  CustomerCategory 
} from '@/hooks/useCustomerCategories';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SearchableAccountSelector } from '../accounting/shared/SearchableAccountSelector';

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

  const { data: customerCategories, isLoading: categoriesLoading } = useActiveCustomerCategories();
  const updateCategoryMutation = useUpdateCustomerCategory();

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
      
      // Temporary debug log to inspect all loaded accounts
      console.log('DEBUG: Loaded Chart of Accounts:', accountsData?.map(a => `${a.account_code} - ${a.account_name} (${a.account_type})`));

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

  /**
   * PROPER ACCOUNTING VALIDATION:
   * All 4 key accounts are required for the complete vehicle sales finance flow:
   * 1. Bank Account - Receives cash payments (Asset)
   * 2. Customer Advance - Holds advance payments until invoice (Liability)
   * 3. Sales Revenue - Recognizes revenue when invoice approved (Revenue)
   * 4. Trade Receivable - Tracks outstanding invoices (Asset)
   */
  const validateSettings = (): boolean => {
    const requiredFields = [
      { key: 'customer_advance_account_id', label: 'Customer Advance Account' },
      { key: 'sales_revenue_account_id', label: 'Sales Revenue Account' },
    ];
    
    const missingFields = requiredFields.filter(f => !(settings as any)[f.key]);
    
    if (missingFields.length > 0) {
      toast.error(`Required accounts missing: ${missingFields.map(f => f.label).join(', ')}`);
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    // Validate required fields before saving
    if (!validateSettings()) {
      return;
    }
    
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
    if (types.includes('all')) return accounts;
    
    return accounts.filter(a => {
      if (!a.account_type) {
        // If an account has no type, we still want it to be selectable if 'all' isn't used?
        // Let's include it if we are being generous, or keep it strict. 
        // We'll allow it if 'liability' was requested just in case it's a generic unassigned account.
        return types.some(t => t === 'liability');
      }
      const accType = a.account_type.toLowerCase();
      // Match partial root words to handle pluralizations (e.g., liability vs liabilities, asset vs assets)
      return types.some(t => {
        const root = t.toLowerCase().replace(/y$/, 'i').replace(/s$/, '');
        return accType.includes(root) || accType.includes(t.toLowerCase());
      });
    });
  };

  const isRequiredField = (field: keyof VehicleFinanceSettings): boolean => {
    return [
      'customer_advance_account_id',
      'sales_revenue_account_id',
    ].includes(field);
  };

  const renderAccountSelect = (
    label: string,
    field: keyof VehicleFinanceSettings,
    accountTypes: string[],
    placeholder: string
  ) => {
    const required = isRequiredField(field);
    const hasValue = !!settings[field];
    
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-1">
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
        <SearchableFinanceAccountSelector
          value={settings[field] as string | null}
          onValueChange={(value) => setSettings({ ...settings, [field]: value })}
          accounts={getAccountsByType(accountTypes)}
          placeholder={placeholder}
          required={required}
          hasError={required && !hasValue}
        />
        {required && !hasValue && (
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
                'Trade Receivable Account (Fallback)',
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
                'Default Bank Account (Fallback)',
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
                ['all'],
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

          <Separator />

          {/* Customer Category Mappings */}
          <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-primary" />
                  Customer Category Mappings
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure specific GL routing for standard categories. Global settings above will act as fallbacks.
                </p>
              </div>
              {updateCategoryMutation.isPending && (
                <div className="flex items-center gap-2 text-xs text-primary animate-pulse">
                  <RefreshCw className="h-3 w-3 animate-spin" />
                  Saving mapping...
                </div>
              )}
            </div>
            
            {categoriesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
              </div>
            ) : (
              <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <Table className="erp-table-professional">
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-[180px] font-bold">Category</TableHead>
                      <TableHead className="font-bold">AR Account (Primary)</TableHead>
                      <TableHead className="font-bold">Revenue Account</TableHead>
                      <TableHead className="font-bold">Advance Account</TableHead>
                      <TableHead className="font-bold">Bank Account (Primary)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerCategories?.filter(cat => 
                      ['internal', 'external', 'intercompany', 'inter company'].some(term => 
                        cat.category_name.toLowerCase().includes(term)
                      )
                    ).map((category) => (
                      <TableRow key={category.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-medium">
                          <div className="text-sm font-semibold text-primary">{category.category_name}</div>
                          <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{category.category_code}</div>
                        </TableCell>
                        <TableCell className="min-w-[200px]">
                          <SearchableAccountSelector
                            value={category.ar_account_id}
                            onValueChange={(value) => 
                              updateCategoryMutation.mutate({ id: category.id, ar_account_id: value })
                            }
                            accounts={getAccountsByType(['asset'])}
                            placeholder="Select AR Account"
                          />
                        </TableCell>
                        <TableCell className="min-w-[200px]">
                          <SearchableAccountSelector
                            value={category.revenue_account_id}
                            onValueChange={(value) => 
                              updateCategoryMutation.mutate({ id: category.id, revenue_account_id: value })
                            }
                            accounts={getAccountsByType(['revenue', 'income'])}
                            placeholder="Select Revenue Account"
                          />
                        </TableCell>
                        <TableCell className="min-w-[200px]">
                          <SearchableAccountSelector
                            value={category.advance_account_id}
                            onValueChange={(value) => 
                              updateCategoryMutation.mutate({ id: category.id, advance_account_id: value })
                            }
                            accounts={getAccountsByType(['liability'])}
                            placeholder="Select Advance Account"
                          />
                        </TableCell>
                        <TableCell className="min-w-[200px]">
                          <SearchableAccountSelector
                            value={category.bank_account_id}
                            onValueChange={(value) => 
                              updateCategoryMutation.mutate({ id: category.id, bank_account_id: value })
                            }
                            accounts={getAccountsByType(['asset'])}
                            placeholder="Select Bank Account"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!customerCategories || customerCategories.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12 text-muted-foreground italic bg-muted/10">
                          <div className="flex flex-col items-center gap-2">
                            <Calculator className="h-8 w-8 opacity-20" />
                            <p>No customer categories found. Configure them in Customer settings.</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
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
