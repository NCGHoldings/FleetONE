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
  numberOfBuses?: number;
  currentAssignment: {
    driver_name?: string | null;
    conductor_name?: string | null;
    bus_no?: string | null;
  };
  onSave: () => void;
}

interface BusRecord {
  id: string;
  bus_no: string;
  model: string;
  capacity: number;
  status: string;
}

interface BusSlot {
  busNo: string;
  driverName: string;
  conductorName: string;
}

export function VehicleAssignmentModal({
  isOpen,
  onClose,
  quotationId,
  quotationNo,
  numberOfBuses = 1,
  currentAssignment,
  onSave
}: VehicleAssignmentModalProps) {
  const slotCount = Math.max(1, numberOfBuses);
  const [slots, setSlots] = useState<BusSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [buses, setBuses] = useState<BusRecord[]>([]);
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

  // Parse comma-separated values into slots when modal opens
  useEffect(() => {
    if (isOpen) {
      const busNos = (currentAssignment.bus_no || '').split(',').map(s => s.trim()).filter(Boolean);
      const drivers = (currentAssignment.driver_name || '').split(',').map(s => s.trim()).filter(Boolean);
      const conductors = (currentAssignment.conductor_name || '').split(',').map(s => s.trim()).filter(Boolean);

      const newSlots: BusSlot[] = [];
      for (let i = 0; i < slotCount; i++) {
        newSlots.push({
          busNo: busNos[i] || '',
          driverName: drivers[i] || '',
          conductorName: conductors[i] || '',
        });
      }
      setSlots(newSlots);
    }
  }, [isOpen, currentAssignment, slotCount]);

  const updateSlot = (index: number, field: keyof BusSlot, value: string) => {
    setSlots(prev => prev.map((slot, i) => i === index ? { ...slot, [field]: value } : slot));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const busNoJoined = slots.map(s => s.busNo).filter(Boolean).join(', ');
      const driverJoined = slots.map(s => s.driverName).filter(Boolean).join(', ');
      const conductorJoined = slots.map(s => s.conductorName).filter(Boolean).join(', ');

      const { error } = await supabase
        .from('special_hire_quotations')
        .update({
          assigned_driver_name: driverJoined || null,
          assigned_conductor_name: conductorJoined || null,
          assigned_bus_no: busNoJoined || null,
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bus className="w-5 h-5 text-primary" />
            Vehicle Assignment
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {quotationNo} — {slotCount} bus{slotCount > 1 ? 'es' : ''}
          </p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {slots.map((slot, index) => (
            <Card key={index} className="border-dashed">
              <CardContent className="p-4 space-y-3">
                {slotCount > 1 && (
                  <p className="text-xs font-semibold text-muted-foreground">Bus {index + 1} of {slotCount}</p>
                )}

                {/* Bus Number */}
                <div className="space-y-1">
                  <Label className="flex items-center gap-2 text-sm">
                    <Bus className="w-3.5 h-3.5 text-purple-500" />
                    Bus Number
                  </Label>
                  <div className="flex gap-2">
                    <Select value={slot.busNo} onValueChange={(v) => updateSlot(index, 'busNo', v)}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select a bus" />
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
                      value={slot.busNo}
                      onChange={(e) => updateSlot(index, 'busNo', e.target.value)}
                      placeholder="Or type"
                      className="w-28"
                    />
                  </div>
                </div>

                {/* Driver */}
                <div className="space-y-1">
                  <Label className="flex items-center gap-2 text-sm">
                    <UserPlus className="w-3.5 h-3.5 text-blue-500" />
                    Driver Name
                  </Label>
                  <Input
                    value={slot.driverName}
                    onChange={(e) => updateSlot(index, 'driverName', e.target.value)}
                    placeholder="Enter driver name"
                  />
                </div>

                {/* Conductor */}
                <div className="space-y-1">
                  <Label className="flex items-center gap-2 text-sm">
                    <Users className="w-3.5 h-3.5 text-green-500" />
                    Conductor Name
                  </Label>
                  <Input
                    value={slot.conductorName}
                    onChange={(e) => updateSlot(index, 'conductorName', e.target.value)}
                    placeholder="Enter conductor name"
                  />
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Preview */}
          {slots.some(s => s.busNo || s.driverName || s.conductorName) && (
            <Card className="bg-muted/50">
              <CardContent className="p-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">Assignment Preview:</p>
                <div className="space-y-2 text-sm">
                  {slots.map((slot, i) => (
                    (slot.busNo || slot.driverName || slot.conductorName) && (
                      <div key={i} className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        {slotCount > 1 && <span className="text-xs font-semibold text-muted-foreground">Bus {i + 1}:</span>}
                        {slot.busNo && (
                          <span className="flex items-center gap-1">
                            <Bus className="w-3 h-3 text-purple-500" />
                            {slot.busNo}
                          </span>
                        )}
                        {slot.driverName && (
                          <span className="flex items-center gap-1">
                            <UserPlus className="w-3 h-3 text-blue-500" />
                            {slot.driverName}
                          </span>
                        )}
                        {slot.conductorName && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-green-500" />
                            {slot.conductorName}
                          </span>
                        )}
                      </div>
                    )
                  ))}
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
