import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Calculator } from "lucide-react";

export interface TyreEntry {
  type: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

interface TyreSaleModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (item: TyreEntry) => void;
}

export function TyreSaleModal({ open, onClose, onAdd }: TyreSaleModalProps) {
  const [type, setType] = useState("");
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<number>(0);

  // Auto-calculate total
  const calculatedTotal = quantity * unitPrice;

  const handleSubmit = () => {
    if (!type.trim() || quantity < 1 || unitPrice <= 0) {
      return;
    }

    onAdd({
      type: type.trim(),
      quantity: quantity,
      unitPrice: unitPrice,
      amount: calculatedTotal,
    });

    // Reset form
    setType("");
    setQuantity(1);
    setUnitPrice(0);
  };

  const handleClose = () => {
    setType("");
    setQuantity(1);
    setUnitPrice(0);
    onClose();
  };

  const isValid = type.trim() && quantity >= 1 && unitPrice > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Tyre Sale</DialogTitle>
          <DialogDescription>
            Enter tyre details - total will be calculated automatically
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="type">Tyre Type / Brand *</Label>
            <Input
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="e.g., Jiashun, Bridgestone, Michelin"
              className="h-12"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                placeholder="1"
                className="h-12 text-lg"
                min="1"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unitPrice">Unit Price (Rs.) *</Label>
              <Input
                id="unitPrice"
                type="number"
                value={unitPrice || ""}
                onChange={(e) => setUnitPrice(Number(e.target.value))}
                placeholder="0"
                className="h-12 text-lg"
                min="0"
              />
            </div>
          </div>

          {/* Auto-calculated Total Display */}
          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-2 border-green-500/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Total Sale Amount
              </span>
            </div>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              Rs. {calculatedTotal.toLocaleString()}
            </p>
            {quantity > 0 && unitPrice > 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                ({quantity} × Rs. {unitPrice.toLocaleString()})
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid}
            className="flex-1"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Tyre
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
