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
import { Users, UserPlus, Shield, Edit, Trash2, Lock, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { KPICard } from "@/components/dashboard/KPICard";
import { PageAccessModal } from "@/components/staff/PageAccessModal";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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

const availableRoles = [
  'staff', 'driver', 'conductor', 'mechanic', 'supervisor', 'finance', 'admin', 'super_admin'
];

interface RoleManagementCellProps {
  staff: Profile;
  onToggleRole: (userId: string, role: string, shouldHaveRole: boolean) => void;
  isSuperAdmin: boolean;
  onOpenPageAccess: () => void;
}

function RoleManagementCell({ staff, onToggleRole, isSuperAdmin, onOpenPageAccess }: RoleManagementCellProps) {
  const userRoles = staff.roles;
  
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2 max-w-xs">
        {availableRoles.map((role) => {
          if (role === 'super_admin' && !isSuperAdmin) return null;
          
          const hasRole = userRoles.includes(role);
          return (
            <div key={role} className="flex items-center space-x-2">
              <Checkbox
                id={`${staff.user_id}-${role}`}
                checked={hasRole}
                onCheckedChange={(checked) => 
                  onToggleRole(staff.user_id, role as any, !!checked)
                }
              />
              <Label 
                htmlFor={`${staff.user_id}-${role}`}
                className="text-xs font-medium capitalize cursor-pointer"
              >
                {role.replace('_', ' ')}
              </Label>
            </div>
          );
        })}
      </div>
      
      {isSuperAdmin && (
        <Button variant="outline" size="sm" onClick={onOpenPageAccess} className="mt-2">
          <Lock className="h-4 w-4 mr-2" />
          Page Access
        </Button>
      )}
    </div>
  );
}

export default function StaffManagement() {
  const { hasRole } = useAuth();
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Profile | null>(null);
  const [pageAccessOpen, setPageAccessOpen] = useState(false);
  const [pageAccessTarget, setPageAccessTarget] = useState<Profile | null>(null);
  
  // Form states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("staff");

  const isAdmin = hasRole('super_admin') || hasRole('admin');
  const isSuperAdmin = hasRole('super_admin');

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
    if (!isSuperAdmin) {
      toast.error('Access denied - Super Admin only');
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

  const handleToggleRole = async (userId: string, role: string, shouldHaveRole: boolean) => {
    if (!isSuperAdmin) {
      toast.error('Access denied - Super Admin only');
      return;
    }

    try {
      if (shouldHaveRole) {
        // Add role if not exists
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: role as any });
        
        if (error && !error.message.includes('duplicate')) throw error;
      } else {
        // Remove role
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', role as any);
          
        if (error) throw error;
      }
      
      toast.success(`Role ${shouldHaveRole ? 'added' : 'removed'} successfully`);
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
    ...(isSuperAdmin ? [{
      id: "actions",
      header: "Actions",
      cell: ({ row }: { row: any }) => <RoleManagementCell staff={row.original} onToggleRole={handleToggleRole} isSuperAdmin={isSuperAdmin} onOpenPageAccess={() => { setPageAccessTarget(row.original); setPageAccessOpen(true); }} />,
    }] : []),
  ];

  const totalStaff = staff.length;
  const activeStaff = staff.filter(s => s.status === 'active').length;
  const adminCount = staff.filter(s => s.roles.includes('admin') || s.roles.includes('super_admin')).length;
  const driverCount = staff.filter(s => s.roles.includes('driver')).length;
  const financeCount = staff.filter(s => s.roles.includes('finance')).length;

  if (!isSuperAdmin) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You need Super Admin access to manage staff. Only Super Admins can create and manage user accounts.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Enhanced Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-success via-success to-primary p-8 text-success-foreground">
        <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm animate-logo-glow">
              <Users className="w-10 h-10 animate-bounce-subtle" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent animate-slide-in-right">
                Staff Management
              </h1>
              <p className="text-success-foreground/80 text-lg animate-slide-in-right" style={{ animationDelay: '0.1s' }}>
                Manage employees, roles, and access control
              </p>
            </div>
          </div>
          
          {isSuperAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  onClick={resetForm}
                  className="bg-white/20 backdrop-blur-sm border border-white/30 hover:bg-white/30 transition-all duration-300 animate-scale-in"
                  style={{ animationDelay: '0.2s' }}
                >
                  <UserPlus className="h-4 w-4 mr-2 animate-pulse-subtle" />
                  Add Staff Member
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Staff Member</DialogTitle>
              </DialogHeader>
              <Alert className="bg-warning/10 border-warning">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <AlertTitle className="text-warning">Zero-Trust Security Active</AlertTitle>
                <AlertDescription className="text-sm">
                  New accounts have <strong>NO page access</strong> by default. You must explicitly grant permissions after creation.
                </AlertDescription>
              </Alert>
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
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      {isSuperAdmin && <SelectItem value="super_admin">Super Admin</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                
                <Button onClick={handleCreateStaff} className="w-full">
                  Create Staff Member
                </Button>
              </div>
            </DialogContent>
            </Dialog>
          )}
        </div>
        
        {/* Animated Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-pulse-subtle" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/20 rounded-full blur-2xl animate-bounce-subtle" />
      </div>

      {/* Enhanced KPI Cards with Animations */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <div className="animate-scale-in" style={{ animationDelay: '0.1s' }}>
          <div className="professional-card hover:shadow-success transition-all duration-500 group">
            <KPICard
              title="Total Staff"
              value={totalStaff.toString()}
              icon={<Users className="h-4 w-4 group-hover:animate-bounce-subtle" />}
              change="0"
              changeType="neutral"
              description="this month"
            />
          </div>
        </div>
        <div className="animate-scale-in" style={{ animationDelay: '0.2s' }}>
          <div className="professional-card hover:shadow-primary transition-all duration-500 group">
            <KPICard
              title="Active Staff"
              value={activeStaff.toString()}
              icon={<Users className="h-4 w-4 group-hover:animate-pulse-subtle" />}
              change="0"
              changeType="neutral"
              description="this month"
            />
          </div>
        </div>
        <div className="animate-scale-in" style={{ animationDelay: '0.3s' }}>
          <div className="professional-card hover:shadow-warning transition-all duration-500 group">
            <KPICard
              title="Admins"
              value={adminCount.toString()}
              icon={<Shield className="h-4 w-4 group-hover:animate-wiggle" />}
              change="0"
              changeType="neutral"
              description="this month"
            />
          </div>
        </div>
        <div className="animate-scale-in" style={{ animationDelay: '0.4s' }}>
          <div className="professional-card hover:shadow-accent transition-all duration-500 group">
            <KPICard
              title="Finance"
              value={financeCount.toString()}
              icon={<Shield className="h-4 w-4 group-hover:animate-pulse-subtle" />}
              change="0"
              changeType="neutral"
              description="this month"
            />
          </div>
        </div>
        <div className="animate-scale-in" style={{ animationDelay: '0.5s' }}>
          <div className="professional-card hover:shadow-accent transition-all duration-500 group">
            <KPICard
              title="Drivers"
              value={driverCount.toString()}
              icon={<Users className="h-4 w-4 group-hover:animate-bounce-notification" />}
              change="0"
              changeType="neutral"
              description="this month"
            />
          </div>
        </div>
      </div>

      {/* Staff Directory */}
      <Card>
        <CardHeader>
          <CardTitle>Staff Directory</CardTitle>
          <CardDescription>
            Manage all staff members, their roles and access permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={staff} />
          {isSuperAdmin && (
            <PageAccessModal
              open={pageAccessOpen}
              onOpenChange={setPageAccessOpen}
              userId={pageAccessTarget?.user_id || null}
              userName={pageAccessTarget ? `${pageAccessTarget.first_name} ${pageAccessTarget.last_name}` : undefined}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}