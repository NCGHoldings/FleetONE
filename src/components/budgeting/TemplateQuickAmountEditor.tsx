import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, DollarSign } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface TemplateQuickAmountEditorProps {
  open: boolean;
  onClose: () => void;
  onApply: (distribution: 'equal' | 'weighted', baseAmount: number) => void;
}

export function TemplateQuickAmountEditor({ open, onClose, onApply }: TemplateQuickAmountEditorProps) {
  const [baseAmount, setBaseAmount] = useState<string>("50000");
  const [distribution, setDistribution] = useState<'equal' | 'weighted'>('equal');

  const handleApply = () => {
    const amount = parseFloat(baseAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    onApply(distribution, amount);
    onClose();
    toast.success("Default amounts applied successfully");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Quick Amount Entry
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Base Amount (LKR)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                value={baseAmount}
                onChange={(e) => setBaseAmount(e.target.value)}
                className="pl-9"
                placeholder="Enter base amount"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              This will be used as a starting point for all line items
            </p>
          </div>

          <div>
            <Label>Distribution Method</Label>
            <Select value={distribution} onValueChange={(value: any) => setDistribution(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="equal">
                  <div>
                    <div className="font-medium">Equal Distribution</div>
                    <div className="text-xs text-muted-foreground">Same amount for all items</div>
                  </div>
                </SelectItem>
                <SelectItem value="weighted">
                  <div>
                    <div className="font-medium">Weighted Distribution</div>
                    <div className="text-xs text-muted-foreground">
                      Based on category importance (Revenue: 2x, Fixed: 1.5x, Operating: 1x)
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-900 mb-1">Preview</h4>
            <div className="text-xs text-blue-700 space-y-1">
              {distribution === 'equal' ? (
                <p>Each line item will receive: <span className="font-bold">LKR {parseFloat(baseAmount || "0").toLocaleString()}</span></p>
              ) : (
                <>
                  <p>• Revenue items: <span className="font-bold">LKR {(parseFloat(baseAmount || "0") * 2).toLocaleString()}</span></p>
                  <p>• Fixed Expenses: <span className="font-bold">LKR {(parseFloat(baseAmount || "0") * 1.5).toLocaleString()}</span></p>
                  <p>• Operating Expenses: <span className="font-bold">LKR {parseFloat(baseAmount || "0").toLocaleString()}</span></p>
                </>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleApply}>
            Apply to Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
