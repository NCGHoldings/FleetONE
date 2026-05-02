import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCrewAuth } from '@/contexts/CrewAuthContext';
import { UserCircle, LogOut, Wallet, Medal, CalendarOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createAnonymousClient } from '@/integrations/supabase/public-client';

export default function CrewProfile() {
  const { crewMember, logout } = useCrewAuth();
  const { toast } = useToast();
  
  const [leaveDate, setLeaveDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLeaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveDate || !leaveReason) return;
    
    setIsSubmitting(true);
    
    try {
      const supabase = createAnonymousClient();
      
      const { error } = await supabase
        .from('leave_requests')
        .insert({
          staff_id: crewMember?.id,
          start_date: leaveDate,
          end_date: leaveDate,
          reason: leaveReason,
          status: 'Pending',
          leave_type: 'Annual',
          submitted_date: new Date().toISOString()
        });

      if (error) throw error;
      
      toast({
        title: "Leave Applied",
        description: "Your leave request has been sent to HR.",
      });
      setLeaveDate('');
      setLeaveReason('');
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Could not submit leave request: " + err.message,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
          <UserCircle className="w-10 h-10" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">{crewMember?.staff_name}</h1>
          <p className="text-sm text-slate-500 capitalize">{crewMember?.staff_type}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 border-0 text-white shadow-md">
          <CardContent className="p-4 flex flex-col items-center text-center">
            <Wallet className="w-6 h-6 mb-2 text-emerald-100" />
            <p className="text-xs text-emerald-100 font-medium">Est. Commission</p>
            <p className="text-lg font-bold">Rs. 12,500</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 border-0 text-white shadow-md">
          <CardContent className="p-4 flex flex-col items-center text-center">
            <Medal className="w-6 h-6 mb-2 text-amber-100" />
            <p className="text-xs text-amber-100 font-medium">Targets Hit</p>
            <p className="text-lg font-bold">14 This Month</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarOff className="w-5 h-5 text-blue-600" />
            Apply for Leave
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <form onSubmit={handleLeaveSubmit} className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Date</Label>
              <Input 
                type="date" 
                value={leaveDate} 
                onChange={e => setLeaveDate(e.target.value)} 
                required 
                className="bg-slate-50"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Reason</Label>
              <Input 
                placeholder="Brief reason for leave" 
                value={leaveReason} 
                onChange={e => setLeaveReason(e.target.value)} 
                required
                className="bg-slate-50"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-slate-800 hover:bg-slate-900 mt-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Button 
        variant="outline" 
        onClick={logout}
        className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
      >
        <LogOut className="w-4 h-4 mr-2" /> Sign Out
      </Button>
    </div>
  );
}
