import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, HeadphonesIcon, Bell, Star } from 'lucide-react';
import { LightVehicleReportData } from '@/hooks/useLightVehicleExecutiveReport';

interface Props {
  data: LightVehicleReportData;
}

export function LightVehicleAfterSalesHealth({ data }: Props) {
  const items = [
    { label: 'Active Warranties', value: data.afterSales.activeWarranties, icon: Shield, color: 'text-green-600 bg-green-50' },
    { label: 'Open Tickets', value: data.afterSales.openTickets, icon: HeadphonesIcon, color: 'text-red-600 bg-red-50' },
    { label: 'Pending Reminders', value: data.afterSales.pendingReminders, icon: Bell, color: 'text-amber-600 bg-amber-50' },
  ];

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-5 w-5 ${i < Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">After Sales Health</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {items.map(item => (
            <div key={item.label} className={`rounded-xl p-4 text-center ${item.color}`}>
              <item.icon className="h-6 w-6 mx-auto mb-2" />
              <p className="text-2xl font-bold">{item.value}</p>
              <p className="text-xs mt-1">{item.label}</p>
            </div>
          ))}
          <div className="rounded-xl p-4 text-center bg-yellow-50 text-yellow-700">
            <div className="flex justify-center mb-2">
              {renderStars(data.afterSales.avgFeedbackRating)}
            </div>
            <p className="text-2xl font-bold">{data.afterSales.avgFeedbackRating || 'N/A'}</p>
            <p className="text-xs mt-1">Avg Rating ({data.afterSales.totalFeedback} reviews)</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
