import React, { useState, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Printer, Filter, X, FileText, Bus, Users, AlertCircle, CheckCircle2 } from 'lucide-react';
import { CrewMember } from './BusCrewMasterTab';

interface CrewCollectionSummaryReportProps {
  crew: CrewMember[];
  busRouteMap: Map<string, { route: string; leader: string; formatted: string }>;
  onClose: () => void;
}

export const CrewCollectionSummaryReport: React.FC<CrewCollectionSummaryReportProps> = ({ crew, busRouteMap, onClose }) => {
  const [filterLeader, setFilterLeader] = useState<string>('all');
  const [filterRoute, setFilterRoute] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'detailed' | 'route_summary' | 'leader_summary'>('detailed');
  
  const printRef = useRef<HTMLDivElement>(null);

  // Group data exactly like the master tab
  const groupedByBus = useMemo(() => {
    const acc: Record<string, CrewMember[]> = {};
    crew.forEach((member) => {
      const rawBus = member.assigned_bus ? member.assigned_bus : 'UNASSIGNED';
      if (!acc[rawBus]) acc[rawBus] = [];
      acc[rawBus].push(member);
    });

    busRouteMap.forEach((info) => {
      const formatted = info.formatted;
      if (!acc[formatted]) {
        acc[formatted] = [];
      }
    });
    return acc;
  }, [crew, busRouteMap]);

  const reportData = useMemo(() => {
    const leadersMap = new Map<string, any>();

    Object.entries(groupedByBus).forEach(([busNo, members]) => {
      if (busNo === 'UNASSIGNED') return;

      const normBus = busNo.replace(/[\s-]/g, '').toUpperCase();
      const info = busRouteMap.get(normBus);
      const leader = info?.leader || 'Unassigned Leader';
      const route = info?.route || 'Unassigned Route';

      const drivers = members.filter(m => m.staff_type === 'driver');
      const conductors = members.filter(m => m.staff_type === 'conductor');
      
      const missingDetails = drivers.length === 0 || conductors.length === 0;

      if (!leadersMap.has(leader)) {
        leadersMap.set(leader, {
          leader,
          routes: new Map<string, any>(),
          totalBuses: 0,
          totalDrivers: 0,
          totalConductors: 0,
          missingBuses: 0,
        });
      }

      const lData = leadersMap.get(leader);
      
      if (!lData.routes.has(route)) {
        lData.routes.set(route, {
          route,
          buses: [],
          totalBuses: 0,
          totalDrivers: 0,
          totalConductors: 0,
          missingBuses: 0,
        });
      }

      const rData = lData.routes.get(route);
      
      const busEntry = {
        busNo,
        drivers: drivers.length,
        conductors: conductors.length,
        missing: missingDetails
      };

      rData.buses.push(busEntry);
      rData.totalBuses += 1;
      rData.totalDrivers += drivers.length;
      rData.totalConductors += conductors.length;
      if (missingDetails) rData.missingBuses += 1;

      lData.totalBuses += 1;
      lData.totalDrivers += drivers.length;
      lData.totalConductors += conductors.length;
      if (missingDetails) lData.missingBuses += 1;
    });

    return Array.from(leadersMap.values()).map(l => ({
      ...l,
      routes: Array.from(l.routes.values())
    })).sort((a, b) => a.leader.localeCompare(b.leader));
  }, [groupedByBus, busRouteMap]);

  // Derived filters
  const uniqueLeaders = Array.from(new Set(reportData.map(d => d.leader))).sort();
  
  const uniqueRoutes = useMemo(() => {
    const rSet = new Set<string>();
    reportData.forEach(l => {
      if (filterLeader === 'all' || l.leader === filterLeader) {
        l.routes.forEach((r: any) => rSet.add(r.route));
      }
    });
    return Array.from(rSet).sort();
  }, [reportData, filterLeader]);

  // Apply filters to data
  const filteredData = useMemo(() => {
    return reportData
      .filter(l => filterLeader === 'all' || l.leader === filterLeader)
      .map(l => ({
        ...l,
        routes: l.routes
          .filter((r: any) => filterRoute === 'all' || r.route === filterRoute)
          .map((r: any) => ({
             ...r,
             buses: r.buses.filter((b: any) => {
                if (filterStatus === 'all') return true;
                if (filterStatus === 'missing') return b.missing;
                if (filterStatus === 'complete') return !b.missing;
                return true;
             })
          }))
          .filter((r: any) => r.buses.length > 0)
      }))
      .filter(l => l.routes.length > 0);
  }, [reportData, filterLeader, filterRoute, filterStatus]);

  // Overall totals from filtered data
  const totals = filteredData.reduce((acc, l) => {
    acc.totalBuses += l.routes.reduce((sum: number, r: any) => sum + r.buses.length, 0);
    acc.totalDrivers += l.routes.reduce((sum: number, r: any) => sum + r.buses.reduce((s: number, b: any) => s + b.drivers, 0), 0);
    acc.totalConductors += l.routes.reduce((sum: number, r: any) => sum + r.buses.reduce((s: number, b: any) => s + b.conductors, 0), 0);
    acc.missingBuses += l.routes.reduce((sum: number, r: any) => sum + r.buses.reduce((s: number, b: any) => s + (b.missing ? 1 : 0), 0), 0);
    return acc;
  }, { totalBuses: 0, totalDrivers: 0, totalConductors: 0, missingBuses: 0 });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col print:static print:h-auto print:w-full print:overflow-visible print:bg-white overflow-hidden">
      {/* Header - Hidden in Print */}
      <div className="h-16 bg-white border-b px-6 flex items-center justify-between shrink-0 print:hidden shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg text-blue-700">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-slate-800">Crew Collection Summary Report</h2>
            <p className="text-xs text-slate-500">
              {viewMode === 'detailed' ? 'Route Leader & Route-wise Staff Profiles Status' : 
               viewMode === 'route_summary' ? 'Route Leader & Route Summary' : 
               'Route Leader Aggregated Summary'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={filterLeader} onValueChange={setFilterLeader}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="All Leaders" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Leaders</SelectItem>
              {uniqueLeaders.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filterRoute} onValueChange={setFilterRoute}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="All Routes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Routes</SelectItem>
              {uniqueRoutes.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px] h-9">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="missing">Missing Details</SelectItem>
              <SelectItem value="complete">Fully Crewed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
            <SelectTrigger className="w-[180px] h-9 bg-emerald-50 border-emerald-200 text-emerald-800 font-medium shadow-sm">
              <SelectValue placeholder="Report View" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="detailed">Detailed (Bus Level)</SelectItem>
              <SelectItem value="route_summary">Route Summary</SelectItem>
              <SelectItem value="leader_summary">Leader Summary Only</SelectItem>
            </SelectContent>
          </Select>

          <div className="w-px h-6 bg-slate-200 mx-1"></div>

          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 text-slate-700">
            <Printer className="w-4 h-4" />
            Print / PDF
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full bg-slate-100 hover:bg-slate-200 ml-2">
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Report Content */}
      <div className="flex-1 overflow-auto p-8 print:p-0 bg-slate-50 print:bg-white print:overflow-visible print:h-auto print:block">
        <div className="max-w-[1000px] mx-auto bg-white rounded-xl shadow-sm border p-8 print:shadow-none print:border-none print:p-0 print:max-w-none report-container" ref={printRef}>
          
          {/* Report Header for Print */}
          <div className="mb-8 border-b pb-6">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Staff Profile Collection Report</h1>
                <p className="text-sm text-slate-500 font-medium mt-1">Generated on {new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</p>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-xs px-3 py-1">
                  Filters: {filterLeader !== 'all' ? filterLeader : 'All Leaders'} • {filterRoute !== 'all' ? filterRoute : 'All Routes'} • {filterStatus !== 'all' ? (filterStatus === 'missing' ? 'Missing Details' : 'Fully Crewed') : 'All Status'}
                </Badge>
              </div>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-4 gap-4 mb-8 print:break-inside-avoid">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col print:border-slate-300">
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <Bus className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Total Buses</span>
              </div>
              <span className="text-3xl font-black text-slate-800">{totals.totalBuses}</span>
            </div>
            
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 flex flex-col print:border-slate-300">
              <div className="flex items-center gap-2 text-blue-600 mb-2">
                <Users className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Drivers</span>
              </div>
              <span className="text-3xl font-black text-blue-800">{totals.totalDrivers}</span>
            </div>

            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 flex flex-col print:border-slate-300">
              <div className="flex items-center gap-2 text-emerald-600 mb-2">
                <Users className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Conductors</span>
              </div>
              <span className="text-3xl font-black text-emerald-800">{totals.totalConductors}</span>
            </div>

            <div className={`rounded-xl p-4 border flex flex-col ${totals.missingBuses > 0 ? 'bg-rose-50 border-rose-100 print:border-slate-300' : 'bg-slate-50 border-slate-100 print:border-slate-300'}`}>
              <div className={`flex items-center gap-2 mb-2 ${totals.missingBuses > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                <AlertCircle className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Missing Staff</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-black ${totals.missingBuses > 0 ? 'text-rose-700' : 'text-slate-800'}`}>
                  {totals.missingBuses}
                </span>
                <span className="text-sm font-medium text-slate-500">buses</span>
              </div>
            </div>
          </div>

          {/* Breakdown Tables */}
          <div className="space-y-8 print:space-y-6">
            {filteredData.length === 0 ? (
              <div className="text-center py-12 text-slate-500 border border-dashed rounded-xl">
                No data available for the selected filters.
              </div>
            ) : viewMode === 'leader_summary' ? (
              <div className="border rounded-xl overflow-hidden print:border-slate-300 shadow-sm print:shadow-none bg-white">
                <table className="w-full text-sm text-left print:border-collapse">
                  <thead className="text-[10px] uppercase tracking-wider text-slate-500 bg-slate-100 print:bg-transparent">
                    <tr>
                      <th className="px-5 py-3 font-bold print:border-b">Route Leader</th>
                      <th className="px-5 py-3 font-bold text-center print:border-b">Total Routes</th>
                      <th className="px-5 py-3 font-bold text-center print:border-b">Total Buses</th>
                      <th className="px-5 py-3 font-bold text-center text-rose-600 print:border-b">Missing Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                    {filteredData.map((leaderGroup: any) => {
                      const totalRoutes = leaderGroup.routes.length;
                      const totalBuses = leaderGroup.routes.reduce((s:number,r:any)=>s+r.buses.length,0);
                      const missing = leaderGroup.routes.reduce((s:number,r:any)=>s+r.buses.filter((b:any)=>b.missing).length,0);
                      return (
                        <tr key={leaderGroup.leader} className="hover:bg-slate-50 transition-colors print:break-inside-avoid">
                          <td className="px-5 py-3 font-bold text-slate-800">{leaderGroup.leader}</td>
                          <td className="px-5 py-3 text-center font-medium text-slate-600">{totalRoutes}</td>
                          <td className="px-5 py-3 text-center font-bold text-slate-700">{totalBuses}</td>
                          <td className="px-5 py-3 text-center font-bold text-rose-600">{missing}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : viewMode === 'route_summary' ? (
              filteredData.map((leaderGroup: any) => (
                <div key={leaderGroup.leader} className="border rounded-xl overflow-hidden print:border-slate-300 print:break-inside-avoid shadow-sm print:shadow-none print:mb-4 bg-white">
                  <div className="bg-slate-100 px-5 py-3 border-b flex justify-between items-center print:bg-slate-50 print:border-slate-300">
                    <h3 className="font-bold text-slate-800 text-sm tracking-wide uppercase">TEAM LEADER: {leaderGroup.leader}</h3>
                    <div className="flex gap-4 text-xs font-medium text-slate-600">
                      <span>Total Buses: <strong className="text-slate-800">{leaderGroup.routes.reduce((s:number,r:any)=>s+r.buses.length,0)}</strong></span>
                      <span className="text-slate-300">|</span>
                      <span>Missing Details: <strong className="text-rose-600">{leaderGroup.routes.reduce((s:number,r:any)=>s+r.buses.filter((b:any)=>b.missing).length,0)}</strong></span>
                    </div>
                  </div>
                  <table className="w-full text-sm text-left print:border-collapse">
                    <thead className="text-[10px] uppercase tracking-wider text-slate-400 bg-slate-50 print:bg-transparent">
                      <tr>
                        <th className="px-5 py-2 font-bold w-[50%] print:border-b">Route Name</th>
                        <th className="px-5 py-2 font-bold text-center w-[25%] print:border-b">Total Buses</th>
                        <th className="px-5 py-2 font-bold text-center text-rose-600 w-[25%] print:border-b">Missing Details (Buses)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                      {leaderGroup.routes.map((routeGroup: any) => {
                        const totalBuses = routeGroup.buses.length;
                        const missing = routeGroup.buses.filter((b:any)=>b.missing).length;
                        return (
                          <tr key={routeGroup.route} className="hover:bg-slate-50 transition-colors print:break-inside-avoid">
                            <td className="px-5 py-2.5 font-semibold text-slate-700">{routeGroup.route}</td>
                            <td className="px-5 py-2.5 text-center font-bold text-slate-600">{totalBuses}</td>
                            <td className="px-5 py-2.5 text-center font-bold text-rose-600">{missing}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))
            ) : (
              filteredData.map((leaderGroup: any) => (
                <div key={leaderGroup.leader} className="border rounded-xl overflow-hidden print:border-slate-300 print:break-inside-avoid shadow-sm print:shadow-none print:mb-4">
                  {/* Leader Header */}
                  <div className="bg-slate-100 px-5 py-3 border-b flex justify-between items-center print:bg-slate-50 print:border-slate-300">
                    <h3 className="font-bold text-slate-800 text-sm tracking-wide uppercase">
                      TEAM LEADER: {leaderGroup.leader}
                    </h3>
                    <div className="flex gap-4 text-xs font-medium text-slate-600">
                      <span>Buses: <strong className="text-slate-800">{leaderGroup.routes.reduce((s:number,r:any)=>s+r.buses.length,0)}</strong></span>
                      <span className="text-slate-300">|</span>
                      <span>Missing Details: <strong className="text-rose-600">{leaderGroup.routes.reduce((s:number,r:any)=>s+r.buses.filter((b:any)=>b.missing).length,0)}</strong></span>
                    </div>
                  </div>

                  {/* Routes Table */}
                  <div className="divide-y print:divide-slate-300">
                    {leaderGroup.routes.map((routeGroup: any) => (
                      <div key={routeGroup.route} className="bg-white print:break-inside-avoid">
                        <div className="px-5 py-2.5 bg-slate-50/50 flex justify-between items-center border-b border-slate-100 print:border-slate-300">
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Route: {routeGroup.route}
                          </span>
                        </div>
                        
                        <div className="px-5 py-3">
                          <table className="w-full text-sm text-left print:border-collapse">
                            <thead className="text-[10px] uppercase tracking-wider text-slate-400 bg-slate-50 rounded-md print:bg-transparent">
                              <tr>
                                <th className="px-3 py-2 font-bold rounded-l-md w-[20%] print:border-b">Bus Number</th>
                                <th className="px-3 py-2 font-bold text-center w-[20%] print:border-b">Drivers</th>
                                <th className="px-3 py-2 font-bold text-center w-[20%] print:border-b">Conductors</th>
                                <th className="px-3 py-2 font-bold w-[40%] rounded-r-md text-right print:border-b">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                              {routeGroup.buses.sort((a:any, b:any)=>a.busNo.localeCompare(b.busNo)).map((bus: any) => (
                                <tr key={bus.busNo} className="hover:bg-slate-50 transition-colors print:break-inside-avoid">
                                  <td className="px-3 py-2 font-semibold text-slate-700">{bus.busNo}</td>
                                  <td className="px-3 py-2 text-center">
                                    <Badge variant="secondary" className={`bg-transparent shadow-none ${bus.drivers > 0 ? 'text-emerald-700 font-bold' : 'text-slate-300'} print:text-black print:border-none`}>
                                      {bus.drivers}
                                    </Badge>
                                  </td>
                                  <td className="px-3 py-2 text-center">
                                    <Badge variant="secondary" className={`bg-transparent shadow-none ${bus.conductors > 0 ? 'text-blue-700 font-bold' : 'text-slate-300'} print:text-black print:border-none`}>
                                      {bus.conductors}
                                    </Badge>
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    {bus.missing ? (
                                      <div className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100 print:border-none print:bg-transparent print:text-black">
                                        <AlertCircle className="w-3 h-3 print:hidden" />
                                        Incomplete Details
                                      </div>
                                    ) : (
                                      <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 print:border-none print:bg-transparent print:text-black">
                                        <CheckCircle2 className="w-3 h-3 print:hidden" />
                                        Fully Crewed
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
          
          <style dangerouslySetInnerHTML={{__html: `
            @media print {
              @page { size: portrait; margin: 10mm; }
              body, html, #root { 
                height: auto !important; 
                overflow: visible !important; 
                background: white !important;
              }
              body { 
                -webkit-print-color-adjust: exact !important; 
                print-color-adjust: exact !important; 
              }
              
              /* Hide everything by default */
              body * {
                visibility: hidden;
              }
              
              /* Only show the report container and its children */
              .report-container, .report-container * {
                visibility: visible;
              }
              
              /* Position the report container at the top left to override parent nesting */
              .report-container {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
              }
            }
          `}} />
        </div>
      </div>
    </div>
  );
};
