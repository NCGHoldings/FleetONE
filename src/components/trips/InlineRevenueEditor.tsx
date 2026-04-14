import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { autoPostTripIfEnabled } from "@/hooks/useNCGExpressFinance";

interface TripData {
  id: string;
  trip_no: string;
  route_name: string;
  driver_name?: string;
  conductor_name?: string;
  income: number;
  distance_km?: number;
  start_time?: string;
  end_time?: string;
}

interface InlineRevenueEditorProps {
  isOpen: boolean;
  onClose: () => void;
  trip: TripData | null;
  onSaved: () => void;
}

export function InlineRevenueEditor({
  isOpen,
  onClose,
  trip,
  onSaved,
}: InlineRevenueEditorProps) {
  const [income, setIncome] = useState<number>(0);
  const [distance, setDistance] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && trip) {
      setIncome(trip.income || 0);
      setDistance(trip.distance_km || 0);
    }
  }, [isOpen, trip]);

  const handleSave = async () => {
    if (!trip) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("daily_trips")
        .update({
          income: income,
          distance_km: distance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", trip.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Revenue updated for ${trip.trip_no}`,
      });

      // Auto-post to GL if enabled in settings (non-blocking)
      autoPostTripIfEnabled(trip.id);

      onSaved();
      onClose();
    } catch (error: any) {
      console.error("Error updating trip:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update revenue",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (!trip) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Revenue - {trip.trip_no}</DialogTitle>
          <DialogDescription>
            {trip.route_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Trip Info (read-only) */}
          <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
            {trip.driver_name && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Driver:</span>
                <span>{trip.driver_name}</span>
              </div>
            )}
            {trip.conductor_name && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Conductor:</span>
                <span>{trip.conductor_name}</span>
              </div>
            )}
            {trip.start_time && trip.end_time && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Time:</span>
                <span>{trip.start_time} - {trip.end_time}</span>
              </div>
            )}
          </div>

          {/* Editable Fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="income">Revenue (LKR)</Label>
              <Input
                id="income"
                type="number"
                min="0"
                step="100"
                value={income || ''}
                onChange={(e) => setIncome(parseFloat(e.target.value) || 0)}
                placeholder="Enter revenue"
                className="text-lg font-medium"
              />
              <p className="text-xs text-muted-foreground">
                Current: {formatCurrency(trip.income)}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="distance">Distance (km)</Label>
              <Input
                id="distance"
                type="number"
                min="0"
                step="0.1"
                value={distance || ''}
                onChange={(e) => setDistance(parseFloat(e.target.value) || 0)}
                placeholder="Enter distance"
              />
              <p className="text-xs text-muted-foreground">
                Current: {trip.distance_km?.toFixed(1) || 0} km
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
