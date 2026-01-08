import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Save } from 'lucide-react';

interface SubmissionReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: any;
  onUpdate: () => void;
}

export const SubmissionReviewModal = ({
  open,
  onOpenChange,
  submission,
  onUpdate
}: SubmissionReviewModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [editedData, setEditedData] = useState({
    bus_number: submission.bus_number || '',
    trip_date: submission.trip_date || '',
    ...submission.ocr_data
  });

  const handleApprove = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('conductor_submissions')
        .update({
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          ocr_data: editedData
        })
        .eq('id', submission.id);

      if (error) throw error;

      toast({
        title: "Submission Approved",
        description: "The submission has been approved and is ready to apply."
      });

      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Rejection Reason Required",
        description: "Please provide a reason for rejection",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('conductor_submissions')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason
        })
        .eq('id', submission.id);

      if (error) throw error;

      toast({
        title: "Submission Rejected",
        description: "The submission has been rejected."
      });

      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Review Submission - {submission.submission_code}</DialogTitle>
            <Badge>{submission.status}</Badge>
          </div>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Image Preview */}
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Submitted Image</h3>
              <img
                src={submission.image_url}
                alt="Trip sheet"
                className="w-full rounded-lg border"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Conductor</p>
                <p className="font-medium">{submission.conductor_name}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Phone</p>
                <p className="font-medium">{submission.conductor_phone}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Submitted</p>
                <p className="font-medium">{format(new Date(submission.created_at), 'PPP')}</p>
              </div>
            </div>
          </div>

          {/* Editable Data */}
          <div className="space-y-4">
            <h3 className="font-medium">Extracted Data (Editable)</h3>

            <div className="space-y-2">
              <Label>Bus Number</Label>
              <Input
                value={editedData.bus_number}
                onChange={(e) => setEditedData({ ...editedData, bus_number: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Trip Date</Label>
              <Input
                type="date"
                value={editedData.trip_date}
                onChange={(e) => setEditedData({ ...editedData, trip_date: e.target.value })}
              />
            </div>

            {submission.status === 'pending' && (
              <>
                <div className="space-y-2">
                  <Label>Rejection Reason (if rejecting)</Label>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Provide a reason if rejecting..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    onClick={handleApprove}
                    disabled={loading}
                    className="flex-1"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve
                  </Button>
                  <Button
                    onClick={handleReject}
                    disabled={loading}
                    variant="destructive"
                    className="flex-1"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject
                  </Button>
                </div>
              </>
            )}

            {submission.rejection_reason && (
              <div className="rounded-lg border bg-destructive/10 p-3">
                <p className="text-sm font-medium text-destructive mb-1">Rejection Reason:</p>
                <p className="text-sm">{submission.rejection_reason}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};