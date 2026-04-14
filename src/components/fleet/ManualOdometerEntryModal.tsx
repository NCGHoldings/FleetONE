import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Gauge } from "lucide-react";

interface ManualOdometerEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busId: string;
  busNo: string;
  currentOdometer?: number;
  onSuccess?: () => void;
}

export function ManualOdometerEntryModal({
  open,
  onOpenChange,
  busId,
  busNo,
  currentOdometer,
  onSuccess
}: ManualOdometerEntryModalProps) {
  const [baseOdometer, setBaseOdometer] = useState<string>("");
  const [readingDate, setReadingDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!baseOdometer || parseFloat(baseOdometer) <= 0) {
      toast.error("Please enter a valid odometer reading");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('buses')
        .update({
          base_odometer_km: parseFloat(baseOdometer),
          base_odometer_date: readingDate,
          odometer_source: 'manual',
          updated_at: new Date().toISOString()
        })
        .eq('id', busId);

      if (error) throw error;

      toast.success(`Base odometer set for ${busNo}`);
      onOpenChange(false);
      setBaseOdometer("");
      onSuccess?.();
    } catch (error: any) {
      console.error('Error setting base odometer:', error);
      toast.error(error.message || "Failed to set base odometer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" />
            Set Base Odometer - {busNo}
          </DialogTitle>
          <DialogDescription>
            Set the current odometer reading for this bus. The system will calculate daily mileage based on GPS waypoints from this baseline.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="baseOdometer">Current Odometer Reading (km)</Label>
            <Input
              id="baseOdometer"
              type="number"
              step="0.1"
              min="0"
              value={baseOdometer}
              onChange={(e) => setBaseOdometer(e.target.value)}
              placeholder="Enter current odometer reading"
              required
            />
            {currentOdometer && (
              <p className="text-sm text-muted-foreground">
                Current system reading: {currentOdometer.toFixed(1)} km
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="readingDate">Date of Reading</Label>
            <Input
              id="readingDate"
              type="date"
              value={readingDate}
              onChange={(e) => setReadingDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-blue-800">
            <p className="font-semibold mb-1">How it works:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>System will use GPS waypoints to calculate daily mileage</li>
              <li>Daily mileage will be added to this base reading</li>
              <li>Cumulative odometer = Base + GPS-calculated distance</li>
            </ul>
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
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Set Base Odometer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
