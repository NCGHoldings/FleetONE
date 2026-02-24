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
  Info
} from "lucide-react";
import { useSpecialHireFinanceSettings, useUpdateSpecialHireFinanceSettings } from "@/hooks/useSpecialHireFinance";
import { useChartOfAccounts } from "@/hooks/useAccountingData";
import { SearchableFinanceAccountSelector } from "@/components/settings/SearchableFinanceAccountSelector";

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
        auto_post_advance_payments: existingSettings.auto_post_advance_payments || false,
        auto_post_invoices: existingSettings.auto_post_invoices || false,
        auto_post_balance_payments: existingSettings.auto_post_balance_payments || false,
        invoice_prefix: existingSettings.invoice_prefix || "SPH-INV",
        advance_receipt_prefix: existingSettings.advance_receipt_prefix || "SPH-ADV",
      });
    }
  }, [existingSettings]);

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync(settings);
    } catch (error) {
      // Error handled by mutation
    }
  };

  // Filter accounts by type
  const assetAccounts = chartOfAccounts?.filter((a) => a.account_type === "asset") || [];
  const liabilityAccounts = chartOfAccounts?.filter((a) => a.account_type === "liability") || [];
  const revenueAccounts = chartOfAccounts?.filter((a) => a.account_type === "revenue") || [];
  const expenseAccounts = chartOfAccounts?.filter((a) => a.account_type === "expense") || [];
  
  // Specific filtered lists
  const receivableAccounts = assetAccounts.filter(
    (a) => a.account_name?.toLowerCase().includes("receivable")
  );
  const bankCashAccounts = assetAccounts.filter(
    (a) => a.account_name?.toLowerCase().includes("cash") || 
           a.account_name?.toLowerCase().includes("bank") ||
           a.account_code?.startsWith("13")
  );
  const advanceAccounts = liabilityAccounts.filter(
    (a) => a.account_name?.toLowerCase().includes("advance") ||
           a.account_name?.toLowerCase().includes("deposit")
  );

  // Check if core accounts are configured
  const isCoreConfigured = 
    settings.trade_receivable_account_id &&
    settings.customer_advance_account_id &&
    settings.default_bank_account_id &&
    (settings.revenue_internal_account_id || settings.revenue_external_account_id);

  if (settingsLoading) {
    return <div className="flex items-center justify-center h-64">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Configuration Status */}
      {!isCoreConfigured && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Configuration Required</AlertTitle>
          <AlertDescription>
            Please configure the core GL accounts (Trade Receivable, Customer Advance, Bank Account, and Revenue) 
            to enable automatic posting to the General Ledger.
          </AlertDescription>
        </Alert>
      )}

      {/* Revenue & Receivable Mappings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Revenue & Receivable Account Mappings
          </CardTitle>
          <CardDescription>
            Configure accounts for recognizing Special Hire revenue and tracking customer receivables
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Revenue - Internal */}
            <div className="space-y-2">
              <Label>Special Hire Revenue - Internal (Credit on Invoice)</Label>
              <SearchableFinanceAccountSelector
                value={settings.revenue_internal_account_id || null}
                onValueChange={(value) =>
                  setSettings({ ...settings, revenue_internal_account_id: value || "" })
                }
                accounts={revenueAccounts}
                placeholder="Select internal revenue account"
              />
              <p className="text-xs text-muted-foreground">
                Used for internal/inter-company special hire bookings
              </p>
            </div>

            {/* Revenue - External */}
            <div className="space-y-2">
              <Label>Special Hire Revenue - External (Credit on Invoice)</Label>
              <SearchableFinanceAccountSelector
                value={settings.revenue_external_account_id || null}
                onValueChange={(value) =>
                  setSettings({ ...settings, revenue_external_account_id: value || "" })
                }
                accounts={revenueAccounts}
                placeholder="Select external revenue account"
              />
              <p className="text-xs text-muted-foreground">
                Used for external customer special hire bookings
              </p>
            </div>

            {/* Trade Receivable */}
            <div className="space-y-2">
              <Label>Trade Receivable Account (Debit on Invoice)</Label>
              <SearchableFinanceAccountSelector
                value={settings.trade_receivable_account_id || null}
                onValueChange={(value) =>
                  setSettings({ ...settings, trade_receivable_account_id: value || "" })
                }
                accounts={receivableAccounts.length > 0 ? receivableAccounts : assetAccounts}
                placeholder="Select receivable account"
              />
              <p className="text-xs text-muted-foreground">
                Debited when invoice is generated, credited when payment received
              </p>
            </div>

            {/* Customer Advance (Liability) */}
            <div className="space-y-2">
              <Label>Customer Advance Receipt Account (Credit on Advance)</Label>
              <SearchableFinanceAccountSelector
                value={settings.customer_advance_account_id || null}
                onValueChange={(value) =>
                  setSettings({ ...settings, customer_advance_account_id: value || "" })
                }
                accounts={advanceAccounts.length > 0 ? advanceAccounts : liabilityAccounts}
                placeholder="Select advance receipt account"
              />
              <p className="text-xs text-muted-foreground">
                <strong>Liability account</strong> - Credited when advance received, debited when applied to invoice
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bank/Cash Account */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Bank/Cash Account Mapping
          </CardTitle>
          <CardDescription>
            Configure the default bank account for receiving Special Hire payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-md space-y-2">
            <Label>Default Bank/Cash Account (Debit on Payment Received)</Label>
            <SearchableFinanceAccountSelector
              value={settings.default_bank_account_id || null}
              onValueChange={(value) =>
                setSettings({ ...settings, default_bank_account_id: value || "" })
              }
              accounts={bankCashAccounts.length > 0 ? bankCashAccounts : assetAccounts}
              placeholder="Select bank/cash account"
            />
            <p className="text-xs text-muted-foreground">
              This account is debited when advance or balance payments are received
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Expense Accounts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Expense Account Mappings
          </CardTitle>
          <CardDescription>
            Configure accounts for discounts, commissions, and refunds
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Discount Expense */}
            <div className="space-y-2">
              <Label>Discount Expense Account</Label>
              <SearchableFinanceAccountSelector
                value={settings.discount_expense_account_id || null}
                onValueChange={(value) =>
                  setSettings({ ...settings, discount_expense_account_id: value || "" })
                }
                accounts={expenseAccounts}
                placeholder="Select discount account"
              />
              <p className="text-xs text-muted-foreground">
                Debited when discounts are given
              </p>
            </div>

            {/* Commission Expense */}
            <div className="space-y-2">
              <Label>Commission Expense Account</Label>
              <SearchableFinanceAccountSelector
                value={settings.commission_expense_account_id || null}
                onValueChange={(value) =>
                  setSettings({ ...settings, commission_expense_account_id: value || "" })
                }
                accounts={expenseAccounts}
                placeholder="Select commission account"
              />
              <p className="text-xs text-muted-foreground">
                Debited when referral commissions are paid
              </p>
            </div>

            {/* Refund Expense */}
            <div className="space-y-2">
              <Label>Refund Expense Account</Label>
              <SearchableFinanceAccountSelector
                value={settings.refund_expense_account_id || null}
                onValueChange={(value) =>
                  setSettings({ ...settings, refund_expense_account_id: value || "" })
                }
                accounts={expenseAccounts}
                placeholder="Select refund account"
              />
              <p className="text-xs text-muted-foreground">
                Used for tracking refund expenses
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tax Accounts (Optional) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Tax Account Mappings (Optional)
          </CardTitle>
          <CardDescription>
            Configure accounts for VAT and withholding tax if applicable
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* VAT Output */}
            <div className="space-y-2">
              <Label>VAT Output Account</Label>
              <SearchableFinanceAccountSelector
                value={settings.vat_output_account_id || null}
                onValueChange={(value) =>
                  setSettings({ ...settings, vat_output_account_id: value || "" })
                }
                accounts={liabilityAccounts}
                placeholder="Select VAT output account"
              />
              <p className="text-xs text-muted-foreground">
                Credited when VAT is charged on invoices
              </p>
            </div>

            {/* WHT Payable */}
            <div className="space-y-2">
              <Label>WHT Payable Account</Label>
              <SearchableFinanceAccountSelector
                value={settings.wht_payable_account_id || null}
                onValueChange={(value) =>
                  setSettings({ ...settings, wht_payable_account_id: value || "" })
                }
                accounts={liabilityAccounts}
                placeholder="Select WHT payable account"
              />
              <p className="text-xs text-muted-foreground">
                Used when withholding tax is applicable
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auto-Posting Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Auto-Posting & Numbering Settings
          </CardTitle>
          <CardDescription>
            Configure automatic GL posting and document numbering
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Auto-posting toggles */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-base">Auto-Post Advance Payments</Label>
                <p className="text-sm text-muted-foreground">
                  Post to GL when advance is confirmed
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
                  Post to GL when invoice is generated
                </p>
              </div>
              <Switch
                checked={settings.auto_post_invoices}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, auto_post_invoices: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-base">Auto-Post Balance Payments</Label>
                <p className="text-sm text-muted-foreground">
                  Post to GL when balance is received
                </p>
              </div>
              <Switch
                checked={settings.auto_post_balance_payments}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, auto_post_balance_payments: checked })
                }
              />
            </div>
          </div>

          <Separator />

          {/* Numbering */}
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
              <p className="text-xs text-muted-foreground">
                Preview: {settings.invoice_prefix}-202601-00001
              </p>
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
              <p className="text-xs text-muted-foreground">
                Preview: {settings.advance_receipt_prefix}-202601-00001
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={updateSettings.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Journal Entry Flow Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Journal Entry Flow Preview
          </CardTitle>
          <CardDescription>
            Visual representation of how journal entries will be created for each transaction type
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Advance Payment */}
          <div className="p-4 border rounded-lg bg-muted/30">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Badge variant="outline">Step 1</Badge>
              Advance Payment Received (50%)
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm font-mono">
              <div className="flex items-center gap-2">
                <Badge className="bg-green-500/20 text-green-700">DR</Badge>
                Cash/Bank Account
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-red-500/20 text-red-700">CR</Badge>
                Customer Advance (Liability)
              </div>
            </div>
          </div>

          {/* Invoice Generated */}
          <div className="p-4 border rounded-lg bg-muted/30">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Badge variant="outline">Step 2</Badge>
              Trip Completed → Invoice Generated
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm font-mono">
              <div className="flex items-center gap-2">
                <Badge className="bg-green-500/20 text-green-700">DR</Badge>
                Trade Receivable
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-red-500/20 text-red-700">CR</Badge>
                Special Hire Revenue
              </div>
            </div>
          </div>

          {/* Apply Advance */}
          <div className="p-4 border rounded-lg bg-muted/30">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Badge variant="outline">Step 3</Badge>
              Apply Advance to Invoice
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm font-mono">
              <div className="flex items-center gap-2">
                <Badge className="bg-green-500/20 text-green-700">DR</Badge>
                Customer Advance (Clears Liability)
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-red-500/20 text-red-700">CR</Badge>
                Trade Receivable (Reduces AR)
              </div>
            </div>
          </div>

          {/* Balance Payment */}
          <div className="p-4 border rounded-lg bg-muted/30">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Badge variant="outline">Step 4</Badge>
              Balance Payment Received (50%)
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm font-mono">
              <div className="flex items-center gap-2">
                <Badge className="bg-green-500/20 text-green-700">DR</Badge>
                Cash/Bank Account
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-red-500/20 text-red-700">CR</Badge>
                Trade Receivable (Clears AR)
              </div>
            </div>
          </div>

          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Result</AlertTitle>
            <AlertDescription>
              Revenue recognized = 100% | Cash received = 100% | All balances cleared
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
