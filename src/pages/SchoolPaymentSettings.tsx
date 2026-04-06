import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, X, Save, Settings, TestTube } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

export default function SchoolPaymentSettings() {
  const { branchId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [newPrefix, setNewPrefix] = useState("");
  const [testDescription, setTestDescription] = useState("");
  const [testResults, setTestResults] = useState<any>(null);

  useEffect(() => {
    fetchSettings();
  }, [branchId]);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('school_payment_import_settings')
      .select('*')
      .eq('branch_id', branchId!)
      .maybeSingle();

    if (error) {
      console.error('Error fetching settings:', error);
      return;
    }

    if (!data) {
      // Create default settings
      const { data: newSettings, error: createError } = await supabase
        .from('school_payment_import_settings')
        .insert([{
          branch_id: branchId,
          admission_prefixes: ['N', 'LNU'],
          custom_patterns: [],
          auto_split_siblings: true,
          default_payment_method: 'Bank Transfer',
          min_confidence_threshold: 80,
          auto_approve_high_confidence: true,
          enable_pattern_learning: true,
        }])
        .select()
        .single();

      if (!createError && newSettings) {
        setSettings(newSettings);
      }
    } else {
      setSettings(data);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('school_payment_import_settings')
      .update(settings)
      .eq('id', settings.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Settings Saved",
        description: "Import settings updated successfully",
      });
    }
    setLoading(false);
  };

  const handleAddPrefix = () => {
    if (newPrefix.trim() && !settings.admission_prefixes.includes(newPrefix.toUpperCase())) {
      setSettings({
        ...settings,
        admission_prefixes: [...settings.admission_prefixes, newPrefix.toUpperCase()],
      });
      setNewPrefix("");
    }
  };

  const handleRemovePrefix = (prefix: string) => {
    setSettings({
      ...settings,
      admission_prefixes: settings.admission_prefixes.filter((p: string) => p !== prefix),
    });
  };

  const handleTestPattern = () => {
    // Simple test simulation
    const prefixes = settings.admission_prefixes;
    const matches: string[] = [];
    
    prefixes.forEach((prefix: string) => {
      const regex = new RegExp(`${prefix}\\s*[-_]?\\s*(\\d{4,6})`, 'gi');
      const found = testDescription.match(regex);
      if (found) matches.push(...found);
    });

    setTestResults({
      found: matches.length > 0,
      matches: matches,
      confidence: matches.length > 0 ? 90 : 0,
    });
  };

  if (!settings) {
    return <div className="container mx-auto p-6">Loading settings...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/school-bus/branch/${branchId}/payments`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Payment Import Settings
          </h1>
          <p className="text-muted-foreground">Configure automatic payment matching rules</p>
        </div>
        <Button onClick={handleSaveSettings} disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          Save Settings
        </Button>
      </div>

      <Tabs defaultValue="prefixes" className="space-y-6">
        <TabsList>
          <TabsTrigger value="prefixes">Admission Prefixes</TabsTrigger>
          <TabsTrigger value="patterns">Custom Patterns</TabsTrigger>
          <TabsTrigger value="import">Import Settings</TabsTrigger>
          <TabsTrigger value="test">Test Patterns</TabsTrigger>
        </TabsList>

        <TabsContent value="prefixes">
          <Card>
            <CardHeader>
              <CardTitle>Admission Number Prefixes</CardTitle>
              <CardDescription>
                Configure the prefixes used in your student admission numbers (e.g., N, LNU)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                {settings.admission_prefixes.map((prefix: string) => (
                  <Badge key={prefix} variant="secondary" className="text-base py-2 px-4">
                    {prefix}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-2"
                      onClick={() => handleRemovePrefix(prefix)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>

              <Separator />

              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="newPrefix">Add New Prefix</Label>
                  <Input
                    id="newPrefix"
                    value={newPrefix}
                    onChange={(e) => setNewPrefix(e.target.value.toUpperCase())}
                    placeholder="e.g., N, LNU, LLKO"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddPrefix()}
                  />
                </div>
                <Button onClick={handleAddPrefix} className="mt-6">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Prefix
                </Button>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <h4 className="font-semibold text-blue-900 mb-2">Pattern Examples:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• "VSRTFR-N16434" → Matches: N16434</li>
                  <li>• "N 15085" → Matches: N15085</li>
                  <li>• "LNU014502" → Matches: LNU014502</li>
                  <li>• "Warren Ralapanawa grade2G N14919" → Matches: N14919</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns">
          <Card>
            <CardHeader>
              <CardTitle>Custom Regex Patterns</CardTitle>
              <CardDescription>
                Advanced: Define custom regular expressions for complex matching scenarios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Custom pattern support coming soon. The system currently uses intelligent prefix-based matching.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import">
          <Card>
            <CardHeader>
              <CardTitle>Import Behavior Settings</CardTitle>
              <CardDescription>Configure how the system processes and matches payments</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Auto-Split Sibling Payments</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically split payments when multiple admission numbers are detected
                  </p>
                </div>
                <Switch
                  checked={settings.auto_split_siblings}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, auto_split_siblings: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Auto-Approve High Confidence Matches</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically confirm matches with {settings.min_confidence_threshold}%+ confidence
                  </p>
                </div>
                <Switch
                  checked={settings.auto_approve_high_confidence}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, auto_approve_high_confidence: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Enable Pattern Learning</Label>
                  <p className="text-sm text-muted-foreground">
                    Learn from manual matches to improve future automatic matching
                  </p>
                </div>
                <Switch
                  checked={settings.enable_pattern_learning}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, enable_pattern_learning: checked })
                  }
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="threshold">Minimum Confidence Threshold (%)</Label>
                <Input
                  id="threshold"
                  type="number"
                  min="0"
                  max="100"
                  value={settings.min_confidence_threshold}
                  onChange={(e) =>
                    setSettings({ ...settings, min_confidence_threshold: parseInt(e.target.value) })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Matches below this threshold will require manual review
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Default Payment Method</Label>
                <Input
                  id="paymentMethod"
                  value={settings.default_payment_method}
                  onChange={(e) =>
                    setSettings({ ...settings, default_payment_method: e.target.value })
                  }
                  placeholder="e.g., Bank Transfer"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test">
          <Card>
            <CardHeader>
              <CardTitle>Test Pattern Matching</CardTitle>
              <CardDescription>
                Test your configured patterns against sample descriptions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="testDesc">Test Description</Label>
                <Textarea
                  id="testDesc"
                  value={testDescription}
                  onChange={(e) => setTestDescription(e.target.value)}
                  placeholder="Paste a sample bank statement description here..."
                  rows={3}
                />
              </div>

              <Button onClick={handleTestPattern}>
                <TestTube className="h-4 w-4 mr-2" />
                Test Pattern
              </Button>

              {testResults && (
                <div className={`border rounded-lg p-4 ${testResults.found ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <h4 className="font-semibold mb-2">
                    {testResults.found ? '✅ Match Found!' : '❌ No Match'}
                  </h4>
                  {testResults.matches.length > 0 && (
                    <div>
                      <p className="text-sm font-medium">Extracted Admission Numbers:</p>
                      <div className="flex gap-2 mt-2">
                        {testResults.matches.map((match: string, idx: number) => (
                          <Badge key={idx} variant="default">{match}</Badge>
                        ))}
                      </div>
                      <p className="text-sm mt-2">Confidence: {testResults.confidence}%</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
