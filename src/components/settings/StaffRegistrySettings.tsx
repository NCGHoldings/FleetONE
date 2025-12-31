import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useStaffRegistry, StaffFormData, StaffType, SalaryType } from "@/hooks/useStaffRegistry";
import { Plus, Edit, Trash2, User, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function StaffRegistrySettings() {
  const { staff, loading, addStaff, updateStaff, deleteStaff, toggleActive } = useStaffRegistry();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<StaffFormData>({
    staff_name: "",
    staff_type: "driver",
    salary_type: "monthly",
    monthly_salary: 0,
    daily_rate: 0,
    contact_number: "",
    nic_number: "",
  });

  const resetForm = () => {
    setFormData({
      staff_name: "",
      staff_type: "driver",
      salary_type: "monthly",
      monthly_salary: 0,
      daily_rate: 0,
      contact_number: "",
      nic_number: "",
    });
    setEditingId(null);
  };

  const handleOpenDialog = (staffMember?: any) => {
    if (staffMember) {
      setEditingId(staffMember.id);
      setFormData({
        staff_name: staffMember.staff_name,
        staff_type: staffMember.staff_type,
        salary_type: staffMember.salary_type,
        monthly_salary: staffMember.monthly_salary || 0,
        daily_rate: staffMember.daily_rate || 0,
        contact_number: staffMember.contact_number || "",
        nic_number: staffMember.nic_number || "",
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.staff_name.trim()) {
      toast.error("Staff name is required");
      return;
    }

    let success;
    if (editingId) {
      success = await updateStaff(editingId, formData);
    } else {
      success = await addStaff(formData);
    }

    if (success) {
      setIsDialogOpen(false);
      resetForm();
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Delete ${name}? This cannot be undone.`)) {
      await deleteStaff(id);
    }
  };

  const drivers = staff.filter(s => s.staff_type === "driver");
  const conductors = staff.filter(s => s.staff_type === "conductor");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-500" />
            <span className="font-medium">{drivers.length} Drivers</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-green-500" />
            <span className="font-medium">{conductors.length} Conductors</span>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Staff
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Staff Member" : "Add Staff Member"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={formData.staff_name}
                  onChange={(e) => setFormData({ ...formData, staff_name: e.target.value })}
                  placeholder="Enter staff name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={formData.staff_type}
                    onValueChange={(v) => setFormData({ ...formData, staff_type: v as StaffType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="driver">Driver</SelectItem>
                      <SelectItem value="conductor">Conductor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Salary Type</Label>
                  <Select
                    value={formData.salary_type}
                    onValueChange={(v) => setFormData({ ...formData, salary_type: v as SalaryType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.salary_type === "monthly" ? (
                <div className="space-y-2">
                  <Label>Monthly Salary (LKR)</Label>
                  <Input
                    type="number"
                    value={formData.monthly_salary}
                    onChange={(e) => setFormData({ ...formData, monthly_salary: Number(e.target.value) })}
                    placeholder="e.g., 50000"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Daily Rate (LKR)</Label>
                  <Input
                    type="number"
                    value={formData.daily_rate}
                    onChange={(e) => setFormData({ ...formData, daily_rate: Number(e.target.value) })}
                    placeholder="e.g., 2500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Contact Number</Label>
                  <Input
                    value={formData.contact_number}
                    onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                    placeholder="07X XXX XXXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label>NIC Number</Label>
                  <Input
                    value={formData.nic_number}
                    onChange={(e) => setFormData({ ...formData, nic_number: e.target.value })}
                    placeholder="XXXXXXXXXV"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>
                  {editingId ? "Update" : "Add"} Staff
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Salary Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No staff members registered. Click "Add Staff" to get started.
                  </TableCell>
                </TableRow>
              ) : (
                staff.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.staff_name}</TableCell>
                    <TableCell>
                      <Badge variant={s.staff_type === "driver" ? "default" : "secondary"}>
                        {s.staff_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{s.salary_type}</Badge>
                    </TableCell>
                    <TableCell>
                      LKR {s.salary_type === "monthly" 
                        ? s.monthly_salary?.toLocaleString() 
                        : `${s.daily_rate?.toLocaleString()}/day`}
                    </TableCell>
                    <TableCell>{s.contact_number || "-"}</TableCell>
                    <TableCell>
                      <Switch
                        checked={s.is_active}
                        onCheckedChange={(checked) => toggleActive(s.id, checked)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleOpenDialog(s)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => handleDelete(s.id, s.staff_name)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
