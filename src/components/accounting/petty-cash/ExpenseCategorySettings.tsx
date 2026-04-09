import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Settings, CheckCircle } from "lucide-react";
import { EXPENSE_CATEGORIES } from "@/hooks/useExpenseRequests";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

export const ExpenseCategorySettings = () => {
  const { selectedCompanyId } = useCompany();
  const queryClient = useQueryClient();

  // Fetch current settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["company-expense-categories", selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      const { data, error } = await supabase
        .from("company_expense_categories")
        .select("*")
        .eq("company_id", selectedCompanyId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCompanyId,
  });

  // Local state for toggles
  const [localSettings, setLocalSettings] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Initialize: if no settings exist, all are enabled by default
    const map: Record<string, boolean> = {};
    for (const cat of EXPENSE_CATEGORIES) {
      const setting = settings?.find((s: any) => s.category_value === cat.value);
      map[cat.value] = setting ? setting.is_enabled : true;
    }
    setLocalSettings(map);
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCompanyId) return;

      // Upsert all category settings
      const rows = EXPENSE_CATEGORIES.map((cat) => ({
        company_id: selectedCompanyId,
        category_value: cat.value,
        is_enabled: localSettings[cat.value] ?? true,
        updated_at: new Date().toISOString(),
      }));

      // Delete existing and re-insert (simple approach for upsert)
      await supabase
        .from("company_expense_categories")
        .delete()
        .eq("company_id", selectedCompanyId);

      const { error } = await supabase
        .from("company_expense_categories")
        .insert(rows);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-expense-categories"] });
      toast({ title: "Settings Saved", description: "Expense category visibility updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const toggleCategory = (value: string) => {
    setLocalSettings((prev) => ({ ...prev, [value]: !prev[value] }));
  };

  const enableAll = () => {
    const map: Record<string, boolean> = {};
    EXPENSE_CATEGORIES.forEach((c) => (map[c.value] = true));
    setLocalSettings(map);
  };

  const disableAll = () => {
    const map: Record<string, boolean> = {};
    EXPENSE_CATEGORIES.forEach((c) => (map[c.value] = false));
    setLocalSettings(map);
  };

  // Group by category group
  const grouped = EXPENSE_CATEGORIES.reduce((acc, cat) => {
    if (!acc[cat.group]) acc[cat.group] = [];
    acc[cat.group].push(cat);
    return acc;
  }, {} as Record<string, typeof EXPENSE_CATEGORIES>);

  const enabledCount = Object.values(localSettings).filter(Boolean).length;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Expense Category Settings</h3>
          <Badge variant="outline">{enabledCount}/{EXPENSE_CATEGORIES.length} enabled</Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={enableAll}>Enable All</Button>
          <Button variant="ghost" size="sm" onClick={disableAll}>Disable All</Button>
          <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
            Save
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Toggle which expense categories are visible for this company. Disabled categories won't appear in expense forms or petty cash disbursements.
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(grouped).map(([group, cats]) => (
          <Card key={group} className="p-4">
            <h4 className="font-medium text-sm mb-3 text-muted-foreground uppercase tracking-wider">{group}</h4>
            <div className="space-y-2.5">
              {cats.map((cat) => (
                <div key={cat.value} className="flex items-center justify-between">
                  <span className="text-sm">{cat.label}</span>
                  <Switch
                    checked={localSettings[cat.value] ?? true}
                    onCheckedChange={() => toggleCategory(cat.value)}
                  />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
