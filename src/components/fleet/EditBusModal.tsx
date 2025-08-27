import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";

interface EditBusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bus: any;
  onSuccess: () => void;
}

export function EditBusModal({ open, onOpenChange, bus, onSuccess }: EditBusModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    bus_no: "",
    type: "",
    model: "",
    year: "",
    capacity: "",
    status: "active" as "active" | "maintenance" | "idle" | "retired",
    route: "",
    owner_name: "",
    owner_nic: "",
    owner_address: "",
    registration_number: "",
    engine_number: "",
    chassis_number: "",
    service_interval_km: "10000",
    expected_km_per_liter: "8",
  });
  const { toast } = useToast();

  useEffect(() => {
    if (bus) {
      setFormData({
        bus_no: bus.bus_no || "",
        type: bus.type || "",
        model: bus.model || "",
        year: bus.year?.toString() || "",
        capacity: bus.capacity?.toString() || "",
        status: (bus.status || "active") as "active" | "maintenance" | "idle" | "retired",
        route: bus.route || "",
        owner_name: bus.owner_name || "",
        owner_nic: bus.owner_nic || "",
        owner_address: bus.owner_address || "",
        registration_number: bus.registration_number || "",
        engine_number: bus.engine_number || "",
        chassis_number: bus.chassis_number || "",
        service_interval_km: bus.service_interval_km?.toString() || "10000",
        expected_km_per_liter: bus.expected_km_per_liter?.toString() || "8",
      });
    }
  }, [bus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('buses')
        .update({
          bus_no: formData.bus_no,
          type: formData.type,
          model: formData.model,
          year: parseInt(formData.year),
          capacity: parseInt(formData.capacity),
          status: formData.status as "active" | "maintenance" | "idle" | "retired",
          route: formData.route || null,
          owner_name: formData.owner_name || null,
          owner_nic: formData.owner_nic || null,
          owner_address: formData.owner_address || null,
          registration_number: formData.registration_number || null,
          engine_number: formData.engine_number || null,
          chassis_number: formData.chassis_number || null,
          service_interval_km: parseInt(formData.service_interval_km),
          expected_km_per_liter: parseFloat(formData.expected_km_per_liter),
          updated_at: new Date().toISOString(),
        })
        .eq('id', bus.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Bus information updated successfully.",
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating bus:', error);
      toast({
        title: "Error",
        description: "Failed to update bus information.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Bus - {bus?.bus_no}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              
              <div>
                <Label htmlFor="bus_no">Bus Number *</Label>
                <Input
                  id="bus_no"
                  value={formData.bus_no}
                  onChange={(e) => setFormData({ ...formData, bus_no: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="type">Bus Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select bus type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Semi-Luxury">Semi-Luxury</SelectItem>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="Express">Express</SelectItem>
                    <SelectItem value="Intercity">Intercity</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="model">Model *</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="year">Year *</Label>
                  <Input
                    id="year"
                    type="number"
                    min="1980"
                    max="2030"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="capacity">Capacity *</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min="1"
                    max="100"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as "active" | "maintenance" | "idle" | "retired" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="idle">Idle</SelectItem>
                    <SelectItem value="retired">Retired</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="route">Current Route</Label>
                <Input
                  id="route"
                  value={formData.route}
                  onChange={(e) => setFormData({ ...formData, route: e.target.value })}
                  placeholder="e.g., Colombo - Galle"
                />
              </div>
            </div>

            {/* Owner & Registration Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Owner & Registration</h3>
              
              <div>
                <Label htmlFor="owner_name">Owner Name</Label>
                <Input
                  id="owner_name"
                  value={formData.owner_name}
                  onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="owner_nic">Owner NIC</Label>
                <Input
                  id="owner_nic"
                  value={formData.owner_nic}
                  onChange={(e) => setFormData({ ...formData, owner_nic: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="registration_number">Registration Number</Label>
                <Input
                  id="registration_number"
                  value={formData.registration_number}
                  onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="engine_number">Engine Number</Label>
                <Input
                  id="engine_number"
                  value={formData.engine_number}
                  onChange={(e) => setFormData({ ...formData, engine_number: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="chassis_number">Chassis Number</Label>
                <Input
                  id="chassis_number"
                  value={formData.chassis_number}
                  onChange={(e) => setFormData({ ...formData, chassis_number: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="service_interval_km">Service Interval (km)</Label>
                  <Input
                    id="service_interval_km"
                    type="number"
                    min="1000"
                    value={formData.service_interval_km}
                    onChange={(e) => setFormData({ ...formData, service_interval_km: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="expected_km_per_liter">Expected KM/L</Label>
                  <Input
                    id="expected_km_per_liter"
                    type="number"
                    step="0.1"
                    min="1"
                    value={formData.expected_km_per_liter}
                    onChange={(e) => setFormData({ ...formData, expected_km_per_liter: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="owner_address">Owner Address</Label>
                <Textarea
                  id="owner_address"
                  value={formData.owner_address}
                  onChange={(e) => setFormData({ ...formData, owner_address: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}