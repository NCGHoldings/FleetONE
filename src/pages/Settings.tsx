import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { Lock, Bell, Palette, Globe, Shield, Clock, QrCode, Upload, MapPin } from "lucide-react";
import { GrantAccessButton } from "@/components/accounting/GrantAccessButton";
import { DataEntrySettings } from "@/components/trips/DataEntrySettings";
import { ConductorSubmissionQRGenerator } from "@/components/trips/ConductorSubmissionQRGenerator";
import { MultiDayRouteConfig } from "@/components/trips/MultiDayRouteConfig";

export default function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    pushNotifications: false,
    paymentReminders: true,
    tripUpdates: true,
  });

  const handlePasswordChange = async () => {
    if (!user) return;

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      toast({
        title: "Password Updated",
        description: "Your password has been changed successfully.",
      });
      
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
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

  const handlePreferenceChange = (key: keyof typeof preferences) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
    toast({
      title: "Preference Updated",
      description: "Your notification preferences have been saved.",
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      <Tabs defaultValue="account" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-7">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="display">Display</TabsTrigger>
          <TabsTrigger value="admin">Admin</TabsTrigger>
          <TabsTrigger value="data-entry">Data Entry</TabsTrigger>
          <TabsTrigger value="qr-codes">QR Codes</TabsTrigger>
          <TabsTrigger value="multi-day-routes">Multi-Day Routes</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-6 mt-6">
          <div className="grid gap-6 max-w-2xl">
        {/* Account Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Account Security
            </CardTitle>
            <CardDescription>Update your password and security settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                disabled={loading}
              />
            </div>

            <Button onClick={handlePasswordChange} disabled={loading}>
              Change Password
            </Button>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>Choose what notifications you want to receive</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via email
                </p>
              </div>
              <Switch
                checked={preferences.emailNotifications}
                onCheckedChange={() => handlePreferenceChange("emailNotifications")}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive push notifications in the browser
                </p>
              </div>
              <Switch
                checked={preferences.pushNotifications}
                onCheckedChange={() => handlePreferenceChange("pushNotifications")}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Payment Reminders</Label>
                <p className="text-sm text-muted-foreground">
                  Get reminders about upcoming payments
                </p>
              </div>
              <Switch
                checked={preferences.paymentReminders}
                onCheckedChange={() => handlePreferenceChange("paymentReminders")}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Trip Updates</Label>
                <p className="text-sm text-muted-foreground">
                  Receive updates about trip status changes
                </p>
              </div>
              <Switch
                checked={preferences.tripUpdates}
                onCheckedChange={() => handlePreferenceChange("tripUpdates")}
              />
            </div>
          </CardContent>
        </Card>

          </div>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6 mt-6">
          <div className="grid gap-6 max-w-2xl">
        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notification Preferences
            </CardTitle>
            <CardDescription>Choose what notifications you want to receive</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via email
                </p>
              </div>
              <Switch
                checked={preferences.emailNotifications}
                onCheckedChange={() => handlePreferenceChange("emailNotifications")}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive push notifications in the browser
                </p>
              </div>
              <Switch
                checked={preferences.pushNotifications}
                onCheckedChange={() => handlePreferenceChange("pushNotifications")}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Payment Reminders</Label>
                <p className="text-sm text-muted-foreground">
                  Get reminders about upcoming payments
                </p>
              </div>
              <Switch
                checked={preferences.paymentReminders}
                onCheckedChange={() => handlePreferenceChange("paymentReminders")}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Trip Updates</Label>
                <p className="text-sm text-muted-foreground">
                  Receive updates about trip status changes
                </p>
              </div>
              <Switch
                checked={preferences.tripUpdates}
                onCheckedChange={() => handlePreferenceChange("tripUpdates")}
              />
            </div>
          </CardContent>
        </Card>
          </div>
        </TabsContent>

        <TabsContent value="display" className="space-y-6 mt-6">
          <div className="grid gap-6 max-w-2xl">
        {/* Display Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Display Preferences
            </CardTitle>
            <CardDescription>Customize how the app looks and feels</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="theme">Theme</Label>
              <p className="text-sm text-muted-foreground">
                Theme customization coming soon
              </p>
            </div>

            <Separator />

            <div className="grid gap-2">
              <Label htmlFor="language" className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Language
              </Label>
              <p className="text-sm text-muted-foreground">
                Multi-language support coming soon
              </p>
            </div>
          </CardContent>
        </Card>
          </div>
        </TabsContent>

        <TabsContent value="admin" className="space-y-6 mt-6">
          <div className="grid gap-6 max-w-2xl">
        {/* Admin Features */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Admin Features
            </CardTitle>
            <CardDescription>Administrative tools and access management</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Accounting Module Access</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Grant accounting access to all super_admin, admin, and finance users
              </p>
              <GrantAccessButton />
            </div>
          </CardContent>
        </Card>
          </div>
        </TabsContent>

        <TabsContent value="data-entry" className="space-y-6 mt-6">
          <div className="grid gap-6 max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Data Entry Deadline Settings
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/trips/late-entry-requests')}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    Review Requests
                  </Button>
                </CardTitle>
                <CardDescription>
                  Configure deadline enforcement for trip data entry. Users must enter data within the specified timeframe or request approval.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataEntrySettings />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="qr-codes" className="space-y-6 mt-6">
          <div className="grid gap-6 max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>QR Code Generator</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/trips/conductor-submissions')}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    View Submissions
                  </Button>
                </CardTitle>
                <CardDescription>
                  Generate and share QR codes for conductor trip sheet uploads. Conductors can scan this code to quickly access the upload portal.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ConductorSubmissionQRGenerator />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="multi-day-routes" className="space-y-6 mt-6">
          <div className="grid gap-6 max-w-4xl">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Multi-Day Route Management
                </CardTitle>
                <CardDescription>
                  Configure long-distance routes that require per-trip date assignment (e.g., Moratuwa-Jaffna). When uploading OCR data for these routes, each trip can be assigned to its actual travel date.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MultiDayRouteConfig />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
