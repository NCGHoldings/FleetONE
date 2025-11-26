import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Copy, RefreshCw, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const InquiryHubSettingsTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [generatingKey, setGeneratingKey] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["inquiry-hub-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("inquiry_hub_settings")
        .select("*");
      
      const settingsMap: Record<string, any> = {};
      data?.forEach(s => {
        settingsMap[s.setting_key] = s.setting_value;
      });
      return settingsMap;
    },
  });

  const { data: users } = useQuery({
    queryKey: ["staff-users-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .eq("status", "active")
        .order("first_name");
      return data || [];
    },
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { error } = await supabase
        .from("inquiry_hub_settings")
        .update({ setting_value: value })
        .eq("setting_key", key);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Settings updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["inquiry-hub-settings"] });
    },
  });

  const generateApiKey = () => {
    setGeneratingKey(true);
    const newKey = `vih_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    updateSettingMutation.mutate(
      { key: "webhook_secret", value: { api_key: newKey } },
      {
        onSettled: () => setGeneratingKey(false),
      }
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const webhookUrl = `${window.location.origin.replace("localhost:8080", "127.0.0.1:54321")}/functions/v1/receive-vehicle-inquiry`;
  const apiKey = settings?.webhook_secret?.api_key || "";

  if (isLoading) {
    return <div className="text-center py-8">Loading settings...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Webhook Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Webhook Configuration</CardTitle>
          <CardDescription>
            Configure the API endpoint for receiving inquiries from your external website
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Webhook URL</Label>
            <div className="flex gap-2">
              <Input value={webhookUrl} readOnly className="font-mono text-sm" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(webhookUrl)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Use this URL as the endpoint in your external website
            </p>
          </div>

          <div className="space-y-2">
            <Label>API Key</Label>
            <div className="flex gap-2">
              <Input
                value={apiKey || "No API key generated"}
                readOnly
                type="password"
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => apiKey && copyToClipboard(apiKey)}
                disabled={!apiKey}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={generateApiKey}
                disabled={generatingKey}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {apiKey ? "Regenerate" : "Generate"}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Include this API key in the <code>x-api-key</code> header when making requests
            </p>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-semibold mb-2">Integration Example:</p>
            <pre className="text-xs overflow-x-auto">
{`fetch("${webhookUrl}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "${apiKey || "YOUR_API_KEY"}"
  },
  body: JSON.stringify({
    source: "website",
    product_type: "yutong",
    customer_name: "John Doe",
    customer_phone: "+94771234567",
    customer_email: "john@example.com",
    inquiry_message: "Interested in bus models",
    interested_model: "ZK6119H",
    quantity: 2
  })
})`}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* External Links */}
      <Card>
        <CardHeader>
          <CardTitle>External Links</CardTitle>
          <CardDescription>Configure links to external resources</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>External Website URL</Label>
            <div className="flex gap-2">
              <Input
                value={settings?.external_website_url?.url || ""}
                onChange={(e) =>
                  updateSettingMutation.mutate({
                    key: "external_website_url",
                    value: { url: e.target.value },
                  })
                }
                placeholder="https://your-website.com"
              />
              {settings?.external_website_url?.url && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(settings.external_website_url.url, "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>WhatsApp Business Link</Label>
            <div className="flex gap-2">
              <Input
                value={settings?.whatsapp_link?.url || ""}
                onChange={(e) =>
                  updateSettingMutation.mutate({
                    key: "whatsapp_link",
                    value: { url: e.target.value },
                  })
                }
                placeholder="https://wa.me/94771234567"
              />
              {settings?.whatsapp_link?.url && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(settings.whatsapp_link.url, "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auto-Assignment Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Auto-Assignment Rules</CardTitle>
          <CardDescription>
            Automatically assign inquiries to specific team members
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Default Assignee for Yutong Inquiries</Label>
            <Select
              value={settings?.default_assignees?.yutong || ""}
              onValueChange={(value) =>
                updateSettingMutation.mutate({
                  key: "default_assignees",
                  value: {
                    ...settings?.default_assignees,
                    yutong: value || null,
                  },
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="No auto-assignment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No auto-assignment</SelectItem>
                {users?.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.first_name} {user.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Default Assignee for Sinotruck Inquiries</Label>
            <Select
              value={settings?.default_assignees?.sinotruck || ""}
              onValueChange={(value) =>
                updateSettingMutation.mutate({
                  key: "default_assignees",
                  value: {
                    ...settings?.default_assignees,
                    sinotruck: value || null,
                  },
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="No auto-assignment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No auto-assignment</SelectItem>
                {users?.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.first_name} {user.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};