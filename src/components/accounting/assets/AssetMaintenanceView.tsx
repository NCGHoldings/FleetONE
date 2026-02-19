import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, MoreHorizontal, Wrench, Calendar, AlertTriangle, CheckCircle, Clock, Play, BookOpen, Loader2 } from "lucide-react";
import { useAssetMaintenanceLogs, useUpcomingMaintenance, useStartMaintenance, useCompleteMaintenance, useCancelMaintenance } from "@/hooks/useAssetMaintenance";
import { useMaintenanceFinanceSettings, usePostMaintenanceCostToGL } from "@/hooks/useMaintenanceFinance";
import { CurrencyDisplay } from "@/components/accounting/shared/CurrencyDisplay";
import { format } from "date-fns";
import { toast } from "sonner";

export const AssetMaintenanceView = () => {
  const [statusFilter, setStatusFilter] = useState<string>("_all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [completionNotes, setCompletionNotes] = useState("");
  const [completionCost, setCompletionCost] = useState("");
  
  const { data: logs, isLoading } = useAssetMaintenanceLogs(statusFilter === "_all" ? undefined : statusFilter);
  const { data: upcomingMaintenance } = useUpcomingMaintenance();
  const startMaintenance = useStartMaintenance();
  const completeMaintenance = useCompleteMaintenance();
  const cancelMaintenance = useCancelMaintenance();

  // Finance integration
  const { data: maintenanceFinanceSettings } = useMaintenanceFinanceSettings();
  const postMaintenanceToGL = usePostMaintenanceCostToGL();

  const filteredLogs = logs?.filter(log => 
    log.fixed_assets?.asset_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.fixed_assets?.asset_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.maintenance_number?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const statusCounts = {
    total: logs?.length || 0,
    scheduled: logs?.filter(l => l.status === "scheduled").length || 0,
    in_progress: logs?.filter(l => l.status === "in_progress").length || 0,
    completed: logs?.filter(l => l.status === "completed").length || 0,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Badge variant="secondary">Scheduled</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-500 hover:bg-blue-600">In Progress</Badge>;
      case "completed":
        return <Badge className="bg-green-500 hover:bg-green-600">Completed</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "low":
        return <Badge variant="outline">Low</Badge>;
      case "medium":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Medium</Badge>;
      case "high":
        return <Badge className="bg-orange-500 hover:bg-orange-600">High</Badge>;
      case "critical":
        return <Badge variant="destructive">Critical</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getMaintenanceTypeLabel = (type: string) => {
    switch (type) {
      case "preventive":
        return "Preventive";
      case "corrective":
        return "Corrective";
      case "predictive":
        return "Predictive";
      case "emergency":
        return "Emergency";
      default:
        return type;
    }
  };

  const handleCompleteMaintenance = () => {
    if (!selectedLog) return;
    
    const cost = completionCost ? parseFloat(completionCost) : undefined;
    
    completeMaintenance.mutate({
      logId: selectedLog.id,
      cost,
      completion_notes: completionNotes,
    }, {
      onSuccess: () => {
        // Auto-post to GL if auto_post_on_complete is enabled, settings configured, and cost > 0
        if (cost && cost > 0 && maintenanceFinanceSettings && maintenanceFinanceSettings.auto_post_on_complete) {
          postMaintenanceToGL.mutate({
            maintenance: {
              maintenanceLogId: selectedLog.id,
              assetName: selectedLog.fixed_assets?.asset_name || 'Unknown Asset',
              assetId: selectedLog.asset_id || selectedLog.id,
              cost: cost,
              sparePartsCost: cost * 0.6,
              laborCost: cost * 0.4,
              maintenanceDate: new Date().toISOString().slice(0, 10),
              maintenanceType: (selectedLog.maintenance_type as "preventive" | "corrective" | "predictive" | "emergency") || 'corrective',
              paymentMethod: 'bank',
              description: `Maintenance completed - ${selectedLog.fixed_assets?.asset_name}`,
            },
            settings: maintenanceFinanceSettings,
          });
        }
        setIsCompleteDialogOpen(false);
        setSelectedLog(null);
        setCompletionNotes("");
        setCompletionCost("");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Upcoming Maintenance Alert */}
      {upcomingMaintenance && upcomingMaintenance.length > 0 && (
        <Card className="p-4 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-yellow-600" />
            <div>
              <p className="font-semibold text-yellow-800 dark:text-yellow-200">
                {upcomingMaintenance.length} maintenance tasks due in the next 30 days
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                {upcomingMaintenance.slice(0, 3).map(m => m.fixed_assets?.asset_name).join(", ")}
                {upcomingMaintenance.length > 3 && ` and ${upcomingMaintenance.length - 3} more`}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Wrench className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Total Tasks</p>
              <p className="text-2xl font-bold">{statusCounts.total}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Scheduled</p>
              <p className="text-2xl font-bold">{statusCounts.scheduled}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Play className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">In Progress</p>
              <p className="text-2xl font-bold">{statusCounts.in_progress}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold">{statusCounts.completed}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
          <div className="flex gap-4">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search maintenance..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All Statuses</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Schedule Maintenance
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading maintenance logs...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No maintenance logs found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Scheduled Date</TableHead>
                <TableHead>Team</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>GL</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{log.fixed_assets?.asset_name || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{log.fixed_assets?.asset_code}</p>
                    </div>
                  </TableCell>
                  <TableCell>{getMaintenanceTypeLabel(log.maintenance_type)}</TableCell>
                  <TableCell>{getPriorityBadge(log.priority || "medium")}</TableCell>
                  <TableCell>
                    {format(new Date(log.maintenance_date), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell>{log.asset_maintenance_teams?.team_name || "-"}</TableCell>
                  <TableCell className="text-right">
                    {log.cost ? <CurrencyDisplay amount={log.cost} /> : "-"}
                  </TableCell>
                  <TableCell>{getStatusBadge(log.status)}</TableCell>
                  <TableCell>
                    {log.status === 'completed' && log.cost && !(log as any).gl_posted ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-blue-600 h-7 text-xs"
                        disabled={postMaintenanceToGL.isPending}
                        onClick={() => {
                          if (maintenanceFinanceSettings) {
                            postMaintenanceToGL.mutate({
                              maintenance: {
                                maintenanceLogId: log.id,
                                assetName: log.fixed_assets?.asset_name || 'Unknown',
                                assetId: log.asset_id || log.id,
                                cost: log.cost,
                                sparePartsCost: log.cost * 0.6,
                                laborCost: log.cost * 0.4,
                                maintenanceDate: log.completed_at || log.maintenance_date,
                                maintenanceType: (log.maintenance_type as "preventive" | "corrective" | "predictive" | "emergency") || 'corrective',
                                paymentMethod: 'bank',
                                description: `Maintenance - ${log.fixed_assets?.asset_name || 'Unknown'}`,
                              },
                              settings: maintenanceFinanceSettings,
                            });
                          } else {
                            toast.error('Configure Finance Settings first');
                          }
                        }}
                      >
                        <BookOpen className="h-3 w-3 mr-1" />Post GL
                      </Button>
                    ) : (log as any).gl_posted ? (
                      <Badge variant="outline" className="text-xs text-green-600">Posted</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        {log.status === "scheduled" && (
                          <DropdownMenuItem onClick={() => startMaintenance.mutate(log.id)}>
                            Start Maintenance
                          </DropdownMenuItem>
                        )}
                        {log.status === "in_progress" && (
                          <DropdownMenuItem onClick={() => {
                            setSelectedLog(log);
                            setIsCompleteDialogOpen(true);
                          }}>
                            Complete Maintenance
                          </DropdownMenuItem>
                        )}
                        {(log.status === "scheduled" || log.status === "in_progress") && (
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => cancelMaintenance.mutate({ logId: log.id })}
                          >
                            Cancel
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Complete Maintenance Dialog */}
      <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Maintenance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Complete maintenance for <span className="font-semibold">{selectedLog?.fixed_assets?.asset_name}</span>
            </p>
            <div className="space-y-2">
              <Label htmlFor="cost">Actual Cost</Label>
              <Input
                id="cost"
                type="number"
                step="0.01"
                value={completionCost}
                onChange={(e) => setCompletionCost(e.target.value)}
                placeholder="Enter actual maintenance cost"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Completion Notes</Label>
              <Textarea
                id="notes"
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Add notes about the completed maintenance..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCompleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCompleteMaintenance} disabled={completeMaintenance.isPending}>
              {completeMaintenance.isPending ? "Processing..." : "Complete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
