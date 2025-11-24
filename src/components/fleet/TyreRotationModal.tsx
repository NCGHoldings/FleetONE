import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BusTyre, useTyreManagement } from "@/hooks/useTyreManagement";
import { RotateCcw, ArrowRight, Sparkles, TrendingUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface TyreRotationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bus: any;
  tyres: BusTyre[];
}

interface RotationStep {
  from: string;
  to: string;
  tyreId: string;
}

export const TyreRotationModal = ({ open, onOpenChange, bus, tyres }: TyreRotationModalProps) => {
  const [rotationPlan, setRotationPlan] = useState<RotationStep[]>([]);
  const [rotationType, setRotationType] = useState<string>("");
  const { addRotation, updateTyre } = useTyreManagement();
  const { user } = useAuth();

  const suggestCrossRotation = () => {
    const plan: RotationStep[] = [];
    const frontLeft = tyres.find(t => t.position === "Front Left");
    const frontRight = tyres.find(t => t.position === "Front Right");
    const rearLeft1 = tyres.find(t => t.position === "Rear Left 1");
    const rearRight1 = tyres.find(t => t.position === "Rear Right 1");

    if (frontLeft && rearRight1) plan.push({ from: "Front Left", to: "Rear Right 1", tyreId: frontLeft.id });
    if (frontRight && rearLeft1) plan.push({ from: "Front Right", to: "Rear Left 1", tyreId: frontRight.id });
    if (rearLeft1 && frontRight) plan.push({ from: "Rear Left 1", to: "Front Right", tyreId: rearLeft1.id });
    if (rearRight1 && frontLeft) plan.push({ from: "Rear Right 1", to: "Front Left", tyreId: rearRight1.id });

    setRotationPlan(plan);
    setRotationType("cross_rotation");
  };

  const suggestFrontToRear = () => {
    const plan: RotationStep[]  = [];
    const frontLeft = tyres.find(t => t.position === "Front Left");
    const frontRight = tyres.find(t => t.position === "Front Right");
    const rearLeft1 = tyres.find(t => t.position === "Rear Left 1");
    const rearRight1 = tyres.find(t => t.position === "Rear Right 1");

    if (frontLeft && rearLeft1) plan.push({ from: "Front Left", to: "Rear Left 1", tyreId: frontLeft.id });
    if (frontRight && rearRight1) plan.push({ from: "Front Right", to: "Rear Right 1", tyreId: frontRight.id });
    if (rearLeft1 && frontLeft) plan.push({ from: "Rear Left 1", to: "Front Left", tyreId: rearLeft1.id });
    if (rearRight1 && frontRight) plan.push({ from: "Rear Right 1", to: "Front Right", tyreId: rearRight1.id });

    setRotationPlan(plan);
    setRotationType("front_to_rear");
  };

  const executeRotation = async () => {
    if (!user || rotationPlan.length === 0) return;

    try {
      // Record rotation in history
      const rotationData = {
        bus_id: bus.id,
        rotation_date: new Date().toISOString(),
        performed_by: user.id,
        rotation_type: rotationType,
        tyres_moved: rotationPlan,
        km_at_rotation: bus.current_mileage || 0,
        notes: `${rotationType.replace('_', ' ').toUpperCase()} pattern executed`,
      };

      await addRotation(rotationData);

      // Update each tyre position
      for (const step of rotationPlan) {
        await updateTyre({
          id: step.tyreId,
          updates: {
            position: step.to,
            last_rotation_date: new Date().toISOString(),
          },
        });
      }

      toast.success("Tyre rotation executed successfully!");
      onOpenChange(false);
    } catch (error) {
      console.error("Error executing rotation:", error);
      toast.error("Failed to execute rotation");
    }
  };

  const estimatedLifespanGain = 2500; // Estimated additional km from proper rotation

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <RotateCcw className="w-6 h-6 text-primary" />
            Tyre Rotation Planner - {bus.bus_no}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Plan and execute tyre rotation to maximize lifespan and even wear
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Benefits Card */}
          <Card className="p-4 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-emerald-500/20">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-emerald-500 mt-0.5" />
              <div>
                <h4 className="font-semibold text-emerald-700 dark:text-emerald-400">
                  Expected Benefits
                </h4>
                <p className="text-sm text-muted-foreground mt-1">
                  • Extend tyre life by ~{estimatedLifespanGain.toLocaleString()} km
                </p>
                <p className="text-sm text-muted-foreground">
                  • Even wear distribution across all tyres
                </p>
                <p className="text-sm text-muted-foreground">
                  • Improved handling and fuel efficiency
                </p>
              </div>
            </div>
          </Card>

          {/* Rotation Pattern Buttons */}
          <div className="space-y-3">
            <h3 className="font-semibold">Select Rotation Pattern:</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button 
                onClick={suggestCrossRotation} 
                variant="outline"
                className="h-auto py-4 flex-col items-start"
              >
                <RotateCcw className="w-5 h-5 mb-2 text-primary" />
                <span className="font-semibold">Cross Rotation</span>
                <span className="text-xs text-muted-foreground mt-1">
                  FL→RR, FR→RL (Best for even wear)
                </span>
              </Button>
              <Button 
                onClick={suggestFrontToRear} 
                variant="outline"
                className="h-auto py-4 flex-col items-start"
              >
                <TrendingUp className="w-5 h-5 mb-2 text-primary" />
                <span className="font-semibold">Front to Rear</span>
                <span className="text-xs text-muted-foreground mt-1">
                  FL→RL, FR→RR (Simple pattern)
                </span>
              </Button>
              <Button 
                variant="outline"
                className="h-auto py-4 flex-col items-start"
                disabled
              >
                <span className="font-semibold">Custom Pattern</span>
                <span className="text-xs text-muted-foreground mt-1">
                  Coming soon
                </span>
              </Button>
            </div>
          </div>

          {/* Rotation Plan Display */}
          {rotationPlan.length > 0 && (
            <Card className="p-6 bg-muted/30">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Badge className="bg-gradient-to-r from-primary to-purple-600">
                  {rotationType.replace('_', ' ').toUpperCase()}
                </Badge>
                Rotation Plan
              </h4>
              <div className="space-y-3">
                {rotationPlan.map((step, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-4 bg-background rounded-lg border">
                    <Badge variant="outline" className="min-w-[100px] justify-center">
                      {step.from}
                    </Badge>
                    <ArrowRight className="w-6 h-6 text-primary flex-shrink-0" />
                    <Badge variant="outline" className="min-w-[100px] justify-center">
                      {step.to}
                    </Badge>
                    <span className="text-xs text-muted-foreground ml-auto">
                      Step {idx + 1}
                    </span>
                  </div>
                ))}
              </div>
              <Button 
                className="w-full mt-6 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                onClick={executeRotation}
                size="lg"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                Execute Rotation Plan
              </Button>
            </Card>
          )}

          {rotationPlan.length === 0 && (
            <Card className="p-8 text-center bg-muted/20">
              <RotateCcw className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground">
                Select a rotation pattern above to see the plan
              </p>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};