import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Settings } from "lucide-react";

interface OdometerAdjustmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busId: string;
  busNo: string;
  currentOdometer?: number;
  onSuccess?: () => void;
}

export function OdometerAdjustmentModal({
  open,
  onOpenChange,
  busId,
  busNo,
  currentOdometer,
  onSuccess
}: OdometerAdjustmentModalProps) {
  const [newOdometer, setNewOdometer] = useState<string>("");
  const [adjustmentReason, setAdjustmentReason] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newOdometer || parseFloat(newOdometer) <= 0) {
      toast.error("Please enter a valid odometer reading");
      return;
    }

    if (!adjustmentReason.trim()) {
      toast.error("Please provide a reason for the adjustment");
      return;
    }

    setSaving(true);

    try {
      // Get Sri Lanka date
      const now = new Date();
      const sriLankaTime = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
      const sriLankaDate = sriLankaTime.toISOString().split('T')[0];

      // Update base odometer
      const { error: busError } = await supabase
        .from('buses')
        .update({
          base_odometer_km: parseFloat(newOdometer),
          base_odometer_date: sriLankaDate,
          odometer_source: 'manual',
          updated_at: new Date().toISOString()
        })
        .eq('id', busId);

      if (busError) throw busError;

      // Log the adjustment
      const { error: logError } = await supabase
        .from('bus_daily_mileage')
        .insert({
          bus_id: busId,
          date: sriLankaDate,
          end_odometer_km: parseFloat(newOdometer),
          daily_km: 0,
          data_source: 'manual',
          is_adjusted: true,
          adjustment_reason: adjustmentReason
        });

      if (logError && logError.code !== '23505') { // Ignore duplicate key error
        console.warn('Could not log adjustment:', logError);
      }

      toast.success(`Odometer adjusted for ${busNo}`);
      onOpenChange(false);
      setNewOdometer("");
      setAdjustmentReason("");
      onSuccess?.();
    } catch (error: any) {
      console.error('Error adjusting odometer:', error);
      toast.error(error.message || "Failed to adjust odometer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-orange-600" />
            Adjust Odometer - {busNo}
          </DialogTitle>
          <DialogDescription>
            Manually adjust the odometer reading when data issues occur or after service.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {currentOdometer && (
            <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Current Reading:</span>{" "}
                {currentOdometer.toFixed(1)} km
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="newOdometer">New Odometer Reading (km) *</Label>
            <Input
              id="newOdometer"
              type="number"
              step="0.1"
              min="0"
              value={newOdometer}
              onChange={(e) => setNewOdometer(e.target.value)}
              placeholder="Enter corrected odometer reading"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="adjustmentReason">Reason for Adjustment *</Label>
            <Textarea
              id="adjustmentReason"
              value={adjustmentReason}
              onChange={(e) => setAdjustmentReason(e.target.value)}
              placeholder="e.g., GPS data error, service reset, manual correction"
              rows={3}
              required
            />
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-md p-3 text-sm text-orange-800">
            <p className="font-semibold mb-1">⚠️ Important:</p>
            <p className="text-xs">
              This will reset the base odometer and recalculate daily mileage from this point forward. 
              All adjustment history will be logged.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving} variant="default">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Adjust Odometer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
