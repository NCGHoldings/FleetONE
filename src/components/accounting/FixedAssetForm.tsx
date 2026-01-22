import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useCreateFixedAsset } from "@/hooks/useAccountingMutations";
import { useAssetCategories } from "@/hooks/useAccountingData";
import { Loader2 } from "lucide-react";

const assetSchema = z.object({
  asset_code: z.string().min(1, "Asset code is required"),
  asset_name: z.string().min(1, "Asset name is required"),
  category_id: z.string().min(1, "Category is required"),
  purchase_date: z.string().min(1, "Purchase date is required"),
  purchase_cost: z.number().min(0.01, "Cost must be greater than 0"),
  useful_life_years: z.number().min(1, "Useful life is required"),
  salvage_value: z.number().optional(),
  location: z.string().optional(),
  serial_number: z.string().optional(),
  description: z.string().optional(),
});

type AssetFormData = z.infer<typeof assetSchema>;

interface FixedAssetFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FixedAssetForm = ({ open, onOpenChange }: FixedAssetFormProps) => {
  const { data: categories } = useAssetCategories();
  const createAsset = useCreateFixedAsset();

  const form = useForm<AssetFormData>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      asset_code: `FA-${Date.now().toString().slice(-6)}`,
      asset_name: "",
      category_id: "",
      purchase_date: format(new Date(), "yyyy-MM-dd"),
      purchase_cost: 0,
      useful_life_years: 5,
      salvage_value: 0,
      location: "",
      serial_number: "",
      description: "",
    },
  });

  const onSubmit = async (data: AssetFormData) => {
    try {
      await createAsset.mutateAsync({
        asset_code: data.asset_code,
        asset_name: data.asset_name,
        category_id: data.category_id,
        purchase_date: data.purchase_date,
        purchase_cost: data.purchase_cost,
        salvage_value: data.salvage_value || 0,
        location: data.location,
        department: data.serial_number,
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      // Error handled in mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Fixed Asset</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="asset_code">Asset Code *</Label>
              <Input 
                id="asset_code" 
                {...form.register("asset_code")} 
              />
              {form.formState.errors.asset_code && (
                <p className="text-xs text-destructive">{form.formState.errors.asset_code.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="category_id">Category *</Label>
              <Select 
                value={form.watch("category_id")} 
                onValueChange={(v) => form.setValue("category_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.filter(c => c.is_active).map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.category_code} - {cat.category_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.category_id && (
                <p className="text-xs text-destructive">{form.formState.errors.category_id.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="asset_name">Asset Name *</Label>
            <Input 
              id="asset_name" 
              {...form.register("asset_name")} 
              placeholder="e.g., Toyota Hiace Bus"
            />
            {form.formState.errors.asset_name && (
              <p className="text-xs text-destructive">{form.formState.errors.asset_name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchase_date">Purchase Date *</Label>
              <Input 
                id="purchase_date" 
                type="date"
                {...form.register("purchase_date")} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchase_cost">Purchase Cost *</Label>
              <Input 
                id="purchase_cost" 
                type="number"
                step="0.01"
                {...form.register("purchase_cost", { valueAsNumber: true })} 
              />
              {form.formState.errors.purchase_cost && (
                <p className="text-xs text-destructive">{form.formState.errors.purchase_cost.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="useful_life_years">Useful Life (Years) *</Label>
              <Input 
                id="useful_life_years" 
                type="number"
                {...form.register("useful_life_years", { valueAsNumber: true })} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="salvage_value">Salvage Value</Label>
              <Input 
                id="salvage_value" 
                type="number"
                step="0.01"
                {...form.register("salvage_value", { valueAsNumber: true })} 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="serial_number">Serial Number</Label>
              <Input 
                id="serial_number" 
                {...form.register("serial_number")} 
                placeholder="VIN, S/N, etc."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input 
                id="location" 
                {...form.register("location")} 
                placeholder="Harare Depot"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description" 
              {...form.register("description")} 
              placeholder="Additional details..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createAsset.isPending}>
              {createAsset.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Asset
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
