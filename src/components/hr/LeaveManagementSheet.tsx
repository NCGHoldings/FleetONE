import { useState } from "react";
import { format } from "date-fns";
import { useLeaveRequests, LeaveStatus, LeaveRequest } from "@/hooks/useLeaveRequests";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KPICard } from "@/components/dashboard/KPICard";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Calendar, CheckCircle, Clock, XCircle, Search, FileText } from "lucide-react";

export function LeaveManagementSheet() {
  const { leaveRequests, isLoading, approveRequest, rejectRequest, isUpdating } = useLeaveRequests();
  const { hasRole } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  const isHRAdmin = hasRole('super_admin') || hasRole('admin') || hasRole('supervisor');

  const getStatusBadge = (status: LeaveStatus) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-success text-success-foreground"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
      case 'pending':
      default:
        return <Badge variant="secondary" className="bg-warning/20 text-warning-foreground"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      accessorKey: "created_at",
      header: "Requested On",
      cell: ({ row }) => format(new Date(row.getValue("created_at")), "MMM d, yyyy")
    },
    {
      accessorKey: "profiles",
      header: "Employee Name",
      cell: ({ row }) => {
        const profile = row.getValue("profiles") as any;
        return <span className="font-medium">{profile?.first_name || 'Unknown'} {profile?.last_name || ''}</span>;
      }
    },
    {
      accessorKey: "leave_type",
      header: "Leave Type",
      cell: ({ row }) => (
        <Badge variant="outline" className="capitalize">
          {row.getValue("leave_type")}
        </Badge>
      )
    },
    {
      accessorKey: "date_range",
      header: "Duration",
      cell: ({ row }) => {
        const start = format(new Date(row.original.start_date), "MMM d");
        const end = format(new Date(row.original.end_date), "MMM d, yyyy");
        const days = row.original.days_requested;
        return (
          <div className="flex flex-col">
            <span className="text-sm font-medium">{days} Day{days !== 1 ? 's' : ''}</span>
            <span className="text-xs text-muted-foreground">{start} - {end}</span>
          </div>
        );
      }
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => getStatusBadge(row.getValue("status") as LeaveStatus)
    },
  ];

  if (isHRAdmin) {
    columns.push({
      id: "actions",
      header: "HR Actions",
      cell: ({ row }) => {
        const status = row.original.status as LeaveStatus;
        const id = row.original.id;
        
        if (status !== 'pending') return <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Processed</span>;
        
        return (
          <div className="flex gap-2">
            <Button 
              size="sm" 
              className="bg-success hover:bg-success/90 h-8 text-xs px-3"
              disabled={isUpdating}
              onClick={() => approveRequest(id)}
            >
              Approve
            </Button>
            <Button 
              size="sm" 
              variant="destructive" 
              className="h-8 text-xs px-3"
              disabled={isUpdating}
              onClick={() => rejectRequest(id)}
            >
              Reject
            </Button>
          </div>
        );
      }
    });
  }

  const pendingCount = leaveRequests?.filter(r => r.status === 'pending').length || 0;
  const approvedCount = leaveRequests?.filter(r => r.status === 'approved').length || 0;
  const todayVal = new Date().toISOString().split('T')[0];
  const onLeaveToday = leaveRequests?.filter(r => 
    r.status === 'approved' && 
    r.start_date <= todayVal && 
    r.end_date >= todayVal
  ).length || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Section */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="animate-scale-in" style={{ animationDelay: '0.1s' }}>
          <div className="professional-card hover:shadow-warning transition-all duration-500 group">
            <KPICard
              title="Pending Requests"
              value={pendingCount.toString()}
              icon={<Clock className="h-4 w-4 text-warning group-hover:animate-pulse-subtle" />}
              change={`${pendingCount} await review`}
              changeType="neutral"
              description="Needs HR Action"
            />
          </div>
        </div>
        <div className="animate-scale-in" style={{ animationDelay: '0.2s' }}>
          <div className="professional-card hover:shadow-success transition-all duration-500 group">
            <KPICard
              title="Approved Leaves"
              value={approvedCount.toString()}
              icon={<CheckCircle className="h-4 w-4 text-success group-hover:animate-pulse-subtle" />}
              change="All time"
              changeType="positive"
              description="Total approved"
            />
          </div>
        </div>
        <div className="animate-scale-in" style={{ animationDelay: '0.3s' }}>
          <div className="professional-card hover:shadow-primary transition-all duration-500 group">
            <KPICard
              title="On Leave Today"
              value={onLeaveToday.toString()}
              icon={<Calendar className="h-4 w-4 text-primary group-hover:animate-wiggle" />}
              change="Currently out"
              changeType="neutral"
              description="Active leaves"
            />
          </div>
        </div>
      </div>

      <Card className="border-border shadow-sm overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Master Leave Management
              </CardTitle>
              <CardDescription>
                Review, approve, and track employee leave requests globally
              </CardDescription>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search staff..."
                  className="pl-8 bg-background"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center space-y-4">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-muted-foreground font-medium animate-pulse">Loading leave data...</p>
            </div>
          ) : leaveRequests?.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6">
              <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                <Clock className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-semibold">No Leave Requests Found</h3>
              <p className="text-muted-foreground max-w-md mt-2">
                There are currently no leave requests in the system. When employees submit requests, they will appear here.
              </p>
            </div>
          ) : (
            <div className="p-4">
              <DataTable
                columns={columns}
                data={leaveRequests || []}
                searchKeys={["leave_type", "status"]}
                customSearch={(data, query) => {
                  if (!searchTerm && !query) return data;
                  const q = (searchTerm || query).toLowerCase();
                  return data.filter(item => {
                    const firstName = item.profiles?.first_name?.toLowerCase() || '';
                    const lastName = item.profiles?.last_name?.toLowerCase() || '';
                    return (
                      firstName.includes(q) || 
                      lastName.includes(q) || 
                      item.leave_type.toLowerCase().includes(q) ||
                      item.status.toLowerCase().includes(q)
                    );
                  });
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
