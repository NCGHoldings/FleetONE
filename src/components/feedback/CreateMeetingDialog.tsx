import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFeedbackLevels, useCreateMeeting } from '@/hooks/useFeedbackModule';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface CreateMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateMeetingDialog: React.FC<CreateMeetingDialogProps> = ({ open, onOpenChange }) => {
  const { data: levels = [] } = useFeedbackLevels();
  const createMeeting = useCreateMeeting();
  
  const [formData, setFormData] = useState({
    title: '',
    level: '',
    meeting_date: new Date(),
    meeting_time: '10:00',
    meeting_type: 'weekly_staff',
    notes: ''
  });
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createMeeting.mutateAsync({
      title: formData.title || `Level ${formData.level} Meeting`,
      level: parseInt(formData.level),
      meeting_date: format(formData.meeting_date, 'yyyy-MM-dd'),
      meeting_time: formData.meeting_time,
      meeting_type: formData.meeting_type,
      notes: formData.notes,
      status: 'scheduled'
    });
    
    onOpenChange(false);
    setFormData({
      title: '',
      level: '',
      meeting_date: new Date(),
      meeting_time: '10:00',
      meeting_type: 'weekly_staff',
      notes: ''
    });
  };
  
  const meetingTypes = [
    { value: 'weekly_staff', label: 'Weekly Staff Meeting' },
    { value: 'supervisor_review', label: 'Supervisor Review' },
    { value: 'management_meeting', label: 'Management Meeting' },
    { value: 'executive_review', label: 'Executive Review' },
    { value: 'emergency', label: 'Emergency Meeting' }
  ];
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Schedule New Meeting</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Level</Label>
              <Select
                value={formData.level}
                onValueChange={(value) => setFormData({ ...formData, level: value })}
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
            
            <div className="space-y-2">
              <Label>Meeting Type</Label>
              <Select
                value={formData.meeting_type}
                onValueChange={(value) => setFormData({ ...formData, meeting_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {meetingTypes.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Meeting Title (Optional)</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Weekly Ground Staff Review"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.meeting_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.meeting_date ? format(formData.meeting_date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.meeting_date}
                    onSelect={(date) => date && setFormData({ ...formData, meeting_date: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label>Time</Label>
              <Input
                type="time"
                value={formData.meeting_time}
                onChange={(e) => setFormData({ ...formData, meeting_time: e.target.value })}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional notes for the meeting..."
              rows={3}
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!formData.level || createMeeting.isPending}>
              {createMeeting.isPending ? 'Creating...' : 'Schedule Meeting'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
