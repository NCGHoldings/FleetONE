import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Eye, CheckCircle, Clock, FileText } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';
import { QuotationModal } from './QuotationModal';

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
  quotation_id: string | null;
}

interface Props {
  onSelectSubmission: (submission: SpecialHireSubmission) => void;
}

export function SubmissionsList({ onSelectSubmission }: Props) {
  const [submissions, setSubmissions] = useState<SpecialHireSubmission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<SpecialHireSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewQuotationModalOpen, setViewQuotationModalOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<any>(null);
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
      setFilteredSubmissions(data || []);
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

  const handleViewQuotation = async (submission: SpecialHireSubmission) => {
    if (!submission.quotation_id) {
      toast({
        title: "No Quotation",
        description: "No quotation has been created from this submission yet.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('special_hire_quotations')
        .select('*')
        .eq('id', submission.quotation_id)
        .single();

      if (error) throw error;

      if (data) {
        setSelectedQuotation(data);
        setViewQuotationModalOpen(true);
      }
    } catch (error) {
      console.error('Error fetching quotation:', error);
      toast({
        title: "Error",
        description: "Failed to load quotation",
        variant: "destructive",
      });
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

  const handleDateRangeChange = (range: { from: Date; to: Date } | undefined) => {
    if (!range) {
      setFilteredSubmissions(submissions);
      return;
    }

    const filtered = submissions.filter(submission => {
      const submissionDate = new Date(submission.created_at);
      return submissionDate >= range.from && submissionDate <= range.to;
    });
    setFilteredSubmissions(filtered);
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

  const columns: ColumnDef<SpecialHireSubmission>[] = [
    {
      accessorKey: "submission_no",
      header: "Submission #",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("submission_no")}</div>
      ),
    },
    {
      accessorKey: "customer_name",
      header: "Customer",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.getValue("customer_name")}</div>
          <div className="text-sm text-muted-foreground">{row.original.customer_phone}</div>
        </div>
      ),
    },
    {
      accessorKey: "hire_type",
      header: "Hire Type",
    },
    {
      accessorKey: "number_of_buses",
      header: "Buses",
    },
    {
      accessorKey: "number_of_passengers",
      header: "Passengers",
    },
    {
      accessorKey: "pickup_location",
      header: "Pickup Location",
      cell: ({ row }) => (
        <div className="max-w-[200px]">
          <div className="truncate">{row.getValue("pickup_location")}</div>
          <div className="text-xs text-muted-foreground">
            {format(new Date(row.original.pickup_datetime), 'MMM dd, HH:mm')}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "drop_location",
      header: "Drop Location",
      cell: ({ row }) => (
        <div className="max-w-[200px]">
          <div className="truncate">{row.getValue("drop_location")}</div>
          <div className="text-xs text-muted-foreground">
            {format(new Date(row.original.drop_datetime), 'MMM dd, HH:mm')}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "submission_status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("submission_status") as string;
        return (
          <Badge className={`${getStatusColor(status)} flex items-center gap-1 w-fit`}>
            {getStatusIcon(status)}
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ row }) => (
        <div className="text-sm">
          {format(new Date(row.getValue("created_at")), 'MMM dd, yyyy')}
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const submission = row.original;
        return (
          <div className="flex items-center gap-2">
            {submission.quotation_id && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleViewQuotation(submission)}
                className="gap-1"
              >
                <Eye className="w-4 h-4" />
                View Quotation
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => handleSelectSubmission(submission)}
              disabled={submission.submission_status === 'processed'}
            >
              {submission.submission_status === 'processed' ? 'Processed' : 'Use for Quotation'}
            </Button>
          </div>
        );
      },
    },
  ];

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
    <>
      <DataTable
        columns={columns}
        data={filteredSubmissions}
        title={`Customer Submissions (${submissions.length})`}
        onDateRangeChange={handleDateRangeChange}
      />
      
      {selectedQuotation && (
        <QuotationModal
          quotation={selectedQuotation}
          open={viewQuotationModalOpen}
          onOpenChange={(open) => {
            setViewQuotationModalOpen(open);
            if (!open) {
              setSelectedQuotation(null);
            }
          }}
        />
      )}
    </>
  );
}