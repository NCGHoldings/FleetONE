import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, Search, Printer, Pencil, Trash2 } from "lucide-react";
import { useARCreditNotes, useCustomers, useARInvoices } from "@/hooks/useAccountingData";
import { useDeleteARCreditNote } from "@/hooks/useAccountingMutations";
import { supabase } from "@/integrations/supabase/client";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { DateDisplay } from "./shared/DateDisplay";
import { StatusBadge } from "./shared/StatusBadge";
import { toast } from "sonner";
import { format } from "date-fns";
import { SearchableCustomerSelector } from "./shared/SearchableCustomerSelector";
import { FinanceDocumentPreviewModal } from "./shared/FinanceDocumentPreviewModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const ARCreditNotesView = () => {
  const { data: creditNotes, isLoading, refetch } = useARCreditNotes();
  const { data: customers } = useCustomers();
  const { data: invoices } = useARInvoices();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [printDocumentOpen, setPrintDocumentOpen] = useState(false);
  const [printDocumentData, setPrintDocumentData] = useState<any>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<any>(null);
  const deleteCreditNote = useDeleteARCreditNote();
  const [formData, setFormData] = useState({
    customer_id: "",
    original_invoice_id: "",
    credit_date: format(new Date(), "yyyy-MM-dd"),
    amount: "",
    reason: "",
  });

  const filteredCreditNotes = creditNotes?.filter(cn =>
    cn.credit_note_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cn.customers?.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const generateCreditNoteNumber = () => {
    const date = new Date();
    const prefix = "CN";
    const timestamp = date.getTime().toString().slice(-6);
    return `${prefix}-${format(date, "yyyyMM")}-${timestamp}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingNote) {
        const { error } = await supabase.from("ar_credit_notes").update({
          customer_id: formData.customer_id,
          original_invoice_id: formData.original_invoice_id || null,
          credit_date: formData.credit_date,
          amount: parseFloat(formData.amount),
          reason: formData.reason,
        }).eq("id", editingNote.id);
        if (error) throw error;
        toast.success("Credit note updated successfully");
      } else {
        const { error } = await supabase.from("ar_credit_notes").insert({
          credit_note_number: generateCreditNoteNumber(),
          customer_id: formData.customer_id,
          original_invoice_id: formData.original_invoice_id || null,
          credit_date: formData.credit_date,
          amount: parseFloat(formData.amount),
          reason: formData.reason,
          status: "draft",
        });
        if (error) throw error;
        toast.success("Credit note created successfully");
      }
      setIsDialogOpen(false);
      setEditingNote(null);
      setFormData({
        customer_id: "",
        original_invoice_id: "",
        credit_date: format(new Date(), "yyyy-MM-dd"),
        amount: "",
        reason: "",
      });
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to save credit note");
    }
  };

  const handleEdit = (cn: any) => {
    setEditingNote(cn);
    setFormData({
      customer_id: cn.customer_id || "",
      original_invoice_id: cn.original_invoice_id || "",
      credit_date: cn.credit_date,
      amount: cn.amount?.toString() || "",
      reason: cn.reason || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = () => {
    if (deleteConfirmId) {
      deleteCreditNote.mutate(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const customerInvoices = invoices?.filter(inv => inv.customer_id === formData.customer_id);

  if (isLoading) {
    return <div className="flex items-center justify-center h-32"><p className="text-muted-foreground">Loading credit notes...</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">AR Credit Notes</h2>
          <p className="text-sm text-muted-foreground">Manage customer credit notes and adjustments</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingNote(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingNote(null); setFormData({ customer_id: "", original_invoice_id: "", credit_date: format(new Date(), "yyyy-MM-dd"), amount: "", reason: "" }); }}>
              <Plus className="h-4 w-4 mr-2" />New Credit Note
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingNote ? "Edit Credit Note" : "Create Credit Note"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Customer *</Label>
                <SearchableCustomerSelector
                  value={formData.customer_id}
                  onValueChange={v => setFormData(prev => ({ ...prev, customer_id: v, original_invoice_id: "" }))}
                  showQuickAdd={true}
                />
              </div>
              <div className="space-y-2">
                <Label>Original Invoice (Optional)</Label>
                <Select value={formData.original_invoice_id} onValueChange={v => setFormData(prev => ({ ...prev, original_invoice_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select invoice" /></SelectTrigger>
                  <SelectContent>
                    {customerInvoices?.map(inv => (
                      <SelectItem key={inv.id} value={inv.id}>{inv.invoice_number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Credit Date *</Label>
                  <Input type="date" value={formData.credit_date} onChange={e => setFormData(prev => ({ ...prev, credit_date: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Amount *</Label>
                  <Input type="number" step="0.01" placeholder="0.00" value={formData.amount} onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea placeholder="Reason for credit note..." value={formData.reason} onChange={e => setFormData(prev => ({ ...prev, reason: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit">{editingNote ? "Update" : "Create"} Credit Note</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search credit notes..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
      </div>

      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 font-semibold">Credit Note #</th>
                <th className="text-left py-3 px-2 font-semibold">Customer</th>
                <th className="text-left py-3 px-2 font-semibold">Original Invoice</th>
                <th className="text-left py-3 px-2 font-semibold">Date</th>
                <th className="text-right py-3 px-2 font-semibold">Amount</th>
                <th className="text-left py-3 px-2 font-semibold">Status</th>
                <th className="text-left py-3 px-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCreditNotes?.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No credit notes found</td></tr>
              ) : (
                filteredCreditNotes?.map(cn => (
                  <tr key={cn.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-2 font-medium"><FileText className="inline h-4 w-4 mr-2 text-muted-foreground" />{cn.credit_note_number}</td>
                    <td className="py-3 px-2">{cn.customers?.customer_name || "—"}</td>
                    <td className="py-3 px-2">{cn.ar_invoices?.invoice_number || "—"}</td>
                    <td className="py-3 px-2"><DateDisplay date={cn.credit_date} /></td>
                    <td className="py-3 px-2 text-right font-semibold text-destructive"><CurrencyDisplay amount={cn.amount} /></td>
                    <td className="py-3 px-2"><StatusBadge status={cn.status || "draft"} /></td>
                    <td className="py-3 px-2">
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          variant="ghost"
                          title="Edit"
                          onClick={() => handleEdit(cn)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {(cn.status === "draft") && (
                          <Button 
                            size="sm" 
                            variant="ghost"
                            title="Delete"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirmId(cn.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => {
                            setPrintDocumentData(cn);
                            setPrintDocumentOpen(true);
                          }}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Credit Note?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this credit note.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Document Print Preview Modal */}
      <FinanceDocumentPreviewModal
        open={printDocumentOpen}
        onOpenChange={setPrintDocumentOpen}
        documentType="ar_credit_note"
        documentData={printDocumentData}
        companyId={printDocumentData?.company_id}
        businessUnitCode={printDocumentData?.business_unit_code}
      />
    </div>
  );
};
