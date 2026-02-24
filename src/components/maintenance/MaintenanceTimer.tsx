import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Square, Clock, AlertTriangle, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface MaintenanceTimerProps {
  maintenanceId: string;
  bayId?: string;
  onTimerUpdate?: () => void;
}

export default function MaintenanceTimer({ maintenanceId, bayId, onTimerUpdate }: MaintenanceTimerProps) {
  const { hasRole } = useAuth();
  const [timerStatus, setTimerStatus] = useState<'stopped' | 'running' | 'paused'>('stopped');
  const [currentTimer, setCurrentTimer] = useState<any>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [workerCount, setWorkerCount] = useState(1);
  const [isOvertimeDialogOpen, setIsOvertimeDialogOpen] = useState(false);
  const [workingHours, setWorkingHours] = useState({ start: '08:00', end: '17:00' });

  const isSupervisor = hasRole('super_admin') || hasRole('admin') || hasRole('supervisor') || hasRole('mechanic');

  useEffect(() => {
    fetchCurrentTimer();
    fetchWorkingHours();
  }, [maintenanceId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerStatus === 'running' && currentTimer) {
      interval = setInterval(() => {
        const now = new Date();
        const startTime = new Date(currentTimer.start_time);
        const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000 / 60); // minutes
        setElapsedTime(elapsed);
        
        // Check if it's past closing time
        const currentTime = now.toTimeString().slice(0, 5);
        if (currentTime > workingHours.end && !currentTimer.is_overtime) {
          handleAutoPause();
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerStatus, currentTimer, workingHours]);

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
        setWorkerCount(data.worker_count);
        
        if (!data.end_time && !data.pause_time) {
          const now = new Date();
          const startTime = new Date(data.start_time);
          const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000 / 60);
          setElapsedTime(elapsed);
        }
      }
    } catch (error) {
      console.error('Error fetching timer:', error);
    }
  };

  const fetchWorkingHours = async () => {
    try {
      const { data, error } = await supabase
        .from('workshop_settings')
        .select('setting_value')
        .eq('setting_type', 'working_hours')
        .eq('setting_key', 'weekday')
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setWorkingHours(data.setting_value as any);
      }
    } catch (error) {
      console.error('Error fetching working hours:', error);
    }
  };

  const startTimer = async () => {
    if (!isSupervisor) return;

    try {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5);
      const isAfterHours = currentTime > workingHours.end || currentTime < workingHours.start;
      
      if (isAfterHours) {
        setIsOvertimeDialogOpen(true);
        return;
      }

      await createTimer(false);
    } catch (error) {
      toast.error('Failed to start timer');
    }
  };

  const createTimer = async (isOvertime: boolean) => {
    try {
      const { data, error } = await supabase
        .from('maintenance_timers')
        .insert({
          maintenance_record_id: maintenanceId,
          bay_id: bayId,
          worker_count: workerCount,
          start_time: new Date().toISOString(),
          is_overtime: isOvertime,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentTimer(data);
      setTimerStatus('running');
      setElapsedTime(0);
      
      // Update maintenance record
      await supabase
        .from('maintenance_records')
        .update({
          timer_status: 'running',
          timer_started_at: new Date().toISOString(),
          current_bay_id: bayId
        })
        .eq('id', maintenanceId);

      toast.success(isOvertime ? 'Overtime timer started' : 'Timer started');
      onTimerUpdate?.();
    } catch (error) {
      console.error('Error starting timer:', error);
      toast.error('Failed to start timer');
    }
  };

  const pauseTimer = async () => {
    if (!currentTimer || !isSupervisor) return;

    try {
      const { error } = await supabase
        .from('maintenance_timers')
        .update({
          pause_time: new Date().toISOString(),
          total_minutes: elapsedTime
        })
        .eq('id', currentTimer.id);

      if (error) throw error;

      setTimerStatus('paused');
      toast.success('Timer paused');
    } catch (error) {
      toast.error('Failed to pause timer');
    }
  };

  const resumeTimer = async () => {
    if (!currentTimer || !isSupervisor) return;

    try {
      const { error } = await supabase
        .from('maintenance_timers')
        .update({
          resume_time: new Date().toISOString(),
          pause_time: null
        })
        .eq('id', currentTimer.id);

      if (error) throw error;

      setTimerStatus('running');
      toast.success('Timer resumed');
    } catch (error) {
      toast.error('Failed to resume timer');
    }
  };

  const stopTimer = async () => {
    if (!currentTimer || !isSupervisor) return;

    try {
      const { error } = await supabase
        .from('maintenance_timers')
        .update({
          end_time: new Date().toISOString(),
          total_minutes: elapsedTime,
          status: 'completed'
        })
        .eq('id', currentTimer.id);

      if (error) throw error;

      // Update maintenance record
      const actualHours = elapsedTime / 60;
      await supabase
        .from('maintenance_records')
        .update({
          timer_status: 'stopped',
          actual_hours: actualHours,
          current_bay_id: null
        })
        .eq('id', maintenanceId);

      setTimerStatus('stopped');
      setCurrentTimer(null);
      setElapsedTime(0);
      toast.success('Timer stopped and work completed');
      onTimerUpdate?.();
    } catch (error) {
      toast.error('Failed to stop timer');
    }
  };

  const handleAutoPause = async () => {
    if (currentTimer && timerStatus === 'running') {
      await pauseTimer();
      toast.info('Timer auto-paused at closing time');
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const confirmOvertimeStart = async () => {
    setIsOvertimeDialogOpen(false);
    await createTimer(true);
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Work Timer
            </div>
            <Badge variant={
              timerStatus === 'running' ? 'default' :
              timerStatus === 'paused' ? 'secondary' : 'outline'
            }>
              {timerStatus.toUpperCase()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-3xl font-bold font-mono">
              {formatTime(elapsedTime)}
            </div>
            <p className="text-sm text-muted-foreground">
              {timerStatus === 'running' ? 'Active work time' : 
               timerStatus === 'paused' ? 'Paused' : 'Ready to start'}
            </p>
          </div>

          {currentTimer?.is_overtime && (
            <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded-md">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-orange-700">Overtime Work</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="text-sm">Workers: {workerCount}</span>
            {isSupervisor && timerStatus === 'stopped' && (
              <input
                type="number"
                min="1"
                max="10"
                value={workerCount}
                onChange={(e) => setWorkerCount(parseInt(e.target.value) || 1)}
                className="w-16 px-2 py-1 text-sm border rounded"
              />
            )}
          </div>

          {isSupervisor && (
            <div className="flex gap-2">
              {timerStatus === 'stopped' && (
                <Button onClick={startTimer} className="flex-1">
                  <Play className="h-4 w-4 mr-2" />
                  Start Work
                </Button>
              )}
              
              {timerStatus === 'running' && (
                <>
                  <Button onClick={pauseTimer} variant="outline" className="flex-1">
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </Button>
                  <Button onClick={stopTimer} variant="destructive" className="flex-1">
                    <Square className="h-4 w-4 mr-2" />
                    Stop
                  </Button>
                </>
              )}
              
              {timerStatus === 'paused' && (
                <>
                  <Button onClick={resumeTimer} className="flex-1">
                    <Play className="h-4 w-4 mr-2" />
                    Resume
                  </Button>
                  <Button onClick={stopTimer} variant="destructive" className="flex-1">
                    <Square className="h-4 w-4 mr-2" />
                    Stop
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isOvertimeDialogOpen} onOpenChange={setIsOvertimeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Overtime Work Confirmation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>You are starting work outside normal hours ({workingHours.start} - {workingHours.end}).</p>
            <p>This will be marked as overtime work. Do you want to continue?</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsOvertimeDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={confirmOvertimeStart}>
                Start Overtime Work
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}