import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, ArrowRight } from "lucide-react";
import { useState } from "react";
import { BusTyre } from "@/hooks/useTyreManagement";

interface TyreRotationPlannerProps {
  busId: string;
  busNumber: string;
  tyres: BusTyre[];
}

export const TyreRotationPlanner = ({ busId, busNumber, tyres }: TyreRotationPlannerProps) => {
  const [rotationPlan, setRotationPlan] = useState<Array<{ from: string; to: string }>>([]);

  const suggestCrossRotation = () => {
    // Cross-rotation pattern: FL->RR, FR->RL, RL->FR, RR->FL
    setRotationPlan([
      { from: "Front Left", to: "Rear Right 1" },
      { from: "Front Right", to: "Rear Left 1" },
      { from: "Rear Left 1", to: "Front Right" },
      { from: "Rear Right 1", to: "Front Left" },
    ]);
  };

  const suggestFrontToRear = () => {
    // Simple front-to-rear: FL->RL, FR->RR, RL->FL, RR->FR
    setRotationPlan([
      { from: "Front Left", to: "Rear Left 1" },
      { from: "Front Right", to: "Rear Right 1" },
      { from: "Rear Left 1", to: "Front Left" },
      { from: "Rear Right 1", to: "Front Right" },
    ]);
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold">Rotation Planner - {busNumber}</h3>
        <Badge className="bg-gradient-to-r from-primary to-purple-600">
          <RotateCcw className="w-4 h-4 mr-1" />
          Optimize Tyre Life
        </Badge>
      </div>

      <div className="space-y-4">
        <div className="flex gap-3">
          <Button onClick={suggestCrossRotation} variant="outline">
            Cross Rotation
          </Button>
          <Button onClick={suggestFrontToRear} variant="outline">
            Front to Rear
          </Button>
          <Button variant="outline">Custom Pattern</Button>
        </div>

        {rotationPlan.length > 0 && (
          <div className="mt-6 space-y-3">
            <h4 className="font-semibold">Rotation Plan:</h4>
            {rotationPlan.map((step, idx) => (
              <div key={idx} className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                <Badge variant="outline">{step.from}</Badge>
                <ArrowRight className="w-5 h-5 text-primary" />
                <Badge variant="outline">{step.to}</Badge>
              </div>
            ))}
            <Button className="w-full bg-gradient-to-r from-primary to-purple-600 mt-4">
              Execute Rotation
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
