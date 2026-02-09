import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useItems } from "@/hooks/useAccountingData";
import { useInspectionTemplates, useCreateQualityInspection } from "@/hooks/useQualityInspection";

const formSchema = z.object({
  inspection_number: z.string().min(1, "Inspection number is required"),
  template_id: z.string().min(1, "Template is required"),
  item_id: z.string().min(1, "Item is required"),
  inspection_date: z.string().min(1, "Date is required"),
  inspected_qty: z.coerce.number().min(1, "Quantity must be at least 1"),
  reference_type: z.string().optional(),
  notes: z.string().optional(),
});

interface QualityInspectionFormProps {
  onSuccess?: () => void;
}

export const QualityInspectionForm = ({ onSuccess }: QualityInspectionFormProps) => {
  const { data: items } = useItems();
  const { data: templates } = useInspectionTemplates();
  const createInspection = useCreateQualityInspection();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      inspection_number: `QI-${Date.now()}`,
      inspection_date: new Date().toISOString().split("T")[0],
      inspected_qty: 1,
    },
  });
  
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    await createInspection.mutateAsync({
      inspection_number: data.inspection_number,
      template_id: data.template_id,
      item_id: data.item_id,
      inspection_date: data.inspection_date,
      inspected_qty: data.inspected_qty,
      reference_type: data.reference_type as any,
      notes: data.notes,
    });
    onSuccess?.();
  };
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Inspection Number *</Label>
          <Input {...form.register("inspection_number")} />
        </div>
        
        <div className="space-y-2">
          <Label>Template *</Label>
          <Select onValueChange={(v) => form.setValue("template_id", v)}>
            <SelectTrigger><SelectValue placeholder="Select template" /></SelectTrigger>
            <SelectContent>
              {templates?.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.template_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Item *</Label>
          <Select onValueChange={(v) => form.setValue("item_id", v)}>
            <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
            <SelectContent>
              {items?.map((i) => (
                <SelectItem key={i.id} value={i.id}>{i.item_code} - {i.item_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Inspection Date *</Label>
          <Input type="date" {...form.register("inspection_date")} />
        </div>
        
        <div className="space-y-2">
          <Label>Quantity to Inspect *</Label>
          <Input type="number" min="1" {...form.register("inspected_qty")} />
        </div>
        
        <div className="space-y-2">
          <Label>Reference Type</Label>
          <Select onValueChange={(v) => form.setValue("reference_type", v)}>
            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="grn">Goods Receipt Note</SelectItem>
              <SelectItem value="delivery_note">Delivery Note</SelectItem>
              <SelectItem value="production">Production</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea {...form.register("notes")} rows={2} />
      </div>
      
      <div className="flex justify-end">
        <Button type="submit" disabled={createInspection.isPending}>
          {createInspection.isPending ? "Creating..." : "Create Inspection"}
        </Button>
      </div>
    </form>
  );
};
