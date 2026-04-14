import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Clock, User } from 'lucide-react';

interface LateEntryRequest {
  id: string;
  trip_date: string;
  reason: string;
  status: string;
  created_at: string;
  requested_by: string;
  review_notes?: string;
  profiles: {
    first_name: string;
    last_name: string;
    employee_id: string;
  };
}

export const LateEntryApprovalInterface = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<LateEntryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewNotes, setReviewNotes] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('late_entry_requests')
      .select(`
        *,
        profiles!late_entry_requests_requested_by_fkey (
          first_name,
          last_name,
          employee_id
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load requests",
        variant: "destructive"
      });
    } else {
      setRequests(data || []);
    }
    setLoading(false);
  };

  const handleReview = async (requestId: string, approved: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('late_entry_requests')
        .update({
          status: approved ? 'approved' : 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: reviewNotes[requestId] || null
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: approved ? "Request Approved" : "Request Rejected",
        description: `The late entry request has been ${approved ? 'approved' : 'rejected'}.`
      });

      loadRequests();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      {requests.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            No late entry requests found
          </CardContent>
        </Card>
      ) : (
        requests.map((request) => (
          <Card key={request.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">
                    Late Entry Request - {format(new Date(request.trip_date), 'PPP')}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <User className="h-3 w-3" />
                    {request.profiles.first_name} {request.profiles.last_name} ({request.profiles.employee_id})
                  </CardDescription>
                </div>
                <Badge
                  variant={
                    request.status === 'approved'
                      ? 'default'
                      : request.status === 'rejected'
                      ? 'destructive'
                      : 'secondary'
                  }
                >
                  {request.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">Reason:</p>
                <p className="text-sm text-muted-foreground">{request.reason}</p>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Requested {format(new Date(request.created_at), 'PPP p')}
              </div>

              {request.status === 'pending' && (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Review Notes (Optional)</label>
                    <Textarea
                      placeholder="Add any notes about this decision..."
                      value={reviewNotes[request.id] || ''}
                      onChange={(e) =>
                        setReviewNotes({ ...reviewNotes, [request.id]: e.target.value })
                      }
                      rows={2}
                      className="resize-none"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleReview(request.id, true)}
                      className="flex-1"
                      variant="default"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleReview(request.id, false)}
                      className="flex-1"
                      variant="destructive"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </>
              )}

              {request.review_notes && (
                <div className="rounded-lg border bg-muted/50 p-3">
                  <p className="text-sm font-medium mb-1">Review Notes:</p>
                  <p className="text-sm text-muted-foreground">{request.review_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};