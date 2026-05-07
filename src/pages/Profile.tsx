import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { ProfileSignatureManager } from "@/components/staff/ProfileSignatureManager";
import { User, Mail, Phone, Calendar, Briefcase, Upload, Save, ShieldCheck } from "lucide-react";
import { MFAEnrollment } from "@/components/auth/MFAEnrollment";

export default function Profile() {
  const { user, userProfile, userRoles } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    phone: "",
  });

  useEffect(() => {
    if (userProfile) {
      setFormData({
        first_name: userProfile.first_name || "",
        last_name: userProfile.last_name || "",
        phone: userProfile.phone || "",
      });
    }
  }, [userProfile]);

  const handleSave = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update(formData)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      setIsEditing(false);
      window.location.reload(); // Refresh to update context
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !event.target.files || event.target.files.length === 0) return;

    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}-${Math.random()}.${fileExt}`;

    setLoading(true);
    try {
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      toast({
        title: "Avatar Updated",
        description: "Your avatar has been updated successfully.",
      });
      window.location.reload();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return "U";
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };

  const getRoleDisplay = (roles: string[]) => {
    if (roles.includes("super_admin")) return "Super Admin";
    if (roles.includes("admin")) return "Admin";
    if (roles.includes("supervisor")) return "Supervisor";
    if (roles.includes("driver")) return "Driver";
    if (roles.includes("conductor")) return "Conductor";
    if (roles.includes("mechanic")) return "Mechanic";
    return "Staff";
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Profile</h1>
          <p className="text-muted-foreground">Manage your personal information and signature</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>View and update your profile details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Section */}
            <div className="flex items-center gap-4">
              <Avatar className="w-20 h-20">
                <AvatarImage src={userProfile?.avatar_url} alt="Profile" />
                <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-xl">
                  {getInitials(userProfile?.first_name, userProfile?.last_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Label htmlFor="avatar-upload" className="cursor-pointer">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <Upload className="w-4 h-4" />
                    <span>Change Avatar</span>
                  </div>
                </Label>
                <Input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={loading}
                />
              </div>
            </div>

            <Separator />

            {/* Profile Fields */}
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Employee ID
                </Label>
                <Input value={userProfile?.employee_id || "N/A"} disabled />
              </div>

              <div className="grid gap-2">
                <Label className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  First Name
                </Label>
                <Input
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  disabled={!isEditing || loading}
                />
              </div>

              <div className="grid gap-2">
                <Label className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Last Name
                </Label>
                <Input
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  disabled={!isEditing || loading}
                />
              </div>

              <div className="grid gap-2">
                <Label className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </Label>
                <Input value={user?.email || "N/A"} disabled />
              </div>

              <div className="grid gap-2">
                <Label className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone
                </Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={!isEditing || loading}
                  placeholder="Enter phone number"
                />
              </div>

              <div className="grid gap-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Hire Date
                </Label>
                <Input
                  value={userProfile?.hire_date ? new Date(userProfile.hire_date).toLocaleDateString() : "N/A"}
                  disabled
                />
              </div>

              <div className="grid gap-2">
                <Label>Roles</Label>
                <div className="flex gap-2 flex-wrap">
                  {userRoles.length > 0 ? (
                    userRoles.map((role) => (
                      <Badge key={role} variant="secondary">
                        {getRoleDisplay([role])}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">No roles assigned</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)}>
                  Edit Profile
                </Button>
              ) : (
                <>
                  <Button onClick={handleSave} disabled={loading}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)} disabled={loading}>
                    Cancel
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Signature Section */}
        <div className="space-y-6">
          <MFAEnrollment />
          <ProfileSignatureManager />
        </div>
      </div>
    </div>
  );
}
