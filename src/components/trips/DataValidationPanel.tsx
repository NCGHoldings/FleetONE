import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle, Trash2, XCircle } from "lucide-react";
import { formatDateDisplay, safeParseJSON } from "@/lib/utils";

interface InvalidTrip {
  id: string;
  trip_date: string;
  trip_no?: string;
  bus_id?: string;
  route_id?: string;
  driver_id?: string;
  status: string;
  income: number;
  notes?: string;
}

export function DataValidationPanel() {
  const [invalidTrips, setInvalidTrips] = useState<InvalidTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchInvalidTrips();
  }, []);

  const fetchInvalidTrips = async () => {
    try {
      setLoading(true);
      
      // Find trips with issues:
      // 1. Status = scheduled and income = 0 (draft data)
      // 2. Missing bus_id but has notes with bus_no
      const { data: trips, error } = await supabase
        .from('daily_trips')
        .select('*')
        .or('and(status.eq.scheduled,income.eq.0),bus_id.is.null')
        .order('trip_date', { ascending: false })
        .limit(200);

      if (error) throw error;

      // Filter for trips with conflicting data
      const problematic = (trips || []).filter(trip => {
        if (trip.status === 'scheduled' && trip.income === 0) return true;
        
        const notes = safeParseJSON(trip.notes, null);
        // Check if notes contains bus data but no bus_id link
        if (notes?.bus_no && !trip.bus_id) return true;
        if (notes?.excel_bus) return true; // Excel import with unmatched bus
        
        return false;
      });

      setInvalidTrips(problematic);
    } catch (error: any) {
      console.error('Error fetching invalid trips:', error);
      toast.error('Failed to load validation data');
    } finally {
      setLoading(false);
    }
  };


  const deleteTrip = async (tripId: string) => {
    try {
      setDeleting(true);
      
      // Delete from daily_trips
      const { error: tripError } = await supabase
        .from('daily_trips')
        .delete()
        .eq('id', tripId);

      if (tripError) throw tripError;

      // Also delete corresponding driver_allocation if exists
      const { error: allocError } = await supabase
        .from('driver_allocations')
        .delete()
        .match({ trip_id: invalidTrips.find(t => t.id === tripId)?.trip_no });

      if (allocError) console.warn('No allocation to delete:', allocError);

      toast.success('Trip deleted successfully');
      fetchInvalidTrips();
    } catch (error: any) {
      console.error('Error deleting trip:', error);
      toast.error('Failed to delete trip');
    } finally {
      setDeleting(false);
    }
  };

  const deleteAllInvalid = async () => {
    if (!confirm(`Delete all ${invalidTrips.length} invalid trips? This cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(true);
      const tripIds = invalidTrips.map(t => t.id);
      
      const { error } = await supabase
        .from('daily_trips')
        .delete()
        .in('id', tripIds);

      if (error) throw error;

      // Also delete allocations
      const tripNos = invalidTrips.map(t => t.trip_no).filter(Boolean);
      if (tripNos.length > 0) {
        await supabase
          .from('driver_allocations')
          .delete()
          .in('trip_id', tripNos);
      }

      toast.success(`Deleted ${invalidTrips.length} invalid trips`);
      fetchInvalidTrips();
    } catch (error: any) {
      console.error('Error deleting trips:', error);
      toast.error('Failed to delete trips');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Data Validation</CardTitle>
          <CardDescription>Checking for data integrity issues...</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {invalidTrips.length === 0 ? (
            <>
              <CheckCircle className="h-5 w-5 text-green-500" />
              Data Validation - All Clean
            </>
          ) : (
            <>
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Data Validation - {invalidTrips.length} Issues Found
            </>
          )}
        </CardTitle>
        <CardDescription>
          {invalidTrips.length === 0 
            ? "No data integrity issues detected" 
            : "Trips with missing or incorrect database links"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {invalidTrips.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-green-500" />
            All trips have valid database connections
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Found {invalidTrips.length} trips with data issues
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={deleteAllInvalid}
                disabled={deleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete All Invalid
              </Button>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {invalidTrips.map((trip) => {
                const notes = safeParseJSON(trip.notes, null);
                return (
                  <div
                    key={trip.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-background"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {formatDateDisplay(trip.trip_date)}
                        </span>
                        {trip.trip_no && (
                          <Badge variant="outline">{trip.trip_no}</Badge>
                        )}
                        <Badge variant={trip.status === 'scheduled' ? 'secondary' : 'default'}>
                          {trip.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1 space-y-1">
                        {!trip.bus_id && notes?.bus_no && (
                          <div className="flex items-center gap-1">
                            <XCircle className="h-3 w-3 text-red-500" />
                            Bus "{notes.bus_no}" not found in database
                          </div>
                        )}
                        {notes?.excel_bus && (
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                            Excel bus "{notes.excel_bus}" didn't match
                          </div>
                        )}
                        {trip.status === 'scheduled' && trip.income === 0 && (
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                            Draft trip with no income data
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTrip(trip.id)}
                      disabled={deleting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
