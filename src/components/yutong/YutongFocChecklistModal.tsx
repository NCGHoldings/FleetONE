import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { VehicleRecord } from '@/hooks/useYutongVehicleDataManagement';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface Props {
  vehicle: VehicleRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BOOLEAN_CHECKLIST = [
  { key: 'carpet', label: 'Carpet' },
  { key: 'carpet_installation', label: 'Carpet (Installation)' },
  { key: 'tyre_rotation', label: 'Tyre Rotation' },
  { key: 'grease', label: 'Grease' },
  { key: 'stickers', label: 'Stickers' },
  { key: 'no_plate', label: 'No Plate' },
  { key: 'addblue_cut', label: 'AddBlue Cut' },
  { key: 'speed_limit', label: 'Speed Limit' },
  { key: 'wheel_alignment', label: 'Wheel Alignment' },
  { key: 'door_lock', label: 'Door Lock' },
  { key: 'dewax', label: 'Dewax / Body Wash' },
  { key: 'steering_wheel', label: 'Steering Wheel' },
  { key: 'sim_card', label: 'Sim Card Installation' },
  { key: 'checker_plate', label: 'Checker Plate' },
  { key: 'pdi', label: 'PDI' },
  { key: 'shock_absorber', label: 'Shock Absorber Replace' },
];

export const TEXT_CHECKLIST = [
  { key: '1st_service', label: '1st Service' },
  { key: '2nd_service', label: '2nd Service' },
  { key: '3rd_service', label: '3rd Service' },
  { key: 'other_services', label: 'Other Services' },
];

// Helper to determine truthy values from spreadsheet imports
export const isTruthy = (val: any) => {
  if (val === true) return true;
  if (typeof val === 'string') {
    const v = val.toLowerCase().trim();
    return v === 'yes' || v === 'true' || v === '1' || v === 'y' || v === 'ok' || v === 'done' || v === '✓';
  }
  return false;
};

export function YutongFocChecklistModal({ vehicle, isOpen, onClose, onSuccess }: Props) {
  const [isSaving, setIsSaving] = useState(false);
  const [checklist, setChecklist] = useState<Record<string, any>>({});

  useEffect(() => {
    if (vehicle && isOpen) {
      setChecklist(vehicle.service_checklist || {});
    } else {
      setChecklist({});
    }
  }, [vehicle, isOpen]);

  if (!vehicle) return null;

  const handleToggle = (key: string, checked: boolean) => {
    setChecklist(prev => ({ ...prev, [key]: checked }));
  };

  const handleChange = (key: string, value: string) => {
    setChecklist(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('yutong_vehicle_records')
        .update({ service_checklist: checklist })
        .eq('id', vehicle.id);

      if (error) throw error;
      toast.success('FOC Checklist saved successfully');
      onSuccess();
    } catch (error: any) {
      console.error('Error saving checklist:', error);
      toast.error(error.message || 'Failed to save checklist');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>FOC Checklist & Services</DialogTitle>
          <DialogDescription>
            {vehicle.model} {vehicle.chassis_no ? `- ${vehicle.chassis_no}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div>
            <h3 className="text-sm font-medium border-b pb-2 mb-4">Standard Options</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6">
              {BOOLEAN_CHECKLIST.map((item) => (
                <div key={item.key} className="flex flex-row items-center justify-between space-x-2">
                  <Label htmlFor={item.key} className="text-sm cursor-pointer font-normal flex-1">
                    {item.label}
                  </Label>
                  <Switch
                    id={item.key}
                    checked={isTruthy(checklist[item.key])}
                    onCheckedChange={(c) => handleToggle(item.key, c)}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium border-b pb-2 mb-4 mt-6">Service Records</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {TEXT_CHECKLIST.map((item) => (
                <div key={item.key} className="space-y-1.5">
                  <Label htmlFor={item.key} className="text-sm text-muted-foreground">
                    {item.label}
                  </Label>
                  <Input
                    id={item.key}
                    value={checklist[item.key] || ''}
                    onChange={(e) => handleChange(item.key, e.target.value)}
                    placeholder={`Enter ${item.label.toLowerCase()} info`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
