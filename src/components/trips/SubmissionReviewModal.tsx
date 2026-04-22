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
          {/* Image Preview or Financial Summary */}
          <div className="space-y-4">
            {submission.image_url && submission.image_url !== 'manual_data_entry_no_image' ? (
              <div>
                <h3 className="font-medium mb-2">Submitted Image</h3>
                <img
                  src={submission.image_url}
                  alt="Trip sheet"
                  className="w-full rounded-lg border"
                />
              </div>
            ) : submission.ocr_data?.data_entry_method === 'manual_form_v2' ? (
              <div className="bg-slate-900 text-white p-4 rounded-xl space-y-4">
                <h3 className="font-bold text-lg mb-2">Financial Summary</h3>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-slate-300">
                    <span>Total Income ({submission.ocr_data.trips?.length || 0} Trips)</span>
                    <span className="text-emerald-400 font-bold">Rs. {submission.ocr_data.total_income?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Total Expenses</span>
                    <span className="text-red-400 font-bold">- Rs. {submission.ocr_data.expenses?.total?.toFixed(2)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-700 flex justify-between font-bold text-lg">
                    <span>Net Balance</span>
                    <span>Rs. {submission.ocr_data.net_balance?.toFixed(2)}</span>
                  </div>
                </div>

                {/* Expenses Breakdown */}
                {submission.ocr_data.expenses && Object.keys(submission.ocr_data.expenses).length > 1 && (
                  <div className="mt-4 pt-4 border-t border-slate-800">
                    <p className="text-xs text-slate-400 font-bold uppercase mb-2">Expense Breakdown</p>
                    <div className="space-y-1 text-xs text-slate-300">
                      {Object.entries(submission.ocr_data.expenses).map(([key, val]) => {
                        if (key === 'total') return null;
                        return (
                          <div key={key} className="flex justify-between">
                            <span>{key}</span>
                            <span>{Number(val).toFixed(2)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

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
            <h3 className="font-medium">Trip Reference Details</h3>

            <div className="grid grid-cols-2 gap-4">
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