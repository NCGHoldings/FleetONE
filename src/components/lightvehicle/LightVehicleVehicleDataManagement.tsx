import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileSpreadsheet } from 'lucide-react';

export function LightVehicleVehicleDataManagement() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Vehicle Data Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8 text-muted-foreground">
          <p>Vehicle data sheet management coming soon.</p>
          <p className="text-sm mt-2">Upload Excel/CSV files with vehicle details to track inventory.</p>
        </div>
      </CardContent>
    </Card>
  );
}
