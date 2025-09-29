import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Car, Calendar, FileText, MapPin, DollarSign } from "lucide-react";
import { format } from "date-fns";

const accidentSchema = z.object({
  vehicle_number: z.string().min(1, "Vehicle number is required").max(20, "Vehicle number too long"),
  accident_date: z.string().min(1, "Accident date is required"),
  bl_number: z.string().optional(),
  details_of_accident: z.string().optional(),
  estimate_amount: z.union([z.number().nullable(), z.literal(""), z.literal(0)]).optional(),
  approved_amount: z.union([z.number().nullable(), z.literal(""), z.literal(0)]).optional(),
  process_details: z.string().optional(),
  accident_mark: z.boolean().default(false),
  salvage: z.boolean().default(false),
  salvage_disposition: z.string().optional(),
  salvage_value: z.union([z.number().nullable(), z.literal(""), z.literal(0)]).optional(),
  salvage_sale_date: z.string().optional(),
  reported_by: z.string().optional(),
  location: z.string().optional(),
  insurer_claim_ref: z.string().optional(),
  status: z.string().default("Reported")
});

type AccidentFormData = z.infer<typeof accidentSchema>;

interface AddAccidentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddAccidentModal({ open, onOpenChange, onSuccess }: AddAccidentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
    clearErrors
  } = useForm<AccidentFormData>({
    resolver: zodResolver(accidentSchema),
    defaultValues: {
      accident_mark: false,
      salvage: false,
      status: "Reported"
    }
  });

  const watchSalvage = watch("salvage");

  const onSubmit = async (data: AccidentFormData) => {
    setIsSubmitting(true);
    try {
      // Prepare the data - handle empty strings and convert to null/numbers appropriately
      const submitData = {
        vehicle_number: data.vehicle_number.toUpperCase(),
        accident_date: data.accident_date,
        bl_number: data.bl_number || null,
        details_of_accident: data.details_of_accident || null,
        estimate_amount: (data.estimate_amount && String(data.estimate_amount) !== "" && Number(data.estimate_amount) !== 0) ? Number(data.estimate_amount) : null,
        approved_amount: (data.approved_amount && String(data.approved_amount) !== "" && Number(data.approved_amount) !== 0) ? Number(data.approved_amount) : null,
        process_details: data.process_details || null,
        accident_mark: data.accident_mark,
        salvage: data.salvage,
        salvage_disposition: data.salvage_disposition || null,
        salvage_value: (data.salvage_value && String(data.salvage_value) !== "" && Number(data.salvage_value) !== 0) ? Number(data.salvage_value) : null,
        salvage_sale_date: data.salvage_sale_date || null,
        reported_by: data.reported_by || null,
        location: data.location || null,
        insurer_claim_ref: data.insurer_claim_ref || null,
        status: data.status
      };

      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('https://wwjpdszkmtnzshbulkon.supabase.co/functions/v1/accident-records', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      toast.success('Accident record added successfully');
      reset();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding accident record:', error);
      toast.error('Failed to add accident record');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            Add New Accident Record
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Basic Information
              </h3>
              
              <div>
                <Label htmlFor="vehicle_number">Vehicle Number *</Label>
                <Input
                  id="vehicle_number"
                  {...register("vehicle_number")}
                  placeholder="e.g., NC 8759"
                  className="mt-1"
                />
                {errors.vehicle_number && (
                  <p className="text-sm text-destructive mt-1">{errors.vehicle_number.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="accident_date">Accident Date *</Label>
                <Input
                  id="accident_date"
                  type="date"
                  {...register("accident_date")}
                  className="mt-1"
                />
                {errors.accident_date && (
                  <p className="text-sm text-destructive mt-1">{errors.accident_date.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="bl_number">BL Number</Label>
                <Input
                  id="bl_number"
                  {...register("bl_number")}
                  placeholder="e.g., BL1990945"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select defaultValue="Reported" onValueChange={(value) => setValue("status", value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Reported">Reported</SelectItem>
                    <SelectItem value="Estimate">Estimate</SelectItem>
                    <SelectItem value="Processing">Processing</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Settlement">Settlement</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  {...register("location")}
                  placeholder="Accident location"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="reported_by">Reported By</Label>
                <Input
                  id="reported_by"
                  {...register("reported_by")}
                  placeholder="Reporter name"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Financial & Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Financial & Details
              </h3>

              <div>
                <Label htmlFor="details_of_accident">Accident Details</Label>
                <Textarea
                  id="details_of_accident"
                  {...register("details_of_accident")}
                  placeholder="Describe the accident details..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="estimate_amount">Estimate Amount (LKR)</Label>
                  <Input
                    id="estimate_amount"
                    type="number"
                    {...register("estimate_amount", { 
                      setValueAs: (value) => value === "" ? null : Number(value)
                    })}
                    placeholder="0"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="approved_amount">Approved Amount (LKR)</Label>
                  <Input
                    id="approved_amount"
                    type="number"
                    {...register("approved_amount", { 
                      setValueAs: (value) => value === "" ? null : Number(value)
                    })}
                    placeholder="0"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="process_details">Process Details</Label>
                <Textarea
                  id="process_details"
                  {...register("process_details")}
                  placeholder="Processing status and notes..."
                  rows={2}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="insurer_claim_ref">Insurer Claim Reference</Label>
                <Input
                  id="insurer_claim_ref"
                  {...register("insurer_claim_ref")}
                  placeholder="Insurance claim reference"
                  className="mt-1"
                />
              </div>

              {/* Flags */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="accident_mark">Accident Mark</Label>
                  <Switch
                    id="accident_mark"
                    onCheckedChange={(checked) => setValue("accident_mark", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="salvage">Salvage</Label>
                  <Switch
                    id="salvage"
                    onCheckedChange={(checked) => setValue("salvage", checked)}
                  />
                </div>
              </div>

              {/* Salvage Details - Show only if salvage is enabled */}
              {watchSalvage && (
                <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-medium">Salvage Details</h4>
                  
                  <div>
                    <Label htmlFor="salvage_disposition">Salvage Disposition</Label>
                    <Select onValueChange={(value) => setValue("salvage_disposition", value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select disposition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Stored">Stored</SelectItem>
                        <SelectItem value="Sold">Sold</SelectItem>
                        <SelectItem value="Scrapped">Scrapped</SelectItem>
                        <SelectItem value="Repaired">Repaired</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="salvage_value">Salvage Value (LKR)</Label>
                      <Input
                        id="salvage_value"
                        type="number"
                        {...register("salvage_value", { 
                          setValueAs: (value) => value === "" ? null : Number(value)
                        })}
                        placeholder="0"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="salvage_sale_date">Salvage Sale Date</Label>
                      <Input
                        id="salvage_sale_date"
                        type="date"
                        {...register("salvage_sale_date")}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Accident Record'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}