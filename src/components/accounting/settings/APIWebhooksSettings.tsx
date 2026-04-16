import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Key, Webhook, Plus, Copy, Eye, EyeOff, Trash2, RefreshCw, Send, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const WEBHOOK_EVENTS = [
  { id: "invoice.created", label: "Invoice Created" },
  { id: "invoice.paid", label: "Invoice Paid" },
  { id: "invoice.overdue", label: "Invoice Overdue" },
  { id: "payment.received", label: "Payment Received" },
  { id: "payment.sent", label: "Payment Sent" },
  { id: "customer.created", label: "Customer Created" },
  { id: "vendor.created", label: "Vendor Created" },
  { id: "po.approved", label: "PO Approved" },
];

export const APIWebhooksSettings = () => {
  const { selectedCompany } = useCompany();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("api-keys");
  const [showNewKey, setShowNewKey] = useState<string | null>(null);
  
  // API Key form state
  const [keyForm, setKeyForm] = useState({ name: "", description: "" });
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);
  
  // Webhook form state
  const [webhookForm, setWebhookForm] = useState({
    name: "",
    url: "",
    events: [] as string[],
  });
  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false);

  // Fetch API keys
  const { data: apiKeys, isLoading: keysLoading } = useQuery({
    queryKey: ["api_keys", selectedCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .eq("company_id", selectedCompany?.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompany?.id,
  });

  // Fetch webhooks
  const { data: webhooks, isLoading: webhooksLoading } = useQuery({
    queryKey: ["webhook_endpoints", selectedCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_endpoints")
        .select("*")
        .eq("company_id", selectedCompany?.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCompany?.id,
  });

  // Create API key mutation
  const createApiKey = useMutation({
    mutationFn: async () => {
      if (!selectedCompany?.id) throw new Error("No company selected");
      
      // Generate a secure random key
      const keyBytes = new Uint8Array(32);
      crypto.getRandomValues(keyBytes);
      const fullKey = Array.from(keyBytes, (b) => b.toString(16).padStart(2, "0")).join("");
      const keyPrefix = fullKey.substring(0, 8);
      
      // Hash the key for storage (in production, use proper hashing)
      const keyHash = fullKey; // In production: await hashKey(fullKey)
      
      const { error } = await supabase.from("api_keys").insert({
        name: keyForm.name,
        description: keyForm.description || null,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        company_id: selectedCompany.id,
        is_active: true,
      });
      
      if (error) throw error;
      return fullKey;
    },
    onSuccess: (fullKey) => {
      queryClient.invalidateQueries({ queryKey: ["api_keys"] });
      setShowNewKey(fullKey);
      setKeyForm({ name: "", description: "" });
      toast.success("API key created successfully");
    },
    onError: () => {
      toast.error("Failed to create API key");
    },
  });

  // Revoke API key mutation
  const revokeApiKey = useMutation({
    mutationFn: async (keyId: string) => {
      const { error } = await supabase
        .from("api_keys")
        .update({ is_active: false, revoked_at: new Date().toISOString() })
        .eq("id", keyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api_keys"] });
      toast.success("API key revoked");
    },
    onError: () => {
      toast.error("Failed to revoke API key");
    },
  });

  // Create webhook mutation
  const createWebhook = useMutation({
    mutationFn: async () => {
      if (!selectedCompany?.id) throw new Error("No company selected");
      if (webhookForm.events.length === 0) throw new Error("Select at least one event");
      
      // Generate webhook secret
      const secretBytes = new Uint8Array(32);
      crypto.getRandomValues(secretBytes);
      const secret = Array.from(secretBytes, (b) => b.toString(16).padStart(2, "0")).join("");
      
      const { error } = await supabase.from("webhook_endpoints").insert({
        name: webhookForm.name,
        url: webhookForm.url,
        events: webhookForm.events,
        secret,
        company_id: selectedCompany.id,
        is_active: true,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook_endpoints"] });
      setWebhookForm({ name: "", url: "", events: [] });
      setWebhookDialogOpen(false);
      toast.success("Webhook endpoint created");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create webhook");
    },
  });

  // Delete webhook mutation
  const deleteWebhook = useMutation({
    mutationFn: async (webhookId: string) => {
      const { error } = await supabase.from("webhook_endpoints").delete().eq("id", webhookId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook_endpoints"] });
      toast.success("Webhook deleted");
    },
    onError: () => {
      toast.error("Failed to delete webhook");
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const toggleEvent = (eventId: string) => {
    setWebhookForm((prev) => ({
      ...prev,
      events: prev.events.includes(eventId)
        ? prev.events.filter((e) => e !== eventId)
        : [...prev.events, eventId],
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">API & Webhooks</h2>
        <p className="text-muted-foreground">Manage API keys and webhook endpoints for integrations</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="api-keys" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            Webhooks
          </TabsTrigger>
        </TabsList>

        {/* API Keys Tab */}
        <TabsContent value="api-keys" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>Generate API keys for external integrations</CardDescription>
              </div>
              <Dialog open={keyDialogOpen} onOpenChange={setKeyDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Generate Key
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Generate New API Key</DialogTitle>
                  </DialogHeader>
                  {showNewKey ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200">
                        <p className="text-sm text-green-700 dark:text-green-400 mb-2 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          Save this key now. You won't be able to see it again!
                        </p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 p-2 bg-background rounded text-xs break-all">
                            {showNewKey}
                          </code>
                          <Button variant="outline" size="sm" onClick={() => copyToClipboard(showNewKey)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <Button className="w-full" onClick={() => { setShowNewKey(null); setKeyDialogOpen(false); }}>
                        Done
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Key Name *</Label>
                        <Input
                          value={keyForm.name}
                          onChange={(e) => setKeyForm({ ...keyForm, name: e.target.value })}
                          placeholder="e.g., Production API Key"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Input
                          value={keyForm.description}
                          onChange={(e) => setKeyForm({ ...keyForm, description: e.target.value })}
                          placeholder="Optional description"
                        />
                      </div>
                      <Button
                        className="w-full"
                        onClick={() => createApiKey.mutate()}
                        disabled={!keyForm.name || createApiKey.isPending}
                      >
                        {createApiKey.isPending ? "Generating..." : "Generate API Key"}
                      </Button>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {keysLoading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : apiKeys && apiKeys.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Key Prefix</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Last Used</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeys.map((key) => (
                      <TableRow key={key.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{key.name}</p>
                            {key.description && (
                              <p className="text-xs text-muted-foreground">{key.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs">{key.key_prefix}...</code>
                        </TableCell>
                        <TableCell>{format(new Date(key.created_at), "dd MMM yyyy")}</TableCell>
                        <TableCell>
                          {key.last_used_at
                            ? format(new Date(key.last_used_at), "dd MMM yyyy")
                            : "Never"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={key.is_active ? "default" : "destructive"}>
                            {key.is_active ? "Active" : "Revoked"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {key.is_active && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => revokeApiKey.mutate(key.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No API keys created yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Webhook Endpoints</CardTitle>
                <CardDescription>Configure webhooks to receive real-time event notifications</CardDescription>
              </div>
              <Dialog open={webhookDialogOpen} onOpenChange={setWebhookDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Webhook
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Webhook Endpoint</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Name *</Label>
                      <Input
                        value={webhookForm.name}
                        onChange={(e) => setWebhookForm({ ...webhookForm, name: e.target.value })}
                        placeholder="e.g., ERP Integration"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>URL *</Label>
                      <Input
                        value={webhookForm.url}
                        onChange={(e) => setWebhookForm({ ...webhookForm, url: e.target.value })}
                        placeholder="https://your-app.com/webhook"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Events *</Label>
                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
                        {WEBHOOK_EVENTS.map((event) => (
                          <label
                            key={event.id}
                            className="flex items-center gap-2 cursor-pointer p-2 hover:bg-muted rounded"
                          >
                            <Checkbox
                              checked={webhookForm.events.includes(event.id)}
                              onCheckedChange={() => toggleEvent(event.id)}
                            />
                            <span className="text-sm">{event.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => createWebhook.mutate()}
                      disabled={!webhookForm.name || !webhookForm.url || webhookForm.events.length === 0 || createWebhook.isPending}
                    >
                      {createWebhook.isPending ? "Creating..." : "Create Webhook"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {webhooksLoading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : webhooks && webhooks.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>Events</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {webhooks.map((webhook) => (
                      <TableRow key={webhook.id}>
                        <TableCell className="font-medium">{webhook.name}</TableCell>
                        <TableCell>
                          <code className="text-xs truncate max-w-[200px] block">{webhook.url}</code>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{webhook.events?.length || 0} events</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={webhook.is_active ? "default" : "secondary"}>
                            {webhook.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteWebhook.mutate(webhook.id)}
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
                  <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No webhooks configured yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
