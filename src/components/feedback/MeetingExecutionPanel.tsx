import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FeedbackMeeting, 
  FeedbackItem,
  useFeedbackItems, 
  useFeedbackLevels,
  useUpdateMeeting,
  useResolveFeedbackItem,
  useEscalateFeedbackItem,
  useUpdateFeedbackItem
} from '@/hooks/useFeedbackModule';
import { NewFeedbackItemForm } from './NewFeedbackItemForm';
import { 
  Play, 
  CheckCircle2, 
  ArrowUp, 
  Clock, 
  Plus,
  AlertTriangle,
  MessageSquare,
  Save
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

interface MeetingExecutionPanelProps {
  meeting: FeedbackMeeting;
  onClose: () => void;
}

export const MeetingExecutionPanel: React.FC<MeetingExecutionPanelProps> = ({ meeting, onClose }) => {
  const { data: levels = [] } = useFeedbackLevels();
  const { data: allItems = [] } = useFeedbackItems();
  const updateMeeting = useUpdateMeeting();
  const resolveMutation = useResolveFeedbackItem();
  const escalateMutation = useEscalateFeedbackItem();
  const updateItemMutation = useUpdateFeedbackItem();
  
  const [showAddItem, setShowAddItem] = useState(false);
  const [summary, setSummary] = useState(meeting.summary || '');
  const [actionItem, setActionItem] = useState<{ id: string; type: 'resolve' | 'escalate' | 'update'; text: string } | null>(null);
  
  const currentLevel = levels.find(l => l.level_number === meeting.level);
  
  // Get carry-forward items (pending items at or below this level)
  const carryForwardItems = allItems.filter(
    item => item.current_level <= meeting.level && 
            item.status !== 'resolved' && 
            item.status !== 'closed'
  );
  
  // Get items created in this meeting
  const meetingItems = allItems.filter(item => item.meeting_id === meeting.id);
  
  const handleStartMeeting = async () => {
    await updateMeeting.mutateAsync({
      id: meeting.id,
      status: 'in_progress'
    });
  };
  
  const handleCompleteMeeting = async () => {
    await updateMeeting.mutateAsync({
      id: meeting.id,
      status: 'completed',
      summary
    });
    onClose();
  };
  
  const handleItemAction = async () => {
    if (!actionItem || !actionItem.text.trim()) return;
    
    const item = allItems.find(i => i.id === actionItem.id);
    if (!item) return;
    
    if (actionItem.type === 'resolve') {
      await resolveMutation.mutateAsync({ id: actionItem.id, resolution: actionItem.text });
    } else if (actionItem.type === 'escalate') {
      await escalateMutation.mutateAsync({ 
        id: actionItem.id, 
        currentLevel: item.current_level, 
        reason: actionItem.text 
      });
    } else if (actionItem.type === 'update') {
      await updateItemMutation.mutateAsync({
        id: actionItem.id,
        action_taken: actionItem.text,
        previousStatus: item.status,
        actionType: 'updated',
        actionNotes: actionItem.text
      });
    }
    
    setActionItem(null);
  };
  
  const ItemCard: React.FC<{ item: FeedbackItem }> = ({ item }) => {
    const daysAtLevel = differenceInDays(new Date(), new Date(item.updated_at));
    const itemLevel = levels.find(l => l.level_number === item.current_level);
    
    const priorityColors = {
      low: 'bg-muted text-muted-foreground',
      medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    };
    
    const isActiveAction = actionItem?.id === item.id;
    
    return (
      <Card className={`${isActiveAction ? 'ring-2 ring-primary' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <h4 className="font-medium">{item.title}</h4>
              {item.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {item.description}
                </p>
              )}
            </div>
            <div className="flex gap-1">
              <Badge className={priorityColors[item.priority]} variant="outline">
                {item.priority}
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {daysAtLevel} days at Level {item.current_level}
            </span>
            {item.raised_by_name && (
              <span>Raised by: {item.raised_by_name}</span>
            )}
          </div>
          
          {item.action_taken && (
            <div className="bg-muted/50 p-2 rounded text-sm mb-3">
              <span className="font-medium">Last action: </span>
              {item.action_taken}
            </div>
          )}
          
          {isActiveAction ? (
            <div className="space-y-2">
              <Textarea
                value={actionItem.text}
                onChange={(e) => setActionItem({ ...actionItem, text: e.target.value })}
                placeholder={
                  actionItem.type === 'resolve' ? 'Resolution details...' :
                  actionItem.type === 'escalate' ? 'Escalation reason...' :
                  'Update notes...'
                }
                rows={2}
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleItemAction} disabled={!actionItem.text.trim()}>
                  Submit
                </Button>
                <Button size="sm" variant="outline" onClick={() => setActionItem(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setActionItem({ id: item.id, type: 'update', text: '' })}
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                Update
              </Button>
              {itemLevel?.can_escalate_to && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setActionItem({ id: item.id, type: 'escalate', text: '' })}
                >
                  <ArrowUp className="h-3 w-3 mr-1" />
                  Escalate
                </Button>
              )}
              <Button 
                size="sm"
                onClick={() => setActionItem({ id: item.id, type: 'resolve', text: '' })}
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Resolve
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };
  
  return (
    <div className="space-y-6">
      {/* Meeting Header */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {meeting.title || `${currentLevel?.level_name} Meeting`}
                <Badge 
                  variant="outline"
                  style={{ borderColor: currentLevel?.color_code, color: currentLevel?.color_code }}
                >
                  Level {meeting.level}
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {format(new Date(meeting.meeting_date), 'EEEE, MMMM d, yyyy')}
                {meeting.meeting_time && ` at ${meeting.meeting_time}`}
              </p>
            </div>
            
            <div className="flex gap-2">
              {meeting.status === 'scheduled' && (
                <Button onClick={handleStartMeeting}>
                  <Play className="h-4 w-4 mr-2" />
                  Start Meeting
                </Button>
              )}
              {meeting.status === 'in_progress' && (
                <Button onClick={handleCompleteMeeting} variant="default">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Complete Meeting
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>
      
      {meeting.status === 'in_progress' && (
        <>
          {/* Carry Forward Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Carry Forward Items ({carryForwardItems.length})
                </CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                Unresolved items from previous meetings that need attention
              </p>
            </CardHeader>
            <CardContent>
              {carryForwardItems.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No carry-forward items - all previous items resolved! 🎉
                </p>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3 pr-4">
                    {carryForwardItems.map(item => (
                      <ItemCard key={item.id} item={item} />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
          
          <Separator />
          
          {/* New Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Plus className="h-5 w-5 text-green-500" />
                  New Items ({meetingItems.length})
                </CardTitle>
                <Button onClick={() => setShowAddItem(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Item
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                New feedback and issues raised in this meeting
              </p>
            </CardHeader>
            <CardContent>
              {meetingItems.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No new items added yet</p>
                  <Button variant="outline" onClick={() => setShowAddItem(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Item
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-3 pr-4">
                    {meetingItems.map(item => (
                      <ItemCard key={item.id} item={item} />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
          
          {/* Meeting Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Save className="h-5 w-5" />
                Meeting Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Add meeting summary and key decisions..."
                rows={4}
              />
            </CardContent>
          </Card>
        </>
      )}
      
      {meeting.status === 'completed' && (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium">Meeting Completed</h3>
            {meeting.summary && (
              <div className="mt-4 text-left bg-muted/50 p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">Summary:</p>
                <p className="text-sm text-muted-foreground">{meeting.summary}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      <NewFeedbackItemForm
        open={showAddItem}
        onOpenChange={setShowAddItem}
        defaultLevel={meeting.level}
        meetingId={meeting.id}
      />
    </div>
  );
};
