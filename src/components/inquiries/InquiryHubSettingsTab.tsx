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
import { Copy, RefreshCw, ExternalLink, Play, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Production Supabase URL
const SUPABASE_URL = "https://wwjpdszkmtnzshbulkon.supabase.co";

export const InquiryHubSettingsTab = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [generatingKey, setGeneratingKey] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

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

  // Use the production Supabase URL for webhook
  const webhookUrl = `${SUPABASE_URL}/functions/v1/receive-vehicle-inquiry`;
  const apiKey = settings?.webhook_secret?.api_key || "";

  const testWebhook = async () => {
    if (!apiKey) {
      toast({ 
        title: "No API key configured", 
        description: "Please generate an API key first",
        variant: "destructive" 
      });
      return;
    }

    setTestingWebhook(true);
    setTestResult(null);

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({
          source: "test",
          product_type: "yutong",
          customer_name: "Test Customer (Webhook Test)",
          customer_phone: "+94771234567",
          customer_email: "test@example.com",
          inquiry_message: "This is a test inquiry from the webhook test button",
          interested_model: "Test Model",
          quantity: 1,
        }),
      });

      if (response.ok) {
        setTestResult('success');
        toast({ 
          title: "Webhook test successful!", 
          description: "Test inquiry was created successfully. Check the Inquiries list.",
        });
        queryClient.invalidateQueries({ queryKey: ["vehicle-inquiries"] });
      } else {
        const errorData = await response.json();
        setTestResult('error');
        toast({ 
          title: "Webhook test failed", 
          description: errorData.error || "Unknown error occurred",
          variant: "destructive" 
        });
      }
    } catch (error) {
      setTestResult('error');
      toast({ 
        title: "Webhook test failed", 
        description: "Network error - check console for details",
        variant: "destructive" 
      });
      console.error("Webhook test error:", error);
    } finally {
      setTestingWebhook(false);
    }
  };

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

          {/* Test Webhook Button */}
          <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
            <div className="flex-1">
              <p className="text-sm font-medium">Test Webhook Connection</p>
              <p className="text-xs text-muted-foreground">
                Send a test inquiry to verify your webhook is working correctly
              </p>
            </div>
            <div className="flex items-center gap-2">
              {testResult === 'success' && (
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Success
                </Badge>
              )}
              {testResult === 'error' && (
                <Badge variant="destructive">
                  <XCircle className="h-3 w-3 mr-1" />
                  Failed
                </Badge>
              )}
              <Button
                onClick={testWebhook}
                disabled={testingWebhook || !apiKey}
                variant="secondary"
              >
                <Play className="h-4 w-4 mr-2" />
                {testingWebhook ? "Testing..." : "Test Webhook"}
              </Button>
            </div>
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
              value={settings?.default_assignees?.yutong || "none"}
              onValueChange={(value) =>
                updateSettingMutation.mutate({
                  key: "default_assignees",
                  value: {
                    ...settings?.default_assignees,
                    yutong: value === "none" ? null : value,
                  },
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="No auto-assignment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No auto-assignment</SelectItem>
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
              value={settings?.default_assignees?.sinotruck || "none"}
              onValueChange={(value) =>
                updateSettingMutation.mutate({
                  key: "default_assignees",
                  value: {
                    ...settings?.default_assignees,
                    sinotruck: value === "none" ? null : value,
                  },
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="No auto-assignment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No auto-assignment</SelectItem>
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