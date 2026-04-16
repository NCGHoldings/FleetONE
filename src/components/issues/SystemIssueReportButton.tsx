import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bug, Send, X, Sparkles, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useReportIssue, ISSUE_CATEGORIES, ISSUE_PRIORITIES, IssueCategory, IssuePriority } from '@/hooks/useSystemIssues';
import { ALL_PAGES_FLAT } from '@/lib/pages';

export function SystemIssueReportButton() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<IssueCategory>('general');
  const [priority, setPriority] = useState<IssuePriority>('medium');
  const [errorMessage, setErrorMessage] = useState('');
  const location = useLocation();
  const reportIssue = useReportIssue();

  // Determine current page name from location
  const currentPageName = ALL_PAGES_FLAT.find(p => p.url === location.pathname)?.title || location.pathname;

  const handleSubmit = async () => {
    if (!title.trim()) return;
    
    try {
      await reportIssue.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        page_url: location.pathname,
        page_name: currentPageName,
        error_message: errorMessage.trim() || undefined,
      });

      // Reset form
      setTitle('');
      setDescription('');
      setCategory('general');
      setPriority('medium');
      setErrorMessage('');
      setOpen(false);
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <>
      {/* Floating Bug Report Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 group flex items-center gap-2 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white rounded-full px-4 py-3 shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/40 transition-all duration-300 hover:scale-105 active:scale-95"
        title="Report a System Issue"
      >
        <Bug className="h-5 w-5 animate-pulse" />
        <span className="text-sm font-medium hidden sm:inline">Report Issue</span>
      </button>

      {/* Report Issue Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg">
                <Bug className="h-5 w-5 text-white" />
              </div>
              Report System Issue
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Auto-captured context */}
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg text-sm">
              <Sparkles className="h-4 w-4 text-purple-500" />
              <span className="text-muted-foreground">
                Auto-captured from: <strong className="text-foreground">{currentPageName}</strong>
              </span>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="issue-title">What went wrong? *</Label>
              <Input
                id="issue-title"
                placeholder="e.g., Dropdown fields are empty on the form..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="focus-visible:ring-red-500"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="issue-desc">Describe the issue</Label>
              <Textarea
                id="issue-desc"
                placeholder="What were you trying to do? What did you expect to happen? What happened instead?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            {/* Category & Priority row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as IssueCategory)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ISSUE_CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <span className="flex items-center gap-2">
                          <span>{cat.icon}</span>
                          <span>{cat.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v as IssuePriority)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ISSUE_PRIORITIES.map(p => (
                      <SelectItem key={p.value} value={p.value}>
                        <span className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${p.color}`} />
                          <span>{p.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Error message (optional) */}
            <div className="space-y-2">
              <Label htmlFor="error-msg">Error message (if any)</Label>
              <Input
                id="error-msg"
                placeholder="Paste any error message you saw..."
                value={errorMessage}
                onChange={(e) => setErrorMessage(e.target.value)}
              />
            </div>

            {/* Smart diagnosis hint */}
            <div className="flex items-center gap-2 p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg text-sm">
              <Sparkles className="h-4 w-4 text-purple-500 shrink-0" />
              <span className="text-purple-700 dark:text-purple-300">
                Our AI will auto-diagnose your issue and suggest fixes when possible.
              </span>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={!title.trim() || reportIssue.isPending}
                className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
              >
                {reportIssue.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span> Sending...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="h-4 w-4" /> Report Issue
                  </span>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
