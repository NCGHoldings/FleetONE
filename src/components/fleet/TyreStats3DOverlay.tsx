import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BusTyre } from "@/hooks/useTyreManagement";

interface TyreStats3DOverlayProps {
  bus: any;
  tyres: BusTyre[];
  onTyreClick: (tyreId: string) => void;
}

export const TyreStats3DOverlay = ({ bus, tyres, onTyreClick }: TyreStats3DOverlayProps) => {
  const getConditionColor = (percentage: number) => {
    if (percentage >= 70) return "bg-emerald-500";
    if (percentage >= 50) return "bg-teal-500";
    if (percentage >= 30) return "bg-amber-500";
    if (percentage >= 10) return "bg-orange-500";
    return "bg-red-500";
  };

  const getConditionLabel = (percentage: number) => {
    if (percentage >= 70) return "Excellent";
    if (percentage >= 50) return "Good";
    if (percentage >= 30) return "Fair";
    if (percentage >= 10) return "Poor";
    return "Critical";
  };

  const worstCondition = tyres.length > 0 
    ? Math.min(...tyres.map(t => t.condition_percentage)) 
    : 100;

  const avgCondition = tyres.length > 0
    ? tyres.reduce((acc, t) => acc + t.condition_percentage, 0) / tyres.length
    : 0;

  const positions = [
    { key: "Front Left", label: "FL" },
    { key: "Front Right", label: "FR" },
    { key: "Rear Left 1", label: "RL1" },
    { key: "Rear Right 1", label: "RR1" },
    { key: "Rear Left 2", label: "RL2" },
    { key: "Rear Right 2", label: "RR2" },
  ];

  const getTyreByPosition = (position: string) => {
    return tyres.find(t => t.position === position);
  };

  return (
    <Card className="absolute top-4 right-4 w-72 p-4 bg-card/95 backdrop-blur-sm border shadow-xl z-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-foreground">{bus.bus_no}</h3>
          <p className="text-xs text-muted-foreground">{bus.model} • {bus.type}</p>
        </div>
        <Badge className={`${getConditionColor(worstCondition)} text-white`}>
          {getConditionLabel(worstCondition)}
        </Badge>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-muted/50 rounded-lg p-2 text-center">
          <p className="text-xs text-muted-foreground">Total Tyres</p>
          <p className="text-xl font-bold text-foreground">{tyres.length}/6</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-2 text-center">
          <p className="text-xs text-muted-foreground">Avg Condition</p>
          <p className="text-xl font-bold text-foreground">{avgCondition.toFixed(0)}%</p>
        </div>
      </div>

      {/* Tyre Position Grid */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase">Tyre Positions</p>
        <div className="grid grid-cols-2 gap-2">
          {positions.map(({ key, label }) => {
            const tyre = getTyreByPosition(key);
            const condition = tyre?.condition_percentage || 0;
            
            return (
              <button
                key={key}
                onClick={() => tyre && onTyreClick(tyre.id)}
                className={`p-2 rounded-lg border transition-all hover:scale-105 ${
                  tyre ? 'cursor-pointer hover:shadow-md' : 'cursor-not-allowed opacity-50'
                }`}
                disabled={!tyre}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-foreground">{label}</span>
                  <div className={`w-2 h-2 rounded-full ${getConditionColor(condition)}`} />
                </div>
                {tyre ? (
                  <>
                    <Progress value={condition} className="h-1.5 mb-1" />
                    <p className="text-xs text-muted-foreground truncate">{tyre.tyre_brand}</p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Empty</p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t">
        <p className="text-xs font-semibold text-muted-foreground mb-2">Condition Legend</p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "≥70%", color: "bg-emerald-500" },
            { label: "50-69%", color: "bg-teal-500" },
            { label: "30-49%", color: "bg-amber-500" },
            { label: "10-29%", color: "bg-orange-500" },
            { label: "<10%", color: "bg-red-500" },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${color}`} />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};
