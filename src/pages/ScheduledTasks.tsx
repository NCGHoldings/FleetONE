import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Clock, Play, Pause, RefreshCw, Calendar, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CronJob {
  jobid: number;
  jobname: string;
  schedule: string;
  active: boolean;
  command: string;
}

const ScheduledTasks = () => {
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: cronJobs, isLoading, refetch } = useQuery({
    queryKey: ['cron-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_cron_jobs');
      
      if (error) {
        // If function doesn't exist, return empty array
        if (error.message.includes('does not exist')) {
          return [];
        }
        throw error;
      }
      
      return data as CronJob[];
    },
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
    toast({
      title: "Refreshed",
      description: "Scheduled tasks list updated",
    });
  };

  const getScheduleDescription = (schedule: string) => {
    const scheduleMap: Record<string, string> = {
      '0 */6 * * *': 'Every 6 hours',
      '0 * * * *': 'Every hour',
      '*/5 * * * *': 'Every 5 minutes',
      '*/30 * * * *': 'Every 30 minutes',
      '0 2 * * *': 'Daily at 2:00 AM',
    };
    return scheduleMap[schedule] || schedule;
  };

  const getTaskIcon = (jobname: string) => {
    if (jobname.includes('tyre')) return '🛞';
    if (jobname.includes('service')) return '🔧';
    if (jobname.includes('fuel')) return '⛽';
    if (jobname.includes('analytics')) return '📊';
    if (jobname.includes('gps') || jobname.includes('fios')) return '📍';
    if (jobname.includes('driver')) return '👤';
    return '⏰';
  };

  const taskDescriptions: Record<string, string> = {
    'sync-tyre-conditions': 'Updates tyre conditions based on current bus mileage',
    'check-service-alerts-hourly': 'Checks if buses need maintenance based on mileage thresholds',
    'check-fuel-alerts-hourly': 'Monitors fuel levels and detects theft or abnormal consumption',
    'aggregate-fleet-analytics-daily': 'Aggregates daily fleet performance metrics and generates reports',
    'sync-fios-gps-tracking': 'Fetches real-time GPS data from FIOS API and updates bus positions',
    'sync-driver-events': 'Fetches driver behavior events from FIOS for safety monitoring',
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Scheduled Tasks</h1>
          <p className="text-muted-foreground">
            Automated background jobs running on your fleet management platform
          </p>
        </div>
        <Button onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {(!cronJobs || cronJobs.length === 0) && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No scheduled tasks found. Run the SQL script in{" "}
            <code className="bg-muted px-1 py-0.5 rounded">supabase/cron-jobs-setup.sql</code>{" "}
            in your Supabase SQL Editor to set up automated tasks.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {cronJobs?.map((job) => (
          <Card key={job.jobid} className="relative overflow-hidden">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getTaskIcon(job.jobname)}</span>
                  <div>
                    <CardTitle className="text-lg">{job.jobname}</CardTitle>
                    <CardDescription className="mt-1">
                      {taskDescriptions[job.jobname] || 'Automated task'}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant={job.active ? "default" : "secondary"}>
                  {job.active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Schedule:</span>
                <span className="font-medium">{getScheduleDescription(job.schedule)}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Cron:</span>
                <code className="text-xs bg-muted px-2 py-1 rounded">{job.schedule}</code>
              </div>

              <div className="pt-3 flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  className="flex-1"
                  disabled
                  title="Use SQL Editor to manage jobs"
                >
                  <Play className="h-3 w-3 mr-1" />
                  Trigger Now
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="flex-1"
                  disabled
                  title="Use SQL Editor to manage jobs"
                >
                  {job.active ? (
                    <>
                      <Pause className="h-3 w-3 mr-1" />
                      Disable
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3 mr-1" />
                      Enable
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
          <CardDescription>
            How to configure automated tasks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">1. Run the Setup SQL</h4>
            <p className="text-sm text-muted-foreground mb-2">
              Open the Supabase SQL Editor and run the script from <code className="bg-muted px-1 py-0.5 rounded">supabase/cron-jobs-setup.sql</code>
            </p>
            <Button variant="outline" size="sm" asChild>
              <a 
                href="https://supabase.com/dashboard/project/wwjpdszkmtnzshbulkon/sql/new" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                Open SQL Editor →
              </a>
            </Button>
          </div>

          <div>
            <h4 className="font-medium mb-2">2. Verify Jobs</h4>
            <p className="text-sm text-muted-foreground">
              After running the SQL, click the Refresh button above to see your active scheduled tasks
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-2">3. Monitor Execution</h4>
            <p className="text-sm text-muted-foreground">
              Check Edge Function logs to monitor automated task execution and troubleshoot issues
            </p>
            <Button variant="outline" size="sm" asChild className="mt-2">
              <a 
                href="https://supabase.com/dashboard/project/wwjpdszkmtnzshbulkon/functions" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                View Function Logs →
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScheduledTasks;
