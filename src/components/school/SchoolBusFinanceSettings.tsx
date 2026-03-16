import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Settings2, Building2, CreditCard, FileText, CheckCircle, AlertCircle, Save, Receipt, RefreshCw, AlertTriangle, Loader2 } from "lucide-react";
import { useSchoolBusFinanceSettings, useUpdateSchoolBusFinanceSettings, useOrphanedSchoolInvoices, useBackfillARInvoiceLinks } from "@/hooks/useSchoolBusFinance";
import { useChartOfAccounts } from "@/hooks/useAccountingData";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { SearchableFinanceAccountSelector } from "@/components/settings/SearchableFinanceAccountSelector";
import { cn } from "@/lib/utils";

interface BranchSetting {
  id: string;
  branch_id: string | null;
  branch_name: string;
  trade_receivable_account_id: string | null;
  sbs_collection_account_id: string | null;
  branch_gl_account_id: string | null;
  cash_account_id: string | null;
  auto_post_invoices: boolean;
  auto_post_payments: boolean;
  invoice_prefix: string;
  configured: boolean;
}

export function SchoolBusFinanceSettings() {
  const { data: existingSettings, isLoading: settingsLoading } = useSchoolBusFinanceSettings();
  const { data: chartOfAccounts } = useChartOfAccounts();
  const updateSettings = useUpdateSchoolBusFinanceSettings();
  const { data: orphanedData, isLoading: orphanedLoading, refetch: refetchOrphaned } = useOrphanedSchoolInvoices();
  const backfillMutation = useBackfillARInvoiceLinks();

  // Fetch school branches
  const { data: branches } = useQuery({
    queryKey: ["school-branches-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("school_branches")
        .select("id, branch_name, branch_code")
        .eq("is_active", true)
        .order("branch_name");
      if (error) throw error;
      return data;
    },
  });

  // Default settings state (now includes expense accounts and fuel bank)
  const [defaultSettings, setDefaultSettings] = useState({
    trade_receivable_account_id: "",
    sbs_collection_account_id: "",
    cash_account_id: "",
    advance_payments_liability_account_id: "",
    auto_post_invoices: false,
    auto_post_payments: false,
    auto_post_expenses: false,
    invoice_prefix: "SBS-INV",
    // Expense accounts
    expense_account_id: "",
    fuel_expense_account_id: "",
    fuel_bank_account_id: "", // NEW: Dedicated fuel bank account
    maintenance_expense_account_id: "",
    salary_expense_account_id: "",
    expense_cash_account_id: "",
  });

  // Branch settings state - use branch_gl_account_id for direct COA mapping
  const [branchSettings, setBranchSettings] = useState<Record<string, { branch_gl_account_id: string }>>({});

  // Load existing settings
  useEffect(() => {
    if (existingSettings) {
      const defaultSetting = existingSettings.find((s: any) => !s.branch_id);
      if (defaultSetting) {
        // Fetch liability account via RPC (PostgREST might not return this column)
        const loadLiabilityAccount = async () => {
          console.log('[loadLiabilityAccount] START - settingId:', defaultSetting.id);
          try {
            const { data: rpcResult, error: rpcError } = await supabase.rpc('get_liability_account_setting' as any, {
              p_setting_id: defaultSetting.id,
            });
            console.log('[loadLiabilityAccount] RPC response - data:', rpcResult, 'error:', rpcError);
            if (rpcError) {
              console.error('[loadLiabilityAccount] RPC FAILED:', rpcError.message, rpcError.details, rpcError.hint);
              return;
            }
            if (rpcResult) {
              console.log('[loadLiabilityAccount] Setting liability account to:', rpcResult);
              setDefaultSettings(prev => ({
                ...prev,
                advance_payments_liability_account_id: (rpcResult as string) || "",
              }));
            } else {
              console.log('[loadLiabilityAccount] No liability account value returned (null)');
            }
          } catch (e) {
            console.error('[loadLiabilityAccount] EXCEPTION:', e);
          }
        };

        setDefaultSettings({
          trade_receivable_account_id: defaultSetting.trade_receivable_account_id || "",
          sbs_collection_account_id: defaultSetting.sbs_collection_account_id || "",
          cash_account_id: defaultSetting.cash_account_id || "",
          advance_payments_liability_account_id: defaultSetting.advance_payments_liability_account_id || "",
          auto_post_invoices: defaultSetting.auto_post_invoices || false,
          auto_post_payments: defaultSetting.auto_post_payments || false,
          auto_post_expenses: defaultSetting.auto_post_expenses || false,
          invoice_prefix: defaultSetting.invoice_prefix || "SBS-INV",
          // Expense accounts
          expense_account_id: defaultSetting.expense_account_id || "",
          fuel_expense_account_id: defaultSetting.fuel_expense_account_id || "",
          fuel_bank_account_id: defaultSetting.fuel_bank_account_id || "",
          maintenance_expense_account_id: defaultSetting.maintenance_expense_account_id || "",
          salary_expense_account_id: defaultSetting.salary_expense_account_id || "",
          expense_cash_account_id: defaultSetting.expense_cash_account_id || "",
        });

        // Also load via RPC to get the liability account reliably
        loadLiabilityAccount();
      }

      const branchMap: Record<string, { branch_gl_account_id: string }> = {};
      existingSettings.forEach((s: any) => {
        if (s.branch_id) {
          branchMap[s.branch_id] = { branch_gl_account_id: s.branch_gl_account_id || "" };
        }
      });
      setBranchSettings(branchMap);
    }
  }, [existingSettings]);

  // Validate expense settings before enabling auto-post
  const validateExpenseSettings = (): boolean => {
    if (defaultSettings.auto_post_expenses) {
      const missing: string[] = [];
      if (!defaultSettings.expense_account_id) missing.push("General Expense Account");
      if (!defaultSettings.expense_cash_account_id) missing.push("Cash/Bank for Expenses");

      if (missing.length > 0) {
        toast.error(`Please configure these accounts first: ${missing.join(", ")}`);
        return false;
      }
    }
    return true;
  };

  const handleSaveDefaultSettings = async () => {
    // Validate expense accounts if auto-post is enabled
    if (!validateExpenseSettings()) {
      return;
    }

    try {
      // Convert empty strings to null for UUID fields before saving
      const sanitizedSettings = Object.fromEntries(
        Object.entries(defaultSettings).map(([key, value]) => [
          key,
          value === '' ? null : value
        ])
      );

      console.log("[Settings Save] Saving default settings:", sanitizedSettings);

      const result = await updateSettings.mutateAsync({
        branch_id: null,
        ...sanitizedSettings,
      });

      console.log("[Settings Save] Save result:", result);

      // Force re-fetch to confirm settings persisted
      setTimeout(() => {
        toast.success("Settings saved! Verifying persistence...");
      }, 200);
    } catch (error: any) {
      console.error("[Settings Save] Save FAILED:", error);
      toast.error(`Save failed: ${error?.message || "Unknown error"}. Check console for details.`);
    }
  };

  const handleBackfillARInvoices = async () => {
    await backfillMutation.mutateAsync();
    refetchOrphaned();
  };

  const handleSaveBranchSettings = async (branchId: string) => {
    try {
      const branchGlAccountId = branchSettings[branchId]?.branch_gl_account_id;

      // Convert empty strings to null for UUID fields
      const sanitizedDefaults = Object.fromEntries(
        Object.entries(defaultSettings).map(([key, value]) => [
          key,
          value === '' ? null : value
        ])
      );

      await updateSettings.mutateAsync({
        branch_id: branchId,
        branch_gl_account_id: branchGlAccountId === '' ? null : branchGlAccountId,
        ...sanitizedDefaults, // Inherit sanitized default settings
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  // Filter accounts by type
  const receivableAccounts = chartOfAccounts?.filter(
    (a) => a.account_type === "asset" && a.account_name.toLowerCase().includes("receivable")
  ) || [];
  const revenueAccounts = chartOfAccounts?.filter(
    (a) => a.account_type === "revenue"
  ) || [];
  const cashAccounts = chartOfAccounts?.filter(
    (a) => a.account_type === "asset" && (a.account_name.toLowerCase().includes("cash") || a.account_name.toLowerCase().includes("bank"))
  ) || [];
  const expenseAccounts = chartOfAccounts?.filter(
    (a) => a.account_type === "expense"
  ) || [];
  const liabilityAccounts = chartOfAccounts?.filter(
    (a) => a.account_type === "liability"
  ) || [];

  if (settingsLoading) {
    return <div className="flex items-center justify-center h-64">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Finance Sync Status Card */}
      <Card className={orphanedData?.totalOrphaned ? "border-amber-500" : "border-green-500"}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Finance Integration Status
          </CardTitle>
          <CardDescription>
            Check if all School Bus invoices are properly linked to the Finance AR module
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              {orphanedLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : orphanedData?.totalOrphaned ? (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              <div>
                <p className="font-medium">
                  {orphanedLoading
                    ? "Checking sync status..."
                    : orphanedData?.totalOrphaned
                      ? `${orphanedData.totalOrphaned} invoices need syncing`
                      : "All invoices synced to Finance AR"
                  }
                </p>
                <p className="text-sm text-muted-foreground">
                  {orphanedData?.totalOrphaned
                    ? "Some school AR invoices are not linked to Finance AR. Payments on these won't update Finance."
                    : "School Bus payments will automatically update Finance AR invoices."
                  }
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchOrphaned()}
                disabled={orphanedLoading}
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", orphanedLoading && "animate-spin")} />
                Check
              </Button>
              {!!orphanedData?.totalOrphaned && (
                <Button
                  size="sm"
                  onClick={handleBackfillARInvoices}
                  disabled={backfillMutation.isPending}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  {backfillMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Fix Now
                </Button>
              )}
            </div>
          </div>

          {/* Show warning if auto-post is on but accounts not configured */}
          {defaultSettings.auto_post_expenses && (
            !defaultSettings.expense_account_id || !defaultSettings.expense_cash_account_id
          ) && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">
                  Expense auto-posting is enabled but expense accounts are not configured. Configure them below.
                </span>
              </div>
            )}
        </CardContent>
      </Card>

      {/* Default GL Account Mappings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Default GL Account Mappings
          </CardTitle>
          <CardDescription>
            Configure the default accounts for School Bus AR invoices and payments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Trade Receivables Account */}
            <div className="space-y-2">
              <Label>Trade Receivables Account (Debit on Invoice)</Label>
              <SearchableFinanceAccountSelector
                value={defaultSettings.trade_receivable_account_id || null}
                onValueChange={(value) =>
                  setDefaultSettings({ ...defaultSettings, trade_receivable_account_id: value || "" })
                }
                accounts={[...receivableAccounts, ...chartOfAccounts?.filter((a) => a.account_type === "asset") || []]}
                placeholder="Select account"
              />
              <p className="text-xs text-muted-foreground">
                This account will be debited when AR invoices are created
              </p>
            </div>

            {/* SBS Collection Account */}
            <div className="space-y-2">
              <Label>SBS Collection Revenue Account (Credit on Invoice)</Label>
              <SearchableFinanceAccountSelector
                value={defaultSettings.sbs_collection_account_id || null}
                onValueChange={(value) =>
                  setDefaultSettings({ ...defaultSettings, sbs_collection_account_id: value || "" })
                }
                accounts={revenueAccounts}
                placeholder="Select account"
              />
              <p className="text-xs text-muted-foreground">
                This account will be credited when AR invoices are created
              </p>
            </div>

            {/* Default Cash Account */}
            <div className="space-y-2">
              <Label>Default Cash/Bank Account (for payments without branch mapping)</Label>
              <SearchableFinanceAccountSelector
                value={defaultSettings.cash_account_id || null}
                onValueChange={(value) =>
                  setDefaultSettings({ ...defaultSettings, cash_account_id: value || "" })
                }
                accounts={cashAccounts}
                placeholder="Select account"
              />
            </div>

            {/* Advance Payments Liability Account */}
            <div className="space-y-2">
              <Label>Advance Payments Liability Account (Student Overpayments)</Label>
              <SearchableFinanceAccountSelector
                value={defaultSettings.advance_payments_liability_account_id || null}
                onValueChange={(value) =>
                  setDefaultSettings({ ...defaultSettings, advance_payments_liability_account_id: value || "" })
                }
                accounts={liabilityAccounts}
                placeholder="Select liability account"
              />
              <p className="text-xs text-muted-foreground">
                When students pay more than fixed amount, the excess is posted here as a liability. Auto-applied when next month's invoices are generated.
              </p>
            </div>

            {/* Invoice Prefix */}
            <div className="space-y-2">
              <Label>Invoice Number Prefix</Label>
              <Input
                value={defaultSettings.invoice_prefix}
                onChange={(e) =>
                  setDefaultSettings({ ...defaultSettings, invoice_prefix: e.target.value })
                }
                placeholder="SBS-INV"
              />
              <p className="text-xs text-muted-foreground">
                Preview: {defaultSettings.invoice_prefix}-202601-00001
              </p>
            </div>
          </div>

          <Separator />

          {/* Auto-posting toggles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-base">Auto-Post Invoices to GL</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically post journal entries when AR invoices are generated
                </p>
              </div>
              <Switch
                checked={defaultSettings.auto_post_invoices}
                onCheckedChange={(checked) =>
                  setDefaultSettings({ ...defaultSettings, auto_post_invoices: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-base">Auto-Post Payments to GL</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically post journal entries when payments are recorded
                </p>
              </div>
              <Switch
                checked={defaultSettings.auto_post_payments}
                onCheckedChange={(checked) =>
                  setDefaultSettings({ ...defaultSettings, auto_post_payments: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-base">Auto-Post Expenses to GL</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically post journal entries when route expenses are added
                </p>
              </div>
              <Switch
                checked={defaultSettings.auto_post_expenses}
                onCheckedChange={(checked) =>
                  setDefaultSettings({ ...defaultSettings, auto_post_expenses: checked })
                }
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveDefaultSettings} disabled={updateSettings.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Save Default Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Expense GL Account Mappings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Expense GL Account Mappings
          </CardTitle>
          <CardDescription>
            Configure which expense accounts to use for route expenses (fuel, maintenance, salaries, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* General Expense Account */}
            <div className="space-y-2">
              <Label>General Expense Account (Debit)</Label>
              <SearchableFinanceAccountSelector
                value={defaultSettings.expense_account_id || null}
                onValueChange={(value) =>
                  setDefaultSettings({ ...defaultSettings, expense_account_id: value || "" })
                }
                accounts={expenseAccounts}
                placeholder="Select expense account"
              />
              <p className="text-xs text-muted-foreground">
                Default account for "Other" expense types
              </p>
            </div>

            {/* Fuel Expense Account */}
            <div className="space-y-2">
              <Label>Fuel Expense Account (Debit)</Label>
              <SearchableFinanceAccountSelector
                value={defaultSettings.fuel_expense_account_id || null}
                onValueChange={(value) =>
                  setDefaultSettings({ ...defaultSettings, fuel_expense_account_id: value || "" })
                }
                accounts={expenseAccounts}
                placeholder="Select fuel expense account"
              />
              <p className="text-xs text-muted-foreground">
                Specific account for fuel expenses
              </p>
            </div>

            {/* Fuel Bank Account - NEW */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                Fuel Bank Account (Credit)
                <span className="text-destructive">*</span>
              </Label>
              <SearchableFinanceAccountSelector
                value={defaultSettings.fuel_bank_account_id || null}
                onValueChange={(value) =>
                  setDefaultSettings({ ...defaultSettings, fuel_bank_account_id: value || "" })
                }
                accounts={cashAccounts}
                placeholder="Select fuel bank account"
              />
              <p className="text-xs text-muted-foreground">
                Dedicated bank account for fuel payments (will be credited when fuel is purchased)
              </p>
            </div>

            {/* Maintenance Expense Account */}
            <div className="space-y-2">
              <Label>Maintenance Expense Account (Debit)</Label>
              <SearchableFinanceAccountSelector
                value={defaultSettings.maintenance_expense_account_id || null}
                onValueChange={(value) =>
                  setDefaultSettings({ ...defaultSettings, maintenance_expense_account_id: value || "" })
                }
                accounts={expenseAccounts}
                placeholder="Select maintenance expense account"
              />
              <p className="text-xs text-muted-foreground">
                Specific account for maintenance/repairs
              </p>
            </div>

            {/* Salary Expense Account */}
            <div className="space-y-2">
              <Label>Salary/Staff Expense Account (Debit)</Label>
              <SearchableFinanceAccountSelector
                value={defaultSettings.salary_expense_account_id || null}
                onValueChange={(value) =>
                  setDefaultSettings({ ...defaultSettings, salary_expense_account_id: value || "" })
                }
                accounts={expenseAccounts}
                placeholder="Select salary expense account"
              />
              <p className="text-xs text-muted-foreground">
                Specific account for driver/staff salaries
              </p>
            </div>

            {/* Expense Cash/Bank Account */}
            <div className="space-y-2 md:col-span-2">
              <Label>Cash/Bank Account for Expenses (Credit)</Label>
              <SearchableFinanceAccountSelector
                value={defaultSettings.expense_cash_account_id || null}
                onValueChange={(value) =>
                  setDefaultSettings({ ...defaultSettings, expense_cash_account_id: value || "" })
                }
                accounts={cashAccounts}
                placeholder="Select cash/bank account for expense payments"
              />
              <p className="text-xs text-muted-foreground">
                This account will be credited when expenses are recorded (cash paid out)
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveDefaultSettings} disabled={updateSettings.isPending}>
              <Save className="h-4 w-4 mr-2" />
              Save Expense Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Branch-wise Bank Account Mappings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Branch-wise Bank Account Mappings
          </CardTitle>
          <CardDescription>
            Configure which bank account receives payments for each branch (Nugegoda, LNU, Kurunegala, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">Branch</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Cash/Bank GL Account (for payments)</th>
                  <th className="px-4 py-3 text-center text-sm font-medium">Status</th>
                  <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {branches?.map((branch) => {
                  const isConfigured = !!branchSettings[branch.id]?.branch_gl_account_id;
                  return (
                    <tr key={branch.id} className="border-t">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{branch.branch_name}</span>
                          <span className="text-muted-foreground">({branch.branch_code})</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <SearchableFinanceAccountSelector
                          value={branchSettings[branch.id]?.branch_gl_account_id || null}
                          onValueChange={(value) =>
                            setBranchSettings({
                              ...branchSettings,
                              [branch.id]: { branch_gl_account_id: value || "" },
                            })
                          }
                          accounts={cashAccounts}
                          placeholder="Select cash/bank GL account..."
                          className="w-[350px]"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isConfigured ? (
                          <Badge variant="default" className="bg-primary">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Configured
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Not configured
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          onClick={() => handleSaveBranchSettings(branch.id)}
                          disabled={updateSettings.isPending}
                        >
                          Save
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {(!branches || branches.length === 0) && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      No branches found. Please add branches first.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* GL Entry Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Journal Entry Preview
          </CardTitle>
          <CardDescription>
            This is how the journal entries will be posted
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Invoice Posting */}
            <div className="p-4 border rounded-lg space-y-3">
              <h4 className="font-semibold text-sm">When AR Invoices are Created:</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                  <span>DR: Trade Receivables</span>
                  <span className="font-mono">XXX,XXX</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-red-50 rounded">
                  <span>CR: SBS Collection Revenue</span>
                  <span className="font-mono">XXX,XXX</span>
                </div>
              </div>
            </div>

            {/* Payment Posting */}
            <div className="p-4 border rounded-lg space-y-3">
              <h4 className="font-semibold text-sm">When Payments are Recorded:</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                  <span>DR: Bank Account (branch-wise)</span>
                  <span className="font-mono">XXX,XXX</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-red-50 rounded">
                  <span>CR: Trade Receivables</span>
                  <span className="font-mono">XXX,XXX</span>
                </div>
              </div>
            </div>

            {/* Advance Balance Posting */}
            {defaultSettings.advance_payments_liability_account_id && (
              <div className="p-4 border border-blue-200 rounded-lg space-y-3 md:col-span-2">
                <h4 className="font-semibold text-sm">When Student Overpays (Credit Balance):</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 text-sm">
                    <p className="text-xs font-medium text-muted-foreground">Payment Journal Entry:</p>
                    <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                      <span>DR: Bank Account</span>
                      <span className="font-mono">Full Amount</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-red-50 rounded">
                      <span>CR: Trade Receivables</span>
                      <span className="font-mono">Fixed Amount</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                      <span>CR: Advance Payments Liability</span>
                      <span className="font-mono">Overpayment</span>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="text-xs font-medium text-muted-foreground">Next Month Auto-Apply:</p>
                    <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                      <span>DR: Advance Payments Liability</span>
                      <span className="font-mono">Applied Amt</span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-red-50 rounded">
                      <span>CR: Trade Receivables</span>
                      <span className="font-mono">Applied Amt</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
