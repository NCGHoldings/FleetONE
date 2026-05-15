import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Search, Eye, FileText, Settings, TrendingUp, CheckCircle, Clock, FolderOpen, Bus, ChevronDown, ChevronUp, BarChart2, CheckSquare } from 'lucide-react';
import { SubmissionReviewModal } from './SubmissionReviewModal';
import { ConductorPortalQuickActions } from './ConductorPortalQuickActions';
import { BusDailyFolderModal } from './BusDailyFolderModal';
import { SubmissionMatrixDashboard } from './SubmissionMatrixDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useMemo } from 'react';

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
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [activeTab, setActiveTab] = useState('master_sheet');
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));

  const [selectedBusFolderData, setSelectedBusFolderData] = useState<any | null>(null);
  const [openingFolderFor, setOpeningFolderFor] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const isAdmin = hasRole('super_admin') || hasRole('admin');

  useEffect(() => {
    loadSubmissions();
    loadSettings();
  }, []);

  useEffect(() => {
    filterSubmissions();
    calculateStats();
  }, [searchTerm, statusFilter, submissions, selectedDate]);

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

    if (selectedDate) {
      filtered = filtered.filter(s => s.trip_date === selectedDate);
    }

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

  const groupedSubmissions = useMemo(() => {
    const groups: Record<string, any> = {};
    filteredSubmissions.forEach(sub => {
        const key = `${sub.bus_number}_${sub.trip_date}`;
        if (!groups[key]) {
            groups[key] = {
                id: key,
                bus_number: sub.bus_number,
                trip_date: sub.trip_date,
                submissions: [],
                total_income: 0,
                total_expenses: 0,
                total_fuel_liters: 0,
                total_trips_reported: 0,
                routes: new Set(),
            };
        }
        
        groups[key].submissions.push(sub);
        
        const ocr = sub.ocr_data || {};
        if (ocr.route_name) groups[key].routes.add(ocr.route_name);
        
        groups[key].total_income += parseFloat(ocr.total_income || '0');
        
        if (ocr.expenses?.total) {
           groups[key].total_expenses += parseFloat(ocr.expenses.total);
        }
        if (ocr.fuel_details?.liters) {
           groups[key].total_fuel_liters += parseFloat(ocr.fuel_details.liters);
        }
        if (ocr.trips && Array.isArray(ocr.trips)) {
           groups[key].total_trips_reported += ocr.trips.length;
        } else if (ocr.submission_type === 'trip_revenue') {
           groups[key].total_trips_reported += 1;
        }
    });
    
    return Object.values(groups).sort((a, b) => {
        if (a.trip_date !== b.trip_date) return new Date(b.trip_date || 0).getTime() - new Date(a.trip_date || 0).getTime();
        return (a.bus_number || '').localeCompare(b.bus_number || '');
    });
  }, [filteredSubmissions]);

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleReview = (submission: ConductorSubmission) => {
    setSelectedSubmission(submission);
    setReviewModalOpen(true);
  };

  const handleOpenFolder = async (submission: ConductorSubmission) => {
    if (!submission.bus_number || !submission.trip_date) {
      toast({ title: "Missing Info", description: "Bus number or date missing from submission." });
      return;
    }
    
    setOpeningFolderFor(submission.id);
    try {
      const { data: trips } = await supabase.from('daily_trips')
        .select('*')
        .eq('bus_id', submission.bus_number)
        .eq('trip_date', submission.trip_date);
        
      const { data: allSubmissions } = await supabase.from('conductor_submissions')
        .select('*')
        .eq('bus_number', submission.bus_number)
        .eq('trip_date', submission.trip_date)
        .order('created_at', { ascending: false });

      let totalInc = 0;
      let totalExp = 0;
      
      (trips || []).forEach(t => {
         totalInc += (t.income || 0);
         totalExp += (t.total_expenses || 0);
      });

      setSelectedBusFolderData({
         bus_no: submission.bus_number,
         trips: trips || [],
         submissions: allSubmissions || [],
         total_income: totalInc,
         total_expenses: totalExp,
         trip_date: submission.trip_date
      });
    } catch (err: any) {
      console.error(err);
      toast({ title: "Error", description: "Failed to load bus folder data", variant: "destructive" });
    } finally {
      setOpeningFolderFor(null);
    }
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

      {/* Stats Cards - Mobile optimized horizontal scroll or compact grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="col-span-2 sm:col-span-1 bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-100">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800 flex items-center gap-1.5 mb-1">
                <TrendingUp className="h-4 w-4" /> Today's Submissions
              </p>
              <div className="text-3xl font-bold text-blue-900">{todayCount}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-100">
          <CardContent className="p-4 flex flex-col justify-center">
            <p className="text-xs font-medium text-amber-800 flex items-center gap-1 mb-1">
              <Clock className="h-3.5 w-3.5" /> Pending
            </p>
            <div className="text-2xl font-bold text-amber-900">{pendingCount}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-100">
          <CardContent className="p-4 flex flex-col justify-center">
            <p className="text-xs font-medium text-emerald-800 flex items-center gap-1 mb-1">
              <CheckCircle className="h-3.5 w-3.5" /> Applied
            </p>
            <div className="text-2xl font-bold text-emerald-900">{appliedCount}</div>
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

      {/* Tabs for Master View vs Approval View */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border shadow-sm w-full">
            <span className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" /> Filter {activeTab === 'master_sheet' ? 'Month' : 'Date'}:
            </span>
            {activeTab === 'master_sheet' ? (
              <Input 
                type="month" 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)} 
                className="w-auto h-8 border-none focus-visible:ring-0 px-0 shadow-none bg-transparent font-medium text-right text-blue-700"
              />
            ) : (
              <Input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)} 
                className="w-auto h-8 border-none focus-visible:ring-0 px-0 shadow-none bg-transparent font-medium text-right text-blue-700"
              />
            )}
          </div>

          <TabsList className="grid w-full grid-cols-2 h-12 p-1 bg-slate-100 rounded-xl">
            <TabsTrigger value="master_sheet" className="flex gap-2 text-xs sm:text-sm rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <BarChart2 className="w-4 h-4" /> <span className="hidden sm:inline">Fleet</span> Master
            </TabsTrigger>
            <TabsTrigger value="approvals" className="flex gap-2 text-xs sm:text-sm rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <CheckSquare className="w-4 h-4" /> Approvals {pendingCount > 0 && <Badge variant="destructive" className="ml-1 h-5 px-1.5 flex items-center justify-center text-[10px] rounded-full">{pendingCount}</Badge>}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* 1. MASTER FLEET SHEET TAB */}
        <TabsContent value="master_sheet" className="mt-0">
           <Card className="border shadow-sm overflow-hidden">
              <CardContent className="p-0">
                 <SubmissionMatrixDashboard selectedMonth={parseISO(selectedMonth + '-01')} />
              </CardContent>
           </Card>
        </TabsContent>

        {/* 2. PENDING APPROVALS TAB */}
        <TabsContent value="approvals" className="mt-0 space-y-4">
          {/* Filters and Search - Mobile friendly stack */}
          <div className="flex flex-col gap-3 bg-white p-3 rounded-xl border shadow-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search bus, name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 bg-slate-50 border-transparent focus:bg-white transition-colors rounded-lg"
              />
            </div>

            <div className="flex overflow-x-auto pb-1 gap-2 hide-scrollbar">
              {['all', 'pending', 'approved', 'applied'].map(status => (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-full shrink-0 px-4 h-8 ${statusFilter === status ? 'shadow-sm' : 'bg-slate-100 text-slate-600'}`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {groupedSubmissions.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <Bus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No active bus operations found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {groupedSubmissions.map((group) => (
                <Card key={group.id} className="hover:shadow-md transition-shadow overflow-hidden">
                  {/* Group Header (Bus Level) - Mobile First */}
                  <div className="bg-white border-b p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <Bus className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <h3 className="font-bold text-xl text-slate-800 leading-none">
                              {group.bus_number || 'Unknown'}
                            </h3>
                            {group.submissions.some((s:any) => s.status === 'pending') && (
                              <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-none text-[10px] px-1.5 py-0.5 rounded uppercase font-bold tracking-wide">Pending</Badge>
                            )}
                          </div>
                          <p className="text-xs font-medium text-slate-500 line-clamp-1">
                            {Array.from(group.routes).join(', ') || 'Route Not Specified'}
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => toggleGroup(group.id)}
                        className="h-10 w-10 shrink-0 text-slate-400 bg-slate-50 rounded-full"
                      >
                        {expandedGroups[group.id] ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                      </Button>
                    </div>

                    <Button 
                      variant="outline" 
                      onClick={() => handleOpenFolder(group.submissions[0])}
                      disabled={openingFolderFor === group.submissions[0]?.id}
                      className="w-full h-10 border-blue-200 text-blue-700 hover:bg-blue-50 font-semibold mb-1"
                    >
                      {openingFolderFor === group.submissions[0]?.id ? (
                         <div className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                         <FolderOpen className="mr-2 h-4 w-4" />
                      )}
                      Open Master Folder
                    </Button>
                  </div>

                    {/* Group Summary Metrics - Compact Mobile Grid */}
                    <div className="grid grid-cols-2 gap-2 text-sm mt-3 bg-slate-50/80 p-3 rounded-lg border border-slate-100 mx-4 mb-4">
                      <div className="bg-white p-2 rounded border shadow-sm flex flex-col justify-center">
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-0.5">Income</p>
                        <p className="font-bold text-emerald-600 text-sm">Rs. {group.total_income.toLocaleString()}</p>
                      </div>
                      <div className="bg-white p-2 rounded border shadow-sm flex flex-col justify-center">
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-0.5">Expenses</p>
                        <p className="font-bold text-amber-600 text-sm">Rs. {group.total_expenses.toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1 col-span-2 text-xs text-slate-600 font-medium bg-white p-2 rounded border shadow-sm">
                        <span className="flex-1">📝 {group.submissions.length} Logs</span>
                        <span className="text-slate-300">|</span>
                        <span className="flex-1 text-center">🚌 {group.total_trips_reported} Trips</span>
                        <span className="text-slate-300">|</span>
                        <span className="flex-1 text-right">⛽ {group.total_fuel_liters || 0}L</span>
                      </div>
                    </div>

                  {/* Individual Submissions Accordion - Mobile Optimized */}
                  {expandedGroups[group.id] && (
                    <div className="bg-slate-50 p-3 space-y-3 border-t">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Uploads</h4>
                      {group.submissions.map((submission: any) => (
                        <div key={submission.id} className="bg-white rounded-xl p-3 border shadow-sm flex flex-col gap-3">
                          <div className="flex justify-between items-start">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2 mb-1">
                                <FileText className="h-4 w-4 text-slate-400" />
                                <span className="font-bold text-slate-800 text-sm">{submission.submission_code}</span>
                              </div>
                              <span className="text-[11px] text-slate-400 font-medium pl-6">
                                {format(new Date(submission.created_at), 'h:mm a')}
                              </span>
                            </div>
                            <Badge variant={getStatusColor(submission.status)} className="text-[10px] px-2 py-0.5 rounded-full capitalize">
                              {submission.status}
                            </Badge>
                          </div>
                          
                          <div className="bg-slate-50 rounded-lg p-2 text-xs flex justify-between items-center border border-slate-100">
                            <div className="font-medium text-slate-600">
                              <span className="text-slate-400 mr-1">By</span>
                              {submission.conductor_name}
                            </div>
                            {submission.ocr_data?.submission_type && (
                              <span className="capitalize px-1.5 py-0.5 bg-blue-100 text-blue-700 font-bold rounded text-[10px]">
                                {submission.ocr_data.submission_type.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                          
                          <Button 
                            onClick={() => handleReview(submission)} 
                            className="w-full mt-1 bg-slate-800 hover:bg-slate-900 text-white font-medium h-10 shadow-sm"
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Review & Process
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {selectedSubmission && (
        <SubmissionReviewModal
          open={reviewModalOpen}
          onOpenChange={setReviewModalOpen}
          submission={selectedSubmission}
          onUpdate={loadSubmissions}
        />
      )}

      {selectedBusFolderData && (
        <BusDailyFolderModal
          open={!!selectedBusFolderData}
          onOpenChange={(open) => !open && setSelectedBusFolderData(null)}
          busData={selectedBusFolderData}
          date={new Date(selectedBusFolderData.trip_date)}
        />
      )}
    </div>
  );
};