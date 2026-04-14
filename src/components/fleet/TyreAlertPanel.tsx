import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BusTyre } from "@/hooks/useTyreManagement";
import { AlertTriangle, RotateCcw, DollarSign, TrendingDown, Bell } from "lucide-react";
import { formatDateDisplay } from "@/lib/utils";

interface TyreAlertPanelProps {
  tyres: BusTyre[];
  onViewTyre?: (tyreId: string) => void;
}

export const TyreAlertPanel = ({ tyres, onViewTyre }: TyreAlertPanelProps) => {
  // Critical condition alerts (< 30%)
  const criticalTyres = tyres.filter(t => t.condition_percentage < 30);

  // Rotation due alerts (> 20,000 km since last rotation)
  const rotationDueTyres = tyres.filter(t => {
    const kmSinceRotation = t.current_km - (t.last_rotation_date ? t.km_at_installation : 0);
    return kmSinceRotation > 20000;
  });

  // Uneven wear detection (simulated - in real system would analyze wear patterns)
  const unevenWearTyres = tyres.filter(t => {
    // This is a placeholder - real implementation would check inspection records
    return t.condition_percentage < 40 && t.condition_percentage > 20;
  }).slice(0, 3);

  // Budget alerts (tyres close to replacement)
  const upcomingReplacements = tyres.filter(t => t.condition_percentage < 40).length;
  const estimatedCost = upcomingReplacements * 45000; // Average tyre cost

  const totalAlerts = criticalTyres.length + rotationDueTyres.length + unevenWearTyres.length;

  if (totalAlerts === 0) {
    return (
      <Card className="p-6 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Bell className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h3 className="font-semibold text-emerald-700 dark:text-emerald-400">
              All Systems Normal
            </h3>
            <p className="text-sm text-muted-foreground">
              No critical alerts at this time
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-card/50 backdrop-blur">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Bell className="w-5 h-5 text-red-500 animate-pulse" />
          Active Alerts ({totalAlerts})
        </h3>
        <Badge className="bg-red-500">Attention Required</Badge>
      </div>

      <div className="space-y-3">
        {/* Critical Condition Alerts */}
        {criticalTyres.length > 0 && (
          <Alert className="border-red-500 bg-red-500/10">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-red-500">
                    {criticalTyres.length} Tyre{criticalTyres.length > 1 ? 's' : ''} in Critical Condition
                  </span>
                  <p className="text-sm text-muted-foreground mt-1">
                    Immediate replacement recommended
                  </p>
                </div>
                <Button size="sm" variant="destructive">View Details</Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Rotation Due Alerts */}
        {rotationDueTyres.length > 0 && (
          <Alert className="border-amber-500 bg-amber-500/10">
            <RotateCcw className="h-4 w-4 text-amber-500" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-amber-500">
                    {rotationDueTyres.length} Tyre{rotationDueTyres.length > 1 ? 's' : ''} Due for Rotation
                  </span>
                  <p className="text-sm text-muted-foreground mt-1">
                    Exceeded 20,000 km since last rotation
                  </p>
                </div>
                <Button size="sm" variant="outline">Schedule</Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Uneven Wear Alerts */}
        {unevenWearTyres.length > 0 && (
          <Alert className="border-orange-500 bg-orange-500/10">
            <TrendingDown className="h-4 w-4 text-orange-500" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-orange-500">
                    Uneven Wear Detected on {unevenWearTyres.length} Tyre{unevenWearTyres.length > 1 ? 's' : ''}
                  </span>
                  <p className="text-sm text-muted-foreground mt-1">
                    Check alignment and pressure
                  </p>
                </div>
                <Button size="sm" variant="outline">Inspect</Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Budget Alert */}
        {upcomingReplacements > 0 && (
          <Alert className="border-purple-500 bg-purple-500/10">
            <DollarSign className="h-4 w-4 text-purple-500" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-purple-500">
                    Budget Forecast: LKR {estimatedCost.toLocaleString()}
                  </span>
                  <p className="text-sm text-muted-foreground mt-1">
                    {upcomingReplacements} tyre{upcomingReplacements > 1 ? 's' : ''} approaching replacement threshold
                  </p>
                </div>
                <Button size="sm" variant="outline">Plan Budget</Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </Card>
  );
};