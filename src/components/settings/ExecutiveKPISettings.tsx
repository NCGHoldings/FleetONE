import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2, Save, RotateCcw, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface KPITarget {
  id: string;
  kpi_key: string;
  kpi_name: string;
  target_value: number;
  min_acceptable: number | null;
  unit: string;
  category: string;
  display_order: number;
  is_active: boolean;
}

const DEFAULT_TARGETS: Partial<KPITarget>[] = [
  { kpi_key: 'monthly_revenue', kpi_name: 'Monthly Revenue', target_value: 5000000, min_acceptable: 4000000, unit: 'LKR', category: 'Financial', display_order: 1 },
  { kpi_key: 'net_profit', kpi_name: 'Net Profit', target_value: 1000000, min_acceptable: 750000, unit: 'LKR', category: 'Financial', display_order: 2 },
  { kpi_key: 'profit_margin', kpi_name: 'Profit Margin', target_value: 25, min_acceptable: 15, unit: '%', category: 'Financial', display_order: 3 },
  { kpi_key: 'fleet_utilization', kpi_name: 'Fleet Utilization', target_value: 85, min_acceptable: 70, unit: '%', category: 'Fleet', display_order: 4 },
  { kpi_key: 'daily_trips', kpi_name: 'Daily Trips', target_value: 30, min_acceptable: 20, unit: 'trips', category: 'Operations', display_order: 5 },
  { kpi_key: 'fuel_efficiency', kpi_name: 'Fuel Efficiency', target_value: 12, min_acceptable: 8, unit: 'km/L', category: 'Efficiency', display_order: 6 },
  { kpi_key: 'completion_rate', kpi_name: 'Completion Rate', target_value: 95, min_acceptable: 85, unit: '%', category: 'Operations', display_order: 7 },
  { kpi_key: 'total_distance', kpi_name: 'Total Distance', target_value: 50000, min_acceptable: 40000, unit: 'km', category: 'Operations', display_order: 8 },
];

export function ExecutiveKPISettings() {
  const [kpis, setKpis] = useState<KPITarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadKPIs();
  }, []);

  const loadKPIs = async () => {
    try {
      const { data, error } = await supabase
        .from('executive_kpi_targets')
        .select('*')
        .order('display_order');

      if (error) throw error;
      setKpis(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading KPIs",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKPIChange = (id: string, field: keyof KPITarget, value: any) => {
    setKpis(prev => prev.map(kpi => 
      kpi.id === id ? { ...kpi, [field]: value } : kpi
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const kpi of kpis) {
        const { error } = await supabase
          .from('executive_kpi_targets')
          .update({
            target_value: kpi.target_value,
            min_acceptable: kpi.min_acceptable,
            is_active: kpi.is_active,
          })
          .eq('id', kpi.id);

        if (error) throw error;
      }

      toast({
        title: "KPI Targets Saved",
        description: "Your KPI target values have been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error saving KPIs",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = async () => {
    setSaving(true);
    try {
      for (const defaultKPI of DEFAULT_TARGETS) {
        const { error } = await supabase
          .from('executive_kpi_targets')
          .update({
            target_value: defaultKPI.target_value,
            min_acceptable: defaultKPI.min_acceptable,
          })
          .eq('kpi_key', defaultKPI.kpi_key);

        if (error) throw error;
      }

      await loadKPIs();
      toast({
        title: "Reset to Defaults",
        description: "KPI targets have been reset to default values.",
      });
    } catch (error: any) {
      toast({
        title: "Error resetting KPIs",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const groupedKPIs = kpis.reduce((acc, kpi) => {
    const category = kpi.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(kpi);
    return acc;
  }, {} as Record<string, KPITarget[]>);

  const categoryColors: Record<string, string> = {
    Financial: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    Fleet: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    Operations: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    Efficiency: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Target className="w-5 h-5" />
            Executive KPI Targets
          </h3>
          <p className="text-sm text-muted-foreground">
            Configure target values displayed on the Executive Dashboard
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleResetToDefaults} disabled={saving}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset Defaults
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </div>

      {Object.entries(groupedKPIs).map(([category, categoryKPIs]) => (
        <Card key={category}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Badge variant="outline" className={categoryColors[category] || ''}>
                {category}
              </Badge>
              KPIs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {categoryKPIs.map(kpi => (
              <div key={kpi.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center p-3 rounded-lg bg-muted/30">
                <div className="flex items-center justify-between md:justify-start gap-3">
                  <Switch
                    checked={kpi.is_active}
                    onCheckedChange={(checked) => handleKPIChange(kpi.id, 'is_active', checked)}
                  />
                  <Label className="font-medium">{kpi.kpi_name}</Label>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Target Value</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={kpi.target_value}
                      onChange={(e) => handleKPIChange(kpi.id, 'target_value', parseFloat(e.target.value) || 0)}
                      className="w-full"
                      disabled={!kpi.is_active}
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">{kpi.unit}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Min Acceptable</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={kpi.min_acceptable || ''}
                      onChange={(e) => handleKPIChange(kpi.id, 'min_acceptable', parseFloat(e.target.value) || null)}
                      className="w-full"
                      disabled={!kpi.is_active}
                      placeholder="Optional"
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">{kpi.unit}</span>
                  </div>
                </div>
                <div className="flex items-center">
                  <Badge variant={kpi.is_active ? "default" : "secondary"}>
                    {kpi.is_active ? "Active" : "Disabled"}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {kpis.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No KPI targets configured. Click "Reset Defaults" to initialize.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}