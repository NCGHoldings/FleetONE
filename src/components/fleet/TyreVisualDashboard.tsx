import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

  const getConditionBorderColor = (percentage: number) => {
    if (percentage >= 70) return "border-emerald-600";
    if (percentage >= 50) return "border-teal-600";
    if (percentage >= 30) return "border-amber-600";
    if (percentage >= 10) return "border-orange-600";
    return "border-red-600";
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

  // Get tyres by position
  const frontLeft = tyres.find(t => t.position === "Front Left");
  const frontRight = tyres.find(t => t.position === "Front Right");
  const rearLeft1 = tyres.find(t => t.position === "Rear Left 1");
  const rearRight1 = tyres.find(t => t.position === "Rear Right 1");
  const rearLeft2 = tyres.find(t => t.position === "Rear Left 2");
  const rearRight2 = tyres.find(t => t.position === "Rear Right 2");

  // Single Tyre Component (for front tyres)
  const SingleTyre = ({ tyre, position, side }: { tyre?: BusTyre; position: string; side: 'left' | 'right' }) => {
    if (!tyre) {
      return (
        <button
          className={`w-10 h-16 rounded-md border-2 border-dashed border-muted-foreground/40 flex items-center justify-center bg-muted/30 hover:bg-muted/50 transition-all ${side === 'left' ? '-ml-5' : '-mr-5'}`}
        >
          <PlusCircle className="w-4 h-4 text-muted-foreground/50" />
        </button>
      );
    }

    const condition = tyre.condition_percentage;
    return (
      <button
        onClick={() => handleTyreClick(tyre.id)}
        className={`w-10 h-16 rounded-md ${getConditionColor(condition)} ${getConditionBorderColor(condition)} border-2 shadow-lg hover:scale-110 transition-all duration-200 flex items-center justify-center text-white font-bold text-xs relative ${side === 'left' ? '-ml-5' : '-mr-5'}`}
      >
        {Math.round(condition)}%
        {condition < 30 && (
          <AlertTriangle className="absolute -top-1 -right-1 w-3 h-3 text-white animate-pulse" />
        )}
      </button>
    );
  };

  // Dual Tyre Component (for rear dual tyres)
  const DualTyre = ({ outerTyre, innerTyre, outerPos, innerPos, side }: { 
    outerTyre?: BusTyre; 
    innerTyre?: BusTyre; 
    outerPos: string;
    innerPos: string;
    side: 'left' | 'right';
  }) => {
    const TyreBox = ({ tyre, position }: { tyre?: BusTyre; position: string }) => {
      if (!tyre) {
        return (
          <button
            className="w-8 h-14 rounded-sm border-2 border-dashed border-muted-foreground/40 flex items-center justify-center bg-muted/30 hover:bg-muted/50 transition-all"
          >
            <PlusCircle className="w-3 h-3 text-muted-foreground/50" />
          </button>
        );
      }

      const condition = tyre.condition_percentage;
      return (
        <button
          onClick={() => handleTyreClick(tyre.id)}
          className={`w-8 h-14 rounded-sm ${getConditionColor(condition)} ${getConditionBorderColor(condition)} border-2 shadow-md hover:scale-110 transition-all duration-200 flex items-center justify-center text-white font-bold text-[10px] relative`}
        >
          {Math.round(condition)}%
          {condition < 30 && (
            <AlertTriangle className="absolute -top-1 -right-1 w-2.5 h-2.5 text-white animate-pulse" />
          )}
        </button>
      );
    };

    return (
      <div className={`flex gap-0.5 ${side === 'left' ? '-ml-4 flex-row-reverse' : '-mr-4 flex-row'}`}>
        <TyreBox tyre={outerTyre} position={outerPos} />
        <TyreBox tyre={innerTyre} position={innerPos} />
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

        {/* Top-Down Bus Diagram */}
        <div className="relative w-56 h-80 mx-auto my-4">
          {/* Bus Body SVG */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 224 320">
            {/* Main bus body */}
            <rect 
              x="32" 
              y="20" 
              width="160" 
              height="280" 
              rx="16" 
              fill="hsl(var(--muted))" 
              stroke="hsl(var(--border))" 
              strokeWidth="2"
            />
            {/* Front windshield area */}
            <rect 
              x="52" 
              y="30" 
              width="120" 
              height="40" 
              rx="8" 
              fill="hsl(var(--muted-foreground)/0.2)" 
              stroke="hsl(var(--border))" 
              strokeWidth="1"
            />
            {/* Rear window */}
            <rect 
              x="62" 
              y="260" 
              width="100" 
              height="30" 
              rx="6" 
              fill="hsl(var(--muted-foreground)/0.2)" 
              stroke="hsl(var(--border))" 
              strokeWidth="1"
            />
            {/* Center line */}
            <line 
              x1="112" 
              y1="80" 
              x2="112" 
              y2="250" 
              stroke="hsl(var(--border))" 
              strokeWidth="1" 
              strokeDasharray="4,4"
            />
            {/* Front label */}
            <text x="112" y="15" textAnchor="middle" className="fill-muted-foreground text-[10px] font-medium">FRONT</text>
            {/* Rear label */}
            <text x="112" y="315" textAnchor="middle" className="fill-muted-foreground text-[10px] font-medium">REAR</text>
          </svg>

          {/* Front Left Tyre */}
          <div className="absolute left-0 top-12">
            <SingleTyre tyre={frontLeft} position="FL" side="left" />
          </div>

          {/* Front Right Tyre */}
          <div className="absolute right-0 top-12">
            <SingleTyre tyre={frontRight} position="FR" side="right" />
          </div>

          {/* Rear Left Dual Tyres (Axle 1 outer, Axle 2 inner) */}
          <div className="absolute left-0 bottom-16">
            <DualTyre 
              outerTyre={rearLeft1} 
              innerTyre={rearLeft2} 
              outerPos="RL1"
              innerPos="RL2"
              side="left"
            />
          </div>

          {/* Rear Right Dual Tyres (Axle 1 inner, Axle 2 outer) */}
          <div className="absolute right-0 bottom-16">
            <DualTyre 
              outerTyre={rearRight1} 
              innerTyre={rearRight2} 
              outerPos="RR1"
              innerPos="RR2"
              side="right"
            />
          </div>
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-3 text-[10px] mb-4">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-emerald-500" />
            <span className="text-muted-foreground">70%+</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-teal-500" />
            <span className="text-muted-foreground">50-69%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-amber-500" />
            <span className="text-muted-foreground">30-49%</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-red-500" />
            <span className="text-muted-foreground">&lt;30%</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
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
