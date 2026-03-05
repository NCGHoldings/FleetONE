/**
 * Module Finance Settings View
 * Unified settings component for configuring GL account mappings for all 6 finance modules:
 * Payroll, Commissions, Maintenance, Insurance, Expense Requests, Route Permits
 * 
 * Reads/writes to the `module_finance_settings` table via module-specific hooks.
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { EXPENSE_CATEGORIES } from "@/hooks/useExpenseRequests";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";
import {
  Loader2,
  Save,
  Users,
  Award,
  Wrench,
  Shield,
  FileText,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { SearchableFinanceAccountSelector } from "./SearchableFinanceAccountSelector";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GLAccount {
  id: string;
  account_code: string;
  account_name: string;
  account_type?: string;
}

interface ModuleConfig {
  moduleName: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  fields: FieldConfig[];
  toggles: ToggleConfig[];
  prefixField: string;
  defaultPrefix: string;
  // For expense requests: dynamic category-to-GL mappings
  hasCategoryMappings?: boolean;
}

interface FieldConfig {
  key: string;
  label: string;
  placeholder: string;
  required?: boolean;
}

interface ToggleConfig {
  key: string;
  label: string;
  description: string;
}

interface ExpenseMapping {
  expense_category: string;
  gl_account_id: string;
}

// ─── Module Definitions ───────────────────────────────────────────────────────

const MODULE_CONFIGS: ModuleConfig[] = [
  {
    moduleName: "payroll",
    label: "Payroll",
    description: "GL account mappings for salary processing, overtime, bonuses, and statutory deductions",
    icon: <Users className="h-4 w-4" />,
    fields: [
      { key: "salary_expense_account_id", label: "Salary Expense (DR)", placeholder: "Select salary expense account", required: true },
      { key: "overtime_expense_account_id", label: "Overtime Expense (DR)", placeholder: "Select overtime expense account" },
      { key: "bonus_expense_account_id", label: "Bonus Expense (DR)", placeholder: "Select bonus expense account" },
      { key: "employer_epf_expense_account_id", label: "Employer EPF Expense (DR)", placeholder: "Select employer EPF expense account" },
      { key: "employer_etf_expense_account_id", label: "Employer ETF Expense (DR)", placeholder: "Select employer ETF expense account" },
      { key: "paye_withholding_account_id", label: "PAYE Withholding Payable (CR)", placeholder: "Select PAYE withholding payable account" },
      { key: "employee_epf_payable_account_id", label: "Employee EPF Payable (CR)", placeholder: "Select employee EPF payable account" },
      { key: "net_salary_bank_account_id", label: "Bank/Cash Account (CR)", placeholder: "Select bank account for salary payments", required: true },
    ],
    toggles: [
      { key: "auto_post_on_process", label: "Auto-Post on Payroll Processing", description: "Automatically create GL entries when a payroll batch is processed" },
    ],
    prefixField: "gl_prefix",
    defaultPrefix: "PAY",
  },
  {
    moduleName: "commissions",
    label: "Commissions",
    description: "GL account mappings for staff commission payouts",
    icon: <Award className="h-4 w-4" />,
    fields: [
      { key: "commission_expense_account_id", label: "Commission Expense (DR)", placeholder: "Select commission expense account", required: true },
      { key: "bank_account_id", label: "Bank/Cash Account (CR)", placeholder: "Select bank account for commission payments", required: true },
    ],
    toggles: [
      { key: "auto_post_on_paid", label: "Auto-Post on Payout", description: "Automatically create GL entry when a commission is marked as paid" },
    ],
    prefixField: "gl_prefix",
    defaultPrefix: "COM",
  },
  {
    moduleName: "maintenance",
    label: "Maintenance",
    description: "GL account mappings for vehicle maintenance and repair costs",
    icon: <Wrench className="h-4 w-4" />,
    fields: [
      { key: "repair_expense_account_id", label: "Repair Expense (DR)", placeholder: "Select repair expense account", required: true },
      { key: "preventive_maintenance_account_id", label: "Preventive Maintenance (DR)", placeholder: "Select preventive maintenance account" },
      { key: "emergency_maintenance_account_id", label: "Emergency Maintenance (DR)", placeholder: "Select emergency maintenance account" },
      { key: "spare_parts_expense_account_id", label: "Spare Parts Expense (DR)", placeholder: "Select spare parts expense account" },
      { key: "bank_account_id", label: "Bank/Cash Account (CR)", placeholder: "Select bank account for maintenance payments", required: true },
    ],
    toggles: [
      { key: "auto_post_on_complete", label: "Auto-Post on Completion", description: "Automatically create GL entry when a maintenance work order is completed" },
    ],
    prefixField: "gl_prefix",
    defaultPrefix: "MNT",
  },
  {
    moduleName: "insurance",
    label: "Insurance",
    description: "GL account mappings for insurance premiums, amortization, and claim recoveries",
    icon: <Shield className="h-4 w-4" />,
    fields: [
      { key: "prepaid_insurance_account_id", label: "Prepaid Insurance (DR for premium)", placeholder: "Select prepaid insurance asset account", required: true },
      { key: "insurance_expense_account_id", label: "Insurance Expense (DR for amortization)", placeholder: "Select insurance expense account", required: true },
      { key: "claims_receivable_account_id", label: "Claims Receivable (DR for claims)", placeholder: "Select claims receivable account" },
      { key: "claims_income_account_id", label: "Claims Income (CR for recoveries)", placeholder: "Select claims income account" },
      { key: "bank_account_id", label: "Bank/Cash Account (CR)", placeholder: "Select bank account for premium payments", required: true },
    ],
    toggles: [
      { key: "auto_post_premium", label: "Auto-Post Premium Payments", description: "Automatically create GL entry when an insurance premium is paid" },
      { key: "auto_amortize_monthly", label: "Auto-Amortize Monthly", description: "Automatically create monthly amortization entries for prepaid insurance" },
    ],
    prefixField: "gl_prefix",
    defaultPrefix: "INS",
  },
  {
    moduleName: "expense_requests",
    label: "Expense Requests",
    description: "Default payment accounts and category-to-GL mappings for expense approvals",
    icon: <FileText className="h-4 w-4" />,
    fields: [
      { key: "default_bank_account_id", label: "Default Bank Account (CR)", placeholder: "Select default bank account", required: true },
      { key: "default_cash_account_id", label: "Default Cash Account (CR)", placeholder: "Select default cash account" },
      { key: "default_petty_cash_account_id", label: "Default Petty Cash Account (CR)", placeholder: "Select petty cash account" },
    ],
    toggles: [
      { key: "auto_post_on_approve", label: "Auto-Post on Approval", description: "Automatically create GL entry when an expense request is approved" },
    ],
    prefixField: "gl_prefix",
    defaultPrefix: "EXP",
    hasCategoryMappings: true,
  },
  {
    moduleName: "route_permits",
    label: "Route Permits",
    description: "GL account mappings for route permit costs and amortization",
    icon: <MapPin className="h-4 w-4" />,
    fields: [
      { key: "permit_expense_account_id", label: "Permit Expense (DR for temporary)", placeholder: "Select permit expense account", required: true },
      { key: "prepaid_permits_account_id", label: "Prepaid Permits (DR for annual)", placeholder: "Select prepaid permits asset account" },
      { key: "bank_account_id", label: "Bank/Cash Account (CR)", placeholder: "Select bank account for permit fees", required: true },
    ],
    toggles: [
      { key: "auto_post_on_renewal", label: "Auto-Post on Renewal", description: "Automatically create GL entry when a permit is renewed or paid" },
    ],
    prefixField: "gl_prefix",
    defaultPrefix: "PRM",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function ModuleFinanceSettingsView() {
  const { getEffectiveCompanyId } = useCompany();
  const effectiveCompanyId = getEffectiveCompanyId();

  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<GLAccount[]>([]);
  const [moduleSettings, setModuleSettings] = useState<Record<string, Record<string, unknown>>>({});
  const [savingModule, setSavingModule] = useState<string | null>(null);
  const [configuredModules, setConfiguredModules] = useState<Set<string>>(new Set());

  // Category mappings for expense requests
  const [expenseMappings, setExpenseMappings] = useState<ExpenseMapping[]>([]);
  const [newCategory, setNewCategory] = useState("");

  // Load all data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load COA accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from("chart_of_accounts")
        .select("id, account_code, account_name, account_type")
        .eq("company_id", effectiveCompanyId)
        .eq("is_active", true)
        .order("account_code");

      if (accountsError) throw accountsError;
      setAccounts(accountsData || []);

      // Load all module settings at once
      const { data: settingsData, error: settingsError } = await supabase
        .from("module_finance_settings")
        .select("*")
        .eq("company_id", effectiveCompanyId);

      if (settingsError && settingsError.code !== "PGRST116") throw settingsError;

      const settingsMap: Record<string, Record<string, unknown>> = {};
      const configured = new Set<string>();

      if (settingsData) {
        for (const row of settingsData) {
          settingsMap[row.module_name] = (row.settings || {}) as Record<string, unknown>;
          configured.add(row.module_name);

          // Load expense mappings
          if (row.module_name === "expense_requests") {
            const existingMappings = ((row.settings as Record<string, unknown>)?.mappings as ExpenseMapping[]) || [];
            if (existingMappings.length === 0) {
              // Auto-populate all expense categories as empty mappings
              const autoPopulated = EXPENSE_CATEGORIES.map(cat => ({
                expense_category: cat.value,
                gl_account_id: "",
              }));
              setExpenseMappings(autoPopulated);
            } else {
              // Merge: add any missing categories that aren't already mapped
              const existingCats = new Set(existingMappings.map(m => m.expense_category));
              const merged = [...existingMappings];
              for (const cat of EXPENSE_CATEGORIES) {
                if (!existingCats.has(cat.value)) {
                  merged.push({ expense_category: cat.value, gl_account_id: "" });
                }
              }
              setExpenseMappings(merged);
            }
          }
        }
      }

      // Set defaults for unconfigured modules
      for (const config of MODULE_CONFIGS) {
        if (!settingsMap[config.moduleName]) {
          const defaults: Record<string, unknown> = {};
          for (const field of config.fields) {
            defaults[field.key] = null;
          }
          for (const toggle of config.toggles) {
            defaults[toggle.key] = false;
          }
          defaults[config.prefixField] = config.defaultPrefix;
          settingsMap[config.moduleName] = defaults;
        }
      }

      // Auto-populate expense categories if expense_requests module has no settings yet
      if (!configured.has("expense_requests") && expenseMappings.length === 0) {
        setExpenseMappings(EXPENSE_CATEGORIES.map(cat => ({
          expense_category: cat.value,
          gl_account_id: "",
        })));
      }

      setModuleSettings(settingsMap);
      setConfiguredModules(configured);
    } catch (error) {
      console.error("Error loading finance settings:", error);
      toast.error("Failed to load finance settings");
    } finally {
      setLoading(false);
    }
  }, [effectiveCompanyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update a setting value
  const updateSetting = (moduleName: string, key: string, value: unknown) => {
    setModuleSettings((prev) => ({
      ...prev,
      [moduleName]: {
        ...prev[moduleName],
        [key]: value,
      },
    }));
  };

  // Save module settings
  const handleSave = async (moduleName: string) => {
    setSavingModule(moduleName);
    try {
      const settings = { ...moduleSettings[moduleName] };

      // Include expense mappings for expense_requests module
      if (moduleName === "expense_requests") {
        settings.mappings = expenseMappings;
      }

      const { error } = await (supabase as any)
        .from("module_finance_settings")
        .upsert(
          {
            company_id: effectiveCompanyId,
            module_name: moduleName,
            settings: settings,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "company_id,module_name" }
        );

      if (error) throw error;

      setConfiguredModules((prev) => new Set([...prev, moduleName]));
      toast.success(`${MODULE_CONFIGS.find((c) => c.moduleName === moduleName)?.label} settings saved`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to save settings: ${message}`);
    } finally {
      setSavingModule(null);
    }
  };

  // Add expense category mapping
  const addExpenseMapping = () => {
    if (!newCategory.trim()) return;
    if (expenseMappings.some((m) => m.expense_category === newCategory.trim())) {
      toast.error("Category already exists");
      return;
    }
    setExpenseMappings([...expenseMappings, { expense_category: newCategory.trim(), gl_account_id: "" }]);
    setNewCategory("");
  };

  // Remove expense category mapping
  const removeExpenseMapping = (index: number) => {
    setExpenseMappings(expenseMappings.filter((_, i) => i !== index));
  };

  // Update expense category mapping GL account
  const updateExpenseMappingAccount = (index: number, accountId: string | null) => {
    const updated = [...expenseMappings];
    updated[index] = { ...updated[index], gl_account_id: accountId || "" };
    setExpenseMappings(updated);
  };

  // Render account selector
  const renderAccountSelect = (
    moduleName: string,
    field: FieldConfig
  ) => {
    const value = (moduleSettings[moduleName]?.[field.key] as string) || null;
    const hasError = field.required && !value;

    return (
      <div className="space-y-2" key={field.key}>
        <Label className="flex items-center gap-1">
          {field.label}
          {field.required && <span className="text-destructive">*</span>}
        </Label>
        <SearchableFinanceAccountSelector
          value={value}
          onValueChange={(v) => updateSetting(moduleName, field.key, v)}
          accounts={accounts}
          placeholder={field.placeholder}
          required={field.required}
          hasError={hasError}
        />
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Loading finance settings...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Module GL Account Mappings
          </CardTitle>
          <CardDescription>
            Configure GL account mappings for each operational module. These mappings control how transactions
            are posted to the General Ledger when actions are performed (e.g., payroll processing, expense approval).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Configuration status summary */}
          <div className="flex flex-wrap gap-2 mb-6">
            {MODULE_CONFIGS.map((config) => (
              <Badge
                key={config.moduleName}
                variant={configuredModules.has(config.moduleName) ? "default" : "outline"}
                className="flex items-center gap-1"
              >
                {configuredModules.has(config.moduleName) ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <AlertCircle className="h-3 w-3" />
                )}
                {config.label}
              </Badge>
            ))}
          </div>

          <Accordion type="multiple" className="w-full">
            {MODULE_CONFIGS.map((config) => (
              <AccordionItem key={config.moduleName} value={config.moduleName}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-primary">
                      {config.icon}
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{config.label}</span>
                        {configuredModules.has(config.moduleName) && (
                          <Badge variant="secondary" className="text-xs">Configured</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground font-normal">
                        {config.description}
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>

                <AccordionContent>
                  <div className="space-y-6 pt-4">
                    {/* GL Account Mappings */}
                    <div>
                      <h4 className="text-sm font-medium mb-3">GL Account Mappings</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {config.fields.map((field) => renderAccountSelect(config.moduleName, field))}
                      </div>
                    </div>

                    {/* Expense Category Mappings — only for expense_requests */}
                    {config.hasCategoryMappings && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="text-sm font-medium mb-3">
                            Expense Category → GL Account Mappings
                          </h4>
                          <p className="text-xs text-muted-foreground mb-4">
                            Map each expense category to a specific GL expense account. Categories without mappings
                            will be auto-matched by name.
                          </p>

                          {expenseMappings.length > 0 && (
                            <div className="space-y-3 mb-4">
                              {expenseMappings.map((mapping, index) => (
                                <div key={index} className="flex items-end gap-3">
                                  <div className="w-48">
                                    <Label className="text-xs">{EXPENSE_CATEGORIES.find(c => c.value === mapping.expense_category)?.label || mapping.expense_category}</Label>
                                  </div>
                                  <div className="flex-1">
                                    <SearchableFinanceAccountSelector
                                      value={mapping.gl_account_id || null}
                                      onValueChange={(v) => updateExpenseMappingAccount(index, v)}
                                      accounts={accounts}
                                      placeholder="Select GL account for this category"
                                    />
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => removeExpenseMapping(index)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex items-end gap-3">
                            <div className="flex-1">
                              <Label className="text-xs">New Category Name</Label>
                              <Input
                                value={newCategory}
                                onChange={(e) => setNewCategory(e.target.value)}
                                placeholder="e.g., Travel, Office Supplies, Fuel"
                                onKeyDown={(e) => e.key === "Enter" && addExpenseMapping()}
                              />
                            </div>
                            <Button
                              variant="outline"
                              onClick={addExpenseMapping}
                              disabled={!newCategory.trim()}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add
                            </Button>
                          </div>
                        </div>
                      </>
                    )}

                    <Separator />

                    {/* Automation Toggles */}
                    {config.toggles.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-3">Automation</h4>
                        <div className="space-y-4">
                          {config.toggles.map((toggle) => (
                            <div key={toggle.key} className="flex items-center justify-between">
                              <div>
                                <Label>{toggle.label}</Label>
                                <p className="text-xs text-muted-foreground">{toggle.description}</p>
                              </div>
                              <Switch
                                checked={!!moduleSettings[config.moduleName]?.[toggle.key]}
                                onCheckedChange={(checked) =>
                                  updateSetting(config.moduleName, toggle.key, checked)
                                }
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Separator />

                    {/* JE Prefix */}
                    <div className="flex items-end gap-4">
                      <div className="w-48">
                        <Label className="text-xs">Journal Entry Prefix</Label>
                        <Input
                          value={(moduleSettings[config.moduleName]?.[config.prefixField] as string) || config.defaultPrefix}
                          onChange={(e) =>
                            updateSetting(config.moduleName, config.prefixField, e.target.value)
                          }
                          placeholder={config.defaultPrefix}
                        />
                      </div>

                      {/* Save Button */}
                      <div className="flex-1 flex justify-end">
                        <Button
                          onClick={() => handleSave(config.moduleName)}
                          disabled={savingModule === config.moduleName}
                        >
                          {savingModule === config.moduleName ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          Save {config.label} Settings
                        </Button>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
