import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, RefreshCw, Calendar, Mail, Pause, Play, Trash2, Edit } from "lucide-react";
import { format, addDays, addWeeks, addMonths, addQuarters, addYears } from "date-fns";
import { CurrencyDisplay } from "@/components/accounting/shared/CurrencyDisplay";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/hooks/useAuth";
import { SearchableCustomerSelector } from "../shared/SearchableCustomerSelector";

interface RecurringInvoice {
  id: string;
  company_id: string;
  customer_id: string;
  template_name: string;
  description: string;
  amount: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  frequency: string;
  day_of_month: number;
  next_run_date: string;
  last_run_date: string;
  start_date: string;
  end_date: string;
  auto_send_email: boolean;
  payment_terms_days: number;
  is_active: boolean;
  invoices_generated: number;
  created_at: string;
  customers?: { customer_name: string };
}

const frequencyOptions = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

export function RecurringInvoicesView() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<RecurringInvoice | null>(null);
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompany();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    customer_id: "",
    template_name: "",
    description: "",
    amount: 0,
    tax_rate: 0,
    frequency: "monthly",
    day_of_month: 1,
    start_date: format(new Date(), "yyyy-MM-dd"),
    end_date: "",
    auto_send_email: false,
    payment_terms_days: 30,
  });

  // Fetch recurring invoices
  const { data: recurringInvoices, isLoading } = useQuery({
    queryKey: ["recurring-invoices", selectedCompany?.id],
    queryFn: async () => {
      const query = supabase
        .from("recurring_invoices")
        .select(`
          *,
          customers (customer_name)
        `)
        .order("created_at", { ascending: false });

      if (selectedCompany?.id) {
        query.eq("company_id", selectedCompany.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as RecurringInvoice[];
    },
  });

  // Fetch customers for dropdown
  const { data: customers } = useQuery({
    queryKey: ["customers-for-recurring", selectedCompany?.id],
    queryFn: async () => {
      const query = supabase
        .from("customers")
        .select("id, customer_name, customer_code")
        .eq("is_active", true)
        .order("customer_name");

      if (selectedCompany?.id) {
        query.eq("company_id", selectedCompany.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const taxAmount = (data.amount * data.tax_rate) / 100;
      const totalAmount = data.amount + taxAmount;

      const payload = {
        ...data,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        company_id: selectedCompany?.id,
        created_by: user?.id,
        next_run_date: data.start_date,
        end_date: data.end_date || null,
      };

      if (editingInvoice) {
        const { error } = await supabase
          .from("recurring_invoices")
          .update(payload)
          .eq("id", editingInvoice.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("recurring_invoices")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-invoices"] });
      toast.success(editingInvoice ? "Recurring invoice updated" : "Recurring invoice created");
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error("Failed to save recurring invoice: " + error.message);
    },
  });

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("recurring_invoices")
        .update({ is_active: isActive })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-invoices"] });
      toast.success("Status updated");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("recurring_invoices")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-invoices"] });
      toast.success("Recurring invoice deleted");
    },
  });

  const resetForm = () => {
    setFormData({
      customer_id: "",
      template_name: "",
      description: "",
      amount: 0,
      tax_rate: 0,
      frequency: "monthly",
      day_of_month: 1,
      start_date: format(new Date(), "yyyy-MM-dd"),
      end_date: "",
      auto_send_email: false,
      payment_terms_days: 30,
    });
    setEditingInvoice(null);
  };

  const handleEdit = (invoice: RecurringInvoice) => {
    setEditingInvoice(invoice);
    setFormData({
      customer_id: invoice.customer_id,
      template_name: invoice.template_name,
      description: invoice.description || "",
      amount: invoice.amount,
      tax_rate: invoice.tax_rate || 0,
      frequency: invoice.frequency,
      day_of_month: invoice.day_of_month || 1,
      start_date: invoice.start_date,
      end_date: invoice.end_date || "",
      auto_send_email: invoice.auto_send_email,
      payment_terms_days: invoice.payment_terms_days || 30,
    });
    setIsDialogOpen(true);
  };

  const getNextRunDate = (frequency: string, startDate: string) => {
    const date = new Date(startDate);
    switch (frequency) {
      case "daily": return addDays(date, 1);
      case "weekly": return addWeeks(date, 1);
      case "monthly": return addMonths(date, 1);
      case "quarterly": return addQuarters(date, 1);
      case "yearly": return addYears(date, 1);
      default: return date;
    }
  };

  const activeCount = recurringInvoices?.filter(r => r.is_active).length || 0;
  const totalMonthlyValue = recurringInvoices
    ?.filter(r => r.is_active && r.frequency === "monthly")
    .reduce((sum, r) => sum + r.total_amount, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Recurring</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              <CurrencyDisplay amount={totalMonthlyValue} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recurringInvoices?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Recurring Invoices</h2>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Recurring Invoice
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingInvoice ? "Edit Recurring Invoice" : "Create Recurring Invoice"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              saveMutation.mutate(formData);
            }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer *</Label>
                  <SearchableCustomerSelector
                    value={formData.customer_id}
                    onValueChange={(value) => setFormData({ ...formData, customer_id: value })}
                    showQuickAdd={true}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Template Name *</Label>
                  <Input
                    value={formData.template_name}
                    onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                    placeholder="Monthly Service Fee"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Invoice description"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Amount *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tax Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.tax_rate}
                    onChange={(e) => setFormData({ ...formData, tax_rate: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total Amount</Label>
                  <div className="p-2 bg-muted rounded-md font-semibold">
                    <CurrencyDisplay amount={formData.amount + (formData.amount * formData.tax_rate / 100)} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Frequency *</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {frequencyOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Day of Month</Label>
                  <Input
                    type="number"
                    min={1}
                    max={28}
                    value={formData.day_of_month}
                    onChange={(e) => setFormData({ ...formData, day_of_month: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payment Terms (Days)</Label>
                  <Input
                    type="number"
                    value={formData.payment_terms_days}
                    onChange={(e) => setFormData({ ...formData, payment_terms_days: parseInt(e.target.value) || 30 })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date *</Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date (Optional)</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.auto_send_email}
                  onCheckedChange={(checked) => setFormData({ ...formData, auto_send_email: checked })}
                />
                <Label>Auto-send invoice via email</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Saving..." : editingInvoice ? "Update" : "Create"}
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
              <TableHead>Customer</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead>Next Run</TableHead>
              <TableHead>Generated</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : recurringInvoices?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No recurring invoices configured
                </TableCell>
              </TableRow>
            ) : (
              recurringInvoices?.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    {invoice.customers?.customer_name || "Unknown"}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{invoice.template_name}</p>
                      {invoice.description && (
                        <p className="text-xs text-muted-foreground">{invoice.description}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <CurrencyDisplay amount={invoice.total_amount} />
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {invoice.frequency}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {format(new Date(invoice.next_run_date), "MMM dd, yyyy")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{invoice.invoices_generated}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={invoice.is_active}
                        onCheckedChange={(checked) => 
                          toggleActiveMutation.mutate({ id: invoice.id, isActive: checked })
                        }
                      />
                      {invoice.is_active ? (
                        <Badge className="bg-green-500">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Paused</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(invoice)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Delete this recurring invoice?")) {
                            deleteMutation.mutate(invoice.id);
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
