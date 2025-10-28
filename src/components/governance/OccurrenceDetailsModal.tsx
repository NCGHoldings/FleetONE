import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { Calendar, Building2, Users, FileText, Mail, User, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import type { GovernanceOccurrence } from '@/hooks/useGovernanceOccurrences';
import { useUpdateOccurrenceStatus } from '@/hooks/useGovernanceOccurrences';

interface OccurrenceDetailsModalProps {
  occurrence: GovernanceOccurrence | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusOptions = [
  { value: 'Planned', label: 'Planned', color: 'bg-blue-500' },
  { value: 'Due', label: 'Due', color: 'bg-yellow-500' },
  { value: 'Submitted', label: 'Submitted', color: 'bg-green-500' },
  { value: 'Completed', label: 'Completed', color: 'bg-gray-400' },
  { value: 'Skipped', label: 'Skipped', color: 'bg-red-500' },
  { value: 'N/A', label: 'N/A', color: 'bg-gray-300' },
];

export const OccurrenceDetailsModal = ({ occurrence, open, onOpenChange }: OccurrenceDetailsModalProps) => {
  const [status, setStatus] = useState<string>(occurrence?.status || 'Planned');
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();
  const updateStatus = useUpdateOccurrenceStatus();

  if (!occurrence) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateStatus(occurrence.id, status as any);
      await queryClient.invalidateQueries({ queryKey: ['governance-occurrences'] });
      toast.success('Status updated successfully');
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to update status');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const currentStatus = statusOptions.find(s => s.value === occurrence.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {occurrence.governance_item.type === 'REPORT' ? <FileText className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
            {occurrence.governance_item.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Current Status:</span>
            <Badge className={currentStatus?.color}>
              {currentStatus?.label}
            </Badge>
            {occurrence.is_holiday_adjusted && (
              <Badge variant="outline" className="flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Adjusted for Holiday
              </Badge>
            )}
          </div>

          <Separator />

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Company
              </div>
              <div className="font-medium">{occurrence.governance_item.companies?.name}</div>
            </div>

            {occurrence.governance_item.sbus && (
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  SBU
                </div>
                <div className="font-medium">{occurrence.governance_item.sbus?.name}</div>
              </div>
            )}

            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Type</div>
              <div className="font-medium capitalize">{occurrence.governance_item.type}</div>
            </div>

            <div className="space-y-1">
              <div className="text-sm text-muted-foreground">Category</div>
              <div className="font-medium">{occurrence.governance_item.category}</div>
            </div>

            <div className="space-y-1">
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Scheduled Date
              </div>
              <div className="font-medium">
                {format(new Date(occurrence.scheduled_date), 'PPP')}
              </div>
            </div>

            {occurrence.due_date && (
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Due Date
                </div>
                <div className="font-medium">
                  {format(new Date(occurrence.due_date), 'PPP')}
                </div>
              </div>
            )}

            {occurrence.governance_item.owner_name && (
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Owner
                </div>
                <div className="font-medium">{occurrence.governance_item.owner_name}</div>
              </div>
            )}

            {occurrence.governance_item.owner_email && (
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </div>
                <div className="font-medium text-sm">{occurrence.governance_item.owner_email}</div>
              </div>
            )}
          </div>

          {occurrence.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="text-sm font-medium">Notes</div>
                <div className="text-sm text-muted-foreground">{occurrence.notes}</div>
              </div>
            </>
          )}

          {occurrence.is_holiday_adjusted && occurrence.original_scheduled_date && (
            <>
              <Separator />
              <div className="bg-muted/50 p-3 rounded-lg">
                <div className="text-sm font-medium mb-1">Holiday Adjustment</div>
                <div className="text-sm text-muted-foreground">
                  Original date: {format(new Date(occurrence.original_scheduled_date), 'PPP')}
                  <br />
                  Adjusted to: {format(new Date(occurrence.scheduled_date), 'PPP')}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Status Update */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Update Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${option.color}`} />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || status === occurrence.status}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
