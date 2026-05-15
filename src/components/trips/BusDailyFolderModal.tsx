import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { Bus, CheckCircle2, Clock, MapPin, XCircle, FileText, Banknote, Landmark, Receipt, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Separator } from '@/components/ui/separator';

interface BusDailyFolderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busData: any | null;
  date: Date;
}

export function BusDailyFolderModal({ open, onOpenChange, busData, date }: BusDailyFolderModalProps) {
  const { toast } = useToast();
  const [localSubmissions, setLocalSubmissions] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (busData?.submissions) {
      setLocalSubmissions(busData.submissions);
    }
  }, [busData]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this erroneous submission? This cannot be undone.')) return;
    try {
      const { error } = await supabase.from('conductor_submissions').delete().eq('id', id);
      if (error) throw error;
      setLocalSubmissions(prev => prev.filter((s: any) => s.id !== id));
      toast({ title: "Deleted", description: "Submission removed successfully." });
    } catch(err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to delete submission", variant: "destructive" });
    }
  };

  if (!busData) return null;

  const { bus_no, trips, total_income, total_expenses } = busData;
  const submissions = localSubmissions;

  // Calculate totals from submissions
  let depositAmount = 0;
  submissions.forEach((s: any) => {
    if (s.ocr_data?.bank_deposit?.actual_amount) {
      depositAmount += parseFloat(s.ocr_data.bank_deposit.actual_amount);
    }
  });

  // Sort trips
  const sortedTrips = [...trips].sort((a, b) => {
    const numA = parseInt(a.trip_no?.replace(/\D/g, '') || '0');
    const numB = parseInt(b.trip_no?.replace(/\D/g, '') || '0');
    return numA - numB;
  });

  const netProfit = total_income - total_expenses;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-slate-50 dark:bg-slate-950">
        <DialogHeader className="px-6 py-4 bg-white dark:bg-slate-900 border-b shrink-0 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Bus className="h-6 w-6 text-blue-500" />
                {bus_no} - Daily Operations Folder
              </DialogTitle>
              <DialogDescription className="mt-1">
                {format(date, 'EEEE, MMMM do, yyyy')}
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              {submissions.length > 0 ? (
                <Badge className="bg-emerald-500 hover:bg-emerald-600 px-3 py-1 text-sm">
                  <CheckCircle2 className="w-4 h-4 mr-1" /> {submissions.length} Submissions
                </Badge>
              ) : (
                <Badge variant="destructive" className="px-3 py-1 text-sm">
                  <Clock className="w-4 h-4 mr-1" /> Awaiting Submission
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Quick Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-500">Total Income</p>
                <Banknote className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-bold">Rs. {total_income.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</p>
              <p className="text-xs text-slate-400 mt-1">{trips.length} recorded trips</p>
            </div>
            
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-500">Total Expenses</p>
                <Receipt className="h-4 w-4 text-amber-500" />
              </div>
              <p className="text-2xl font-bold">Rs. {total_expenses.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</p>
              <p className="text-xs text-slate-400 mt-1">Includes fuel & daily costs</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-500">Net Position</p>
                <Landmark className="h-4 w-4 text-blue-500" />
              </div>
              <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                Rs. {netProfit.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-slate-400 mt-1">Income - Expenses</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border shadow-sm bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-slate-900">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-purple-700 dark:text-purple-400">Bank Deposits</p>
                <Landmark className="h-4 w-4 text-purple-500" />
              </div>
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                Rs. {depositAmount.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-purple-500/70 mt-1">Extracted from {submissions.length} slips</p>
            </div>
          </div>

          <Tabs defaultValue="trips" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="trips">Trip Schedules ({trips.length})</TabsTrigger>
              <TabsTrigger value="submissions">Log Sheets ({submissions.length})</TabsTrigger>
              <TabsTrigger value="financials">Financial Breakdown</TabsTrigger>
            </TabsList>
            
            {/* TRIPS TAB */}
            <TabsContent value="trips" className="space-y-4">
              {sortedTrips.length === 0 ? (
                <div className="text-center p-8 bg-white dark:bg-slate-900 rounded-xl border border-dashed">
                  <p className="text-muted-foreground">No trips scheduled or recorded for this date.</p>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase text-xs font-semibold">
                      <tr>
                        <th className="px-4 py-3">Trip #</th>
                        <th className="px-4 py-3">Time</th>
                        <th className="px-4 py-3 text-right">Income</th>
                        <th className="px-4 py-3 text-right">Expenses</th>
                        <th className="px-4 py-3 text-center">Odo Start</th>
                        <th className="px-4 py-3 text-center">Odo End</th>
                        <th className="px-4 py-3 text-center">Fuel (L)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {sortedTrips.map((trip: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-4 py-3 font-medium">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-slate-400" />
                              {trip.trip_no || `Trip ${idx + 1}`}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {trip.start_time ? trip.start_time.substring(0,5) : '--:--'} - {trip.end_time ? trip.end_time.substring(0,5) : '--:--'}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-emerald-600">
                            {trip.income > 0 ? trip.income.toLocaleString() : '-'}
                          </td>
                          <td className="px-4 py-3 text-right text-amber-600">
                            {trip.total_expenses > 0 ? trip.total_expenses.toLocaleString() : '-'}
                          </td>
                          <td className="px-4 py-3 text-center text-slate-500">
                            {trip.odometer_start || '-'}
                          </td>
                          <td className="px-4 py-3 text-center text-slate-500">
                            {trip.odometer_end || '-'}
                          </td>
                          <td className="px-4 py-3 text-center text-slate-500">
                            {trip.fuel_liters > 0 ? `${trip.fuel_liters} L` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* SUBMISSIONS TAB */}
            <TabsContent value="submissions" className="space-y-4">
              {submissions.length === 0 ? (
                <div className="text-center p-12 bg-white dark:bg-slate-900 rounded-xl border border-dashed flex flex-col items-center">
                  <FileText className="h-12 w-12 text-slate-300 mb-3" />
                  <p className="text-lg font-medium text-slate-600">No submissions received</p>
                  <p className="text-sm text-slate-400 mt-1">Conductor hasn't submitted the log sheet yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {submissions.map((sub: any, idx: number) => {
                    const ocr = sub.ocr_data || {};
                    return (
                      <div key={idx} className="bg-white dark:bg-slate-900 p-5 rounded-xl border shadow-sm flex flex-col">
                        <div className="flex justify-between items-start mb-4 border-b pb-3">
                          <div>
                            <h4 className="font-semibold text-lg flex items-center gap-2">
                              <FileText className="h-4 w-4 text-blue-500" />
                              {sub.submission_code || `Submission #${idx+1}`}
                            </h4>
                            <p className="text-xs text-slate-500 mt-1">
                              Received: {format(new Date(sub.created_at), 'h:mm a')}
                            </p>
                          </div>
                          <div className="flex gap-2 items-center">
                            <Badge variant={sub.status === 'applied' ? 'default' : 'secondary'} className={sub.status === 'applied' ? 'bg-emerald-500' : ''}>
                              {sub.status.toUpperCase()}
                            </Badge>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-red-50"
                              onClick={() => handleDelete(sub.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm flex-1">
                          <div>
                            <p className="text-slate-500 text-xs">Reported Income</p>
                            <p className="font-medium text-emerald-600">Rs. {parseFloat(ocr.total_income || '0').toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 text-xs">Reported Expenses</p>
                            <p className="font-medium text-amber-600">Rs. {parseFloat(ocr.total_expenses || '0').toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 text-xs">Deposit Amount</p>
                            <p className="font-medium text-purple-600">Rs. {parseFloat(ocr.bank_deposit?.actual_amount || '0').toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 text-xs">Bank Ref</p>
                            <p className="font-medium font-mono text-xs mt-1">{ocr.bank_deposit?.reference_number || '-'}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* FINANCIALS TAB */}
            <TabsContent value="financials" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm p-6">
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Banknote className="h-5 w-5 text-emerald-500" />
                    Income Breakdown
                  </h3>
                  <div className="space-y-3">
                    {sortedTrips.map((t: any, i: number) => t.income > 0 && (
                      <div key={i} className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                        <span className="text-sm text-slate-600 dark:text-slate-400">{t.trip_no || `Trip ${i+1}`}</span>
                        <span className="font-medium">Rs. {t.income.toLocaleString()}</span>
                      </div>
                    ))}
                    {total_income === 0 && (
                      <p className="text-sm text-slate-400 italic">No income recorded.</p>
                    )}
                    <div className="pt-2 flex justify-between items-center font-bold text-lg text-emerald-600">
                      <span>Total</span>
                      <span>Rs. {total_income.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm p-6">
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-amber-500" />
                    Expense Breakdown
                  </h3>
                  <div className="space-y-3">
                    {sortedTrips.map((t: any, i: number) => t.total_expenses > 0 && (
                      <div key={i} className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                        <span className="text-sm text-slate-600 dark:text-slate-400">{t.trip_no || `Trip ${i+1}`} Expenses</span>
                        <span className="font-medium">Rs. {t.total_expenses.toLocaleString()}</span>
                      </div>
                    ))}
                    {total_expenses === 0 && (
                      <p className="text-sm text-slate-400 italic">No expenses recorded.</p>
                    )}
                    <div className="pt-2 flex justify-between items-center font-bold text-lg text-amber-600">
                      <span>Total</span>
                      <span>Rs. {total_expenses.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

        </div>
      </DialogContent>
    </Dialog>
  );
}
