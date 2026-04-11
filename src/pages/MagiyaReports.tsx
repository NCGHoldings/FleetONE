import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Bus, Users, DollarSign, Activity, FileText, ExternalLink, Eye } from 'lucide-react';
import { useState } from 'react';

const MagiyaReports = () => {
  const [selectedPdf, setSelectedPdf] = useState<string | null>(null);

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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Partner Network Reports</h1>
        <p className="text-muted-foreground">Automated daily booking extractions from the Partner Portal. PDFs are scraped nightly via GitHub Actions.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-[#1e2535] border-[#2a3441]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Reports</CardTitle>
            <FileText className="h-4 w-4 text-[#8b5cf6]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{totalReports}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#1e2535] border-[#2a3441]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Partner Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-[#0ea5e9]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">LKR {totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-[#1e2535] border-[#2a3441]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Passengers</CardTitle>
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

      {/* Embedded PDF Viewer */}
      {selectedPdf && (
        <Card className="bg-[#1e2535] border-[#2a3441]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Eye className="h-5 w-5 text-[#8b5cf6]" />
              PDF Report Viewer
            </CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-[#2a3441] text-white hover:bg-[#2a3441]"
                onClick={() => window.open(selectedPdf, '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-1" /> Open in New Tab
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                onClick={() => setSelectedPdf(null)}
              >
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <iframe
              src={selectedPdf}
              className="w-full rounded-lg border border-[#2a3441]"
              style={{ height: '700px' }}
              title="Partner Report PDF"
            />
          </CardContent>
        </Card>
      )}

      {/* Reports Table */}
      <Card className="bg-[#1e2535] border-[#2a3441]">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-[#0ea5e9]" />
            Daily Route Extractions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-[#2a3441]">
            <Table>
              <TableHeader className="bg-[#1a2130]">
                <TableRow className="border-[#2a3441] hover:bg-transparent">
                  <TableHead className="text-slate-400">Date</TableHead>
                  <TableHead className="text-slate-400">Bus</TableHead>
                  <TableHead className="text-slate-400">Route</TableHead>
                  <TableHead className="text-slate-400 text-right">Passengers</TableHead>
                  <TableHead className="text-slate-400 text-right">Revenue (LKR)</TableHead>
                  <TableHead className="text-slate-400 text-center">Status</TableHead>
                  <TableHead className="text-slate-400 text-center">PDF</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#0ea5e9] border-t-transparent" />
                        Syncing with Partner Network...
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
                    <TableRow key={report.id} className="border-[#2a3441] hover:bg-[#2a3441]/50">
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
                      <TableCell className="text-center">
                        {report.pdf_url ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-[#8b5cf6] hover:text-[#a78bfa] hover:bg-[#8b5cf6]/10"
                            onClick={() => setSelectedPdf(report.pdf_url)}
                          >
                            <Eye className="h-4 w-4 mr-1" /> View
                          </Button>
                        ) : (
                          <span className="text-slate-500 text-xs">—</span>
                        )}
                      </TableCell>
                    </TableRow>
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
