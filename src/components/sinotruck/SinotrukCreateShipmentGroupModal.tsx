// @ts-nocheck
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Ship } from 'lucide-react';
import { useSinotrukShipmentGroupManagement, ShipmentGroup, CreateShipmentGroupData } from '@/hooks/useSinotrukShipmentGroupManagement';

interface SinotrukCreateShipmentGroupModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editShipment?: ShipmentGroup | null;
}

export function SinotrukCreateShipmentGroupModal({
  open,
  onClose,
  onSuccess,
  editShipment
}: SinotrukCreateShipmentGroupModalProps) {
  const isEditing = !!editShipment;
  const { createShipmentGroup, updateShipmentGroup, isLoading } = useSinotrukShipmentGroupManagement();

  const [formData, setFormData] = useState<CreateShipmentGroupData>({
    shipment_name: editShipment?.shipment_name || '',
    expected_departure_date: editShipment?.expected_departure_date || '',
    expected_arrival_date: editShipment?.expected_arrival_date || '',
    vessel_name: editShipment?.vessel_name || '',
    container_numbers: editShipment?.container_numbers || [],
    bill_of_lading_no: editShipment?.bill_of_lading_no || '',
    notes: editShipment?.notes || '',
  });

  const [containerInput, setContainerInput] = useState(
    editShipment?.container_numbers?.join(', ') || ''
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.shipment_name) return;

    const containerNumbers = containerInput
      .split(',')
      .map(c => c.trim())
      .filter(c => c);

    const data = {
      ...formData,
      container_numbers: containerNumbers.length > 0 ? containerNumbers : undefined,
    };

    let result;
    if (isEditing && editShipment) {
      result = await updateShipmentGroup(editShipment.id, data);
    } else {
      result = await createShipmentGroup(data);
    }

    if (result.success) {
      onSuccess();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ship className="h-5 w-5" />
            {isEditing ? 'Edit Shipment Group' : 'Create New Shipment Group'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Shipment Name *</Label>
            <Input
              id="name"
              value={formData.shipment_name}
              onChange={(e) => setFormData({ ...formData, shipment_name: e.target.value })}
              placeholder="e.g., December 2025 Batch 1"
              required
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="departure">Expected Departure</Label>
              <Input
                id="departure"
                type="date"
                value={formData.expected_departure_date || ''}
                onChange={(e) => setFormData({ ...formData, expected_departure_date: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="arrival">Expected Arrival</Label>
              <Input
                id="arrival"
                type="date"
                value={formData.expected_arrival_date || ''}
                onChange={(e) => setFormData({ ...formData, expected_arrival_date: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="vessel">Vessel Name</Label>
            <Input
              id="vessel"
              value={formData.vessel_name || ''}
              onChange={(e) => setFormData({ ...formData, vessel_name: e.target.value })}
              placeholder="e.g., MV Ever Given"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="containers">Container Numbers (comma-separated)</Label>
            <Input
              id="containers"
              value={containerInput}
              onChange={(e) => setContainerInput(e.target.value)}
              placeholder="e.g., MSCU1234567, MSCU7654321"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="bol">Bill of Lading Number</Label>
            <Input
              id="bol"
              value={formData.bill_of_lading_no || ''}
              onChange={(e) => setFormData({ ...formData, bill_of_lading_no: e.target.value })}
              placeholder="Enter B/L number"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about this shipment..."
              className="mt-1"
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
