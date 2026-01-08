import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface YutongInvoiceDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  existingData?: {
    engine_number?: string;
    chassis_number?: string;
    year_of_manufacture?: number;
    country_of_origin?: string;
    vehicle_condition?: string;
    fuel_type?: string;
    engine_capacity?: number;
    color_scheme?: string;
  };
  onSuccess: () => void;
}

export function YutongInvoiceDataModal({
  isOpen,
  onClose,
  orderId,
  existingData,
  onSuccess
}: YutongInvoiceDataModalProps) {
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    engine_number: existingData?.engine_number || '',
    chassis_number: existingData?.chassis_number || '',
    year_of_manufacture: existingData?.year_of_manufacture || new Date().getFullYear(),
    country_of_origin: existingData?.country_of_origin || 'CHINA',
    vehicle_condition: existingData?.vehicle_condition || 'BRAND NEW',
    fuel_type: existingData?.fuel_type || 'DIESEL',
    engine_capacity: existingData?.engine_capacity || 0,
    color_scheme: existingData?.color_scheme || ''
  });

  // Update form data when existingData changes
  useEffect(() => {
    setFormData({
      engine_number: existingData?.engine_number || '',
      chassis_number: existingData?.chassis_number || '',
      year_of_manufacture: existingData?.year_of_manufacture || new Date().getFullYear(),
      country_of_origin: existingData?.country_of_origin || 'CHINA',
      vehicle_condition: existingData?.vehicle_condition || 'BRAND NEW',
      fuel_type: existingData?.fuel_type || 'DIESEL',
      engine_capacity: existingData?.engine_capacity || 0,
      color_scheme: existingData?.color_scheme || ''
    });
  }, [existingData, isOpen]);

  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.engine_number || !formData.chassis_number || !formData.color_scheme) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('yutong_orders')
        .update({
          engine_number: formData.engine_number,
          chassis_number: formData.chassis_number,
          year_of_manufacture: formData.year_of_manufacture,
          country_of_origin: formData.country_of_origin,
          vehicle_condition: formData.vehicle_condition,
          fuel_type: formData.fuel_type,
          engine_capacity: formData.engine_capacity,
          color_scheme: formData.color_scheme
        })
        .eq('id', orderId);

      if (error) throw error;

      // Invalidate all yutong orders queries to trigger UI refresh
      await queryClient.invalidateQueries({ queryKey: ['yutong-orders'] });
      await queryClient.invalidateQueries({ queryKey: ['yutong-order', orderId] });
      
      toast.success('Vehicle details saved successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving vehicle details:', error);
      toast.error(error.message || 'Failed to save vehicle details');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Complete Vehicle Details for Invoice</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="engine_number">Engine Number *</Label>
              <Input
                id="engine_number"
                value={formData.engine_number}
                onChange={(e) => setFormData({ ...formData, engine_number: e.target.value })}
                placeholder="e.g., 7525D007365"
                required
              />
            </div>

            <div>
              <Label htmlFor="chassis_number">Chassis Number *</Label>
              <Input
                id="chassis_number"
                value={formData.chassis_number}
                onChange={(e) => setFormData({ ...formData, chassis_number: e.target.value })}
                placeholder="e.g., LZYTATF6651013439"
                required
              />
            </div>

            <div>
              <Label htmlFor="year_of_manufacture">Year of Manufacture *</Label>
              <Input
                id="year_of_manufacture"
                type="number"
                value={formData.year_of_manufacture}
                onChange={(e) => setFormData({ ...formData, year_of_manufacture: parseInt(e.target.value) })}
                min="2020"
                max="2030"
                required
              />
            </div>

            <div>
              <Label htmlFor="country_of_origin">Country of Origin *</Label>
              <Input
                id="country_of_origin"
                value={formData.country_of_origin}
                onChange={(e) => setFormData({ ...formData, country_of_origin: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="vehicle_condition">Vehicle Condition *</Label>
              <Input
                id="vehicle_condition"
                value={formData.vehicle_condition}
                onChange={(e) => setFormData({ ...formData, vehicle_condition: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="fuel_type">Fuel Type *</Label>
              <Input
                id="fuel_type"
                value={formData.fuel_type}
                onChange={(e) => setFormData({ ...formData, fuel_type: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="engine_capacity">Engine Capacity (CC) *</Label>
              <Input
                id="engine_capacity"
                type="number"
                value={formData.engine_capacity}
                onChange={(e) => setFormData({ ...formData, engine_capacity: parseInt(e.target.value) })}
                placeholder="e.g., 9500"
                required
              />
            </div>

            <div>
              <Label htmlFor="color_scheme">Color Scheme *</Label>
              <Input
                id="color_scheme"
                value={formData.color_scheme}
                onChange={(e) => setFormData({ ...formData, color_scheme: e.target.value })}
                placeholder="e.g., RED/GRAY/ORANGE"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save & Continue'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
