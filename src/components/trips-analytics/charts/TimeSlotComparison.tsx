import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sunrise, Sun, Moon } from "lucide-react";

interface TimeSlotData {
  morning: { income: number; profit: number; trips: number };
  afternoon: { income: number; profit: number; trips: number };
  evening: { income: number; profit: number; trips: number };
}

interface TimeSlotComparisonProps {
  data: TimeSlotData;
}

export default function TimeSlotComparison({ data }: TimeSlotComparisonProps) {
  const slots = [
    {
      name: "Morning",
      subtext: "6:00 AM - 12:00 PM",
      icon: Sunrise,
      data: data.morning,
      color: "hsl(var(--chart-1))",
    },
    {
      name: "Afternoon",
      subtext: "12:00 PM - 6:00 PM",
      icon: Sun,
      data: data.afternoon,
      color: "hsl(var(--chart-2))",
    },
    {
      name: "Evening",
      subtext: "6:00 PM - 12:00 AM",
      icon: Moon,
      data: data.evening,
      color: "hsl(var(--chart-3))",
    },
  ];

  const totalTrips = data.morning.trips + data.afternoon.trips + data.evening.trips;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Time Slot Performance</CardTitle>
        <p className="text-sm text-muted-foreground">Compare morning, afternoon, and evening operations</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {slots.map((slot) => {
            const Icon = slot.icon;
            const percentage = totalTrips > 0 ? ((slot.data.trips / totalTrips) * 100).toFixed(1) : 0;
            
            return (
              <div
                key={slot.name}
                className="relative overflow-hidden rounded-lg border bg-card p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5" style={{ color: slot.color }} />
                      <h3 className="font-semibold">{slot.name}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">{slot.subtext}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold" style={{ color: slot.color }}>
                      {percentage}%
                    </div>
                    <div className="text-xs text-muted-foreground">of trips</div>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Income</span>
                    <span className="font-medium">₹{slot.data.income.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Profit</span>
                    <span className="font-medium">₹{slot.data.profit.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Trips</span>
                    <span className="font-medium">{slot.data.trips}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4 h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: slot.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
