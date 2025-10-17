import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

export interface TyreEntry {
  type: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface TyreSaleModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (item: TyreEntry) => void;
}

export function TyreSaleModal({ open, onClose, onAdd }: TyreSaleModalProps) {
  const [type, setType] = useState("");
  const [quantity, setQuantity] = useState<number>(0);
  const [unitPrice, setUnitPrice] = useState<number>(0);

  const calculateTotal = () => quantity * unitPrice;

  const handleSubmit = () => {
    if (!type.trim() || quantity <= 0 || unitPrice <= 0) {
      return;
    }

    onAdd({
      type: type.trim(),
      quantity: quantity,
      unitPrice: unitPrice,
      total: calculateTotal(),
    });

    // Reset form
    setType("");
    setQuantity(0);
    setUnitPrice(0);
  };

  const handleClose = () => {
    setType("");
    setQuantity(0);
    setUnitPrice(0);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Tyre Sale</DialogTitle>
          <DialogDescription>
            Add tyre type, quantity and unit price
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="type">Tyre Type</Label>
            <Input
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="e.g., Jiashun, Bridgestone"
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              placeholder="0"
              className="h-12"
              min="0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="unitPrice">Unit Price (Rs.)</Label>
            <Input
              id="unitPrice"
              type="number"
              value={unitPrice}
              onChange={(e) => setUnitPrice(Number(e.target.value))}
              placeholder="0"
              className="h-12"
              min="0"
            />
          </div>

          {quantity > 0 && unitPrice > 0 && (
            <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200">
              <div className="text-sm text-muted-foreground">Total Amount</div>
              <div className="text-lg font-bold text-green-600">
                Rs. {calculateTotal().toLocaleString()}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!type.trim() || quantity <= 0 || unitPrice <= 0}
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
