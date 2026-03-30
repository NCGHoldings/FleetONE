import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench } from 'lucide-react';

interface LightVehicleVehicleProcessingManagementProps {
  onRefresh: () => void;
}

export function LightVehicleVehicleProcessingManagement({ onRefresh }: LightVehicleVehicleProcessingManagementProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Vehicle Processing Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <p className="text-muted-foreground">Vehicle processing management interface coming soon...</p>
            <p className="text-sm text-muted-foreground mt-2">
              This will include dewaxing, washing, inspection, and accessory installation tracking
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}