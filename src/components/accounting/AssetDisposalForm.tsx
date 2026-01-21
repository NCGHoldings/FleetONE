import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, TrendingUp, TrendingDown } from "lucide-react";
import { useFixedAssets, useAssetDisposals } from "@/hooks/useAccountingData";
import { useCreateAssetDisposal } from "@/hooks/useAccountingMutations";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { format } from "date-fns";

const DISPOSAL_TYPES = [
  { value: "sale", label: "Sale" },
  { value: "scrap", label: "Scrap / Write-off" },
  { value: "donation", label: "Donation" },
  { value: "trade_in", label: "Trade-in" },
  { value: "theft", label: "Theft / Loss" },
];

export const AssetDisposalForm = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assetId, setAssetId] = useState("");
  const [disposalType, setDisposalType] = useState("");
  const [disposalDate, setDisposalDate] = useState(new Date().toISOString().split("T")[0]);
  const [disposalValue, setDisposalValue] = useState("");
  const [reason, setReason] = useState("");

  const { data: assets = [] } = useFixedAssets();
  const { data: disposals = [] } = useAssetDisposals();
  const createDisposal = useCreateAssetDisposal();

  const activeAssets = assets.filter((a: any) => a.status === "active");
  const selectedAsset = assets.find((a: any) => a.id === assetId);

  const handleSubmit = async () => {
    if (!assetId || !disposalType || !disposalDate) return;

    await createDisposal.mutateAsync({
      asset_id: assetId,
      disposal_date: disposalDate,
      disposal_type: disposalType,
      disposal_value: disposalValue ? parseFloat(disposalValue) : undefined,
      reason,
    });

    setDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setAssetId("");
    setDisposalType("");
    setDisposalDate(new Date().toISOString().split("T")[0]);
    setDisposalValue("");
    setReason("");
  };

  const calculateGainLoss = () => {
    if (!selectedAsset || !disposalValue) return null;
    const nbv = selectedAsset.current_value || 0;
    const proceeds = parseFloat(disposalValue) || 0;
    return proceeds - nbv;
  };

  const gainLoss = calculateGainLoss();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Asset Disposals</h2>
          <p className="text-muted-foreground">Record asset sales, write-offs, and disposals</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Disposal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Record Asset Disposal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Asset</Label>
                <Select value={assetId} onValueChange={setAssetId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select asset to dispose" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeAssets.map((asset: any) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.asset_code} - {asset.asset_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedAsset && (
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Purchase Cost</p>
                        <p className="font-semibold">
                          <CurrencyDisplay amount={selectedAsset.purchase_cost || 0} />
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Accumulated Depreciation</p>
                        <p className="font-semibold">
                          <CurrencyDisplay amount={selectedAsset.accumulated_depreciation || 0} />
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-muted-foreground">Net Book Value</p>
                        <p className="font-bold text-lg">
                          <CurrencyDisplay amount={selectedAsset.current_value || 0} />
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-2">
                <Label>Disposal Type</Label>
                <Select value={disposalType} onValueChange={setDisposalType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {DISPOSAL_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Disposal Date</Label>
                <Input
                  type="date"
                  value={disposalDate}
                  onChange={(e) => setDisposalDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Sale Proceeds / Value Received</Label>
                <Input
                  type="number"
                  value={disposalValue}
                  onChange={(e) => setDisposalValue(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>

              {gainLoss !== null && (
                <div className={`p-3 rounded-lg ${gainLoss >= 0 ? "bg-green-100" : "bg-red-100"}`}>
                  <div className="flex items-center gap-2">
                    {gainLoss >= 0 ? (
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {gainLoss >= 0 ? "Gain on Disposal" : "Loss on Disposal"}
                      </p>
                      <p className={`text-lg font-bold ${gainLoss >= 0 ? "text-green-600" : "text-red-600"}`}>
                        <CurrencyDisplay amount={Math.abs(gainLoss)} />
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Reason / Notes</Label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for disposal..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!assetId || !disposalType || createDisposal.isPending}
                  variant="destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Record Disposal
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Disposal History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">NBV</TableHead>
                <TableHead className="text-right">Proceeds</TableHead>
                <TableHead className="text-right">Gain/Loss</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {disposals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No asset disposals recorded
                  </TableCell>
                </TableRow>
              ) : (
                disposals.map((disposal: any) => (
                  <TableRow key={disposal.id}>
                    <TableCell>{format(new Date(disposal.disposal_date), "MMM dd, yyyy")}</TableCell>
                    <TableCell className="font-medium">
                      {disposal.fixed_assets?.asset_code} - {disposal.fixed_assets?.asset_name}
                    </TableCell>
                    <TableCell className="capitalize">{disposal.disposal_type?.replace("_", " ")}</TableCell>
                    <TableCell className="text-right font-mono">
                      <CurrencyDisplay amount={disposal.net_book_value || 0} />
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      <CurrencyDisplay amount={disposal.disposal_value || 0} />
                    </TableCell>
                    <TableCell className={`text-right font-mono ${disposal.gain_loss >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {disposal.gain_loss >= 0 ? "+" : ""}
                      <CurrencyDisplay amount={disposal.gain_loss || 0} />
                    </TableCell>
                    <TableCell>
                      <Badge variant={disposal.approval_status === "approved" ? "default" : "secondary"}>
                        {disposal.approval_status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};