import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Phone, Globe, MessageSquare, Users } from "lucide-react";
import { InquiryList } from "@/components/inquiries/InquiryList";
import { ManualInquiryForm } from "@/components/inquiries/ManualInquiryForm";
import { InquiryHubSettingsTab } from "@/components/inquiries/InquiryHubSettingsTab";
import { InquiryPlanningTab } from "@/components/inquiries/InquiryPlanningTab";
import { FuturePlanningModal } from "@/components/inquiries/FuturePlanningModal";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const VehicleInquiryHub = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "all";
  const [showManualForm, setShowManualForm] = useState(false);
  const [showQuickSchedule, setShowQuickSchedule] = useState(false);

  // Fetch inquiry stats
  const { data: stats } = useQuery({
    queryKey: ["inquiry-stats"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [totalResult, newResult, pendingResult, convertedResult] = await Promise.all([
        supabase
          .from("vehicle_inquiries")
          .select("id", { count: "exact", head: true })
          .gte("created_at", thirtyDaysAgo.toISOString()),
        supabase
          .from("vehicle_inquiries")
          .select("id", { count: "exact", head: true })
          .eq("status", "new"),
        supabase
          .from("vehicle_inquiries")
          .select("id", { count: "exact", head: true })
          .not("follow_up_date", "is", null)
          .lte("follow_up_date", new Date().toISOString())
          .neq("status", "converted"),
        supabase
          .from("vehicle_inquiries")
          .select("id", { count: "exact", head: true })
          .eq("status", "converted")
          .gte("created_at", thirtyDaysAgo.toISOString()),
      ]);

      const total = totalResult.count || 0;
      const converted = convertedResult.count || 0;
      const conversionRate = total > 0 ? ((converted / total) * 100).toFixed(1) : "0";

      return {
        total,
        new: newResult.count || 0,
        pending: pendingResult.count || 0,
        conversionRate,
      };
    },
  });

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vehicle Inquiry Hub</h1>
          <p className="text-muted-foreground">
            Manage customer inquiries for Yutong and Sinotruck products
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowQuickSchedule(true)}>
            <Phone className="mr-2 h-4 w-4" />
            Schedule Meeting
          </Button>
          <Button onClick={() => setShowManualForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Manual Inquiry
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inquiries</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Inquiries</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.new || 0}</div>
            <p className="text-xs text-muted-foreground">Unassigned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Follow-ups</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pending || 0}</div>
            <p className="text-xs text-muted-foreground">Due today or overdue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.conversionRate || 0}%</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All Inquiries</TabsTrigger>
          <TabsTrigger value="yutong">Yutong</TabsTrigger>
          <TabsTrigger value="sinotruck">Sinotruck</TabsTrigger>
          <TabsTrigger value="manual">Phone/Walk-in</TabsTrigger>
          <TabsTrigger value="planning">Planning</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <InquiryList filter="all" />
        </TabsContent>

        <TabsContent value="yutong" className="space-y-4">
          <InquiryList filter="yutong" />
        </TabsContent>

        <TabsContent value="sinotruck" className="space-y-4">
          <InquiryList filter="sinotruck" />
        </TabsContent>

        <TabsContent value="manual" className="space-y-4">
          <InquiryList filter="manual" />
        </TabsContent>

        <TabsContent value="planning" className="space-y-4">
          <InquiryPlanningTab />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <InquiryHubSettingsTab />
        </TabsContent>
      </Tabs>

      {/* Manual Inquiry Form Modal */}
      <ManualInquiryForm 
        open={showManualForm} 
        onClose={() => setShowManualForm(false)}
        onSuccess={() => {
          setShowManualForm(false);
          // Refetch will happen automatically via React Query
        }}
      />

      {/* Quick Schedule Modal */}
      <FuturePlanningModal
        open={showQuickSchedule}
        onClose={() => setShowQuickSchedule(false)}
        inquiryId={null}
      />
    </div>
  );
};

export default VehicleInquiryHub;