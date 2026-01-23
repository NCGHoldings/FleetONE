import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Settings2, Building2, CreditCard, FileText, CheckCircle, AlertCircle, Save, Receipt } from "lucide-react";
import { useSchoolBusFinanceSettings, useUpdateSchoolBusFinanceSettings } from "@/hooks/useSchoolBusFinance";
import { useChartOfAccounts } from "@/hooks/useAccountingData";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

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

  // Default settings state (now includes expense accounts)
  const [defaultSettings, setDefaultSettings] = useState({
    trade_receivable_account_id: "",
    sbs_collection_account_id: "",
    cash_account_id: "",
    auto_post_invoices: false,
    auto_post_payments: false,
    auto_post_expenses: false,
    invoice_prefix: "SBS-INV",
    // Expense accounts
    expense_account_id: "",
    fuel_expense_account_id: "",
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
        setDefaultSettings({
          trade_receivable_account_id: defaultSetting.trade_receivable_account_id || "",
          sbs_collection_account_id: defaultSetting.sbs_collection_account_id || "",
          cash_account_id: defaultSetting.cash_account_id || "",
          auto_post_invoices: defaultSetting.auto_post_invoices || false,
          auto_post_payments: defaultSetting.auto_post_payments || false,
          auto_post_expenses: defaultSetting.auto_post_expenses || false,
          invoice_prefix: defaultSetting.invoice_prefix || "SBS-INV",
          // Expense accounts
          expense_account_id: defaultSetting.expense_account_id || "",
          fuel_expense_account_id: defaultSetting.fuel_expense_account_id || "",
          maintenance_expense_account_id: defaultSetting.maintenance_expense_account_id || "",
          salary_expense_account_id: defaultSetting.salary_expense_account_id || "",
          expense_cash_account_id: defaultSetting.expense_cash_account_id || "",
        });
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

  const handleSaveDefaultSettings = async () => {
    try {
      await updateSettings.mutateAsync({
        branch_id: null,
        ...defaultSettings,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleSaveBranchSettings = async (branchId: string) => {
    try {
      await updateSettings.mutateAsync({
        branch_id: branchId,
        branch_gl_account_id: branchSettings[branchId]?.branch_gl_account_id || null,
        ...defaultSettings, // Inherit default settings
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

  if (settingsLoading) {
    return <div className="flex items-center justify-center h-64">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
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
              <Select
                value={defaultSettings.trade_receivable_account_id}
                onValueChange={(value) =>
                  setDefaultSettings({ ...defaultSettings, trade_receivable_account_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {receivableAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.account_code} - {account.account_name}
                    </SelectItem>
                  ))}
                  {chartOfAccounts?.filter((a) => a.account_type === "asset").map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.account_code} - {account.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This account will be debited when AR invoices are created
              </p>
            </div>

            {/* SBS Collection Account */}
            <div className="space-y-2">
              <Label>SBS Collection Revenue Account (Credit on Invoice)</Label>
              <Select
                value={defaultSettings.sbs_collection_account_id}
                onValueChange={(value) =>
                  setDefaultSettings({ ...defaultSettings, sbs_collection_account_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {revenueAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.account_code} - {account.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This account will be credited when AR invoices are created
              </p>
            </div>

            {/* Default Cash Account */}
            <div className="space-y-2">
              <Label>Default Cash/Bank Account (for payments without branch mapping)</Label>
              <Select
                value={defaultSettings.cash_account_id}
                onValueChange={(value) =>
                  setDefaultSettings({ ...defaultSettings, cash_account_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {cashAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.account_code} - {account.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Select
                value={defaultSettings.expense_account_id}
                onValueChange={(value) =>
                  setDefaultSettings({ ...defaultSettings, expense_account_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select expense account" />
                </SelectTrigger>
                <SelectContent>
                  {expenseAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.account_code} - {account.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Default account for "Other" expense types
              </p>
            </div>

            {/* Fuel Expense Account */}
            <div className="space-y-2">
              <Label>Fuel Expense Account (Debit)</Label>
              <Select
                value={defaultSettings.fuel_expense_account_id}
                onValueChange={(value) =>
                  setDefaultSettings({ ...defaultSettings, fuel_expense_account_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select fuel expense account" />
                </SelectTrigger>
                <SelectContent>
                  {expenseAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.account_code} - {account.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Specific account for fuel expenses
              </p>
            </div>

            {/* Maintenance Expense Account */}
            <div className="space-y-2">
              <Label>Maintenance Expense Account (Debit)</Label>
              <Select
                value={defaultSettings.maintenance_expense_account_id}
                onValueChange={(value) =>
                  setDefaultSettings({ ...defaultSettings, maintenance_expense_account_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select maintenance expense account" />
                </SelectTrigger>
                <SelectContent>
                  {expenseAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.account_code} - {account.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Specific account for maintenance/repairs
              </p>
            </div>

            {/* Salary Expense Account */}
            <div className="space-y-2">
              <Label>Salary/Staff Expense Account (Debit)</Label>
              <Select
                value={defaultSettings.salary_expense_account_id}
                onValueChange={(value) =>
                  setDefaultSettings({ ...defaultSettings, salary_expense_account_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select salary expense account" />
                </SelectTrigger>
                <SelectContent>
                  {expenseAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.account_code} - {account.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Specific account for driver/staff salaries
              </p>
            </div>

            {/* Expense Cash/Bank Account */}
            <div className="space-y-2 md:col-span-2">
              <Label>Cash/Bank Account for Expenses (Credit)</Label>
              <Select
                value={defaultSettings.expense_cash_account_id}
                onValueChange={(value) =>
                  setDefaultSettings({ ...defaultSettings, expense_cash_account_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select cash/bank account for expense payments" />
                </SelectTrigger>
                <SelectContent>
                  {cashAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.account_code} - {account.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                        <Select
                          value={branchSettings[branch.id]?.branch_gl_account_id || ""}
                          onValueChange={(value) =>
                            setBranchSettings({
                              ...branchSettings,
                              [branch.id]: { branch_gl_account_id: value },
                            })
                          }
                        >
                          <SelectTrigger className="w-[350px]">
                            <SelectValue placeholder="Select cash/bank GL account..." />
                          </SelectTrigger>
                          <SelectContent>
                            {cashAccounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.account_code} - {account.account_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
