import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Trophy, Medal } from 'lucide-react';
import { BusSpeedData } from '@/hooks/useFleetAnalytics';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

interface FastestBusLeaderboardProps {
  buses: BusSpeedData[] | undefined;
  isLoading: boolean;
}

export default function FastestBusLeaderboard({ buses, isLoading }: FastestBusLeaderboardProps) {
  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 1:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 2:
        return <Medal className="h-5 w-5 text-orange-600" />;
      default:
        return <Zap className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getSpeedColor = (speed: number) => {
    if (speed > 90) return 'text-red-500 bg-red-500/10';
    if (speed > 70) return 'text-orange-500 bg-orange-500/10';
    if (speed > 50) return 'text-yellow-500 bg-yellow-500/10';
    return 'text-green-500 bg-green-500/10';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          Fastest Driving Buses
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : !buses || buses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No speed data available
          </div>
        ) : (
          <div className="space-y-3">
            {buses.map((bus, index) => (
              <div
                key={bus.bus_no}
                className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center justify-center w-8">
                  {getRankIcon(index)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-bold text-lg">{bus.bus_no}</span>
                    {index < 3 && (
                      <Badge variant="outline" className="text-xs">
                        Top {index + 1}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>Avg: {Math.round(bus.avg_speed)} km/h</span>
                    <span>•</span>
                    <span>{format(new Date(bus.last_recorded), 'MMM dd, HH:mm')}</span>
                  </div>
                </div>
                <div className={`text-right px-4 py-2 rounded-lg ${getSpeedColor(bus.max_speed)}`}>
                  <div className="text-2xl font-bold">
                    {Math.round(bus.max_speed)}
                  </div>
                  <div className="text-xs">km/h max</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
