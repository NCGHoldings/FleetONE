import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useTyreManagement } from "@/hooks/useTyreManagement";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

interface AddTyreModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buses: any[];
}

export const AddTyreModal = ({ open, onOpenChange, buses }: AddTyreModalProps) => {
  const { addTyre } = useTyreManagement();
  const [formData, setFormData] = useState({
    bus_id: "",
    position: "",
    tyre_brand: "",
    tyre_size: "295/80R22.5",
    tyre_type: "Radial",
    tyre_serial_number: "",
    installation_date: new Date(),
    purchase_date: new Date(),
    purchase_cost: "",
    expected_lifespan_km: "80000",
    original_tread_depth_mm: "18.0",
    current_tread_depth_mm: "18.0",
    km_at_installation: "",
    notes: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    addTyre({
      ...formData,
      installation_date: format(formData.installation_date, "yyyy-MM-dd"),
      purchase_date: format(formData.purchase_date, "yyyy-MM-dd"),
      purchase_cost: parseFloat(formData.purchase_cost),
      expected_lifespan_km: parseInt(formData.expected_lifespan_km),
      original_tread_depth_mm: parseFloat(formData.original_tread_depth_mm),
      current_tread_depth_mm: parseFloat(formData.current_tread_depth_mm),
      km_at_installation: parseInt(formData.km_at_installation),
      current_km: parseInt(formData.km_at_installation),
      condition_percentage: 100,
      status: "active",
    });

    onOpenChange(false);
  };

  const tyrePositions = [
    "Front Left",
    "Front Right",
    "Rear Left 1",
    "Rear Right 1",
    "Rear Left 2",
    "Rear Right 2",
  ];

  const tyreBrands = ["Maxload", "Double Coin", "CEAT", "MRF", "JK Tyre", "Other"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Tyre</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Bus *</Label>
              <Select
                value={formData.bus_id}
                onValueChange={(value) => setFormData({ ...formData, bus_id: value })}
                required
              >
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
              <Label>Position *</Label>
              <Select
                value={formData.position}
                onValueChange={(value) => setFormData({ ...formData, position: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  {tyrePositions.map((pos) => (
                    <SelectItem key={pos} value={pos}>
                      {pos}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Brand *</Label>
              <Select
                value={formData.tyre_brand}
                onValueChange={(value) => setFormData({ ...formData, tyre_brand: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  {tyreBrands.map((brand) => (
                    <SelectItem key={brand} value={brand}>
                      {brand}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Size *</Label>
              <Input
                value={formData.tyre_size}
                onChange={(e) => setFormData({ ...formData, tyre_size: e.target.value })}
                placeholder="e.g., 295/80R22.5"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={formData.tyre_type}
                onValueChange={(value) => setFormData({ ...formData, tyre_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Radial">Radial</SelectItem>
                  <SelectItem value="Bias">Bias</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Serial Number</Label>
              <Input
                value={formData.tyre_serial_number}
                onChange={(e) => setFormData({ ...formData, tyre_serial_number: e.target.value })}
                placeholder="Optional"
              />
            </div>

            <div className="space-y-2">
              <Label>Installation Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(formData.installation_date, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.installation_date}
                    onSelect={(date) => date && setFormData({ ...formData, installation_date: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Purchase Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(formData.purchase_date, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.purchase_date}
                    onSelect={(date) => date && setFormData({ ...formData, purchase_date: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Purchase Cost (LKR) *</Label>
              <Input
                type="number"
                value={formData.purchase_cost}
                onChange={(e) => setFormData({ ...formData, purchase_cost: e.target.value })}
                placeholder="e.g., 45000"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Expected Lifespan (KM) *</Label>
              <Input
                type="number"
                value={formData.expected_lifespan_km}
                onChange={(e) => setFormData({ ...formData, expected_lifespan_km: e.target.value })}
                placeholder="e.g., 80000"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Original Tread Depth (mm) *</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.original_tread_depth_mm}
                onChange={(e) => setFormData({ ...formData, original_tread_depth_mm: e.target.value })}
                placeholder="e.g., 18.0"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>KM at Installation *</Label>
              <Input
                type="number"
                value={formData.km_at_installation}
                onChange={(e) => setFormData({ ...formData, km_at_installation: e.target.value })}
                placeholder="Current bus mileage"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional information..."
              rows={2}
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-primary to-purple-600">
              Add Tyre
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
