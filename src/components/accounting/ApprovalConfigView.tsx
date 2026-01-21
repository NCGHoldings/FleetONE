import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { CurrencyDisplay } from "./CurrencyDisplay";
import { toast } from "sonner";
import { Plus, Settings, Shield, Users, Edit, Trash2 } from "lucide-react";

const MODULES = [
  { value: "journal_entry", label: "Journal Entries" },
  { value: "ap_invoice", label: "AP Invoices" },
  { value: "ap_payment", label: "AP Payments" },
  { value: "ar_invoice", label: "AR Invoices" },
  { value: "ar_receipt", label: "AR Receipts" },
  { value: "purchase_order", label: "Purchase Orders" },
  { value: "purchase_requisition", label: "Purchase Requisitions" },
  { value: "grn", label: "Goods Receipt Notes" },
  { value: "stock_adjustment", label: "Stock Adjustments" },
  { value: "asset_disposal", label: "Asset Disposals" },
  { value: "payment_batch", label: "Payment Batches" },
];

const ROLES = [
  { value: "finance", label: "Finance" },
  { value: "admin", label: "Admin" },
  { value: "super_admin", label: "Super Admin" },
  { value: "manager", label: "Manager" },
  { value: "accountant", label: "Accountant" },
];

export const ApprovalConfigView = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<any>(null);
  const [formData, setFormData] = useState({
    module: "",
    document_type: "",
    min_amount: "",
    max_amount: "",
    required_approvers: "1",
    approver_roles: ["finance"],
    sequential_approval: false,
    is_active: true,
  });
  const queryClient = useQueryClient();

  // Fetch approval configurations
  const { data: configs, isLoading } = useQuery({
    queryKey: ["approval-configurations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("approval_configurations")
        .select("*")
        .order("module", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Create/update configuration mutation
  const saveConfig = useMutation({
    mutationFn: async () => {
      const payload = {
        module: formData.module,
        document_type: formData.document_type || formData.module,
        min_amount: formData.min_amount ? parseFloat(formData.min_amount) : null,
        max_amount: formData.max_amount ? parseFloat(formData.max_amount) : null,
        required_approvers: parseInt(formData.required_approvers),
        approver_roles: formData.approver_roles,
        sequential_approval: formData.sequential_approval,
        is_active: formData.is_active,
      };

      if (editingConfig) {
        const { error } = await supabase
          .from("approval_configurations")
          .update(payload)
          .eq("id", editingConfig.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("approval_configurations")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingConfig ? "Configuration updated" : "Configuration created");
      queryClient.invalidateQueries({ queryKey: ["approval-configurations"] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  // Delete configuration mutation
  const deleteConfig = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("approval_configurations")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Configuration deleted");
      queryClient.invalidateQueries({ queryKey: ["approval-configurations"] });
    },
  });

  // Toggle active status
  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("approval_configurations")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["approval-configurations"] });
    },
  });

  const resetForm = () => {
    setFormData({
      module: "",
      document_type: "",
      min_amount: "",
      max_amount: "",
      required_approvers: "1",
      approver_roles: ["finance"],
      sequential_approval: false,
      is_active: true,
    });
    setEditingConfig(null);
  };

  const handleEdit = (config: any) => {
    setEditingConfig(config);
    setFormData({
      module: config.module,
      document_type: config.document_type,
      min_amount: config.min_amount?.toString() || "",
      max_amount: config.max_amount?.toString() || "",
      required_approvers: config.required_approvers.toString(),
      approver_roles: config.approver_roles || ["finance"],
      sequential_approval: config.sequential_approval,
      is_active: config.is_active,
    });
    setIsDialogOpen(true);
  };

  const toggleRole = (role: string) => {
    setFormData(prev => ({
      ...prev,
      approver_roles: prev.approver_roles.includes(role)
        ? prev.approver_roles.filter(r => r !== role)
        : [...prev.approver_roles, role],
    }));
  };

  const configColumns = [
    {
      accessorKey: "module",
      header: "Module",
      cell: ({ row }: any) => {
        const module = MODULES.find(m => m.value === row.original.module);
        return <Badge variant="outline">{module?.label || row.original.module}</Badge>;
      },
    },
    {
      accessorKey: "min_amount",
      header: "Min Amount",
      cell: ({ row }: any) => 
        row.original.min_amount ? <CurrencyDisplay amount={row.original.min_amount} /> : "Any",
    },
    {
      accessorKey: "max_amount",
      header: "Max Amount",
      cell: ({ row }: any) => 
        row.original.max_amount ? <CurrencyDisplay amount={row.original.max_amount} /> : "Unlimited",
    },
    {
      accessorKey: "required_approvers",
      header: "Approvers",
      cell: ({ row }: any) => (
        <Badge>{row.original.required_approvers} required</Badge>
      ),
    },
    {
      accessorKey: "approver_roles",
      header: "Allowed Roles",
      cell: ({ row }: any) => (
        <div className="flex gap-1 flex-wrap">
          {row.original.approver_roles?.map((role: string) => (
            <Badge key={role} variant="secondary" className="text-xs">
              {role}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      accessorKey: "sequential_approval",
      header: "Sequential",
      cell: ({ row }: any) => (
        <Badge variant={row.original.sequential_approval ? "default" : "outline"}>
          {row.original.sequential_approval ? "Yes" : "No"}
        </Badge>
      ),
    },
    {
      accessorKey: "is_active",
      header: "Active",
      cell: ({ row }: any) => (
        <Switch
          checked={row.original.is_active}
          onCheckedChange={(checked) => 
            toggleActive.mutate({ id: row.original.id, is_active: checked })
          }
        />
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }: any) => (
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => handleEdit(row.original)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            className="text-destructive"
            onClick={() => {
              if (confirm("Delete this configuration?")) {
                deleteConfig.mutate(row.original.id);
              }
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Approval Workflows</h2>
          <p className="text-muted-foreground">Configure maker-checker approval rules</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingConfig ? "Edit Approval Rule" : "Create Approval Rule"}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Module</Label>
                <Select 
                  value={formData.module} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, module: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select module" />
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Min Amount (optional)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={formData.min_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, min_amount: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Amount (optional)</Label>
                  <Input
                    type="number"
                    placeholder="Unlimited"
                    value={formData.max_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, max_amount: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Required Approvers</Label>
                <Select 
                  value={formData.required_approvers} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, required_approvers: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Approver</SelectItem>
                    <SelectItem value="2">2 Approvers</SelectItem>
                    <SelectItem value="3">3 Approvers</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Allowed Approver Roles</Label>
                <div className="flex flex-wrap gap-2">
                  {ROLES.map((role) => (
                    <Button
                      key={role.value}
                      type="button"
                      size="sm"
                      variant={formData.approver_roles.includes(role.value) ? "default" : "outline"}
                      onClick={() => toggleRole(role.value)}
                    >
                      {role.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sequential Approval</Label>
                  <p className="text-xs text-muted-foreground">
                    Require approvals in order
                  </p>
                </div>
                <Switch
                  checked={formData.sequential_approval}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, sequential_approval: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Active</Label>
                  <p className="text-xs text-muted-foreground">
                    Enable this approval rule
                  </p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, is_active: checked }))
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => saveConfig.mutate()}
                disabled={!formData.module || saveConfig.isPending}
              >
                {saveConfig.isPending ? "Saving..." : (editingConfig ? "Update" : "Create")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Active Rules
            </CardDescription>
            <CardTitle className="text-2xl">
              {configs?.filter(c => c.is_active).length || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Modules Covered
            </CardDescription>
            <CardTitle className="text-2xl">
              {new Set(configs?.map(c => c.module)).size || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Sequential Rules
            </CardDescription>
            <CardTitle className="text-2xl">
              {configs?.filter(c => c.sequential_approval).length || 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Configuration Table */}
      <Card>
        <CardHeader>
          <CardTitle>Approval Rules</CardTitle>
          <CardDescription>
            Define which transactions require approval and by whom
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={configColumns}
            data={configs || []}
            searchKey="module"
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
    </div>
  );
};
