import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { UserPlus, Users, Bus, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VehicleAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotationId: string;
  quotationNo: string;
  currentAssignment: {
    driver_name?: string | null;
    conductor_name?: string | null;
    bus_no?: string | null;
  };
  onSave: () => void;
}

interface Bus {
  id: string;
  bus_no: string;
  model: string;
  capacity: number;
  status: string;
}

export function VehicleAssignmentModal({
  isOpen,
  onClose,
  quotationId,
  quotationNo,
  currentAssignment,
  onSave
}: VehicleAssignmentModalProps) {
  const [driverName, setDriverName] = useState(currentAssignment.driver_name || '');
  const [conductorName, setConductorName] = useState(currentAssignment.conductor_name || '');
  const [busNo, setBusNo] = useState(currentAssignment.bus_no || '');
  const [loading, setLoading] = useState(false);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [busesLoading, setBusesLoading] = useState(false);

  // Load available buses
  useEffect(() => {
    const loadBuses = async () => {
      setBusesLoading(true);
      try {
        const { data, error } = await supabase
          .from('buses')
          .select('id, bus_no, model, capacity, status')
          .eq('status', 'active')
          .order('bus_no');

        if (error) throw error;
        setBuses(data || []);
      } catch (error) {
        console.error('Error loading buses:', error);
      } finally {
        setBusesLoading(false);
      }
    };

    if (isOpen) {
      loadBuses();
    }
  }, [isOpen]);

  // Reset form when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      setDriverName(currentAssignment.driver_name || '');
      setConductorName(currentAssignment.conductor_name || '');
      setBusNo(currentAssignment.bus_no || '');
    }
  }, [isOpen, currentAssignment]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('special_hire_quotations')
        .update({
          assigned_driver_name: driverName || null,
          assigned_conductor_name: conductorName || null,
          assigned_bus_no: busNo || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', quotationId);

      if (error) throw error;

      toast.success('Vehicle assignment updated successfully');
      onSave();
      onClose();
    } catch (error) {
      console.error('Error updating vehicle assignment:', error);
      toast.error('Failed to update vehicle assignment');
    } finally {
      setLoading(false);
    }
  };

  const handleBusSelect = (selectedBusNo: string) => {
    setBusNo(selectedBusNo);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bus className="w-5 h-5 text-primary" />
            Vehicle Assignment
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{quotationNo}</p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Driver Name */}
          <div className="space-y-2">
            <Label htmlFor="driver" className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-blue-500" />
              Driver Name
            </Label>
            <Input
              id="driver"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              placeholder="Enter driver name"
            />
          </div>

          {/* Conductor Name */}
          <div className="space-y-2">
            <Label htmlFor="conductor" className="flex items-center gap-2">
              <Users className="w-4 h-4 text-green-500" />
              Conductor Name
            </Label>
            <Input
              id="conductor"
              value={conductorName}
              onChange={(e) => setConductorName(e.target.value)}
              placeholder="Enter conductor name"
            />
          </div>

          {/* Bus Number - with dropdown */}
          <div className="space-y-2">
            <Label htmlFor="bus" className="flex items-center gap-2">
              <Bus className="w-4 h-4 text-purple-500" />
              Bus Number
            </Label>
            <div className="flex gap-2">
              <Select value={busNo} onValueChange={handleBusSelect}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a bus or type manually" />
                </SelectTrigger>
                <SelectContent>
                  {busesLoading ? (
                    <SelectItem value="loading" disabled>Loading buses...</SelectItem>
                  ) : buses.length === 0 ? (
                    <SelectItem value="none" disabled>No active buses found</SelectItem>
                  ) : (
                    buses.map((bus) => (
                      <SelectItem key={bus.id} value={bus.bus_no}>
                        {bus.bus_no} - {bus.model} ({bus.capacity} seats)
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Input
                value={busNo}
                onChange={(e) => setBusNo(e.target.value)}
                placeholder="Or type bus no"
                className="w-32"
              />
            </div>
          </div>

          {/* Current Assignment Preview */}
          {(driverName || conductorName || busNo) && (
            <Card className="bg-muted/50">
              <CardContent className="p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">Assignment Preview:</p>
                <div className="space-y-1 text-sm">
                  {driverName && (
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-3 h-3 text-blue-500" />
                      <span>{driverName}</span>
                    </div>
                  )}
                  {conductorName && (
                    <div className="flex items-center gap-2">
                      <Users className="w-3 h-3 text-green-500" />
                      <span>{conductorName}</span>
                    </div>
                  )}
                  {busNo && (
                    <div className="flex items-center gap-2">
                      <Bus className="w-3 h-3 text-purple-500" />
                      <span>{busNo}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Assignment
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
