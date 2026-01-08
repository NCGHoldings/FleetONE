import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Star, Trophy, CheckCircle, Clock, AlertCircle, 
  TrendingUp, Calendar, Briefcase, Target
} from "lucide-react";
import { format } from "date-fns";

interface MemberProfileModalProps {
  member: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MemberProfileModal = ({ member, open, onOpenChange }: MemberProfileModalProps) => {
  const [activeTab, setActiveTab] = useState("overview");

  const { data: memberTasks } = useQuery({
    queryKey: ['member-tasks', member?.id],
    queryFn: async () => {
      if (!member?.id) return [];
      const { data, error } = await supabase
        .from('marketing_task_assignees')
        .select(`
          *,
          task:task_id (
            id, title, task_number, status, priority,
            deadline, created_at, completed_at, credits_awarded,
            category:category_id (category_name)
          )
        `)
        .eq('member_id', member.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!member?.id && open
  });

  if (!member) return null;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const tasksByStatus = {
    completed: memberTasks?.filter(t => t.task?.status === 'completed') || [],
    ongoing: memberTasks?.filter(t => ['ongoing', 'assigned'].includes(t.task?.status)) || [],
    due: memberTasks?.filter(t => t.task?.deadline && new Date(t.task.deadline) < new Date() && t.task?.status !== 'completed') || [],
    pending: memberTasks?.filter(t => t.task?.status === 'pending_review') || [],
  };

  const completionRate = memberTasks?.length 
    ? Math.round((tasksByStatus.completed.length / memberTasks.length) * 100) 
    : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'ongoing': case 'assigned': return 'bg-blue-500';
      case 'pending_review': return 'bg-amber-500';
      case 'needs_revision': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-3 w-3" />;
      case 'ongoing': case 'assigned': return <Clock className="h-3 w-3" />;
      case 'pending_review': return <Target className="h-3 w-3" />;
      case 'needs_revision': return <AlertCircle className="h-3 w-3" />;
      default: return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">Member Profile</DialogTitle>
        </DialogHeader>
        
        {/* Profile Header */}
        <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 rounded-xl p-6 text-white">
          <div className="flex items-start gap-6">
            <Avatar className="w-24 h-24 ring-4 ring-white/30">
              <AvatarImage src={member.avatar_url || ''} />
              <AvatarFallback className="text-2xl font-bold bg-white/20 text-white">
                {getInitials(member.display_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{member.display_name}</h2>
              <p className="text-white/80">{member.designation || 'Marketing Team Member'}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                {member.is_task_assigner && (
                  <Badge className="bg-white/20 text-white border-white/30">Task Assigner</Badge>
                )}
                {member.is_task_confirmer && (
                  <Badge className="bg-white/20 text-white border-white/30">Task Confirmer</Badge>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end">
                <Star className="h-8 w-8 fill-yellow-300 text-yellow-300" />
                <span className="text-4xl font-bold">{member.total_credits || 0}</span>
              </div>
              <p className="text-white/80 text-sm">Total Credits</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 my-6">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200">
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold text-green-700">{tasksByStatus.completed.length}</p>
              <p className="text-sm text-green-600">Completed</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200">
            <CardContent className="p-4 text-center">
              <Clock className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold text-blue-700">{tasksByStatus.ongoing.length}</p>
              <p className="text-sm text-blue-600">Ongoing</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-red-200">
            <CardContent className="p-4 text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-500" />
              <p className="text-2xl font-bold text-red-700">{tasksByStatus.due.length}</p>
              <p className="text-sm text-red-600">Overdue</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200">
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-purple-500" />
              <p className="text-2xl font-bold text-purple-700">{completionRate}%</p>
              <p className="text-sm text-purple-600">Completion Rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="ongoing">Ongoing</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-4">
            {/* Bio */}
            {member.bio && (
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" />
                    About
                  </h4>
                  <p className="text-muted-foreground">{member.bio}</p>
                </CardContent>
              </Card>
            )}

            {/* Skills */}
            {member.skills && member.skills.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-3">Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {member.skills.map((skill: string, i: number) => (
                      <Badge key={i} variant="secondary" className="bg-primary/10 text-primary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Performance Summary */}
            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  Performance
                </h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Task Completion</span>
                      <span>{completionRate}%</span>
                    </div>
                    <Progress value={completionRate} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="completed" className="mt-4">
            <div className="space-y-2">
              {tasksByStatus.completed.length > 0 ? (
                tasksByStatus.completed.map((item: any) => (
                  <Card key={item.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className={`w-2 h-12 rounded-full ${getStatusColor(item.task?.status)}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            {item.task?.task_number}
                          </Badge>
                          {item.task?.category && (
                            <Badge variant="secondary" className="text-xs">
                              {item.task.category.category_name}
                            </Badge>
                          )}
                        </div>
                        <p className="font-medium mt-1">{item.task?.title}</p>
                        {item.task?.completed_at && (
                          <p className="text-xs text-muted-foreground">
                            Completed {format(new Date(item.task.completed_at), 'PPP')}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-yellow-600">
                          <Star className="h-4 w-4 fill-current" />
                          <span className="font-bold">{item.credits_earned || 0}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Credits</p>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No completed tasks yet
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="ongoing" className="mt-4">
            <div className="space-y-2">
              {tasksByStatus.ongoing.length > 0 ? (
                tasksByStatus.ongoing.map((item: any) => (
                  <Card key={item.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className={`w-2 h-12 rounded-full ${getStatusColor(item.task?.status)}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-xs">
                            {item.task?.task_number}
                          </Badge>
                          <Badge className={`text-xs ${getStatusColor(item.task?.status)} text-white`}>
                            {getStatusIcon(item.task?.status)}
                            <span className="ml-1">{item.task?.status?.replace('_', ' ')}</span>
                          </Badge>
                        </div>
                        <p className="font-medium mt-1">{item.task?.title}</p>
                        {item.task?.deadline && (
                          <p className="text-xs text-muted-foreground">
                            Due {format(new Date(item.task.deadline), 'PPP')}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No ongoing tasks
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="mt-4">
            <div className="relative pl-8 space-y-4">
              <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-500 via-pink-500 to-rose-500" />
              {memberTasks && memberTasks.length > 0 ? (
                memberTasks.slice(0, 10).map((item: any, index: number) => (
                  <div key={item.id} className="relative">
                    <div className={`absolute -left-5 w-4 h-4 rounded-full border-2 border-white ${getStatusColor(item.task?.status)}`} />
                    <Card className="ml-4">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <Badge variant="outline" className="font-mono text-xs mb-1">
                              {item.task?.task_number}
                            </Badge>
                            <p className="font-medium text-sm">{item.task?.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(item.created_at), 'PPP')}
                            </p>
                          </div>
                          <Badge className={`${getStatusColor(item.task?.status)} text-white`}>
                            {item.task?.status?.replace('_', ' ')}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground ml-4">
                  No task history
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};