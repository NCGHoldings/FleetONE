import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, RefreshCw, TrendingUp, TrendingDown, Search } from "lucide-react";
import { useFixedAssets, useAssetRevaluations } from "@/hooks/useAccountingData";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { DateDisplay } from "./shared/DateDisplay";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export const AssetRevaluationForm = () => {
  const { data: assets, isLoading: assetsLoading } = useFixedAssets();
  const { data: revaluations, isLoading: revaluationsLoading, refetch } = useAssetRevaluations();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [formData, setFormData] = useState({
    revaluation_date: format(new Date(), "yyyy-MM-dd"),
    new_value: "",
    reason: "",
  });

  const selectedAsset = assets?.find(a => a.id === selectedAssetId);
  const currentValue = selectedAsset?.current_value || selectedAsset?.purchase_cost || 0;
  const newValue = parseFloat(formData.new_value) || 0;
  const revaluationSurplus = newValue - currentValue;

  const filteredRevaluations = revaluations?.filter(r =>
    r.fixed_assets?.asset_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.fixed_assets?.asset_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAssetSelect = (assetId: string) => {
    setSelectedAssetId(assetId);
    const asset = assets?.find(a => a.id === assetId);
    if (asset) {
      setFormData(prev => ({
        ...prev,
        new_value: (asset.current_value || asset.purchase_cost || 0).toString(),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId) {
      toast.error("Please select an asset");
      return;
    }

    try {
      const { error } = await supabase.from("asset_revaluations").insert({
        asset_id: selectedAssetId,
        revaluation_date: formData.revaluation_date,
        old_value: currentValue,
        new_value: newValue,
        revaluation_surplus: revaluationSurplus,
        reason: formData.reason,
      });

      if (error) throw error;

      // Update the asset's current value
      await supabase
        .from("fixed_assets")
        .update({ current_value: newValue })
        .eq("id", selectedAssetId);

      // ========== REVALUATION GL POSTING ==========
      if (selectedAsset && revaluationSurplus !== 0) {
        // Fetch category GL accounts
        const { data: category } = await supabase
          .from("asset_categories")
          .select("asset_account_id, revaluation_surplus_account_id")
          .eq("id", selectedAsset.category_id)
          .single();

        if (category?.asset_account_id && category?.revaluation_surplus_account_id) {
          const { createAndPostJournalEntry } = await import("@/lib/gl-posting-utils");
          
          const absAmount = Math.abs(revaluationSurplus);
          const lines = revaluationSurplus > 0
            ? [
                { account_id: category.asset_account_id, description: `Revaluation Increase - ${selectedAsset.asset_name}`, debit: absAmount, credit: 0 },
                { account_id: category.revaluation_surplus_account_id, description: `Revaluation Surplus - ${selectedAsset.asset_name}`, debit: 0, credit: absAmount },
              ]
            : [
                { account_id: category.revaluation_surplus_account_id, description: `Revaluation Deficit - ${selectedAsset.asset_name}`, debit: absAmount, credit: 0 },
                { account_id: category.asset_account_id, description: `Revaluation Decrease - ${selectedAsset.asset_name}`, debit: 0, credit: absAmount },
              ];

          // Get company_id from the asset
          const companyId = (selectedAsset as any).company_id;
          if (companyId) {
            const glResult = await createAndPostJournalEntry({
              entry_date: formData.revaluation_date,
              description: `Asset Revaluation: ${selectedAsset.asset_name} (${selectedAsset.asset_code})`,
              reference: `RVL-${selectedAsset.asset_code}`,
              company_id: companyId,
              lines,
            });

            if (!glResult.success) {
              console.warn("Revaluation GL posting failed:", glResult.error);
              toast.warning("Revaluation recorded but GL posting failed: " + glResult.error);
            }
          }
        } else {
          toast.warning("Revaluation recorded — GL accounts not configured on category.");
        }
      }

      toast.success("Asset revaluation recorded successfully");
      setIsDialogOpen(false);
      setSelectedAssetId("");
      setFormData({
        revaluation_date: format(new Date(), "yyyy-MM-dd"),
        new_value: "",
        reason: "",
      });
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to record revaluation");
    }
  };

  const activeAssets = assets?.filter(a => a.status === "active");
  const isLoading = assetsLoading || revaluationsLoading;

  if (isLoading) {
    return <div className="flex items-center justify-center h-32"><p className="text-muted-foreground">Loading...</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Asset Revaluations</h2>
          <p className="text-sm text-muted-foreground">Record and track fixed asset value adjustments</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />New Revaluation</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Record Asset Revaluation</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Asset *</Label>
                <Select value={selectedAssetId} onValueChange={handleAssetSelect}>
                  <SelectTrigger><SelectValue placeholder="Select asset" /></SelectTrigger>
                  <SelectContent>
                    {activeAssets?.map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.asset_code} - {a.asset_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedAsset && (
                <Card className="p-4 bg-muted/50">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Current Book Value</p>
                      <p className="font-semibold"><CurrencyDisplay amount={currentValue} /></p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Purchase Cost</p>
                      <p className="font-semibold"><CurrencyDisplay amount={selectedAsset.purchase_cost || 0} /></p>
                    </div>
                  </div>
                </Card>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Revaluation Date *</Label>
                  <Input type="date" value={formData.revaluation_date} onChange={e => setFormData(prev => ({ ...prev, revaluation_date: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>New Value *</Label>
                  <Input type="number" step="0.01" placeholder="0.00" value={formData.new_value} onChange={e => setFormData(prev => ({ ...prev, new_value: e.target.value }))} required />
                </div>
              </div>

              {selectedAssetId && newValue > 0 && (
                <Card className={`p-4 ${revaluationSurplus >= 0 ? "bg-green-50 dark:bg-green-950/20" : "bg-red-50 dark:bg-red-950/20"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {revaluationSurplus >= 0 ? (
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-red-600" />
                      )}
                      <span className="font-medium">
                        {revaluationSurplus >= 0 ? "Revaluation Surplus" : "Revaluation Deficit"}
                      </span>
                    </div>
                    <span className={`text-xl font-bold ${revaluationSurplus >= 0 ? "text-green-600" : "text-red-600"}`}>
                      <CurrencyDisplay amount={Math.abs(revaluationSurplus)} />
                    </span>
                  </div>
                </Card>
              )}

              <div className="space-y-2">
                <Label>Reason for Revaluation</Label>
                <Textarea placeholder="Explain the reason for this revaluation..." value={formData.reason} onChange={e => setFormData(prev => ({ ...prev, reason: e.target.value }))} />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={!selectedAssetId}>Record Revaluation</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search revaluations..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {/* Revaluations Table */}
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 font-semibold">Asset</th>
                <th className="text-left py-3 px-2 font-semibold">Date</th>
                <th className="text-right py-3 px-2 font-semibold">Old Value</th>
                <th className="text-right py-3 px-2 font-semibold">New Value</th>
                <th className="text-right py-3 px-2 font-semibold">Surplus/Deficit</th>
                <th className="text-left py-3 px-2 font-semibold">Reason</th>
              </tr>
            </thead>
            <tbody>
              {filteredRevaluations?.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No revaluations recorded</td></tr>
              ) : (
                filteredRevaluations?.map(r => (
                  <tr key={r.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{r.fixed_assets?.asset_name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{r.fixed_assets?.asset_code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2"><DateDisplay date={r.revaluation_date} /></td>
                    <td className="py-3 px-2 text-right"><CurrencyDisplay amount={r.old_value} /></td>
                    <td className="py-3 px-2 text-right font-semibold"><CurrencyDisplay amount={r.new_value} /></td>
                    <td className="py-3 px-2 text-right">
                      <Badge className={r.revaluation_surplus && r.revaluation_surplus >= 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                        {r.revaluation_surplus && r.revaluation_surplus >= 0 ? "+" : ""}
                        <CurrencyDisplay amount={r.revaluation_surplus || 0} />
                      </Badge>
                    </td>
                    <td className="py-3 px-2 max-w-xs truncate">{r.reason || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
