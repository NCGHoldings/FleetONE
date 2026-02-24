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
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    asset_id: "",
    maintenance_type: "preventive" as "preventive" | "corrective" | "predictive" | "emergency",
    maintenance_date: new Date().toISOString().slice(0, 10),
    description: "",
    priority: "medium" as "low" | "medium" | "high" | "critical",
    estimated_cost: "",
  });

  const { data: logs, isLoading } = useAssetMaintenanceLogs(statusFilter === "_all" ? undefined : statusFilter);
  const { data: upcomingMaintenance } = useUpcomingMaintenance();
  const startMaintenance = useStartMaintenance();
  const completeMaintenance = useCompleteMaintenance();
  const cancelMaintenance = useCancelMaintenance();
  const scheduleMaintenance = useCreateMaintenanceLog();
  
  // Need fixed assets to populate the schedule dropdown
  const { data: fixedAssets } = useFixedAssets();

  // Finance integration
  const { data: maintenanceFinanceSettings } = useMaintenanceFinanceSettings();
  const postMaintenanceToGL = usePostMaintenanceCostToGL();

  const filteredLogs = logs?.filter((log: any) => 
    log.fixed_assets?.asset_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.fixed_assets?.asset_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.maintenance_number?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const statusCounts = {
    total: logs?.length || 0,
    scheduled: logs?.filter((l: any) => l.status === "scheduled").length || 0,
    in_progress: logs?.filter((l: any) => l.status === "in_progress").length || 0,
    completed: logs?.filter((l: any) => l.status === "completed").length || 0,
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

  const handleScheduleSubmit = () => {
    if (!scheduleForm.asset_id || !scheduleForm.description) {
      toast.error("Please select an asset and provide a description");
      return;
    }

    scheduleMaintenance.mutate({
      asset_id: scheduleForm.asset_id,
      maintenance_type: scheduleForm.maintenance_type,
      maintenance_date: scheduleForm.maintenance_date,
      description: scheduleForm.description,
      priority: scheduleForm.priority,
      cost: scheduleForm.estimated_cost ? parseFloat(scheduleForm.estimated_cost) : undefined
    }, {
      onSuccess: () => {
        setIsScheduleDialogOpen(false);
        setScheduleForm({
          asset_id: "",
          maintenance_type: "preventive",
          maintenance_date: new Date().toISOString().slice(0, 10),
          description: "",
          priority: "medium",
          estimated_cost: "",
        });
      }
    });
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
                {upcomingMaintenance.slice(0, 3).map((m: any) => m.fixed_assets?.asset_name).join(", ")}
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
          <Button onClick={() => setIsScheduleDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Schedule Maintenance
          </Button>
        </div>

        {/* Schedule Maintenance Dialog */}
        <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Schedule Asset Maintenance</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="asset_id">Fixed Asset *</Label>
                <Select 
                  value={scheduleForm.asset_id} 
                  onValueChange={(val) => setScheduleForm(prev => ({ ...prev, asset_id: val }))}
                >
                  <SelectTrigger id="asset_id">
                    <SelectValue placeholder="Select asset" />
                  </SelectTrigger>
                  <SelectContent>
                    {fixedAssets?.map(asset => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.asset_code} - {asset.asset_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maintenance_type">Type *</Label>
                  <Select 
                    value={scheduleForm.maintenance_type} 
                    onValueChange={(val: any) => setScheduleForm(prev => ({ ...prev, maintenance_type: val }))}
                  >
                    <SelectTrigger id="maintenance_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="preventive">Preventive</SelectItem>
                      <SelectItem value="corrective">Corrective</SelectItem>
                      <SelectItem value="predictive">Predictive</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select 
                    value={scheduleForm.priority} 
                    onValueChange={(val: any) => setScheduleForm(prev => ({ ...prev, priority: val }))}
                  >
                    <SelectTrigger id="priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maintenance_date">Scheduled Date *</Label>
                <Input
                  id="maintenance_date"
                  type="date"
                  value={scheduleForm.maintenance_date}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, maintenance_date: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimated_cost">Estimated Cost (₨)</Label>
                <Input
                  id="estimated_cost"
                  type="number"
                  placeholder="e.g. 5000"
                  value={scheduleForm.estimated_cost}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, estimated_cost: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the maintenance required..."
                  value={scheduleForm.description}
                  onChange={(e) => setScheduleForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsScheduleDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleScheduleSubmit} disabled={scheduleMaintenance.isPending}>
                {scheduleMaintenance.isPending ? "Scheduling..." : "Schedule"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
