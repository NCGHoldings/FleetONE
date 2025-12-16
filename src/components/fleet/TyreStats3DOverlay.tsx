import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BusTyre } from "@/hooks/useTyreManagement";
import { cn } from "@/lib/utils";

interface TyreStats3DOverlayProps {
  bus: any;
  tyres: BusTyre[];
  onTyreClick: (tyreId: string) => void;
}

export const TyreStats3DOverlay = ({ bus, tyres, onTyreClick }: TyreStats3DOverlayProps) => {
  const getConditionColor = (percentage: number) => {
    if (percentage >= 70) return "bg-green-500";
    if (percentage >= 50) return "bg-lime-500";
    if (percentage >= 30) return "bg-yellow-500";
    if (percentage >= 10) return "bg-orange-500";
    return "bg-red-500";
  };

  const getConditionBgColor = (percentage: number) => {
    if (percentage >= 70) return "bg-green-50 border-green-200";
    if (percentage >= 50) return "bg-lime-50 border-lime-200";
    if (percentage >= 30) return "bg-yellow-50 border-yellow-200";
    if (percentage >= 10) return "bg-orange-50 border-orange-200";
    return "bg-red-50 border-red-200";
  };

  const getConditionTextColor = (percentage: number) => {
    if (percentage >= 70) return "text-green-700";
    if (percentage >= 50) return "text-lime-700";
    if (percentage >= 30) return "text-yellow-700";
    if (percentage >= 10) return "text-orange-700";
    return "text-red-700";
  };

  const positions = [
    { key: "Front Left", short: "FL" },
    { key: "Front Right", short: "FR" },
    { key: "Rear Left 1", short: "RL1" },
    { key: "Rear Right 1", short: "RR1" },
    { key: "Rear Left 2", short: "RL2" },
    { key: "Rear Right 2", short: "RR2" },
  ];

  const getTyreByPosition = (position: string) => {
    return tyres.find(t => t.position === position);
  };

  const worstCondition = tyres.length > 0 
    ? Math.min(...tyres.map(t => t.condition_percentage || 100))
    : 0;
  
  const avgCondition = tyres.length > 0
    ? Math.round(tyres.reduce((sum, t) => sum + (t.condition_percentage || 0), 0) / tyres.length)
    : 0;

  return (
    <Card className="absolute top-4 right-4 z-10 w-[320px] bg-white/95 backdrop-blur-sm shadow-lg border-slate-200">
      {/* Header */}
      <div className="p-3 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">{bus?.bus_no || "Select Bus"}</h3>
            <p className="text-xs text-slate-500">{bus?.model || ""}</p>
          </div>
          <Badge 
            className={cn(
              "text-xs font-medium",
              worstCondition >= 70 ? "bg-green-100 text-green-700" :
              worstCondition >= 50 ? "bg-lime-100 text-lime-700" :
              worstCondition >= 30 ? "bg-yellow-100 text-yellow-700" :
              worstCondition >= 10 ? "bg-orange-100 text-orange-700" :
              "bg-red-100 text-red-700"
            )}
          >
            {worstCondition >= 70 ? "Good" : 
             worstCondition >= 50 ? "Fair" :
             worstCondition >= 30 ? "Warning" :
             "Critical"}
          </Badge>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-2 p-3 border-b border-slate-100">
        <div className="text-center p-2 bg-slate-50 rounded-lg">
          <div className="text-lg font-bold text-slate-900">{tyres.length}</div>
          <div className="text-xs text-slate-500">Total Tyres</div>
        </div>
        <div className="text-center p-2 bg-slate-50 rounded-lg">
          <div className={cn("text-lg font-bold", getConditionTextColor(avgCondition))}>
            {avgCondition}%
          </div>
          <div className="text-xs text-slate-500">Avg Condition</div>
        </div>
      </div>

      {/* Tyre Position Grid - 6 columns like reference */}
      <div className="p-3">
        <div className="text-xs font-medium text-slate-500 mb-2">Tyre Positions</div>
        <div className="grid grid-cols-6 gap-1">
          {positions.map(({ key, short }) => {
            const tyre = getTyreByPosition(key);
            const condition = tyre?.condition_percentage || 0;
            
            return (
              <button
                key={key}
                onClick={() => tyre && onTyreClick(tyre.id)}
                className={cn(
                  "flex flex-col items-center p-1.5 rounded-lg border transition-all",
                  "hover:scale-105 hover:shadow-md cursor-pointer",
                  tyre ? getConditionBgColor(condition) : "bg-slate-100 border-slate-200"
                )}
                title={`${key}: ${condition}%`}
              >
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold mb-1",
                  tyre ? getConditionColor(condition) : "bg-slate-300"
                )}>
                  {tyre ? condition : "—"}
                </div>
                <span className="text-[9px] font-medium text-slate-600">{short}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="px-3 pb-3">
        <div className="flex items-center justify-between gap-1 text-[9px]">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-slate-500">70%+</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-lime-500" />
            <span className="text-slate-500">50%+</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span className="text-slate-500">30%+</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="text-slate-500">10%+</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-slate-500">&lt;10%</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
