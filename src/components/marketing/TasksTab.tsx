import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Clock, Users, CheckCircle, AlertCircle, Eye, Play, Pause } from "lucide-react";
import { TaskCreateModal } from "./TaskCreateModal";
import { TaskDetailModal } from "./TaskDetailModal";

const STATUS_COLUMNS = [
  { id: 'planning', label: 'Planning', color: 'bg-gray-500', icon: Clock },
  { id: 'assigned', label: 'Assigned', color: 'bg-blue-500', icon: Users },
  { id: 'ongoing', label: 'Ongoing', color: 'bg-cyan-500', icon: Play },
  { id: 'pending_review', label: 'Pending Review', color: 'bg-amber-500', icon: Eye },
  { id: 'needs_revision', label: 'Needs Revision', color: 'bg-red-500', icon: AlertCircle },
  { id: 'completed', label: 'Completed', color: 'bg-green-500', icon: CheckCircle },
];

export const TasksTab = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['marketing-tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_tasks')
        .select(`
          *,
          category:category_id (category_name, average_hours),
          companies:company_id (name),
          assignees:marketing_task_assignees (
            id,
            role,
            member:member_id (id, display_name, avatar_url)
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      const updates: any = { status };
      if (status === 'ongoing' && !tasks?.find(t => t.id === taskId)?.started_at) {
        updates.started_at = new Date().toISOString();
      }
      if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from('marketing_tasks')
        .update(updates)
        .eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-tasks'] });
      toast.success('Task status updated');
    }
  });

  const getTasksByStatus = (status: string) => {
    return tasks?.filter(task => task.status === status) || [];
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Task Board</h2>
          <p className="text-muted-foreground">Manage and track marketing tasks</p>
        </div>
        <Button 
          onClick={() => setIsCreateOpen(true)}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 overflow-x-auto">
        {STATUS_COLUMNS.map(({ id, label, color, icon: Icon }) => (
          <div key={id} className="min-w-[280px]">
            <div className={`flex items-center gap-2 p-3 rounded-t-lg ${color} text-white`}>
              <Icon className="h-4 w-4" />
              <span className="font-medium">{label}</span>
              <Badge variant="secondary" className="ml-auto bg-white/20 text-white">
                {getTasksByStatus(id).length}
              </Badge>
            </div>
            <div className="bg-muted/50 rounded-b-lg p-2 min-h-[400px] space-y-2">
              {getTasksByStatus(id).map((task: any) => (
                <Card 
                  key={task.id} 
                  className="cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5"
                  onClick={() => setSelectedTask(task)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Badge variant="outline" className="text-xs font-mono">
                        {task.task_number}
                      </Badge>
                      <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </Badge>
                    </div>
                    <h4 className="font-medium text-sm line-clamp-2">{task.title}</h4>
                    {task.category && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {task.category.category_name}
                      </p>
                    )}
                    {task.companies && (
                      <Badge variant="secondary" className="text-xs mt-2">
                        {task.companies.name}
                      </Badge>
                    )}
                    {task.assignees && task.assignees.length > 0 && (
                      <div className="flex items-center gap-1 mt-2">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {task.assignees.length} assigned
                        </span>
                      </div>
                    )}
                    {task.deadline && (
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {new Date(task.deadline).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              {getTasksByStatus(id).length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No tasks
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      <TaskCreateModal 
        open={isCreateOpen} 
        onOpenChange={setIsCreateOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['marketing-tasks'] });
          setIsCreateOpen(false);
        }}
      />

      {/* Detail Modal */}
      {selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          open={!!selectedTask}
          onOpenChange={(open) => !open && setSelectedTask(null)}
          onStatusChange={(status) => updateStatusMutation.mutate({ taskId: selectedTask.id, status })}
        />
      )}
    </div>
  );
};
