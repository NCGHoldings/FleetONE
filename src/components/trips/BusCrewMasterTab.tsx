import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bus, Users, User, Phone, Search, ChevronDown, ChevronUp, Loader2, CreditCard, UserCheck, Briefcase, Calendar, Pencil, Save, Check, X, MapPin, UserCog, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { CrewCollectionSummaryReport } from './CrewCollectionSummaryReport';

export interface CrewMember {
  id: string;
  staff_name: string;
  calling_name: string;
  staff_type: string;
  salary_type: string;
  employment_type: string;
  nic_number: string;
  contact_number: string;
  assigned_bus: string;
  is_active: boolean;
  created_at?: string;
}

export const BusCrewMasterTab = () => {
  const getLeaderColor = (leader: string | undefined | null) => {
    if (!leader || leader === 'Unassigned Personnel' || leader === 'Unassigned Leader') {
      return { bg: 'bg-amber-50/80', text: 'text-amber-700', border: 'border-amber-200', icon: 'text-amber-500' };
    }
    const colors = [
      { bg: 'bg-blue-50/80', text: 'text-blue-800', border: 'border-blue-200', icon: 'text-blue-600' },
      { bg: 'bg-emerald-50/80', text: 'text-emerald-800', border: 'border-emerald-200', icon: 'text-emerald-600' },
      { bg: 'bg-purple-50/80', text: 'text-purple-800', border: 'border-purple-200', icon: 'text-purple-600' },
      { bg: 'bg-amber-50/80', text: 'text-amber-800', border: 'border-amber-200', icon: 'text-amber-600' },
      { bg: 'bg-rose-50/80', text: 'text-rose-800', border: 'border-rose-200', icon: 'text-rose-600' },
      { bg: 'bg-cyan-50/80', text: 'text-cyan-800', border: 'border-cyan-200', icon: 'text-cyan-600' },
    ];
    let hash = 0;
    for (let i = 0; i < leader.length; i++) hash = leader.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  };

  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [selectedMember, setSelectedMember] = useState<CrewMember | null>(null);
  const [busRouteMap, setBusRouteMap] = useState<Map<string, { route: string; leader: string }>>(new Map());
  const [editBusValue, setEditBusValue] = useState('');
  const [isEditingBus, setIsEditingBus] = useState(false);
  const [savingBus, setSavingBus] = useState(false);
  const [showSummaryReport, setShowSummaryReport] = useState(false);
  const { toast } = useToast();

  const formatBusNo = (val: string) => {
    if (!val) return '';
    let cleaned = val.replace(/[\s-]/g, '').toUpperCase();
    const match = cleaned.match(/^([A-Z0-9]+?)(\d{4})$/);
    if (match) cleaned = `${match[1]}-${match[2]}`;
    return cleaned;
  };

  const normalizeBusNo = (val: string) => {
    if (!val) return '';
    return val.replace(/[\s-]/g, '').toUpperCase();
  };

  const normalizeRouteName = (val: string) => {
    if (!val) return '';
    return val.replace(/[\s-()]/g, '').toLowerCase();
  };

  const handleAssignBus = async (memberId: string, newBusNo: string) => {
    try {
      setSavingBus(true);
      const formattedBus = formatBusNo(newBusNo.trim()) || null;
      const { error } = await supabase
        .from('staff_registry')
        .update({ assigned_bus: formattedBus })
        .eq('id', memberId);
        
      if (error) throw error;
      
      toast({ title: 'Bus Assigned', description: `Successfully assigned to ${formattedBus}` });
      setIsEditingBus(false);
      // Update local state
      if (selectedMember) {
        setSelectedMember({ ...selectedMember, assigned_bus: formattedBus || '' });
      }
      fetchMasterData();
    } catch (err) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to assign bus', variant: 'destructive' });
    } finally {
      setSavingBus(false);
    }
  };

  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    try {
      setLoading(true);
      // 1. Fetch Crew
      const { data: crewData, error } = await supabase
        .from('staff_registry')
        .select('*')
        .not('nic_number', 'is', null)
        .neq('nic_number', '')
        .not('contact_number', 'is', null)
        .neq('contact_number', '')
        .order('assigned_bus', { ascending: true, nullsFirst: false });

      if (error) {
        console.error('Error fetching crew data:', error);
      } else {
        const realCrew = (crewData || []).filter(m => 
          m.nic_number && m.nic_number.length > 3 && 
          m.contact_number && m.contact_number.length > 3
        );
        setCrew(realCrew);
      }

      // 2. Fetch routes and team leaders
      const { data: allRoutes } = await supabase.from('routes').select('route_name, route_leader').eq('is_active', true);
      const routeLeaderMap = new Map();
      allRoutes?.forEach(r => {
        if (r.route_name && r.route_leader) {
          routeLeaderMap.set(normalizeRouteName(r.route_name), r.route_leader);
        }
      });

      // 3. Fetch fleet_master_roster
      const { data: roster } = await supabase.from('fleet_master_roster').select(`
        route_label,
        buses:bus_id(bus_no),
        routes:route_id(route_leader)
      `).eq('is_active', true);

      const bMap = new Map<string, { route: string; leader: string; formatted: string }>();
      roster?.forEach(r => {
        // Handle potential array or object from the join
        const busNoObj = Array.isArray(r.buses) ? r.buses[0] : r.buses;
        const busNo = busNoObj?.bus_no;
        
        if (busNo) {
          let leader = 'Unassigned Leader';
          
          const routeObj = Array.isArray(r.routes) ? r.routes[0] : r.routes;
          if (routeObj?.route_leader) {
            leader = routeObj.route_leader;
          } else if (r.route_label) {
            const normRoute = normalizeRouteName(r.route_label);
            if (routeLeaderMap.has(normRoute)) {
              leader = routeLeaderMap.get(normRoute);
            }
          }
          
          const normalized = normalizeBusNo(busNo);
          bMap.set(normalized, { 
            route: r.route_label || 'Unassigned Route', 
            leader,
            formatted: formatBusNo(busNo)
          });
        }
      });
      setBusRouteMap(bMap);

    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (busNo: string) => {
    setExpandedRows(prev => ({ ...prev, [busNo]: !prev[busNo] }));
  };

  // Group by assigned bus first
  const groupedByBus = crew.reduce((acc, member) => {
    const rawBus = member.assigned_bus ? member.assigned_bus : 'UNASSIGNED';
    const busKey = rawBus === 'UNASSIGNED' ? 'UNASSIGNED' : formatBusNo(rawBus);
    if (!acc[busKey]) acc[busKey] = [];
    acc[busKey].push(member);
    return acc;
  }, {} as Record<string, CrewMember[]>);

  // Ensure all active buses from roster are included, even if they have 0 crew
  busRouteMap.forEach((info) => {
    const formatted = info.formatted;
    if (!groupedByBus[formatted]) {
      groupedByBus[formatted] = [];
    }
  });

  // Then build Leader -> Route -> Bus Hierarchy
  const hierarchy = new Map<string, Map<string, { busNo: string, members: CrewMember[] }[]>>();
  let totalVisibleProfiles = 0;

  Object.entries(groupedByBus).forEach(([busNo, members]) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = busNo.toLowerCase().includes(q) || members.some(m =>
      (m.staff_name && m.staff_name.toLowerCase().includes(q)) ||
      (m.calling_name && m.calling_name.toLowerCase().includes(q)) ||
      (m.nic_number && m.nic_number.toLowerCase().includes(q))
    );
    
    if (!matchesSearch) return;

    let leader = 'Unassigned Leader';
    let route = 'Unassigned Route';

    if (busNo !== 'UNASSIGNED') {
      const normBus = normalizeBusNo(busNo);
      const info = busRouteMap.get(normBus);
      if (info) {
        leader = info.leader || 'Unassigned Leader';
        route = info.route || 'Unassigned Route';
      }
    } else {
      leader = 'Unassigned Personnel';
      route = 'No Assigned Bus';
    }

    if (!hierarchy.has(leader)) hierarchy.set(leader, new Map());
    const routeMap = hierarchy.get(leader)!;
    
    if (!routeMap.has(route)) routeMap.set(route, []);
    routeMap.get(route)!.push({ busNo, members });
    
    totalVisibleProfiles += members.length;
  });

  const sortedLeaders = Array.from(hierarchy.entries()).sort(([a], [b]) => {
    if (a === 'Unassigned Personnel') return 1;
    if (b === 'Unassigned Personnel') return -1;
    return a.localeCompare(b);
  });

  if (loading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
          <p className="text-slate-500 font-medium">Loading staff profiles...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border shadow-sm overflow-hidden">
        <div className="bg-white border-b p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Staff Profile Collection</h2>
              <p className="text-xs font-medium text-slate-500">
                Crew profiles submitted via Create Profile · Click any name to view full details
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 font-bold hidden sm:flex"
              onClick={() => setShowSummaryReport(true)}
            >
              <FileText className="w-4 h-4 mr-2" />
              View Summary Report
            </Button>
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
              {totalVisibleProfiles} Profiles
            </Badge>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search bus, name, NIC..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 bg-slate-50"
              />
            </div>
          </div>
        </div>

        <div className="w-full overflow-x-auto pb-6">
          <div className="min-w-[1200px] px-4">
            {/* Header */}
            <div className="flex bg-slate-50/80 rounded-t-xl border border-slate-200/60 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              <div className="w-40 p-3 border-r border-slate-200/50 sticky left-0 z-10 bg-slate-50/80 backdrop-blur-sm">Bus Number</div>
              <div className="flex-1 min-w-[140px] p-3 border-r border-slate-200/50">1st Driver</div>
              <div className="flex-1 min-w-[140px] p-3 border-r border-slate-200/50">1st Conductor</div>
              <div className="flex-1 min-w-[140px] p-3 border-r border-slate-200/50">2nd Driver</div>
              <div className="flex-1 min-w-[140px] p-3 border-r border-slate-200/50">2nd Conductor</div>
              <div className="flex-1 min-w-[140px] p-3 border-r border-slate-200/50">3rd Driver</div>
              <div className="flex-1 min-w-[140px] p-3 border-r border-slate-200/50">3rd Conductor</div>
              <div className="w-16 p-3 text-center">More</div>
            </div>

            {/* Hierarchy Rows */}
            {sortedLeaders.length === 0 ? (
              <div className="p-16 text-center text-slate-500 font-medium bg-white rounded-xl border border-dashed border-slate-300">
                <Users className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                <p>No crew profiles found.</p>
                <p className="text-xs text-slate-400 mt-1">Profiles appear here once crew members create their profile via the Crew Login portal.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {sortedLeaders.map(([leader, routeMap]) => {
                  const colors = getLeaderColor(leader);
                  return (
                    <div key={leader} className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                      {/* Leader Header */}
                      <div className={`px-4 py-3 flex items-center justify-between border-b ${colors.bg} ${colors.border}`}>
                        <div className="flex items-center gap-2">
                          <UserCog className={`h-5 w-5 ${colors.icon}`} />
                          <h3 className={`font-black text-sm uppercase tracking-wide ${colors.text}`}>
                            TEAM LEADER: {leader}
                          </h3>
                        </div>
                        <Badge variant="outline" className={`bg-white/60 ${colors.text} ${colors.border}`}>
                          {Array.from(routeMap.values()).flat().length} Buses
                        </Badge>
                      </div>

                    {/* Routes under this Leader */}
                    <div className="p-2 space-y-4 bg-slate-50/50">
                      {Array.from(routeMap.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([route, buses]) => (
                        <div key={route} className="flex flex-col relative rounded-lg border border-slate-200/60 bg-white shadow-sm pb-2">
                          {/* Route Header */}
                          <div className="px-3 py-2 flex items-center gap-2 text-xs font-bold text-slate-500 border-b border-slate-100 bg-slate-50/50 rounded-t-lg">
                            <MapPin className="h-3 w-3 text-slate-400" />
                            <span className="uppercase tracking-widest">{route}</span>
                            <span className="text-slate-400 ml-1">({buses.length})</span>
                          </div>

                          <div className="px-2 pt-2 space-y-2">
                            {buses.sort((a, b) => a.busNo.localeCompare(b.busNo)).map(({ busNo, members }) => {
                              const drivers = members.filter(m => m.staff_type === 'driver');
                              const conductors = members.filter(m => m.staff_type === 'conductor');
                              
                              const d1 = drivers[0];
                              const d2 = drivers[1];
                              const d3 = drivers[2];
                              const c1 = conductors[0];
                              const c2 = conductors[1];
                              const c3 = conductors[2];
                              
                              const isExpanded = !!expandedRows[busNo];
                              const renderedCount = [d1, d2, d3, c1, c2, c3].filter(Boolean).length;
                              const extraCount = members.length - renderedCount;
                              const isUnassigned = busNo === 'UNASSIGNED';

                              const renderCrewSlot = (member: CrewMember | undefined, isDriver: boolean) => {
                                if (!member) {
                                  return (
                                    <div className="flex items-center gap-2.5">
                                      <div className="h-7 w-7 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0 shadow-sm">
                                        <X className="h-4 w-4 text-rose-500" strokeWidth={3} />
                                      </div>
                                      <div className="text-rose-400 text-[11px] font-bold tracking-wide uppercase">Missing</div>
                                    </div>
                                  );
                                }
                                
                                const isDaily = member.salary_type === 'daily';
                                const name = member.staff_name || member.calling_name || '';
                                const initials = name.substring(0, 2).toUpperCase();
                                
                                return (
                                  <div className="flex items-center gap-2.5">
                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm border ${
                                      isDriver ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-blue-100 text-blue-700 border-blue-200'
                                    }`}>
                                      {initials}
                                    </div>
                                    <div className="flex flex-col items-start min-w-0">
                                      <div className={`font-semibold text-[11px] truncate max-w-full ${isDriver ? 'text-emerald-800' : 'text-blue-800'}`}>
                                        {name}
                                      </div>
                                      {isDaily && (
                                        <span className="px-1.5 py-[1px] rounded bg-rose-100 text-rose-700 text-[8px] font-black uppercase tracking-wider shadow-sm border border-rose-200 mt-0.5">
                                          Daily Wage
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              };

                              return (
                                <div key={busNo} className={`flex flex-col relative rounded-lg border transition-all duration-200 ${
                                  isUnassigned ? 'border-dashed border-amber-300 bg-amber-50/30' : 'border-slate-200/80 bg-white hover:border-blue-300 hover:shadow-md'
                                }`}>
                      {/* Summary Row */}
                      <div
                        className="flex items-stretch cursor-pointer hover:bg-slate-50/50 rounded-xl relative z-0 min-h-[60px]"
                        onClick={() => toggleRow(busNo)}
                      >
                        <div className={`w-40 p-3 border-r border-slate-100 flex items-center gap-3 sticky left-0 z-10 rounded-l-xl ${isUnassigned ? 'bg-amber-50/80 backdrop-blur-md' : 'bg-white/90 backdrop-blur-md shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]'}`}>
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${isUnassigned ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'}`}>
                            <Bus className="h-4 w-4" />
                          </div>
                          <div className={`font-black text-sm tracking-wide ${isUnassigned ? 'text-amber-700' : 'text-slate-700'}`}>{busNo}</div>
                        </div>

                        <div className="flex-1 min-w-[140px] p-3 border-r border-slate-50 flex flex-col justify-center">{renderCrewSlot(d1, true)}</div>
                        <div className="flex-1 min-w-[140px] p-3 border-r border-slate-50 flex flex-col justify-center">{renderCrewSlot(c1, false)}</div>
                        <div className="flex-1 min-w-[140px] p-3 border-r border-slate-50 flex flex-col justify-center">{renderCrewSlot(d2, true)}</div>
                        <div className="flex-1 min-w-[140px] p-3 border-r border-slate-50 flex flex-col justify-center">{renderCrewSlot(c2, false)}</div>
                        <div className="flex-1 min-w-[140px] p-3 border-r border-slate-50 flex flex-col justify-center">{renderCrewSlot(d3, true)}</div>
                        <div className="flex-1 min-w-[140px] p-3 border-r border-slate-50 flex flex-col justify-center">{renderCrewSlot(c3, false)}</div>

                        <div className="w-16 flex items-center justify-center relative">
                          {extraCount > 0 && (
                            <Badge variant="secondary" className="absolute -top-2 -right-2 text-[10px] h-5 px-1.5 bg-blue-100 text-blue-700 border border-blue-200">+{extraCount}</Badge>
                          )}
                          <div className={`p-1.5 rounded-full transition-colors ${isExpanded ? 'bg-slate-200 text-slate-700' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'}`}>
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Detail Table */}
                      {isExpanded && (
                        <div className="bg-slate-50 p-4 border-t border-slate-100 rounded-b-xl shadow-inner">
                        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                          <div className="flex bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            <div className="w-44 p-3 border-r">Name</div>
                            <div className="w-24 p-3 border-r">Role</div>
                            <div className="flex-1 p-3 border-r">NIC Number</div>
                            <div className="w-32 p-3 border-r">Phone</div>
                            <div className="w-36 p-3 border-r">Employment</div>
                            <div className="w-40 p-3">Assign Bus</div>
                          </div>
                          {members.map(member => (
                            <div
                              key={member.id}
                              className="flex border-b last:border-0 hover:bg-blue-50/30 items-center cursor-pointer transition-colors"
                              onClick={(e) => { e.stopPropagation(); setSelectedMember(member); setIsEditingBus(false); }}
                            >
                              <div className="w-44 p-3 border-r font-semibold text-slate-700 text-sm">
                                {member.staff_name || member.calling_name}
                              </div>
                              <div className="w-24 p-3 border-r">
                                <Badge variant="outline" className={`text-[10px] capitalize ${member.staff_type === 'driver' ? 'text-emerald-700 border-emerald-200 bg-emerald-50' : 'text-blue-700 border-blue-200 bg-blue-50'}`}>
                                  {member.staff_type}
                                </Badge>
                              </div>
                              <div className="flex-1 p-3 border-r text-sm text-slate-600 font-mono tracking-wide">
                                {member.nic_number || <span className="text-slate-400 italic font-sans">N/A</span>}
                              </div>
                              <div className="w-32 p-3 border-r text-sm text-slate-600 flex items-center gap-1.5">
                                <Phone className="h-3 w-3 text-slate-400" />
                                {member.contact_number || 'N/A'}
                              </div>
                              <div className="w-36 p-3 border-r flex flex-col gap-1 items-start">
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium capitalize w-max border border-slate-200">
                                  {member.employment_type || 'permanent'}
                                </span>
                                {member.salary_type === 'daily' ? (
                                  <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700 text-[10px] font-bold uppercase tracking-wider shadow-sm border border-rose-200 w-max">
                                    Daily Wage
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium capitalize border border-slate-200 w-max">
                                    {member.salary_type || 'Monthly'}
                                  </span>
                                )}
                              </div>
                              <div className="w-40 p-2" onClick={(e) => e.stopPropagation()}>
                                <Input 
                                  defaultValue={member.assigned_bus || ''}
                                  placeholder="UNASSIGNED"
                                  className="h-8 text-xs bg-white uppercase font-bold text-slate-700 placeholder:text-slate-300"
                                  onBlur={(e) => {
                                    if (e.target.value.toUpperCase() !== (member.assigned_bus || '')) {
                                      handleAssignBus(member.id, e.target.value);
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.currentTarget.blur();
                                    }
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      )}
                    </div>
                  );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )})}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* ── Profile Detail Popup ── */}
      <Dialog open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${selectedMember?.staff_type === 'driver' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg">Crew Member Profile</span>
                <Badge variant="outline" className={`ml-2 text-[10px] capitalize ${selectedMember?.staff_type === 'driver' ? 'text-emerald-700 border-emerald-200 bg-emerald-50' : 'text-blue-700 border-blue-200 bg-blue-50'}`}>
                  {selectedMember?.staff_type}
                </Badge>
              </div>
            </DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-4 pt-2">
              {/* Name Section */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-xl p-5 border space-y-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Full Name</p>
                  <p className="text-xl font-bold text-slate-800">{selectedMember.staff_name}</p>
                  {selectedMember.calling_name && selectedMember.calling_name !== selectedMember.staff_name && (
                    <p className="text-sm text-slate-500 mt-0.5">Known as: <span className="font-semibold">{selectedMember.calling_name}</span></p>
                  )}
                </div>

                <div className="border-t border-slate-200 pt-4 grid grid-cols-1 gap-3">
                  {/* NIC */}
                  <div className="flex items-center gap-3 bg-white p-3 rounded-lg border">
                    <CreditCard className="h-4 w-4 text-blue-500 shrink-0" />
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">NIC / ID Card Number</p>
                      <p className="text-sm font-mono font-semibold text-slate-700 tracking-wider">
                        {selectedMember.nic_number || 'Not Provided'}
                      </p>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="flex items-center gap-3 bg-white p-3 rounded-lg border">
                    <Phone className="h-4 w-4 text-emerald-500 shrink-0" />
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Contact Number</p>
                      <p className="text-sm font-semibold text-slate-700">
                        {selectedMember.contact_number || 'Not Provided'}
                      </p>
                    </div>
                  </div>

                  {/* Assigned Bus — Editable */}
                  <div className="flex items-center gap-3 bg-white p-3 rounded-lg border">
                    <Bus className="h-4 w-4 text-orange-500 shrink-0" />
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Assigned Bus / පවරා ඇති බස් රථය</p>
                      {isEditingBus ? (
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            value={editBusValue}
                            onChange={(e) => setEditBusValue(formatBusNo(e.target.value))}
                            placeholder="e.g. ND-3456"
                            className="h-8 text-sm font-bold tracking-wider uppercase flex-1"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white"
                            disabled={savingBus || !editBusValue.trim()}
                            onClick={() => handleAssignBus(selectedMember.id, editBusValue)}
                          >
                            {savingBus ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between mt-0.5">
                          <p className={`text-sm font-semibold ${selectedMember.assigned_bus ? 'text-slate-700' : 'text-orange-500'}`}>
                            {selectedMember.assigned_bus || 'Unassigned'}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-blue-600 hover:bg-blue-50 text-xs font-bold gap-1"
                            onClick={() => {
                              setEditBusValue(selectedMember.assigned_bus || '');
                              setIsEditingBus(true);
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                            {selectedMember.assigned_bus ? 'Change' : 'Assign'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Employment Type */}
                  <div className="flex items-center gap-3 bg-white p-3 rounded-lg border">
                    <Briefcase className="h-4 w-4 text-purple-500 shrink-0" />
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Employment Details</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 text-xs font-bold capitalize border border-purple-100">
                          {selectedMember.employment_type || 'permanent'}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-xs font-bold capitalize border border-amber-100">
                          {selectedMember.salary_type} Wage
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Registration Date */}
                  {selectedMember.created_at && (
                    <div className="flex items-center gap-3 bg-white p-3 rounded-lg border">
                      <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Profile Created</p>
                        <p className="text-sm font-semibold text-slate-700">
                          {new Date(selectedMember.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Status */}
              <div className="flex justify-center">
                <Badge className={`px-3 py-1 text-xs ${selectedMember.is_active ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'}`} variant="outline">
                  {selectedMember.is_active ? '● Active Crew Member' : '● Inactive'}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {showSummaryReport && (
        <CrewCollectionSummaryReport 
          crew={crew} 
          busRouteMap={busRouteMap} 
          onClose={() => setShowSummaryReport(false)} 
        />
      )}
    </>
  );
};
