import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface LateEntryRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripDate: Date;
  hoursExceeded: number;
  deadline: Date;
  onSubmit: (reason: string) => Promise<void>;
  existingRequest?: {
    status: string;
    reason: string;
    created_at: string;
  } | null;
}

export const LateEntryRequestModal = ({
  open,
  onOpenChange,
  tripDate,
  hoursExceeded,
  deadline,
  onSubmit,
  existingRequest
}: LateEntryRequestModalProps) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    setLoading(true);
    await onSubmit(reason);
    setLoading(false);
    setReason('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-warning" />
            Data Entry Deadline Exceeded
          </DialogTitle>
          <DialogDescription>
            The deadline for entering data for {format(tripDate, 'PPP')} has passed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-warning/20 bg-warning/10 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-warning" />
              <span className="font-medium">Deadline was:</span>
              <span>{format(deadline, 'PPP p')}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              You are {hoursExceeded} hours late. Please request approval to enter this data.
            </p>
          </div>

          {existingRequest ? (
            <div className="rounded-lg border bg-card p-4 space-y-2">
              <p className="text-sm font-medium">
                Request Status: <span className="capitalize text-primary">{existingRequest.status}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Submitted: {format(new Date(existingRequest.created_at), 'PPP p')}
              </p>
              <p className="text-sm">
                <span className="font-medium">Reason:</span> {existingRequest.reason}
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Late Entry *</Label>
                <Textarea
                  id="reason"
                  placeholder="Please explain why you need to enter data after the deadline..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Your request will be reviewed by an administrator
                </p>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={loading || !reason.trim()}
                className="w-full"
              >
                {loading ? 'Submitting...' : 'Submit Request'}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};