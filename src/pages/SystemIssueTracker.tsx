import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bug, AlertTriangle, CheckCircle2, Clock, Search, TrendingUp, 
  Zap, Eye, ArrowRight, Sparkles, RefreshCw, MessageSquare,
  ExternalLink, Monitor, Users, Activity
} from 'lucide-react';
import {
  useSystemIssuesList,
  useSystemIssueStats,
  useUpdateIssue,
  SystemIssue,
  ISSUE_CATEGORIES,
  ISSUE_PRIORITIES,
  ISSUE_STATUSES,
  IssueStatus,
} from '@/hooks/useSystemIssues';

function StatusBadge({ status }: { status: string }) {
  const statusInfo = ISSUE_STATUSES.find(s => s.value === status);
  const colorMap: Record<string, string> = {
    open: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    investigating: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    diagnosed: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
    fix_in_progress: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    resolved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    closed: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
    wont_fix: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorMap[status] || 'bg-gray-100 text-gray-800'}`}>
      {statusInfo?.label || status}
    </span>
  );
}

function PriorityIndicator({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    low: 'bg-slate-400',
    medium: 'bg-yellow-500',
    high: 'bg-orange-500',
    critical: 'bg-red-500 animate-pulse',
  };
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${colors[priority] || 'bg-gray-400'}`} />
      <span className="text-xs capitalize">{priority}</span>
    </span>
  );
}

function CategoryIcon({ category }: { category: string }) {
  const cat = ISSUE_CATEGORIES.find(c => c.value === category);
  return <span title={cat?.label || category}>{cat?.icon || '📝'}</span>;
}

function IssueDetailPanel({ issue, onClose }: { issue: SystemIssue; onClose: () => void }) {
  const updateIssue = useUpdateIssue();
  const [newStatus, setNewStatus] = useState<IssueStatus>(issue.status);
  const [resolutionNotes, setResolutionNotes] = useState(issue.resolution_notes || '');
  const [assignedTo, setAssignedTo] = useState(issue.assigned_to || '');

  const handleUpdate = async () => {
    await updateIssue.mutateAsync({
      id: issue.id,
      status: newStatus,
      resolution_notes: resolutionNotes || undefined,
      assigned_to: assignedTo || undefined,
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <CategoryIcon category={issue.category} />
            <span>Issue #{issue.issue_number}</span>
            <StatusBadge status={issue.status} />
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-5">
            {/* Title & Description */}
            <div>
              <h3 className="text-lg font-semibold">{issue.title}</h3>
              {issue.description && (
                <p className="text-muted-foreground mt-1">{issue.description}</p>
              )}
            </div>

            {/* Context Info */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground">Reporter</span>
                <p className="font-medium">{issue.reporter_name || 'Unknown'}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground">Priority</span>
                <div className="mt-1"><PriorityIndicator priority={issue.priority} /></div>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground">Page</span>
                <p className="font-medium">{issue.page_name || issue.page_url || 'N/A'}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <span className="text-muted-foreground">Reported</span>
                <p className="font-medium">{new Date(issue.created_at).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Error Message */}
            {issue.error_message && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-xs text-red-500 font-medium mb-1">Error Message</p>
                <code className="text-sm text-red-800 dark:text-red-300">{issue.error_message}</code>
              </div>
            )}

            {/* Auto-Diagnosis */}
            {issue.is_auto_diagnosed && (
              <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border border-purple-200 dark:border-purple-800 rounded-lg space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  <h4 className="font-semibold text-purple-800 dark:text-purple-300">AI Auto-Diagnosis</h4>
                </div>
                <p className="text-sm text-purple-700 dark:text-purple-300">{issue.auto_diagnosis}</p>
                {issue.suggested_fix && (
                  <>
                    <Separator className="bg-purple-200 dark:bg-purple-700" />
                    <div>
                      <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-2">Suggested Fix:</p>
                      <p className="text-sm text-purple-700 dark:text-purple-300 whitespace-pre-wrap">{issue.suggested_fix}</p>
                    </div>
                  </>
                )}
              </div>
            )}

            <Separator />

            {/* Update Form */}
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <ArrowRight className="h-4 w-4" />
                Update Issue
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={newStatus} onValueChange={(v) => setNewStatus(v as IssueStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ISSUE_STATUSES.map(s => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Assign To</Label>
                  <Input
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    placeholder="Team member name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Resolution Notes</Label>
                <Textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Describe what was done to fix this issue..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={onClose}>Cancel</Button>
                <Button
                  onClick={handleUpdate}
                  disabled={updateIssue.isPending}
                  className="bg-gradient-to-r from-primary to-purple-600"
                >
                  {updateIssue.isPending ? 'Updating...' : 'Update Issue'}
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default function SystemIssueTracker() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIssue, setSelectedIssue] = useState<SystemIssue | null>(null);

  const { data: issues = [], isLoading, refetch } = useSystemIssuesList({ 
    status: statusFilter, 
    category: categoryFilter,
    priority: priorityFilter 
  });
  const { data: stats } = useSystemIssueStats();

  // Search filter (client-side)
  const filteredIssues = issues.filter(issue => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      issue.title.toLowerCase().includes(q) ||
      (issue.description || '').toLowerCase().includes(q) ||
      (issue.reporter_name || '').toLowerCase().includes(q) ||
      (issue.page_name || '').toLowerCase().includes(q) ||
      String(issue.issue_number).includes(q)
    );
  });

  const statCards = [
    {
      title: 'Total Issues',
      value: stats?.total || 0,
      icon: <Bug className="h-5 w-5" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30'
    },
    {
      title: 'Open',
      value: stats?.open || 0,
      icon: <AlertTriangle className="h-5 w-5" />,
      color: 'text-red-600',
      bgColor: 'bg-red-100 dark:bg-red-900/30'
    },
    {
      title: 'Investigating',
      value: stats?.investigating || 0,
      icon: <Eye className="h-5 w-5" />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30'
    },
    {
      title: 'In Progress',
      value: stats?.inProgress || 0,
      icon: <Activity className="h-5 w-5" />,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30'
    },
    {
      title: 'Resolved',
      value: stats?.resolved || 0,
      icon: <CheckCircle2 className="h-5 w-5" />,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/30'
    },
    {
      title: 'Auto-Diagnosed',
      value: stats?.autoDiagnosed || 0,
      icon: <Sparkles className="h-5 w-5" />,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100 dark:bg-indigo-900/30'
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-red-500 to-orange-500 rounded-xl shadow-lg">
              <Bug className="h-6 w-6 text-white" />
            </div>
            System Issue Tracker
          </h1>
          <p className="text-muted-foreground mt-1">
            Track, diagnose, and resolve system issues reported by users
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat, idx) => (
          <Card key={idx} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <span className={stat.color}>{stat.icon}</span>
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.title}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Critical Issues Alert */}
      {(stats?.critical || 0) > 0 && (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-300 dark:border-red-800 rounded-lg flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-red-500 animate-pulse" />
          <div>
            <p className="font-semibold text-red-800 dark:text-red-300">
              {stats?.critical} Critical Issue{(stats?.critical || 0) > 1 ? 's' : ''} Require Attention
            </p>
            <p className="text-sm text-red-600 dark:text-red-400">
              These issues have been marked as critical priority and should be addressed immediately.
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search issues by title, reporter, page..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {ISSUE_STATUSES.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {ISSUE_CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.icon} {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                {ISSUE_PRIORITIES.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Issues Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Reported Issues ({filteredIssues.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredIssues.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bug className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No issues found</p>
              <p className="text-sm">When users report issues, they'll appear here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredIssues.map(issue => (
                <div
                  key={issue.id}
                  onClick={() => setSelectedIssue(issue)}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/5 cursor-pointer transition-all hover:shadow-sm group"
                >
                  {/* Category Icon */}
                  <div className="text-xl">
                    <CategoryIcon category={issue.category} />
                  </div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground font-mono">#{issue.issue_number}</span>
                      <h4 className="font-medium truncate">{issue.title}</h4>
                      {issue.is_auto_diagnosed && (
                        <Sparkles className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{issue.reporter_name || 'Unknown'}</span>
                      <span>•</span>
                      <span>{issue.page_name || issue.page_url || 'N/A'}</span>
                      <span>•</span>
                      <span>{new Date(issue.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Right side */}
                  <div className="flex items-center gap-3 shrink-0">
                    <PriorityIndicator priority={issue.priority} />
                    <StatusBadge status={issue.status} />
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Issue Detail Dialog */}
      {selectedIssue && (
        <IssueDetailPanel
          issue={selectedIssue}
          onClose={() => setSelectedIssue(null)}
        />
      )}
    </div>
  );
}
