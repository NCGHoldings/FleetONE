import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { CheckCircle, XCircle, AlertTriangle, ExternalLink, Bus } from 'lucide-react';

interface SubmissionReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: any;
  onUpdate: () => void;
}

export const SubmissionReviewModal = ({
  open,
  onOpenChange,
  submission,
  onUpdate
}: SubmissionReviewModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [existingTripId, setExistingTripId] = useState<string | null>(null);
  const [existingTripHasData, setExistingTripHasData] = useState<boolean>(false);
  const [editedData, setEditedData] = useState({
    bus_number: submission?.bus_number || '',
    trip_date: submission?.trip_date || '',
    driver_name: submission?.ocr_data?.driver_name || '',
    conductor_name: submission?.conductor_name || submission?.ocr_data?.conductor_name || '',
    ...submission?.ocr_data
  });
  
  const [validation, setValidation] = useState({
    busFound: false,
    driverFound: false,
    conductorFound: false
  });

  useEffect(() => {
    if (open && submission) {
      let processedTrips = submission.ocr_data?.trips || [];
      if (processedTrips.length > 0) {
        processedTrips = processedTrips.map((t: any) => ({
          ...t,
          date: t.date || submission.trip_date
        }));
      }

      setEditedData({
        bus_number: submission.bus_number || '',
        trip_date: submission.trip_date || '',
        ...submission.ocr_data,
        trips: processedTrips
      });
      checkExistingTrip(submission.bus_number, submission.trip_date);
    }
  }, [open, submission]);

  // Check if trip already exists when bus number or date changes
  useEffect(() => {
    if (open && editedData.bus_number && editedData.trip_date) {
      checkExistingTrip(editedData.bus_number, editedData.trip_date, editedData.driver_name, editedData.conductor_name);
    }
  }, [editedData.bus_number, editedData.trip_date, editedData.driver_name, editedData.conductor_name]);

  const checkExistingTrip = async (busNumber: string, tripDate: string, driverName?: string, conductorName?: string) => {
    try {
      let busFound = false;
      let driverFound = false;
      let conductorFound = false;

      // 1. Check Bus
      const { data: bus } = await supabase
        .from('buses')
        .select('id')
        .eq('bus_no', busNumber)
        .maybeSingle();

      if (bus) {
        busFound = true;
        const { data: trip } = await supabase
          .from('daily_trips')
          .select('id, income, distance_km')
          .eq('bus_id', bus.id)
          .eq('trip_date', tripDate)
          .maybeSingle();
        
        if (trip) {
          setExistingTripId(trip.id);
          const hasData = (trip.income && trip.income > 0) || (trip.distance_km && trip.distance_km > 0);
          setExistingTripHasData(!!hasData);
        } else {
          setExistingTripId(null);
          setExistingTripHasData(false);
        }
      } else {
        setExistingTripId(null);
        setExistingTripHasData(false);
      }

      // 2. Check Driver
      if (driverName && driverName.trim() !== '') {
        const { data: d } = await supabase
          .from('staff_registry')
          .select('id')
          .ilike('staff_name', driverName.trim())
          .eq('staff_type', 'driver')
          .maybeSingle();
        if (d) driverFound = true;
      }

      // 3. Check Conductor
      if (conductorName && conductorName.trim() !== '') {
        const { data: c } = await supabase
          .from('staff_registry')
          .select('id')
          .ilike('staff_name', conductorName.trim())
          .eq('staff_type', 'conductor')
          .maybeSingle();
        if (c) conductorFound = true;
      }

      setValidation({ busFound, driverFound, conductorFound });
    } catch (e) {
      console.error("Error checking validation", e);
    }
  };

  const handleApprove = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 1. Resolve Master UUIDs
      const { data: bus } = await supabase
        .from('buses')
        .select('id')
        .eq('bus_no', editedData.bus_number)
        .maybeSingle();
        
      if (!bus) throw new Error(`Bus ${editedData.bus_number} not found in master database.`);

      let driverId = null;
      if (editedData.driver_name) {
        const { data: d } = await supabase
          .from('staff_registry')
          .select('id')
          .ilike('staff_name', editedData.driver_name.trim())
          .eq('staff_type', 'driver')
          .maybeSingle();
        driverId = d?.id;
      }

      let conductorId = null;
      if (editedData.conductor_name) {
        const { data: c } = await supabase
          .from('staff_registry')
          .select('id')
          .ilike('staff_name', editedData.conductor_name.trim())
          .eq('staff_type', 'conductor')
          .maybeSingle();
        conductorId = c?.id;
      }

      // 2. Map payload to daily_trips format
      const totalIncome = parseFloat(editedData.total_income || 0);
      const totalExpenses = parseFloat(editedData.expenses?.total || 0);

      // Group trips by date
      const tripsByDate: Record<string, any[]> = {};
      if (editedData.trips && editedData.trips.length > 0) {
        editedData.trips.forEach((trip: any) => {
          const d = trip.date || editedData.trip_date;
          if (!tripsByDate[d]) tripsByDate[d] = [];
          tripsByDate[d].push(trip);
        });
      } else {
        tripsByDate[editedData.trip_date] = [];
      }

      for (const [date, mappedTrips] of Object.entries(tripsByDate)) {
        const isPrimaryDate = date === editedData.trip_date;
        
        // Find existing trip for this specific date
        const { data: existingTrip } = await supabase
          .from('daily_trips')
          .select('id')
          .eq('bus_id', bus.id)
          .eq('trip_date', date)
          .maybeSingle();

        const dateIncome = mappedTrips.length > 0 
          ? mappedTrips.reduce((sum, t) => sum + (parseFloat(t.income?.total) || 0), 0)
          : totalIncome;
        
        const tripPayload = {
          bus_id: bus.id,
          trip_date: date,
          driver_id: driverId,
          conductor_id: conductorId,
          income: dateIncome,
          income_details: mappedTrips,
          total_expenses: isPrimaryDate ? totalExpenses : 0,
          other_expenses_details: isPrimaryDate ? editedData.expenses : null,
          net_income: isPrimaryDate ? (dateIncome - totalExpenses) : dateIncome,
          data_source: 'manual',
          notes: `Uploaded via Conductor Portal: ${submission.submission_code}`
        };

        let newTripId;

        if (existingTrip) {
          const { data, error: tripError } = await supabase
            .from('daily_trips')
            .update(tripPayload)
            .eq('id', existingTrip.id)
            .select()
            .single();

          if (tripError) throw new Error(`Failed to update daily trip: ${tripError.message}`);
          newTripId = data.id;
          
          if (isPrimaryDate) {
            await supabase.from('daily_bus_expenses').delete().eq('daily_trip_id', existingTrip.id);
          }
        } else {
          const { data, error: tripError } = await supabase
            .from('daily_trips')
            .insert(tripPayload)
            .select()
            .single();

          if (tripError) throw new Error(`Failed to create daily trip: ${tripError.message}`);
          newTripId = data.id;
        }

        // 3. Create individual expense records (Only on primary date)
        if (isPrimaryDate && editedData.expenses) {
          const expenseInserts = Object.entries(editedData.expenses)
            .filter(([key]) => key !== 'total')
            .map(([category, amount]) => ({
              daily_trip_id: newTripId,
              bus_id: bus.id,
              expense_date: date,
              category: category,
              amount: parseFloat(String(amount)),
              payment_status: 'paid'
            }));

          if (expenseInserts.length > 0) {
            const { error: expErr } = await supabase.from('daily_bus_expenses').insert(expenseInserts);
            if (expErr) console.error("Expense insertion error:", expErr);
          }
        }
      }

      // 4. Update submission status to 'applied'
      const { error } = await supabase
        .from('conductor_submissions')
        .update({
          status: 'applied',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          ocr_data: editedData
        })
        .eq('id', submission.id);

      if (error) throw error;

      toast({
        title: "Submission Applied",
        description: "Financials have been posted to the Daily Trips ledger."
      });

      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error Applying Data",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Rejection Reason Required",
        description: "Please provide a reason for rejection",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('conductor_submissions')
        .update({
          status: 'rejected',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason
        })
        .eq('id', submission.id);

      if (error) throw error;

      toast({
        title: "Submission Rejected",
        description: "The submission has been rejected."
      });

      onUpdate();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!submission) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Bus className="h-5 w-5 text-emerald-600" />
              Review Submission - {submission.submission_code}
            </DialogTitle>
            <Badge variant={submission.status === 'applied' ? 'default' : 'secondary'}>
              {submission.status.toUpperCase()}
            </Badge>
          </div>
        </DialogHeader>

        {existingTripId && (
          <div className={`border p-3 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3 ${
            existingTripHasData 
              ? 'bg-red-50 border-red-200 text-red-800' 
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}>
            <div className="flex items-center text-sm font-medium">
              <AlertTriangle className={`w-5 h-5 mr-2 ${existingTripHasData ? 'text-red-500' : 'text-amber-500'}`} />
              {existingTripHasData ? (
                <span>Warning: Financial data already exists for {editedData.bus_number} on {editedData.trip_date}. Approving will <strong>overwrite</strong> the existing data!</span>
              ) : (
                <span>An empty scheduled trip exists for {editedData.bus_number} on {editedData.trip_date}. Approving will fill it with this financial data.</span>
              )}
            </div>
            <Button size="sm" variant="outline" className="bg-white whitespace-nowrap shrink-0" onClick={() => window.open(`/trips?date=${editedData.trip_date}`, '_blank')}>
              View Existing <ExternalLink className="w-3 h-3 ml-2" />
            </Button>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mt-2">
          {/* Left Column: Financial Data Display */}
          <div className="space-y-4">
            {submission.image_url && submission.image_url !== 'manual_data_entry_no_image' ? (
              <div>
                <h3 className="font-medium mb-2 text-slate-700">Submitted Image</h3>
                <img
                  src={submission.image_url}
                  alt="Trip sheet"
                  className="w-full rounded-lg border shadow-sm"
                />
              </div>
            ) : editedData.data_entry_method === 'manual_form_v2' ? (
              <div className="bg-slate-900 text-white p-5 rounded-xl shadow-lg space-y-5">
                <h3 className="font-bold text-xl mb-4 border-b border-slate-800 pb-2">Financial Summary</h3>
                
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="font-medium">Total Income ({editedData.trips?.length || 0} Trips)</span>
                    <span className="text-emerald-400 font-bold text-lg">Rs. {editedData.total_income?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="font-medium">Total Expenses</span>
                    <span className="text-red-400 font-bold text-lg">- Rs. {editedData.expenses?.total?.toFixed(2)}</span>
                  </div>
                  
                  {editedData.fuel_details?.payment_method === 'card' && (
                    <div className="flex justify-between items-center text-slate-300">
                      <span className="font-medium flex items-center gap-1">
                        Fuel by Card
                        <Badge variant="outline" className="border-orange-500/30 text-orange-400 bg-orange-500/10 text-[9px] h-4 py-0">Not Deducted</Badge>
                      </span>
                      <span className="text-orange-400 font-bold">+ Rs. {(parseFloat(editedData.expenses?.fuel_cost || '0')).toFixed(2)}</span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-700 flex justify-between font-black text-xl">
                    <span>Net Balance</span>
                    <span className="text-white">Rs. {editedData.net_balance?.toFixed(2)}</span>
                  </div>
                </div>

                {editedData.bank_deposit && (
                  <div className="mt-4 p-3 bg-purple-900/30 rounded-lg border border-purple-500/30 space-y-2">
                    <p className="text-xs text-purple-300 font-bold uppercase tracking-wider mb-2">Bank Deposit Declared</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Bank Name</span>
                      <span className="font-bold text-purple-100">{editedData.bank_deposit.bank_name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Actual Deposit</span>
                      <span className="font-bold text-purple-400">Rs. {(parseFloat(editedData.bank_deposit.actual_amount || '0')).toFixed(2)}</span>
                    </div>
                    {editedData.bank_deposit.slip_url && (
                      <div className="pt-2 border-t border-purple-500/20 mt-2">
                        <a href={editedData.bank_deposit.slip_url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 w-fit">
                          <ExternalLink className="w-3 h-3" /> View Deposit Slip Image
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* detailed Trip breakdown */}
                {editedData.trips && editedData.trips.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-slate-800">
                    <p className="text-xs text-blue-400 font-bold uppercase mb-3 tracking-wider">Trip-by-Trip Details</p>
                    <div className="space-y-3">
                      {editedData.trips.map((trip: any, idx: number) => (
                        <div key={idx} className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                          <div className="flex justify-between items-center text-xs text-slate-400 mb-2 font-medium">
                            <div className="flex items-center gap-2">
                              <span>Trip {trip.trip_number}</span>
                              <input 
                                type="date" 
                                className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300 text-[10px] w-28 focus:outline-none focus:border-blue-500"
                                value={trip.date || editedData.trip_date}
                                onChange={(e) => {
                                  const newTrips = [...editedData.trips];
                                  newTrips[idx].date = e.target.value;
                                  setEditedData({ ...editedData, trips: newTrips });
                                }}
                              />
                            </div>
                            <span>ODO: {trip.start_odometer || '---'} → {trip.end_odometer || '---'}</span>
                          </div>
                          <div className="space-y-1 text-xs text-slate-300">
                            {Object.entries(trip.income || {}).map(([k, v]) => {
                              if (k === 'total' || !v || Number(v) === 0) return null;
                              return (
                                <div key={k} className="flex justify-between">
                                  <span className="capitalize">{k.replace(/_/g, ' ')}</span>
                                  <span>{Number(v).toFixed(2)}</span>
                                </div>
                              );
                            })}
                            <div className="flex justify-between pt-1 mt-1 border-t border-slate-700 text-emerald-400 font-bold">
                              <span>Trip Subtotal</span>
                              <span>{Number(trip.income?.total || 0).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Expenses Breakdown */}
                {(editedData.expenses && Object.keys(editedData.expenses).length > 1) || editedData.fuel_details ? (
                  <div className="mt-4 pt-4 border-t border-slate-800">
                    <p className="text-xs text-red-400 font-bold uppercase mb-3 tracking-wider">Expenses & Fuel Details</p>
                    
                    {editedData.fuel_details && (
                      <div className="mb-4 bg-orange-900/20 p-2 rounded border border-orange-500/20 space-y-1">
                        <div className="flex justify-between text-xs text-orange-200">
                          <span>Fuel Time</span>
                          <span>{editedData.fuel_details.time || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between text-xs text-orange-200">
                          <span>Fuel Odo</span>
                          <span>{editedData.fuel_details.odometer || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between text-xs text-orange-200">
                          <span>Fuel Liters</span>
                          <span>{editedData.fuel_details.liters || 'N/A'} L</span>
                        </div>
                        <div className="flex justify-between text-xs font-semibold text-orange-300">
                          <span>Payment Method</span>
                          <span className="uppercase">{editedData.fuel_details.payment_method}</span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1 text-xs text-slate-300">
                      {Object.entries(editedData.expenses || {}).map(([key, val]) => {
                        if (key === 'total') return null;
                        return (
                          <div key={key} className="flex justify-between">
                            <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                            <span>{Number(val).toFixed(2)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

              </div>
            ) : (
              <div className="p-4 bg-slate-100 rounded-lg text-slate-500 text-center">
                No advanced JSON payload found for this submission.
              </div>
            )}
          </div>

          {/* Right Column: Editable Data & Actions */}
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-slate-800 mb-4 text-lg">Trip Reference Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center mb-1">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Bus Number</Label>
                    {editedData.bus_number && (
                      validation.busFound ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] py-0 h-5"><CheckCircle className="w-3 h-3 mr-1" /> Verified</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] py-0 h-5"><AlertTriangle className="w-3 h-3 mr-1" /> Unmatched</Badge>
                      )
                    )}
                  </div>
                  <Input
                    className="font-semibold h-11"
                    value={editedData.bus_number}
                    onChange={(e) => setEditedData({ ...editedData, bus_number: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Primary Trip Date</Label>
                  <Input
                    type="date"
                    className="h-11 w-full"
                    value={editedData.trip_date}
                    onChange={(e) => setEditedData({ ...editedData, trip_date: e.target.value })}
                  />
                  <p className="text-[10px] text-muted-foreground">Used as the default date for trips and all expenses.</p>
                </div>
              </div>

              {/* Visual Mapping Guide */}
              {editedData.trips && editedData.trips.length > 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm">
                  <h4 className="font-semibold text-blue-800 mb-2 flex items-center text-xs uppercase tracking-wider">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Ledger Mapping Summary
                  </h4>
                  <ul className="space-y-1 text-blue-700 text-xs">
                    {Object.entries(
                      editedData.trips.reduce((acc: Record<string, number>, trip: any) => {
                        const d = trip.date || editedData.trip_date;
                        acc[d] = (acc[d] || 0) + 1;
                        return acc;
                      }, {})
                    ).map(([date, count]) => (
                      <li key={date} className="flex justify-between items-center border-b border-blue-100/50 pb-1">
                        <span>• {count} {count === 1 ? 'Trip' : 'Trips'} maps to</span>
                        <span className="font-semibold bg-white px-2 py-0.5 rounded text-blue-900">{format(new Date(date), 'MMM dd, yyyy')}</span>
                      </li>
                    ))}
                    <li className="flex justify-between items-center pt-1 opacity-80">
                      <span>• All Expenses map to</span>
                      <span className="font-semibold bg-white px-2 py-0.5 rounded text-blue-900">{format(new Date(editedData.trip_date), 'MMM dd, yyyy')}</span>
                    </li>
                  </ul>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-1">
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Driver Name</Label>
                  {editedData.driver_name && (
                    validation.driverFound ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] py-0 h-5"><CheckCircle className="w-3 h-3 mr-1" /> Verified</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] py-0 h-5"><AlertTriangle className="w-3 h-3 mr-1" /> Unmatched</Badge>
                    )
                  )}
                </div>
                <Input
                  className="h-10 text-sm"
                  value={editedData.driver_name || ''}
                  onChange={(e) => setEditedData({ ...editedData, driver_name: e.target.value })}
                  placeholder="Enter driver name"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-1">
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Conductor Name</Label>
                  {editedData.conductor_name && (
                    validation.conductorFound ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] py-0 h-5"><CheckCircle className="w-3 h-3 mr-1" /> Verified</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] py-0 h-5"><AlertTriangle className="w-3 h-3 mr-1" /> Unmatched</Badge>
                    )
                  )}
                </div>
                <Input
                  className="h-10 text-sm"
                  value={editedData.conductor_name || ''}
                  onChange={(e) => setEditedData({ ...editedData, conductor_name: e.target.value })}
                  placeholder="Enter conductor name"
                />
              </div>
              <div className="col-span-2 mt-2">
                <p className="text-xs text-slate-500 font-semibold mb-1 uppercase tracking-wider">Submitted On</p>
                <p className="font-medium text-slate-800">{format(new Date(submission.created_at), 'PPP ')}</p>
              </div>
            </div>

            {submission.status === 'pending' && (
              <div className="space-y-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rejection Reason (if rejecting)</Label>
                  <Textarea
                    className="resize-none"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Provide a reason if returning to conductor..."
                    rows={3}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={handleApprove}
                    disabled={loading}
                    className="flex-1 h-12 text-md font-semibold"
                  >
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Approve & Apply
                  </Button>
                  <Button
                    onClick={handleReject}
                    disabled={loading}
                    variant="destructive"
                    className="flex-1 h-12 text-md font-semibold"
                  >
                    <XCircle className="mr-2 h-5 w-5" />
                    Reject
                  </Button>
                </div>
                <p className="text-xs text-center text-slate-500 mt-2">
                  Approving will insert this data directly into the Daily Trips ledger.
                </p>
              </div>
            )}

            {submission.status !== 'pending' && (
              <div className={`rounded-xl border p-4 ${submission.status === 'applied' ? 'bg-emerald-50 border-emerald-200' : 'bg-destructive/10 border-destructive/20'}`}>
                <p className={`text-sm font-bold mb-1 ${submission.status === 'applied' ? 'text-emerald-700' : 'text-destructive'}`}>
                  {submission.status === 'applied' ? 'Successfully Applied to Ledger' : 'Rejection Reason:'}
                </p>
                <p className="text-sm text-slate-700">{submission.rejection_reason || 'This record has been fully processed and mapped to the GL.'}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
