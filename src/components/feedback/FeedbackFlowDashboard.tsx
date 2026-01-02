import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFeedbackLevels, useFeedbackItems, FeedbackItem, FeedbackLevel } from '@/hooks/useFeedbackModule';
import { Users, UserCheck, Briefcase, Crown, Clock, CheckCircle2, AlertTriangle, ArrowUp } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

const iconMap: Record<string, React.ReactNode> = {
  users: <Users className="h-5 w-5" />,
  'user-check': <UserCheck className="h-5 w-5" />,
  briefcase: <Briefcase className="h-5 w-5" />,
  crown: <Crown className="h-5 w-5" />
};

interface FeedbackItemCardProps {
  item: FeedbackItem;
  level: FeedbackLevel;
  onClick: (item: FeedbackItem) => void;
}

const FeedbackItemCard: React.FC<FeedbackItemCardProps> = ({ item, level, onClick }) => {
  const daysAtLevel = differenceInDays(new Date(), new Date(item.updated_at));
  const isOverdue = daysAtLevel > level.sla_days;
  
  const priorityColors = {
    low: 'bg-muted text-muted-foreground',
    medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  };
  
  const statusIcons = {
    pending: <Clock className="h-3 w-3" />,
    in_progress: <AlertTriangle className="h-3 w-3" />,
    escalated: <ArrowUp className="h-3 w-3" />,
    resolved: <CheckCircle2 className="h-3 w-3" />,
    closed: <CheckCircle2 className="h-3 w-3" />
  };
  
  return (
    <Card 
      className={`cursor-pointer hover:shadow-md transition-shadow ${isOverdue ? 'border-destructive' : ''}`}
      onClick={() => onClick(item)}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4 className="font-medium text-sm line-clamp-2">{item.title}</h4>
          <Badge variant="outline" className={priorityColors[item.priority]}>
            {item.priority}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          {statusIcons[item.status]}
          <span className="capitalize">{item.status.replace('_', ' ')}</span>
          <span>•</span>
          <span className={isOverdue ? 'text-destructive font-medium' : ''}>
            {daysAtLevel} day{daysAtLevel !== 1 ? 's' : ''} at this level
          </span>
        </div>
        
        {item.raised_by_name && (
          <p className="text-xs text-muted-foreground">
            Raised by: {item.raised_by_name}
          </p>
        )}
        
        {isOverdue && (
          <Badge variant="destructive" className="mt-2 text-xs">
            Overdue by {daysAtLevel - level.sla_days} days
          </Badge>
        )}
      </CardContent>
    </Card>
  );
};

interface LevelColumnProps {
  level: FeedbackLevel;
  items: FeedbackItem[];
  onItemClick: (item: FeedbackItem) => void;
}

const LevelColumn: React.FC<LevelColumnProps> = ({ level, items, onItemClick }) => {
  const pendingItems = items.filter(i => i.status !== 'resolved' && i.status !== 'closed');
  const resolvedItems = items.filter(i => i.status === 'resolved' || i.status === 'closed');
  
  return (
    <div className="flex-1 min-w-[280px] max-w-[350px]">
      <Card className="h-full">
        <CardHeader className="pb-2" style={{ borderBottom: `3px solid ${level.color_code}` }}>
          <div className="flex items-center gap-2">
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: `${level.color_code}20` }}
            >
              <span style={{ color: level.color_code }}>
                {iconMap[level.icon] || <Users className="h-5 w-5" />}
              </span>
            </div>
            <div>
              <CardTitle className="text-base">Level {level.level_number}</CardTitle>
              <p className="text-sm text-muted-foreground">{level.level_name}</p>
            </div>
          </div>
          
          <div className="flex gap-4 mt-2">
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: level.color_code }}>{pendingItems.length}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{resolvedItems.length}</p>
              <p className="text-xs text-muted-foreground">Resolved</p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-2">
          <ScrollArea className="h-[400px]">
            <div className="space-y-2 pr-2">
              {pendingItems.length === 0 && resolvedItems.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">
                  No items at this level
                </p>
              ) : (
                <>
                  {pendingItems.map(item => (
                    <FeedbackItemCard 
                      key={item.id} 
                      item={item} 
                      level={level}
                      onClick={onItemClick}
                    />
                  ))}
                  
                  {resolvedItems.length > 0 && (
                    <>
                      <div className="flex items-center gap-2 my-2">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-xs text-muted-foreground">Resolved</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                      {resolvedItems.slice(0, 3).map(item => (
                        <FeedbackItemCard 
                          key={item.id} 
                          item={item} 
                          level={level}
                          onClick={onItemClick}
                        />
                      ))}
                      {resolvedItems.length > 3 && (
                        <p className="text-center text-xs text-muted-foreground py-2">
                          +{resolvedItems.length - 3} more resolved
                        </p>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

interface FeedbackFlowDashboardProps {
  onItemClick: (item: FeedbackItem) => void;
}

export const FeedbackFlowDashboard: React.FC<FeedbackFlowDashboardProps> = ({ onItemClick }) => {
  const { data: levels = [] } = useFeedbackLevels();
  const { data: items = [] } = useFeedbackItems();
  
  const getItemsForLevel = (levelNumber: number) => {
    return items.filter(item => item.current_level === levelNumber);
  };
  
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {levels.map(level => (
        <LevelColumn
          key={level.id}
          level={level}
          items={getItemsForLevel(level.level_number)}
          onItemClick={onItemClick}
        />
      ))}
    </div>
  );
};
