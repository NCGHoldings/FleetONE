import React, { useState, useRef, useCallback } from "react";
import { useSmartDiary } from "@/hooks/useSmartDiary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bookmark, BookmarkCheck, Calendar, CheckCircle2, Circle, MessageSquare, Plus, Save, Sparkles, Trash2, ListTodo, Bold, Italic, Underline, List, ListOrdered, CheckSquare, Heading1, Heading2, Quote, Minus, Search } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PersonalDiary() {
  const { entries, tasks, isLoading, createEntry, updateEntry, deleteEntry, toggleTaskStatus, deleteTask, createTask } = useSmartDiary();

  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showOnlyBookmarked, setShowOnlyBookmarked] = useState(false);
  const [currentTitle, setCurrentTitle] = useState("");
  const [currentContent, setCurrentContent] = useState("");
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [newTaskText, setNewTaskText] = useState("");
  const [activeTab, setActiveTab] = useState("write");
  const editorRef = useRef<HTMLDivElement>(null);

  const filteredEntries = entries?.filter(e => {
    if (showOnlyBookmarked && !e.is_bookmarked) return false;
    if (searchQuery && !e.title.toLowerCase().includes(searchQuery.toLowerCase()) && !e.content?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const entryTasks = tasks?.filter(t => t.diary_entry_id === selectedEntryId) || [];
  const allTasks = tasks || [];

  const handleSelectEntry = (entry: any) => {
    setSelectedEntryId(entry.id);
    setCurrentTitle(entry.title);
    setCurrentContent(entry.content || "");
    setIsBookmarked(entry.is_bookmarked || false);
    setActiveTab("write");
    // Load content into contentEditable
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = entry.content || "";
      }
    }, 50);
  };

  const handleNewEntry = () => {
    setSelectedEntryId(null);
    setCurrentTitle("");
    setCurrentContent("");
    setIsBookmarked(false);
    setActiveTab("write");
    if (editorRef.current) editorRef.current.innerHTML = "";
  };

  const handleSave = () => {
    if (!currentTitle.trim()) {
      toast.error("Please enter a title for your entry");
      return;
    }
    const htmlContent = editorRef.current?.innerHTML || currentContent;
    if (selectedEntryId) {
      updateEntry.mutate({ id: selectedEntryId, title: currentTitle, content: htmlContent, is_bookmarked: isBookmarked });
    } else {
      createEntry.mutate({ title: currentTitle, content: htmlContent, is_bookmarked: isBookmarked }, {
        onSuccess: (newEntry) => setSelectedEntryId(newEntry.id)
      });
    }
  };

  // Rich text formatting using execCommand
  const execFormat = useCallback((command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    // Sync content
    if (editorRef.current) setCurrentContent(editorRef.current.innerHTML);
  }, []);

  const insertList = useCallback((type: 'bullet' | 'number') => {
    editorRef.current?.focus();
    document.execCommand(type === 'bullet' ? 'insertUnorderedList' : 'insertOrderedList', false);
    if (editorRef.current) setCurrentContent(editorRef.current.innerHTML);
  }, []);

  const insertChecklist = useCallback(() => {
    editorRef.current?.focus();
    const html = '<div style="display:flex;align-items:center;gap:6px;margin:4px 0"><input type="checkbox" style="width:16px;height:16px;accent-color:#3b82f6" /><span>New task item</span></div>';
    document.execCommand('insertHTML', false, html);
    if (editorRef.current) setCurrentContent(editorRef.current.innerHTML);
  }, []);

  const handleEditorInput = () => {
    if (editorRef.current) setCurrentContent(editorRef.current.innerHTML);
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') { e.preventDefault(); execFormat('bold'); }
      if (e.key === 'i') { e.preventDefault(); execFormat('italic'); }
      if (e.key === 'u') { e.preventDefault(); execFormat('underline'); }
      if (e.key === 's') { e.preventDefault(); handleSave(); }
    }
  };

  const callSmartAssistant = async (action: string, promptText?: string) => {
    if (!currentContent.trim() && !(editorRef.current?.textContent?.trim())) {
      toast.error("Please write some content first");
      return;
    }
    if (action === 'extract_tasks' && !selectedEntryId) {
      toast.error("Please save your entry first before extracting tasks");
      return;
    }
    setIsAiLoading(true);
    try {
      const plainText = editorRef.current?.textContent || currentContent;
      const { data, error } = await supabase.functions.invoke('smart-diary-assistant', {
        body: { action, content: plainText, prompt: promptText }
      });
      if (error) throw error;
      if (action === 'extract_tasks') {
        try {
          const rawText = data.result.replace(/```json/g, '').replace(/```/g, '').trim();
          const extractedTasks = JSON.parse(rawText);
          if (!Array.isArray(extractedTasks) || extractedTasks.length === 0) { toast.info("No actionable tasks found."); return; }
          const user = await supabase.auth.getUser();
          if (!user.data.user) throw new Error("Not authenticated");
          const tasksToInsert = extractedTasks.map((t: any) => ({
            user_id: user.data.user!.id, diary_entry_id: selectedEntryId,
            task_text: t.task_text, deadline: t.deadline || null, status: 'pending'
          }));
          const { error: insertError } = await supabase.from('user_diary_tasks').insert(tasksToInsert);
          if (insertError) throw insertError;
          toast.success(`Extracted ${extractedTasks.length} tasks!`);
          window.location.reload();
        } catch (e) { console.error(e); toast.error("Failed to parse AI response."); }
      } else {
        if (editorRef.current) {
          editorRef.current.innerHTML += `<br/><hr/><p style="color:#6366f1;font-weight:600">🤖 AI ${action.toUpperCase()}</p><p>${data.result}</p>`;
          setCurrentContent(editorRef.current.innerHTML);
        }
        toast.success("AI response added to your entry");
      }
    } catch (error) { console.error(error); toast.error("Smart Assistant failed. Please try again later."); }
    finally { setIsAiLoading(false); setAiPrompt(""); }
  };

  const handleManualTaskAdd = () => {
    if (!newTaskText.trim()) return;
    if (!selectedEntryId) { toast.error("Save your entry first"); return; }
    createTask.mutate({ diary_entry_id: selectedEntryId, task_text: newTaskText }, {
      onSuccess: () => setNewTaskText("")
    });
  };

  const pendingTasks = entryTasks.filter(t => t.status !== 'completed');
  const completedTasks = entryTasks.filter(t => t.status === 'completed');

  return (
    <div className="flex h-[calc(100vh-5rem)] gap-0 overflow-hidden">
      {/* === LEFT SIDEBAR - Entry List === */}
      <div className="w-72 flex flex-col bg-gradient-to-b from-slate-50 to-white border-r shrink-0">
        <div className="p-4 border-b bg-white/80 backdrop-blur-sm">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">📔 My Diary</h2>
            <Button onClick={handleNewEntry} size="sm" className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-md shadow-indigo-200 h-8 px-3">
              <Plus className="w-4 h-4 mr-1" /> New
            </Button>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search entries..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9 bg-slate-50 border-slate-200" />
          </div>
          <button
            className={`mt-2 w-full flex items-center gap-2 text-xs px-3 py-2 rounded-md transition-all ${showOnlyBookmarked ? 'bg-amber-100 text-amber-700 font-medium' : 'text-muted-foreground hover:bg-slate-100'}`}
            onClick={() => setShowOnlyBookmarked(!showOnlyBookmarked)}
          >
            {showOnlyBookmarked ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
            {showOnlyBookmarked ? "Showing Bookmarks" : "Show Bookmarks Only"}
          </button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {isLoading ? (
              <p className="text-sm text-muted-foreground p-4 text-center">Loading...</p>
            ) : filteredEntries?.length === 0 ? (
              <div className="text-center py-12 px-4">
                <p className="text-4xl mb-2">📝</p>
                <p className="text-sm text-muted-foreground">No entries yet</p>
                <p className="text-xs text-muted-foreground mt-1">Click "New" to start writing</p>
              </div>
            ) : (
              filteredEntries?.map(entry => (
                <button
                  key={entry.id}
                  className={`w-full text-left p-3 rounded-lg transition-all ${selectedEntryId === entry.id
                    ? 'bg-indigo-50 border border-indigo-200 shadow-sm'
                    : 'hover:bg-slate-50 border border-transparent'}`}
                  onClick={() => handleSelectEntry(entry)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm truncate">{entry.title}</p>
                    {entry.is_bookmarked && <BookmarkCheck className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-1">{entry.content?.replace(/<[^>]*>/g, '').substring(0, 60)}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1.5">{format(new Date(entry.updated_at), "MMM d, yyyy h:mm a")}</p>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* === CENTER - Editor + Tasks === */}
      <div className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Title Bar */}
        <div className="flex items-center gap-3 px-6 py-3 border-b bg-white">
          <Input
            value={currentTitle}
            onChange={e => setCurrentTitle(e.target.value)}
            placeholder="Untitled Entry..."
            className="text-xl font-semibold border-none shadow-none focus-visible:ring-0 px-0 bg-transparent flex-1"
          />
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="icon" onClick={() => setIsBookmarked(!isBookmarked)}
              className={isBookmarked ? "text-amber-500" : "text-muted-foreground"}>
              {isBookmarked ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
            </Button>
            {selectedEntryId && (
              <Button variant="ghost" size="icon" onClick={() => { deleteEntry.mutate(selectedEntryId); handleNewEntry(); }}>
                <Trash2 className="w-4 h-4 text-red-400" />
              </Button>
            )}
            <Button onClick={handleSave} disabled={createEntry.isPending || updateEntry.isPending}
              className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-md shadow-indigo-200">
              <Save className="w-4 h-4 mr-2" /> Save
            </Button>
          </div>
        </div>

        {/* Formatting Toolbar */}
        <div className="flex items-center gap-0.5 px-4 py-1.5 border-b bg-slate-50/80 flex-wrap">
          {[
            { icon: <Bold className="w-4 h-4" />, cmd: () => execFormat('bold'), tip: 'Bold (Ctrl+B)' },
            { icon: <Italic className="w-4 h-4" />, cmd: () => execFormat('italic'), tip: 'Italic (Ctrl+I)' },
            { icon: <Underline className="w-4 h-4" />, cmd: () => execFormat('underline'), tip: 'Underline (Ctrl+U)' },
            { type: 'sep' },
            { icon: <Heading1 className="w-4 h-4" />, cmd: () => execFormat('formatBlock', 'h1'), tip: 'Heading 1' },
            { icon: <Heading2 className="w-4 h-4" />, cmd: () => execFormat('formatBlock', 'h2'), tip: 'Heading 2' },
            { icon: <Quote className="w-4 h-4" />, cmd: () => execFormat('formatBlock', 'blockquote'), tip: 'Quote' },
            { type: 'sep' },
            { icon: <List className="w-4 h-4" />, cmd: () => insertList('bullet'), tip: 'Bullet List' },
            { icon: <ListOrdered className="w-4 h-4" />, cmd: () => insertList('number'), tip: 'Numbered List' },
            { icon: <CheckSquare className="w-4 h-4" />, cmd: () => insertChecklist(), tip: 'Checklist' },
            { type: 'sep' },
            { icon: <Minus className="w-4 h-4" />, cmd: () => execFormat('insertHorizontalRule'), tip: 'Divider' },
            { type: 'sep' },
            { icon: <span className="w-4 h-4 rounded-full bg-red-500 block" />, cmd: () => execFormat('foreColor', '#ef4444'), tip: 'Red' },
            { icon: <span className="w-4 h-4 rounded-full bg-blue-500 block" />, cmd: () => execFormat('foreColor', '#3b82f6'), tip: 'Blue' },
            { icon: <span className="w-4 h-4 rounded-full bg-green-500 block" />, cmd: () => execFormat('foreColor', '#22c55e'), tip: 'Green' },
            { icon: <span className="w-4 h-4 rounded-full bg-purple-500 block" />, cmd: () => execFormat('foreColor', '#a855f7'), tip: 'Purple' },
            { icon: <span className="w-4 h-4 rounded-full bg-gray-800 block" />, cmd: () => execFormat('foreColor', '#1f2937'), tip: 'Default' },
          ].map((item, i) =>
            item.type === 'sep' ? (
              <div key={`sep-${i}`} className="w-px h-5 bg-slate-200 mx-1" />
            ) : (
              <button
                key={i}
                onClick={item.cmd}
                title={item.tip}
                className="p-1.5 rounded hover:bg-slate-200 transition-colors text-slate-600 hover:text-slate-900"
              >
                {item.icon}
              </button>
            )
          )}
        </div>

        {/* Editor + Action Items in Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-4 mt-2 w-fit bg-slate-100">
            <TabsTrigger value="write" className="text-xs">✏️ Write</TabsTrigger>
            <TabsTrigger value="tasks" className="text-xs">
              ✅ Action Items
              {entryTasks.length > 0 && <Badge className="ml-1.5 h-5 px-1.5 text-[10px] bg-indigo-500">{entryTasks.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="write" className="flex-1 overflow-auto m-0 p-0">
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleEditorInput}
              onKeyDown={handleEditorKeyDown}
              className="min-h-full p-6 outline-none text-base leading-relaxed prose prose-sm max-w-none
                [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-3
                [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-2
                [&_blockquote]:border-l-4 [&_blockquote]:border-indigo-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-500
                [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6
                [&_hr]:my-4 [&_hr]:border-slate-200"
              data-placeholder="Start writing your thoughts here..."
              style={{ minHeight: '300px' }}
            />
          </TabsContent>

          <TabsContent value="tasks" className="flex-1 overflow-auto m-0 p-0">
            <div className="p-6 max-w-2xl mx-auto">

              {/* Show warning if entry not saved yet */}
              {!selectedEntryId && (
                <div className="flex items-center gap-3 p-4 mb-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
                  <Save className="w-5 h-5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Save your entry first</p>
                    <p className="text-xs mt-0.5 text-amber-600">You need to save the diary entry before you can add action items to it.</p>
                  </div>
                  <Button size="sm" onClick={handleSave} className="ml-auto shrink-0 bg-amber-600 hover:bg-amber-700 text-white">
                    Save Now
                  </Button>
                </div>
              )}

              {/* Add Task Input */}
              <div className="flex gap-2 mb-6">
                <Input
                  placeholder={selectedEntryId ? "Type a task and press Enter or click Add..." : "Save the entry first to add tasks..."}
                  value={newTaskText}
                  onChange={e => setNewTaskText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && selectedEntryId && handleManualTaskAdd()}
                  className="bg-slate-50"
                  disabled={!selectedEntryId}
                />
                <Button onClick={handleManualTaskAdd} disabled={!newTaskText.trim() || !selectedEntryId}
                  className={`shrink-0 ${selectedEntryId ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>

              {entryTasks.length === 0 && selectedEntryId ? (
                <div className="text-center py-16">
                  <ListTodo className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No action items yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Type a task above and click Add, or use the AI "Extract Tasks" button on the right</p>
                </div>
              ) : entryTasks.length === 0 && !selectedEntryId ? (
                <div className="text-center py-16">
                  <ListTodo className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Save your entry to start adding tasks</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {pendingTasks.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Pending ({pendingTasks.length})</h3>
                      <div className="space-y-2">
                        {pendingTasks.map(task => (
                          <div key={task.id} className="flex gap-3 items-start group p-3 rounded-lg bg-amber-50/50 border border-amber-100 hover:border-amber-200 transition-all">
                            <button className="mt-0.5 shrink-0" onClick={() => toggleTaskStatus.mutate({ id: task.id, status: 'completed' })}>
                              <Circle className="w-5 h-5 text-amber-400 hover:text-green-500 transition-colors" />
                            </button>
                            <div className="flex-1">
                              <p className="text-sm">{task.task_text}</p>
                              {task.deadline && (
                                <p className="text-[11px] text-muted-foreground mt-1 flex items-center">
                                  <Calendar className="w-3 h-3 mr-1" /> {format(new Date(task.deadline), "MMM d, yyyy")}
                                </p>
                              )}
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteTask.mutate(task.id)}>
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {completedTasks.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Completed ({completedTasks.length})</h3>
                      <div className="space-y-2">
                        {completedTasks.map(task => (
                          <div key={task.id} className="flex gap-3 items-start group p-3 rounded-lg bg-green-50/50 border border-green-100 transition-all">
                            <button className="mt-0.5 shrink-0" onClick={() => toggleTaskStatus.mutate({ id: task.id, status: 'pending' })}>
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                            </button>
                            <div className="flex-1">
                              <p className="text-sm line-through text-muted-foreground">{task.task_text}</p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteTask.mutate(task.id)}>
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* === RIGHT SIDEBAR - AI Assistant === */}
      <div className="w-64 flex flex-col border-l bg-gradient-to-b from-indigo-50/50 to-purple-50/30 shrink-0">
        <div className="p-4 border-b">
          <h3 className="text-sm font-semibold flex items-center text-indigo-600">
            <Sparkles className="w-4 h-4 mr-2" /> Smart Assistant
          </h3>
        </div>
        <div className="p-3 flex flex-col gap-2">
          <Button variant="outline" className="w-full justify-start text-xs h-9 bg-white/80 hover:bg-white" onClick={() => callSmartAssistant('summarize')} disabled={isAiLoading}>
            <MessageSquare className="w-3.5 h-3.5 mr-2 text-blue-500" /> Summarize
          </Button>
          <Button variant="outline" className="w-full justify-start text-xs h-9 bg-white/80 hover:bg-white" onClick={() => callSmartAssistant('suggest')} disabled={isAiLoading}>
            <Sparkles className="w-3.5 h-3.5 mr-2 text-amber-500" /> Suggest Ideas
          </Button>
          <Button variant="outline" className="w-full justify-start text-xs h-9 bg-white/80 hover:bg-white" onClick={() => callSmartAssistant('extract_tasks')} disabled={isAiLoading || !selectedEntryId}>
            <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-green-500" /> Extract Tasks
          </Button>

          <div className="mt-3 pt-3 border-t">
            <p className="text-[11px] font-medium text-muted-foreground mb-2">Ask a question</p>
            <div className="flex gap-1.5">
              <Input placeholder="e.g., What did I say about..." className="text-xs h-8 bg-white/80" value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && callSmartAssistant('ask', aiPrompt)} />
              <Button size="sm" className="h-8 px-2 bg-indigo-500 hover:bg-indigo-600 text-white" onClick={() => callSmartAssistant('ask', aiPrompt)} disabled={isAiLoading || !aiPrompt}>Go</Button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-auto p-4 border-t bg-white/40">
          <p className="text-[11px] font-medium text-muted-foreground mb-2">Quick Stats</p>
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Total Entries</span>
              <span className="font-medium">{entries?.length || 0}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Bookmarked</span>
              <span className="font-medium">{entries?.filter(e => e.is_bookmarked).length || 0}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Pending Tasks</span>
              <span className="font-medium text-amber-600">{allTasks.filter(t => t.status !== 'completed').length}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Completed Tasks</span>
              <span className="font-medium text-green-600">{allTasks.filter(t => t.status === 'completed').length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
