import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useTyreManagement } from "@/hooks/useTyreManagement";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

interface TyreInspectionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buses: any[];
}

export const TyreInspectionForm = ({ open, onOpenChange, buses }: TyreInspectionFormProps) => {
  const { addInspection } = useTyreManagement();
  const [selectedBusId, setSelectedBusId] = useState<string>("");
  const [selectedTyreId, setSelectedTyreId] = useState<string>("");
  const [inspectionDate, setInspectionDate] = useState<Date>(new Date());
  const [treadDepth, setTreadDepth] = useState<string>("");
  const [pressure, setPressure] = useState<string>("");
  const [conditionStatus, setConditionStatus] = useState<string>("good");
  const [wearPattern, setWearPattern] = useState<string>("even");
  const [damageNotes, setDamageNotes] = useState<string>("");
  const [recommendation, setRecommendation] = useState<string>("continue_use");

  const { data: tyres } = useQuery({
    queryKey: ["bus-tyres-for-inspection", selectedBusId],
    queryFn: async () => {
      if (!selectedBusId) return [];
      
      const { data, error } = await supabase
        .from("bus_tyres")
        .select("*")
        .eq("bus_id", selectedBusId)
        .eq("status", "active");

      if (error) throw error;
      return data;
    },
    enabled: !!selectedBusId,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedBusId || !selectedTyreId) {
      return;
    }

    addInspection({
      bus_id: selectedBusId,
      tyre_id: selectedTyreId,
      inspection_date: format(inspectionDate, "yyyy-MM-dd"),
      tread_depth_mm: parseFloat(treadDepth),
      pressure_psi: parseFloat(pressure),
      condition_status: conditionStatus,
      wear_pattern: wearPattern,
      damage_notes: damageNotes || null,
      recommendation: recommendation,
    });

    // Reset form
    setSelectedBusId("");
    setSelectedTyreId("");
    setTreadDepth("");
    setPressure("");
    setDamageNotes("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Tyre Inspection</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Bus</Label>
              <Select value={selectedBusId} onValueChange={setSelectedBusId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select bus" />
                </SelectTrigger>
                <SelectContent>
                  {buses.map((bus) => (
                    <SelectItem key={bus.id} value={bus.id}>
                      {bus.bus_no} - {bus.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tyre Position</Label>
              <Select value={selectedTyreId} onValueChange={setSelectedTyreId} required disabled={!selectedBusId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tyre" />
                </SelectTrigger>
                <SelectContent>
                  {tyres?.map((tyre) => (
                    <SelectItem key={tyre.id} value={tyre.id}>
                      {tyre.position} - {tyre.tyre_brand}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Inspection Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(inspectionDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={inspectionDate}
                    onSelect={(date) => date && setInspectionDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Tread Depth (mm)</Label>
              <Input
                type="number"
                step="0.1"
                value={treadDepth}
                onChange={(e) => setTreadDepth(e.target.value)}
                placeholder="e.g., 12.5"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Pressure (PSI)</Label>
              <Input
                type="number"
                step="0.1"
                value={pressure}
                onChange={(e) => setPressure(e.target.value)}
                placeholder="e.g., 100"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Condition Status</Label>
              <Select value={conditionStatus} onValueChange={setConditionStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Wear Pattern</Label>
              <Select value={wearPattern} onValueChange={setWearPattern}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="even">Even Wear</SelectItem>
                  <SelectItem value="center_wear">Center Wear</SelectItem>
                  <SelectItem value="edge_wear">Edge Wear</SelectItem>
                  <SelectItem value="cupping">Cupping</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Recommendation</Label>
              <Select value={recommendation} onValueChange={setRecommendation}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="continue_use">Continue Use</SelectItem>
                  <SelectItem value="rotate_soon">Rotate Soon</SelectItem>
                  <SelectItem value="replace_soon">Replace Soon</SelectItem>
                  <SelectItem value="replace_urgent">Replace Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Damage Notes (Optional)</Label>
            <Textarea
              value={damageNotes}
              onChange={(e) => setDamageNotes(e.target.value)}
              placeholder="Any cuts, bulges, or unusual wear patterns..."
              rows={3}
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-primary to-purple-600">
              Save Inspection
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
