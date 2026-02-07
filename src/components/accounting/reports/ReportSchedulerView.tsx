import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Clock, Mail, Calendar, Trash2, Play } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const SCHEDULE_TYPES = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
];

const FORMATS = [
  { id: "pdf", label: "PDF" },
  { id: "excel", label: "Excel" },
  { id: "csv", label: "CSV" },
];

export const ReportSchedulerView = () => {
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    report_id: "",
    schedule_type: "weekly",
    schedule_day: "1",
    schedule_time: "08:00",
    recipients: "",
    format: "pdf",
  });

  // Fetch custom reports
  const { data: reports } = useQuery({
    queryKey: ["custom_reports", selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id) return [];
      const { data, error } = await (supabase as any)
        .from("custom_reports")
        .select("id, name")
        .eq("company_id", selectedCompany.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCompany?.id,
  });

  // Fetch schedules
  const { data: schedules, isLoading } = useQuery({
    queryKey: ["report_schedules", selectedCompany?.id],
    queryFn: async () => {
      if (!selectedCompany?.id) return [];
      const { data, error } = await (supabase as any)
        .from("report_schedules")
        .select(`
          *,
          report:custom_reports(name)
        `)
        .eq("company_id", selectedCompany.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCompany?.id,
  });

  // Create schedule
  const createSchedule = useMutation({
    mutationFn: async () => {
      if (!selectedCompany?.id) throw new Error("No company selected");
      if (!formData.report_id) throw new Error("Select a report");
      if (!formData.recipients) throw new Error("Enter at least one recipient");

      const recipients = formData.recipients.split(",").map(e => e.trim()).filter(Boolean);
      
      const { error } = await supabase.from("report_schedules").insert({
        report_id: formData.report_id,
        schedule_type: formData.schedule_type,
        schedule_day: parseInt(formData.schedule_day),
        schedule_time: formData.schedule_time,
        recipients,
        format: formData.format,
        is_active: true,
        company_id: selectedCompany.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report_schedules"] });
      toast.success("Schedule created successfully");
      setDialogOpen(false);
      setFormData({
        report_id: "",
        schedule_type: "weekly",
        schedule_day: "1",
        schedule_time: "08:00",
        recipients: "",
        format: "pdf",
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create schedule");
    },
  });

  // Toggle schedule active status
  const toggleSchedule = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("report_schedules")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report_schedules"] });
      toast.success("Schedule updated");
    },
  });

  // Delete schedule
  const deleteSchedule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("report_schedules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["report_schedules"] });
      toast.success("Schedule deleted");
    },
  });

  const getScheduleDescription = (schedule: any) => {
    const type = schedule.schedule_type;
    const day = schedule.schedule_day;
    const time = schedule.schedule_time?.slice(0, 5) || "08:00";

    if (type === "daily") return `Daily at ${time}`;
    if (type === "weekly") {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      return `Every ${days[day] || "Mon"} at ${time}`;
    }
    if (type === "monthly") return `Day ${day} of each month at ${time}`;
    return type;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Report Scheduler</h2>
          <p className="text-muted-foreground">Automate report generation and delivery</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Schedule
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Report Schedule</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Report *</Label>
                <Select value={formData.report_id} onValueChange={(v) => setFormData({ ...formData, report_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a saved report" />
                  </SelectTrigger>
                  <SelectContent>
                    {reports?.map((report: any) => (
                      <SelectItem key={report.id} value={report.id}>
                        {report.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select value={formData.schedule_type} onValueChange={(v) => setFormData({ ...formData, schedule_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCHEDULE_TYPES.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.schedule_type === "weekly" && (
                  <div className="space-y-2">
                    <Label>Day of Week</Label>
                    <Select value={formData.schedule_day} onValueChange={(v) => setFormData({ ...formData, schedule_day: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day, i) => (
                          <SelectItem key={i} value={i.toString()}>{day}</SelectItem>
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
                      onChange={(e) => setFormData({ ...formData, schedule_day: e.target.value })}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={formData.schedule_time}
                    onChange={(e) => setFormData({ ...formData, schedule_time: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Format</Label>
                  <Select value={formData.format} onValueChange={(v) => setFormData({ ...formData, format: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FORMATS.map((fmt) => (
                        <SelectItem key={fmt.id} value={fmt.id}>{fmt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Recipients (comma-separated emails) *</Label>
                <Input
                  value={formData.recipients}
                  onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
                  placeholder="finance@company.com, manager@company.com"
                />
              </div>

              <Button className="w-full" onClick={() => createSchedule.mutate()} disabled={createSchedule.isPending}>
                {createSchedule.isPending ? "Creating..." : "Create Schedule"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Scheduled Reports
          </CardTitle>
          <CardDescription>Manage automated report delivery schedules</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Loading schedules...</p>
          ) : schedules && schedules.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule: any) => (
                  <TableRow key={schedule.id}>
                    <TableCell className="font-medium">{schedule.report?.name || "Unknown"}</TableCell>
                    <TableCell>{getScheduleDescription(schedule)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{schedule.format?.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {schedule.recipients?.length || 0} recipient(s)
                      </span>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={schedule.is_active}
                        onCheckedChange={(checked) => toggleSchedule.mutate({ id: schedule.id, isActive: checked })}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteSchedule.mutate(schedule.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No report schedules configured</p>
              <p className="text-sm">Create a schedule to automate report delivery</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
