import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ArrowRight, MapPin, Building2, User, Search } from "lucide-react";
import { useFixedAssets, useAssetTransfers } from "@/hooks/useAccountingData";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { DateDisplay } from "./shared/DateDisplay";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export const AssetTransferForm = () => {
  const { data: assets, isLoading: assetsLoading } = useFixedAssets();
  const { data: transfers, isLoading: transfersLoading, refetch } = useAssetTransfers();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [formData, setFormData] = useState({
    transfer_date: format(new Date(), "yyyy-MM-dd"),
    to_location: "",
    to_department: "",
    to_custodian: "",
    reason: "",
  });

  const selectedAsset = assets?.find(a => a.id === selectedAssetId);

  const filteredTransfers = transfers?.filter(t =>
    t.fixed_assets?.asset_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.fixed_assets?.asset_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.to_location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId || !selectedAsset) {
      toast.error("Please select an asset");
      return;
    }

    try {
      const { error } = await supabase.from("asset_transfers").insert({
        asset_id: selectedAssetId,
        transfer_date: formData.transfer_date,
        from_location: selectedAsset.location,
        from_department: selectedAsset.department,
        from_custodian: selectedAsset.custodian,
        to_location: formData.to_location,
        to_department: formData.to_department,
        to_custodian: formData.to_custodian,
        reason: formData.reason,
      });

      if (error) throw error;

      // Update the asset with new location/department/custodian
      await supabase
        .from("fixed_assets")
        .update({
          location: formData.to_location || selectedAsset.location,
          department: formData.to_department || selectedAsset.department,
          custodian: formData.to_custodian || selectedAsset.custodian,
        })
        .eq("id", selectedAssetId);

      toast.success("Asset transfer recorded successfully");
      setIsDialogOpen(false);
      setSelectedAssetId("");
      setFormData({
        transfer_date: format(new Date(), "yyyy-MM-dd"),
        to_location: "",
        to_department: "",
        to_custodian: "",
        reason: "",
      });
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to record transfer");
    }
  };

  const activeAssets = assets?.filter(a => a.status === "active");
  const isLoading = assetsLoading || transfersLoading;

  if (isLoading) {
    return <div className="flex items-center justify-center h-32"><p className="text-muted-foreground">Loading...</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Asset Transfers</h2>
          <p className="text-sm text-muted-foreground">Transfer assets between locations, departments, or custodians</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />New Transfer</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Transfer Asset</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Asset *</Label>
                <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
                  <SelectTrigger><SelectValue placeholder="Select asset to transfer" /></SelectTrigger>
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
                  <h4 className="font-medium mb-3">Current Assignment</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground text-xs">Location</p>
                        <p className="font-medium">{selectedAsset.location || "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground text-xs">Department</p>
                        <p className="font-medium">{selectedAsset.department || "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-muted-foreground text-xs">Custodian</p>
                        <p className="font-medium">{selectedAsset.custodian || "—"}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              <div className="flex items-center justify-center py-2">
                <ArrowRight className="h-6 w-6 text-primary" />
              </div>

              <Card className="p-4 border-primary/50">
                <h4 className="font-medium mb-3">Transfer To</h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Transfer Date *</Label>
                    <Input type="date" value={formData.transfer_date} onChange={e => setFormData(prev => ({ ...prev, transfer_date: e.target.value }))} required />
                  </div>
                  <div className="space-y-2">
                    <Label>New Location</Label>
                    <Input placeholder="e.g., Head Office, Branch A" value={formData.to_location} onChange={e => setFormData(prev => ({ ...prev, to_location: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>New Department</Label>
                    <Input placeholder="e.g., Finance, IT, Operations" value={formData.to_department} onChange={e => setFormData(prev => ({ ...prev, to_department: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>New Custodian</Label>
                    <Input placeholder="Name of person responsible" value={formData.to_custodian} onChange={e => setFormData(prev => ({ ...prev, to_custodian: e.target.value }))} />
                  </div>
                </div>
              </Card>

              <div className="space-y-2">
                <Label>Reason for Transfer</Label>
                <Textarea placeholder="Explain the reason for this transfer..." value={formData.reason} onChange={e => setFormData(prev => ({ ...prev, reason: e.target.value }))} />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={!selectedAssetId}>Record Transfer</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search transfers..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

      {/* Transfers Table */}
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 font-semibold">Asset</th>
                <th className="text-left py-3 px-2 font-semibold">Date</th>
                <th className="text-left py-3 px-2 font-semibold">From</th>
                <th className="text-left py-3 px-2 font-semibold">To</th>
                <th className="text-left py-3 px-2 font-semibold">Reason</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransfers?.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No transfers recorded</td></tr>
              ) : (
                filteredTransfers?.map(t => (
                  <tr key={t.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-2">
                      <div>
                        <p className="font-medium">{t.fixed_assets?.asset_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{t.fixed_assets?.asset_code}</p>
                      </div>
                    </td>
                    <td className="py-3 px-2"><DateDisplay date={t.transfer_date} /></td>
                    <td className="py-3 px-2">
                      <div className="space-y-1">
                        {t.from_location && <Badge variant="outline" className="mr-1"><MapPin className="h-3 w-3 mr-1" />{t.from_location}</Badge>}
                        {t.from_department && <Badge variant="outline" className="mr-1"><Building2 className="h-3 w-3 mr-1" />{t.from_department}</Badge>}
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <div className="space-y-1">
                        {t.to_location && <Badge className="bg-primary/10 text-primary mr-1"><MapPin className="h-3 w-3 mr-1" />{t.to_location}</Badge>}
                        {t.to_department && <Badge className="bg-primary/10 text-primary mr-1"><Building2 className="h-3 w-3 mr-1" />{t.to_department}</Badge>}
                      </div>
                    </td>
                    <td className="py-3 px-2 max-w-xs truncate">{t.reason || "—"}</td>
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
