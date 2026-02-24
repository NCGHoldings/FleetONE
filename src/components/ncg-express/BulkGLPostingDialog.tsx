import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useNCGExpressFinanceSettings, postTripRevenueToGL, postExpensesToGL } from "@/hooks/useNCGExpressFinance";
import { toast } from "@/hooks/use-toast";
import type { DateRange } from "react-day-picker";

interface BulkGLPostingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'trips' | 'expenses' | 'both';
  onComplete: () => void;
}

interface PostingResult {
  success: number;
  failed: number;
  errors: string[];
}

export function BulkGLPostingDialog({
  open,
  onOpenChange,
  type,
  onComplete,
}: BulkGLPostingDialogProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [postingType, setPostingType] = useState<'trips' | 'expenses' | 'both'>(type);
  const [isPosting, setIsPosting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<PostingResult | null>(null);
  
  // Counts
  const [unpostedTripsCount, setUnpostedTripsCount] = useState(0);
  const [unpostedExpensesCount, setUnpostedExpensesCount] = useState(0);
  
  const { settings, loading: settingsLoading } = useNCGExpressFinanceSettings();

  // Fetch unposted counts when date range changes
  useEffect(() => {
    if (dateRange?.from && dateRange?.to) {
      fetchUnpostedCounts();
    }
  }, [dateRange?.from, dateRange?.to]);

  const fetchUnpostedCounts = async () => {
    if (!dateRange?.from || !dateRange?.to) return;
    
    const fromStr = format(dateRange.from, 'yyyy-MM-dd');
    const toStr = format(dateRange.to, 'yyyy-MM-dd');

    // Count unposted trips
    const { count: tripsCount } = await supabase
      .from('daily_trips')
      .select('*', { count: 'exact', head: true })
      .gte('trip_date', fromStr)
      .lte('trip_date', toStr)
      .or('gl_posted.is.null,gl_posted.eq.false');

    // Count unposted expenses
    const { count: expensesCount } = await supabase
      .from('daily_bus_expenses')
      .select('*', { count: 'exact', head: true })
      .gte('expense_date', fromStr)
      .lte('expense_date', toStr)
      .or('gl_posted.is.null,gl_posted.eq.false');

    setUnpostedTripsCount(tripsCount || 0);
    setUnpostedExpensesCount(expensesCount || 0);
  };

  const handlePost = async () => {
    if (!dateRange?.from || !dateRange?.to || !settings) {
      toast({
        title: "Error",
        description: "Please select a date range and ensure settings are configured",
        variant: "destructive",
      });
      return;
    }

    setIsPosting(true);
    setProgress(0);
    setResult(null);

    const fromStr = format(dateRange.from, 'yyyy-MM-dd');
    const toStr = format(dateRange.to, 'yyyy-MM-dd');
    
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    
    try {
      // Post trips
      if (postingType === 'trips' || postingType === 'both') {
        const { data: trips } = await supabase
          .from('daily_trips')
          .select(`
            id,
            trip_no,
            trip_date,
            bus_id,
            income,
            buses:bus_id(bus_no),
            routes:route_id(route_name)
          `)
          .gte('trip_date', fromStr)
          .lte('trip_date', toStr)
          .or('gl_posted.is.null,gl_posted.eq.false');

        const totalTrips = trips?.length || 0;
        
        for (let i = 0; i < totalTrips; i++) {
          const trip = trips![i];
          try {
            const result = await postTripRevenueToGL(
              {
                id: trip.id,
                trip_no: trip.trip_no,
                trip_date: trip.trip_date,
                bus_no: trip.buses?.bus_no || 'Unknown',
                route_name: trip.routes?.route_name || 'Unknown',
                income: trip.income || 0,
              },
              settings
            );
            
            if (result.success) {
              successCount++;
            } else {
              failedCount++;
              errors.push(`Trip ${trip.trip_no}: ${result.error}`);
            }
          } catch (err: any) {
            failedCount++;
            errors.push(`Trip ${trip.trip_no}: ${err.message}`);
          }
          
          setProgress(((i + 1) / (totalTrips + (postingType === 'both' ? unpostedExpensesCount : 0))) * 100);
        }
      }

      // Post expenses
      if (postingType === 'expenses' || postingType === 'both') {
        const { data: expenses } = await supabase
          .from('daily_bus_expenses')
          .select(`
            *,
            buses:bus_id(bus_no)
          `)
          .gte('expense_date', fromStr)
          .lte('expense_date', toStr)
          .or('gl_posted.is.null,gl_posted.eq.false');

        const totalExpenses = expenses?.length || 0;
        const startProgress = postingType === 'both' ? 50 : 0;
        
        for (let i = 0; i < totalExpenses; i++) {
          const expense = expenses![i];
          try {
            const result = await postExpensesToGL(expense, settings);
            
            if (result.success) {
              successCount++;
            } else {
              failedCount++;
              errors.push(`Expense ${expense.buses?.bus_no} (${expense.expense_date}): ${result.error}`);
            }
          } catch (err: any) {
            failedCount++;
            errors.push(`Expense ${expense.buses?.bus_no}: ${err.message}`);
          }
          
          setProgress(startProgress + ((i + 1) / totalExpenses) * (postingType === 'both' ? 50 : 100));
        }
      }

      setResult({ success: successCount, failed: failedCount, errors });
      
      if (successCount > 0) {
        toast({
          title: "GL Posting Complete",
          description: `Successfully posted ${successCount} records. ${failedCount > 0 ? `${failedCount} failed.` : ''}`,
        });
      }
      
    } catch (error: any) {
      console.error('Bulk posting error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to complete bulk posting",
        variant: "destructive",
      });
    } finally {
      setIsPosting(false);
      setProgress(100);
    }
  };

  const handleClose = () => {
    if (result && result.success > 0) {
      onComplete();
    }
    setResult(null);
    setProgress(0);
    onOpenChange(false);
  };

  const totalUnposted = postingType === 'trips' ? unpostedTripsCount 
    : postingType === 'expenses' ? unpostedExpensesCount 
    : unpostedTripsCount + unpostedExpensesCount;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Bulk Post to General Ledger</DialogTitle>
          <DialogDescription>
            Post multiple trips and expenses to the NCG Express General Ledger in batch.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Type Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">What to Post</label>
            <Tabs value={postingType} onValueChange={(v) => setPostingType(v as typeof postingType)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="trips">Trips Only</TabsTrigger>
                <TabsTrigger value="expenses">Expenses Only</TabsTrigger>
                <TabsTrigger value="both">Both</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Date Range Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Date Range</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      `${format(dateRange.from, "PP")} - ${format(dateRange.to, "PP")}`
                    ) : (
                      format(dateRange.from, "PP")
                    )
                  ) : (
                    "Select date range"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Unposted Counts */}
          {dateRange?.from && dateRange?.to && (
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <h4 className="text-sm font-medium">Unposted Records</h4>
              <div className="flex gap-4">
                {(postingType === 'trips' || postingType === 'both') && (
                  <Badge variant="secondary" className="text-sm">
                    {unpostedTripsCount} Trips
                  </Badge>
                )}
                {(postingType === 'expenses' || postingType === 'both') && (
                  <Badge variant="secondary" className="text-sm">
                    {unpostedExpensesCount} Expenses
                  </Badge>
                )}
              </div>
              {totalUnposted === 0 && (
                <p className="text-sm text-muted-foreground">
                  All records in this date range are already posted.
                </p>
              )}
            </div>
          )}

          {/* Settings Warning */}
          {!settingsLoading && !settings?.cash_account_id && (
            <div className="bg-destructive/10 text-destructive rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <div className="text-sm">
                <strong>Settings not configured.</strong> Please configure NCG Express Finance Settings before posting.
              </div>
            </div>
          )}

          {/* Progress */}
          {isPosting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Posting in progress...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Posting Complete
              </h4>
              <div className="flex gap-4 text-sm">
                <span className="text-green-600">{result.success} Successful</span>
                {result.failed > 0 && (
                  <span className="text-red-600">{result.failed} Failed</span>
                )}
              </div>
              {result.errors.length > 0 && (
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer">View errors</summary>
                  <ul className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                    {result.errors.map((err, i) => (
                      <li key={i} className="text-destructive">{err}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPosting}>
            {result ? 'Close' : 'Cancel'}
          </Button>
          {!result && (
            <Button 
              onClick={handlePost} 
              disabled={isPosting || !dateRange?.from || !dateRange?.to || totalUnposted === 0 || !settings?.cash_account_id}
            >
              {isPosting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Posting...
                </>
              ) : (
                `Post ${totalUnposted} Records`
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
