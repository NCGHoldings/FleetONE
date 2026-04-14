import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BusMasterData } from "@/hooks/useBusMasterData";
import { Fuel, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface BusMasterFuelTabProps {
  data: BusMasterData;
}

export const BusMasterFuelTab = ({ data }: BusMasterFuelTabProps) => {
  const { fuel, expenses, trips, bus } = data;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-LK', { maximumFractionDigits: 2 }).format(num);
  };

  // Prepare fuel efficiency chart data
  const fuelChartData = fuel.readings
    .slice(0, 20)
    .reverse()
    .map((reading, index) => ({
      index,
      date: format(new Date(reading.reading_timestamp), 'MMM dd'),
      fuelLevel: reading.fuel_level_percent || 0,
      odometer: reading.odometer_reading || 0
    }));

  const efficiencyDiff = fuel.avgEfficiency && fuel.expectedEfficiency 
    ? ((fuel.avgEfficiency - fuel.expectedEfficiency) / fuel.expectedEfficiency) * 100
    : null;

  const isEfficiencyGood = efficiencyDiff !== null && efficiencyDiff >= -10;

  return (
    <div className="space-y-4">
      {/* Fuel Efficiency Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Fuel className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Expected Efficiency</p>
                <p className="text-lg font-bold">
                  {fuel.expectedEfficiency ? `${formatNumber(fuel.expectedEfficiency)} km/L` : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${isEfficiencyGood ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
                {isEfficiencyGood ? (
                  <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Actual Efficiency</p>
                <p className={`text-lg font-bold ${isEfficiencyGood ? 'text-green-600' : 'text-red-600'}`}>
                  {fuel.avgEfficiency ? `${formatNumber(fuel.avgEfficiency)} km/L` : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Fuel Cost</p>
            <p className="text-lg font-bold text-red-600">{formatCurrency(expenses.fuelCost)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Cost per km</p>
            <p className="text-lg font-bold">
              {trips.totalDistance > 0 
                ? formatCurrency(expenses.fuelCost / trips.totalDistance)
                : 'N/A'
              }
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Efficiency Warning */}
      {efficiencyDiff !== null && !isEfficiencyGood && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="font-medium text-orange-800 dark:text-orange-200">
                  Fuel Efficiency Below Expected
                </p>
                <p className="text-sm text-orange-600 dark:text-orange-300">
                  Actual efficiency is {Math.abs(efficiencyDiff).toFixed(1)}% lower than expected. 
                  Consider checking vehicle maintenance or driving patterns.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fuel Level Trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Fuel Level Readings</CardTitle>
        </CardHeader>
        <CardContent>
          {fuelChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={fuelChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 10 }}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                  className="text-muted-foreground"
                />
                <Tooltip 
                  formatter={(value: number) => [`${value}%`, 'Fuel Level']}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))' 
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="fuelLevel" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Fuel className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No fuel readings available</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Fuel Readings Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Recent Fuel Readings</CardTitle>
        </CardHeader>
        <CardContent>
          {fuel.readings.length > 0 ? (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {fuel.readings.slice(0, 10).map((reading) => (
                <div 
                  key={reading.id} 
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded">
                      <Fuel className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {format(new Date(reading.reading_timestamp), 'MMM dd, yyyy HH:mm')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Odometer: {reading.odometer_reading ? formatNumber(reading.odometer_reading) : 'N/A'} km
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {reading.fuel_level_percent !== null ? `${reading.fuel_level_percent}%` : 'N/A'}
                    </p>
                    {reading.fuel_level_liters && (
                      <p className="text-xs text-muted-foreground">
                        {formatNumber(reading.fuel_level_liters)} L
                      </p>
                    )}
                    <Badge variant="outline" className="text-xs mt-1">
                      {reading.data_source || 'manual'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No fuel readings recorded</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
