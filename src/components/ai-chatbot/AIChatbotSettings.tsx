import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Bot, Key, Plus, Trash2, Save, MessageSquare, BarChart3 } from 'lucide-react';

interface KnowledgeEntry {
  id: string;
  category: string;
  question_en: string;
  question_si: string;
  question_ta: string;
  answer_en: string;
  answer_si: string;
  answer_ta: string;
  tags: string[];
  is_active: boolean;
}

export const AIChatbotSettings: React.FC = () => {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState('');
  const [chatbotEnabled, setChatbotEnabled] = useState(true);
  const [knowledgeEntries, setKnowledgeEntries] = useState<KnowledgeEntry[]>([]);
  const [chatStats, setChatStats] = useState({ totalSessions: 0, totalMessages: 0, todaySessions: 0 });
  const [saving, setSaving] = useState(false);
  const [newEntry, setNewEntry] = useState({
    category: 'general',
    question_en: '',
    question_si: '',
    question_ta: '',
    answer_en: '',
    answer_si: '',
    answer_ta: '',
    tags: '',
  });

  useEffect(() => {
    loadSettings();
    loadKnowledge();
    loadStats();
  }, []);

  const loadSettings = async () => {
    const { data } = await (supabase as any)
      .from('inquiry_hub_settings')
      .select('setting_key, setting_value')
      .in('setting_key', ['gemini_api_key', 'chatbot_enabled']);

    if (data) {
      for (const row of data) {
        if (row.setting_key === 'gemini_api_key') {
          setApiKey(row.setting_value?.api_key || '');
        }
        if (row.setting_key === 'chatbot_enabled') {
          setChatbotEnabled(row.setting_value?.enabled !== false);
        }
      }
    }
  };

  const loadKnowledge = async () => {
    const { data } = await (supabase as any)
      .from('ai_chatbot_knowledge')
      .select('*')
      .order('sort_order', { ascending: true });
    if (data) setKnowledgeEntries(data);
  };

  const loadStats = async () => {
    try {
      const { count: totalSessions } = await (supabase as any)
        .from('ai_chat_sessions')
        .select('*', { count: 'exact', head: true });

      const { count: totalMessages } = await (supabase as any)
        .from('ai_chat_messages')
        .select('*', { count: 'exact', head: true });

      const today = new Date().toISOString().split('T')[0];
      const { count: todaySessions } = await (supabase as any)
        .from('ai_chat_sessions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today);

      setChatStats({
        totalSessions: totalSessions || 0,
        totalMessages: totalMessages || 0,
        todaySessions: todaySessions || 0,
      });
    } catch { /* stats not critical */ }
  };

  const saveApiKey = async () => {
    setSaving(true);
    try {
      await (supabase as any)
        .from('inquiry_hub_settings')
        .upsert({
          setting_key: 'gemini_api_key',
          setting_value: { api_key: apiKey },
          updated_at: new Date().toISOString(),
        }, { onConflict: 'setting_key' });

      toast({ title: 'Saved', description: 'Gemini API key saved successfully' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleChatbot = async (enabled: boolean) => {
    setChatbotEnabled(enabled);
    await (supabase as any)
      .from('inquiry_hub_settings')
      .upsert({
        setting_key: 'chatbot_enabled',
        setting_value: { enabled },
        updated_at: new Date().toISOString(),
      }, { onConflict: 'setting_key' });

    toast({
      title: enabled ? 'Chatbot Enabled' : 'Chatbot Disabled',
      description: enabled ? 'AI chatbot is now active' : 'AI chatbot has been disabled',
    });
  };

  const addKnowledgeEntry = async () => {
    if (!newEntry.answer_en.trim()) {
      toast({ title: 'Error', description: 'English answer is required', variant: 'destructive' });
      return;
    }

    const { error } = await (supabase as any)
      .from('ai_chatbot_knowledge')
      .insert({
        category: newEntry.category,
        question_en: newEntry.question_en || null,
        question_si: newEntry.question_si || null,
        question_ta: newEntry.question_ta || null,
        answer_en: newEntry.answer_en,
        answer_si: newEntry.answer_si || null,
        answer_ta: newEntry.answer_ta || null,
        tags: newEntry.tags ? newEntry.tags.split(',').map(t => t.trim()) : [],
        is_active: true,
      });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Added', description: 'Knowledge entry added successfully' });
    setNewEntry({
      category: 'general',
      question_en: '', question_si: '', question_ta: '',
      answer_en: '', answer_si: '', answer_ta: '',
      tags: '',
    });
    loadKnowledge();
  };

  const deleteKnowledgeEntry = async (id: string) => {
    await (supabase as any).from('ai_chatbot_knowledge').delete().eq('id', id);
    toast({ title: 'Deleted', description: 'Knowledge entry removed' });
    loadKnowledge();
  };

  const toggleKnowledgeActive = async (id: string, active: boolean) => {
    await (supabase as any).from('ai_chatbot_knowledge').update({ is_active: active }).eq('id', id);
    loadKnowledge();
  };

  const categoryColors: Record<string, string> = {
    special_hire: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    school_bus: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    yutong: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    sinotruck: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    light_vehicle: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    general: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
    company: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <MessageSquare className="h-6 w-6 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{chatStats.totalSessions}</p>
            <p className="text-xs text-muted-foreground">Total Sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <BarChart3 className="h-6 w-6 mx-auto mb-1 text-primary" />
            <p className="text-2xl font-bold">{chatStats.totalMessages}</p>
            <p className="text-xs text-muted-foreground">Total Messages</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <Bot className="h-6 w-6 mx-auto mb-1 text-green-500" />
            <p className="text-2xl font-bold">{chatStats.todaySessions}</p>
            <p className="text-xs text-muted-foreground">Today's Sessions</p>
          </CardContent>
        </Card>
      </div>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Chatbot Configuration
          </CardTitle>
          <CardDescription>
            Configure the multilingual AI chatbot (Sinhala · Tamil · English)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Enable Chatbot</Label>
              <p className="text-xs text-muted-foreground">Show the AI chat widget on all pages</p>
            </div>
            <Switch checked={chatbotEnabled} onCheckedChange={toggleChatbot} />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Key className="h-3.5 w-3.5" />
              Gemini API Key
            </Label>
            <div className="flex gap-2">
              <Input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="Enter your Gemini API key from Google AI Studio"
                className="flex-1"
              />
              <Button onClick={saveApiKey} disabled={saving} size="sm">
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Get your free API key from{' '}
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer"
                className="text-primary underline">Google AI Studio</a>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Knowledge Base */}
      <Card>
        <CardHeader>
          <CardTitle>Knowledge Base</CardTitle>
          <CardDescription>Add custom Q&A entries in all three languages</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new entry */}
          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <h4 className="font-medium text-sm flex items-center gap-1">
              <Plus className="h-4 w-4" /> Add New Entry
            </h4>
            <Select value={newEntry.category} onValueChange={v => setNewEntry(p => ({ ...p, category: v }))}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="special_hire">Special Hire</SelectItem>
                <SelectItem value="school_bus">School Bus</SelectItem>
                <SelectItem value="yutong">Yutong</SelectItem>
                <SelectItem value="sinotruck">Sinotruck</SelectItem>
                <SelectItem value="light_vehicle">Light Vehicle</SelectItem>
                <SelectItem value="company">Company</SelectItem>
              </SelectContent>
            </Select>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Question (English)</Label>
                <Input value={newEntry.question_en} onChange={e => setNewEntry(p => ({ ...p, question_en: e.target.value }))} placeholder="English question" />
              </div>
              <div>
                <Label className="text-xs">Question (සිංහල)</Label>
                <Input value={newEntry.question_si} onChange={e => setNewEntry(p => ({ ...p, question_si: e.target.value }))} placeholder="සිංහල ප්‍රශ්නය" />
              </div>
              <div>
                <Label className="text-xs">Question (தமிழ்)</Label>
                <Input value={newEntry.question_ta} onChange={e => setNewEntry(p => ({ ...p, question_ta: e.target.value }))} placeholder="தமிழ் கேள்வி" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Answer (English) *</Label>
                <Textarea value={newEntry.answer_en} onChange={e => setNewEntry(p => ({ ...p, answer_en: e.target.value }))} placeholder="English answer" rows={3} />
              </div>
              <div>
                <Label className="text-xs">Answer (සිංහල)</Label>
                <Textarea value={newEntry.answer_si} onChange={e => setNewEntry(p => ({ ...p, answer_si: e.target.value }))} placeholder="සිංහල පිළිතුර" rows={3} />
              </div>
              <div>
                <Label className="text-xs">Answer (தமிழ்)</Label>
                <Textarea value={newEntry.answer_ta} onChange={e => setNewEntry(p => ({ ...p, answer_ta: e.target.value }))} placeholder="தமிழ் பதில்" rows={3} />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Label className="text-xs">Tags (comma-separated)</Label>
                <Input value={newEntry.tags} onChange={e => setNewEntry(p => ({ ...p, tags: e.target.value }))} placeholder="booking, price, hire" />
              </div>
              <Button onClick={addKnowledgeEntry} className="mt-5" size="sm">
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
          </div>

          {/* Existing entries */}
          <div className="space-y-2">
            {knowledgeEntries.map(entry => (
              <div key={entry.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/30">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={`text-[10px] ${categoryColors[entry.category] || ''}`}>
                      {entry.category.replace('_', ' ')}
                    </Badge>
                    {!entry.is_active && <Badge variant="outline" className="text-[10px]">Disabled</Badge>}
                  </div>
                  <p className="text-sm font-medium truncate">{entry.question_en || entry.answer_en.slice(0, 80)}</p>
                  <p className="text-xs text-muted-foreground truncate">{entry.answer_en.slice(0, 120)}...</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Switch
                    checked={entry.is_active}
                    onCheckedChange={v => toggleKnowledgeActive(entry.id, v)}
                  />
                  <Button variant="ghost" size="icon" onClick={() => deleteKnowledgeEntry(entry.id)} className="h-8 w-8">
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            {knowledgeEntries.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">No knowledge entries yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
