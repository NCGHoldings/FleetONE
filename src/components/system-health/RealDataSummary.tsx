import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { 
  Bus, Users, FileText, DollarSign, Wrench, GraduationCap, 
  Truck, Calendar, RefreshCw, AlertTriangle, Route, ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ModuleStats {
  name: string;
  icon: React.ReactNode;
  count: number;
  activeCount?: number;
  issueCount?: number;
  path: string;
  color: string;
  bgColor: string;
}

export const RealDataSummary = () => {
  const navigate = useNavigate();
  const [modules, setModules] = useState<ModuleStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchModuleData = async () => {
    setIsLoading(true);
    
    try {
      const [
        busesResult,
        staffResult,
        specialHireResult,
        yutongResult,
        studentsResult,
        maintenanceResult,
        journalResult,
        tripsResult,
        routesResult,
        accidentsResult,
      ] = await Promise.all([
        supabase.from('buses').select('id, status', { count: 'exact' }),
        supabase.from('profiles').select('id, status', { count: 'exact' }),
        supabase.from('special_hire_quotations').select('id, trip_status, balance_due', { count: 'exact' }),
        supabase.from('yutong_quotations').select('id, status', { count: 'exact' }),
        supabase.from('school_students').select('id, is_active, payment_status', { count: 'exact' }),
        supabase.from('maintenance_records').select('id, status', { count: 'exact' }),
        supabase.from('journal_entries').select('id, status', { count: 'exact' }),
        supabase.from('daily_trips').select('id, status', { count: 'exact' }),
        supabase.from('routes').select('id, is_active', { count: 'exact' }),
        supabase.from('accident_records').select('id, status', { count: 'exact' }),
      ]);

      const buses = busesResult.data || [];
      const activeBuses = buses.filter(b => b.status === 'active').length;

      const staff = staffResult.data || [];
      const activeStaff = staff.filter(s => s.status === 'active').length;

      const specialHire = specialHireResult.data || [];
      const overduePayments = specialHire.filter(s => s.trip_status === 'completed' && (s.balance_due || 0) > 0).length;

      const yutong = yutongResult.data || [];
      const draftYutong = yutong.filter(y => y.status === 'draft').length;

      const students = studentsResult.data || [];
      const activeStudents = students.filter(s => s.is_active).length;
      const overdueStudents = students.filter(s => s.is_active && s.payment_status === 'overdue').length;

      const maintenance = maintenanceResult.data || [];
      const pendingMaintenance = maintenance.filter(m => m.status === 'pending' || m.status === 'in_progress').length;

      const journals = journalResult.data || [];
      const draftJournals = journals.filter(j => j.status === 'draft').length;

      const trips = tripsResult.data || [];

      const routes = routesResult.data || [];
      const activeRoutes = routes.filter(r => r.is_active).length;

      const accidents = accidentsResult.data || [];
      const openAccidents = accidents.filter(a => a.status && a.status !== 'closed').length;

      setModules([
        { name: 'Fleet', icon: <Bus className="h-5 w-5" />, count: buses.length, activeCount: activeBuses, path: '/fleet-management', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
        { name: 'Staff', icon: <Users className="h-5 w-5" />, count: staff.length, activeCount: activeStaff, path: '/staff-management', color: 'text-green-400', bgColor: 'bg-green-500/20' },
        { name: 'Special Hire', icon: <FileText className="h-5 w-5" />, count: specialHire.length, issueCount: overduePayments, path: '/special-hire', color: 'text-purple-400', bgColor: 'bg-purple-500/20' },
        { name: 'Yutong', icon: <Truck className="h-5 w-5" />, count: yutong.length, issueCount: draftYutong, path: '/yutong-quotations', color: 'text-orange-400', bgColor: 'bg-orange-500/20' },
        { name: 'School Bus', icon: <GraduationCap className="h-5 w-5" />, count: students.length, activeCount: activeStudents, issueCount: overdueStudents, path: '/school-bus-service', color: 'text-cyan-400', bgColor: 'bg-cyan-500/20' },
        { name: 'Maintenance', icon: <Wrench className="h-5 w-5" />, count: maintenance.length, issueCount: pendingMaintenance, path: '/maintenance', color: 'text-amber-400', bgColor: 'bg-amber-500/20' },
        { name: 'Accounting', icon: <DollarSign className="h-5 w-5" />, count: journals.length, issueCount: draftJournals, path: '/accounting', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' },
        { name: 'Daily Trips', icon: <Calendar className="h-5 w-5" />, count: trips.length, path: '/daily-trips', color: 'text-indigo-400', bgColor: 'bg-indigo-500/20' },
        { name: 'Routes', icon: <Route className="h-5 w-5" />, count: routes.length, activeCount: activeRoutes, path: '/route-permits', color: 'text-pink-400', bgColor: 'bg-pink-500/20' },
        { name: 'Accidents', icon: <AlertTriangle className="h-5 w-5" />, count: accidents.length, issueCount: openAccidents, path: '/fleet-management', color: 'text-red-400', bgColor: 'bg-red-500/20' },
      ]);
    } catch (error) {
      console.error('Error fetching module data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModuleData();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">Module Overview</h3>
          <p className="text-sm text-slate-400">Real-time data counts from all modules</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchModuleData} disabled={isLoading} className="border-teal-500/30 text-teal-400 hover:bg-teal-500/10">
          <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {modules.map((module) => (
          <Card key={module.name} className="bg-slate-900/50 border-slate-700/50 cursor-pointer hover:border-slate-600/50 transition-all" onClick={() => navigate(module.path)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className={cn("p-2 rounded-lg", module.bgColor)}>
                  <span className={module.color}>{module.icon}</span>
                </div>
                <p className="text-2xl font-bold text-slate-100">{module.count}</p>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <p className="font-medium text-sm text-slate-300">{module.name}</p>
                {module.issueCount !== undefined && module.issueCount > 0 && (
                  <Badge variant="destructive" className="h-5 px-1.5 text-xs">{module.issueCount}</Badge>
                )}
              </div>
              {module.activeCount !== undefined && <p className="text-xs text-slate-400">{module.activeCount} active</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading && modules.length === 0 && (
        <div className="text-center py-12 bg-slate-900/30 rounded-lg border border-slate-700/30">
          <RefreshCw className="h-12 w-12 text-slate-500 mx-auto mb-4 animate-spin" />
          <h3 className="text-lg font-medium text-slate-300">Loading Module Data...</h3>
        </div>
      )}
    </div>
  );
};
