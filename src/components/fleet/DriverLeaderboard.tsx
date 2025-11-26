import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award } from 'lucide-react';

export default function DriverLeaderboard() {
  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ['driver-leaderboard'],
    queryFn: async () => {
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      const { data } = await supabase
        .from('driver_scorecards')
        .select(`
          *,
          profiles!inner(first_name, last_name)
        `)
        .gte('score_period_start', firstDayOfMonth.toISOString())
        .order('total_score', { ascending: false })
        .limit(10);

      return data?.map((card: any, index: number) => ({
        rank: index + 1,
        driver: `${card.profiles.first_name} ${card.profiles.last_name}`,
        score: card.total_score,
        trips: card.total_trips,
        distance: card.total_distance_km,
        rating: card.safety_rating,
      }));
    },
  });

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2: return <Medal className="h-5 w-5 text-gray-400" />;
      case 3: return <Award className="h-5 w-5 text-amber-600" />;
      default: return <span className="text-muted-foreground font-bold">{rank}</span>;
    }
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'excellent': return 'success';
      case 'good': return 'default';
      case 'fair': return 'warning';
      case 'poor': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Driver Performance Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading leaderboard...</div>
        ) : !leaderboard || leaderboard.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No data available for this period</div>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((driver: any) => (
              <div
                key={driver.rank}
                className={`flex items-center gap-4 p-4 rounded-lg border ${
                  driver.rank <= 3 ? 'border-primary/20 bg-primary/5' : 'border-border'
                }`}
              >
                <div className="flex items-center justify-center w-10">
                  {getRankIcon(driver.rank)}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">{driver.driver}</h4>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-sm text-muted-foreground">
                      Score: <span className="font-medium text-foreground">{driver.score}</span>
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Trips: <span className="font-medium text-foreground">{driver.trips}</span>
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {driver.distance?.toFixed(0)} km
                    </span>
                  </div>
                </div>
                <Badge variant={getRatingColor(driver.rating) as any}>
                  {driver.rating?.toUpperCase() || 'N/A'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
