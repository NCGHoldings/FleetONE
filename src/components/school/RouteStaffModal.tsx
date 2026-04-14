import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus } from "lucide-react";

interface RouteStaffModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routeId: string;
  routeName: string;
  onAddStaff: (staff: {
    staff_type: string;
    staff_name: string;
    monthly_salary: number;
    daily_rate?: number;
    contact_number?: string;
  }) => Promise<void>;
}

const STAFF_TYPES = [
  { value: "driver", label: "Driver" },
  { value: "caretaker", label: "Caretaker/Conductor" },
  { value: "other", label: "Other" }
];

export function RouteStaffModal({ 
  open, 
  onOpenChange, 
  routeId, 
  routeName, 
  onAddStaff 
}: RouteStaffModalProps) {
  const [formData, setFormData] = useState({
    staff_type: "",
    staff_name: "",
    monthly_salary: "",
    daily_rate: "",
    contact_number: ""
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.staff_type || !formData.staff_name || !formData.monthly_salary) {
      return;
    }

    setLoading(true);
    
    try {
      await onAddStaff({
        staff_type: formData.staff_type,
        staff_name: formData.staff_name,
        monthly_salary: parseFloat(formData.monthly_salary),
        daily_rate: formData.daily_rate ? parseFloat(formData.daily_rate) : undefined,
        contact_number: formData.contact_number || undefined
      });
      
      // Reset form
      setFormData({
        staff_type: "",
        staff_name: "",
        monthly_salary: "",
        daily_rate: "",
        contact_number: ""
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding staff:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate daily rate when monthly salary changes
  const handleMonthlySalaryChange = (value: string) => {
    setFormData({ 
      ...formData, 
      monthly_salary: value,
      daily_rate: value ? (parseFloat(value) / 30).toFixed(2) : ""
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Staff Member
          </DialogTitle>
          <DialogDescription>
            Add a staff member for route: <strong>{routeName}</strong>
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="staff_type">Staff Type</Label>
            <Select 
              value={formData.staff_type} 
              onValueChange={(value) => setFormData({ ...formData, staff_type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select staff type" />
              </SelectTrigger>
              <SelectContent>
                {STAFF_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="staff_name">Full Name</Label>
            <Input
              id="staff_name"
              placeholder="Enter staff member's full name"
              value={formData.staff_name}
              onChange={(e) => setFormData({ ...formData, staff_name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact_number">Contact Number</Label>
            <Input
              id="contact_number"
              placeholder="Enter phone number"
              value={formData.contact_number}
              onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monthly_salary">Monthly Salary (LKR)</Label>
              <Input
                id="monthly_salary"
                type="number"
                placeholder="0.00"
                step="0.01"
                min="0"
                value={formData.monthly_salary}
                onChange={(e) => handleMonthlySalaryChange(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="daily_rate">Daily Rate (Auto)</Label>
              <Input
                id="daily_rate"
                type="number"
                placeholder="Auto calculated"
                value={formData.daily_rate}
                disabled
                className="bg-muted"
              />
            </div>
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
              disabled={loading || !formData.staff_type || !formData.staff_name || !formData.monthly_salary}
            >
              {loading ? "Adding..." : "Add Staff Member"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}