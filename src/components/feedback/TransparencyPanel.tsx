import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFeedbackItems, useFeedbackLevels, FeedbackItem } from '@/hooks/useFeedbackModule';
import { Search, Clock, AlertTriangle, CheckCircle2, ArrowUp, Eye, Filter } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

interface TransparencyPanelProps {
  onItemClick: (item: FeedbackItem) => void;
}

export const TransparencyPanel: React.FC<TransparencyPanelProps> = ({ onItemClick }) => {
  const { data: items = [] } = useFeedbackItems();
  const { data: levels = [] } = useFeedbackLevels();
  
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'level'>('date');
  
  const getLevelInfo = (levelNumber: number) => {
    return levels.find(l => l.level_number === levelNumber);
  };
  
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  
  const filteredItems = items
    .filter(item => {
      if (search) {
        const searchLower = search.toLowerCase();
        if (!item.title.toLowerCase().includes(searchLower) && 
            !item.description?.toLowerCase().includes(searchLower) &&
            !item.raised_by_name?.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      if (levelFilter !== 'all' && item.current_level !== parseInt(levelFilter)) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'priority') {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      if (sortBy === 'level') {
        return b.current_level - a.current_level;
      }
      return 0;
    });
  
  const pendingItems = filteredItems.filter(i => i.status !== 'resolved' && i.status !== 'closed');
  const resolvedItems = filteredItems.filter(i => i.status === 'resolved' || i.status === 'closed');
  
  const statusIcons = {
    pending: <Clock className="h-4 w-4 text-yellow-500" />,
    in_progress: <AlertTriangle className="h-4 w-4 text-blue-500" />,
    escalated: <ArrowUp className="h-4 w-4 text-purple-500" />,
    resolved: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    closed: <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
  };
  
  const priorityColors = {
    low: 'bg-muted text-muted-foreground',
    medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  };
  
  const ItemRow: React.FC<{ item: FeedbackItem }> = ({ item }) => {
    const levelInfo = getLevelInfo(item.current_level);
    const daysOld = differenceInDays(new Date(), new Date(item.created_at));
    const isOverdue = levelInfo && daysOld > levelInfo.sla_days;
    
    return (
      <Card 
        className={`cursor-pointer hover:shadow-md transition-shadow ${isOverdue ? 'border-destructive' : ''}`}
        onClick={() => onItemClick(item)}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-1">
              {statusIcons[item.status]}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h4 className="font-medium truncate">{item.title}</h4>
                <div className="flex gap-1 flex-shrink-0">
                  <Badge 
                    variant="outline"
                    style={{ borderColor: levelInfo?.color_code, color: levelInfo?.color_code }}
                    className="text-xs"
                  >
                    L{item.current_level}
                  </Badge>
                  <Badge className={`${priorityColors[item.priority]} text-xs`}>
                    {item.priority}
                  </Badge>
                </div>
              </div>
              
              {item.description && (
                <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                  {item.description}
                </p>
              )}
              
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {daysOld} day{daysOld !== 1 ? 's' : ''} ago
                </span>
                {item.raised_by_name && (
                  <span>By: {item.raised_by_name}</span>
                )}
                {item.assigned_to_name && (
                  <span>Assigned: {item.assigned_to_name}</span>
                )}
                {isOverdue && (
                  <Badge variant="destructive" className="text-xs">
                    Overdue
                  </Badge>
                )}
              </div>
            </div>
            
            <Button variant="ghost" size="icon" className="flex-shrink-0">
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };
  
  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search items..."
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {levels.map(level => (
                  <SelectItem key={level.id} value={level.level_number.toString()}>
                    Level {level.level_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="escalated">Escalated</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date Created</SelectItem>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="level">Level</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">{filteredItems.length}</p>
            <p className="text-sm text-muted-foreground">Total Items</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-yellow-600">{pendingItems.length}</p>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{resolvedItems.length}</p>
            <p className="text-sm text-muted-foreground">Resolved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-red-600">
              {pendingItems.filter(i => {
                const level = getLevelInfo(i.current_level);
                const days = differenceInDays(new Date(), new Date(i.created_at));
                return level && days > level.sla_days;
              }).length}
            </p>
            <p className="text-sm text-muted-foreground">Overdue</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Items List */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Pending Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              Pending Items ({pendingItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-3 pr-4">
                {pendingItems.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No pending items
                  </p>
                ) : (
                  pendingItems.map(item => (
                    <ItemRow key={item.id} item={item} />
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
        
        {/* Resolved Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Resolved Items ({resolvedItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-3 pr-4">
                {resolvedItems.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No resolved items
                  </p>
                ) : (
                  resolvedItems.map(item => (
                    <ItemRow key={item.id} item={item} />
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
