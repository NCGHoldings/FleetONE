import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, DollarSign, TrendingDown, Wallet, Eye, Printer, ArrowRightLeft } from "lucide-react";
import { format, startOfMonth, endOfMonth, isToday, isWithinInterval } from "date-fns";
import { useAPPayments, useVendors } from "@/hooks/useAccountingData";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { APPaymentForm } from "./APPaymentForm";
import { FinanceDocumentPreviewModal } from "./shared/FinanceDocumentPreviewModal";

export const APPaymentsView = () => {
  const { data: payments, isLoading } = useAPPayments();
  const { data: vendors } = useVendors();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<string>("_all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("_all");
  
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [isAdvanceMode, setIsAdvanceMode] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  // Get vendor name helper
  const getVendorName = (vendorId: string) => {
    const vendor = vendors?.find(v => v.id === vendorId);
    return vendor?.vendor_name || "Unknown";
  };

  // Calculate summary metrics
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const todayPayments = payments?.filter(p => isToday(new Date(p.payment_date))) || [];
  const monthPayments = payments?.filter(p => 
    isWithinInterval(new Date(p.payment_date), { start: monthStart, end: monthEnd })
  ) || [];
  const advancePayments = payments?.filter(p => p.is_advance) || [];

  const totalToday = todayPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalMonth = monthPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalAdvances = advancePayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Filter payments
  const filteredPayments = payments?.filter(payment => {
    const matchesSearch = 
      payment.payment_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getVendorName(payment.vendor_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.cheque_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesVendor = selectedVendor === "_all" || payment.vendor_id === selectedVendor;
    const matchesMethod = paymentMethodFilter === "_all" || payment.payment_method === paymentMethodFilter;
    
    return matchesSearch && matchesVendor && matchesMethod;
  }) || [];

  const handleOpenPayment = (advance: boolean = false) => {
    setIsAdvanceMode(advance);
    setPaymentFormOpen(true);
  };

  const handleViewPayment = (payment: any) => {
    setSelectedPayment(payment);
    setPreviewOpen(true);
  };

  const getStatusBadge = (payment: any) => {
    if (payment.is_advance) {
      return <Badge variant="secondary">Advance</Badge>;
    }
    if (payment.approval_status === "pending") {
      return <Badge variant="outline">Pending Approval</Badge>;
    }
    return <Badge variant="default">{payment.status || "Posted"}</Badge>;
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: "Cash",
      bank_transfer: "Bank Transfer",
      cheque: "Cheque",
      online: "Online",
    };
    return labels[method] || method;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Payments Today</p>
              <h3 className="text-2xl font-bold mt-2">
                <CurrencyDisplay amount={totalToday} />
              </h3>
              <p className="text-xs text-muted-foreground mt-1">{todayPayments.length} transactions</p>
            </div>
            <DollarSign className="h-10 w-10 text-red-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">This Month</p>
              <h3 className="text-2xl font-bold mt-2">
                <CurrencyDisplay amount={totalMonth} />
              </h3>
              <p className="text-xs text-muted-foreground mt-1">{monthPayments.length} transactions</p>
            </div>
            <TrendingDown className="h-10 w-10 text-primary" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Unallocated Advances</p>
              <h3 className="text-2xl font-bold mt-2 text-orange-600">
                <CurrencyDisplay amount={totalAdvances} />
              </h3>
              <p className="text-xs text-muted-foreground mt-1">{advancePayments.length} advance payments</p>
            </div>
            <Wallet className="h-10 w-10 text-orange-600" />
          </div>
        </Card>
      </div>

      {/* Actions and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => handleOpenPayment(false)}>
            <Plus className="h-4 w-4 mr-2" />
            Record Payment
          </Button>
          <Button variant="outline" onClick={() => handleOpenPayment(true)}>
            <Wallet className="h-4 w-4 mr-2" />
            Record Advance
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search payments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-[200px]"
            />
          </div>

          <Select value={selectedVendor} onValueChange={setSelectedVendor}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Vendors" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Vendors</SelectItem>
              {vendors?.map((vendor) => (
                <SelectItem key={vendor.id} value={vendor.id}>
                  {vendor.vendor_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={paymentMethodFilter} onValueChange={setPaymentMethodFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="All Methods" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Methods</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
              <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
              <SelectItem value="cheque">Cheque</SelectItem>
              <SelectItem value="online">Online</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Payments Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Payment #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Cheque #</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  Loading payments...
                </TableCell>
              </TableRow>
            ) : filteredPayments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No payments found
                </TableCell>
              </TableRow>
            ) : (
              filteredPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-mono font-medium">{payment.payment_number}</TableCell>
                  <TableCell>{format(new Date(payment.payment_date), "MMM dd, yyyy")}</TableCell>
                  <TableCell>{getVendorName(payment.vendor_id)}</TableCell>
                  <TableCell>{getPaymentMethodLabel(payment.payment_method || "")}</TableCell>
                  <TableCell className="font-mono">{payment.cheque_number || "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{payment.reference || "-"}</TableCell>
                  <TableCell className="text-right font-semibold">
                    <CurrencyDisplay amount={payment.amount} />
                  </TableCell>
                  <TableCell>{getStatusBadge(payment)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleViewPayment(payment)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Printer className="h-4 w-4" />
                      </Button>
                      {payment.is_advance && (
                        <Button variant="ghost" size="icon" title="Allocate to Invoice">
                          <ArrowRightLeft className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Payment Form Dialog */}
      <APPaymentForm 
        open={paymentFormOpen} 
        onOpenChange={setPaymentFormOpen}
        isAdvanceMode={isAdvanceMode}
      />

      {/* Preview Modal */}
      {selectedPayment && (
        <FinanceDocumentPreviewModal
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          documentType="payment_voucher"
          documentData={{
            payment_number: selectedPayment.payment_number,
            payment_date: selectedPayment.payment_date,
            vendor_name: getVendorName(selectedPayment.vendor_id),
            amount: selectedPayment.amount,
            payment_method: getPaymentMethodLabel(selectedPayment.payment_method || ""),
            cheque_number: selectedPayment.cheque_number,
            reference: selectedPayment.reference,
            notes: selectedPayment.notes,
          }}
        />
      )}
    </div>
  );
};
