import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FeedbackItem, 
  useFeedbackItemHistory, 
  useFeedbackLevels,
  useResolveFeedbackItem,
  useEscalateFeedbackItem,
  useUpdateFeedbackItem
} from '@/hooks/useFeedbackModule';
import { 
  Clock, 
  CheckCircle2, 
  ArrowUp, 
  MessageSquare, 
  User,
  Calendar,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

interface FeedbackItemDetailProps {
  item: FeedbackItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FeedbackItemDetail: React.FC<FeedbackItemDetailProps> = ({ item, open, onOpenChange }) => {
  const { data: history = [] } = useFeedbackItemHistory(item?.id || '');
  const { data: levels = [] } = useFeedbackLevels();
  const resolveMutation = useResolveFeedbackItem();
  const escalateMutation = useEscalateFeedbackItem();
  const updateMutation = useUpdateFeedbackItem();
  
  const [action, setAction] = useState<'resolve' | 'escalate' | 'update' | null>(null);
  const [actionText, setActionText] = useState('');
  
  if (!item) return null;
  
  const currentLevel = levels.find(l => l.level_number === item.current_level);
  const canEscalate = currentLevel?.can_escalate_to !== null;
  const daysAtLevel = differenceInDays(new Date(), new Date(item.updated_at));
  
  const priorityColors = {
    low: 'bg-muted text-muted-foreground',
    medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  };
  
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    escalated: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    closed: 'bg-muted text-muted-foreground'
  };
  
  const actionIcons: Record<string, React.ReactNode> = {
    created: <FileText className="h-4 w-4 text-blue-500" />,
    updated: <MessageSquare className="h-4 w-4 text-yellow-500" />,
    escalated: <ArrowUp className="h-4 w-4 text-purple-500" />,
    resolved: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    commented: <MessageSquare className="h-4 w-4 text-muted-foreground" />,
    assigned: <User className="h-4 w-4 text-blue-500" />,
    status_changed: <AlertTriangle className="h-4 w-4 text-orange-500" />
  };
  
  const handleAction = async () => {
    if (!actionText.trim()) return;
    
    if (action === 'resolve') {
      await resolveMutation.mutateAsync({ id: item.id, resolution: actionText });
    } else if (action === 'escalate') {
      await escalateMutation.mutateAsync({ 
        id: item.id, 
        currentLevel: item.current_level, 
        reason: actionText 
      });
    } else if (action === 'update') {
      await updateMutation.mutateAsync({
        id: item.id,
        action_taken: actionText,
        previousStatus: item.status,
        actionType: 'updated',
        actionNotes: actionText
      });
    }
    
    setAction(null);
    setActionText('');
    onOpenChange(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-lg">{item.title}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Item #{item.item_number} • Created {format(new Date(item.created_at), 'PPP')}
              </p>
            </div>
            <div className="flex gap-2">
              <Badge className={priorityColors[item.priority]}>
                {item.priority}
              </Badge>
              <Badge className={statusColors[item.status]}>
                {item.status.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-4">
            {/* Item Details */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Raised by:</span>
                <span>{item.raised_by_name || 'Unknown'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">At level:</span>
                <span>{daysAtLevel} days</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Current Level:</span>
                <Badge 
                  variant="outline" 
                  style={{ borderColor: currentLevel?.color_code, color: currentLevel?.color_code }}
                >
                  Level {item.current_level} - {currentLevel?.level_name}
                </Badge>
              </div>
              {item.assigned_to_name && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Assigned to:</span>
                  <span>{item.assigned_to_name}</span>
                </div>
              )}
            </div>
            
            {item.description && (
              <div>
                <Label className="text-muted-foreground">Description</Label>
                <p className="mt-1 text-sm">{item.description}</p>
              </div>
            )}
            
            {item.action_taken && (
              <div>
                <Label className="text-muted-foreground">Action Taken</Label>
                <p className="mt-1 text-sm">{item.action_taken}</p>
              </div>
            )}
            
            {item.resolution && (
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                <Label className="text-green-700 dark:text-green-400">Resolution</Label>
                <p className="mt-1 text-sm">{item.resolution}</p>
              </div>
            )}
            
            {item.escalation_reason && (
              <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                <Label className="text-purple-700 dark:text-purple-400">Escalation Reason</Label>
                <p className="mt-1 text-sm">{item.escalation_reason}</p>
              </div>
            )}
            
            <Separator />
            
            {/* Timeline */}
            <div>
              <Label className="text-muted-foreground mb-3 block">Activity Timeline</Label>
              <div className="relative">
                <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />
                <div className="space-y-4">
                  {history.map((entry, index) => (
                    <div key={entry.id} className="flex gap-3 relative">
                      <div className="w-6 h-6 rounded-full bg-background border-2 border-border flex items-center justify-center z-10">
                        {actionIcons[entry.action_type] || <Clock className="h-3 w-3" />}
                      </div>
                      <div className="flex-1 pt-0.5">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium capitalize">
                            {entry.action_type.replace('_', ' ')}
                          </span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground">
                            Level {entry.level}
                          </span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(entry.created_at), 'PPp')}
                          </span>
                        </div>
                        {entry.notes && (
                          <p className="text-sm text-muted-foreground mt-1">{entry.notes}</p>
                        )}
                        {entry.action_by_name && (
                          <p className="text-xs text-muted-foreground mt-1">
                            by {entry.action_by_name}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Action Form */}
            {action && (
              <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                <Label>
                  {action === 'resolve' && 'Resolution Details'}
                  {action === 'escalate' && 'Escalation Reason'}
                  {action === 'update' && 'Update Notes'}
                </Label>
                <Textarea
                  value={actionText}
                  onChange={(e) => setActionText(e.target.value)}
                  placeholder={
                    action === 'resolve' ? 'Describe how this was resolved...' :
                    action === 'escalate' ? 'Why is this being escalated to the next level?' :
                    'Add an update or action taken...'
                  }
                  rows={3}
                />
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={handleAction}
                    disabled={!actionText.trim()}
                  >
                    Submit
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      setAction(null);
                      setActionText('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        
        {item.status !== 'resolved' && item.status !== 'closed' && !action && (
          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={() => setAction('update')}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Add Update
            </Button>
            {canEscalate && (
              <Button variant="outline" onClick={() => setAction('escalate')}>
                <ArrowUp className="h-4 w-4 mr-2" />
                Escalate
              </Button>
            )}
            <Button onClick={() => setAction('resolve')}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark Resolved
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
