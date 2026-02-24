import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, RefreshCw, Clock, Trash2, Edit, Play, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/hooks/useAuth";

interface ScheduledTask {
  id: string;
  company_id: string;
  task_name: string;
  task_type: string;
  schedule_cron: string;
  schedule_type: string;
  schedule_time: string;
  schedule_day: number;
  task_config: Record<string, any>;
  is_active: boolean;
  last_run_at: string;
  next_run_at: string;
  last_run_status: string;
  last_run_error: string;
  run_count: number;
  created_at: string;
}

const taskTypes = [
  { value: "report_generation", label: "Report Generation", icon: "📊" },
  { value: "data_cleanup", label: "Data Cleanup", icon: "🧹" },
  { value: "auto_posting", label: "Auto Posting", icon: "📝" },
  { value: "reminder_batch", label: "Reminder Batch", icon: "🔔" },
  { value: "recurring_invoice", label: "Recurring Invoice", icon: "🔄" },
  { value: "backup", label: "Backup", icon: "💾" },
];

const scheduleTypes = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "custom", label: "Custom (Cron)" },
];

const dayOptions = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export function ScheduledTasksView() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null);
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    task_name: "",
    task_type: "report_generation",
    schedule_type: "daily",
    schedule_time: "09:00",
    schedule_day: 1,
    schedule_cron: "",
    task_config: "{}",
  });

  // Fetch scheduled tasks
  const { data: scheduledTasks, isLoading } = useQuery({
    queryKey: ["scheduled-tasks", selectedCompany?.id],
    queryFn: async () => {
      const query = supabase
        .from("scheduled_tasks")
        .select("*")
        .order("created_at", { ascending: false });

      if (selectedCompany?.id) {
        query.eq("company_id", selectedCompany.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ScheduledTask[];
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      let taskConfig = {};
      
      try {
        taskConfig = JSON.parse(data.task_config);
      } catch (e) {
        throw new Error("Invalid task config JSON");
      }

      const payload = {
        task_name: data.task_name,
        task_type: data.task_type,
        schedule_type: data.schedule_type,
        schedule_time: data.schedule_time,
        schedule_day: data.schedule_day,
        schedule_cron: data.schedule_type === "custom" ? data.schedule_cron : null,
        task_config: taskConfig,
        company_id: selectedCompany?.id,
        created_by: user?.id,
      };

      if (editingTask) {
        const { error } = await supabase
          .from("scheduled_tasks")
          .update(payload)
          .eq("id", editingTask.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("scheduled_tasks")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-tasks"] });
      toast.success(editingTask ? "Scheduled task updated" : "Scheduled task created");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error("Failed to save scheduled task: " + error.message);
    },
  });

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("scheduled_tasks")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-tasks"] });
      toast.success("Status updated");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("scheduled_tasks")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-tasks"] });
      toast.success("Scheduled task deleted");
    },
  });

  const resetForm = () => {
    setFormData({
      task_name: "",
      task_type: "report_generation",
      schedule_type: "daily",
      schedule_time: "09:00",
      schedule_day: 1,
      schedule_cron: "",
      task_config: "{}",
    });
    setEditingTask(null);
  };

  const handleEdit = (task: ScheduledTask) => {
    setEditingTask(task);
    setFormData({
      task_name: task.task_name,
      task_type: task.task_type,
      schedule_type: task.schedule_type || "daily",
      schedule_time: task.schedule_time || "09:00",
      schedule_day: task.schedule_day || 1,
      schedule_cron: task.schedule_cron || "",
      task_config: JSON.stringify(task.task_config, null, 2),
    });
    setIsDialogOpen(true);
  };

  const getScheduleDescription = (task: ScheduledTask) => {
    switch (task.schedule_type) {
      case "daily":
        return `Daily at ${task.schedule_time}`;
      case "weekly":
        const day = dayOptions.find(d => d.value === task.schedule_day);
        return `Weekly on ${day?.label || "Monday"} at ${task.schedule_time}`;
      case "monthly":
        return `Monthly on day ${task.schedule_day} at ${task.schedule_time}`;
      case "custom":
        return `Cron: ${task.schedule_cron}`;
      default:
        return "Not configured";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "running":
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTaskConfigTemplate = (taskType: string) => {
    switch (taskType) {
      case "report_generation":
        return JSON.stringify({
          report_type: "trial_balance",
          format: "pdf",
          recipients: ["finance@company.com"]
        }, null, 2);
      case "reminder_batch":
        return JSON.stringify({
          reminder_type: "ar_overdue",
          days_overdue: 7
        }, null, 2);
      case "recurring_invoice":
        return JSON.stringify({
          process_all: true,
          auto_send: true
        }, null, 2);
      case "data_cleanup":
        return JSON.stringify({
          cleanup_type: "audit_logs",
          older_than_days: 90
        }, null, 2);
      default:
        return "{}";
    }
  };

  const activeTasks = scheduledTasks?.filter(t => t.is_active).length || 0;
  const successCount = scheduledTasks?.filter(t => t.last_run_status === "success").length || 0;
  const failedCount = scheduledTasks?.filter(t => t.last_run_status === "failed").length || 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{scheduledTasks?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeTasks}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last Success</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{successCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{failedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Scheduled Tasks</h2>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Scheduled Task
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTask ? "Edit Scheduled Task" : "Create Scheduled Task"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate(formData);
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Task Name *</Label>
                  <Input
                    value={formData.task_name}
                    onChange={(e) => setFormData({ ...formData, task_name: e.target.value })}
                    placeholder="Daily AR Reminder Batch"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Task Type *</Label>
                  <Select
                    value={formData.task_type}
                    onValueChange={(value) => setFormData({ 
                      ...formData, 
                      task_type: value,
                      task_config: getTaskConfigTemplate(value)
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {taskTypes.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.icon} {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Schedule Type *</Label>
                  <Select
                    value={formData.schedule_type}
                    onValueChange={(value) => setFormData({ ...formData, schedule_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {scheduleTypes.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={formData.schedule_time}
                    onChange={(e) => setFormData({ ...formData, schedule_time: e.target.value })}
                    disabled={formData.schedule_type === "custom"}
                  />
                </div>
              </div>

              {formData.schedule_type === "weekly" && (
                <div className="space-y-2">
                  <Label>Day of Week</Label>
                  <Select
                    value={formData.schedule_day.toString()}
                    onValueChange={(value) => setFormData({ ...formData, schedule_day: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dayOptions.map((d) => (
                        <SelectItem key={d.value} value={d.value.toString()}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.schedule_type === "monthly" && (
                <div className="space-y-2">
                  <Label>Day of Month</Label>
                  <Input
                    type="number"
                    min={1}
                    max={28}
                    value={formData.schedule_day}
                    onChange={(e) => setFormData({ ...formData, schedule_day: parseInt(e.target.value) || 1 })}
                  />
                </div>
              )}

              {formData.schedule_type === "custom" && (
                <div className="space-y-2">
                  <Label>Cron Expression *</Label>
                  <Input
                    value={formData.schedule_cron}
                    onChange={(e) => setFormData({ ...formData, schedule_cron: e.target.value })}
                    placeholder="0 9 * * *"
                  />
                  <p className="text-xs text-muted-foreground">
                    Format: minute hour day-of-month month day-of-week
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Task Configuration (JSON)</Label>
                <Textarea
                  value={formData.task_config}
                  onChange={(e) => setFormData({ ...formData, task_config: e.target.value })}
                  rows={6}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Configure task-specific parameters
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Saving..." : editingTask ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead>Last Run</TableHead>
              <TableHead>Runs</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : scheduledTasks?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No scheduled tasks configured
                </TableCell>
              </TableRow>
            ) : (
              scheduledTasks?.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.task_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {taskTypes.find(t => t.value === task.task_type)?.icon}{" "}
                      {taskTypes.find(t => t.value === task.task_type)?.label || task.task_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{getScheduleDescription(task)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {task.last_run_at ? (
                      <div className="flex items-center gap-1">
                        {getStatusIcon(task.last_run_status)}
                        <span className="text-sm">
                          {format(new Date(task.last_run_at), "MMM dd, HH:mm")}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Never</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{task.run_count || 0}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={task.is_active}
                        onCheckedChange={(checked) => 
                          toggleActiveMutation.mutate({ id: task.id, isActive: checked })
                        }
                      />
                      {task.is_active ? (
                        <Badge className="bg-green-500">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(task)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Delete this scheduled task?")) {
                            deleteMutation.mutate(task.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
