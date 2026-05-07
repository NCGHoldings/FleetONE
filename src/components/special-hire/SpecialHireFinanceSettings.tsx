import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Settings2, 
  Building2, 
  CreditCard, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Save, 
  Receipt,
  ArrowRight,
  Wallet,
  TrendingUp,
  RefreshCw,
  Info,
  Wand2,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { useSpecialHireFinanceSettings, useUpdateSpecialHireFinanceSettings } from "@/hooks/useSpecialHireFinance";
import { useChartOfAccounts } from "@/hooks/useAccountingData";
import { SearchableFinanceAccountSelector } from "@/components/settings/SearchableFinanceAccountSelector";
import { SettingsLock } from "@/components/settings/SettingsLock";

interface SettingsState {
  // Revenue
  revenue_internal_account_id: string;
  revenue_external_account_id: string;
  // Receivable
  trade_receivable_account_id: string;
  // Customer Advance (Liability)
  customer_advance_account_id: string;
  // Bank/Cash
  default_bank_account_id: string;
  // Expenses
  discount_expense_account_id: string;
  commission_expense_account_id: string;
  refund_expense_account_id: string;
  // Tax
  vat_output_account_id: string;
  wht_payable_account_id: string;
  // Settings
  auto_post_advance_payments: boolean;
  auto_post_invoices: boolean;
  auto_post_balance_payments: boolean;
  invoice_prefix: string;
  advance_receipt_prefix: string;
  // Quotation Bank Details
  quotation_bank_name: string;
  quotation_account_name: string;
  quotation_account_no: string;
}

export function SpecialHireFinanceSettings() {
  const { data: existingSettings, isLoading: settingsLoading } = useSpecialHireFinanceSettings();
  const { data: chartOfAccounts } = useChartOfAccounts();
  const updateSettings = useUpdateSpecialHireFinanceSettings();

  const [settings, setSettings] = useState<SettingsState>({
    revenue_internal_account_id: "",
    revenue_external_account_id: "",
    trade_receivable_account_id: "",
    customer_advance_account_id: "",
    default_bank_account_id: "",
    discount_expense_account_id: "",
    commission_expense_account_id: "",
    refund_expense_account_id: "",
    vat_output_account_id: "",
    wht_payable_account_id: "",
    auto_post_advance_payments: false,
    auto_post_invoices: false,
    auto_post_balance_payments: false,
    invoice_prefix: "SPH-INV",
    advance_receipt_prefix: "SPH-ADV",
    quotation_bank_name: "Commercial Bank - Nugegoda",
    quotation_account_name: "NCG Holding (Pvt) Ltd",
    quotation_account_no: "1001077213",
  });

  // Load existing settings
  useEffect(() => {
    if (existingSettings) {
      setSettings({
        revenue_internal_account_id: existingSettings.revenue_internal_account_id || "",
        revenue_external_account_id: existingSettings.revenue_external_account_id || "",
        trade_receivable_account_id: existingSettings.trade_receivable_account_id || "",
        customer_advance_account_id: existingSettings.customer_advance_account_id || "",
        default_bank_account_id: existingSettings.default_bank_account_id || "",
        discount_expense_account_id: existingSettings.discount_expense_account_id || "",
        commission_expense_account_id: existingSettings.commission_expense_account_id || "",
        refund_expense_account_id: existingSettings.refund_expense_account_id || "",
        vat_output_account_id: existingSettings.vat_output_account_id || "",
        wht_payable_account_id: existingSettings.wht_payable_account_id || "",
        auto_post_advance_payments: (existingSettings as any).auto_post_advances ?? (existingSettings as any).auto_post_advance_payments ?? true,
        auto_post_invoices: existingSettings.auto_post_invoices ?? true,
        auto_post_balance_payments: existingSettings.auto_post_balance_payments ?? true,
        invoice_prefix: existingSettings.invoice_prefix || "SPH-INV",
        advance_receipt_prefix: existingSettings.advance_receipt_prefix || "SPH-ADV",
        quotation_bank_name: (existingSettings as any).quotation_bank_name || "Commercial Bank - Nugegoda",
        quotation_account_name: (existingSettings as any).quotation_account_name || "NCG Holding (Pvt) Ltd",
        quotation_account_no: (existingSettings as any).quotation_account_no || "1001077213"
      });
    }
  }, [existingSettings]);

  const handleSave = async () => {
    try {
      // Create a clean payload mapping state to DB columns
      const payload = {
        revenue_internal_account_id: settings.revenue_internal_account_id,
        revenue_external_account_id: settings.revenue_external_account_id,
        trade_receivable_account_id: settings.trade_receivable_account_id,
        customer_advance_account_id: settings.customer_advance_account_id,
        default_bank_account_id: settings.default_bank_account_id,
        discount_expense_account_id: settings.discount_expense_account_id,
        commission_expense_account_id: settings.commission_expense_account_id,
        refund_expense_account_id: settings.refund_expense_account_id,
        vat_output_account_id: settings.vat_output_account_id,
        wht_payable_account_id: settings.wht_payable_account_id,
        auto_post_advance_payments: settings.auto_post_advance_payments,
        auto_post_invoices: settings.auto_post_invoices,
        auto_post_balance_payments: settings.auto_post_balance_payments,
        invoice_prefix: settings.invoice_prefix,
        advance_receipt_prefix: settings.advance_receipt_prefix,
        quotation_bank_name: settings.quotation_bank_name,
        quotation_account_name: settings.quotation_account_name,
        quotation_account_no: settings.quotation_account_no,
      };
      await updateSettings.mutateAsync(payload as any);
      toast.success("Settings saved successfully.");
    } catch (e: any) {
      toast.error("Failed to save settings: " + e.message);
    }
  };

  const handleAutoFill = () => {
    if (!chartOfAccounts || chartOfAccounts.length === 0) {
      toast.error("Accounts list is not loaded yet.");
      return;
    }
    
    const matchAccount = (keywords: string[], type?: string) => {
      return chartOfAccounts.find(a => 
        (!type || a.account_type === type) && 
        keywords.some(k => a.account_name.toLowerCase().includes(k))
      )?.id || "";
    };

    const revInternal = matchAccount(["special hire revenue - internal", "internal revenue"], "revenue");
    const revExternal = matchAccount(["special hire revenue - external", "external revenue", "sales", "revenue"], "revenue");
    const ar = matchAccount(["trade receivable", "accounts receivable", "trade debtor"], "asset");
    const adv = matchAccount(["customer advance", "advance receipt", "advance"], "liability");
    const bank = matchAccount(["bank", "cash", "petty cash"], "asset");

    setSettings(prev => ({
      ...prev,
      revenue_internal_account_id: prev.revenue_internal_account_id || revInternal,
      revenue_external_account_id: prev.revenue_external_account_id || revExternal,
      trade_receivable_account_id: prev.trade_receivable_account_id || ar,
      customer_advance_account_id: prev.customer_advance_account_id || adv,
      default_bank_account_id: prev.default_bank_account_id || bank,
    }));
    toast.success("Default accounts auto-filled. Please review and Save.");
  };

  const isConfigured = 
    settings.trade_receivable_account_id && 
    settings.customer_advance_account_id && 
    settings.default_bank_account_id && 
    (settings.revenue_internal_account_id || settings.revenue_external_account_id);

  if (settingsLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading finance settings...</div>;
  }

  return (
    <div className="space-y-6">
      {!isConfigured && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Configuration Required</AlertTitle>
          <AlertDescription>
            Please configure the core GL accounts (Trade Receivable, Customer Advance, Bank Account, and Revenue) to enable automatic posting to the General Ledger.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Revenue &amp; Receivable Account Mappings</CardTitle>
            <CardDescription>
              Configure accounts for recognizing Special Hire revenue and tracking customer receivables.
            </CardDescription>
          </div>
          <Button variant="secondary" onClick={handleAutoFill} size="sm" className="bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200">
            <Wand2 className="h-4 w-4 mr-2" />
            Auto-Fill Accounts
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SettingsLock label="Special Hire Revenue - Internal (Credit on Invoice)" valueExists={!!settings.revenue_internal_account_id}>
              <SearchableFinanceAccountSelector
                value={settings.revenue_internal_account_id || null}
                onValueChange={(value) => 
                  setSettings({ ...settings, revenue_internal_account_id: value || "" })
                }
                accounts={chartOfAccounts || []}
                placeholder="Select internal revenue account..."
              />
              <p className="text-xs text-muted-foreground mt-1">Used for internal/inter-company special hire bookings</p>
            </SettingsLock>
            
            <SettingsLock label="Special Hire Revenue - External (Credit on Invoice)" valueExists={!!settings.revenue_external_account_id}>
              <SearchableFinanceAccountSelector
                value={settings.revenue_external_account_id || null}
                onValueChange={(value) => 
                  setSettings({ ...settings, revenue_external_account_id: value || "" })
                }
                accounts={chartOfAccounts || []}
                placeholder="Select external revenue account..."
              />
              <p className="text-xs text-muted-foreground mt-1">Used for external customer special hire bookings</p>
            </SettingsLock>

            <SettingsLock label="Trade Receivable Account (Debit on Invoice)" valueExists={!!settings.trade_receivable_account_id}>
              <SearchableFinanceAccountSelector
                value={settings.trade_receivable_account_id || null}
                onValueChange={(value) => 
                  setSettings({ ...settings, trade_receivable_account_id: value || "" })
                }
                accounts={chartOfAccounts || []}
                placeholder="Select receivable account..."
              />
              <p className="text-xs text-muted-foreground mt-1">Debited when invoice is generated, credited when payment received</p>
            </SettingsLock>

            <SettingsLock label="Customer Advance Receipt Account (Credit on Advance)" valueExists={!!settings.customer_advance_account_id}>
              <SearchableFinanceAccountSelector
                value={settings.customer_advance_account_id || null}
                onValueChange={(value) => 
                  setSettings({ ...settings, customer_advance_account_id: value || "" })
                }
                accounts={chartOfAccounts || []}
                placeholder="Select advance account..."
              />
              <p className="text-xs text-muted-foreground mt-1">Liability account - Credited when advance received, debited when applied to invoice</p>
            </SettingsLock>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bank/Cash Account Mapping</CardTitle>
          <CardDescription>
            Configure the default bank account for receiving Special Hire payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SettingsLock label="Default Bank/Cash Account (Debit on Payment Received)" valueExists={!!settings.default_bank_account_id}>
              <SearchableFinanceAccountSelector
                value={settings.default_bank_account_id || null}
                onValueChange={(value) => 
                  setSettings({ ...settings, default_bank_account_id: value || "" })
                }
                accounts={chartOfAccounts || []}
                placeholder="Select bank/cash account..."
              />
              <p className="text-xs text-muted-foreground mt-1">This account is debited when advance or balance payments are received</p>
            </SettingsLock>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expense Account Mappings</CardTitle>
          <CardDescription>
            Configure accounts for discounts, commissions, and refunds
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Discount Expense Account</Label>
              <SearchableFinanceAccountSelector
                value={settings.discount_expense_account_id || null}
                onValueChange={(value) => 
                  setSettings({ ...settings, discount_expense_account_id: value || "" })
                }
                accounts={chartOfAccounts || []}
                placeholder="Select discount account..."
              />
              <p className="text-xs text-muted-foreground">Debited when discounts are given</p>
            </div>

            <div className="space-y-2">
              <Label>Commission Expense Account</Label>
              <SearchableFinanceAccountSelector
                value={settings.commission_expense_account_id || null}
                onValueChange={(value) => 
                  setSettings({ ...settings, commission_expense_account_id: value || "" })
                }
                accounts={chartOfAccounts || []}
                placeholder="Select commission account..."
              />
              <p className="text-xs text-muted-foreground">Debited when referral commissions are paid</p>
            </div>

            <div className="space-y-2">
              <Label>Refund Expense Account</Label>
              <SearchableFinanceAccountSelector
                value={settings.refund_expense_account_id || null}
                onValueChange={(value) => 
                  setSettings({ ...settings, refund_expense_account_id: value || "" })
                }
                accounts={chartOfAccounts || []}
                placeholder="Select refund account..."
              />
              <p className="text-xs text-muted-foreground">Used for tracking refund expenses</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Tax Account Mappings (Inclusive 18% VAT)
          </CardTitle>
          <CardDescription>
            Configure accounts for VAT and Withholding Tax. When set, revenue is automatically split (Total / 1.18).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>VAT Output Account (Credit on Invoice)</Label>
              <SearchableFinanceAccountSelector
                value={settings.vat_output_account_id || null}
                onValueChange={(value) => 
                  setSettings({ ...settings, vat_output_account_id: value || "" })
                }
                accounts={chartOfAccounts || []}
                placeholder="Select VAT account..."
              />
              <p className="text-xs text-muted-foreground">If set, invoice totals will be treated as 118% (100 Base + 18 VAT)</p>
            </div>

            <div className="space-y-2">
              <Label>WHT Payable Account (Optional)</Label>
              <SearchableFinanceAccountSelector
                value={settings.wht_payable_account_id || null}
                onValueChange={(value) => 
                  setSettings({ ...settings, wht_payable_account_id: value || "" })
                }
                accounts={chartOfAccounts || []}
                placeholder="Select WHT account..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Automation &amp; Workflow Rules</CardTitle>
          <CardDescription>
            Configure which events trigger automatic journal entries in the General Ledger
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-base">Auto-Post Advance Receipts</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically create journal entries when advance payments are received
                </p>
              </div>
              <Switch
                checked={settings.auto_post_advance_payments}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, auto_post_advance_payments: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-base">Auto-Post Invoices</Label>
                <p className="text-sm text-muted-foreground">
                  Recognize revenue automatically upon trip completion/invoice generation
                </p>
              </div>
              <Switch
                checked={settings.auto_post_invoices}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, auto_post_invoices: checked })
                }
              />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Invoice Number Prefix</Label>
              <Input
                value={settings.invoice_prefix}
                onChange={(e) =>
                  setSettings({ ...settings, invoice_prefix: e.target.value })
                }
                placeholder="SPH-INV"
              />
            </div>
            <div className="space-y-2">
              <Label>Advance Receipt Number Prefix</Label>
              <Input
                value={settings.advance_receipt_prefix}
                onChange={(e) =>
                  setSettings({ ...settings, advance_receipt_prefix: e.target.value })
                }
                placeholder="SPH-ADV"
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Quotation Bank Details (Printed on PDF)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Bank Name &amp; Branch</Label>
                <Input
                  value={settings.quotation_bank_name}
                  onChange={(e) =>
                    setSettings({ ...settings, quotation_bank_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Account Name</Label>
                <Input
                  value={settings.quotation_account_name}
                  onChange={(e) =>
                    setSettings({ ...settings, quotation_account_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Account Number</Label>
                <Input
                  value={settings.quotation_account_no}
                  onChange={(e) =>
                    setSettings({ ...settings, quotation_account_no: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={updateSettings.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
