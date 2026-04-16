import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, Database, Users } from 'lucide-react';

interface DriverStats {
  rank: number;
  driver: string;
  trips: number;
  distance: number;
  income: number;
  efficiency: number;
  score: number;
}

export default function DriverLeaderboard() {
  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ['driver-leaderboard-real'],
    queryFn: async (): Promise<{ drivers: DriverStats[]; source: string; recordCount: number }> => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Get trips with driver info from notes JSON
      const { data: trips } = await supabase
        .from('daily_trips')
        .select('id, trip_date, distance_km, income, fuel_liters, net_income, notes')
        .gte('trip_date', thirtyDaysAgo.toISOString().split('T')[0]);

      if (!trips || trips.length === 0) {
        return { drivers: [], source: 'daily_trips', recordCount: 0 };
      }

      // Parse driver names from notes JSON and aggregate stats
      const driverStats: Record<string, {
        driver: string;
        trips: number;
        distance: number;
        income: number;
        fuelLiters: number;
      }> = {};

      trips.forEach(trip => {
        let driverName = 'Unknown';
        
        // Parse driver from notes JSON
        if (trip.notes) {
          try {
            const notes = typeof trip.notes === 'string' ? JSON.parse(trip.notes) : trip.notes;
            if (notes.driver) {
              driverName = notes.driver;
            }
          } catch {
            // Not JSON, might be plain text
          }
        }

        if (!driverStats[driverName]) {
          driverStats[driverName] = {
            driver: driverName,
            trips: 0,
            distance: 0,
            income: 0,
            fuelLiters: 0,
          };
        }

        driverStats[driverName].trips += 1;
        driverStats[driverName].distance += trip.distance_km || 0;
        driverStats[driverName].income += trip.income || 0;
        driverStats[driverName].fuelLiters += trip.fuel_liters || 0;
      });

      // Calculate scores and rank
      const drivers = Object.values(driverStats)
        .filter(d => d.driver !== 'Unknown') // Filter out unknown drivers
        .map(d => {
          const efficiency = d.fuelLiters > 0 ? d.distance / d.fuelLiters : 0;
          // Score formula: trips * 10 + distance/10 + efficiency * 5
          const score = Math.round(d.trips * 10 + d.distance / 10 + efficiency * 5);
          return {
            driver: d.driver,
            trips: d.trips,
            distance: Math.round(d.distance),
            income: Math.round(d.income),
            efficiency: parseFloat(efficiency.toFixed(1)),
            score,
            rank: 0,
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map((d, index) => ({ ...d, rank: index + 1 }));

      return { 
        drivers, 
        source: 'daily_trips', 
        recordCount: trips.length 
      };
    },
  });

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2: return <Medal className="h-5 w-5 text-gray-400" />;
      case 3: return <Award className="h-5 w-5 text-amber-600" />;
      default: return <span className="text-muted-foreground font-bold w-5 text-center">{rank}</span>;
    }
  };

  const getScoreGrade = (score: number): { grade: string; color: string } => {
    if (score >= 200) return { grade: 'A+', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' };
    if (score >= 150) return { grade: 'A', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' };
    if (score >= 100) return { grade: 'B', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' };
    if (score >= 50) return { grade: 'C', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' };
    return { grade: 'D', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Driver Performance Leaderboard
          </div>
          <Badge variant="outline" className="text-xs">
            <Database className="h-3 w-3 mr-1" />
            {leaderboard?.recordCount || 0} trips
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Based on trips, distance, and fuel efficiency (last 30 days)
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading leaderboard...</div>
        ) : !leaderboard?.drivers || leaderboard.drivers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground flex flex-col items-center gap-2">
            <Users className="h-12 w-12 opacity-50" />
            <p>No driver data available</p>
            <p className="text-xs">Trip records with driver information required</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboard.drivers.map((driver) => {
              const { grade, color } = getScoreGrade(driver.score);
              return (
                <div
                  key={driver.rank}
                  className={`flex items-center gap-4 p-4 rounded-lg border transition-all hover:shadow-sm ${
                    driver.rank <= 3 ? 'border-primary/20 bg-primary/5' : 'border-border'
                  }`}
                >
                  <div className="flex items-center justify-center w-8">
                    {getRankIcon(driver.rank)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold truncate">{driver.driver}</h4>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                      <span>
                        <span className="font-medium text-foreground">{driver.trips}</span> trips
                      </span>
                      <span>
                        <span className="font-medium text-foreground">{driver.distance.toLocaleString()}</span> km
                      </span>
                      {driver.efficiency > 0 && (
                        <span>
                          <span className="font-medium text-foreground">{driver.efficiency}</span> km/L
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-lg font-bold">{driver.score}</p>
                      <p className="text-xs text-muted-foreground">points</p>
                    </div>
                    <Badge className={color}>
                      {grade}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
