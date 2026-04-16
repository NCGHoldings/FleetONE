import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { format } from "date-fns";
import { Download, Activity, UserCheck, Shield, Clock } from "lucide-react";

const MODULES = [
  { value: "all", label: "All Modules" },
  { value: "journal_entry", label: "Journal Entries" },
  { value: "ap_invoice", label: "AP Invoices" },
  { value: "ap_payment", label: "AP Payments" },
  { value: "ar_invoice", label: "AR Invoices" },
  { value: "ar_receipt", label: "AR Receipts" },
  { value: "purchase_order", label: "Purchase Orders" },
  { value: "grn", label: "Goods Receipt" },
  { value: "inventory", label: "Inventory" },
  { value: "fixed_assets", label: "Fixed Assets" },
];

const ACTION_TYPES = [
  { value: "all", label: "All Actions" },
  { value: "create", label: "Create" },
  { value: "update", label: "Update" },
  { value: "delete", label: "Delete" },
  { value: "approve", label: "Approve" },
  { value: "reject", label: "Reject" },
  { value: "view", label: "View" },
  { value: "export", label: "Export" },
  { value: "login", label: "Login" },
  { value: "logout", label: "Logout" },
];

export const UserActivityView = () => {
  const [moduleFilter, setModuleFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Fetch activity logs
  const { data: activityLogs, isLoading } = useQuery({
    queryKey: ["user-activity-log", moduleFilter, actionFilter, dateFrom, dateTo],
    queryFn: async () => {
      let query = supabase
        .from("user_activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      
      if (moduleFilter !== "all") {
        query = query.eq("module", moduleFilter);
      }
      if (actionFilter !== "all") {
        query = query.eq("action_type", actionFilter);
      }
      if (dateFrom) {
        query = query.gte("created_at", dateFrom);
      }
      if (dateTo) {
        query = query.lte("created_at", `${dateTo}T23:59:59`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch profiles for user names
  const { data: profiles } = useQuery({
    queryKey: ["profiles-for-activity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, first_name, last_name");
      if (error) throw error;
      return data;
    },
  });

  const getUserName = (userId: string) => {
    const profile = profiles?.find(p => p.user_id === userId);
    if (profile) {
      return `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Unknown User";
    }
    return userId?.substring(0, 8) || "System";
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "create":
        return <Badge className="bg-green-100 text-green-800">Create</Badge>;
      case "update":
        return <Badge className="bg-blue-100 text-blue-800">Update</Badge>;
      case "delete":
        return <Badge variant="destructive">Delete</Badge>;
      case "approve":
        return <Badge className="bg-purple-100 text-purple-800">Approve</Badge>;
      case "reject":
        return <Badge className="bg-orange-100 text-orange-800">Reject</Badge>;
      case "login":
        return <Badge variant="outline">Login</Badge>;
      case "logout":
        return <Badge variant="outline">Logout</Badge>;
      default:
        return <Badge variant="secondary">{action}</Badge>;
    }
  };

  const activityColumns = [
    {
      accessorKey: "created_at",
      header: "Timestamp",
      cell: ({ row }: any) => (
        <div className="text-sm">
          <div>{format(new Date(row.original.created_at), "dd MMM yyyy")}</div>
          <div className="text-muted-foreground">
            {format(new Date(row.original.created_at), "HH:mm:ss")}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "user_id",
      header: "User",
      cell: ({ row }: any) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <UserCheck className="w-4 h-4 text-primary" />
          </div>
          <span>{getUserName(row.original.user_id)}</span>
        </div>
      ),
    },
    {
      accessorKey: "action_type",
      header: "Action",
      cell: ({ row }: any) => getActionBadge(row.original.action_type),
    },
    {
      accessorKey: "module",
      header: "Module",
      cell: ({ row }: any) => (
        <Badge variant="outline">{row.original.module || "-"}</Badge>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }: any) => (
        <div className="max-w-md truncate" title={row.original.description}>
          {row.original.description || "-"}
        </div>
      ),
    },
    {
      accessorKey: "record_type",
      header: "Record",
      cell: ({ row }: any) => (
        row.original.record_type ? (
          <div className="text-sm">
            <div>{row.original.record_type}</div>
            <div className="text-muted-foreground text-xs">
              {row.original.record_id?.substring(0, 8)}...
            </div>
          </div>
        ) : "-"
      ),
    },
    {
      accessorKey: "ip_address",
      header: "IP Address",
      cell: ({ row }: any) => (
        <span className="text-muted-foreground font-mono text-xs">
          {row.original.ip_address || "-"}
        </span>
      ),
    },
  ];

  // Calculate stats
  const todayLogs = activityLogs?.filter(log => {
    const logDate = new Date(log.created_at).toDateString();
    return logDate === new Date().toDateString();
  }) || [];

  const uniqueUsers = new Set(activityLogs?.map(log => log.user_id) || []).size;
  const createActions = activityLogs?.filter(log => log.action_type === "create").length || 0;
  const updateActions = activityLogs?.filter(log => log.action_type === "update").length || 0;

  const handleExport = () => {
    if (!activityLogs || activityLogs.length === 0) {
      return;
    }

    const csv = [
      ["Timestamp", "User ID", "Action", "Module", "Description", "Record Type", "Record ID", "IP Address"],
      ...activityLogs.map(log => [
        format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss"),
        log.user_id,
        log.action_type,
        log.module || "",
        log.description || "",
        log.record_type || "",
        log.record_id || "",
        log.ip_address || "",
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-log-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">User Activity Log</h2>
          <p className="text-muted-foreground">Track all user actions for audit purposes</p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Today's Actions
            </CardDescription>
            <CardTitle className="text-2xl">{todayLogs.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <UserCheck className="w-4 h-4" />
              Unique Users
            </CardDescription>
            <CardTitle className="text-2xl">{uniqueUsers}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Creates
            </CardDescription>
            <CardTitle className="text-2xl text-green-600">{createActions}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Updates
            </CardDescription>
            <CardTitle className="text-2xl text-blue-600">{updateActions}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Module</Label>
              <Select value={moduleFilter} onValueChange={setModuleFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MODULES.map((module) => (
                    <SelectItem key={module.value} value={module.value}>
                      {module.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Action Type</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map((action) => (
                    <SelectItem key={action.value} value={action.value}>
                      {action.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>From Date</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Table */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>
            Showing {activityLogs?.length || 0} records
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : (
            <DataTable
              columns={activityColumns}
              data={activityLogs || []}
              searchKey="description"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};
