import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckSquare, Users, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

interface TaskCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const TaskCreateModal = ({ open, onOpenChange, onSuccess }: TaskCreateModalProps) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: '',
    company_id: '',
    priority: 'medium',
    assigned_hours: '',
  });
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const { data: categories } = useQuery({
    queryKey: ['marketing-categories'],
    queryFn: async () => {
      const { data } = await supabase
        .from('marketing_task_categories')
        .select('*')
        .eq('is_active', true);
      return data || [];
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

  const { data: teamMembers } = useQuery({
    queryKey: ['marketing-team'],
    queryFn: async () => {
      const { data } = await supabase
        .from('marketing_team_members')
        .select('*')
        .eq('is_active', true);
      return data || [];
    }
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      
      // Calculate deadline based on assigned hours (office hours only)
      let deadline = null;
      if (formData.assigned_hours) {
        const hours = parseFloat(formData.assigned_hours);
        const daysNeeded = Math.ceil(hours / 8);
        let currentDate = new Date();
        let daysAdded = 0;
        
        while (daysAdded < daysNeeded) {
          currentDate.setDate(currentDate.getDate() + 1);
          const dayOfWeek = currentDate.getDay();
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            daysAdded++;
          }
        }
        deadline = currentDate.toISOString();
      }

      // Create task
      const year = new Date().getFullYear();
      const taskNumber = `MKT-TASK-${year}-${Date.now().toString().slice(-6)}`;
      
      const { data: task, error: taskError } = await supabase
        .from('marketing_tasks')
        .insert([{
          task_number: taskNumber,
          title: formData.title,
          description: formData.description || null,
          category_id: formData.category_id || null,
          company_id: formData.company_id || null,
          priority: formData.priority,
          assigned_hours: formData.assigned_hours ? parseFloat(formData.assigned_hours) : null,
          deadline,
          assigned_by: user.user?.id,
          status: selectedMembers.length > 0 ? 'assigned' : 'planning',
        }])
        .select()
        .single();

      if (taskError) throw taskError;

      // Add assignees
      if (selectedMembers.length > 0) {
        const assignees = selectedMembers.map((memberId) => ({
          task_id: task.id,
          member_id: memberId,
          role: 'worker',
        }));
        const { error: assignError } = await supabase
          .from('marketing_task_assignees')
          .insert(assignees);
        if (assignError) throw assignError;
      }

      return task;
    },
    onSuccess: () => {
      toast.success('Task created successfully!');
      setFormData({
        title: '',
        description: '',
        category_id: '',
        company_id: '',
        priority: 'medium',
        assigned_hours: '',
      });
      setSelectedMembers([]);
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const handleCategoryChange = (categoryId: string) => {
    const category = categories?.find(c => c.id === categoryId);
    setFormData({
      ...formData,
      category_id: categoryId,
      assigned_hours: category?.average_hours?.toString() || '',
    });
  };

  const toggleMember = (memberId: string) => {
    setSelectedMembers(prev =>
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-purple-500" />
            Create New Task
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Task Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter task title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the task..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.category_id}
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.category_name} ({category.average_hours}h avg)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assigned_hours" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Deadline Hours (Office hours only)
              </Label>
              <Input
                id="assigned_hours"
                type="number"
                min="1"
                value={formData.assigned_hours}
                onChange={(e) => setFormData({ ...formData, assigned_hours: e.target.value })}
                placeholder="e.g., 8"
              />
              {formData.assigned_hours && (
                <p className="text-xs text-muted-foreground">
                  ≈ {Math.ceil(parseFloat(formData.assigned_hours) / 8)} working days
                </p>
              )}
            </div>
          </div>

          {/* Team Member Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              Assign Team Members
            </Label>
            <div className="border rounded-lg p-3 max-h-48 overflow-y-auto">
              {teamMembers && teamMembers.length > 0 ? (
                <div className="space-y-2">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer"
                      onClick={() => toggleMember(member.id)}
                    >
                      <Checkbox
                        checked={selectedMembers.includes(member.id)}
                        onCheckedChange={() => toggleMember(member.id)}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{member.display_name}</p>
                        <p className="text-xs text-muted-foreground">{member.designation}</p>
                      </div>
                      {member.is_task_assigner && (
                        <Badge variant="secondary" className="text-xs">Assigner</Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground text-sm py-4">
                  No team members yet. Add team members first.
                </p>
              )}
            </div>
            {selectedMembers.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {selectedMembers.length} member(s) selected
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
