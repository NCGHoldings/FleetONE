import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bus, User, Phone } from "lucide-react";

interface RouteUpdateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routeId: string;
  routeName: string;
  currentData: {
    driver_name?: string;
    driver_contact?: string;
    bus_reg_no?: string;
  };
  onUpdate: (updates: {
    driver_name?: string;
    driver_contact?: string;
    bus_reg_no?: string;
  }) => Promise<void>;
}

export function RouteUpdateModal({ 
  open, 
  onOpenChange, 
  routeId, 
  routeName, 
  currentData,
  onUpdate 
}: RouteUpdateModalProps) {
  const [formData, setFormData] = useState({
    driver_name: currentData.driver_name || "",
    driver_contact: currentData.driver_contact || "",
    bus_reg_no: currentData.bus_reg_no || ""
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await onUpdate(formData);
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating route:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Route Information</DialogTitle>
          <DialogDescription>
            Update details for route: <strong>{routeName}</strong>
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bus_reg_no" className="flex items-center gap-2">
              <Bus className="h-4 w-4" />
              Bus Registration Number
            </Label>
            <Input
              id="bus_reg_no"
              placeholder="e.g., WP CAB-1234"
              value={formData.bus_reg_no}
              onChange={(e) => setFormData({ ...formData, bus_reg_no: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="driver_name" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Driver Name
            </Label>
            <Input
              id="driver_name"
              placeholder="Enter driver's full name"
              value={formData.driver_name}
              onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="driver_contact" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Driver Contact Number
            </Label>
            <Input
              id="driver_contact"
              placeholder="Enter phone number"
              value={formData.driver_contact}
              onChange={(e) => setFormData({ ...formData, driver_contact: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
            >
              {loading ? "Updating..." : "Update Route"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}