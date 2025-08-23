import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Users, UserPlus, Shield, Edit, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { KPICard } from "@/components/dashboard/KPICard";

interface Profile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  employee_id: string;
  phone: string;
  email: string;
  hire_date: string;
  status: string;
  roles: string[];
}

export default function StaffManagement() {
  const { hasRole } = useAuth();
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Profile | null>(null);
  
  // Form states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("staff");

  const isAdmin = hasRole('super_admin') || hasRole('admin');

  const fetchStaff = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, first_name, last_name, employee_id, phone, hire_date, status');

      if (profilesError) throw profilesError;

      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const staffData = profiles?.map(profile => ({
        ...profile,
        email: '', // Will be populated from auth if available
        roles: userRoles?.filter(r => r.user_id === profile.user_id).map(r => r.role) || []
      })) || [];

      setStaff(staffData);
    } catch (error) {
      console.error('Error fetching staff:', error);
      toast.error('Failed to load staff data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleCreateStaff = async () => {
    if (!isAdmin) {
      toast.error('Access denied');
      return;
    }

    try {
      // Create user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: 'TempPass123!', // Temporary password
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName
        }
      });

      if (authError) throw authError;

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          last_name: lastName,
          phone,
          hire_date: new Date().toISOString().split('T')[0]
        })
        .eq('user_id', authData.user.id);

      if (profileError) throw profileError;

      // Assign role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: role as any
        });

      if (roleError) throw roleError;

      toast.success('Staff member created successfully');
      setIsDialogOpen(false);
      resetForm();
      fetchStaff();
    } catch (error: any) {
      console.error('Error creating staff:', error);
      toast.error(error.message || 'Failed to create staff member');
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    if (!isAdmin) {
      toast.error('Access denied');
      return;
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole as any })
        .eq('user_id', userId);

      if (error) throw error;
      
      toast.success('Role updated successfully');
      fetchStaff();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    }
  };

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setRole("staff");
    setEditingStaff(null);
  };

  const columns: ColumnDef<Profile>[] = [
    {
      accessorKey: "employee_id",
      header: "Employee ID",
    },
    {
      accessorKey: "first_name",
      header: "First Name",
    },
    {
      accessorKey: "last_name", 
      header: "Last Name",
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "phone",
      header: "Phone",
    },
    {
      accessorKey: "roles",
      header: "Roles",
      cell: ({ row }) => (
        <div className="flex gap-1">
          {row.original.roles.map((role) => (
            <Badge key={role} variant="secondary">
              {role.replace('_', ' ')}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.getValue("status") === "active" ? "default" : "secondary"}>
          {row.getValue("status")}
        </Badge>
      ),
    },
    ...(isAdmin ? [{
      id: "actions",
      header: "Actions",
      cell: ({ row }: { row: any }) => (
        <div className="flex gap-2">
          <Select onValueChange={(value) => handleUpdateRole(row.original.user_id, value)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Change Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="staff">Staff</SelectItem>
              <SelectItem value="driver">Driver</SelectItem>
              <SelectItem value="conductor">Conductor</SelectItem>
              <SelectItem value="mechanic">Mechanic</SelectItem>
              <SelectItem value="supervisor">Supervisor</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ),
    }] : []),
  ];

  const totalStaff = staff.length;
  const activeStaff = staff.filter(s => s.status === 'active').length;
  const adminCount = staff.filter(s => s.roles.includes('admin') || s.roles.includes('super_admin')).length;
  const driverCount = staff.filter(s => s.roles.includes('driver')).length;

  if (!isAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You don't have permission to access staff management.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff Management</h1>
          <p className="text-muted-foreground">Manage employees, roles, and access control</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Staff Member
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Staff Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john.doe@company.com"
                />
              </div>
              
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+94 77 123 4567"
                />
              </div>
              
              <div>
                <Label htmlFor="role">Initial Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="driver">Driver</SelectItem>
                    <SelectItem value="conductor">Conductor</SelectItem>
                    <SelectItem value="mechanic">Mechanic</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button onClick={handleCreateStaff} className="w-full">
                Create Staff Member
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Staff"
          value={totalStaff.toString()}
          icon={<Users className="h-4 w-4" />}
          change="0"
          changeType="neutral"
          description="this month"
        />
        <KPICard
          title="Active Staff"
          value={activeStaff.toString()}
          icon={<Users className="h-4 w-4" />}
          change="0"
          changeType="neutral"
          description="this month"
        />
        <KPICard
          title="Admins"
          value={adminCount.toString()}
          icon={<Shield className="h-4 w-4" />}
          change="0"
          changeType="neutral"
          description="this month"
        />
        <KPICard
          title="Drivers"
          value={driverCount.toString()}
          icon={<Users className="h-4 w-4" />}
          change="0"
          changeType="neutral"
          description="this month"
        />
      </div>

      {/* Staff Table */}
      <Card>
        <CardHeader>
          <CardTitle>Staff Directory</CardTitle>
          <CardDescription>
            Manage all staff members, their roles and access permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={staff} />
        </CardContent>
      </Card>
    </div>
  );
}