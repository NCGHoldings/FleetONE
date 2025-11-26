import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";

interface ConvertToQuotationModalProps {
  inquiry: any;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ConvertToQuotationModal = ({
  inquiry,
  open,
  onClose,
  onSuccess,
}: ConvertToQuotationModalProps) => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const convertMutation = useMutation({
    mutationFn: async () => {
      // Mark inquiry as converted
      const { error } = await supabase
        .from("vehicle_inquiries")
        .update({
          status: "converted",
          converted_at: new Date().toISOString(),
        })
        .eq("id", inquiry.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Inquiry marked as converted" });
      
      // Navigate to appropriate quotation page with pre-filled data
      const queryParams = new URLSearchParams({
        fromInquiry: inquiry.id,
        customerName: inquiry.customer_name,
        customerPhone: inquiry.customer_phone || "",
        customerEmail: inquiry.customer_email || "",
        companyName: inquiry.company_name || "",
        address: inquiry.address || "",
        interestedModel: inquiry.interested_model || "",
        quantity: inquiry.quantity?.toString() || "1",
      }).toString();

      if (inquiry.product_type === "yutong") {
        navigate(`/yutong-quotations?${queryParams}`);
      } else if (inquiry.product_type === "sinotruck") {
        navigate(`/sinotruck-quotations?${queryParams}`);
      }

      onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error converting inquiry",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleConvert = () => {
    convertMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convert to Quotation</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              This will mark the inquiry as converted and redirect you to the{" "}
              <strong>{inquiry.product_type === "yutong" ? "Yutong" : "Sinotruck"}</strong>{" "}
              quotation form with the customer details pre-filled.
            </AlertDescription>
          </Alert>

          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div>
              <span className="font-semibold">Customer:</span> {inquiry.customer_name}
            </div>
            <div>
              <span className="font-semibold">Product:</span> {inquiry.product_type.toUpperCase()}
            </div>
            {inquiry.interested_model && (
              <div>
                <span className="font-semibold">Model:</span> {inquiry.interested_model}
              </div>
            )}
            <div>
              <span className="font-semibold">Quantity:</span> {inquiry.quantity}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleConvert} disabled={convertMutation.isPending}>
              {convertMutation.isPending ? "Converting..." : "Convert to Quotation"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};