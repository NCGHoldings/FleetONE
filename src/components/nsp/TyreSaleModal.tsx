import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

export interface TyreEntry {
  type: string;
  quantity?: string;
  amount: number;
}

interface TyreSaleModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (item: TyreEntry) => void;
}

export function TyreSaleModal({ open, onClose, onAdd }: TyreSaleModalProps) {
  const [type, setType] = useState("");
  const [quantity, setQuantity] = useState("");
  const [amount, setAmount] = useState<number>(0);

  const handleSubmit = () => {
    if (!type.trim() || amount <= 0) {
      return;
    }

    onAdd({
      type: type.trim(),
      quantity: quantity.trim() || undefined,
      amount: amount,
    });

    // Reset form
    setType("");
    setQuantity("");
    setAmount(0);
  };

  const handleClose = () => {
    setType("");
    setQuantity("");
    setAmount(0);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Tyre Sale</DialogTitle>
          <DialogDescription>
            Add tyre type and total sale amount
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
            <Label htmlFor="quantity">Quantity (Optional - for reference only)</Label>
            <Input
              id="quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g., 6 tyres"
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Total Sale Amount (Rs.)</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="0"
              className="h-12 text-lg"
              min="0"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!type.trim() || amount <= 0}
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
