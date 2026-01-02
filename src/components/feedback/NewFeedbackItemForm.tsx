import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFeedbackLevels, useCreateFeedbackItem } from '@/hooks/useFeedbackModule';

interface NewFeedbackItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultLevel?: number;
  meetingId?: string;
}

export const NewFeedbackItemForm: React.FC<NewFeedbackItemFormProps> = ({ 
  open, 
  onOpenChange, 
  defaultLevel = 1,
  meetingId 
}) => {
  const { data: levels = [] } = useFeedbackLevels();
  const createItem = useCreateFeedbackItem();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'general',
    priority: 'medium',
    raised_by_name: '',
    current_level: defaultLevel.toString()
  });
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createItem.mutateAsync({
      title: formData.title,
      description: formData.description,
      category: formData.category,
      priority: formData.priority as 'low' | 'medium' | 'high' | 'critical',
      raised_by_name: formData.raised_by_name,
      current_level: parseInt(formData.current_level),
      meeting_id: meetingId,
      status: 'pending'
    });
    
    onOpenChange(false);
    setFormData({
      title: '',
      description: '',
      category: 'general',
      priority: 'medium',
      raised_by_name: '',
      current_level: defaultLevel.toString()
    });
  };
  
  const categories = [
    { value: 'general', label: 'General' },
    { value: 'operations', label: 'Operations' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'safety', label: 'Safety' },
    { value: 'hr', label: 'Human Resources' },
    { value: 'finance', label: 'Finance' },
    { value: 'customer_service', label: 'Customer Service' },
    { value: 'equipment', label: 'Equipment' },
    { value: 'route', label: 'Route Related' },
    { value: 'other', label: 'Other' }
  ];
  
  const priorities = [
    { value: 'low', label: 'Low', color: 'text-muted-foreground' },
    { value: 'medium', label: 'Medium', color: 'text-blue-600' },
    { value: 'high', label: 'High', color: 'text-orange-600' },
    { value: 'critical', label: 'Critical', color: 'text-red-600' }
  ];
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Feedback Item</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Brief title of the feedback or issue"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed description..."
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map(p => (
                    <SelectItem key={p.value} value={p.value}>
                      <span className={p.color}>{p.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Raised By</Label>
              <Input
                value={formData.raised_by_name}
                onChange={(e) => setFormData({ ...formData, raised_by_name: e.target.value })}
                placeholder="Name of person raising"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Level</Label>
              <Select
                value={formData.current_level}
                onValueChange={(value) => setFormData({ ...formData, current_level: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {levels.map(level => (
                    <SelectItem key={level.id} value={level.level_number.toString()}>
                      Level {level.level_number} - {level.level_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!formData.title || createItem.isPending}>
              {createItem.isPending ? 'Adding...' : 'Add Item'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
