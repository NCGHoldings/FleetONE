import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Bus, Users, DollarSign, Activity, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import React, { useState } from 'react';

// Passenger Expansion Component
const PassengerSubTable = ({ reportId }: { reportId: string }) => {
  const { data: passengers, isLoading } = useQuery({
    queryKey: ['magiya-passengers', reportId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('magiya_passenger_bookings')
        .select('*')
        .eq('report_id', reportId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div className="p-4 text-center text-sm text-slate-400">Loading passengers...</div>;
  }

  if (!passengers || passengers.length === 0) {
    return <div className="p-4 text-center text-sm text-slate-400">No detailed passenger data found for this trip.</div>;
  }

  return (
    <div className="bg-[#131823] p-4 rounded-b-md border-x border-b border-[#2a3441]">
      <h4 className="text-sm font-semibold text-slate-300 mb-2">Detailed Passenger List</h4>
      <Table>
        <TableHeader className="bg-[#1e2535]">
          <TableRow className="border-[#2a3441]">
            <TableHead className="text-slate-400 text-xs py-2">Seat #</TableHead>
            <TableHead className="text-slate-400 text-xs py-2">Contact</TableHead>
            <TableHead className="text-slate-400 text-xs py-2">Location & Time</TableHead>
            <TableHead className="text-slate-400 text-xs py-2">Booking Type</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {passengers.map((p) => (
            <TableRow key={p.id} className="border-[#2a3441] hover:bg-[#2a3441]/30">
              <TableCell className="text-xs text-white py-2">{p.seat_number}</TableCell>
              <TableCell className="text-xs text-slate-300 py-2">{p.contact}</TableCell>
              <TableCell className="text-xs text-slate-300 py-2">{p.location_route}</TableCell>
              <TableCell className="text-xs py-2">
                <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] ${
                  p.booking_type?.includes('Online') ? 'bg-[#0ea5e9]/10 text-[#0ea5e9]' :
                  p.booking_type?.includes('NCG') ? 'bg-[#10b981]/10 text-[#10b981]'     :
                  'bg-slate-700/50 text-slate-300'
                }`}>
                  {p.booking_type || 'Unknown'}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

const MagiyaReports = () => {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const { data: reports, isLoading } = useQuery({
    queryKey: ['magiya-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('magiya_daily_reports')
        .select('*')
        .order('report_date', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const totalRevenue = reports?.reduce((sum, r) => sum + Number((r as any).total_revenue_lkr || 0), 0) || 0;
  const totalPassengers = reports?.reduce((sum, r) => sum + Number((r as any).total_passengers || 0), 0) || 0;
  const activeBuses = new Set(reports?.map(r => (r as any).bus_number)).size || 0;
  const totalReports = reports?.length || 0;

  const toggleRow = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Partner Network Live Data</h1>
        <p className="text-muted-foreground">Automated daily data extraction from the Partner Portal. Passengers are extracted nightly.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-[#1e2535] border-[#2a3441]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Generated Reports</CardTitle>
            <FileText className="h-4 w-4 text-[#8b5cf6]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{totalReports}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#1e2535] border-[#2a3441]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Calculated Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-[#0ea5e9]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">LKR {totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-[#1e2535] border-[#2a3441]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Passengers Extracted</CardTitle>
            <Users className="h-4 w-4 text-[#f59e0b]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{totalPassengers.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#1e2535] border-[#2a3441]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Buses</CardTitle>
            <Bus className="h-4 w-4 text-[#10b981]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{activeBuses}</div>
          </CardContent>
        </Card>
      </div>

      {/* Reports Table */}
      <Card className="bg-[#1e2535] border-[#2a3441]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-[#0ea5e9]" />
            Live Embedded Trip Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-[#2a3441]">
            <Table>
              <TableHeader className="bg-[#1a2130]">
                <TableRow className="border-[#2a3441] hover:bg-transparent">
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="text-slate-400">Date</TableHead>
                  <TableHead className="text-slate-400">Bus</TableHead>
                  <TableHead className="text-slate-400">Route</TableHead>
                  <TableHead className="text-slate-400 text-right">Passengers</TableHead>
                  <TableHead className="text-slate-400 text-right">Revenue (LKR)</TableHead>
                  <TableHead className="text-slate-400 text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#0ea5e9] border-t-transparent" />
                        Fetching Partner Database...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : !reports || reports.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No partner reports found yet. Run the GitHub Actions scraper to fetch data.
                    </TableCell>
                  </TableRow>
                ) : (
                  reports.map((report: any) => (
                    <React.Fragment key={report.id}>
                      <TableRow 
                        className={`border-[#2a3441] cursor-pointer hover:bg-[#2a3441]/50 ${expandedRow === report.id ? 'bg-[#2a3441]/30 border-b-transparent' : ''}`}
                        onClick={() => toggleRow(report.id)}
                      >
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-white pointer-events-none">
                            {expandedRow === report.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium text-white">
                          {report.report_date ? format(new Date(report.report_date), 'PP') : '-'}
                        </TableCell>
                        <TableCell className="text-slate-300">{report.bus_number || '-'}</TableCell>
                        <TableCell className="text-slate-300">{report.route_name || '-'}</TableCell>
                        <TableCell className="text-right font-medium text-white">{report.total_passengers || 0}</TableCell>
                        <TableCell className="text-right text-[#0ea5e9]">
                          {Number(report.total_revenue_lkr || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            report.status === 'completed'
                              ? 'bg-[#10b981]/10 text-[#10b981] ring-1 ring-inset ring-[#10b981]/20'
                              : 'bg-[#f59e0b]/10 text-[#f59e0b] ring-1 ring-inset ring-[#f59e0b]/20'
                          }`}>
                            {report.status || 'pending'}
                          </span>
                        </TableCell>
                      </TableRow>
                      
                      {/* Expanded Sub-Table */}
                      {expandedRow === report.id && (
                        <TableRow className="border-[#2a3441] hover:bg-transparent bg-transparent">
                          <TableCell colSpan={7} className="p-0">
                            <PassengerSubTable reportId={report.id} />
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MagiyaReports;
