import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Search, Eye, FileText, Settings, TrendingUp, CheckCircle, Clock } from 'lucide-react';
import { SubmissionReviewModal } from './SubmissionReviewModal';
import { ConductorPortalQuickActions } from './ConductorPortalQuickActions';

interface ConductorSubmission {
  id: string;
  submission_code: string;
  conductor_name: string;
  conductor_phone: string;
  bus_number?: string;
  trip_date?: string;
  image_url: string;
  ocr_data?: any;
  status: string;
  created_at: string;
  reviewed_at?: string;
}

export const ConductorSubmissionsReview = () => {
  const { toast } = useToast();
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<ConductorSubmission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<ConductorSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedSubmission, setSelectedSubmission] = useState<ConductorSubmission | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [deadlineHours, setDeadlineHours] = useState(6);
  const [todayCount, setTodayCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [appliedCount, setAppliedCount] = useState(0);

  const isAdmin = hasRole('super_admin') || hasRole('admin');

  useEffect(() => {
    loadSubmissions();
    loadSettings();
  }, []);

  useEffect(() => {
    filterSubmissions();
    calculateStats();
  }, [searchTerm, statusFilter, submissions]);

  const loadSettings = async () => {
    const { data } = await supabase
      .from('system_settings')
      .select('*')
      .eq('setting_key', 'data_entry_deadline_hours')
      .single();
    
    if (data) setDeadlineHours(parseInt(String(data.setting_value)));
  };

  const loadSubmissions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('conductor_submissions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load submissions",
        variant: "destructive"
      });
    } else {
      setSubmissions(data || []);
    }
    setLoading(false);
  };

  const calculateStats = () => {
    const today = new Date().toDateString();
    setTodayCount(submissions.filter(s => new Date(s.created_at).toDateString() === today).length);
    setPendingCount(filteredSubmissions.filter(s => s.status === 'pending').length);
    setAppliedCount(filteredSubmissions.filter(s => s.status === 'applied').length);
  };

  const filterSubmissions = () => {
    let filtered = submissions;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(s =>
        s.submission_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.conductor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.bus_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredSubmissions(filtered);
  };

  const handleReview = (submission: ConductorSubmission) => {
    setSelectedSubmission(submission);
    setReviewModalOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'processing': return 'default';
      case 'reviewed': return 'outline';
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'applied': return 'default';
      default: return 'secondary';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading submissions...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Quick Actions Card */}
      <ConductorPortalQuickActions />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              Today's Submissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              Pending Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Applied to Database
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{appliedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Deadline Info Banner */}
      {isAdmin && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Current Deadline Configuration</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Data entry deadline: {deadlineHours} hours after trip date
                </p>
              </div>
              <Button
                onClick={() => navigate('/settings?tab=data-entry')}
                size="sm"
                variant="outline"
              >
                <Settings className="mr-2 h-4 w-4" />
                Adjust Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by code, name, or bus number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          {['all', 'pending', 'approved', 'applied'].map(status => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {filteredSubmissions.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No submissions found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredSubmissions.map((submission) => (
            <Card key={submission.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{submission.submission_code}</h3>
                      <Badge variant={getStatusColor(submission.status)}>
                        {submission.status}
                      </Badge>
                      {submission.ocr_data?.trips && submission.ocr_data.trips.length > 0 && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {submission.ocr_data.trips.length} {submission.ocr_data.trips.length === 1 ? 'Trip' : 'Trips'}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {submission.conductor_name} • {submission.conductor_phone}
                    </p>
                  </div>
                  <Button onClick={() => handleReview(submission)} size="sm">
                    <Eye className="mr-2 h-4 w-4" />
                    Review
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Bus Number</p>
                    <p className="font-medium">{submission.bus_number || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Trip Date</p>
                    <p className="font-medium">
                      {submission.trip_date ? format(new Date(submission.trip_date), 'PPP') : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Submitted</p>
                    <p className="font-medium">{format(new Date(submission.created_at), 'PPP')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">OCR Status</p>
                    <p className="font-medium">{submission.ocr_data ? 'Extracted' : 'Pending'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedSubmission && (
        <SubmissionReviewModal
          open={reviewModalOpen}
          onOpenChange={setReviewModalOpen}
          submission={selectedSubmission}
          onUpdate={loadSubmissions}
        />
      )}
    </div>
  );
};