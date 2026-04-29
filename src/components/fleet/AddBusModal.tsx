import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Info } from "lucide-react";
import { useBusCategories } from "@/hooks/useBusCategories";

interface AddBusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddBusModal({ open, onOpenChange, onSuccess }: AddBusModalProps) {
  const [loading, setLoading] = useState(false);
  const { categories, subCategories, getSubCategoriesForCategory } = useBusCategories();
  const [formData, setFormData] = useState({
    bus_no: "",
    type: "",
    model: "",
    year: new Date().getFullYear().toString(),
    capacity: "50",
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
    category_id: "",
    sub_category_id: "",
  });
  const { toast } = useToast();

  const availableSubCategories = formData.category_id 
    ? getSubCategoriesForCategory(formData.category_id) 
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('buses')
        .insert({
          bus_no: formData.bus_no,
          type: formData.type || 'Normal',
          model: formData.model || 'Unknown',
          year: parseInt(formData.year) || new Date().getFullYear(),
          capacity: parseInt(formData.capacity) || 50,
          status: formData.status as "active" | "maintenance" | "idle" | "retired",
          route: formData.route || null,
          owner_name: formData.owner_name || null,
          owner_nic: formData.owner_nic || null,
          owner_address: formData.owner_address || null,
          registration_number: formData.registration_number || null,
          engine_number: formData.engine_number || null,
          chassis_number: formData.chassis_number || null,
          service_interval_km: parseInt(formData.service_interval_km) || 10000,
          expected_km_per_liter: parseFloat(formData.expected_km_per_liter) || 8,
          category_id: formData.category_id || null,
          sub_category_id: formData.sub_category_id || null,
          category_assignment_source: 'manual',
          current_mileage: 0,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "New bus added successfully.",
      });

      // Reset form
      setFormData({
        bus_no: "",
        type: "",
        model: "",
        year: new Date().getFullYear().toString(),
        capacity: "50",
        status: "active",
        route: "",
        owner_name: "",
        owner_nic: "",
        owner_address: "",
        registration_number: "",
        engine_number: "",
        chassis_number: "",
        service_interval_km: "10000",
        expected_km_per_liter: "8",
        category_id: "",
        sub_category_id: "",
      });
      
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error adding bus:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add new bus.",
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
          <DialogTitle>Add New Bus Profile</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              
              <div>
                <Label htmlFor="add_bus_no">Bus Number *</Label>
                <Input
                  id="add_bus_no"
                  value={formData.bus_no}
                  onChange={(e) => setFormData({ ...formData, bus_no: e.target.value.toUpperCase() })}
                  placeholder="e.g., NA-1234"
                  required
                />
              </div>

              {/* Category Selection */}
              <div className="p-3 rounded-lg border bg-muted/30 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Bus Category</Label>
                </div>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value, sub_category_id: '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {availableSubCategories.length > 0 && (
                  <Select
                    value={formData.sub_category_id}
                    onValueChange={(value) => setFormData({ ...formData, sub_category_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select sub-category (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSubCategories.map(sub => (
                        <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div>
                <Label htmlFor="add_type">Bus Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                  required
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
                <Label htmlFor="add_model">Model *</Label>
                <Input
                  id="add_model"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="e.g., Ashok Leyland"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="add_year">Year *</Label>
                  <Input
                    id="add_year"
                    type="number"
                    min="1980"
                    max="2030"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="add_capacity">Capacity *</Label>
                  <Input
                    id="add_capacity"
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
                <Label htmlFor="add_status">Status</Label>
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
                <Label htmlFor="add_route">Current Route</Label>
                <Input
                  id="add_route"
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
                <Label htmlFor="add_owner_name">Owner Name</Label>
                <Input
                  id="add_owner_name"
                  value={formData.owner_name}
                  onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="add_owner_nic">Owner NIC</Label>
                <Input
                  id="add_owner_nic"
                  value={formData.owner_nic}
                  onChange={(e) => setFormData({ ...formData, owner_nic: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="add_registration_number">Registration Number</Label>
                <Input
                  id="add_registration_number"
                  value={formData.registration_number}
                  onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="add_engine_number">Engine Number</Label>
                <Input
                  id="add_engine_number"
                  value={formData.engine_number}
                  onChange={(e) => setFormData({ ...formData, engine_number: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="add_chassis_number">Chassis Number</Label>
                <Input
                  id="add_chassis_number"
                  value={formData.chassis_number}
                  onChange={(e) => setFormData({ ...formData, chassis_number: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="add_service_interval_km">Service Interval (km)</Label>
                  <Input
                    id="add_service_interval_km"
                    type="number"
                    min="1000"
                    value={formData.service_interval_km}
                    onChange={(e) => setFormData({ ...formData, service_interval_km: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="add_expected_km_per_liter">Expected KM/L</Label>
                  <Input
                    id="add_expected_km_per_liter"
                    type="number"
                    step="0.1"
                    min="1"
                    value={formData.expected_km_per_liter}
                    onChange={(e) => setFormData({ ...formData, expected_km_per_liter: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="add_owner_address">Owner Address</Label>
                <Textarea
                  id="add_owner_address"
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
            <Button type="submit" disabled={loading || !formData.bus_no}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Add Bus Profile
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
