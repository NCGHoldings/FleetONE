import { useState, useEffect } from "react";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { DocumentUpload } from "@/components/documents/DocumentUpload";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Clock, FileText, AlertTriangle, CheckCircle, ArrowUp, User, MessageSquare, Flag, Calendar, Plus, TrendingUp, BarChart3, Users, Target } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";

interface Feedback {
  id: string;
  feedback_id: string;
  feedback_date: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  type: string;
  current_handler?: string;
  current_handler_name?: string;
  staff_group?: string;
  resolution?: string;
  escalation_level: number;
  escalated_at?: string;
  resolved_by_name?: string;
  reported_by: string;
  created_at: string;
  resolved_at?: string;
}

interface Comment {
  id: string;
  user_name: string;
  comment_text: string;
  created_at: string;
  is_internal: boolean;
}

interface NewFeedback {
  staff_group: string;
  type: string;
  category: string;
  title: string;
  description: string;
  priority?: string;
}

export default function Complaints() {
  const { hasRole, user } = useAuth();
  const isSupervisor = hasRole('super_admin') || hasRole('admin') || hasRole('supervisor');
  
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [newFeedback, setNewFeedback] = useState<NewFeedback>({
    staff_group: '',
    type: '',
    category: '',
    title: '',
    description: '',
    priority: 'medium'
  });

  useEffect(() => {
    document.title = "Feedback & Complaints | NCG Speed";
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    try {
      const { data, error } = await supabase
        .from('feedback_complaints')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFeedback(data || []);
    } catch (error) {
      console.error('Error fetching feedback:', error);
      toast.error('Failed to fetch feedback');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (feedbackId: string) => {
    try {
      const { data, error } = await supabase
        .from('feedback_comments')
        .select('*')
        .eq('feedback_id', feedbackId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast.error('Failed to fetch comments');
    }
  };

  const createFeedback = async () => {
    if (!isSupervisor) {
      toast.error('Only supervisors can create feedback');
      return;
    }

    try {
      const { error } = await supabase.from('feedback_complaints').insert({
        ...newFeedback,
        feedback_id: `FB-${Date.now()}`,
        feedback_date: new Date().toISOString().split('T')[0],
        reported_by: user?.id,
        escalation_level: 1,
        status: 'new'
      });

      if (error) throw error;
      
      setNewFeedback({
        staff_group: '',
        type: '',
        category: '',
        title: '',
        description: '',
        priority: 'medium'
      });
      setShowAddDialog(false);
      fetchFeedback();
      toast.success('Feedback created successfully');
    } catch (error) {
      console.error('Error creating feedback:', error);
      toast.error('Failed to create feedback');
    }
  };

  const addComment = async () => {
    if (!selectedFeedback || !newComment.trim()) return;

    try {
      const { error } = await supabase.from('feedback_comments').insert({
        feedback_id: selectedFeedback.id,
        user_id: user?.id,
        user_name: `${user?.user_metadata?.first_name} ${user?.user_metadata?.last_name}`,
        comment_text: newComment.trim(),
        is_internal: false
      });

      if (error) throw error;
      
      setNewComment('');
      fetchComments(selectedFeedback.id);
      toast.success('Comment added');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    }
  };

  const escalateFeedback = async (feedbackId: string, currentLevel: number) => {
    if (!isSupervisor) {
      toast.error('Only supervisors can escalate feedback');
      return;
    }

    try {
      const newLevel = currentLevel + 1;
      await supabase.from('feedback_complaints').update({
        escalation_level: newLevel,
        status: 'escalated'
      }).eq('id', feedbackId);

      await supabase.from('feedback_escalations').insert({
        feedback_id: feedbackId,
        from_level: currentLevel,
        to_level: newLevel,
        escalated_by: user?.id,
        escalated_by_name: `${user?.user_metadata?.first_name} ${user?.user_metadata?.last_name}`
      });

      fetchFeedback();
      toast.success('Feedback escalated successfully');
    } catch (error) {
      console.error('Error escalating feedback:', error);
      toast.error('Failed to escalate feedback');
    }
  };

  const resolveFeedback = async (feedbackId: string, resolution: string) => {
    if (!isSupervisor || !resolution.trim()) return;

    try {
      await supabase.from('feedback_complaints').update({
        status: 'resolved',
        resolution: resolution.trim(),
        resolved_at: new Date().toISOString(),
        resolved_by_name: `${user?.user_metadata?.first_name} ${user?.user_metadata?.last_name}`
      }).eq('id', feedbackId);

      fetchFeedback();
      setSelectedFeedback(null);
      toast.success('Feedback resolved successfully');
    } catch (error) {
      console.error('Error resolving feedback:', error);
      toast.error('Failed to resolve feedback');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-destructive text-destructive-foreground';
      case 'medium': return 'bg-warning text-warning-foreground';
      case 'low': return 'bg-success text-success-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'resolved': return 'bg-success text-success-foreground';
      case 'in_progress': return 'bg-warning text-warning-foreground';
      case 'escalated': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-secondary text-secondary-foreground';
    }
  };

  const getEscalationLevel = (level: number) => {
    const levels = ['Supervisor', 'Manager', 'Senior Management'];
    return levels[level - 1] || 'Unknown';
  };

  const getProgressPercentage = (level: number) => {
    return Math.min((level / 3) * 100, 100);
  };

  const columns: ColumnDef<Feedback>[] = [
    {
      accessorKey: "feedback_id",
      header: "ID",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("feedback_id") || `FB-${row.original.id.slice(-6)}`}</div>
      ),
    },
    {
      accessorKey: "staff_group",
      header: "Staff Group",
      cell: ({ row }) => (
        <Badge variant="outline">{row.getValue("staff_group")}</Badge>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant="secondary">{row.getValue("type")}</Badge>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => (
        <Badge variant="outline">{row.getValue("category")}</Badge>
      ),
    },
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate font-medium">{row.getValue("title")}</div>
      ),
    },
    {
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => (
        <Badge className={getPriorityColor(row.getValue("priority"))}>
          <Flag className="h-3 w-3 mr-1" />
          {row.getValue("priority")}
        </Badge>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge className={getStatusColor(row.getValue("status"))}>
          {row.getValue("status") === 'resolved' && <CheckCircle className="h-3 w-3 mr-1" />}
          {row.getValue("status") === 'escalated' && <ArrowUp className="h-3 w-3 mr-1" />}
          {row.getValue("status")}
        </Badge>
      ),
    },
    {
      id: "escalation",
      header: "Current Level",
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="text-sm font-medium">{getEscalationLevel(row.original.escalation_level)}</div>
          <Progress value={getProgressPercentage(row.original.escalation_level)} className="h-2" />
        </div>
      ),
    },
    {
      accessorKey: "feedback_date",
      header: "Date",
      cell: ({ row }) => (
        <div className="text-sm">{new Date(row.getValue("feedback_date")).toLocaleDateString()}</div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedFeedback(row.original);
              fetchComments(row.original.id);
            }}
          >
            <MessageSquare className="h-4 w-4" />
            View
          </Button>
          {isSupervisor && row.original.status !== 'resolved' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => escalateFeedback(row.original.id, row.original.escalation_level)}
            >
              <ArrowUp className="h-4 w-4" />
              Escalate
            </Button>
          )}
        </div>
      ),
    },
  ];

  const analytics = {
    total: feedback.length,
    pending: feedback.filter(f => f.status !== 'resolved').length,
    resolved: feedback.filter(f => f.status === 'resolved').length,
    highPriority: feedback.filter(f => f.priority === 'high').length,
    escalated: feedback.filter(f => f.escalation_level > 1).length,
    avgResolutionTime: 2.5, // Mock data
    supervisorResolved: feedback.filter(f => f.status === 'resolved' && f.escalation_level === 1).length,
    escalationRatio: feedback.length > 0 ? Math.round((feedback.filter(f => f.escalation_level > 1).length / feedback.length) * 100) : 0
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Feedback & Complaints</h1>
          <p className="text-muted-foreground">
            {isSupervisor ? 'Manage feedback from staff and track resolution progress' : 'View and participate in feedback discussions'}
          </p>
        </div>
        {isSupervisor && (
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Feedback Entry
          </Button>
        )}
      </div>

      <Tabs defaultValue="feedback" className="space-y-4">
        <TabsList>
          <TabsTrigger value="feedback">All Feedback</TabsTrigger>
          {isSupervisor && <TabsTrigger value="analytics">Analytics & KPIs</TabsTrigger>}
        </TabsList>

        <TabsContent value="feedback" className="space-y-4">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.total}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Clock className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.pending}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Resolved</CardTitle>
                <CheckCircle className="h-4 w-4 text-success" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.resolved}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">High Priority</CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.highPriority}</div>
              </CardContent>
            </Card>
          </div>

          <DataTable
            columns={columns}
            data={feedback}
            searchKey="title"
          />
        </TabsContent>

        {isSupervisor && (
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Resolution KPIs
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Avg Resolution Time</span>
                      <span className="text-sm font-medium">{analytics.avgResolutionTime} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Supervisor Level Resolution</span>
                      <span className="text-sm font-medium">{analytics.supervisorResolved}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Escalation Ratio</span>
                      <span className="text-sm font-medium">{analytics.escalationRatio}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Category Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {['Maintenance', 'Operations', 'Payroll', 'Safety', 'Other'].map(category => {
                      const count = feedback.filter(f => f.category === category).length;
                      return (
                        <div key={category} className="flex justify-between">
                          <span className="text-sm">{category}</span>
                          <span className="text-sm font-medium">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Staff Group Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {['Bus Crew', 'Bay Workers', 'Ground Staff', 'Management'].map(group => {
                      const count = feedback.filter(f => f.staff_group === group).length;
                      return (
                        <div key={group} className="flex justify-between">
                          <span className="text-sm">{group}</span>
                          <span className="text-sm font-medium">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>

      {/* Add Feedback Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Feedback Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Staff Group</Label>
                <Select value={newFeedback.staff_group} onValueChange={(value) => setNewFeedback({...newFeedback, staff_group: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select staff group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bus Crew">Bus Crew</SelectItem>
                    <SelectItem value="Bay Workers">Bay Workers</SelectItem>
                    <SelectItem value="Ground Staff">Ground Staff</SelectItem>
                    <SelectItem value="Management">Management</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type</Label>
                <Select value={newFeedback.type} onValueChange={(value) => setNewFeedback({...newFeedback, type: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Problem">Problem</SelectItem>
                    <SelectItem value="Suggestion">Suggestion</SelectItem>
                    <SelectItem value="Business Idea">Business Idea</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select value={newFeedback.category} onValueChange={(value) => setNewFeedback({...newFeedback, category: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                    <SelectItem value="Operations">Operations</SelectItem>
                    <SelectItem value="Payroll">Payroll</SelectItem>
                    <SelectItem value="Safety">Safety</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={newFeedback.priority} onValueChange={(value) => setNewFeedback({...newFeedback, priority: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Title</Label>
              <Input
                value={newFeedback.title}
                onChange={(e) => setNewFeedback({...newFeedback, title: e.target.value})}
                placeholder="Brief title for the feedback"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={newFeedback.description}
                onChange={(e) => setNewFeedback({...newFeedback, description: e.target.value})}
                placeholder="Detailed description of the feedback"
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button onClick={createFeedback}>Create Feedback</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Feedback Dialog */}
      {selectedFeedback && (
        <Dialog open={!!selectedFeedback} onOpenChange={() => setSelectedFeedback(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Feedback Details - {selectedFeedback.feedback_id}</span>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(selectedFeedback.status)}>
                    {selectedFeedback.status}
                  </Badge>
                  <Badge className={getPriorityColor(selectedFeedback.priority)}>
                    {selectedFeedback.priority}
                  </Badge>
                </div>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Progress Tracker */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Escalation Progress</Label>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Current Level: {getEscalationLevel(selectedFeedback.escalation_level)}</span>
                    <span>{Math.round(getProgressPercentage(selectedFeedback.escalation_level))}% Complete</span>
                  </div>
                  <Progress value={getProgressPercentage(selectedFeedback.escalation_level)} />
                </div>
              </div>

              {/* Feedback Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Staff Group</Label>
                  <p>{selectedFeedback.staff_group}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Type</Label>
                  <p>{selectedFeedback.type}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Category</Label>
                  <p>{selectedFeedback.category}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Date</Label>
                  <p>{new Date(selectedFeedback.feedback_date).toLocaleDateString()}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Description</Label>
                <p className="mt-1 text-sm text-muted-foreground">{selectedFeedback.description}</p>
              </div>

              {selectedFeedback.resolution && (
                <div>
                  <Label className="text-sm font-medium">Resolution</Label>
                  <p className="mt-1 text-sm text-muted-foreground">{selectedFeedback.resolution}</p>
                  {selectedFeedback.resolved_by_name && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Resolved by: {selectedFeedback.resolved_by_name}
                    </p>
                  )}
                </div>
              )}

              {/* Comments Section */}
              <div className="space-y-4">
                <Label className="text-sm font-medium">Discussion Thread</Label>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {comments.map((comment) => (
                    <div key={comment.id} className="bg-muted/50 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div className="font-medium text-sm">{comment.user_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(comment.created_at).toLocaleString()}
                        </div>
                      </div>
                      <p className="text-sm mt-1">{comment.comment_text}</p>
                    </div>
                  ))}
                </div>

                {/* Add Comment */}
                <div className="space-y-2">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    rows={3}
                  />
                  <div className="flex justify-between">
                    <span className="text-xs text-muted-foreground">
                      Comments are visible to all staff in this group
                    </span>
                    <Button size="sm" onClick={addComment} disabled={!newComment.trim()}>
                      Add Comment
                    </Button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {isSupervisor && selectedFeedback.status !== 'resolved' && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => escalateFeedback(selectedFeedback.id, selectedFeedback.escalation_level)}
                  >
                    <ArrowUp className="h-4 w-4 mr-2" />
                    Escalate
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Resolve
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Resolve Feedback</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Textarea
                          placeholder="Enter resolution details..."
                          onChange={(e) => setNewComment(e.target.value)}
                          rows={4}
                        />
                        <div className="flex justify-end gap-2">
                          <Button variant="outline">Cancel</Button>
                          <Button onClick={() => resolveFeedback(selectedFeedback.id, newComment)}>
                            Resolve Feedback
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}