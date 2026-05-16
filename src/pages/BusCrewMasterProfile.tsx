import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bus, Users, Phone, ShieldCheck, Search, Loader2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { Input } from '@/components/ui/input';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface CrewMember {
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
}

export default function BusCrewMasterProfile() {
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('staff_registry')
        .select('*')
        .order('assigned_bus', { ascending: true, nullsFirst: false });

      if (error) {
        console.error('Error fetching crew data:', error);
      } else {
        setCrew(data || []);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Group by assigned bus
  const groupedByBus = crew.reduce((acc, member) => {
    // If no assigned bus, group under "Unassigned"
    const bus = member.assigned_bus ? member.assigned_bus.toUpperCase() : 'UNASSIGNED';
    if (!acc[bus]) {
      acc[bus] = [];
    }
    acc[bus].push(member);
    return acc;
  }, {} as Record<string, CrewMember[]>);

  // Filter based on search query (either bus number or staff name)
  const filteredBuses = Object.entries(groupedByBus).filter(([busNo, members]) => {
    const q = searchQuery.toLowerCase();
    return (
      busNo.toLowerCase().includes(q) ||
      members.some(m => 
        (m.staff_name && m.staff_name.toLowerCase().includes(q)) || 
        (m.calling_name && m.calling_name.toLowerCase().includes(q))
      )
    );
  });

  return (
    <div className="container mx-auto p-4 max-w-5xl space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Bus Crew Master Data</h1>
          <p className="text-slate-500 mt-1">Manage and view crew assignments per bus</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search bus or crew member..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mb-4" />
          <p className="text-slate-500 font-medium">Loading master data...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBuses.map(([busNo, members]) => {
            const driversCount = members.filter(m => m.staff_type === 'driver').length;
            const conductorsCount = members.filter(m => m.staff_type === 'conductor').length;

            return (
              <Card key={busNo} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow border-slate-200">
                <CardHeader className={`${busNo === 'UNASSIGNED' ? 'bg-slate-100' : 'bg-blue-50'} border-b border-slate-100 pb-4`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${busNo === 'UNASSIGNED' ? 'bg-slate-200 text-slate-600' : 'bg-blue-100 text-blue-700'}`}>
                        <Bus className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-xl font-bold text-slate-800">
                        {busNo}
                      </CardTitle>
                    </div>
                    <Badge variant={busNo === 'UNASSIGNED' ? 'secondary' : 'default'} className="rounded-full px-3">
                      {members.length} Crew
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center gap-3 pt-2">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-white/60 px-2 py-1 rounded">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> 
                      {driversCount} Driver{driversCount !== 1 && 's'}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-white/60 px-2 py-1 rounded">
                      <Users className="h-3.5 w-3.5 text-blue-600" /> 
                      {conductorsCount} Conductor{conductorsCount !== 1 && 's'}
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100">
                    {members.map((member) => (
                      <div key={member.id} className="p-4 hover:bg-slate-50 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold text-slate-800">{member.staff_name || member.calling_name}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{member.nic_number}</p>
                          </div>
                          <Badge variant="outline" className={`text-xs capitalize ${member.staff_type === 'driver' ? 'text-emerald-700 border-emerald-200 bg-emerald-50' : 'text-blue-700 border-blue-200 bg-blue-50'}`}>
                            {member.staff_type}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-600 mt-3">
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            {member.contact_number || 'N/A'}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium capitalize">{member.employment_type || 'permanent'}</span>
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium capitalize">{member.salary_type}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          
          {filteredBuses.length === 0 && (
            <div className="col-span-full py-12 text-center">
              <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-slate-800">No Crew Found</h3>
              <p className="text-slate-500">No crew members match your search criteria.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
