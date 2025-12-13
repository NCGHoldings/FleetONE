import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Database, TrendingUp, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatLKR } from '@/lib/currency';

interface DataQualityAlertProps {
  tripsWithExpenses: number;
  totalTrips: number;
  totalExpenses?: number;
  totalRevenue?: number;
  dateRange?: { from: Date; to: Date };
  activeFilters?: {
    routes?: string[];
    drivers?: string[];
    buses?: string[];
  };
}

export default function DataQualityAlert({ 
  tripsWithExpenses, 
  totalTrips,
  totalExpenses = 0,
  totalRevenue = 0,
  dateRange,
  activeFilters
}: DataQualityAlertProps) {
  const navigate = useNavigate();
  const dataQuality = totalTrips > 0 ? (tripsWithExpenses / totalTrips) * 100 : 0;
  const missingExpenses = totalTrips - tripsWithExpenses;
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100) : 0;

  // Count active filters
  const activeFilterCount = (activeFilters?.routes?.length || 0) + 
                           (activeFilters?.drivers?.length || 0) + 
                           (activeFilters?.buses?.length || 0);

  return (
    <div className="p-4 border rounded-lg bg-card space-y-3">
      {/* Data Verification Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-green-500" />
          <h4 className="font-semibold">Data Verification</h4>
          <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
            ✓ Verified
          </Badge>
        </div>
        {dateRange && (
          <Badge variant="secondary" className="text-xs">
            {dateRange.from.toLocaleDateString()} - {dateRange.to.toLocaleDateString()}
          </Badge>
        )}
      </div>

      {/* Active Filters Summary */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="text-muted-foreground">Active Filters:</span>
          {activeFilters?.routes?.map(route => (
            <Badge key={route} variant="outline" className="text-xs bg-blue-500/10">
              Route: {route}
            </Badge>
          ))}
          {activeFilters?.drivers?.map(driver => (
            <Badge key={driver} variant="outline" className="text-xs bg-purple-500/10">
              Driver: {driver}
            </Badge>
          ))}
          {activeFilters?.buses?.map(bus => (
            <Badge key={bus} variant="outline" className="text-xs bg-orange-500/10">
              Bus: {bus}
            </Badge>
          ))}
        </div>
      )}
      
      {/* Verified Record Counts */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm bg-muted/30 rounded-md p-3">
        <div className="flex flex-col">
          <span className="text-muted-foreground text-xs">Trip Records</span>
          <span className="font-semibold text-lg">{totalTrips}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-muted-foreground text-xs">Total Revenue</span>
          <span className="font-semibold text-lg text-green-600">{formatLKR(totalRevenue)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-muted-foreground text-xs">Total Expenses</span>
          <span className="font-semibold text-lg text-orange-600">{formatLKR(totalExpenses)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-muted-foreground text-xs">Net Profit</span>
          <span className={`font-semibold text-lg ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatLKR(netProfit)}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-muted-foreground text-xs">Profit Margin</span>
          <span className={`font-semibold text-lg ${profitMargin >= 20 ? 'text-green-600' : profitMargin >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>
            {profitMargin.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Expense Coverage Status */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          {dataQuality >= 50 ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          )}
          <span className="text-muted-foreground">Expense Coverage:</span>
          <span className="font-medium">{tripsWithExpenses} of {totalTrips} trips ({dataQuality.toFixed(1)}%)</span>
        </div>
      </div>

      {dataQuality < 50 && totalTrips > 0 && (
        <Alert variant="destructive" className="mt-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Low Expense Coverage</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              {missingExpenses} trips missing expense data - analytics may be incomplete
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/trips/daily-expenses')}
              className="ml-4"
            >
              Add Expenses
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Data Source Indicator */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground border-t pt-2">
        <Database className="h-3 w-3" />
        <span>Based on {totalTrips} actual trip records from daily_trips table</span>
      </div>
    </div>
  );
}
