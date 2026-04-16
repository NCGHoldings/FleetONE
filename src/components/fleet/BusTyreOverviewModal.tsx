import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BusTyre } from "@/hooks/useTyreManagement";
import { Eye, RotateCcw, AlertTriangle, Trash2 } from "lucide-react";
import { formatDateDisplay } from "@/lib/utils";

interface BusTyreOverviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bus: any;
  tyres: BusTyre[];
  onViewTyreDetails: (tyreId: string) => void;
  onRotate: () => void;
}

export const BusTyreOverviewModal = ({ 
  open, 
  onOpenChange, 
  bus, 
  tyres,
  onViewTyreDetails,
  onRotate
}: BusTyreOverviewModalProps) => {
  const getConditionBadge = (percentage: number) => {
    if (percentage >= 70) return <Badge className="bg-emerald-500">Excellent</Badge>;
    if (percentage >= 50) return <Badge className="bg-teal-500">Good</Badge>;
    if (percentage >= 30) return <Badge className="bg-amber-500">Fair</Badge>;
    if (percentage >= 10) return <Badge className="bg-orange-500">Poor</Badge>;
    return <Badge className="bg-red-500">Critical</Badge>;
  };

  const avgCondition = tyres.length > 0 
    ? tyres.reduce((sum, t) => sum + t.condition_percentage, 0) / tyres.length 
    : 0;
    
  const needsAttention = tyres.filter(t => t.condition_percentage < 30).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center justify-between">
            <span>Complete Tyre Overview - {bus.bus_no}</span>
            {needsAttention > 0 && (
              <Badge className="bg-red-500 animate-pulse">
                <AlertTriangle className="w-4 h-4 mr-1" />
                {needsAttention} Need Attention
              </Badge>
            )}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {bus.model} • {bus.type} • Average Condition: {avgCondition.toFixed(0)}%
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="p-4 border-l-4 border-l-primary">
              <p className="text-sm text-muted-foreground">Total Tyres</p>
              <p className="text-2xl font-bold">{tyres.length}</p>
            </Card>
            <Card className="p-4 border-l-4 border-l-emerald-500">
              <p className="text-sm text-muted-foreground">Good Condition</p>
              <p className="text-2xl font-bold text-emerald-500">
                {tyres.filter(t => t.condition_percentage >= 70).length}
              </p>
            </Card>
            <Card className="p-4 border-l-4 border-l-amber-500">
              <p className="text-sm text-muted-foreground">Fair Condition</p>
              <p className="text-2xl font-bold text-amber-500">
                {tyres.filter(t => t.condition_percentage >= 30 && t.condition_percentage < 70).length}
              </p>
            </Card>
            <Card className="p-4 border-l-4 border-l-red-500">
              <p className="text-sm text-muted-foreground">Critical</p>
              <p className="text-2xl font-bold text-red-500">
                {tyres.filter(t => t.condition_percentage < 30).length}
              </p>
            </Card>
          </div>

          {/* Detailed Table */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Detailed Tyre Information</h3>
              <Button onClick={onRotate} variant="outline" size="sm">
                <RotateCcw className="w-4 h-4 mr-2" />
                Plan Rotation
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Position</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Serial No.</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Tread Depth</TableHead>
                  <TableHead>KM Driven</TableHead>
                  <TableHead>Installed</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tyres.map((tyre) => {
                  const kmDriven = tyre.current_km - tyre.km_at_installation;
                  return (
                    <TableRow key={tyre.id}>
                      <TableCell className="font-medium">{tyre.position}</TableCell>
                      <TableCell>{tyre.tyre_brand}</TableCell>
                      <TableCell>{tyre.tyre_size}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {tyre.tyre_serial_number || "N/A"}
                      </TableCell>
                      <TableCell>{getConditionBadge(tyre.condition_percentage)}</TableCell>
                      <TableCell>
                        <span className={tyre.condition_percentage < 30 ? "text-red-500 font-bold" : ""}>
                          {tyre.current_tread_depth_mm}mm
                        </span>
                        <span className="text-xs text-muted-foreground"> / {tyre.original_tread_depth_mm}mm</span>
                      </TableCell>
                      <TableCell>{kmDriven.toLocaleString()} km</TableCell>
                      <TableCell className="text-sm">
                        {formatDateDisplay(tyre.installation_date)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewTyreDetails(tyre.id)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" className="w-full">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Mark Critical
            </Button>
            <Button variant="outline" className="w-full">
              <RotateCcw className="w-4 h-4 mr-2" />
              Schedule Rotation
            </Button>
            <Button variant="outline" className="w-full">
              Record Inspection
            </Button>
            <Button variant="outline" className="w-full text-red-500">
              <Trash2 className="w-4 h-4 mr-2" />
              Remove Tyre
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};