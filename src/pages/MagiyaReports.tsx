import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Bus, Users, DollarSign, Activity, FileText, ChevronDown, ChevronUp, ExternalLink, Calendar, MapPin } from 'lucide-react';
import React, { useState } from 'react';

// Passenger detail table shown when row is expanded
const PassengerDetail = ({ report }: { report: any }) => {
  const { data: passengers, isLoading } = useQuery({
    queryKey: ['magiya-passengers', report.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('magiya_passenger_bookings')
        .select('*')
        .eq('report_id', report.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!report.id,
  });

  return (
    <div className="bg-[#0d1117] border-x border-b border-[#2a3441] rounded-b-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-[#161b22] border-b border-[#2a3441]">
        <div className="flex items-center gap-3">
          <FileText className="h-4 w-4 text-[#f59e0b]" />
          <span className="text-sm font-semibold text-white">Passenger Manifest</span>
          <span className="text-xs text-slate-500">·</span>
          <span className="text-xs text-slate-400">{report.route_name}</span>
          {report.report_date && (
            <>
              <span className="text-xs text-slate-500">·</span>
              <span className="text-xs text-slate-400">{format(new Date(report.report_date), 'dd MMM yyyy')}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Count badge */}
          {passengers && passengers.length > 0 && (
            <span className="text-xs bg-[#0ea5e9]/10 text-[#0ea5e9] ring-1 ring-[#0ea5e9]/20 px-2.5 py-1 rounded-full font-medium">
              {passengers.length} passengers
            </span>
          )}
          {/* PDF link - opens in new tab */}
          {report.pdf_url && (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-[#0ea5e9] hover:text-white hover:bg-[#2a3441] gap-1.5"
              onClick={(e) => { e.stopPropagation(); window.open(report.pdf_url, '_blank'); }}
            >
              <ExternalLink className="h-3 w-3" />
              View PDF
            </Button>
          )}
        </div>
      </div>

      {/* Passenger table */}
      {isLoading ? (
        <div className="flex items-center justify-center gap-2.5 py-10">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#0ea5e9] border-t-transparent" />
          <span className="text-sm text-slate-400">Loading passengers...</span>
        </div>
      ) : !passengers || passengers.length === 0 ? (
        <div className="py-12 text-center">
          <Users className="h-10 w-10 text-slate-700 mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-400">No passenger data yet</p>
          <p className="text-xs text-slate-600 mt-1">Re-run the scraper to extract live passenger rows</p>
          {report.pdf_url && (
            <Button
              size="sm"
              variant="outline"
              className="mt-4 text-xs border-[#2a3441] text-[#0ea5e9] hover:bg-[#2a3441]"
              onClick={() => window.open(report.pdf_url, '_blank')}
            >
              <ExternalLink className="h-3 w-3 mr-1.5" />
              Open Manifest PDF
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-[#2a3441] bg-[#0d1117] hover:bg-transparent">
                <TableHead className="text-xs uppercase tracking-wide font-semibold text-slate-500 pl-5">Seat</TableHead>
                <TableHead className="text-xs uppercase tracking-wide font-semibold text-slate-500">Contact</TableHead>
                <TableHead className="text-xs uppercase tracking-wide font-semibold text-slate-500">Location</TableHead>
                <TableHead className="text-xs uppercase tracking-wide font-semibold text-slate-500">Booking Type</TableHead>
                <TableHead className="text-xs uppercase tracking-wide font-semibold text-slate-500">Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {passengers.map((p: any) => (
                <TableRow key={p.id} className="border-[#1c2333] hover:bg-[#1a2030]">
                  <TableCell className="pl-5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#2a3441] text-white text-xs font-mono font-medium">
                      {p.seat_number || '—'}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-slate-300 font-mono">{p.contact || '—'}</TableCell>
                  <TableCell className="text-sm text-slate-400">{p.location_route || '—'}</TableCell>
                  <TableCell>
                    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                      (p.booking_type || '').includes('Online')
                        ? 'bg-[#0ea5e9]/10 text-[#0ea5e9]'
                        : (p.booking_type || '').includes('NCG')
                        ? 'bg-[#10b981]/10 text-[#10b981]'
                        : 'bg-slate-700/60 text-slate-300'
                    }`}>
                      {p.booking_type || 'Unknown'}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">{p.remarks || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
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
        <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Partner Network Live Data</h1>
        <p className="text-sm text-slate-500">Automated daily extraction from the Magiya Partner Portal. All reports are captured nightly.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-[#1e2535] to-[#1a2030] border-[#2a3441]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wide">Generated Reports</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-[#8b5cf6]/10 flex items-center justify-center">
              <FileText className="h-4 w-4 text-[#8b5cf6]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{totalReports}</div>
            <p className="text-xs text-slate-500 mt-0.5">PDF documents captured</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1e2535] to-[#1a2030] border-[#2a3441]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wide">Calculated Revenue</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-[#0ea5e9]/10 flex items-center justify-center">
              <DollarSign className="h-4 w-4 text-[#0ea5e9]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">LKR {totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-slate-500 mt-0.5">Total revenue value</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1e2535] to-[#1a2030] border-[#2a3441]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wide">Passengers Extracted</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-[#f59e0b]/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-[#f59e0b]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{totalPassengers.toLocaleString()}</div>
            <p className="text-xs text-slate-500 mt-0.5">Total passengers logged</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1e2535] to-[#1a2030] border-[#2a3441]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wide">Active Buses</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-[#10b981]/10 flex items-center justify-center">
              <Bus className="h-4 w-4 text-[#10b981]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{activeBuses}</div>
            <p className="text-xs text-slate-500 mt-0.5">Vehicles with reports</p>
          </CardContent>
        </Card>
      </div>

      {/* Reports Table */}
      <Card className="bg-[#161b22] border-[#2a3441]">
        <CardHeader className="border-b border-[#2a3441] pb-4">
          <CardTitle className="text-white flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-[#0ea5e9]/10 flex items-center justify-center">
              <Activity className="h-4 w-4 text-[#0ea5e9]" />
            </div>
            Live Trip Reports
            {totalReports > 0 && (
              <span className="ml-auto text-xs font-normal text-slate-500 bg-[#2a3441] px-2.5 py-1 rounded-full">
                {totalReports} records
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-[#2a3441] hover:bg-transparent bg-[#0d1117]">
                <TableHead className="w-10 pl-4"></TableHead>
                <TableHead className="text-slate-400 text-xs uppercase tracking-wide font-semibold py-3">Date</TableHead>
                <TableHead className="text-slate-400 text-xs uppercase tracking-wide font-semibold">Bus</TableHead>
                <TableHead className="text-slate-400 text-xs uppercase tracking-wide font-semibold">Route</TableHead>
                <TableHead className="text-slate-400 text-xs uppercase tracking-wide font-semibold text-right">Passengers</TableHead>
                <TableHead className="text-slate-400 text-xs uppercase tracking-wide font-semibold text-right">Revenue (LKR)</TableHead>
                <TableHead className="text-slate-400 text-xs uppercase tracking-wide font-semibold text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="flex items-center justify-center gap-2.5">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#0ea5e9] border-t-transparent" />
                      <span className="text-sm text-slate-400">Fetching partner reports...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : !reports || reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-16">
                    <Activity className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-400">No reports found yet</p>
                    <p className="text-xs text-slate-600 mt-1">Run the GitHub Actions scraper to fetch partner data</p>
                  </TableCell>
                </TableRow>
              ) : (
                reports.map((report: any) => (
                  <React.Fragment key={report.id}>
                    <TableRow
                      className={`border-[#2a3441] cursor-pointer transition-colors ${
                        expandedRow === report.id
                          ? 'bg-[#1e2535] border-b-[#2a3441]'
                          : 'hover:bg-[#1c2333]'
                      }`}
                      onClick={() => toggleRow(report.id)}
                    >
                      <TableCell className="pl-4">
                        <div className={`transition-transform duration-200 ${expandedRow === report.id ? 'rotate-180' : ''}`}>
                          <ChevronDown className="h-4 w-4 text-slate-500" />
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-white py-3.5">
                        {report.report_date ? format(new Date(report.report_date), 'dd MMM yyyy') : '—'}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 text-sm text-slate-300">
                          <Bus className="h-3.5 w-3.5 text-[#10b981]" />
                          {report.bus_number || '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                          <span className="text-sm text-slate-300 truncate max-w-[240px]">{report.route_name || '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-white">
                        {report.total_passengers || 0}
                      </TableCell>
                      <TableCell className="text-right text-[#0ea5e9] font-medium">
                        {Number(report.total_revenue_lkr || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          report.status === 'completed'
                            ? 'bg-[#10b981]/10 text-[#10b981] ring-1 ring-[#10b981]/30'
                            : 'bg-yellow-500/10 text-yellow-400 ring-1 ring-yellow-500/30'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${report.status === 'completed' ? 'bg-[#10b981]' : 'bg-yellow-400'}`} />
                          {report.status || 'pending'}
                        </span>
                      </TableCell>
                    </TableRow>

                    {/* Expanded passenger detail panel */}
                    {expandedRow === report.id && (
                      <TableRow className="border-[#2a3441] hover:bg-transparent">
                        <TableCell colSpan={7} className="p-0">
                          <PassengerDetail report={report} />
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default MagiyaReports;
