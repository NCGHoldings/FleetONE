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
import { Users, UserPlus, Shield, Edit, Trash2, Lock, AlertTriangle, KeyRound, Copy, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { KPICard } from "@/components/dashboard/KPICard";
import { PageAccessModal } from "@/components/staff/PageAccessModal";
import { CompanyAccessModal } from "@/components/staff/CompanyAccessModal";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TemporaryAccountsSection } from "@/components/staff/TemporaryAccountsSection";
import { Building2 } from "lucide-react";

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
  onOpenCompanyAccess: () => void;
  onResetPassword: () => void;
}

function RoleManagementCell({ staff, onToggleRole, isSuperAdmin, onOpenPageAccess, onOpenCompanyAccess, onResetPassword }: RoleManagementCellProps) {
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
        <div className="flex flex-wrap gap-2 mt-2">
          <Button variant="outline" size="sm" onClick={onOpenPageAccess}>
            <Lock className="h-4 w-4 mr-2" />
            Page Access
          </Button>
          <Button variant="outline" size="sm" onClick={onOpenCompanyAccess}>
            <Building2 className="h-4 w-4 mr-2" />
            Company Access
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onResetPassword}
            className="text-amber-600 border-amber-200 hover:bg-amber-50"
          >
            <KeyRound className="h-4 w-4 mr-2" />
            Reset Password
          </Button>
        </div>
      )}
    </div>
  );
}

export default function StaffManagement() {
  const { hasRole } = useAuth();
  const [staff, setStaff] = useState<Profile[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [unauthorizedAccounts, setUnauthorizedAccounts] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pageAccessOpen, setPageAccessOpen] = useState(false);
  const [pageAccessTarget, setPageAccessTarget] = useState<Profile | null>(null);
  const [companyAccessOpen, setCompanyAccessOpen] = useState(false);
  const [companyAccessTarget, setCompanyAccessTarget] = useState<Profile | null>(null);
  const [recoveryLink, setRecoveryLink] = useState<string | null>(null);
  const [recoveryDialogOpen, setRecoveryDialogOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  
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

      // Fetch pending invites
      const { data: invites } = await supabase
        .from('pending_invites')
        .select('*')
        .eq('status', 'pending')
        .order('invited_at', { ascending: false });

      setPendingInvites(invites || []);

      // Fetch unauthorized accounts (profiles with last_name = 'UNAUTHORIZED')
      const unauthorizedProfiles = staffData.filter(
        s => s.last_name === 'UNAUTHORIZED' && s.roles.length === 1 && s.roles[0] === 'staff'
      );
      setUnauthorizedAccounts(unauthorizedProfiles);
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

  const handleSendInvite = async () => {
    if (!isSuperAdmin) {
      toast.error('Access denied - Super Admin only');
      return;
    }

    if (!email || !firstName || !lastName) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('send-staff-invite', {
        body: {
          email,
          firstName,
          lastName,
          phone,
          initialRole: role,
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      // Check if email was sent successfully
      if (data.emailSent) {
        toast.success('Invitation email sent successfully!');
      } else {
        // Email failed, but invite was created - show the link
        toast.warning(data.emailError || 'Email service unavailable', {
          description: 'Invitation created. Please copy the link below and send it manually.',
          duration: 10000,
        });
        
        // Show invite link in a separate success toast with copy functionality
        navigator.clipboard.writeText(data.inviteUrl).then(() => {
          toast.info('Invite link copied to clipboard!', {
            description: data.inviteUrl,
            duration: 15000,
          });
        }).catch(() => {
          toast.info('Invite Link (click to select)', {
            description: data.inviteUrl,
            duration: 15000,
          });
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchStaff();
    } catch (error: any) {
      console.error('Error sending invite:', error);
      toast.error(error.message || 'Failed to send invitation');
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

  const handleCancelInvite = async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from('pending_invites')
        .update({ status: 'cancelled' })
        .eq('id', inviteId);

      if (error) throw error;

      toast.success('Invitation cancelled');
      fetchStaff();
    } catch (error: any) {
      console.error('Error cancelling invite:', error);
      toast.error('Failed to cancel invitation');
    }
  };

  const handleResetPassword = async (staffMember: Profile) => {
    if (!isSuperAdmin) {
      toast.error('Access denied - Super Admin only');
      return;
    }

    if (!staffMember.email) {
      toast.error('This user does not have a recorded email address');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('admin-generate-recovery-link', {
        body: { email: staffMember.email },
      });

      if (error) throw error;

      if (data.recoveryUrl) {
        setRecoveryLink(data.recoveryUrl);
        setRecoveryDialogOpen(true);
        toast.success('Recovery link generated successfully');
      } else {
        toast.error('Failed to generate recovery link');
      }
    } catch (error: any) {
      console.error('Error generating recovery link:', error);
      toast.error(error.message || 'Failed to generate recovery link');
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy link');
    }
  };

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setRole("staff");
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
      cell: ({ row }: { row: any }) => (
        <RoleManagementCell 
          staff={row.original} 
          onToggleRole={handleToggleRole} 
          isSuperAdmin={isSuperAdmin} 
          onOpenPageAccess={() => { setPageAccessTarget(row.original); setPageAccessOpen(true); }}
          onOpenCompanyAccess={() => { setCompanyAccessTarget(row.original); setCompanyAccessOpen(true); }}
          onResetPassword={() => handleResetPassword(row.original)}
        />
      ),
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
                  Invite Staff Member
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Invite New Staff Member</DialogTitle>
                </DialogHeader>
                <Alert className="bg-primary/10 border-primary">
                  <Shield className="h-4 w-4 text-primary" />
                  <AlertTitle className="text-primary">Secure Invite System</AlertTitle>
                  <AlertDescription className="text-sm">
                    User will receive an email invitation to set up their account securely.
                  </AlertDescription>
                </Alert>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="John"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Doe"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="john.doe@company.com"
                      required
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
                    <Label htmlFor="role">Initial Role *</Label>
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
                  
                  <Button onClick={handleSendInvite} className="w-full">
                    Send Invitation
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

      {/* Unauthorized Accounts Alert */}
      {isSuperAdmin && unauthorizedAccounts.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-destructive">Unauthorized Accounts ({unauthorizedAccounts.length})</CardTitle>
            </div>
            <CardDescription>
              These accounts were created without valid invitations and have zero access
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {unauthorizedAccounts.map((profile) => (
                <div 
                  key={profile.user_id} 
                  className="flex items-center justify-between p-4 border border-destructive/50 rounded-lg bg-destructive/5"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{profile.first_name}</p>
                      <Badge variant="destructive" className="text-xs">UNAUTHORIZED</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{profile.email || 'No email'}</p>
                    <span className="text-xs text-muted-foreground">
                      Created: {new Date(profile.hire_date).toLocaleDateString()}
                    </span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setPageAccessTarget(profile);
                      setPageAccessOpen(true);
                    }}
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Manage Access
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Temporary Access Accounts */}
      {isSuperAdmin && (
        <TemporaryAccountsSection />
      )}

      {/* Pending Invites */}
      {isSuperAdmin && pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
            <CardDescription>
              Staff members who have been invited but haven't accepted yet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingInvites.map((invite) => (
                <div 
                  key={invite.id} 
                  className="flex items-center justify-between p-4 border rounded-lg bg-muted/30"
                >
                  <div className="flex-1">
                    <p className="font-medium">{invite.first_name} {invite.last_name}</p>
                    <p className="text-sm text-muted-foreground">{invite.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="capitalize">
                        {invite.initial_role.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Expires: {new Date(invite.expires_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleCancelInvite(invite.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Staff Directory */}
      <Card>
        <CardHeader>
          <CardTitle>Staff Directory</CardTitle>
          <CardDescription>
            Manage all staff members, their roles and access permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={staff}
            searchKeys={["name", "employee ID", "phone", "role"]}
            customSearch={(data: Profile[], query: string) => {
              const q = query.toLowerCase();
              return data.filter(s =>
                s.first_name?.toLowerCase().includes(q) ||
                s.last_name?.toLowerCase().includes(q) ||
                s.employee_id?.toLowerCase().includes(q) ||
                s.phone?.toLowerCase().includes(q) ||
                s.roles?.some(r => r.toLowerCase().includes(q))
              );
            }}
          />
          {isSuperAdmin && (
            <>
              <PageAccessModal
                open={pageAccessOpen}
                onOpenChange={setPageAccessOpen}
                userId={pageAccessTarget?.user_id || null}
                userName={pageAccessTarget ? `${pageAccessTarget.first_name} ${pageAccessTarget.last_name}` : undefined}
              />
              <CompanyAccessModal
                open={companyAccessOpen}
                onOpenChange={setCompanyAccessOpen}
                userId={companyAccessTarget?.user_id || null}
                userName={companyAccessTarget ? `${companyAccessTarget.first_name} ${companyAccessTarget.last_name}` : undefined}
              />

              <Dialog open={recoveryDialogOpen} onOpenChange={setRecoveryDialogOpen}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <KeyRound className="h-5 w-5 text-amber-500" />
                      Recovery Link Generated
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <p className="text-sm text-muted-foreground">
                      Share this one-time recovery link with the user. They can use it to set a new password.
                    </p>
                    <div className="flex gap-2 p-3 bg-muted rounded-lg border border-border">
                      <code className="text-xs break-all flex-1 select-all">
                        {recoveryLink}
                      </code>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        onClick={() => recoveryLink && copyToClipboard(recoveryLink)}
                        className="shrink-0"
                      >
                        {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <div className="flex gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="text-xs text-amber-800">
                          <p className="font-semibold mb-1">Security Warning:</p>
                          <p>This link is extremely sensitive. Only share it through secure channels. It will expire shortly.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={() => setRecoveryDialogOpen(false)}>Close</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}