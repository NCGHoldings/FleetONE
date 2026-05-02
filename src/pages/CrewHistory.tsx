import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useCrewAuth } from '@/contexts/CrewAuthContext';
import { createAnonymousClient } from '@/integrations/supabase/public-client';
import { Loader2, Calendar, FileText, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

export default function CrewHistory() {
  const { crewMember } = useCrewAuth();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      if (!crewMember) return;
      
      try {
        const supabase = createAnonymousClient();
        
        // We match by name since conductor_submissions doesn't force a staff_id currently,
        // or we match by contact_number if we update the submission logic.
        // For now, we match by name as a fallback.
        const { data, error } = await supabase
          .from('conductor_submissions')
          .select('*')
          .or(`conductor_name.ilike.%${crewMember.staff_name}%,driver_name.ilike.%${crewMember.staff_name}%`)
          .order('trip_date', { ascending: false })
          .limit(20);

        if (!error && data) {
          setSubmissions(data);
        }
      } catch (err) {
        console.error('Error loading history:', err);
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, [crewMember]);

  if (loading) {
    return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-slate-800">Your History</h1>
      
      {submissions.length === 0 ? (
        <Card className="bg-slate-50 border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center text-slate-500">
            <FileText className="w-12 h-12 mb-2 text-slate-300" />
            <p>No trip submissions found for your profile yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {submissions.map((sub) => {
            const isDriver = sub.driver_name?.toLowerCase().includes(crewMember?.staff_name?.toLowerCase() || '');
            const totalIncome = sub.ocr_data?.total_income || 0;
            
            return (
              <Card key={sub.id} className="overflow-hidden">
                <div className="flex border-b border-slate-100 p-3 bg-slate-50/50 justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <span className="font-semibold text-slate-700">{format(new Date(sub.trip_date), 'MMM dd, yyyy')}</span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                    sub.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                    sub.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {sub.status.toUpperCase()}
                  </span>
                </div>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-slate-500">Bus</p>
                      <p className="font-bold text-slate-800">{sub.bus_number}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-500">Total Income</p>
                      <p className="font-bold text-emerald-600">Rs. {totalIncome.toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-slate-500 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Role: {isDriver ? 'Driver' : 'Conductor'}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
