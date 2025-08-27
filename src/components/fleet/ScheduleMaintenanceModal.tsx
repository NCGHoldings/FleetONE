import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2, Wrench } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ScheduleMaintenanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bus: any;
  onSuccess: () => void;
}

export function ScheduleMaintenanceModal({ open, onOpenChange, bus, onSuccess }: ScheduleMaintenanceModalProps) {
  const [loading, setLoading] = useState(false);
  const [serviceTypes, setServiceTypes] = useState<any[]>([]);
  const [bays, setBays] = useState<any[]>([]);
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [formData, setFormData] = useState({
    service_type: "",
    description: "",
    estimated_hours: "",
    estimated_cost: "",
    priority: "medium",
    notes: "",
    bay_id: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchServiceTypes();
      fetchMaintenanceBays();
    }
  }, [open]);

  const fetchServiceTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('service_types')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setServiceTypes(data || []);
    } catch (error) {
      console.error('Error fetching service types:', error);
    }
  };

  const fetchMaintenanceBays = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_bays')
        .select('*')
        .eq('is_active', true)
        .order('bay_name');

      if (error) throw error;
      setBays(data || []);
    } catch (error) {
      console.error('Error fetching maintenance bays:', error);
    }
  };

  const generateMaintenanceNumber = () => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `MNT${year}${month}${day}${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduledDate) {
      toast({
        title: "Error",
        description: "Please select a scheduled date.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const maintenanceNo = generateMaintenanceNumber();

      const { error } = await supabase
        .from('maintenance_records')
        .insert({
          bus_id: bus.id,
          maintenance_no: maintenanceNo,
          service_type: formData.service_type,
          description: formData.description,
          scheduled_date: scheduledDate.toISOString().split('T')[0],
          estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : null,
          estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null,
          priority: formData.priority,
          notes: formData.notes,
          current_bay_id: formData.bay_id || null,
          status: 'pending',
          created_by: (await supabase.auth.getUser()).data.user?.id,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Maintenance scheduled successfully. Service #${maintenanceNo}`,
      });

      onSuccess();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        service_type: "",
        description: "",
        estimated_hours: "",
        estimated_cost: "",
        priority: "medium",
        notes: "",
        bay_id: "",
      });
      setScheduledDate(undefined);
    } catch (error) {
      console.error('Error scheduling maintenance:', error);
      toast({
        title: "Error",
        description: "Failed to schedule maintenance.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            Schedule Maintenance - {bus?.bus_no}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="service_type">Service Type *</Label>
              <Select
                value={formData.service_type}
                onValueChange={(value) => setFormData({ ...formData, service_type: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select service type" />
                </SelectTrigger>
                <SelectContent>
                  {serviceTypes.map((type) => (
                    <SelectItem key={type.id} value={type.name}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Scheduled Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    type="button"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduledDate ? format(scheduledDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={scheduledDate}
                    onSelect={setScheduledDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="bay_id">Preferred Bay</Label>
              <Select
                value={formData.bay_id}
                onValueChange={(value) => setFormData({ ...formData, bay_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select bay (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {bays.map((bay) => (
                    <SelectItem key={bay.id} value={bay.id}>
                      {bay.bay_name} - {bay.bay_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="estimated_hours">Estimated Hours</Label>
              <Input
                id="estimated_hours"
                type="number"
                step="0.5"
                min="0"
                value={formData.estimated_hours}
                onChange={(e) => setFormData({ ...formData, estimated_hours: e.target.value })}
                placeholder="e.g., 4.5"
              />
            </div>

            <div>
              <Label htmlFor="estimated_cost">Estimated Cost (₨)</Label>
              <Input
                id="estimated_cost"
                type="number"
                min="0"
                value={formData.estimated_cost}
                onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
                placeholder="e.g., 15000"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the maintenance work required..."
              rows={3}
              required
            />
          </div>

          <div>
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional notes or special instructions..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Wrench className="w-4 h-4 mr-2" />
              )}
              Schedule Maintenance
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}