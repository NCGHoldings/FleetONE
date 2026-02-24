import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Zap, FileText, Edit, Calculator, Trash } from "lucide-react";

interface Trip {
  id: string;
  trip_no: string;
  bus_no: string;
  route_no: string;
  route: string;
  driver_name?: string;
  conductor_name?: string;
  trip_date: string;
  start_time?: string;
  end_time?: string;
  distance_km: number;
  income: number;
  fuel_cost: number;
  other_expenses: number;
  total_expenses: number;
  net_income: number;
  km_per_liter: number;
  status: "scheduled" | "ongoing" | "completed" | "cancelled";
}

interface TripCardProps {
  trip: Trip;
  onQuickEntry: (trip: Trip) => void;
  onViewDetails: (tripId: string) => void;
  onEdit: (trip: Trip) => void;
  onViewExpenses: (trip: Trip) => void;
  onCancel: (tripId: string) => void;
  onDelete: (tripId: string) => void;
}

const getStatusBadge = (status: Trip['status']) => {
  const variants = {
    scheduled: { variant: "secondary" as const, label: "Scheduled" },
    ongoing: { variant: "warning" as const, label: "Ongoing" },
    completed: { variant: "success" as const, label: "Completed" },
    cancelled: { variant: "destructive" as const, label: "Cancelled" }
  };
  
  const config = variants[status];
  return <Badge className={`status-${config.variant.replace('destructive', 'error')}`}>{config.label}</Badge>;
};

export function TripCard({
  trip,
  onQuickEntry,
  onViewDetails,
  onEdit,
  onViewExpenses,
  onCancel,
  onDelete,
}: TripCardProps) {
  return (
    <Card className="mb-4">
      <CardContent className="pt-6">
        {/* Header: Bus & Route with Status */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-lg">
              {trip.bus_no} - {trip.route_no}
            </h3>
            <p className="text-sm text-muted-foreground">{trip.route}</p>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(trip.status)}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onQuickEntry(trip)}>
                  <Zap className="h-4 w-4 mr-2" />
                  Quick Entry
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onViewDetails(trip.id)}>
                  <FileText className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(trip)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Trip
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onViewExpenses(trip)}>
                  <Calculator className="h-4 w-4 mr-2" />
                  View Expenses
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => onCancel(trip.id)}>
                  Cancel Trip
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => onDelete(trip.id)}>
                  <Trash className="h-4 w-4 mr-2" />
                  Delete Trip
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Financial Highlights */}
        <div className="grid grid-cols-3 gap-3 mb-4 p-3 bg-muted/30 rounded-lg">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Income</p>
            <p className="font-semibold text-green-600">
              {trip.income > 0 ? `₨${trip.income.toLocaleString()}` : "-"}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Expenses</p>
            <p className="font-semibold text-orange-600">
              {trip.total_expenses > 0 ? `₨${trip.total_expenses.toLocaleString()}` : "-"}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-1">Net Income</p>
            <p className={`font-semibold ${trip.net_income >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trip.net_income !== 0 ? `₨${trip.net_income.toLocaleString()}` : "-"}
            </p>
          </div>
        </div>

        {/* Trip Details */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Date:</span>
            <span className="font-medium">{new Date(trip.trip_date).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Trip ID:</span>
            <span className="font-mono text-xs">{trip.trip_no}</span>
          </div>
          {trip.driver_name && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Driver:</span>
              <span>{trip.driver_name}</span>
            </div>
          )}
          {trip.conductor_name && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Conductor:</span>
              <span>{trip.conductor_name}</span>
            </div>
          )}
          {trip.start_time && trip.end_time && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Time:</span>
              <span>{trip.start_time} - {trip.end_time}</span>
            </div>
          )}
          {trip.distance_km > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Distance:</span>
              <span>{trip.distance_km.toFixed(1)} km</span>
            </div>
          )}
          {trip.km_per_liter > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Efficiency:</span>
              <span>{trip.km_per_liter.toFixed(1)} km/L</span>
            </div>
          )}
        </div>

        {/* Expense Breakdown */}
        {(trip.fuel_cost > 0 || trip.other_expenses > 0) && (
          <div className="mt-3 pt-3 border-t border-border space-y-1 text-xs">
            {trip.fuel_cost > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Fuel Cost:</span>
                <span>₨{trip.fuel_cost.toLocaleString()}</span>
              </div>
            )}
            {trip.other_expenses > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Other Expenses:</span>
                <span>₨{trip.other_expenses.toLocaleString()}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
