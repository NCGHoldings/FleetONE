import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Send, Clock, CheckCircle, XCircle } from "lucide-react";
import { CurrencyDisplay } from "@/components/accounting/shared/CurrencyDisplay";
import { format } from "date-fns";
import { toast } from "sonner";

interface SubmitInvoiceProps {
  vendorId: string;
}

export const SubmitInvoice = ({ vendorId }: SubmitInvoiceProps) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    purchase_order_id: "",
    invoice_number: "",
    invoice_date: format(new Date(), "yyyy-MM-dd"),
    total_amount: "",
    notes: "",
  });

  // Fetch acknowledged POs (eligible for invoice submission)
  const { data: eligiblePOs } = useQuery({
    queryKey: ["vendor_eligible_pos", vendorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("id, po_number, total_amount, order_date")
        .eq("vendor_id", vendorId)
        .in("status", ["acknowledged", "approved", "submitted"])
        .order("order_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch submitted invoices
  const { data: submittedInvoices, isLoading } = useQuery({
    queryKey: ["vendor_submitted_invoices", vendorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendor_submitted_invoices")
        .select(`
          *,
          purchase_order:purchase_orders(po_number)
        `)
        .eq("vendor_id", vendorId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Submit invoice mutation
  const submitInvoice = useMutation({
    mutationFn: async () => {
      if (!formData.invoice_number || !formData.total_amount) {
        throw new Error("Please fill all required fields");
      }

      // Get company_id from the PO
      let companyId = null;
      if (formData.purchase_order_id) {
        const { data: po } = await supabase
          .from("purchase_orders")
          .select("company_id")
          .eq("id", formData.purchase_order_id)
          .single();
        companyId = po?.company_id;
      }

      const { error } = await supabase.from("vendor_submitted_invoices").insert({
        vendor_id: vendorId,
        purchase_order_id: formData.purchase_order_id || null,
        invoice_number: formData.invoice_number,
        invoice_date: formData.invoice_date,
        total_amount: parseFloat(formData.total_amount),
        notes: formData.notes || null,
        status: "pending",
        company_id: companyId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor_submitted_invoices"] });
      toast.success("Invoice submitted successfully");
      setFormData({
        purchase_order_id: "",
        invoice_number: "",
        invoice_date: format(new Date(), "yyyy-MM-dd"),
        total_amount: "",
        notes: "",
      });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to submit invoice");
    },
  });

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
      pending: { variant: "secondary", icon: Clock },
      approved: { variant: "default", icon: CheckCircle },
      rejected: { variant: "destructive", icon: XCircle },
      converted: { variant: "outline", icon: CheckCircle },
    };
    const { variant, icon: Icon } = config[status] || config.pending;
    return (
      <Badge variant={variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Submit Invoice</h2>
        <p className="text-muted-foreground">Submit invoices against purchase orders for payment processing</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Submit Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              New Invoice Submission
            </CardTitle>
            <CardDescription>Submit your invoice details for processing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Purchase Order (Optional)</Label>
              <Select
                value={formData.purchase_order_id || "_none"}
                onValueChange={(v) => {
                  const poId = v === "_none" ? "" : v;
                  setFormData({ ...formData, purchase_order_id: poId });
                  // Auto-fill amount from PO
                  if (poId) {
                    const po = eligiblePOs?.find((p) => p.id === poId);
                    if (po) {
                      setFormData((prev) => ({
                        ...prev,
                        purchase_order_id: poId,
                        total_amount: po.total_amount?.toString() || "",
                      }));
                    }
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a purchase order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">-- No PO (Direct Invoice) --</SelectItem>
                  {eligiblePOs?.map((po) => (
                    <SelectItem key={po.id} value={po.id}>
                      {po.po_number} - <CurrencyDisplay amount={po.total_amount || 0} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Invoice Number *</Label>
              <Input
                value={formData.invoice_number}
                onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                placeholder="Your invoice number"
              />
            </div>

            <div className="space-y-2">
              <Label>Invoice Date *</Label>
              <Input
                type="date"
                value={formData.invoice_date}
                onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Total Amount (LKR) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.total_amount}
                onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes or comments..."
                rows={3}
              />
            </div>

            <Button
              onClick={() => submitInvoice.mutate()}
              disabled={submitInvoice.isPending || !formData.invoice_number || !formData.total_amount}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              {submitInvoice.isPending ? (
                "Submitting..."
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Invoice
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Submitted Invoices List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Submitted Invoices
            </CardTitle>
            <CardDescription>Track the status of your submitted invoices</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : submittedInvoices && submittedInvoices.length > 0 ? (
              <div className="space-y-4">
                {submittedInvoices.map((invoice) => (
                  <div key={invoice.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{invoice.invoice_number}</span>
                      {getStatusBadge(invoice.status)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {invoice.purchase_order?.po_number && (
                        <p>PO: {invoice.purchase_order.po_number}</p>
                      )}
                      <p>Date: {format(new Date(invoice.invoice_date), "dd MMM yyyy")}</p>
                    </div>
                    <p className="font-medium">
                      <CurrencyDisplay amount={invoice.total_amount} />
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No invoices submitted yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
