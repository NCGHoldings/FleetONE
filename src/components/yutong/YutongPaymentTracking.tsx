import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface YutongPaymentTrackingProps {
  onRefresh: () => void;
}

export function YutongPaymentTracking({ onRefresh }: YutongPaymentTrackingProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment Tracking</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <p className="text-muted-foreground">Payment tracking interface coming soon...</p>
            <p className="text-sm text-muted-foreground mt-2">
              This will include payment schedules and customer payment recording
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}