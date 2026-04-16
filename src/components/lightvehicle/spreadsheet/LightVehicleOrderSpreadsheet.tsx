import React, { useState } from 'react';
import { useLightVehicleSpreadsheetData } from '@/hooks/useLightVehicleSpreadsheetData';
import { LightVehicleSpreadsheetCore } from './LightVehicleSpreadsheetCore';
import { LightVehicleSpreadsheetShareDialog } from './LightVehicleSpreadsheetShareDialog';
import { Button } from '@/components/ui/button';
import { Share2, ExternalLink } from 'lucide-react';

export function LightVehicleOrderSpreadsheet() {
  const { orders, loading, refetch, updateOrderField, addOrder, deleteOrder } = useLightVehicleSpreadsheetData();
  const [showShare, setShowShare] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Orders Spreadsheet</h2>
          <p className="text-sm text-muted-foreground">Live editable spreadsheet — changes save instantly</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.open('/public/lightvehicle-spreadsheet', '_blank')} className="gap-1">
            <ExternalLink className="h-3.5 w-3.5" /> Open External
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowShare(true)} className="gap-1">
            <Share2 className="h-3.5 w-3.5" /> Share Link
          </Button>
        </div>
      </div>

      <LightVehicleSpreadsheetCore
        orders={orders}
        loading={loading}
        onUpdate={updateOrderField}
        onRefresh={refetch}
        onAddOrder={addOrder}
        onDeleteOrder={deleteOrder}
      />

      <LightVehicleSpreadsheetShareDialog open={showShare} onOpenChange={setShowShare} />
    </div>
  );
}
