import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface AllocationData {
  busNo: string;
  routeNo: string;
  routeName: string;
  driverName: string;
  conductorName: string;
  whatsapp: string;
  date: string;
  time: string;
}

export function BulkImportModal({ isOpen, onClose, onSuccess }: BulkImportModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  // Pre-defined data from user's Excel
  const predefinedData: AllocationData[] = [
    {
      busNo: 'NE 0746',
      routeNo: '15',
      routeName: 'Badulla to makumbura',
      driverName: 'Jayashantha',
      conductorName: 'Upul',
      whatsapp: '0702502294',
      date: '16/09/2025',
      time: '10.30am'
    },
    {
      busNo: 'NE 0762',
      routeNo: '15',
      routeName: 'Badulla to makumbura',
      driverName: 'Mohan',
      conductorName: 'Eranda',
      whatsapp: '0768450468',
      date: '17/09/2025',
      time: '5.30pm'
    },
    {
      busNo: 'NE 1184',
      routeNo: '15',
      routeName: 'makumbura to badulla',
      driverName: 'Shantha',
      conductorName: 'Eranda',
      whatsapp: '0768450468',
      date: '18/09/2025',
      time: '10.30am'
    },
    {
      busNo: 'NE 0746',
      routeNo: '15',
      routeName: 'makumbura to badulla',
      driverName: 'Jayashantha',
      conductorName: 'Upul',
      whatsapp: '0702502294',
      date: '19/09/2025',
      time: '5.30pm'
    },
    {
      busNo: 'NE 0746',
      routeNo: '15',
      routeName: 'Badulla to makumbura',
      driverName: 'Indika',
      conductorName: 'Kavinda',
      whatsapp: '0702502294',
      date: '20/09/2025',
      time: '10.30am'
    },
    {
      busNo: 'NE 0762',
      routeNo: '15',
      routeName: 'Badulla to makumbura',
      driverName: 'Mohan',
      conductorName: 'Eranda',
      whatsapp: '0768450468',
      date: '21/09/2025',
      time: '5.30pm'
    },
    {
      busNo: 'NE 0762',
      routeNo: '15',
      routeName: 'makumbura to badulla',
      driverName: 'Mohan',
      conductorName: 'Eranda',
      whatsapp: '0768450468',
      date: '22/09/2025',
      time: '10.30am'
    },
    {
      busNo: 'NE 0746',
      routeNo: '15',
      routeName: 'makumbura to badulla',
      driverName: 'Indika',
      conductorName: 'Kavinda',
      whatsapp: '0702502294',
      date: '23/09/2025',
      time: '5.30pm'
    }
  ];

  const handleBulkImport = async () => {
    setIsProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`https://wwjpdszkmtnzshbulkon.supabase.co/functions/v1/driver-allocation-import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ allocations: predefinedData })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success > 0) {
        toast.success(`Successfully imported ${result.success} driver allocations!`);
        if (result.created.buses.length > 0) {
          toast.info(`Created ${result.created.buses.length} new buses`);
        }
        if (result.created.staff.length > 0) {
          toast.info(`Created ${result.created.staff.length} new staff members`);
        }
        onSuccess();
        onClose();
      }

      if (result.errors.length > 0) {
        console.error('Import errors:', result.errors);
        toast.error(`${result.errors.length} errors occurred during import`);
      }

    } catch (error: any) {
      console.error('Bulk import error:', error);
      toast.error(`Import failed: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Import Driver Allocations</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Preview Data ({predefinedData.length} allocations)</h3>
            <div className="max-h-60 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Bus No</th>
                    <th className="text-left p-2">Route</th>
                    <th className="text-left p-2">Driver</th>
                    <th className="text-left p-2">Conductor</th>
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {predefinedData.map((allocation, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-2">{allocation.busNo}</td>
                      <td className="p-2">{allocation.routeName}</td>
                      <td className="p-2">{allocation.driverName}</td>
                      <td className="p-2">{allocation.conductorName}</td>
                      <td className="p-2">{allocation.date}</td>
                      <td className="p-2">{allocation.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">What will be created:</h4>
            <ul className="text-blue-800 space-y-1">
              <li>• 3 buses (NE 0746, NE 0762, NE 1184) - if they don't exist</li>
              <li>• Route 15 with bidirectional paths - if they don't exist</li>
              <li>• 7 staff members (4 drivers, 3 conductors) - if they don't exist</li>
              <li>• 8 driver allocations with corresponding daily trips</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button onClick={handleBulkImport} disabled={isProcessing}>
              {isProcessing ? 'Processing...' : 'Import All Data'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}