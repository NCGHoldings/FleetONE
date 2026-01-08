import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePayrollSettings } from "@/hooks/usePayrollSettings";
import { useAuth } from "@/hooks/useAuth";
import { Settings, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

export function PayrollSettingsComponent() {
  const { settings, loading, updateSetting, getSettingsMap } = usePayrollSettings();
  const { user } = useAuth();
  const [saving, setSaving] = useState<string | null>(null);

  const currentSettings = getSettingsMap();

  const handleSave = async (key: string, value: any) => {
    setSaving(key);
    await updateSetting(key, value, user?.id);
    setSaving(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Working Days & Salary
          </CardTitle>
          <CardDescription>
            Configure working days and salary calculation settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Working Days Per Month</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  defaultValue={currentSettings.working_days_per_month}
                  onBlur={(e) => handleSave("working_days_per_month", Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">days</span>
                {saving === "working_days_per_month" && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
              <p className="text-xs text-muted-foreground">
                Standard number of working days in a month
              </p>
            </div>

            <div className="space-y-2">
              <Label>Minimum Days for Full Monthly Salary</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  defaultValue={currentSettings.minimum_days_for_monthly}
                  onBlur={(e) => handleSave("minimum_days_for_monthly", Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">days</span>
                {saving === "minimum_days_for_monthly" && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
              <p className="text-xs text-muted-foreground">
                Below this, salary is prorated
              </p>
            </div>

            <div className="space-y-2">
              <Label>Overtime Multiplier</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.1"
                  defaultValue={currentSettings.overtime_multiplier}
                  onBlur={(e) => handleSave("overtime_multiplier", Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">x base rate</span>
                {saving === "overtime_multiplier" && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
              <p className="text-xs text-muted-foreground">
                Multiply base rate for overtime hours
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Commission Settings</CardTitle>
          <CardDescription>
            Configure commission calculation and payout settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Commission Payout Day</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="1"
                  max="28"
                  defaultValue={currentSettings.commission_payout_day}
                  onBlur={(e) => handleSave("commission_payout_day", Number(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">of each month</span>
                {saving === "commission_payout_day" && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
              <p className="text-xs text-muted-foreground">
                Day of month when commissions are paid
              </p>
            </div>

            <div className="space-y-2">
              <Label>Auto-Approve Commission Threshold</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">LKR</span>
                <Input
                  type="number"
                  defaultValue={currentSettings.auto_approve_commission_threshold}
                  onBlur={(e) => handleSave("auto_approve_commission_threshold", Number(e.target.value))}
                  className="w-32"
                />
                {saving === "auto_approve_commission_threshold" && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Commissions below this amount are auto-approved
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Automation Settings</CardTitle>
          <CardDescription>
            Configure automatic attendance sync and processing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Attendance Sync Frequency</Label>
            <div className="flex items-center gap-2">
              <Select
                defaultValue={currentSettings.attendance_sync_frequency}
                onValueChange={(v) => handleSave("attendance_sync_frequency", v)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="realtime">Real-time</SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="manual">Manual Only</SelectItem>
                </SelectContent>
              </Select>
              {saving === "attendance_sync_frequency" && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
            <p className="text-xs text-muted-foreground">
              How often to automatically sync attendance from daily trips
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
