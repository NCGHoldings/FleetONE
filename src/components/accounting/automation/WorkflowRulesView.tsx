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
import { Plus, RefreshCw, Zap, Trash2, Edit, Play, History } from "lucide-react";
import { format } from "date-fns";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/hooks/useAuth";

interface WorkflowRule {
  id: string;
  company_id: string;
  rule_name: string;
  description: string;
  trigger_module: string;
  trigger_event: string;
  trigger_conditions: Record<string, any>;
  action_type: string;
  action_config: Record<string, any>;
  is_active: boolean;
  execution_order: number;
  last_triggered_at: string;
  trigger_count: number;
  created_at: string;
}

const moduleOptions = [
  { value: "ar_invoices", label: "AR Invoices" },
  { value: "ar_receipts", label: "AR Receipts" },
  { value: "ap_invoices", label: "AP Invoices" },
  { value: "ap_payments", label: "AP Payments" },
  { value: "journal_entries", label: "Journal Entries" },
  { value: "purchase_orders", label: "Purchase Orders" },
  { value: "customers", label: "Customers" },
  { value: "vendors", label: "Vendors" },
];

const eventOptions = [
  { value: "create", label: "Record Created" },
  { value: "update", label: "Record Updated" },
  { value: "delete", label: "Record Deleted" },
  { value: "status_change", label: "Status Changed" },
  { value: "approval", label: "Approved" },
  { value: "payment", label: "Payment Received" },
];

const actionOptions = [
  { value: "email", label: "Send Email" },
  { value: "field_update", label: "Update Field" },
  { value: "webhook", label: "Call Webhook" },
  { value: "create_record", label: "Create Record" },
  { value: "notification", label: "Send Notification" },
];

export function WorkflowRulesView() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<WorkflowRule | null>(null);
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    rule_name: "",
    description: "",
    trigger_module: "ar_invoices",
    trigger_event: "create",
    trigger_conditions: "{}",
    action_type: "email",
    action_config: "{}",
    execution_order: 1,
  });

  // Fetch workflow rules
  const { data: workflowRules, isLoading } = useQuery({
    queryKey: ["workflow-rules", selectedCompany?.id],
    queryFn: async () => {
      const query = supabase
        .from("workflow_rules")
        .select("*")
        .order("execution_order", { ascending: true });

      if (selectedCompany?.id) {
        query.eq("company_id", selectedCompany.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as WorkflowRule[];
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      let triggerConditions = {};
      let actionConfig = {};
      
      try {
        triggerConditions = JSON.parse(data.trigger_conditions);
      } catch (e) {
        throw new Error("Invalid trigger conditions JSON");
      }
      
      try {
        actionConfig = JSON.parse(data.action_config);
      } catch (e) {
        throw new Error("Invalid action config JSON");
      }

      const payload = {
        rule_name: data.rule_name,
        description: data.description,
        trigger_module: data.trigger_module,
        trigger_event: data.trigger_event,
        trigger_conditions: triggerConditions,
        action_type: data.action_type,
        action_config: actionConfig,
        execution_order: data.execution_order,
        company_id: selectedCompany?.id,
        created_by: user?.id,
      };

      if (editingRule) {
        const { error } = await supabase
          .from("workflow_rules")
          .update(payload)
          .eq("id", editingRule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("workflow_rules")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-rules"] });
      toast.success(editingRule ? "Workflow rule updated" : "Workflow rule created");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error("Failed to save workflow rule: " + error.message);
    },
  });

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("workflow_rules")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-rules"] });
      toast.success("Status updated");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("workflow_rules")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-rules"] });
      toast.success("Workflow rule deleted");
    },
  });

  const resetForm = () => {
    setFormData({
      rule_name: "",
      description: "",
      trigger_module: "ar_invoices",
      trigger_event: "create",
      trigger_conditions: "{}",
      action_type: "email",
      action_config: "{}",
      execution_order: 1,
    });
    setEditingRule(null);
  };

  const handleEdit = (rule: WorkflowRule) => {
    setEditingRule(rule);
    setFormData({
      rule_name: rule.rule_name,
      description: rule.description || "",
      trigger_module: rule.trigger_module,
      trigger_event: rule.trigger_event,
      trigger_conditions: JSON.stringify(rule.trigger_conditions, null, 2),
      action_type: rule.action_type,
      action_config: JSON.stringify(rule.action_config, null, 2),
      execution_order: rule.execution_order,
    });
    setIsDialogOpen(true);
  };

  const getActionConfigTemplate = (actionType: string) => {
    switch (actionType) {
      case "email":
        return JSON.stringify({
          to: "{{customer_email}}",
          subject: "Notification",
          template: "email_template_id"
        }, null, 2);
      case "webhook":
        return JSON.stringify({
          url: "https://api.example.com/webhook",
          method: "POST",
          headers: { "Content-Type": "application/json" }
        }, null, 2);
      case "field_update":
        return JSON.stringify({
          field: "status",
          value: "processed"
        }, null, 2);
      case "notification":
        return JSON.stringify({
          title: "New Record Created",
          message: "A new {{module}} has been created",
          recipients: ["admin"]
        }, null, 2);
      default:
        return "{}";
    }
  };

  const activeRules = workflowRules?.filter(r => r.is_active).length || 0;
  const totalExecutions = workflowRules?.reduce((sum, r) => sum + (r.trigger_count || 0), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workflowRules?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeRules}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Executions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalExecutions}</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Workflow Rules</h2>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Workflow Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRule ? "Edit Workflow Rule" : "Create Workflow Rule"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate(formData);
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Rule Name *</Label>
                  <Input
                    value={formData.rule_name}
                    onChange={(e) => setFormData({ ...formData, rule_name: e.target.value })}
                    placeholder="Send email on invoice creation"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Execution Order</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.execution_order}
                    onChange={(e) => setFormData({ ...formData, execution_order: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what this rule does..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Trigger Module *</Label>
                  <Select
                    value={formData.trigger_module}
                    onValueChange={(value) => setFormData({ ...formData, trigger_module: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {moduleOptions.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Trigger Event *</Label>
                  <Select
                    value={formData.trigger_event}
                    onValueChange={(value) => setFormData({ ...formData, trigger_event: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {eventOptions.map((e) => (
                        <SelectItem key={e.value} value={e.value}>
                          {e.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Trigger Conditions (JSON)</Label>
                <Textarea
                  value={formData.trigger_conditions}
                  onChange={(e) => setFormData({ ...formData, trigger_conditions: e.target.value })}
                  rows={4}
                  className="font-mono text-sm"
                  placeholder='{"status": "approved", "amount_gt": 10000}'
                />
                <p className="text-xs text-muted-foreground">
                  Optional conditions to filter when this rule triggers
                </p>
              </div>

              <div className="space-y-2">
                <Label>Action Type *</Label>
                <Select
                  value={formData.action_type}
                  onValueChange={(value) => setFormData({ 
                    ...formData, 
                    action_type: value,
                    action_config: getActionConfigTemplate(value)
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {actionOptions.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Action Configuration (JSON) *</Label>
                <Textarea
                  value={formData.action_config}
                  onChange={(e) => setFormData({ ...formData, action_config: e.target.value })}
                  rows={6}
                  className="font-mono text-sm"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Configure the action details based on the selected action type
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Saving..." : editingRule ? "Update" : "Create"}
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
              <TableHead>Rule Name</TableHead>
              <TableHead>Trigger</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Executions</TableHead>
              <TableHead>Last Triggered</TableHead>
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
            ) : workflowRules?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No workflow rules configured
                </TableCell>
              </TableRow>
            ) : (
              workflowRules?.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{rule.rule_name}</p>
                      {rule.description && (
                        <p className="text-xs text-muted-foreground">{rule.description}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge variant="outline">{rule.trigger_module.replace(/_/g, " ")}</Badge>
                      <Badge variant="secondary" className="ml-1">{rule.trigger_event}</Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="capitalize">{rule.action_type.replace(/_/g, " ")}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Play className="h-4 w-4 text-muted-foreground" />
                      {rule.trigger_count || 0}
                    </div>
                  </TableCell>
                  <TableCell>
                    {rule.last_triggered_at ? (
                      <div className="flex items-center gap-1">
                        <History className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(rule.last_triggered_at), "MMM dd, HH:mm")}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">Never</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={(checked) => 
                          toggleActiveMutation.mutate({ id: rule.id, isActive: checked })
                        }
                      />
                      {rule.is_active ? (
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
                        onClick={() => handleEdit(rule)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Delete this workflow rule?")) {
                            deleteMutation.mutate(rule.id);
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
