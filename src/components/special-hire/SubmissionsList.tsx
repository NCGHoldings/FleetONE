import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Eye, CheckCircle, Clock, FileText } from 'lucide-react';

interface SpecialHireSubmission {
  id: string;
  submission_no: string;
  company_name: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  special_request: string | null;
  hire_type: string;
  number_of_buses: number;
  pickup_location: string;
  drop_location: string;
  number_of_passengers: number;
  pickup_datetime: string;
  drop_datetime: string;
  submission_status: string;
  created_at: string;
}

interface Props {
  onSelectSubmission: (submission: SpecialHireSubmission) => void;
}

export function SubmissionsList({ onSelectSubmission }: Props) {
  const [submissions, setSubmissions] = useState<SpecialHireSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('special_hire_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast({
        title: "Error",
        description: "Failed to load submissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSubmission = async (submission: SpecialHireSubmission) => {
    try {
      // Update submission status to selected
      const { error } = await supabase
        .from('special_hire_submissions')
        .update({ 
          submission_status: 'selected',
          selected_at: new Date().toISOString(),
          selected_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', submission.id);

      if (error) throw error;

      // Call the parent callback
      onSelectSubmission(submission);
      
      // Refresh the list
      fetchSubmissions();

      toast({
        title: "Success",
        description: "Submission selected and loaded into quotation form",
      });
    } catch (error) {
      console.error('Error selecting submission:', error);
      toast({
        title: "Error",
        description: "Failed to select submission",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'selected': return 'bg-blue-100 text-blue-800';
      case 'processed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-3 h-3" />;
      case 'selected': return <Eye className="w-3 h-3" />;
      case 'processed': return <CheckCircle className="w-3 h-3" />;
      default: return <FileText className="w-3 h-3" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Customer Submissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Customer Submissions ({submissions.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {submissions.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No submissions yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <div
                key={submission.id}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{submission.customer_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {submission.submission_no} • {format(new Date(submission.created_at), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                  <Badge 
                    className={`${getStatusColor(submission.submission_status)} flex items-center gap-1`}
                  >
                    {getStatusIcon(submission.submission_status)}
                    {submission.submission_status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                  <div>
                    <span className="text-muted-foreground">Phone:</span>
                    <p className="font-medium">{submission.customer_phone}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Hire Type:</span>
                    <p className="font-medium">{submission.hire_type}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Buses:</span>
                    <p className="font-medium">{submission.number_of_buses}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Passengers:</span>
                    <p className="font-medium">{submission.number_of_passengers}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <span className="text-muted-foreground">Pickup:</span>
                    <p className="font-medium truncate">{submission.pickup_location}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(submission.pickup_datetime), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Drop:</span>
                    <p className="font-medium truncate">{submission.drop_location}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(submission.drop_datetime), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                </div>

                {submission.special_request && (
                  <div className="mb-4">
                    <span className="text-muted-foreground text-sm">Special Request:</span>
                    <p className="text-sm bg-muted p-2 rounded mt-1">{submission.special_request}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleSelectSubmission(submission)}
                    disabled={submission.submission_status === 'processed'}
                  >
                    {submission.submission_status === 'processed' ? 'Already Processed' : 'Use for Quotation'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}