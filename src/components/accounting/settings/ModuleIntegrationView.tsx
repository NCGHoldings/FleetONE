import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Save, Trash2, Link2, AlertCircle, CheckCircle, Clock, Loader2 } from "lucide-react";
import { useCompanyOptional } from "@/contexts/CompanyContext";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";

// Module definitions with their source tables
const MODULE_DEFINITIONS = [
  {
    id: "school_bus",
    name: "School Bus Operations",
    icon: "🚌",
    tables: [
      { table: "school_payments", event: "Student Fee Payment", amountField: "amount", dateField: "payment_date", type: "revenue" },
      { table: "route_expenses", event: "Route Expense", amountField: "amount", dateField: "expense_date", type: "expense" },
    ]
  },
  {
    id: "special_hire",
    name: "Special Hire",
    icon: "🚐",
    tables: [
      { table: "trip_payments", event: "Trip Payment Received", amountField: "amount", dateField: "payment_date", type: "revenue" },
      { table: "trip_invoices", event: "Trip Invoice Created", amountField: "total_amount", dateField: "invoice_date", type: "receivable" },
      { table: "trip_expenses", event: "Trip Expense", amountField: "amount", dateField: "expense_date", type: "expense" },
    ]
  },
  {
    id: "yutong",
    name: "Yutong Sales",
    icon: "🚛",
    tables: [
      { table: "yutong_cash_receipts", event: "Cash Receipt", amountField: "amount", dateField: "receipt_date", type: "revenue" },
      { table: "yutong_orders", event: "Order Payment", amountField: "total_amount", dateField: "order_date", type: "receivable" },
    ]
  },
  {
    id: "sinotruck",
    name: "Sinotruck Sales",
    icon: "🚛",
    tables: [
      { table: "sinotruck_sales", event: "Vehicle Sale", amountField: "sale_amount", dateField: "sale_date", type: "revenue" },
    ]
  },
  {
    id: "light_vehicle",
    name: "Light Vehicle Sales",
    icon: "🚗",
    tables: [
      { table: "lightvehicle_sales", event: "Vehicle Sale", amountField: "sale_amount", dateField: "sale_date", type: "revenue" },
    ]
  },
  {
    id: "ncg_express",
    name: "NCG Express",
    icon: "🚌",
    tables: [
      { table: "daily_trips", event: "Daily Trip Income", amountField: "income", dateField: "trip_date", type: "revenue" },
      { table: "daily_bus_expenses", event: "Daily Bus Expense", amountField: "amount", dateField: "expense_date", type: "expense" },
    ]
  },
];

interface Mapping {
  id: string;
  company_id: string;
  module_name: string;
  transaction_type: string;
  event_name: string;
  source_table: string;
  amount_field: string;
  date_field: string;
  reference_field: string | null;
  description_template: string | null;
  debit_account_id: string | null;
  credit_account_id: string | null;
  auto_post: boolean;
  requires_approval: boolean;
  is_active: boolean;
}

interface ChartOfAccount {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
}

export const ModuleIntegrationView = () => {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompanyOptional();
  const [activeModule, setActiveModule] = useState("school_bus");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<typeof MODULE_DEFINITIONS[0]["tables"][0] | null>(null);

  // Fetch existing mappings
  const { data: mappings, isLoading: mappingsLoading } = useQuery({
    queryKey: ["module-gl-mappings", selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      const { data, error } = await supabase
        .from("module_gl_mappings")
        .select("*")
        .eq("company_id", selectedCompanyId)
        .order("module_name", { ascending: true });
      if (error) throw error;
      return data as Mapping[];
    },
    enabled: !!selectedCompanyId,
  });

  // Fetch chart of accounts for dropdowns
  const { data: accounts } = useQuery({
    queryKey: ["chart-of-accounts", selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      const { data, error } = await supabase
        .from("chart_of_accounts")
        .select("id, account_code, account_name, account_type")
        .eq("company_id", selectedCompanyId)
        .eq("is_active", true)
        .order("account_code", { ascending: true });
      if (error) throw error;
      return data as ChartOfAccount[];
    },
    enabled: !!selectedCompanyId,
  });

  // Fetch pending postings count
  const { data: pendingCount } = useQuery({
    queryKey: ["pending-gl-postings-count", selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return 0;
      const { count, error } = await supabase
        .from("pending_gl_postings")
        .select("*", { count: "exact", head: true })
        .eq("company_id", selectedCompanyId)
        .eq("status", "pending");
      if (error) throw error;
      return count || 0;
    },
    enabled: !!selectedCompanyId,
  });

  // Create mapping mutation
  const createMutation = useMutation({
    mutationFn: async (mapping: Partial<Mapping>) => {
      const insertData = {
        module_name: mapping.module_name!,
        transaction_type: mapping.transaction_type!,
        event_name: mapping.event_name!,
        source_table: mapping.source_table!,
        amount_field: mapping.amount_field!,
        date_field: mapping.date_field,
        company_id: selectedCompanyId!,
        auto_post: mapping.auto_post ?? false,
        requires_approval: mapping.requires_approval ?? false,
        is_active: mapping.is_active ?? true,
      };
      const { data, error } = await supabase
        .from("module_gl_mappings")
        .insert(insertData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["module-gl-mappings"] });
      toast.success("Mapping created successfully");
      setIsAddDialogOpen(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create mapping: ${error.message}`);
    },
  });

  // Update mapping mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Mapping> & { id: string }) => {
      const { data, error } = await supabase
        .from("module_gl_mappings")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["module-gl-mappings"] });
      toast.success("Mapping updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update mapping: ${error.message}`);
    },
  });

  // Delete mapping mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("module_gl_mappings")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["module-gl-mappings"] });
      toast.success("Mapping deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete mapping: ${error.message}`);
    },
  });

  const currentModuleDef = MODULE_DEFINITIONS.find(m => m.id === activeModule);
  const currentMappings = mappings?.filter(m => m.module_name === activeModule) || [];

  const handleAddMapping = () => {
    if (!selectedTable || !selectedCompanyId) return;

    createMutation.mutate({
      module_name: activeModule,
      transaction_type: selectedTable.type,
      event_name: selectedTable.event,
      source_table: selectedTable.table,
      amount_field: selectedTable.amountField,
      date_field: selectedTable.dateField,
      auto_post: false,
      requires_approval: false,
      is_active: true,
    });
  };

  if (!selectedCompanyId) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Please select a company to configure module integrations</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Module-to-Finance Integration
              </CardTitle>
              <CardDescription>
                Configure how operational data flows to the General Ledger
              </CardDescription>
            </div>
            {pendingCount !== undefined && pendingCount > 0 && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {pendingCount} Pending Postings
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Module Tabs */}
      <Tabs value={activeModule} onValueChange={setActiveModule} className="space-y-4">
        <ScrollArea className="w-full whitespace-nowrap">
          <TabsList className="inline-flex w-max">
            {MODULE_DEFINITIONS.map((module) => (
              <TabsTrigger key={module.id} value={module.id} className="flex items-center gap-2">
                <span>{module.icon}</span>
                <span>{module.name}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </ScrollArea>

        {MODULE_DEFINITIONS.map((module) => (
          <TabsContent key={module.id} value={module.id} className="space-y-4">
            {/* Available Events */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{module.icon} {module.name} Mappings</CardTitle>
                    <CardDescription>
                      Map operational events to GL accounts
                    </CardDescription>
                  </div>
                  <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Mapping
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Mapping</DialogTitle>
                        <DialogDescription>
                          Select an event to map to the General Ledger
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Event Type</Label>
                          <Select onValueChange={(val) => {
                            const table = module.tables.find(t => t.table === val);
                            setSelectedTable(table || null);
                          }}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select an event..." />
                            </SelectTrigger>
                            <SelectContent>
                              {module.tables.map((table) => (
                                <SelectItem key={table.table} value={table.table}>
                                  {table.event} ({table.type})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {selectedTable && (
                          <div className="rounded-lg border p-4 space-y-2 text-sm">
                            <div><strong>Source Table:</strong> {selectedTable.table}</div>
                            <div><strong>Amount Field:</strong> {selectedTable.amountField}</div>
                            <div><strong>Date Field:</strong> {selectedTable.dateField}</div>
                            <div><strong>Type:</strong> <Badge variant="outline">{selectedTable.type}</Badge></div>
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleAddMapping} 
                          disabled={!selectedTable || createMutation.isPending}
                        >
                          {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Create Mapping
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {mappingsLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : currentMappings.length === 0 ? (
                  <div className="text-center p-8 text-muted-foreground">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No mappings configured for {module.name}</p>
                    <p className="text-sm mt-2">Click "Add Mapping" to create your first integration</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {currentMappings.map((mapping) => (
                      <MappingCard 
                        key={mapping.id} 
                        mapping={mapping} 
                        accounts={accounts || []}
                        onUpdate={(updates) => updateMutation.mutate({ id: mapping.id, ...updates })}
                        onDelete={() => deleteMutation.mutate(mapping.id)}
                        isUpdating={updateMutation.isPending}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Pending Postings Section */}
      <PendingPostingsCard companyId={selectedCompanyId} />
    </div>
  );
};

// Mapping Card Component
interface MappingCardProps {
  mapping: Mapping;
  accounts: ChartOfAccount[];
  onUpdate: (updates: Partial<Mapping>) => void;
  onDelete: () => void;
  isUpdating: boolean;
}

const MappingCard = ({ mapping, accounts, onUpdate, onDelete, isUpdating }: MappingCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localMapping, setLocalMapping] = useState(mapping);

  const debitAccount = accounts.find(a => a.id === mapping.debit_account_id);
  const creditAccount = accounts.find(a => a.id === mapping.credit_account_id);

  const handleSave = () => {
    onUpdate({
      debit_account_id: localMapping.debit_account_id,
      credit_account_id: localMapping.credit_account_id,
      description_template: localMapping.description_template,
      auto_post: localMapping.auto_post,
      requires_approval: localMapping.requires_approval,
      is_active: localMapping.is_active,
    });
    setIsEditing(false);
  };

  const getTransactionTypeBadge = (type: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      revenue: "default",
      expense: "destructive",
      receivable: "secondary",
      payable: "outline",
    };
    return <Badge variant={variants[type] || "outline"}>{type}</Badge>;
  };

  return (
    <div className={`rounded-lg border p-4 space-y-4 ${!mapping.is_active ? 'opacity-60 bg-muted/30' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h4 className="font-medium">{mapping.event_name}</h4>
            <p className="text-sm text-muted-foreground">
              Source: {mapping.source_table}.{mapping.amount_field}
            </p>
          </div>
          {getTransactionTypeBadge(mapping.transaction_type)}
        </div>
        <div className="flex items-center gap-2">
          {mapping.auto_post && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Auto-Post
            </Badge>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? "Cancel" : "Edit"}
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      {/* Account Display (when not editing) */}
      {!isEditing && (
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="rounded border p-3 bg-muted/30">
            <div className="text-muted-foreground mb-1">Debit Account</div>
            <div className="font-medium">
              {debitAccount 
                ? `${debitAccount.account_code} - ${debitAccount.account_name}`
                : <span className="text-destructive">Not configured</span>
              }
            </div>
          </div>
          <div className="rounded border p-3 bg-muted/30">
            <div className="text-muted-foreground mb-1">Credit Account</div>
            <div className="font-medium">
              {creditAccount 
                ? `${creditAccount.account_code} - ${creditAccount.account_name}`
                : <span className="text-destructive">Not configured</span>
              }
            </div>
          </div>
        </div>
      )}

      {/* Edit Form */}
      {isEditing && (
        <div className="space-y-4 pt-2 border-t">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Debit Account</Label>
              <Select 
                value={localMapping.debit_account_id || ""} 
                onValueChange={(val) => setLocalMapping(prev => ({ ...prev, debit_account_id: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account..." />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.account_code} - {acc.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Credit Account</Label>
              <Select 
                value={localMapping.credit_account_id || ""} 
                onValueChange={(val) => setLocalMapping(prev => ({ ...prev, credit_account_id: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account..." />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.account_code} - {acc.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description Template</Label>
            <Textarea 
              value={localMapping.description_template || ""}
              onChange={(e) => setLocalMapping(prev => ({ ...prev, description_template: e.target.value }))}
              placeholder="e.g., School Bus Fee - {student_name}"
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              Use {"{field_name}"} to include dynamic values from the source record
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch 
                checked={localMapping.auto_post} 
                onCheckedChange={(checked) => setLocalMapping(prev => ({ ...prev, auto_post: checked }))}
              />
              <Label>Auto-Post to GL</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch 
                checked={localMapping.requires_approval} 
                onCheckedChange={(checked) => setLocalMapping(prev => ({ ...prev, requires_approval: checked }))}
              />
              <Label>Require Approval</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch 
                checked={localMapping.is_active} 
                onCheckedChange={(checked) => setLocalMapping(prev => ({ ...prev, is_active: checked }))}
              />
              <Label>Active</Label>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isUpdating}>
              {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// Pending Postings Component
const PendingPostingsCard = ({ companyId }: { companyId: string }) => {
  const queryClient = useQueryClient();

  const { data: pendingPostings, isLoading } = useQuery({
    queryKey: ["pending-gl-postings", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pending_gl_postings")
        .select(`
          *,
          debit_account:chart_of_accounts!debit_account_id(account_code, account_name),
          credit_account:chart_of_accounts!credit_account_id(account_code, account_name)
        `)
        .eq("company_id", companyId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const postMutation = useMutation({
    mutationFn: async (pendingId: string) => {
      const { data, error } = await supabase.rpc("post_pending_gl_entry", {
        p_pending_id: pendingId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-gl-postings"] });
      queryClient.invalidateQueries({ queryKey: ["pending-gl-postings-count"] });
      queryClient.invalidateQueries({ queryKey: ["journal-entries"] });
      toast.success("Posted to GL successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to post: ${error.message}`);
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!pendingPostings || pendingPostings.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Pending GL Postings
        </CardTitle>
        <CardDescription>
          Review and post transactions to the General Ledger
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {pendingPostings.map((pending: any) => (
            <div key={pending.id} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="space-y-1">
                <div className="font-medium">{pending.description}</div>
                <div className="text-sm text-muted-foreground">
                  {new Date(pending.transaction_date).toLocaleDateString()} • 
                  {pending.source_table} • 
                  LKR {pending.amount?.toLocaleString()}
                </div>
                <div className="text-xs text-muted-foreground">
                  Dr: {pending.debit_account?.account_code} - {pending.debit_account?.account_name} | 
                  Cr: {pending.credit_account?.account_code} - {pending.credit_account?.account_name}
                </div>
              </div>
              <Button 
                size="sm" 
                onClick={() => postMutation.mutate(pending.id)}
                disabled={postMutation.isPending}
              >
                {postMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Post to GL
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ModuleIntegrationView;
