import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useInsuranceFinanceSettings, useSaveInsuranceFinanceSettings } from "@/hooks/useInsuranceFinance";
import { SearchableFinanceAccountSelector } from "@/components/settings/SearchableFinanceAccountSelector";
import { Loader2, Save, ShieldCheck } from "lucide-react";

export function InsuranceFinanceSettings() {
  const { data: initialSettings, isLoading } = useInsuranceFinanceSettings();
  const saveSettings = useSaveInsuranceFinanceSettings();
  
  const [settings, setSettings] = useState({
    prepaid_insurance_account_id: "",
    insurance_expense_account_id: "",
    claims_receivable_account_id: "",
    claims_income_account_id: "",
    bank_account_id: "",
    auto_post_premium: true,
    auto_amortize_monthly: false,
    gl_prefix: "INS"
  });

  useEffect(() => {
    if (initialSettings) {
      setSettings({
        prepaid_insurance_account_id: initialSettings.prepaid_insurance_account_id || "",
        insurance_expense_account_id: initialSettings.insurance_expense_account_id || "",
        claims_receivable_account_id: initialSettings.claims_receivable_account_id || "",
        claims_income_account_id: initialSettings.claims_income_account_id || "",
        bank_account_id: initialSettings.bank_account_id || "",
        auto_post_premium: initialSettings.auto_post_premium ?? true,
        auto_amortize_monthly: initialSettings.auto_amortize_monthly ?? false,
        gl_prefix: initialSettings.gl_prefix || "INS"
      });
    }
  }, [initialSettings]);

  const handleSave = async () => {
    await saveSettings.mutateAsync(settings as any);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <CardTitle>Insurance Finance Settings</CardTitle>
          </div>
          <CardDescription>
            Map your insurance operations to your General Ledger. These accounts will be used automatically when you renew or add policies.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <h3 className="font-medium text-lg border-b pb-2">Premium Payments</h3>
              
              <div className="space-y-2">
                <Label>Prepaid Insurance Account (Asset)</Label>
                <SearchableFinanceAccountSelector
                  value={settings.prepaid_insurance_account_id}
                  onChange={(val) => setSettings(s => ({ ...s, prepaid_insurance_account_id: val }))}
                  placeholder="Select Prepaid Insurance Account"
                />
                <p className="text-xs text-muted-foreground">Debited when you pay an insurance premium.</p>
              </div>

              <div className="space-y-2">
                <Label>Payment Source (Bank Account)</Label>
                <SearchableFinanceAccountSelector
                  value={settings.bank_account_id}
                  onChange={(val) => setSettings(s => ({ ...s, bank_account_id: val }))}
                  placeholder="Select Default Bank Account"
                />
                <p className="text-xs text-muted-foreground">Credited when you pay an insurance premium.</p>
              </div>

              <div className="space-y-2">
                <Label>Insurance Expense Account (Expense)</Label>
                <SearchableFinanceAccountSelector
                  value={settings.insurance_expense_account_id}
                  onChange={(val) => setSettings(s => ({ ...s, insurance_expense_account_id: val }))}
                  placeholder="Select Insurance Expense Account"
                />
                <p className="text-xs text-muted-foreground">Used for monthly amortization of the prepaid premium.</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-medium text-lg border-b pb-2">Accident Claims</h3>
              
              <div className="space-y-2">
                <Label>Claims Receivable Account (Asset)</Label>
                <SearchableFinanceAccountSelector
                  value={settings.claims_receivable_account_id}
                  onChange={(val) => setSettings(s => ({ ...s, claims_receivable_account_id: val }))}
                  placeholder="Select Claims Receivable Account"
                />
                <p className="text-xs text-muted-foreground">Debited when a claim is filed but not yet paid.</p>
              </div>

              <div className="space-y-2">
                <Label>Claims Income/Recovery Account (Revenue)</Label>
                <SearchableFinanceAccountSelector
                  value={settings.claims_income_account_id}
                  onChange={(val) => setSettings(s => ({ ...s, claims_income_account_id: val }))}
                  placeholder="Select Claims Income Account"
                />
                <p className="text-xs text-muted-foreground">Credited when a claim recovery is approved.</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-6 border-t">
            <h3 className="font-medium text-lg">Automation Rules</h3>
            
            <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50 dark:bg-slate-900/50">
              <div className="space-y-0.5">
                <Label className="text-base">Auto-Post Premium Payments</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically create a Journal Entry when you Add or Renew a policy.
                </p>
              </div>
              <Switch
                checked={settings.auto_post_premium}
                onCheckedChange={(val) => setSettings(s => ({ ...s, auto_post_premium: val }))}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg bg-slate-50 dark:bg-slate-900/50">
              <div className="space-y-0.5">
                <Label className="text-base">Auto-Amortize Monthly (Beta)</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically expense 1/12th of the premium each month.
                </p>
              </div>
              <Switch
                checked={settings.auto_amortize_monthly}
                onCheckedChange={(val) => setSettings(s => ({ ...s, auto_amortize_monthly: val }))}
              />
            </div>

            <div className="max-w-xs space-y-2">
              <Label>Journal Entry Prefix</Label>
              <Input 
                value={settings.gl_prefix}
                onChange={(e) => setSettings(s => ({ ...s, gl_prefix: e.target.value }))}
                placeholder="INS"
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={saveSettings.isPending}
          className="gap-2"
        >
          {saveSettings.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Financial Settings
        </Button>
      </div>
    </div>
  );
}
