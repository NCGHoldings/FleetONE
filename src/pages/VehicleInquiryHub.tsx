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
  const activeClassFilter = (searchParams.get("class") || "all") as "all" | "C0" | "C1" | "C2" | "C3";
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
    const newParams = new URLSearchParams(searchParams);
    newParams.set("tab", value);
    setSearchParams(newParams);
  };

  const handleClassFilterChange = (value: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("class", value);
    setSearchParams(newParams);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vehicle Inquiry Hub</h1>
          <p className="text-muted-foreground">
            Manage customer inquiries for Yutong, Sinotruck, Light Vehicle and General products
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
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="yutong">Yutong</TabsTrigger>
          <TabsTrigger value="sinotruck">Sinotruck</TabsTrigger>
          <TabsTrigger value="lightvehicle">Light Vehicle</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="manual">Phone/Walk-in</TabsTrigger>
          <TabsTrigger value="planning">Planning</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Customer Class Filter Tabs - Show for inquiry tabs only */}
        {["all", "yutong", "sinotruck", "lightvehicle", "general", "manual"].includes(activeTab) && (
          <div className="flex gap-2 mt-4 mb-2">
            <span className="text-sm text-muted-foreground self-center mr-2">Filter by Class:</span>
            {[
              { value: "all", label: "All" },
              { value: "C0", label: "C0 • Inquiry" },
              { value: "C1", label: "C1 • Quotation" },
              { value: "C2", label: "C2 • Advance" },
              { value: "C3", label: "C3 • Paid" },
            ].map((item) => (
              <button
                key={item.value}
                onClick={() => handleClassFilterChange(item.value)}
                className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                  activeClassFilter === item.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:bg-muted"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        <TabsContent value="all" className="space-y-4">
          <InquiryList filter="all" customerClassFilter={activeClassFilter} />
        </TabsContent>

        <TabsContent value="yutong" className="space-y-4">
          <InquiryList filter="yutong" customerClassFilter={activeClassFilter} />
        </TabsContent>

        <TabsContent value="sinotruck" className="space-y-4">
          <InquiryList filter="sinotruck" customerClassFilter={activeClassFilter} />
        </TabsContent>

        <TabsContent value="lightvehicle" className="space-y-4">
          <InquiryList filter="lightvehicle" customerClassFilter={activeClassFilter} />
        </TabsContent>

        <TabsContent value="general" className="space-y-4">
          <InquiryList filter="general" customerClassFilter={activeClassFilter} />
        </TabsContent>

        <TabsContent value="manual" className="space-y-4">
          <InquiryList filter="manual" customerClassFilter={activeClassFilter} />
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