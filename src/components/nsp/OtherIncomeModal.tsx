import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import type { OtherIncomeItem } from "@/pages/NSPDailySales";

interface OtherIncomeModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (item: OtherIncomeItem) => void;
}

export function OtherIncomeModal({ open, onClose, onAdd }: OtherIncomeModalProps) {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<number>(0);

  const handleSubmit = () => {
    if (!description.trim() || amount <= 0) {
      return;
    }

    onAdd({
      description: description.trim(),
      amount: amount,
    });

    // Reset form
    setDescription("");
    setAmount(0);
  };

  const handleClose = () => {
    setDescription("");
    setAmount(0);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Other Income</DialogTitle>
          <DialogDescription>
            Add additional income sources not covered by main categories
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Bonus Sale, Workshop Service"
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (Rs.)</Label>
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
            disabled={!description.trim() || amount <= 0}
            className="flex-1"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Income
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
