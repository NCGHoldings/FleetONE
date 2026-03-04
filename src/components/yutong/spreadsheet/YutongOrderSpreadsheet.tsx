import React, { useState } from 'react';
import { useYutongSpreadsheetData } from '@/hooks/useYutongSpreadsheetData';
import { YutongSpreadsheetCore } from './YutongSpreadsheetCore';
import { YutongSpreadsheetShareDialog } from './YutongSpreadsheetShareDialog';
import { Button } from '@/components/ui/button';
import { Share2, ExternalLink } from 'lucide-react';

export function YutongOrderSpreadsheet() {
  const { orders, loading, refetch, updateOrderField } = useYutongSpreadsheetData();
  const [showShare, setShowShare] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Orders Spreadsheet</h2>
          <p className="text-sm text-muted-foreground">Live editable spreadsheet — changes save instantly</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.open('/public/yutong-spreadsheet', '_blank')} className="gap-1">
            <ExternalLink className="h-3.5 w-3.5" /> Open External
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowShare(true)} className="gap-1">
            <Share2 className="h-3.5 w-3.5" /> Share Link
          </Button>
        </div>
      </div>

      <YutongSpreadsheetCore
        orders={orders}
        loading={loading}
        onUpdate={updateOrderField}
        onRefresh={refetch}
      />

      <YutongSpreadsheetShareDialog open={showShare} onOpenChange={setShowShare} />
    </div>
  );
}
