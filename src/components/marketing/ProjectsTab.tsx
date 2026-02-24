import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, FolderKanban, Calendar, Users, Building2 } from "lucide-react";
import { format } from "date-fns";

export const ProjectsTab = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    company_id: '',
    start_date: '',
    target_end_date: '',
  });
  const queryClient = useQueryClient();

  const { data: projects, isLoading } = useQuery({
    queryKey: ['marketing-projects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_projects')
        .select(`
          *,
          companies:company_id (name),
          lead:project_lead_id (display_name),
          tasks:marketing_tasks (id, status)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: companies } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data } = await supabase
        .from('companies')
        .select('id, name')
        .eq('is_active', true);
      return data || [];
    }
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      const year = new Date().getFullYear();
      const projectNumber = `MKT-PRJ-${year}-${Date.now().toString().slice(-6)}`;
      
      const { error } = await supabase
        .from('marketing_projects')
        .insert([{
          project_number: projectNumber,
          title: formData.title,
          description: formData.description || null,
          company_id: formData.company_id || null,
          start_date: formData.start_date || null,
          target_end_date: formData.target_end_date || null,
          created_by: user.user?.id,
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Project created successfully!');
      setIsCreateOpen(false);
      setFormData({ title: '', description: '', company_id: '', start_date: '', target_end_date: '' });
      queryClient.invalidateQueries({ queryKey: ['marketing-projects'] });
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning': return 'bg-gray-500';
      case 'in_progress': return 'bg-blue-500';
      case 'on_hold': return 'bg-amber-500';
      case 'completed': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getProjectProgress = (tasks: any[]) => {
    if (!tasks || tasks.length === 0) return 0;
    const completed = tasks.filter(t => t.status === 'completed').length;
    return (completed / tasks.length) * 100;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Projects</h2>
          <p className="text-muted-foreground">Manage larger marketing initiatives</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FolderKanban className="h-5 w-5 text-purple-500" />
                Create New Project
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Project Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter project title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the project..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Company</Label>
                <Select
                  value={formData.company_id}
                  onValueChange={(value) => setFormData({ ...formData, company_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies?.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target_end_date">Target End Date</Label>
                  <Input
                    id="target_end_date"
                    type="date"
                    value={formData.target_end_date}
                    onChange={(e) => setFormData({ ...formData, target_end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Creating...' : 'Create Project'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : projects && projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project: any) => {
            const progress = getProjectProgress(project.tasks);
            return (
              <Card key={project.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <Badge variant="outline" className="font-mono text-xs">
                      {project.project_number}
                    </Badge>
                    <Badge className={`${getStatusColor(project.status)} text-white`}>
                      {project.status?.replace('_', ' ')}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg mt-2">{project.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  {/* Progress */}
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{progress.toFixed(0)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  {/* Meta Info */}
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {project.companies && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {project.companies.name}
                      </Badge>
                    )}
                    {project.tasks && (
                      <Badge variant="outline">
                        {project.tasks.length} tasks
                      </Badge>
                    )}
                  </div>

                  {/* Dates */}
                  {(project.start_date || project.target_end_date) && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {project.start_date && format(new Date(project.start_date), 'MMM d')}
                      {project.start_date && project.target_end_date && ' → '}
                      {project.target_end_date && format(new Date(project.target_end_date), 'MMM d, yyyy')}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FolderKanban className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg font-medium">No projects yet</p>
            <p className="text-muted-foreground">Create your first project to get started</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
