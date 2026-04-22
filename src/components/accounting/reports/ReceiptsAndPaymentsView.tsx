import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { FileText, TrendingUp, TrendingDown, Wallet, Minus, Users, Building2, Download } from "lucide-react";
import { CurrencyDisplay } from "@/components/accounting/shared/CurrencyDisplay";
import { Badge } from "@/components/ui/badge";

export function ReceiptsAndPaymentsView() {
  const { selectedCompany } = useCompany();
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [businessUnit, setBusinessUnit] = useState("all");
  const [selectedEntity, setSelectedEntity] = useState<{ id: string; name: string; type: 'customer' | 'vendor' } | null>(null);

  // Fetch AR Receipts
  const { data: receipts = [], isLoading: loadingReceipts } = useQuery({
    queryKey: ["ar_receipts_summary", selectedCompany?.id, dateFrom, dateTo, businessUnit],
    queryFn: async () => {
      if (!selectedCompany) return [];
      let query = supabase
        .from("ar_receipts")
        .select(`
          id, amount, receipt_date, customer_id, business_unit_code, notes, reference, payment_method, cheque_number,
          customers ( id, customer_name ),
          ar_receipt_allocations (
            id, allocated_amount,
            ar_invoices ( invoice_number, notes, total_amount )
          )
        `)
        .eq("company_id", selectedCompany.id)
        .gte("receipt_date", dateFrom)
        .lte("receipt_date", dateTo)
        .eq("status", "posted");

      if (businessUnit !== "all") {
        query = query.eq("business_unit_code", businessUnit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCompany
  });

  // Fetch AP Payments
  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ["ap_payments_summary", selectedCompany?.id, dateFrom, dateTo, businessUnit],
    queryFn: async () => {
      if (!selectedCompany) return [];
      let query = supabase
        .from("ap_payments")
        .select(`
          id, amount, payment_date, vendor_id, business_unit_code, payee_type, notes, reference, payment_method, cheque_number, vendor_bill_number,
          vendors ( id, vendor_name ),
          ap_payment_allocations (
            id, allocated_amount,
            ap_invoices ( invoice_number, notes, total_amount )
          )
        `)
        .eq("company_id", selectedCompany.id)
        .gte("payment_date", dateFrom)
        .lte("payment_date", dateTo)
        .eq("status", "posted");

      if (businessUnit !== "all") {
        query = query.eq("business_unit_code", businessUnit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCompany
  });

  const totalReceipts = receipts.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const totalPayments = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const netCash = totalReceipts - totalPayments;

  // Group receipts by customer
  const customerTotals: Record<string, { id: string; name: string; total: number; count: number }> = {};
  receipts.forEach(r => {
    if (!r.customers) return;
    const cid = r.customers.id;
    if (!customerTotals[cid]) {
      customerTotals[cid] = { id: cid, name: r.customers.customer_name, total: 0, count: 0 };
    }
    customerTotals[cid].total += Number(r.amount || 0);
    customerTotals[cid].count += 1;
  });
  const sortedCustomers = Object.values(customerTotals).sort((a, b) => b.total - a.total);

  // Group payments by vendor
  const vendorTotals: Record<string, { id: string; name: string; total: number; count: number }> = {};
  payments.forEach(p => {
    if (!p.vendors) return;
    const vid = p.vendors.id;
    if (!vendorTotals[vid]) {
      vendorTotals[vid] = { id: vid, name: p.vendors.vendor_name, total: 0, count: 0 };
    }
    vendorTotals[vid].total += Number(p.amount || 0);
    vendorTotals[vid].count += 1;
  });
  const sortedVendors = Object.values(vendorTotals).sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6">
      {/* Header Filters */}
      <div className="flex flex-wrap gap-4 items-end justify-between">
        <div className="flex gap-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">From</label>
            <Input 
              type="date" 
              value={dateFrom} 
              onChange={e => setDateFrom(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">To</label>
            <Input 
              type="date" 
              value={dateTo} 
              onChange={e => setDateTo(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">Business Unit</label>
            <Select value={businessUnit} onValueChange={setBusinessUnit}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Units</SelectItem>
                <SelectItem value="BU01">BU01 - Main</SelectItem>
                <SelectItem value="BU02">BU02 - Transport</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <FileText className="h-4 w-4" /> Excel
          </Button>
          <Button className="gap-2">
            <Download className="h-4 w-4" /> PDF
          </Button>
        </div>
      </div>

      {/* Main Panel Banner */}
      <Card className="bg-slate-900 text-white p-6 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-2xl font-bold">Receipts & Payments Summary</h2>
          <p className="text-slate-300 mt-1 flex items-center gap-2">
            📅 {format(parseISO(dateFrom), "dd MMM yyyy")} &rarr; {format(parseISO(dateTo), "dd MMM yyyy")}
          </p>
        </div>
        <Wallet className="absolute right-6 top-6 h-20 w-20 text-slate-800 opacity-50" />
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="p-4 border-l-4 border-l-green-500">
          <div className="flex justify-between items-start">
            <p className="text-sm text-muted-foreground">Total Receipts</p>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </div>
          <h3 className="text-2xl font-bold mt-2 text-green-600">
            <CurrencyDisplay amount={totalReceipts} />
          </h3>
        </Card>

        <Card className="p-4 border-l-4 border-l-red-500">
          <div className="flex justify-between items-start">
            <p className="text-sm text-muted-foreground">Total Payments</p>
            <TrendingDown className="h-5 w-5 text-red-500" />
          </div>
          <h3 className="text-2xl font-bold mt-2 text-red-600">
            <CurrencyDisplay amount={totalPayments} />
          </h3>
        </Card>

        <Card className="p-4 border-l-4 border-l-primary">
          <div className="flex justify-between items-start">
            <p className="text-sm text-muted-foreground">Net Cash Movement</p>
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <h3 className={`text-2xl font-bold mt-2 ${netCash >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            <CurrencyDisplay amount={netCash} />
          </h3>
        </Card>

        <Card className="p-4">
          <div className="flex justify-between items-start">
            <p className="text-sm text-muted-foreground">Receipt : Payment Ratio</p>
            <Minus className="h-5 w-5 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold mt-2">
            {totalPayments === 0 ? "∞" : (totalReceipts / totalPayments).toFixed(2)}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            {totalReceipts > totalPayments ? "Surplus generation" : "Spending exceeds receipts"}
          </p>
        </Card>
      </div>

      {/* 2-Column Layout */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Left Column: Lists */}
        <div className="md:col-span-1 space-y-6">
          {/* Customers List */}
          <Card className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="h-4 w-4 text-green-600" /> Customers
                <Badge variant="outline">{sortedCustomers.length}</Badge>
              </h3>
              <span className="font-semibold text-green-600 text-sm">
                <CurrencyDisplay amount={totalReceipts} />
              </span>
            </div>
            {sortedCustomers.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground bg-slate-50 rounded-md">
                No receipts in period
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {sortedCustomers.map(c => (
                  <div 
                    key={c.id} 
                    className={`flex justify-between items-center p-2 rounded-md hover:bg-slate-100 cursor-pointer transition-colors ${selectedEntity?.id === c.id ? 'bg-slate-100 border-l-2 border-green-500' : ''}`}
                    onClick={() => setSelectedEntity({ id: c.id, name: c.name, type: 'customer' })}
                  >
                    <span className="text-sm truncate pr-2" title={c.name}>{c.name}</span>
                    <span className="text-sm font-medium text-green-600"><CurrencyDisplay amount={c.total} /></span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Vendors List */}
          <Card className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-red-500" /> Vendors
                <Badge variant="outline">{sortedVendors.length}</Badge>
              </h3>
              <span className="font-semibold text-red-600 text-sm">
                <CurrencyDisplay amount={totalPayments} />
              </span>
            </div>
            {sortedVendors.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground bg-slate-50 rounded-md">
                No payments in period
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {sortedVendors.map(v => (
                  <div 
                    key={v.id} 
                    className={`flex justify-between items-center p-2 rounded-md hover:bg-slate-100 cursor-pointer transition-colors ${selectedEntity?.id === v.id ? 'bg-slate-100 border-l-2 border-red-500' : ''}`}
                    onClick={() => setSelectedEntity({ id: v.id, name: v.name, type: 'vendor' })}
                  >
                    <span className="text-sm truncate pr-2" title={v.name}>{v.name}</span>
                    <span className="text-sm font-medium text-red-600"><CurrencyDisplay amount={v.total} /></span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Breakdown */}
        <div className="md:col-span-2">
          {!selectedEntity ? (
            <Card className="h-full min-h-[400px] flex flex-col items-center justify-center text-muted-foreground bg-slate-50/50">
              <Wallet className="h-16 w-16 mb-4 opacity-20" />
              <p>Select a customer or vendor to see the breakdown</p>
            </Card>
          ) : (
            <Card className="h-full min-h-[400px] p-6">
              <div className="flex justify-between items-start border-b pb-4 mb-4">
                <div>
                  <Badge variant="outline" className={selectedEntity.type === 'customer' ? 'text-green-600' : 'text-red-600'}>
                    {selectedEntity.type === 'customer' ? 'Customer' : 'Vendor'}
                  </Badge>
                  <h3 className="text-xl font-bold mt-2">{selectedEntity.name}</h3>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Period Total</p>
                  <h4 className={`text-xl font-bold ${selectedEntity.type === 'customer' ? 'text-green-600' : 'text-red-600'}`}>
                    <CurrencyDisplay amount={selectedEntity.type === 'customer' ? (customerTotals[selectedEntity.id]?.total || 0) : (vendorTotals[selectedEntity.id]?.total || 0)} />
                  </h4>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-sm text-muted-foreground">Transaction Breakdown</h4>
                
                {selectedEntity.type === 'customer' ? (
                  <div className="rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b">
                        <tr>
                          <th className="p-3 text-left font-medium">Date</th>
                          <th className="p-3 text-left font-medium">Receipt #</th>
                          <th className="p-3 text-left font-medium">Method</th>
                          <th className="p-3 text-left font-medium w-1/3">Description</th>
                          <th className="p-3 text-right font-medium">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {receipts.filter(r => r.customers?.id === selectedEntity.id).map(r => (
                          <React.Fragment key={r.id}>
                            <tr className="border-b last:border-0 hover:bg-slate-50">
                              <td className="p-3 whitespace-nowrap">{format(new Date(r.receipt_date), "MMM dd, yyyy")}</td>
                              <td className="p-3">
                                <div className="font-medium text-blue-600">{r.id.substring(0,8).toUpperCase()}</div>
                                {r.reference && <div className="text-xs text-muted-foreground mt-0.5">Ref: {r.reference}</div>}
                              </td>
                              <td className="p-3">
                                <div className="capitalize">{r.payment_method?.replace('_', ' ') || 'N/A'}</div>
                                {r.cheque_number && <div className="text-xs text-muted-foreground mt-0.5">Chq: {r.cheque_number}</div>}
                              </td>
                              <td className="p-3">
                                <p className="text-sm text-muted-foreground line-clamp-2" title={r.notes || ''}>{r.notes || '-'}</p>
                              </td>
                              <td className="p-3 text-right font-medium text-green-600 whitespace-nowrap">
                                <CurrencyDisplay amount={r.amount} />
                              </td>
                            </tr>
                            {r.ar_receipt_allocations && r.ar_receipt_allocations.length > 0 && (
                              <tr className="bg-slate-50/30 border-b">
                                <td colSpan={5} className="p-0">
                                  <div className="px-4 py-3 border-l-2 border-l-blue-400 ml-6 mr-4 my-2 bg-white rounded shadow-sm text-sm border border-slate-100">
                                    <h5 className="font-semibold text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">Invoice Allocations</h5>
                                    <table className="w-full text-xs">
                                      <thead className="text-muted-foreground border-b pb-1">
                                        <tr>
                                          <th className="text-left font-medium pb-1">Invoice #</th>
                                          <th className="text-left font-medium pb-1">Details</th>
                                          <th className="text-right font-medium pb-1">Invoice Total</th>
                                          <th className="text-right font-medium pb-1">Allocated Amount</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {r.ar_receipt_allocations.map((alloc: any) => (
                                          <tr key={alloc.id} className="border-b border-slate-50 last:border-0">
                                            <td className="py-1.5 font-medium">{alloc.ar_invoices?.invoice_number || 'Unknown'}</td>
                                            <td className="py-1.5 text-muted-foreground truncate max-w-[200px]" title={alloc.ar_invoices?.notes || ''}>{alloc.ar_invoices?.notes || '-'}</td>
                                            <td className="py-1.5 text-right"><CurrencyDisplay amount={alloc.ar_invoices?.total_amount} /></td>
                                            <td className="py-1.5 text-right font-medium text-green-600"><CurrencyDisplay amount={alloc.allocated_amount} /></td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b">
                        <tr>
                          <th className="p-3 text-left font-medium">Date</th>
                          <th className="p-3 text-left font-medium">Payment #</th>
                          <th className="p-3 text-left font-medium">Method</th>
                          <th className="p-3 text-left font-medium w-1/3">Description</th>
                          <th className="p-3 text-right font-medium">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.filter(p => p.vendors?.id === selectedEntity.id).map(p => (
                          <React.Fragment key={p.id}>
                            <tr className="border-b last:border-0 hover:bg-slate-50">
                              <td className="p-3 whitespace-nowrap">{format(new Date(p.payment_date), "MMM dd, yyyy")}</td>
                              <td className="p-3">
                                <div className="font-medium text-blue-600">{p.id.substring(0,8).toUpperCase()}</div>
                                {(p.reference || p.vendor_bill_number) && (
                                  <div className="text-xs text-muted-foreground mt-0.5">
                                    Ref: {p.vendor_bill_number || p.reference}
                                  </div>
                                )}
                              </td>
                              <td className="p-3">
                                <div className="capitalize">{p.payment_method?.replace('_', ' ') || 'N/A'}</div>
                                {p.cheque_number && <div className="text-xs text-muted-foreground mt-0.5">Chq: {p.cheque_number}</div>}
                              </td>
                              <td className="p-3">
                                <p className="text-sm text-muted-foreground line-clamp-2" title={p.notes || ''}>{p.notes || '-'}</p>
                              </td>
                              <td className="p-3 text-right font-medium text-red-600 whitespace-nowrap">
                                <CurrencyDisplay amount={p.amount} />
                              </td>
                            </tr>
                            {p.ap_payment_allocations && p.ap_payment_allocations.length > 0 && (
                              <tr className="bg-slate-50/30 border-b">
                                <td colSpan={5} className="p-0">
                                  <div className="px-4 py-3 border-l-2 border-l-blue-400 ml-6 mr-4 my-2 bg-white rounded shadow-sm text-sm border border-slate-100">
                                    <h5 className="font-semibold text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">Bill Allocations</h5>
                                    <table className="w-full text-xs">
                                      <thead className="text-muted-foreground border-b pb-1">
                                        <tr>
                                          <th className="text-left font-medium pb-1">Bill #</th>
                                          <th className="text-left font-medium pb-1">Details</th>
                                          <th className="text-right font-medium pb-1">Bill Total</th>
                                          <th className="text-right font-medium pb-1">Allocated Amount</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {p.ap_payment_allocations.map((alloc: any) => (
                                          <tr key={alloc.id} className="border-b border-slate-50 last:border-0">
                                            <td className="py-1.5 font-medium">{alloc.ap_invoices?.invoice_number || 'Unknown'}</td>
                                            <td className="py-1.5 text-muted-foreground truncate max-w-[200px]" title={alloc.ap_invoices?.notes || ''}>{alloc.ap_invoices?.notes || '-'}</td>
                                            <td className="py-1.5 text-right"><CurrencyDisplay amount={alloc.ap_invoices?.total_amount} /></td>
                                            <td className="py-1.5 text-right font-medium text-red-600"><CurrencyDisplay amount={alloc.allocated_amount} /></td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
