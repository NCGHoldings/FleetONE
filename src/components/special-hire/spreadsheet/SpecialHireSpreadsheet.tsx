import React from 'react';
import { useSpecialHireSpreadsheetData } from '@/hooks/useSpecialHireSpreadsheetData';
import { SpecialHireSpreadsheetCore } from './SpecialHireSpreadsheetCore';

export function SpecialHireSpreadsheet() {
  const { hires, loading, refetch, updateField } = useSpecialHireSpreadsheetData();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Special Hire Spreadsheet</h2>
        <p className="text-sm text-muted-foreground">Full operations tracking — click any editable cell to update instantly</p>
      </div>

      <SpecialHireSpreadsheetCore
        hires={hires}
        loading={loading}
        onUpdate={updateField}
        onRefresh={refetch}
      />
    </div>
  );
}
