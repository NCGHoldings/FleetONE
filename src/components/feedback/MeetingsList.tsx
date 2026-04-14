import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFeedbackMeetings, useFeedbackLevels, FeedbackMeeting } from '@/hooks/useFeedbackModule';
import { Calendar, Clock, Users, Play, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

interface MeetingsListProps {
  onMeetingClick: (meeting: FeedbackMeeting) => void;
  onStartMeeting: (meeting: FeedbackMeeting) => void;
  levelFilter?: number;
  statusFilter?: string;
}

export const MeetingsList: React.FC<MeetingsListProps> = ({ 
  onMeetingClick, 
  onStartMeeting,
  levelFilter,
  statusFilter 
}) => {
  const { data: meetings = [], isLoading } = useFeedbackMeetings({ 
    level: levelFilter, 
    status: statusFilter 
  });
  const { data: levels = [] } = useFeedbackLevels();
  
  const getLevelInfo = (levelNumber: number) => {
    return levels.find(l => l.level_number === levelNumber);
  };
  
  const statusConfig = {
    scheduled: { 
      label: 'Scheduled', 
      icon: <Calendar className="h-3 w-3" />,
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    },
    in_progress: { 
      label: 'In Progress', 
      icon: <Play className="h-3 w-3" />,
      className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
    },
    completed: { 
      label: 'Completed', 
      icon: <CheckCircle2 className="h-3 w-3" />,
      className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    },
    cancelled: { 
      label: 'Cancelled', 
      icon: <XCircle className="h-3 w-3" />,
      className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    }
  };
  
  const meetingTypeLabels: Record<string, string> = {
    weekly_staff: 'Weekly Staff',
    supervisor_review: 'Supervisor Review',
    management_meeting: 'Management',
    executive_review: 'Executive',
    emergency: 'Emergency'
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (meetings.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No meetings found</h3>
          <p className="text-muted-foreground text-sm">
            Schedule a new meeting to get started
          </p>
        </CardContent>
      </Card>
    );
  }
  
  // Group meetings by date
  const groupedMeetings = meetings.reduce((acc, meeting) => {
    const date = meeting.meeting_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(meeting);
    return acc;
  }, {} as Record<string, FeedbackMeeting[]>);
  
  return (
    <ScrollArea className="h-[600px]">
      <div className="space-y-6 pr-4">
        {Object.entries(groupedMeetings).map(([date, dateMeetings]) => (
          <div key={date}>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">
              {format(new Date(date), 'EEEE, MMMM d, yyyy')}
            </h3>
            <div className="space-y-3">
              {dateMeetings.map(meeting => {
                const levelInfo = getLevelInfo(meeting.level);
                const status = statusConfig[meeting.status];
                
                return (
                  <Card 
                    key={meeting.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => onMeetingClick(meeting)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge 
                              variant="outline"
                              style={{ 
                                borderColor: levelInfo?.color_code, 
                                color: levelInfo?.color_code 
                              }}
                            >
                              Level {meeting.level}
                            </Badge>
                            <Badge className={status.className}>
                              {status.icon}
                              <span className="ml-1">{status.label}</span>
                            </Badge>
                          </div>
                          
                          <h4 className="font-medium">
                            {meeting.title || `${levelInfo?.level_name} Meeting`}
                          </h4>
                          
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {meeting.meeting_time || 'TBD'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {meetingTypeLabels[meeting.meeting_type] || meeting.meeting_type}
                            </span>
                            {meeting.conducted_by_name && (
                              <span>by {meeting.conducted_by_name}</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {meeting.status === 'scheduled' && (
                            <Button 
                              size="sm" 
                              onClick={(e) => {
                                e.stopPropagation();
                                onStartMeeting(meeting);
                              }}
                            >
                              <Play className="h-4 w-4 mr-1" />
                              Start
                            </Button>
                          )}
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
};
