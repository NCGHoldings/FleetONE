import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Clock, 
  Users, 
  Building2, 
  Calendar, 
  Play, 
  CheckCircle, 
  XCircle,
  MessageSquare,
  Star,
  ArrowRight
} from "lucide-react";
import { format } from "date-fns";

interface TaskDetailModalProps {
  task: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (status: string) => void;
}

export const TaskDetailModal = ({ task, open, onOpenChange, onStatusChange }: TaskDetailModalProps) => {
  const [feedback, setFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState<'approved' | 'revision_needed' | null>(null);
  const queryClient = useQueryClient();

  const submitFeedbackMutation = useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      
      // Add feedback
      const { error: feedbackError } = await supabase
        .from('marketing_task_feedback')
        .insert({
          task_id: task.id,
          given_by: user.user?.id,
          feedback_type: feedbackType,
          message: feedback,
        });
      if (feedbackError) throw feedbackError;

      // Update task status
      const newStatus = feedbackType === 'approved' ? 'completed' : 'needs_revision';
      const updates: any = { status: newStatus };
      
      if (feedbackType === 'approved') {
        updates.completed_at = new Date().toISOString();
        
        // Calculate credits if task completed early
        if (task.assigned_hours && task.started_at) {
          const startTime = new Date(task.started_at);
          const endTime = new Date();
          const actualHours = Math.max(1, (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60));
          
          let credits = actualHours; // Base credits
          if (actualHours < task.assigned_hours) {
            const hoursSaved = task.assigned_hours - actualHours;
            credits += hoursSaved * 2; // Bonus for early completion
          }
          
          updates.actual_hours_spent = actualHours;
          updates.credits_awarded = credits;
          
          // Update team member credits
          if (task.assignees && task.assignees.length > 0) {
            const creditsPerMember = credits / task.assignees.length;
            for (const assignee of task.assignees) {
              await supabase
                .from('marketing_team_members')
                .update({ total_credits: (assignee.member.total_credits || 0) + creditsPerMember })
                .eq('id', assignee.member.id);
            }
          }
        }
      }

      const { error: updateError } = await supabase
        .from('marketing_tasks')
        .update(updates)
        .eq('id', task.id);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      toast.success(feedbackType === 'approved' ? 'Task approved and completed!' : 'Revision requested');
      queryClient.invalidateQueries({ queryKey: ['marketing-tasks'] });
      setFeedback('');
      setFeedbackType(null);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const getStatusActions = () => {
    switch (task.status) {
      case 'planning':
        return (
          <Button onClick={() => onStatusChange('assigned')} className="w-full">
            <Users className="h-4 w-4 mr-2" />
            Mark as Assigned
          </Button>
        );
      case 'assigned':
        return (
          <Button onClick={() => onStatusChange('ongoing')} className="w-full bg-cyan-500 hover:bg-cyan-600">
            <Play className="h-4 w-4 mr-2" />
            Start Task
          </Button>
        );
      case 'ongoing':
        return (
          <Button onClick={() => onStatusChange('pending_review')} className="w-full bg-amber-500 hover:bg-amber-600">
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark as Done
          </Button>
        );
      case 'pending_review':
        return (
          <div className="space-y-3">
            <Textarea
              placeholder="Add feedback (optional)"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={2}
            />
            <div className="flex gap-2">
              <Button 
                onClick={() => { setFeedbackType('approved'); submitFeedbackMutation.mutate(); }}
                className="flex-1 bg-green-500 hover:bg-green-600"
                disabled={submitFeedbackMutation.isPending}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button 
                onClick={() => { setFeedbackType('revision_needed'); submitFeedbackMutation.mutate(); }}
                variant="destructive"
                className="flex-1"
                disabled={submitFeedbackMutation.isPending}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Request Revision
              </Button>
            </div>
          </div>
        );
      case 'needs_revision':
        return (
          <Button onClick={() => onStatusChange('ongoing')} className="w-full bg-cyan-500 hover:bg-cyan-600">
            <Play className="h-4 w-4 mr-2" />
            Continue Working
          </Button>
        );
      case 'completed':
        return (
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="font-medium text-green-700 dark:text-green-400">Task Completed!</p>
            {task.credits_awarded && (
              <div className="flex items-center justify-center gap-1 mt-2 text-yellow-600">
                <Star className="h-4 w-4 fill-current" />
                <span className="font-bold">{task.credits_awarded.toFixed(1)} credits awarded</span>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="font-mono">
              {task.task_number}
            </Badge>
            <Badge className={`
              ${task.status === 'completed' ? 'bg-green-500' :
                task.status === 'ongoing' ? 'bg-cyan-500' :
                task.status === 'pending_review' ? 'bg-amber-500' :
                task.status === 'needs_revision' ? 'bg-red-500' :
                'bg-gray-500'} text-white
            `}>
              {task.status?.replace('_', ' ')}
            </Badge>
          </div>
          <DialogTitle className="text-xl mt-2">{task.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Description */}
          {task.description && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Description</h4>
              <p className="text-sm">{task.description}</p>
            </div>
          )}

          <Separator />

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {task.category && (
              <div>
                <span className="text-muted-foreground">Category:</span>
                <p className="font-medium">{task.category.category_name}</p>
              </div>
            )}
            {task.companies && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{task.companies.name}</span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Priority:</span>
              <Badge className={`ml-2 ${
                task.priority === 'urgent' ? 'bg-red-500' :
                task.priority === 'high' ? 'bg-orange-500' :
                task.priority === 'medium' ? 'bg-yellow-500' :
                'bg-green-500'
              } text-white`}>
                {task.priority}
              </Badge>
            </div>
            {task.assigned_hours && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{task.assigned_hours} hours allocated</span>
              </div>
            )}
            {task.deadline && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Due: {format(new Date(task.deadline), 'MMM d, yyyy')}</span>
              </div>
            )}
            {task.started_at && (
              <div className="flex items-center gap-2">
                <Play className="h-4 w-4 text-muted-foreground" />
                <span>Started: {format(new Date(task.started_at), 'MMM d, yyyy HH:mm')}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Assignees */}
          {task.assignees && task.assignees.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Users className="h-4 w-4" />
                Assigned Team Members
              </h4>
              <div className="flex flex-wrap gap-2">
                {task.assignees.map((assignee: any) => (
                  <Badge key={assignee.id} variant="secondary" className="py-1 px-3">
                    {assignee.member?.display_name || 'Unknown'}
                    <span className="ml-1 text-xs opacity-70">({assignee.role})</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Actions */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3">Actions</h4>
            {getStatusActions()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
