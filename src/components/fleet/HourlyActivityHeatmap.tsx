import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock } from 'lucide-react';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function HourlyActivityHeatmap() {
  const { data, isLoading } = useQuery({
    queryKey: ['hourly-activity-heatmap'],
    queryFn: async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: gpsData } = await supabase
        .from('gps_location_history')
        .select('timestamp, speed_kmh')
        .gte('timestamp', startDate)
        .gt('speed_kmh', 0);

      // Create a heatmap grid
      const heatmap: Record<string, Record<number, number>> = {};
      DAYS.forEach(day => {
        heatmap[day] = {};
        HOURS.forEach(hour => {
          heatmap[day][hour] = 0;
        });
      });

      gpsData?.forEach(record => {
        const date = new Date(record.timestamp);
        const day = DAYS[date.getDay()];
        const hour = date.getHours();
        heatmap[day][hour]++;
      });

      // Find max for normalization
      let maxCount = 0;
      DAYS.forEach(day => {
        HOURS.forEach(hour => {
          if (heatmap[day][hour] > maxCount) {
            maxCount = heatmap[day][hour];
          }
        });
      });

      return { heatmap, maxCount };
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity Heatmap</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const getIntensity = (count: number) => {
    if (!data?.maxCount || data.maxCount === 0) return 0;
    return count / data.maxCount;
  };

  const getColor = (intensity: number) => {
    if (intensity === 0) return 'bg-muted';
    if (intensity < 0.25) return 'bg-blue-200 dark:bg-blue-900';
    if (intensity < 0.5) return 'bg-blue-400 dark:bg-blue-700';
    if (intensity < 0.75) return 'bg-blue-600 dark:bg-blue-500';
    return 'bg-blue-800 dark:bg-blue-300';
  };

  return (
    <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/80">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          Fleet Activity Heatmap (Last 7 Days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            {/* Hour labels */}
            <div className="flex mb-2">
              <div className="w-12" />
              {HOURS.filter((_, i) => i % 3 === 0).map(hour => (
                <div 
                  key={hour} 
                  className="flex-1 text-xs text-muted-foreground text-center"
                  style={{ width: `${100/8}%` }}
                >
                  {hour.toString().padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* Heatmap grid */}
            {DAYS.map(day => (
              <div key={day} className="flex items-center gap-1 mb-1">
                <div className="w-12 text-xs font-medium text-muted-foreground">{day}</div>
                <div className="flex-1 flex gap-0.5">
                  {HOURS.map(hour => {
                    const count = data?.heatmap[day][hour] || 0;
                    const intensity = getIntensity(count);
                    return (
                      <div
                        key={hour}
                        className={`h-6 flex-1 rounded-sm ${getColor(intensity)} cursor-pointer transition-transform hover:scale-110`}
                        title={`${day} ${hour}:00 - ${count} readings`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Legend */}
            <div className="flex items-center justify-end gap-2 mt-4">
              <span className="text-xs text-muted-foreground">Less</span>
              <div className="flex gap-1">
                <div className="w-4 h-4 rounded-sm bg-muted" />
                <div className="w-4 h-4 rounded-sm bg-blue-200 dark:bg-blue-900" />
                <div className="w-4 h-4 rounded-sm bg-blue-400 dark:bg-blue-700" />
                <div className="w-4 h-4 rounded-sm bg-blue-600 dark:bg-blue-500" />
                <div className="w-4 h-4 rounded-sm bg-blue-800 dark:bg-blue-300" />
              </div>
              <span className="text-xs text-muted-foreground">More</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
