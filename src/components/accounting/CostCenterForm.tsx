import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useCreateCostCenter } from "@/hooks/useAccountingMutations";
import { useCostCenters } from "@/hooks/useAccountingData";
import { Loader2 } from "lucide-react";

const costCenterSchema = z.object({
  cost_center_code: z.string().min(1, "Code is required"),
  cost_center_name: z.string().min(1, "Name is required"),
  cost_center_type: z.string().optional(),
  parent_id: z.string().optional(),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
});

type CostCenterFormData = z.infer<typeof costCenterSchema>;

interface CostCenterFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CostCenterForm = ({ open, onOpenChange }: CostCenterFormProps) => {
  const { data: costCenters } = useCostCenters();
  const createCostCenter = useCreateCostCenter();

  const form = useForm<CostCenterFormData>({
    resolver: zodResolver(costCenterSchema),
    defaultValues: {
      cost_center_code: "",
      cost_center_name: "",
      cost_center_type: "cost_center",
      description: "",
      is_active: true,
    },
  });

  const onSubmit = async (data: CostCenterFormData) => {
    try {
      await createCostCenter.mutateAsync({
        cost_center_code: data.cost_center_code,
        cost_center_name: data.cost_center_name,
        cost_center_type: data.cost_center_type || "cost_center",
        parent_id: data.parent_id,
        description: data.description,
        is_active: data.is_active ?? true,
      });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      // Error handled in mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Cost Center</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost_center_code">Code *</Label>
              <Input 
                id="cost_center_code" 
                {...form.register("cost_center_code")} 
                placeholder="CC-001"
              />
              {form.formState.errors.cost_center_code && (
                <p className="text-xs text-destructive">{form.formState.errors.cost_center_code.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost_center_type">Type</Label>
              <Select 
                value={form.watch("cost_center_type")} 
                onValueChange={(v) => form.setValue("cost_center_type", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cost_center">Cost Center</SelectItem>
                  <SelectItem value="profit_center">Profit Center</SelectItem>
                  <SelectItem value="department">Department</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cost_center_name">Name *</Label>
            <Input 
              id="cost_center_name" 
              {...form.register("cost_center_name")} 
              placeholder="Administration, Operations, etc."
            />
            {form.formState.errors.cost_center_name && (
              <p className="text-xs text-destructive">{form.formState.errors.cost_center_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="parent_id">Parent Cost Center</Label>
            <Select 
              value={form.watch("parent_id")} 
              onValueChange={(v) => form.setValue("parent_id", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="None (Top Level)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None (Top Level)</SelectItem>
                {costCenters?.filter(cc => cc.is_active).map((cc) => (
                  <SelectItem key={cc.id} value={cc.id}>
                    {cc.center_code} - {cc.center_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description" 
              {...form.register("description")} 
              placeholder="Purpose and scope..."
              rows={2}
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch 
              id="is_active" 
              checked={form.watch("is_active")}
              onCheckedChange={(v) => form.setValue("is_active", v)}
            />
            <Label htmlFor="is_active">Active</Label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createCostCenter.isPending}>
              {createCostCenter.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Cost Center
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
