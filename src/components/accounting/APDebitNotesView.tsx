import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, Search } from "lucide-react";
import { useAPDebitNotes, useVendors, useAPInvoices } from "@/hooks/useAccountingData";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { DateDisplay } from "./shared/DateDisplay";
import { StatusBadge } from "./shared/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

export const APDebitNotesView = () => {
  const { data: debitNotes, isLoading, refetch } = useAPDebitNotes();
  const { data: vendors } = useVendors();
  const { data: invoices } = useAPInvoices();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState({
    vendor_id: "",
    original_invoice_id: "",
    debit_date: format(new Date(), "yyyy-MM-dd"),
    amount: "",
    reason: "",
  });

  const filteredDebitNotes = debitNotes?.filter(dn =>
    dn.debit_note_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dn.vendors?.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const generateDebitNoteNumber = () => {
    const date = new Date();
    const prefix = "DN";
    const timestamp = date.getTime().toString().slice(-6);
    return `${prefix}-${format(date, "yyyyMM")}-${timestamp}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("ap_debit_notes").insert({
        debit_note_number: generateDebitNoteNumber(),
        vendor_id: formData.vendor_id,
        original_invoice_id: formData.original_invoice_id || null,
        debit_date: formData.debit_date,
        amount: parseFloat(formData.amount),
        reason: formData.reason,
        status: "draft",
      });

      if (error) throw error;
      toast.success("Debit note created successfully");
      setIsDialogOpen(false);
      setFormData({
        vendor_id: "",
        original_invoice_id: "",
        debit_date: format(new Date(), "yyyy-MM-dd"),
        amount: "",
        reason: "",
      });
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to create debit note");
    }
  };

  const vendorInvoices = invoices?.filter(inv => inv.vendor_id === formData.vendor_id);

  if (isLoading) {
    return <div className="flex items-center justify-center h-32"><p className="text-muted-foreground">Loading debit notes...</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">AP Debit Notes</h2>
          <p className="text-sm text-muted-foreground">Manage vendor debit notes and adjustments</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />New Debit Note</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Debit Note</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Vendor *</Label>
                <Select value={formData.vendor_id} onValueChange={v => setFormData(prev => ({ ...prev, vendor_id: v, original_invoice_id: "" }))}>
                  <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                  <SelectContent>
                    {vendors?.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.vendor_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Original Invoice (Optional)</Label>
                <Select value={formData.original_invoice_id} onValueChange={v => setFormData(prev => ({ ...prev, original_invoice_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select invoice" /></SelectTrigger>
                  <SelectContent>
                    {vendorInvoices?.map(inv => (
                      <SelectItem key={inv.id} value={inv.id}>{inv.invoice_number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Debit Date *</Label>
                  <Input type="date" value={formData.debit_date} onChange={e => setFormData(prev => ({ ...prev, debit_date: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Amount *</Label>
                  <Input type="number" step="0.01" placeholder="0.00" value={formData.amount} onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea placeholder="Reason for debit note..." value={formData.reason} onChange={e => setFormData(prev => ({ ...prev, reason: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Create Debit Note</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search debit notes..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 font-semibold">Debit Note #</th>
                <th className="text-left py-3 px-2 font-semibold">Vendor</th>
                <th className="text-left py-3 px-2 font-semibold">Original Invoice</th>
                <th className="text-left py-3 px-2 font-semibold">Date</th>
                <th className="text-right py-3 px-2 font-semibold">Amount</th>
                <th className="text-left py-3 px-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredDebitNotes?.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No debit notes found</td></tr>
              ) : (
                filteredDebitNotes?.map(dn => (
                  <tr key={dn.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-2 font-medium"><FileText className="inline h-4 w-4 mr-2 text-muted-foreground" />{dn.debit_note_number}</td>
                    <td className="py-3 px-2">{dn.vendors?.vendor_name || "—"}</td>
                    <td className="py-3 px-2">{dn.ap_invoices?.invoice_number || "—"}</td>
                    <td className="py-3 px-2"><DateDisplay date={dn.debit_date} /></td>
                    <td className="py-3 px-2 text-right font-semibold text-green-600"><CurrencyDisplay amount={dn.amount} /></td>
                    <td className="py-3 px-2"><StatusBadge status={dn.status || "draft"} /></td>
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
