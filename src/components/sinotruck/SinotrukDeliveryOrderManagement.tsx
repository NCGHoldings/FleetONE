import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SinotrukDeliveryOrderManagementProps {
  onRefresh: () => void;
}

export function SinotrukDeliveryOrderManagement({ onRefresh }: SinotrukDeliveryOrderManagementProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Delivery Order Management</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <p className="text-muted-foreground">Delivery Order management interface coming soon...</p>
            <p className="text-sm text-muted-foreground mt-2">
              This will include DO creation, release tracking, and collection management
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}