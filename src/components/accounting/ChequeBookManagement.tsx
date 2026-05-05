import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { DataTable } from "@/components/ui/data-table";
import { Plus, BookOpen, AlertTriangle } from "lucide-react";
import { useBankAccounts } from "@/hooks/useAccountingData";
import { useChequeBooks, useCreateChequeBook, useUpdateChequeBook } from "@/hooks/useChequeBooks";
import { Loader2 } from "lucide-react";

export const ChequeBookManagement = () => {
  const [selectedBankId, setSelectedBankId] = useState<string>("_all");
  const [showAddForm, setShowAddForm] = useState(false);

  const { data: bankAccounts } = useBankAccounts();
  const { data: chequeBooks, isLoading } = useChequeBooks(
    selectedBankId === "_all" ? undefined : selectedBankId
  );
  const createBook = useCreateChequeBook();
  const updateBook = useUpdateChequeBook();

  const [formData, setFormData] = useState({
    bank_account_id: "",
    prefix: "",
    start_number: "",
    end_number: "",
    notes: "",
  });

  const handleSubmit = async () => {
    if (!formData.bank_account_id || !formData.start_number || !formData.end_number) return;
    const start = parseInt(formData.start_number);
    const end = parseInt(formData.end_number);
    if (end <= start) return;

    await createBook.mutateAsync({
      bank_account_id: formData.bank_account_id,
      prefix: formData.prefix,
      start_number: start,
      end_number: end,
      notes: formData.notes,
    });
    setFormData({ bank_account_id: "", prefix: "", start_number: "", end_number: "", notes: "" });
    setShowAddForm(false);
  };

  const getBankName = (bankId: string) => {
    return bankAccounts?.find((b) => b.id === bankId)?.account_name || bankId;
  };

  const columns = [
    {
      accessorKey: "bank_account_id",
      header: "Bank Account",
      cell: ({ row }: any) => <span className="font-medium">{getBankName(row.original.bank_account_id)}</span>,
    },
    {
      accessorKey: "prefix",
      header: "Prefix",
      cell: ({ row }: any) => (
        <span className="font-mono">{row.original.prefix || "—"}</span>
      ),
    },
    {
      accessorKey: "start_number",
      header: "Start",
      cell: ({ row }: any) => <span className="font-mono">{row.original.start_number}</span>,
    },
    {
      accessorKey: "end_number",
      header: "End",
      cell: ({ row }: any) => <span className="font-mono">{row.original.end_number}</span>,
    },
    {
      accessorKey: "next_number",
      header: "Next #",
      cell: ({ row }: any) => {
        const remaining = row.original.end_number - row.original.next_number + 1;
        const isLow = remaining <= 10 && remaining > 0;
        const isExhausted = remaining <= 0;
        return (
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold">{row.original.next_number}</span>
            {isExhausted && <Badge variant="destructive">Exhausted</Badge>}
            {isLow && !isExhausted && (
              <Badge variant="outline" className="text-orange-600 border-orange-300">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {remaining} left
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }: any) => (
        <Badge variant={row.original.is_active ? "default" : "secondary"}>
          {row.original.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }: any) => (
        row.original.is_active ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => updateBook.mutate({ id: row.original.id, is_active: false })}
          >
            Deactivate
          </Button>
        ) : null
      ),
    },
  ];

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Cheque Book Management
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Register and manage cheque books for auto-numbering
          </p>
        </div>
        <div className="flex gap-3">
          <Select value={selectedBankId} onValueChange={setSelectedBankId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Filter by bank" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Bank Accounts</SelectItem>
              {bankAccounts?.filter((a) => a.is_active).map((bank) => (
                <SelectItem key={bank.id} value={bank.id}>
                  {bank.account_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Register Cheque Book
          </Button>
        </div>
      </div>

      <DataTable enableColumnFilters columns={columns} data={chequeBooks || []} searchKey="prefix" />

      {/* Add Cheque Book Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Register New Cheque Book</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Bank Account *</Label>
              <Select value={formData.bank_account_id} onValueChange={(v) => setFormData({ ...formData, bank_account_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select bank account" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts?.filter((a) => a.is_active).map((bank) => (
                    <SelectItem key={bank.id} value={bank.id}>
                      {bank.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prefix (optional)</Label>
              <Input
                value={formData.prefix}
                onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
                placeholder="e.g. CHQ-"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Number *</Label>
                <Input
                  type="number"
                  value={formData.start_number}
                  onChange={(e) => setFormData({ ...formData, start_number: e.target.value })}
                  placeholder="000001"
                />
              </div>
              <div className="space-y-2">
                <Label>End Number *</Label>
                <Input
                  type="number"
                  value={formData.end_number}
                  onChange={(e) => setFormData({ ...formData, end_number: e.target.value })}
                  placeholder="000050"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Book reference, received date..."
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowAddForm(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={createBook.isPending}>
                {createBook.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Register
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
