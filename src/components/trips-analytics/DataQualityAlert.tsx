import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Database, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatLKR } from '@/lib/currency';

interface DataQualityAlertProps {
  tripsWithExpenses: number;
  totalTrips: number;
  totalExpenses?: number;
  totalRevenue?: number;
  dateRange?: { from: Date; to: Date };
}

export default function DataQualityAlert({ 
  tripsWithExpenses, 
  totalTrips,
  totalExpenses = 0,
  totalRevenue = 0,
  dateRange
}: DataQualityAlertProps) {
  const navigate = useNavigate();
  const dataQuality = totalTrips > 0 ? (tripsWithExpenses / totalTrips) * 100 : 0;
  const missingExpenses = totalTrips - tripsWithExpenses;

  // Always show the data coverage summary
  return (
    <div className="p-4 border rounded-lg bg-card space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <h4 className="font-semibold">Data Coverage Summary</h4>
        </div>
        {dateRange && (
          <Badge variant="outline" className="text-xs">
            {dateRange.from.toLocaleDateString()} - {dateRange.to.toLocaleDateString()}
          </Badge>
        )}
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <span className="text-muted-foreground">Trips:</span>
          <span className="font-medium">{totalTrips} records</span>
        </div>
        <div className="flex items-center gap-2">
          {dataQuality >= 50 ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          )}
          <span className="text-muted-foreground">Expense Records:</span>
          <span className="font-medium">{tripsWithExpenses} ({dataQuality.toFixed(1)}%)</span>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-blue-500" />
          <span className="text-muted-foreground">Revenue:</span>
          <span className="font-medium">{formatLKR(totalRevenue)}</span>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-orange-500" />
          <span className="text-muted-foreground">Expenses:</span>
          <span className="font-medium">{formatLKR(totalExpenses)}</span>
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
    </div>
  );
}
