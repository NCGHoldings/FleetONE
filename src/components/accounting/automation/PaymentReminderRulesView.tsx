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
import { Plus, RefreshCw, Bell, Mail, MessageSquare, Trash2, Edit, Clock } from "lucide-react";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/hooks/useAuth";

interface PaymentReminderRule {
  id: string;
  company_id: string;
  rule_name: string;
  trigger_type: string;
  days_offset: number;
  reminder_channel: string;
  email_subject: string;
  email_template: string;
  sms_template: string;
  is_active: boolean;
  applies_to_ar: boolean;
  applies_to_ap: boolean;
  min_amount: number;
  max_amount: number;
  priority: number;
  created_at: string;
}

const triggerTypes = [
  { value: "before_due", label: "Before Due Date", icon: "🔔" },
  { value: "on_due", label: "On Due Date", icon: "⏰" },
  { value: "after_due", label: "After Due Date (Overdue)", icon: "⚠️" },
];

const channelOptions = [
  { value: "email", label: "Email Only", icon: Mail },
  { value: "sms", label: "SMS Only", icon: MessageSquare },
  { value: "both", label: "Email & SMS", icon: Bell },
];

const defaultEmailTemplate = `Dear {{customer_name}},

This is a friendly reminder that invoice {{invoice_number}} for {{invoice_amount}} is {{status_text}}.

Invoice Details:
- Invoice Number: {{invoice_number}}
- Amount Due: {{invoice_amount}}
- Due Date: {{due_date}}

Please ensure timely payment to avoid any inconvenience.

Thank you for your business.

Best regards,
{{company_name}}`;

const defaultSmsTemplate = `Reminder: Invoice {{invoice_number}} for {{invoice_amount}} is {{status_text}}. Due: {{due_date}}. Please pay promptly. - {{company_name}}`;

export function PaymentReminderRulesView() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PaymentReminderRule | null>(null);
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    rule_name: "",
    trigger_type: "before_due",
    days_offset: 3,
    reminder_channel: "email",
    email_subject: "Payment Reminder: Invoice {{invoice_number}}",
    email_template: defaultEmailTemplate,
    sms_template: defaultSmsTemplate,
    applies_to_ar: true,
    applies_to_ap: false,
    min_amount: 0,
    max_amount: 0,
    priority: 1,
  });

  // Fetch reminder rules
  const { data: reminderRules, isLoading } = useQuery({
    queryKey: ["payment-reminder-rules", selectedCompany?.id],
    queryFn: async () => {
      const query = supabase
        .from("payment_reminder_rules")
        .select("*")
        .order("priority", { ascending: true });

      if (selectedCompany?.id) {
        query.eq("company_id", selectedCompany.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as PaymentReminderRule[];
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        ...data,
        company_id: selectedCompany?.id,
        created_by: user?.id,
        min_amount: data.min_amount || null,
        max_amount: data.max_amount || null,
      };

      if (editingRule) {
        const { error } = await supabase
          .from("payment_reminder_rules")
          .update(payload)
          .eq("id", editingRule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("payment_reminder_rules")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-reminder-rules"] });
      toast.success(editingRule ? "Reminder rule updated" : "Reminder rule created");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error("Failed to save reminder rule: " + error.message);
    },
  });

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("payment_reminder_rules")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-reminder-rules"] });
      toast.success("Status updated");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("payment_reminder_rules")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-reminder-rules"] });
      toast.success("Reminder rule deleted");
    },
  });

  const resetForm = () => {
    setFormData({
      rule_name: "",
      trigger_type: "before_due",
      days_offset: 3,
      reminder_channel: "email",
      email_subject: "Payment Reminder: Invoice {{invoice_number}}",
      email_template: defaultEmailTemplate,
      sms_template: defaultSmsTemplate,
      applies_to_ar: true,
      applies_to_ap: false,
      min_amount: 0,
      max_amount: 0,
      priority: 1,
    });
    setEditingRule(null);
  };

  const handleEdit = (rule: PaymentReminderRule) => {
    setEditingRule(rule);
    setFormData({
      rule_name: rule.rule_name,
      trigger_type: rule.trigger_type,
      days_offset: rule.days_offset,
      reminder_channel: rule.reminder_channel,
      email_subject: rule.email_subject || "",
      email_template: rule.email_template || defaultEmailTemplate,
      sms_template: rule.sms_template || defaultSmsTemplate,
      applies_to_ar: rule.applies_to_ar,
      applies_to_ap: rule.applies_to_ap,
      min_amount: rule.min_amount || 0,
      max_amount: rule.max_amount || 0,
      priority: rule.priority,
    });
    setIsDialogOpen(true);
  };

  const getTriggerDescription = (type: string, days: number) => {
    switch (type) {
      case "before_due":
        return `${days} days before due date`;
      case "on_due":
        return "On the due date";
      case "after_due":
        return `${days} days after due date`;
      default:
        return "";
    }
  };

  const activeArRules = reminderRules?.filter(r => r.is_active && r.applies_to_ar).length || 0;
  const activeApRules = reminderRules?.filter(r => r.is_active && r.applies_to_ap).length || 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reminderRules?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">AR Reminders Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeArRules}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">AP Reminders Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{activeApRules}</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Payment Reminder Rules</h2>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Reminder Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingRule ? "Edit Reminder Rule" : "Create Reminder Rule"}
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
                    placeholder="3-Day Before Due Reminder"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Trigger Type *</Label>
                  <Select
                    value={formData.trigger_type}
                    onValueChange={(value) => setFormData({ ...formData, trigger_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {triggerTypes.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.icon} {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Days Offset</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.days_offset}
                    onChange={(e) => setFormData({ ...formData, days_offset: parseInt(e.target.value) || 0 })}
                    disabled={formData.trigger_type === "on_due"}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Channel *</Label>
                  <Select
                    value={formData.reminder_channel}
                    onValueChange={(value) => setFormData({ ...formData, reminder_channel: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {channelOptions.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.applies_to_ar}
                    onCheckedChange={(checked) => setFormData({ ...formData, applies_to_ar: checked })}
                  />
                  <Label>Apply to AR (Receivables)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.applies_to_ap}
                    onCheckedChange={(checked) => setFormData({ ...formData, applies_to_ap: checked })}
                  />
                  <Label>Apply to AP (Payables)</Label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Minimum Amount (Optional)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.min_amount || ""}
                    onChange={(e) => setFormData({ ...formData, min_amount: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Maximum Amount (Optional)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.max_amount || ""}
                    onChange={(e) => setFormData({ ...formData, max_amount: parseFloat(e.target.value) || 0 })}
                    placeholder="No limit"
                  />
                </div>
              </div>

              {(formData.reminder_channel === "email" || formData.reminder_channel === "both") && (
                <>
                  <div className="space-y-2">
                    <Label>Email Subject</Label>
                    <Input
                      value={formData.email_subject}
                      onChange={(e) => setFormData({ ...formData, email_subject: e.target.value })}
                      placeholder="Payment Reminder: Invoice {{invoice_number}}"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email Template</Label>
                    <Textarea
                      value={formData.email_template}
                      onChange={(e) => setFormData({ ...formData, email_template: e.target.value })}
                      rows={8}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Available placeholders: {"{{customer_name}}, {{invoice_number}}, {{invoice_amount}}, {{due_date}}, {{status_text}}, {{company_name}}"}
                    </p>
                  </div>
                </>
              )}

              {(formData.reminder_channel === "sms" || formData.reminder_channel === "both") && (
                <div className="space-y-2">
                  <Label>SMS Template</Label>
                  <Textarea
                    value={formData.sms_template}
                    onChange={(e) => setFormData({ ...formData, sms_template: e.target.value })}
                    rows={3}
                    maxLength={160}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.sms_template.length}/160 characters
                  </p>
                </div>
              )}

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
              <TableHead>Channel</TableHead>
              <TableHead>Applies To</TableHead>
              <TableHead>Priority</TableHead>
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
            ) : reminderRules?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No reminder rules configured
                </TableCell>
              </TableRow>
            ) : (
              reminderRules?.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.rule_name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        {getTriggerDescription(rule.trigger_type, rule.days_offset)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {rule.reminder_channel === "both" ? "Email & SMS" : rule.reminder_channel}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {rule.applies_to_ar && <Badge className="bg-green-500">AR</Badge>}
                      {rule.applies_to_ap && <Badge className="bg-orange-500">AP</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{rule.priority}</Badge>
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
                          if (confirm("Delete this reminder rule?")) {
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
