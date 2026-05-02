import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CalendarDays, MapPin } from 'lucide-react';
import { format, addDays } from 'date-fns';

export default function CrewSchedule() {
  // In a real implementation, we would fetch from `bus_allocations` table
  // where driver_id or conductor_id matches the authenticated user.
  // For now, we show a mockup to demonstrate the UX.
  
  const upcomingSchedules = [
    { id: 1, date: new Date(), route: 'Jaffna - Colombo', bus: 'NCG-1234', time: '05:30 AM' },
    { id: 2, date: addDays(new Date(), 1), route: 'Colombo - Jaffna', bus: 'NCG-1234', time: '10:00 PM' },
    { id: 3, date: addDays(new Date(), 2), route: 'Off Duty', bus: '-', time: '-' },
  ];

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-slate-800">Your Schedule</h1>
      <p className="text-sm text-slate-500 mb-4">Upcoming route allocations.</p>
      
      <div className="space-y-3">
        {upcomingSchedules.map((sched) => (
          <Card key={sched.id} className={sched.route === 'Off Duty' ? 'bg-slate-100 opacity-75' : 'border-blue-100 shadow-sm'}>
            <div className="flex">
              <div className={`w-16 flex flex-col items-center justify-center p-2 rounded-l-xl text-white ${
                sched.route === 'Off Duty' ? 'bg-slate-400' : 'bg-blue-600'
              }`}>
                <span className="text-xs font-medium uppercase">{format(sched.date, 'MMM')}</span>
                <span className="text-xl font-black">{format(sched.date, 'dd')}</span>
              </div>
              <div className="flex-1 p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-800 flex items-center gap-1">
                      {sched.route !== 'Off Duty' && <MapPin className="w-3 h-3 text-blue-500" />}
                      {sched.route}
                    </h3>
                    {sched.route !== 'Off Duty' && (
                      <p className="text-sm text-slate-500 mt-1">Bus: {sched.bus}</p>
                    )}
                  </div>
                  {sched.route !== 'Off Duty' && (
                    <div className="text-right">
                      <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-1 rounded">
                        {sched.time}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
