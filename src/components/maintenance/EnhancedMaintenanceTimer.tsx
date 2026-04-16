import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, Pause, Square, Clock, Users, Plus, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface EnhancedMaintenanceTimerProps {
  maintenanceId: string;
  serviceType: string;
  bayId?: string;
  onTimerUpdate?: () => void;
}

export default function EnhancedMaintenanceTimer({ 
  maintenanceId, 
  serviceType, 
  bayId, 
  onTimerUpdate 
}: EnhancedMaintenanceTimerProps) {
  const { hasRole } = useAuth();
  const [timerStatus, setTimerStatus] = useState<'stopped' | 'running' | 'paused'>('stopped');
  const [currentTimer, setCurrentTimer] = useState<any>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [staffCount, setStaffCount] = useState(1);
  const [totalStaffHours, setTotalStaffHours] = useState(0);
  const [currentStaffLog, setCurrentStaffLog] = useState<any>(null);
  const [hourlyRate, setHourlyRate] = useState(500);
  const [isOvertimeDialogOpen, setIsOvertimeDialogOpen] = useState(false);

  const isSupervisor = hasRole('super_admin') || hasRole('admin') || hasRole('supervisor') || hasRole('mechanic');

  useEffect(() => {
    fetchCurrentTimer();
    fetchServiceTypeRate();
    fetchStaffHours();
  }, [maintenanceId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerStatus === 'running' && currentTimer) {
      interval = setInterval(() => {
        const now = new Date();
        const startTime = new Date(currentTimer.start_time);
        const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        setElapsedSeconds(elapsed);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerStatus, currentTimer]);

  const fetchCurrentTimer = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_timers')
        .select('*')
        .eq('maintenance_record_id', maintenanceId)
        .eq('status', 'active')
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setCurrentTimer(data);
        setTimerStatus(data.end_time ? 'stopped' : data.pause_time ? 'paused' : 'running');
        setStaffCount(data.worker_count);
        
        if (!data.end_time && !data.pause_time) {
          const now = new Date();
          const startTime = new Date(data.start_time);
          const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
          setElapsedSeconds(elapsed);
        }
      }
    } catch (error) {
      console.error('Error fetching timer:', error);
    }
  };

  const fetchServiceTypeRate = async () => {
    try {
      const { data, error } = await supabase
        .from('service_types')
        .select('hourly_rate')
        .eq('name', serviceType)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setHourlyRate(data.hourly_rate);
      }
    } catch (error) {
      console.error('Error fetching service type rate:', error);
    }
  };

  const fetchStaffHours = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_records')
        .select('total_staff_hours, current_staff_count')
        .eq('id', maintenanceId)
        .single();

      if (error) throw error;
      if (data) {
        setTotalStaffHours(data.total_staff_hours || 0);
        if (data.current_staff_count) {
          setStaffCount(data.current_staff_count);
        }
      }
    } catch (error) {
      console.error('Error fetching staff hours:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startTimer = async () => {
    if (!isSupervisor) return;

    try {
      // Create new timer
      const { data: timer, error: timerError } = await supabase
        .from('maintenance_timers')
        .insert({
          maintenance_record_id: maintenanceId,
          bay_id: bayId,
          worker_count: staffCount,
          start_time: new Date().toISOString(),
          status: 'active'
        })
        .select()
        .single();

      if (timerError) throw timerError;

      // Create staff log entry
      const { error: logError } = await supabase
        .from('repair_staff_log')
        .insert({
          maintenance_record_id: maintenanceId,
          staff_count: staffCount,
          start_time: new Date().toISOString()
        });

      if (logError) throw logError;

      // Update maintenance record
      await supabase
        .from('maintenance_records')
        .update({ 
          timer_status: 'running',
          timer_started_at: new Date().toISOString(),
          current_staff_count: staffCount,
          status: 'in_progress'
        })
        .eq('id', maintenanceId);

      setCurrentTimer(timer);
      setTimerStatus('running');
      toast.success('Timer started successfully');
      onTimerUpdate?.();
    } catch (error: any) {
      console.error('Error starting timer:', error);
      toast.error('Failed to start timer');
    }
  };

  const pauseTimer = async () => {
    if (!isSupervisor || !currentTimer) return;

    try {
      const now = new Date().toISOString();
      
      // End current staff log entry
      if (currentStaffLog) {
        const hoursWorked = elapsedSeconds / 3600;
        await supabase
          .from('repair_staff_log')
          .update({
            end_time: now,
            hours_worked: hoursWorked
          })
          .eq('id', currentStaffLog.id);

        // Update total staff hours
        const newTotalHours = totalStaffHours + (staffCount * hoursWorked);
        setTotalStaffHours(newTotalHours);
        
        await supabase
          .from('maintenance_records')
          .update({ total_staff_hours: newTotalHours })
          .eq('id', maintenanceId);
      }

      await supabase
        .from('maintenance_timers')
        .update({ pause_time: now })
        .eq('id', currentTimer.id);

      await supabase
        .from('maintenance_records')
        .update({ timer_status: 'paused' })
        .eq('id', maintenanceId);

      setTimerStatus('paused');
      toast.success('Timer paused');
      onTimerUpdate?.();
    } catch (error: any) {
      console.error('Error pausing timer:', error);
      toast.error('Failed to pause timer');
    }
  };

  const resumeTimer = async () => {
    if (!isSupervisor || !currentTimer) return;

    try {
      // Create new staff log entry for resume
      const { data: logData, error: logError } = await supabase
        .from('repair_staff_log')
        .insert({
          maintenance_record_id: maintenanceId,
          staff_count: staffCount,
          start_time: new Date().toISOString()
        })
        .select()
        .single();

      if (logError) throw logError;
      setCurrentStaffLog(logData);

      await supabase
        .from('maintenance_timers')
        .update({ 
          resume_time: new Date().toISOString(),
          pause_time: null 
        })
        .eq('id', currentTimer.id);

      await supabase
        .from('maintenance_records')
        .update({ timer_status: 'running' })
        .eq('id', maintenanceId);

      setTimerStatus('running');
      toast.success('Timer resumed');
      onTimerUpdate?.();
    } catch (error: any) {
      console.error('Error resuming timer:', error);
      toast.error('Failed to resume timer');
    }
  };

  const stopTimer = async () => {
    if (!isSupervisor || !currentTimer) return;

    try {
      const now = new Date().toISOString();
      const totalMinutes = elapsedSeconds / 60;
      const hoursWorked = elapsedSeconds / 3600;

      // End current staff log
      if (currentStaffLog) {
        await supabase
          .from('repair_staff_log')
          .update({
            end_time: now,
            hours_worked: hoursWorked
          })
          .eq('id', currentStaffLog.id);
      }

      // Calculate final staff hours
      const finalStaffHours = totalStaffHours + (staffCount * hoursWorked);
      const laborCost = finalStaffHours * hourlyRate;

      // Update timer
      await supabase
        .from('maintenance_timers')
        .update({ 
          end_time: now,
          total_minutes: totalMinutes,
          status: 'completed'
        })
        .eq('id', currentTimer.id);

      // Update maintenance record
      await supabase
        .from('maintenance_records')
        .update({ 
          timer_status: 'stopped',
          total_staff_hours: finalStaffHours,
          labor_total_cost: laborCost,
          actual_hours: finalStaffHours
        })
        .eq('id', maintenanceId);

      // Create or update financial record
      await createFinancialRecord(finalStaffHours, laborCost);

      setTimerStatus('stopped');
      setTotalStaffHours(finalStaffHours);
      toast.success('Timer stopped and calculations completed');
      onTimerUpdate?.();
    } catch (error: any) {
      console.error('Error stopping timer:', error);
      toast.error('Failed to stop timer');
    }
  };

  const createFinancialRecord = async (staffHours: number, laborCost: number) => {
    try {
      const inventoryCost = 0; // Will be updated from parts/inventory
      const totalExpenses = laborCost + inventoryCost;
      const revenue = totalExpenses * 1.2; // 20% profit margin
      const netIncome = revenue - totalExpenses;

      await supabase
        .from('maintenance_financials')
        .upsert({
          maintenance_record_id: maintenanceId,
          bay_id: bayId,
          service_type: serviceType,
          total_staff_hours: staffHours,
          hourly_pay_rate: hourlyRate,
          labour_cost: laborCost,
          inventory_cost: inventoryCost,
          total_expenses: totalExpenses,
          revenue: revenue,
          net_income: netIncome
        });
    } catch (error) {
      console.error('Error creating financial record:', error);
    }
  };

  const updateStaffCount = async (newCount: number) => {
    if (!isSupervisor || newCount < 1) return;

    try {
      // If timer is running, end current log and start new one
      if (timerStatus === 'running' && currentStaffLog) {
        const now = new Date().toISOString();
        const hoursWorked = elapsedSeconds / 3600;
        
        // End current log
        await supabase
          .from('repair_staff_log')
          .update({
            end_time: now,
            hours_worked: hoursWorked
          })
          .eq('id', currentStaffLog.id);

        // Update total staff hours
        const newTotalHours = totalStaffHours + (staffCount * hoursWorked);
        setTotalStaffHours(newTotalHours);

        // Start new log with new staff count
        const { data: newLog, error } = await supabase
          .from('repair_staff_log')
          .insert({
            maintenance_record_id: maintenanceId,
            staff_count: newCount,
            start_time: now
          })
          .select()
          .single();

        if (error) throw error;
        setCurrentStaffLog(newLog);
      }

      // Update maintenance record
      await supabase
        .from('maintenance_records')
        .update({ 
          current_staff_count: newCount,
          total_staff_hours: totalStaffHours
        })
        .eq('id', maintenanceId);

      setStaffCount(newCount);
      toast.success(`Staff count updated to ${newCount}`);
    } catch (error: any) {
      console.error('Error updating staff count:', error);
      toast.error('Failed to update staff count');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'default';
      case 'paused': return 'secondary';
      case 'stopped': return 'outline';
      default: return 'outline';
    }
  };

  const laborCost = totalStaffHours * hourlyRate;

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Enhanced Timer & Staff Tracking
          <Badge variant={getStatusColor(timerStatus)} className="ml-auto">
            {timerStatus.replace('_', ' ')}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Timer Display */}
        <div className="text-center">
          <div className="text-4xl font-mono font-bold text-primary">
            {formatTime(elapsedSeconds)}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            HH:MM:SS format countdown
          </p>
        </div>

        {/* Staff Management */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Current Staff Count</Label>
            <div className="flex items-center gap-2 mt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateStaffCount(staffCount - 1)}
                disabled={!isSupervisor || staffCount <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 px-3 py-2 border rounded-md bg-background">
                <Users className="h-4 w-4" />
                <span className="font-medium">{staffCount}</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateStaffCount(staffCount + 1)}
                disabled={!isSupervisor}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <Label>Total Staff Hours</Label>
            <div className="px-3 py-2 border rounded-md bg-muted">
              <span className="font-medium">{totalStaffHours.toFixed(2)} hrs</span>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div>
            <Label className="text-xs text-muted-foreground">Hourly Rate</Label>
            <p className="font-medium">₨{hourlyRate.toLocaleString()}/hr</p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Labor Cost</Label>
            <p className="font-medium text-primary">₨{laborCost.toLocaleString()}</p>
          </div>
        </div>

        {/* Timer Controls */}
        {isSupervisor && (
          <div className="flex gap-2 pt-4 border-t">
            {timerStatus === 'stopped' && (
              <Button onClick={startTimer} className="flex-1">
                <Play className="h-4 w-4 mr-2" />
                Start Timer
              </Button>
            )}
            
            {timerStatus === 'running' && (
              <Button onClick={pauseTimer} variant="secondary" className="flex-1">
                <Pause className="h-4 w-4 mr-2" />
                Pause Timer
              </Button>
            )}
            
            {timerStatus === 'paused' && (
              <>
                <Button onClick={resumeTimer} className="flex-1">
                  <Play className="h-4 w-4 mr-2" />
                  Resume
                </Button>
                <Button onClick={stopTimer} variant="destructive">
                  <Square className="h-4 w-4 mr-2" />
                  Stop
                </Button>
              </>
            )}
            
            {timerStatus === 'running' && (
              <Button onClick={stopTimer} variant="destructive">
                <Square className="h-4 w-4 mr-2" />
                Stop Timer
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}