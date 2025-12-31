import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { 
  Calendar, Download, RefreshCcw, Settings, Users, TrendingUp, 
  Clock, DollarSign, CheckCircle2, AlertCircle, Loader2, Play
} from "lucide-react";
import { useStaffRegistry } from "@/hooks/useStaffRegistry";
import { useCommissions } from "@/hooks/useCommissions";

interface AttendanceRow {
  id: string;
  staff_registry_id: string | null;
  staff_id: string;
  staff_name: string;
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
  const { staff, drivers, conductors } = useStaffRegistry();

  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [payroll, setPayroll] = useState<PayrollRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [calculatingCommissions, setCalculatingCommissions] = useState(false);
  const [generatingPayroll, setGeneratingPayroll] = useState(false);

  const [period, setPeriod] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10),
    end: new Date(new Date().getFullYear(), new Date().getMonth()+1, 0).toISOString().slice(0,10)
  });

  const { 
    commissions, 
    loading: commissionsLoading, 
    pendingCommissions, 
    approvedCommissions,
    getCommissionSummary,
    approveCommission,
    bulkApprove,
    triggerCalculation 
  } = useCommissions({ start: period.start, end: period.end });

  useEffect(() => {
    document.title = "Attendance & Payroll | NCG Speed";
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
      
      // Transform data to include staff info
      const transformed = (data || []).map((a: any) => ({
        ...a,
        staff_name: a.staff_registry?.staff_name || a.staff_name || 'Unknown',
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
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('auto-sync-attendance', {
        body: { date: period.start, forceSync: false },
      });
      
      if (error) throw error;
      toast.success(data.message || 'Attendance synced from trips');
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
  const totalDaysWorked = attendance.filter(a => a.status === 'present').length;
  const uniqueStaff = new Set(attendance.map(a => a.staff_registry_id || a.staff_id)).size;
  const totalCommissionPending = pendingCommissions.reduce((sum, c) => sum + c.commission_amount, 0);
  const totalCommissionApproved = approvedCommissions.reduce((sum, c) => sum + c.commission_amount, 0);

  const attendanceCols: ColumnDef<AttendanceRow>[] = [
    { 
      accessorKey: 'attendance_date', 
      header: 'Date',
      cell: ({ row }) => new Date(row.original.attendance_date).toLocaleDateString()
    },
    { accessorKey: 'staff_name', header: 'Name' },
    { 
      accessorKey: 'salary_type', 
      header: 'Type',
      cell: ({ row }) => (
        <Badge variant={row.original.salary_type === 'monthly' ? 'default' : 'secondary'}>
          {row.original.salary_type || 'N/A'}
        </Badge>
      )
    },
    { accessorKey: 'bus_no', header: 'Bus' },
    { accessorKey: 'route', header: 'Route' },
    { 
      accessorKey: 'hours_worked', 
      header: 'Hours',
      cell: ({ row }) => `${row.original.hours_worked || 0}h`
    },
    { 
      accessorKey: 'status', 
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'present' ? 'default' : 'outline'}>
          {row.original.status}
        </Badge>
      )
    },
    { 
      accessorKey: 'auto_synced', 
      header: 'Source',
      cell: ({ row }) => (
        <Badge variant="outline" className="text-xs">
          {row.original.auto_synced ? 'Auto' : 'Manual'}
        </Badge>
      )
    },
  ];

  const commissionCols: ColumnDef<any>[] = [
    { 
      accessorKey: 'trip_date', 
      header: 'Date',
      cell: ({ row }) => new Date(row.original.trip_date).toLocaleDateString()
    },
    { 
      accessorKey: 'staff_registry.staff_name', 
      header: 'Staff',
      cell: ({ row }) => row.original.staff_registry?.staff_name || 'Unknown'
    },
    { 
      accessorKey: 'routes.route_name', 
      header: 'Route',
      cell: ({ row }) => row.original.routes?.route_name || '-'
    },
    { 
      accessorKey: 'route_revenue', 
      header: 'Revenue',
      cell: ({ row }) => `LKR ${row.original.route_revenue.toLocaleString()}`
    },
    { 
      accessorKey: 'target_amount', 
      header: 'Target',
      cell: ({ row }) => `LKR ${row.original.target_amount.toLocaleString()}`
    },
    { 
      accessorKey: 'excess_revenue', 
      header: 'Excess',
      cell: ({ row }) => (
        <span className="text-green-600 font-medium">
          +LKR {row.original.excess_revenue.toLocaleString()}
        </span>
      )
    },
    { 
      accessorKey: 'commission_amount', 
      header: 'Commission',
      cell: ({ row }) => (
        <span className="font-semibold">
          LKR {row.original.commission_amount.toLocaleString()}
        </span>
      )
    },
    { 
      accessorKey: 'status', 
      header: 'Status',
      cell: ({ row }) => (
        <Badge 
          variant={
            row.original.status === 'approved' ? 'default' : 
            row.original.status === 'paid' ? 'secondary' : 'outline'
          }
        >
          {row.original.status}
        </Badge>
      )
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        row.original.status === 'pending' && (
          <Button 
            size="sm" 
            variant="ghost"
            onClick={() => approveCommission(row.original.id, user?.id || '')}
          >
            <CheckCircle2 className="h-4 w-4" />
          </Button>
        )
      )
    }
  ];

  const payrollCols: ColumnDef<PayrollRow>[] = [
    { accessorKey: 'staff_name', header: 'Staff' },
    { accessorKey: 'pay_period_start', header: 'From' },
    { accessorKey: 'pay_period_end', header: 'To' },
    { 
      accessorKey: 'base_salary', 
      header: 'Base',
      cell: ({ row }) => `LKR ${row.original.base_salary.toLocaleString()}`
    },
    { 
      accessorKey: 'overtime_pay', 
      header: 'OT',
      cell: ({ row }) => `LKR ${row.original.overtime_pay.toLocaleString()}`
    },
    { 
      accessorKey: 'allowances', 
      header: 'Allowances',
      cell: ({ row }) => `LKR ${row.original.allowances.toLocaleString()}`
    },
    { 
      accessorKey: 'deductions', 
      header: 'Deductions',
      cell: ({ row }) => `LKR ${row.original.deductions.toLocaleString()}`
    },
    { 
      accessorKey: 'net_pay', 
      header: 'Net Pay',
      cell: ({ row }) => (
        <span className="font-semibold">
          LKR {(row.original.base_salary + row.original.overtime_pay + row.original.allowances - row.original.deductions).toLocaleString()}
        </span>
      )
    },
    { 
      accessorKey: 'status', 
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'paid' ? 'default' : 'outline'}>
          {row.original.status}
        </Badge>
      )
    },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attendance & Payroll</h1>
          <p className="text-muted-foreground">
            Auto-sync attendance from trips, calculate commissions, and generate payroll
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">Period</Label>
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
          <Button variant="outline" onClick={fetchAttendance}>
            <RefreshCcw className="h-4 w-4 mr-2"/>Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{staff.length}</p>
                <p className="text-sm text-muted-foreground">Registered Staff</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Clock className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalDaysWorked}</p>
                <p className="text-sm text-muted-foreground">Attendance Records</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">LKR {totalCommissionPending.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Pending Commission</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">LKR {totalCommissionApproved.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Approved Commission</p>
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
              <CardTitle>Attendance Records</CardTitle>
              <CardDescription>Auto-generated from Daily Trips. Sync to pull latest data.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Button onClick={syncAttendanceFromTrips} disabled={syncing}>
                  {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Calendar className="h-4 w-4 mr-2"/>}
                  Sync from Trips
                </Button>
                <Button variant="outline" onClick={() => exportCSV(attendance, 'attendance.csv')}>
                  <Download className="h-4 w-4 mr-2"/>Export CSV
                </Button>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <DataTable columns={attendanceCols} data={attendance} searchKey="staff_name" />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commissions">
          <Card>
            <CardHeader>
              <CardTitle>Commission Tracking</CardTitle>
              <CardDescription>
                Commissions are calculated when trip revenue exceeds route targets
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <Button variant="outline" onClick={() => exportCSV(commissions, 'commissions.csv')}>
                  <Download className="h-4 w-4 mr-2"/>Export CSV
                </Button>
              </div>
              {commissionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : commissions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No commissions for this period</p>
                  <p className="text-sm">Click "Calculate Commissions" after trips exceed their route targets</p>
                </div>
              ) : (
                <DataTable columns={commissionCols} data={commissions} searchKey="staff_registry.staff_name" />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Payroll</CardTitle>
              <CardDescription>Generate payroll based on attendance and commissions</CardDescription>
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
                <Button variant="outline" onClick={() => exportCSV(payroll, 'payroll.csv')}>
                  <Download className="h-4 w-4 mr-2"/>Export CSV
                </Button>
              </div>
              {payroll.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No payroll records for this period</p>
                  <p className="text-sm">Click "Generate Payroll" to calculate salaries</p>
                </div>
              ) : (
                <DataTable columns={payrollCols} data={payroll} searchKey="staff_name" />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
