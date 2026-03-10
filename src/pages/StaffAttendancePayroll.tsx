import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { 
  Calendar, Download, RefreshCcw, Settings, Users, TrendingUp, 
  Clock, DollarSign, CheckCircle2, AlertCircle, Loader2, Play, 
  Check, X, User, LayoutGrid, List, AlertTriangle
} from "lucide-react";
import { useStaffRegistry } from "@/hooks/useStaffRegistry";
import { useCommissions } from "@/hooks/useCommissions";
import { AttendanceCalendar } from "@/components/staff/AttendanceCalendar";
import { usePayrollFinanceSettings, usePostPayrollToGL } from "@/hooks/usePayrollFinance";
import { useCommissionFinanceSettings, usePostCommissionPayoutToGL } from "@/hooks/useCommissionFinance";
import { BookOpen } from "lucide-react";

interface AttendanceRow {
  id: string;
  staff_registry_id: string | null;
  staff_id: string;
  staff_name: string;
  staff_type?: string;
  attendance_date: string;
  trip_id?: string;
  bus_no?: string;
  route?: string;
  hours_worked: number;
  overtime_hours: number;
  status: string;
  salary_type?: string;
  daily_rate?: number;
  commission_earned?: number;
  auto_synced?: boolean;
}

interface PayrollRow {
  id: string;
  staff_id: string;
  staff_name: string;
  pay_period_start: string;
  pay_period_end: string;
  base_salary: number;
  overtime_pay: number;
  allowances: number;
  deductions: number;
  net_pay: number;
  status: string;
}

export default function StaffAttendancePayroll() {
  const { hasRole, user } = useAuth();
  const isAdmin = hasRole('super_admin') || hasRole('admin') || hasRole('supervisor');
  const { staff, drivers, conductors, syncFromDataSources, syncing: syncingStaff } = useStaffRegistry();

  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [payroll, setPayroll] = useState<PayrollRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [calculatingCommissions, setCalculatingCommissions] = useState(false);
  const [generatingPayroll, setGeneratingPayroll] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('calendar');
  const [tripsWithoutStaff, setTripsWithoutStaff] = useState<string[]>([]);

  // Finance integration hooks
  const { data: payrollFinanceSettings } = usePayrollFinanceSettings();
  const postPayrollToGL = usePostPayrollToGL();
  const { data: commissionFinanceSettings } = useCommissionFinanceSettings();
  const postCommissionToGL = usePostCommissionPayoutToGL();

  const [period, setPeriod] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10),
    end: new Date(new Date().getFullYear(), new Date().getMonth()+1, 0).toISOString().slice(0,10)
  });

  const { 
    commissions, 
    loading: commissionsLoading, 
    pendingCommissions, 
    approvedCommissions,
    approveCommission,
    bulkApprove,
    triggerCalculation 
  } = useCommissions({ start: period.start, end: period.end });

  useEffect(() => {
    document.title = "Staff Attendance | NCG Speed";
  }, []);

  useEffect(() => {
    fetchAttendance();
    fetchPayroll();
  }, [period.start, period.end]);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('staff_attendance')
        .select(`
          *,
          staff_registry:staff_registry_id (
            staff_name,
            staff_type,
            salary_type
          )
        `)
        .gte('attendance_date', period.start)
        .lte('attendance_date', period.end)
        .order('attendance_date', { ascending: false });
      
      if (error) throw error;
      
      const transformed = (data || []).map((a: any) => ({
        ...a,
        staff_name: a.staff_registry?.staff_name || a.staff_name || 'Unknown',
        staff_type: a.staff_registry?.staff_type,
        salary_type: a.staff_registry?.salary_type || a.salary_type,
      }));
      
      setAttendance(transformed as AttendanceRow[]);
    } catch (e) {
      console.error('Failed to fetch attendance:', e);
      toast.error('Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayroll = async () => {
    try {
      const { data, error } = await supabase
        .from('payroll_records')
        .select('*')
        .gte('pay_period_start', period.start)
        .lte('pay_period_end', period.end)
        .order('staff_name');
      if (error) throw error;
      setPayroll((data || []) as PayrollRow[]);
    } catch (e) {
      console.error(e);
    }
  };

  const syncAttendanceFromTrips = async () => {
    if (!isAdmin) return toast.error('Access denied');
    
    // Validate date range
    if (!period.start || !period.end) {
      return toast.error('Please select a valid date range');
    }
    
    if (new Date(period.start) > new Date(period.end)) {
      return toast.error('Start date must be before end date');
    }
    
    setSyncing(true);
    try {
      // Call with full date range
      const { data, error } = await supabase.functions.invoke('auto-sync-attendance', {
        body: { 
          startDate: period.start, 
          endDate: period.end, 
          forceSync: false 
        },
      });
      
      if (error) throw error;
      
      if (!data.success && data.error) {
        toast.error(data.error);
        return;
      }
      
      // Show detailed results
      const msg = data.attendanceSynced > 0
        ? `Synced ${data.attendanceSynced} attendance records from ${data.tripsProcessed} trips (${data.matchedDrivers || 0} drivers, ${data.matchedConductors || 0} conductors)`
        : `No new records to sync. ${data.tripsProcessed} trips processed.`;
      
      toast.success(msg);
      
      // Store trips without staff for warning display
      if (data.tripsWithoutStaff?.length > 0) {
        setTripsWithoutStaff(data.tripsWithoutStaff);
      }
      
      // Show warnings for unmatched staff
      if (data.unmatchedDrivers?.length > 0) {
        toast.warning(`Unmatched drivers: ${data.unmatchedDrivers.join(', ')}`);
      }
      if (data.unmatchedConductors?.length > 0) {
        toast.warning(`Unmatched conductors: ${data.unmatchedConductors.join(', ')}`);
      }
      
      await fetchAttendance();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleCalculateCommissions = async () => {
    if (!isAdmin) return toast.error('Access denied');
    setCalculatingCommissions(true);
    try {
      await triggerCalculation(period.start);
    } finally {
      setCalculatingCommissions(false);
    }
  };

  const handleGeneratePayroll = async () => {
    if (!isAdmin) return toast.error('Access denied');
    setGeneratingPayroll(true);
    try {
      const month = new Date(period.start).getMonth() + 1;
      const year = new Date(period.start).getFullYear();
      
      const { data, error } = await supabase.functions.invoke('generate-payroll', {
        body: { month, year },
      });
      
      if (error) throw error;
      toast.success(`Payroll generated for ${data.summary?.totalStaff || 0} staff members`);
      await fetchPayroll();

      // Auto-post to GL if auto_post_on_process is enabled
      if (payrollFinanceSettings?.auto_post_on_process && data.summary) {
        const batch = payroll.filter(p => p.status === 'confirmed' || p.status === 'generated');
        if (batch.length > 0) {
          const totalSalary = batch.reduce((s, r) => s + r.base_salary, 0);
          const totalOvertime = batch.reduce((s, r) => s + r.overtime_pay, 0);
          const totalDeductions = batch.reduce((s, r) => s + r.deductions, 0);
          const totalNet = batch.reduce((s, r) => s + (r.base_salary + r.overtime_pay + r.allowances - r.deductions), 0);
          postPayrollToGL.mutate({
            batch: {
              batchId: batch[0]?.id,
              payrollMonth: `${period.start.slice(0, 7)}`,
              totalGrossSalary: totalSalary,
              totalOvertime: totalOvertime,
              totalBonus: 0,
              totalDeductions: totalDeductions,
              employerEPF: totalDeductions * 0.45,
              employerETF: totalDeductions * 0.15,
              employeeEPF: totalDeductions * 0.3,
              payeWithholding: totalDeductions * 0.1,
              totalNetPay: totalNet,
              staffCount: batch.length,
            },
            settings: payrollFinanceSettings,
          });
        }
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Payroll generation failed');
    } finally {
      setGeneratingPayroll(false);
    }
  };

  const handleApproveAllCommissions = async () => {
    if (pendingCommissions.length === 0) {
      toast.info('No pending commissions to approve');
      return;
    }
    const ids = pendingCommissions.map(c => c.id);
    await bulkApprove(ids, user?.id || '');

    // Auto-post to GL if auto_post_on_paid is enabled
    if (commissionFinanceSettings?.auto_post_on_paid) {
      const totalAmount = pendingCommissions.reduce((s, c) => s + c.commission_amount, 0);
      postCommissionToGL.mutate({
        payout: {
          commissionIds: ids,
          staffName: 'Bulk Payout',
          staffId: 'bulk',
          totalAmount,
          payoutDate: new Date().toISOString().slice(0, 10),
          description: `Auto-post: Bulk commission payout - ${ids.length} commissions`,
        },
        settings: commissionFinanceSettings,
      });
    }
  };

  const exportCSV = (rows: any[], filename: string) => {
    if (rows.length === 0) return toast.info('No data to export');
    const csv = [Object.keys(rows[0] || {}).join(','), ...rows.map(r => Object.values(r).map(v => (""+v).replace(/,/g, ' ')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate summary stats
  const presentCount = attendance.filter(a => a.status === 'present').length;
  const absentCount = attendance.filter(a => a.status === 'absent').length;
  const lateCount = attendance.filter(a => a.status === 'late').length;
  const totalCommissionPending = pendingCommissions.reduce((sum, c) => sum + c.commission_amount, 0);
  const totalCommissionApproved = approvedCommissions.reduce((sum, c) => sum + c.commission_amount, 0);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <Check className="h-4 w-4 text-green-600" />;
      case 'absent':
        return <X className="h-4 w-4 text-red-600" />;
      case 'late':
        return <Clock className="h-4 w-4 text-orange-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Present</Badge>;
      case 'absent':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Absent</Badge>;
      case 'late':
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Late</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Staff Attendance</h1>
        <p className="text-muted-foreground">
          Track daily attendance synced from trips and allocations
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{staff.length}</p>
                <p className="text-sm text-muted-foreground">Total Staff</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Check className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{presentCount}</p>
                <p className="text-sm text-muted-foreground">Present</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <X className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{absentCount}</p>
                <p className="text-sm text-muted-foreground">Absent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{lateCount}</p>
                <p className="text-sm text-muted-foreground">Late</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="attendance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Daily Attendance
                  </CardTitle>
                  <CardDescription>
                    Auto-synced from completed trips
                  </CardDescription>
                </div>
                {/* View Toggle */}
                <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                  <Button 
                    variant={viewMode === 'calendar' ? 'default' : 'ghost'} 
                    size="sm"
                    onClick={() => setViewMode('calendar')}
                  >
                    <LayoutGrid className="h-4 w-4 mr-1" />
                    Calendar
                  </Button>
                  <Button 
                    variant={viewMode === 'table' ? 'default' : 'ghost'} 
                    size="sm"
                    onClick={() => setViewMode('table')}
                  >
                    <List className="h-4 w-4 mr-1" />
                    Table
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Period Filters & Actions */}
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Label className="text-sm whitespace-nowrap">Period:</Label>
                  <Input 
                    type="date" 
                    value={period.start} 
                    onChange={(e) => setPeriod(p => ({...p, start: e.target.value}))} 
                    className="w-36"
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input 
                    type="date" 
                    value={period.end} 
                    onChange={(e) => setPeriod(p => ({...p, end: e.target.value}))} 
                    className="w-36"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button onClick={syncAttendanceFromTrips} disabled={syncing}>
                    {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCcw className="h-4 w-4 mr-2"/>}
                    Sync from Trips
                  </Button>
                  <Button variant="outline" onClick={() => exportCSV(attendance, 'attendance.csv')}>
                    <Download className="h-4 w-4 mr-2"/>Export
                  </Button>
                </div>
              </div>

              {/* Warning for trips without staff */}
              {tripsWithoutStaff.length > 0 && (
                <Alert className="border-orange-200 bg-orange-50">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    <span className="font-medium">{tripsWithoutStaff.length} trips have no staff assigned.</span>
                    <span className="text-sm ml-2">
                      These trips cannot be synced. Please add driver/conductor info in Daily Trips.
                    </span>
                  </AlertDescription>
                </Alert>
              )}

              {/* Calendar View */}
              {viewMode === 'calendar' ? (
                <AttendanceCalendar 
                  attendance={attendance} 
                  selectedMonth={new Date(period.start)} 
                  loading={loading}
                />
              ) : (
                /* Table View */
                loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : attendance.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No attendance records found</p>
                    <p className="text-sm">Click "Sync from Trips" to pull attendance from daily trips</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Staff Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Bus</TableHead>
                        <TableHead>Route</TableHead>
                        <TableHead>Hours</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Source</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendance.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">
                            {new Date(row.attendance_date).toLocaleDateString('en-GB', { 
                              day: '2-digit', 
                              month: 'short', 
                              year: 'numeric' 
                            })}
                          </TableCell>
                          <TableCell className="font-medium">{row.staff_name}</TableCell>
                          <TableCell>
                            {row.staff_type ? (
                              <Badge variant={row.staff_type === 'driver' ? 'default' : 'secondary'}>
                                {row.staff_type}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>{row.bus_no || '-'}</TableCell>
                          <TableCell>{row.route || '-'}</TableCell>
                          <TableCell>{row.hours_worked || 0}h</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(row.status)}
                              {getStatusBadge(row.status)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {row.auto_synced ? 'Auto' : 'Manual'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commissions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Commission Tracking
              </CardTitle>
              <CardDescription>
                Commissions are calculated when trip revenue exceeds route targets
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Commission Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-900">Pending</span>
                  </div>
                  <p className="text-xl font-bold text-orange-900 mt-1">
                    LKR {totalCommissionPending.toLocaleString()}
                  </p>
                  <p className="text-xs text-orange-700">{pendingCommissions.length} commission(s)</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-900">Approved</span>
                  </div>
                  <p className="text-xl font-bold text-green-900 mt-1">
                    LKR {totalCommissionApproved.toLocaleString()}
                  </p>
                  <p className="text-xs text-green-700">{approvedCommissions.length} commission(s)</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button onClick={handleCalculateCommissions} disabled={calculatingCommissions}>
                  {calculatingCommissions ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2"/>
                  )}
                  Calculate Commissions
                </Button>
                {pendingCommissions.length > 0 && (
                  <Button variant="outline" onClick={handleApproveAllCommissions}>
                    <CheckCircle2 className="h-4 w-4 mr-2"/>
                    Approve All ({pendingCommissions.length})
                  </Button>
                )}
                {approvedCommissions.length > 0 && (
                  <Button
                    variant="secondary"
                    disabled={postCommissionToGL.isPending}
                    onClick={() => {
                      const totalAmount = approvedCommissions.reduce((s, c) => s + c.commission_amount, 0);
                      if (commissionFinanceSettings) {
                        postCommissionToGL.mutate({
                          payout: {
                            commissionIds: approvedCommissions.map(c => c.id),
                            staffName: 'Bulk Payout',
                            staffId: 'bulk',
                            totalAmount,
                            payoutDate: new Date().toISOString().slice(0, 10),
                            description: `Bulk commission payout - ${approvedCommissions.length} commissions`,
                          },
                          settings: commissionFinanceSettings,
                        });
                      } else {
                        toast.error('Please configure Commission Finance Settings first');
                      }
                    }}
                  >
                    {postCommissionToGL.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <BookOpen className="h-4 w-4 mr-2" />
                    )}
                    Pay & Post to GL ({approvedCommissions.length})
                  </Button>
                )}
                <Button variant="outline" onClick={() => exportCSV(commissions, 'commissions.csv')}>
                  <Download className="h-4 w-4 mr-2"/>Export
                </Button>
              </div>

              {/* Commissions Table */}
              {commissionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : commissions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No commissions for this period</p>
                  <p className="text-sm">Click "Calculate Commissions" after trips exceed their route targets</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Staff</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Excess</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commissions.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell>
                          {new Date(c.trip_date).toLocaleDateString('en-GB', { 
                            day: '2-digit', 
                            month: 'short' 
                          })}
                        </TableCell>
                        <TableCell className="font-medium">
                          {c.staff_registry?.staff_name || 'Unknown'}
                        </TableCell>
                        <TableCell>{c.routes?.route_name || '-'}</TableCell>
                        <TableCell>LKR {c.route_revenue?.toLocaleString()}</TableCell>
                        <TableCell>LKR {c.target_amount?.toLocaleString()}</TableCell>
                        <TableCell className="text-green-600 font-medium">
                          +LKR {c.excess_revenue?.toLocaleString()}
                        </TableCell>
                        <TableCell className="font-semibold">
                          LKR {c.commission_amount?.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={c.status === 'approved' ? 'default' : c.status === 'paid' ? 'secondary' : 'outline'}
                          >
                            {c.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {c.status === 'pending' && (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => approveCommission(c.id, user?.id || '')}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Monthly Payroll
              </CardTitle>
              <CardDescription>
                Generate payroll based on attendance and commissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Button onClick={handleGeneratePayroll} disabled={generatingPayroll}>
                  {generatingPayroll ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Settings className="h-4 w-4 mr-2"/>
                  )}
                  Generate Payroll
                </Button>
                {payroll.filter(p => p.status === 'confirmed' || p.status === 'generated').length > 0 && (
                  <Button
                    variant="secondary"
                    disabled={postPayrollToGL.isPending}
                    onClick={() => {
                      const batch = payroll.filter(p => p.status === 'confirmed' || p.status === 'generated');
                      const totalSalary = batch.reduce((s, r) => s + r.base_salary, 0);
                      const totalOvertime = batch.reduce((s, r) => s + r.overtime_pay, 0);
                      const totalDeductions = batch.reduce((s, r) => s + r.deductions, 0);
                      const totalNet = batch.reduce((s, r) => s + (r.base_salary + r.overtime_pay + r.allowances - r.deductions), 0);
                      if (payrollFinanceSettings) {
                        postPayrollToGL.mutate({
                          batch: {
                            batchId: batch[0]?.id,
                            payrollMonth: `${period.start.slice(0, 7)}`,
                            totalGrossSalary: totalSalary,
                            totalOvertime: totalOvertime,
                            totalBonus: 0,
                            totalDeductions: totalDeductions,
                            employerEPF: totalDeductions * 0.45,
                            employerETF: totalDeductions * 0.15,
                            employeeEPF: totalDeductions * 0.3,
                            payeWithholding: totalDeductions * 0.1,
                            totalNetPay: totalNet,
                            staffCount: batch.length,
                          },
                          settings: payrollFinanceSettings,
                        });
                      } else {
                        toast.error('Please configure Payroll Finance Settings first');
                      }
                    }}
                  >
                    {postPayrollToGL.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <BookOpen className="h-4 w-4 mr-2" />
                    )}
                    Post to GL
                  </Button>
                )}
                <Button variant="outline" onClick={() => exportCSV(payroll, 'payroll.csv')}>
                  <Download className="h-4 w-4 mr-2"/>Export
                </Button>
              </div>
              
              {payroll.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="font-medium">No payroll records for this period</p>
                  <p className="text-sm">Click "Generate Payroll" to calculate salaries</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Staff</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Base Salary</TableHead>
                      <TableHead>Overtime</TableHead>
                      <TableHead>Allowances</TableHead>
                      <TableHead>Deductions</TableHead>
                      <TableHead>Net Pay</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payroll.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.staff_name}</TableCell>
                        <TableCell>
                          {new Date(row.pay_period_start).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} - {new Date(row.pay_period_end).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        </TableCell>
                        <TableCell>LKR {row.base_salary?.toLocaleString()}</TableCell>
                        <TableCell>LKR {row.overtime_pay?.toLocaleString()}</TableCell>
                        <TableCell>LKR {row.allowances?.toLocaleString()}</TableCell>
                        <TableCell className="text-red-600">-LKR {row.deductions?.toLocaleString()}</TableCell>
                        <TableCell className="font-semibold">
                          LKR {(row.base_salary + row.overtime_pay + row.allowances - row.deductions).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={row.status === 'paid' ? 'default' : 'outline'}>
                            {row.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
