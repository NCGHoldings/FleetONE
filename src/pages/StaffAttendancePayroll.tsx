import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ColumnDef } from "@tanstack/react-table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Calendar, Download, Edit3, FileText, RefreshCcw, Settings } from "lucide-react";

interface AttendanceRow {
  id: string;
  staff_id: string;
  staff_name: string;
  attendance_date: string;
  trip_id?: string;
  bus_no?: string;
  route?: string;
  hours_worked: number;
  overtime_hours: number;
  status: string;
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
  const { hasRole } = useAuth();
  const isAdmin = hasRole('super_admin') || hasRole('admin') || hasRole('supervisor');

  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [payroll, setPayroll] = useState<PayrollRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [period, setPeriod] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10),
    end: new Date(new Date().getFullYear(), new Date().getMonth()+1, 0).toISOString().slice(0,10)
  });

  const [rates, setRates] = useState({ basePerHour: 500, otPerHour: 750 });

  useEffect(() => {
    document.title = "Attendance & Payroll | NCG Speed";
    const meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      const m = document.createElement('meta');
      m.name = 'description';
      m.content = 'Auto attendance from trips and monthly payroll with adjustments';
      document.head.appendChild(m);
    } else {
      (meta as HTMLMetaElement).content = 'Auto attendance from trips and monthly payroll with adjustments';
    }
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
        .select('*')
        .gte('attendance_date', period.start)
        .lte('attendance_date', period.end)
        .order('attendance_date', { ascending: false });
      if (error) throw error;
      setAttendance((data || []) as any);
    } catch (e) {
      console.error(e);
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
      setPayroll((data || []) as any);
    } catch (e) {
      console.error(e);
    }
  };

  const syncFromTrips = async () => {
    if (!isAdmin) return toast.error('Access denied');
    try {
      // Pull completed/ended trips in period with allocations
      const { data: trips, error } = await supabase
        .from('daily_trips')
        .select(`
          id, trip_no, trip_date, start_time, end_time, bus_id, route_id,
          buses(bus_no), routes(route_name)
        `)
        .gte('trip_date', period.start)
        .lte('trip_date', period.end)
        .not('end_time', 'is', null);
      if (error) throw error;

      // Get allocations for the same period to extract driver/conductor names
      const { data: allocations, error: allocError } = await supabase
        .from('driver_allocations')
        .select('trip_id, notes')
        .gte('allocation_date', period.start)
        .lte('allocation_date', period.end);
      if (allocError) throw allocError;

      // Create allocation map by trip_id
      const allocationMap = new Map();
      (allocations || []).forEach((alloc: any) => {
        if (alloc.notes) {
          try {
            const notes = typeof alloc.notes === 'string' ? JSON.parse(alloc.notes) : alloc.notes;
            allocationMap.set(alloc.trip_id, notes);
          } catch (e) {
            console.warn('Failed to parse allocation notes:', alloc.notes);
          }
        }
      });

      const entries: any[] = [];
      (trips || []).forEach((t: any) => {
        const hours = (() => {
          if (!t.start_time || !t.end_time) return 0;
          const [sh, sm] = String(t.start_time).split(':').map(Number);
          const [eh, em] = String(t.end_time).split(':').map(Number);
          return Math.max(0, (eh + em/60) - (sh + sm/60));
        })();
        const overtime = Math.max(0, hours - 8);
        
        const base = {
          attendance_date: t.trip_date,
          trip_id: t.trip_no || t.id,
          bus_no: t.buses?.bus_no,
          route: t.routes?.route_name,
          start_time: t.start_time,
          end_time: t.end_time,
          hours_worked: Number(hours.toFixed(2)),
          overtime_hours: Number(overtime.toFixed(2)),
          status: 'present',
          auto_generated: true
        };

        // Get allocation data for this trip
        const allocation = allocationMap.get(t.trip_no || t.id);
        
        if (allocation) {
          // Extract driver
          if (allocation.driver) {
            const driverName = allocation.driver;
            const staffId = `DRIVER_${driverName.replace(/\s+/g, '_').toUpperCase()}`;
            entries.push({
              ...base,
              staff_id: staffId,
              staff_name: driverName
            });
          }
          
          // Extract conductor
          if (allocation.conductor) {
            const conductorName = allocation.conductor;
            const staffId = `CONDUCTOR_${conductorName.replace(/\s+/g, '_').toUpperCase()}`;
            entries.push({
              ...base,
              staff_id: staffId,
              staff_name: conductorName
            });
          }
        }
      });

      for (const e of entries) {
        // Upsert-like: avoid duplicates
        const { data: exists } = await supabase
          .from('staff_attendance')
          .select('id')
          .eq('staff_id', e.staff_id)
          .eq('attendance_date', e.attendance_date)
          .eq('trip_id', e.trip_id)
          .maybeSingle();
        if (!exists) {
          await supabase.from('staff_attendance').insert(e);
        }
      }

      toast.success(`Attendance synced from trips - ${entries.length} records processed`);
      fetchAttendance();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Sync failed');
    }
  };

  const generatePayroll = async () => {
    if (!isAdmin) return toast.error('Access denied');
    try {
      // Aggregate attendance by staff
      const byStaff = new Map<string, { name: string; hours: number; ot: number }>();
      attendance.forEach(a => {
        const key = a.staff_id;
        const val = byStaff.get(key) || { name: a.staff_name, hours: 0, ot: 0 };
        val.hours += a.hours_worked || 0;
        val.ot += a.overtime_hours || 0;
        byStaff.set(key, val);
      });

      for (const [staff_id, v] of byStaff.entries()) {
        const base_salary = Math.round(v.hours * rates.basePerHour);
        const overtime_pay = Math.round(v.ot * rates.otPerHour);
        // Upsert record
        const { data: existing } = await supabase
          .from('payroll_records')
          .select('id')
          .eq('staff_id', staff_id)
          .eq('pay_period_start', period.start)
          .eq('pay_period_end', period.end)
          .maybeSingle();

        if (existing) {
          await supabase.from('payroll_records').update({
            staff_name: v.name,
            base_salary,
            overtime_pay,
            status: 'draft'
          }).eq('id', existing.id);
        } else {
          await supabase.from('payroll_records').insert({
            staff_id,
            staff_name: v.name,
            pay_period_start: period.start,
            pay_period_end: period.end,
            base_salary,
            overtime_pay,
            allowances: 0,
            deductions: 0,
            status: 'draft'
          });
        }
      }

      toast.success('Payroll generated');
      fetchPayroll();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Payroll generation failed');
    }
  };

  const exportCSV = (rows: any[], filename: string) => {
    const csv = [Object.keys(rows[0] || {}).join(','), ...rows.map(r => Object.values(r).map(v => (""+v).replace(/,/g, ' ')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const attendanceCols: ColumnDef<AttendanceRow>[] = [
    { accessorKey: 'staff_id', header: 'Staff ID' },
    { accessorKey: 'staff_name', header: 'Name' },
    { accessorKey: 'attendance_date', header: 'Date' },
    { accessorKey: 'trip_id', header: 'Trip ID' },
    { accessorKey: 'bus_no', header: 'Bus No.' },
    { accessorKey: 'route', header: 'Route' },
    { accessorKey: 'hours_worked', header: 'Hours Worked' },
    { accessorKey: 'overtime_hours', header: 'Overtime' },
    { accessorKey: 'status', header: 'Status' },
  ];

  const payrollCols: ColumnDef<PayrollRow>[] = [
    { accessorKey: 'staff_name', header: 'Staff' },
    { accessorKey: 'pay_period_start', header: 'From' },
    { accessorKey: 'pay_period_end', header: 'To' },
    { accessorKey: 'base_salary', header: 'Base' },
    { accessorKey: 'overtime_pay', header: 'OT' },
    { accessorKey: 'allowances', header: 'Allowances' },
    { accessorKey: 'deductions', header: 'Deductions' },
    { accessorKey: 'net_pay', header: 'Net' },
    { accessorKey: 'status', header: 'Status' },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attendance & Payroll</h1>
          <p className="text-muted-foreground">Attendance auto-sync from trips, monthly payroll generation</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Label className="text-sm">Period</Label>
            <Input type="date" value={period.start} onChange={(e) => setPeriod(p => ({...p, start: e.target.value}))} />
            <span className="text-muted-foreground">to</span>
            <Input type="date" value={period.end} onChange={(e) => setPeriod(p => ({...p, end: e.target.value}))} />
          </div>
          <Button variant="outline" onClick={fetchAttendance}><RefreshCcw className="h-4 w-4 mr-2"/>Refresh</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendance</CardTitle>
          <CardDescription>Auto-generated from Daily Trips end times</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Button onClick={syncFromTrips}><Calendar className="h-4 w-4 mr-2"/>Sync from Trips</Button>
            <Button variant="outline" onClick={() => attendance.length && exportCSV(attendance, 'attendance.csv')}><Download className="h-4 w-4 mr-2"/>Export CSV</Button>
          </div>
          <DataTable columns={attendanceCols} data={attendance} searchKey="staff_name" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payroll</CardTitle>
          <CardDescription>Generate monthly payroll and manage adjustments</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Label>Base / hr</Label>
              <Input type="number" value={rates.basePerHour} onChange={(e) => setRates({...rates, basePerHour: Number(e.target.value) || 0})} className="w-28" />
            </div>
            <div className="flex items-center gap-2">
              <Label>OT / hr</Label>
              <Input type="number" value={rates.otPerHour} onChange={(e) => setRates({...rates, otPerHour: Number(e.target.value) || 0})} className="w-28" />
            </div>
            <Button onClick={generatePayroll}><Settings className="h-4 w-4 mr-2"/>Generate Payroll</Button>
            <Button variant="outline" onClick={() => payroll.length && exportCSV(payroll, 'payroll.csv')}><FileText className="h-4 w-4 mr-2"/>Export CSV</Button>
          </div>

          <DataTable columns={payrollCols} data={payroll} searchKey="staff_name" />
        </CardContent>
      </Card>
    </div>
  );
}
