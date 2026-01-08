import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Clock, Star, Target, Award, Zap } from "lucide-react";

export const MarketingDashboard = () => {
  const { data: tasks } = useQuery({
    queryKey: ['marketing-tasks-overview'],
    queryFn: async () => {
      const { data } = await supabase
        .from('marketing_tasks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    }
  });

  const { data: teamMembers } = useQuery({
    queryKey: ['marketing-team-credits'],
    queryFn: async () => {
      const { data } = await supabase
        .from('marketing_team_members')
        .select('*')
        .eq('is_active', true)
        .order('total_credits', { ascending: false })
        .limit(5);
      return data || [];
    }
  });

  const statusCounts = tasks?.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const totalTasks = tasks?.length || 0;
  const completedTasks = statusCounts['completed'] || 0;
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">Completion Rate</p>
                <p className="text-3xl font-bold">{completionRate.toFixed(1)}%</p>
              </div>
              <Target className="h-12 w-12 opacity-50" />
            </div>
            <Progress value={completionRate} className="mt-4 bg-white/20" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">Ongoing Tasks</p>
                <p className="text-3xl font-bold">{statusCounts['ongoing'] || 0}</p>
              </div>
              <Zap className="h-12 w-12 opacity-50" />
            </div>
            <p className="text-sm mt-2 opacity-80">Currently in progress</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">Pending Review</p>
                <p className="text-3xl font-bold">{statusCounts['pending_review'] || 0}</p>
              </div>
              <Clock className="h-12 w-12 opacity-50" />
            </div>
            <p className="text-sm mt-2 opacity-80">Awaiting confirmation</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              Task Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { status: 'planning', label: 'Planning', color: 'bg-gray-500' },
              { status: 'assigned', label: 'Assigned', color: 'bg-blue-500' },
              { status: 'ongoing', label: 'Ongoing', color: 'bg-cyan-500' },
              { status: 'pending_review', label: 'Pending Review', color: 'bg-amber-500' },
              { status: 'needs_revision', label: 'Needs Revision', color: 'bg-red-500' },
              { status: 'completed', label: 'Completed', color: 'bg-green-500' },
            ].map(({ status, label, color }) => {
              const count = statusCounts[status] || 0;
              const percentage = totalTasks > 0 ? (count / totalTasks) * 100 : 0;
              return (
                <div key={status} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${color}`} />
                      {label}
                    </span>
                    <span className="font-medium">{count}</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {teamMembers && teamMembers.length > 0 ? (
              <div className="space-y-4">
                {teamMembers.map((member, index) => (
                  <div 
                    key={member.id} 
                    className="flex items-center gap-4 p-3 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20"
                  >
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center font-bold text-white
                      ${index === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500' : 
                        index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400' : 
                        index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700' : 
                        'bg-gradient-to-br from-purple-500 to-pink-500'}
                    `}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{member.display_name}</p>
                      <p className="text-sm text-muted-foreground">{member.designation || 'Team Member'}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-yellow-600">
                        <Star className="h-4 w-4 fill-current" />
                        <span className="font-bold">{member.total_credits}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">credits</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Award className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No team members yet</p>
              <p className="text-sm">Add team members to see rankings</p>
            </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Tasks */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {tasks && tasks.length > 0 ? (
            <div className="space-y-3">
              {tasks.slice(0, 5).map((task) => (
                <div 
                  key={task.id} 
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {task.task_number}
                      </Badge>
                      <span className="font-medium">{task.title}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                      {task.description || 'No description'}
                    </p>
                  </div>
                  <Badge 
                    variant={
                      task.status === 'completed' ? 'default' :
                      task.status === 'ongoing' ? 'secondary' :
                      task.status === 'needs_revision' ? 'destructive' :
                      'outline'
                    }
                  >
                    {task.status?.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No tasks yet. Create your first task!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
