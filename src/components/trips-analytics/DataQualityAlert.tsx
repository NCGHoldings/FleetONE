import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DataQualityAlertProps {
  tripsWithExpenses: number;
  totalTrips: number;
}

export default function DataQualityAlert({ tripsWithExpenses, totalTrips }: DataQualityAlertProps) {
  const navigate = useNavigate();
  const dataQuality = totalTrips > 0 ? (tripsWithExpenses / totalTrips) * 100 : 0;
  const missingExpenses = totalTrips - tripsWithExpenses;

  // Only show alert if data quality is below 50%
  if (dataQuality >= 50 || totalTrips === 0) return null;

  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Incomplete Expense Data</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>
          {missingExpenses} out of {totalTrips} trips are missing expense data. 
          Analytics accuracy: {dataQuality.toFixed(1)}%
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
  );
}
