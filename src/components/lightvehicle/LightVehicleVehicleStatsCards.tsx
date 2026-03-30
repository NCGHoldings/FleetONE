import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileSpreadsheet, Car, CheckCircle2, Clock } from 'lucide-react';

interface Props {
  stats: {
    totalSheets: number;
    totalVehicles: number;
    matchedVehicles: number;
    pendingVehicles: number;
    completedSheets: number;
  };
}

export function LightVehicleVehicleStatsCards({ stats }: Props) {
  const matchPercentage = stats.totalVehicles > 0 
    ? Math.round((stats.matchedVehicles / stats.totalVehicles) * 100) 
    : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Data Sheets</CardTitle>
          <FileSpreadsheet className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalSheets}</div>
          <p className="text-xs text-muted-foreground">
            {stats.completedSheets} completed
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Vehicles</CardTitle>
          <Car className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalVehicles}</div>
          <p className="text-xs text-muted-foreground">
            Across all sheets
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Matched to Orders</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.matchedVehicles}</div>
          <p className="text-xs text-muted-foreground">
            {matchPercentage}% match rate
          </p>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Match</CardTitle>
          <Clock className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.pendingVehicles}</div>
          <p className="text-xs text-muted-foreground">
            Awaiting order match
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
