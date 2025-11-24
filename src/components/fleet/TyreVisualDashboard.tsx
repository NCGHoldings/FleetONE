import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";
import { TyreDetailsModal } from "./TyreDetailsModal";
import { BusTyreOverviewModal } from "./BusTyreOverviewModal";
import { TyreRotationModal } from "./TyreRotationModal";
import { Eye, RotateCcw, PlusCircle, AlertTriangle } from "lucide-react";
import { BusTyre } from "@/hooks/useTyreManagement";

interface TyreVisualDashboardProps {
  bus: any;
  tyres: BusTyre[];
}

export const TyreVisualDashboard = ({ bus, tyres }: TyreVisualDashboardProps) => {
  const [selectedTyreId, setSelectedTyreId] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showOverviewModal, setShowOverviewModal] = useState(false);
  const [showRotationModal, setShowRotationModal] = useState(false);

  const getConditionColor = (percentage: number) => {
    if (percentage >= 70) return "bg-emerald-500";
    if (percentage >= 50) return "bg-teal-500";
    if (percentage >= 30) return "bg-amber-500";
    if (percentage >= 10) return "bg-orange-500";
    return "bg-red-500";
  };

  const getConditionBadge = (percentage: number) => {
    if (percentage >= 70) return <Badge className="bg-emerald-500">Excellent</Badge>;
    if (percentage >= 50) return <Badge className="bg-teal-500">Good</Badge>;
    if (percentage >= 30) return <Badge className="bg-amber-500">Fair</Badge>;
    if (percentage >= 10) return <Badge className="bg-orange-500">Poor</Badge>;
    return <Badge className="bg-red-500">Critical</Badge>;
  };

  const worstCondition = tyres.length > 0 
    ? Math.min(...tyres.map(t => t.condition_percentage)) 
    : 100;

  const handleTyreClick = (tyreId: string) => {
    setSelectedTyreId(tyreId);
    setShowDetailsModal(true);
  };

  // Organize tyres by position
  const frontLeft = tyres.find(t => t.position === "Front Left");
  const frontRight = tyres.find(t => t.position === "Front Right");
  const rearLeft1 = tyres.find(t => t.position === "Rear Left 1");
  const rearRight1 = tyres.find(t => t.position === "Rear Right 1");
  const rearLeft2 = tyres.find(t => t.position === "Rear Left 2");
  const rearRight2 = tyres.find(t => t.position === "Rear Right 2");

  const TyreIndicator = ({ tyre, position }: { tyre?: BusTyre; position: string }) => {
    if (!tyre) {
      return (
        <div className="flex flex-col items-center">
          <div className="w-20 h-28 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/20">
            <PlusCircle className="w-6 h-6 text-muted-foreground/50" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">{position}</p>
        </div>
      );
    }

    const condition = tyre.condition_percentage;
    const colorClass = getConditionColor(condition);

    return (
      <div className="flex flex-col items-center">
        <button
          onClick={() => handleTyreClick(tyre.id)}
          className="relative group cursor-pointer"
        >
          <div className={`w-20 h-28 rounded-lg ${colorClass} shadow-lg transform transition-all duration-200 hover:scale-105 hover:shadow-xl flex flex-col items-center justify-center text-white font-bold relative overflow-hidden`}>
            <div className="absolute inset-0 bg-black/20" />
            <div className="relative z-10">
              <p className="text-2xl">{Math.round(condition)}%</p>
              <Progress value={condition} className="w-14 h-1 mt-1 bg-white/30" />
            </div>
            {condition < 30 && (
              <AlertTriangle className="absolute top-1 right-1 w-4 h-4 text-white animate-pulse" />
            )}
          </div>
          <div className="absolute inset-0 rounded-lg bg-white opacity-0 group-hover:opacity-20 transition-opacity" />
        </button>
        <p className="text-xs text-muted-foreground mt-1">{position}</p>
        <p className="text-xs font-medium text-foreground">{tyre.tyre_brand}</p>
      </div>
    );
  };

  return (
    <>
      <Card className="p-6 bg-card/50 backdrop-blur border-l-4 hover:shadow-xl transition-all duration-300" 
            style={{ borderLeftColor: worstCondition < 30 ? '#ef4444' : worstCondition < 50 ? '#f59e0b' : '#10b981' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-foreground">{bus.bus_no}</h3>
            <p className="text-sm text-muted-foreground">{bus.model} • {bus.type}</p>
          </div>
          {getConditionBadge(worstCondition)}
        </div>

        {/* Visual Tyre Layout */}
        <div className="space-y-6 my-6">
          {/* Front Axle */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 text-center">FRONT AXLE</p>
            <div className="flex justify-center gap-8">
              <TyreIndicator tyre={frontLeft} position="FL" />
              <TyreIndicator tyre={frontRight} position="FR" />
            </div>
          </div>

          {/* Rear Axle 1 */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 text-center">REAR AXLE 1</p>
            <div className="flex justify-center gap-8">
              <TyreIndicator tyre={rearLeft1} position="RL1" />
              <TyreIndicator tyre={rearRight1} position="RR1" />
            </div>
          </div>

          {/* Rear Axle 2 (if exists) */}
          {(rearLeft2 || rearRight2) && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2 text-center">REAR AXLE 2</p>
              <div className="flex justify-center gap-8">
                <TyreIndicator tyre={rearLeft2} position="RL2" />
                <TyreIndicator tyre={rearRight2} position="RR2" />
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 hover:bg-primary/10 hover:text-primary transition-colors"
            onClick={() => setShowOverviewModal(true)}
          >
            <Eye className="w-4 h-4 mr-1" />
            View All
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 hover:bg-purple-500/10 hover:text-purple-600 transition-colors"
            onClick={() => setShowRotationModal(true)}
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Rotate
          </Button>
        </div>
      </Card>

      {selectedTyreId && (
        <TyreDetailsModal
          open={showDetailsModal}
          onOpenChange={setShowDetailsModal}
          tyreId={selectedTyreId}
          busNumber={bus.bus_no}
        />
      )}

      <BusTyreOverviewModal
        open={showOverviewModal}
        onOpenChange={setShowOverviewModal}
        bus={bus}
        tyres={tyres}
        onViewTyreDetails={(tyreId) => {
          setSelectedTyreId(tyreId);
          setShowDetailsModal(true);
          setShowOverviewModal(false);
        }}
        onRotate={() => {
          setShowRotationModal(true);
          setShowOverviewModal(false);
        }}
      />

      <TyreRotationModal
        open={showRotationModal}
        onOpenChange={setShowRotationModal}
        bus={bus}
        tyres={tyres}
      />
    </>
  );
};
