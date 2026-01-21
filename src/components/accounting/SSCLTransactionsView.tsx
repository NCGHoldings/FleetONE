import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, Download, Calculator, Search } from "lucide-react";
import { useSSCLTransactions } from "@/hooks/useAccountingData";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { DateDisplay } from "./shared/DateDisplay";
import { StatusBadge } from "./shared/StatusBadge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth } from "date-fns";

export const SSCLTransactionsView = () => {
  const { data: transactions, isLoading, refetch } = useSSCLTransactions();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [formData, setFormData] = useState({
    reference_type: "sscl_payable",
    transaction_date: format(new Date(), "yyyy-MM-dd"),
    gross_amount: "",
    sscl_rate: "2.5",
    reference_id: "",
  });

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    
    return transactions.filter(t => {
      const matchesSearch = t.reference_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.reference_type?.toLowerCase().includes(searchTerm.toLowerCase());
      const transactionMonth = format(new Date(t.transaction_date), "yyyy-MM");
      const matchesMonth = selectedMonth === "all" || transactionMonth === selectedMonth;
      return matchesSearch && matchesMonth;
    });
  }, [transactions, searchTerm, selectedMonth]);

  const summary = useMemo(() => {
    const monthStart = startOfMonth(new Date(selectedMonth + "-01"));
    const monthEnd = endOfMonth(monthStart);
    
    const monthTransactions = transactions?.filter(t => {
      const date = new Date(t.transaction_date);
      return date >= monthStart && date <= monthEnd;
    }) || [];

    const payable = monthTransactions
      .filter(t => t.reference_type === "sscl_payable" || t.reference_type === "invoice")
      .reduce((sum, t) => sum + (t.sscl_amount || 0), 0);
    
    const paid = monthTransactions
      .filter(t => t.reference_type === "sscl_payment" || t.reference_type === "payment")
      .reduce((sum, t) => sum + (t.sscl_amount || 0), 0);

    return { payable, paid, balance: payable - paid };
  }, [transactions, selectedMonth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const grossAmount = parseFloat(formData.gross_amount);
      const sscl_rate = parseFloat(formData.sscl_rate);
      const sscl_amount = (grossAmount * sscl_rate) / 100;

      const { error } = await supabase.from("sscl_transactions").insert({
        reference_type: formData.reference_type,
        transaction_date: formData.transaction_date,
        gross_amount: grossAmount,
        sscl_rate,
        sscl_amount,
        reference_id: formData.reference_id || null,
        status: "pending",
      });

      if (error) throw error;
      toast.success("SSCL transaction recorded successfully");
      setIsDialogOpen(false);
      setFormData({
        reference_type: "sscl_payable",
        transaction_date: format(new Date(), "yyyy-MM-dd"),
        gross_amount: "",
        sscl_rate: "2.5",
        reference_id: "",
      });
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to record SSCL transaction");
    }
  };

  const calculateSSCL = () => {
    const gross = parseFloat(formData.gross_amount) || 0;
    const rate = parseFloat(formData.sscl_rate) || 2.5;
    return (gross * rate) / 100;
  };

  // Generate month options for the last 12 months
  const monthOptions = useMemo(() => {
    const options = [{ value: "all", label: "All Months" }];
    for (let i = 0; i < 12; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      options.push({
        value: format(date, "yyyy-MM"),
        label: format(date, "MMMM yyyy"),
      });
    }
    return options;
  }, []);

  const getTransactionTypeLabel = (refType: string) => {
    switch (refType) {
      case "sscl_payment":
      case "payment":
        return { label: "Payment", isPayment: true };
      case "sscl_payable":
      case "invoice":
      default:
        return { label: "Payable", isPayment: false };
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-32"><p className="text-muted-foreground">Loading SSCL transactions...</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">SSCL Transactions</h2>
          <p className="text-sm text-muted-foreground">
            Social Security Contribution Levy (SSCL) tracking for Sri Lanka compliance
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />Export Return
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Record SSCL</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Record SSCL Transaction</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Transaction Type *</Label>
                  <Select value={formData.reference_type} onValueChange={v => setFormData(prev => ({ ...prev, reference_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sscl_payable">SSCL Payable</SelectItem>
                      <SelectItem value="sscl_payment">SSCL Payment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Transaction Date *</Label>
                    <Input type="date" value={formData.transaction_date} onChange={e => setFormData(prev => ({ ...prev, transaction_date: e.target.value }))} required />
                  </div>
                  <div className="space-y-2">
                    <Label>SSCL Rate (%)</Label>
                    <Input type="number" step="0.01" value={formData.sscl_rate} onChange={e => setFormData(prev => ({ ...prev, sscl_rate: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Gross Amount *</Label>
                  <Input type="number" step="0.01" placeholder="0.00" value={formData.gross_amount} onChange={e => setFormData(prev => ({ ...prev, gross_amount: e.target.value }))} required />
                </div>
                <Card className="p-4 bg-primary/5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calculator className="h-5 w-5 text-primary" />
                      <span className="font-medium">Calculated SSCL:</span>
                    </div>
                    <span className="text-xl font-bold text-primary">
                      <CurrencyDisplay amount={calculateSSCL()} />
                    </span>
                  </div>
                </Card>
                <div className="space-y-2">
                  <Label>Reference ID</Label>
                  <Input placeholder="Invoice/Receipt reference ID" value={formData.reference_id} onChange={e => setFormData(prev => ({ ...prev, reference_id: e.target.value }))} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">Record Transaction</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">SSCL Payable ({format(new Date(selectedMonth + "-01"), "MMM yyyy")})</p>
          <h3 className="text-2xl font-bold text-destructive mt-1"><CurrencyDisplay amount={summary.payable} /></h3>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">SSCL Paid</p>
          <h3 className="text-2xl font-bold text-green-600 mt-1"><CurrencyDisplay amount={summary.paid} /></h3>
        </Card>
        <Card className="p-4 bg-primary/5">
          <p className="text-xs text-muted-foreground">Outstanding Balance</p>
          <h3 className="text-2xl font-bold text-primary mt-1"><CurrencyDisplay amount={summary.balance} /></h3>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search transactions..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            {monthOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Transactions Table */}
      <Card className="p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 font-semibold">Date</th>
                <th className="text-left py-3 px-2 font-semibold">Type</th>
                <th className="text-left py-3 px-2 font-semibold">Reference</th>
                <th className="text-right py-3 px-2 font-semibold">Gross Amount</th>
                <th className="text-right py-3 px-2 font-semibold">Rate</th>
                <th className="text-right py-3 px-2 font-semibold">SSCL Amount</th>
                <th className="text-left py-3 px-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No SSCL transactions found</td></tr>
              ) : (
                filteredTransactions.map(t => {
                  const typeInfo = getTransactionTypeLabel(t.reference_type);
                  return (
                    <tr key={t.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2"><DateDisplay date={t.transaction_date} /></td>
                      <td className="py-3 px-2">
                        <span className={typeInfo.isPayment ? "text-green-600" : "text-destructive"}>
                          {typeInfo.label}
                        </span>
                      </td>
                      <td className="py-3 px-2"><FileText className="inline h-4 w-4 mr-1 text-muted-foreground" />{t.reference_id || "—"}</td>
                      <td className="py-3 px-2 text-right"><CurrencyDisplay amount={t.gross_amount || 0} /></td>
                      <td className="py-3 px-2 text-right">{t.sscl_rate}%</td>
                      <td className={`py-3 px-2 text-right font-semibold ${typeInfo.isPayment ? "text-green-600" : "text-destructive"}`}>
                        <CurrencyDisplay amount={t.sscl_amount || 0} />
                      </td>
                      <td className="py-3 px-2"><StatusBadge status={t.status || "pending"} /></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};