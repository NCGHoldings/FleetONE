import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, FileText, Calendar, Building2, ArrowRight, CheckCircle, XCircle, ListPlus } from "lucide-react";
import { format } from "date-fns";
import { TaskCreateModal } from "./TaskCreateModal";

export const JobRequestsTab = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskPreFill, setTaskPreFill] = useState<{
    title: string;
    description: string;
    company_id: string;
    job_request_id: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    job_title: '',
    job_description: '',
    required_completion_date: '',
    additional_notes: '',
    company_id: '',
  });

  const queryClient = useQueryClient();

  const { data: jobRequests, isLoading } = useQuery({
    queryKey: ['marketing-job-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_job_requests')
        .select(`
          *,
          companies:company_id (name)
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
    mutationFn: async (data: typeof formData) => {
      const { data: user } = await supabase.auth.getUser();
      const year = new Date().getFullYear();
      const requestNumber = `MKT-HR-${year}-${Date.now().toString().slice(-6)}`;
      
      const { error } = await supabase
        .from('marketing_job_requests')
        .insert([{
          request_number: requestNumber,
          job_title: data.job_title,
          job_description: data.job_description,
          required_completion_date: data.required_completion_date,
          additional_notes: data.additional_notes || null,
          company_id: data.company_id || null,
          requested_by: user.user?.id,
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Job request submitted successfully!');
      setIsDialogOpen(false);
      setFormData({
        job_title: '',
        job_description: '',
        required_completion_date: '',
        additional_notes: '',
        company_id: '',
      });
      queryClient.invalidateQueries({ queryKey: ['marketing-job-requests'] });
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('marketing_job_requests')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Status updated');
      queryClient.invalidateQueries({ queryKey: ['marketing-job-requests'] });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.job_title || !formData.job_description || !formData.required_completion_date) {
      toast.error('Please fill in all required fields');
      return;
    }
    createMutation.mutate(formData);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-primary/60';
      case 'approved': return 'bg-primary';
      case 'converted_to_task': return 'bg-primary/80';
      case 'converted_to_project': return 'bg-primary/70';
      case 'rejected': return 'bg-destructive';
      default: return 'bg-muted-foreground';
    }
  };

  const handleConvertToTask = (request: any) => {
    setTaskPreFill({
      title: request.job_title,
      description: request.job_description || '',
      company_id: request.company_id || '',
      job_request_id: request.id,
    });
    setIsTaskModalOpen(true);
  };

  const handleTaskCreated = () => {
    setIsTaskModalOpen(false);
    setTaskPreFill(null);
    // Update job request status to converted_to_task
    if (taskPreFill?.job_request_id) {
      updateStatusMutation.mutate({ 
        id: taskPreFill.job_request_id, 
        status: 'converted_to_task' 
      });
    }
    queryClient.invalidateQueries({ queryKey: ['marketing-job-requests'] });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Job Requests (MKT-HR)</h2>
          <p className="text-muted-foreground">Submit and manage marketing job requests</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              New Job Request
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                New Job Request (MKT-HR)
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="job_title">Job Request Title *</Label>
                <Input
                  id="job_title"
                  value={formData.job_title}
                  onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                  placeholder="Enter job title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="job_description">Job Description *</Label>
                <Textarea
                  id="job_description"
                  value={formData.job_description}
                  onChange={(e) => setFormData({ ...formData, job_description: e.target.value })}
                  placeholder="Describe the job requirements..."
                  rows={4}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="required_completion_date">Required Completion Date *</Label>
                  <Input
                    id="required_completion_date"
                    type="date"
                    value={formData.required_completion_date}
                    onChange={(e) => setFormData({ ...formData, required_completion_date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company_id">Company</Label>
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="additional_notes">Additional Notes</Label>
                <Textarea
                  id="additional_notes"
                  value={formData.additional_notes}
                  onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
                  placeholder="Any additional information..."
                  rows={2}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Requests List */}
      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : jobRequests && jobRequests.length > 0 ? (
        <div className="grid gap-4">
          {jobRequests.map((request: any) => (
            <Card key={request.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant="outline" className="font-mono">
                        {request.request_number}
                      </Badge>
                      <Badge className={`${getStatusColor(request.status)} text-white`}>
                        {request.status?.replace('_', ' ')}
                      </Badge>
                      {request.companies?.name && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {request.companies.name}
                        </Badge>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold">{request.job_title}</h3>
                    <p className="text-muted-foreground mt-1 line-clamp-2">{request.job_description}</p>
                    
                    <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Requested: {format(new Date(request.requested_date), 'MMM d, yyyy')}
                      </span>
                      <span className="flex items-center gap-1">
                        <ArrowRight className="h-4 w-4" />
                        Due: {format(new Date(request.required_completion_date), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {request.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          className="bg-primary hover:bg-primary/90"
                          onClick={() => updateStatusMutation.mutate({ id: request.id, status: 'approved' })}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive border-destructive hover:bg-destructive/10"
                          onClick={() => updateStatusMutation.mutate({ id: request.id, status: 'rejected' })}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                    {request.status === 'approved' && (
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary/90"
                        onClick={() => handleConvertToTask(request)}
                      >
                        <ListPlus className="h-4 w-4 mr-1" />
                        Create Task
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg font-medium">No job requests yet</p>
            <p className="text-muted-foreground">Create your first job request to get started</p>
          </CardContent>
        </Card>
      )}

      {/* Task Create Modal with pre-filled data */}
      <TaskCreateModal
        open={isTaskModalOpen}
        onOpenChange={(open) => {
          setIsTaskModalOpen(open);
          if (!open) setTaskPreFill(null);
        }}
        onSuccess={handleTaskCreated}
        preFillData={taskPreFill}
      />
    </div>
  );
};
