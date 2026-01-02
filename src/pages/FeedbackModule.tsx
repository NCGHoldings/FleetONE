import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  useFeedbackStats, 
  useFeedbackLevels, 
  FeedbackMeeting, 
  FeedbackItem 
} from '@/hooks/useFeedbackModule';
import { FeedbackFlowDashboard } from '@/components/feedback/FeedbackFlowDashboard';
import { MeetingsList } from '@/components/feedback/MeetingsList';
import { MeetingExecutionPanel } from '@/components/feedback/MeetingExecutionPanel';
import { TransparencyPanel } from '@/components/feedback/TransparencyPanel';
import { CreateMeetingDialog } from '@/components/feedback/CreateMeetingDialog';
import { NewFeedbackItemForm } from '@/components/feedback/NewFeedbackItemForm';
import { FeedbackItemDetail } from '@/components/feedback/FeedbackItemDetail';
import { 
  Plus, 
  Calendar, 
  LayoutGrid, 
  Eye, 
  TrendingUp,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUp
} from 'lucide-react';

const FeedbackModule: React.FC = () => {
  const { data: stats } = useFeedbackStats();
  const { data: levels = [] } = useFeedbackLevels();
  
  const [activeTab, setActiveTab] = useState('flow');
  const [showCreateMeeting, setShowCreateMeeting] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<FeedbackMeeting | null>(null);
  const [selectedItem, setSelectedItem] = useState<FeedbackItem | null>(null);
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const handleMeetingClick = (meeting: FeedbackMeeting) => {
    setSelectedMeeting(meeting);
  };
  
  const handleStartMeeting = (meeting: FeedbackMeeting) => {
    setSelectedMeeting(meeting);
  };
  
  const handleItemClick = (item: FeedbackItem) => {
    setSelectedItem(item);
  };
  
  // Stats cards data
  const statCards = [
    {
      title: 'Total Items',
      value: stats?.totalItems || 0,
      icon: <TrendingUp className="h-5 w-5" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30'
    },
    {
      title: 'Pending',
      value: stats?.pendingItems || 0,
      icon: <Clock className="h-5 w-5" />,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30'
    },
    {
      title: 'Resolved',
      value: stats?.resolvedItems || 0,
      icon: <CheckCircle2 className="h-5 w-5" />,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/30'
    },
    {
      title: 'Escalated',
      value: stats?.escalatedItems || 0,
      icon: <ArrowUp className="h-5 w-5" />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30'
    },
    {
      title: 'Resolution Rate',
      value: `${stats?.resolutionRate || 0}%`,
      icon: <TrendingUp className="h-5 w-5" />,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30'
    },
    {
      title: 'Meetings',
      value: stats?.totalMeetings || 0,
      icon: <Users className="h-5 w-5" />,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100 dark:bg-indigo-900/30'
    }
  ];
  
  // If a meeting is selected, show the execution panel
  if (selectedMeeting) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setSelectedMeeting(null)}>
            ← Back to Feedback Module
          </Button>
        </div>
        <MeetingExecutionPanel 
          meeting={selectedMeeting} 
          onClose={() => setSelectedMeeting(null)} 
        />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Feedback Flow Module</h1>
          <p className="text-muted-foreground">
            Hierarchical feedback tracking with complete transparency
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAddItem(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
          <Button onClick={() => setShowCreateMeeting(true)}>
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Meeting
          </Button>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index}>
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
      
      {/* Level Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {levels.map(level => {
          const levelStats = stats?.itemsByLevel[level.level_number] || { pending: 0, resolved: 0, total: 0 };
          return (
            <Card key={level.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div 
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${level.color_code}20` }}
                  >
                    <Users className="h-5 w-5" style={{ color: level.color_code }} />
                  </div>
                  <div>
                    <p className="font-medium">Level {level.level_number}</p>
                    <p className="text-xs text-muted-foreground">{level.level_name}</p>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <div>
                    <span className="font-bold" style={{ color: level.color_code }}>{levelStats.pending}</span>
                    <span className="text-muted-foreground ml-1">pending</span>
                  </div>
                  <div>
                    <span className="font-bold text-green-600">{levelStats.resolved}</span>
                    <span className="text-muted-foreground ml-1">resolved</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="flow" className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            Flow Dashboard
          </TabsTrigger>
          <TabsTrigger value="meetings" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Meetings
          </TabsTrigger>
          <TabsTrigger value="transparency" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Transparency View
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="flow" className="mt-6">
          <FeedbackFlowDashboard onItemClick={handleItemClick} />
        </TabsContent>
        
        <TabsContent value="meetings" className="mt-6">
          <div className="flex gap-4 mb-4">
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {levels.map(level => (
                  <SelectItem key={level.id} value={level.level_number.toString()}>
                    Level {level.level_number} - {level.level_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <MeetingsList 
            onMeetingClick={handleMeetingClick}
            onStartMeeting={handleStartMeeting}
            levelFilter={levelFilter !== 'all' ? parseInt(levelFilter) : undefined}
            statusFilter={statusFilter !== 'all' ? statusFilter : undefined}
          />
        </TabsContent>
        
        <TabsContent value="transparency" className="mt-6">
          <TransparencyPanel onItemClick={handleItemClick} />
        </TabsContent>
      </Tabs>
      
      {/* Dialogs */}
      <CreateMeetingDialog 
        open={showCreateMeeting} 
        onOpenChange={setShowCreateMeeting} 
      />
      
      <NewFeedbackItemForm 
        open={showAddItem} 
        onOpenChange={setShowAddItem} 
      />
      
      <FeedbackItemDetail 
        item={selectedItem}
        open={!!selectedItem}
        onOpenChange={(open) => !open && setSelectedItem(null)}
      />
    </div>
  );
};

export default FeedbackModule;
