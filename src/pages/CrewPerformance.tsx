import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useCrewAuth } from '@/contexts/CrewAuthContext';
import { TrendingUp, Medal, Target, Award, Calendar, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { createAnonymousClient } from '@/integrations/supabase/public-client';

import CrewLogin from './CrewLogin';

export default function CrewPerformance() {
  const { crewMember, isAuthenticated } = useCrewAuth();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!crewMember?.id) return;
    
    const fetchDashboard = async () => {
      try {
        const supabase = createAnonymousClient();
        const { data, error } = await supabase.rpc('get_crew_dashboard_data', { p_staff_id: crewMember.id });
        if (!error && data) {
          setDashboardData(data);
        }
      } catch (err) {
        console.error("Error fetching crew dashboard:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [crewMember?.id]);

  if (!isAuthenticated) {
    return <CrewLogin />;
  }

  const monthlyTarget = dashboardData?.monthly_target || 150000;
  const currentRevenue = dashboardData?.current_revenue || 0;
  const progressPercent = monthlyTarget > 0 ? Math.min((currentRevenue / monthlyTarget) * 100, 100) : 0;
  const pastTrips = dashboardData?.recent_performance || [];
  const targetsHit = dashboardData?.targets_hit || 0;

  return (
    <div className="p-4 space-y-6 pb-24">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
        <h1 className="text-2xl font-bold text-slate-800">My Performance</h1>
      </div>

      {/* Gamification / Current Target */}
      <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 border-0 text-white shadow-lg overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 opacity-20">
          <Target className="w-24 h-24" />
        </div>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium text-blue-100">May 2026 Target</CardTitle>
          <div className="flex items-end gap-2 mt-2">
            <span className="text-4xl font-black">Rs. {currentRevenue.toLocaleString()}</span>
          </div>
          <CardDescription className="text-blue-200 mt-1">
            of Rs. {monthlyTarget.toLocaleString()} goal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={progressPercent} className="h-2.5 bg-blue-900/50" indicatorClassName="bg-emerald-400" />
          <p className="text-xs font-medium text-blue-200 mt-2 text-right">
            {progressPercent.toFixed(1)}% Completed
          </p>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 bg-emerald-100 rounded-full text-emerald-600">
              <Medal className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Targets Hit</p>
              <p className="text-xl font-bold text-slate-800">{targetsHit} Trips</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-slate-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-3 bg-amber-100 rounded-full text-amber-600">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Rank</p>
              <p className="text-xl font-bold text-slate-800">#3</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Trips Performance */}
      <div className="space-y-3">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-slate-400" />
          Recent Performance
        </h3>
        
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {pastTrips.map((trip, idx) => (
            <div key={idx} className="p-4 flex items-center justify-between border-b border-slate-100 last:border-0 hover:bg-slate-50">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-10 rounded-full ${trip.targetHit ? 'bg-emerald-500' : 'bg-red-400'}`} />
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{trip.route}</p>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3 h-3" /> {trip.date}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-700 text-sm">Rs. {trip.revenue.toLocaleString()}</p>
                <p className={`text-[10px] font-bold ${trip.targetHit ? 'text-emerald-600' : 'text-red-500'}`}>
                  {trip.targetHit ? 'TARGET HIT' : 'MISSED'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
