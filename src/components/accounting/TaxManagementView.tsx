import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Download, Settings } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTaxCodes, useARInvoices, useAPInvoices } from "@/hooks/useAccountingData";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";

export const TaxManagementView = () => {
  const { data: taxCodes, isLoading: taxCodesLoading } = useTaxCodes();
  const { data: arInvoices } = useARInvoices();
  const { data: apInvoices } = useAPInvoices();

  // Calculate VAT from AR invoices (Output VAT - Sales)
  const outputVATData = arInvoices?.filter(inv => (inv.tax_amount || 0) > 0).map(inv => ({
    id: inv.id,
    date: inv.invoice_date,
    invoice_number: inv.invoice_number,
    customer_vendor: inv.customers?.customer_name || "Unknown",
    type: "Output VAT",
    base_amount: inv.subtotal || inv.total_amount - (inv.tax_amount || 0),
    vat_rate: 18, // Sri Lanka standard VAT
    vat_amount: inv.tax_amount || 0,
    total_amount: inv.total_amount,
    status: inv.status === "paid" ? "Filed" : "Pending",
  })) || [];

  // Calculate VAT from AP invoices (Input VAT - Purchases)
  const inputVATData = apInvoices?.filter(inv => (inv.tax_amount || 0) > 0).map(inv => ({
    id: inv.id,
    date: inv.invoice_date,
    invoice_number: inv.invoice_number,
    customer_vendor: inv.vendors?.vendor_name || "Unknown",
    type: "Input VAT",
    base_amount: inv.subtotal || inv.total_amount - (inv.tax_amount || 0),
    vat_rate: 18,
    vat_amount: inv.tax_amount || 0,
    total_amount: inv.total_amount,
    status: inv.status === "paid" ? "Claimed" : "Pending",
  })) || [];

  // Combine VAT transactions
  const vatTransactions = [...outputVATData, ...inputVATData].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // WHT from AP payments
  const whtTransactions = apInvoices?.filter(inv => (inv.wht_amount || 0) > 0).map(inv => ({
    id: inv.id,
    date: inv.invoice_date,
    payment_number: inv.invoice_number,
    vendor: inv.vendors?.vendor_name || "Unknown",
    service_type: "Services",
    gross_amount: inv.total_amount,
    wht_rate: inv.wht_amount && inv.total_amount ? Math.round((inv.wht_amount / inv.total_amount) * 100) : 5,
    wht_amount: inv.wht_amount || 0,
    net_amount: inv.total_amount - (inv.wht_amount || 0),
    status: inv.status === "paid" ? "Remitted" : "Withheld",
  })) || [];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      Filed: "default",
      Pending: "outline",
      Claimed: "default",
      Withheld: "secondary",
      Remitted: "default",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const taxCodeColumns = [
    {
      accessorKey: "tax_code",
      header: "Tax Code",
      cell: ({ row }: any) => <span className="font-mono font-medium">{row.original.tax_code}</span>,
    },
    {
      accessorKey: "tax_name",
      header: "Tax Name",
    },
    {
      accessorKey: "tax_type",
      header: "Type",
      cell: ({ row }: any) => (
        <Badge variant="outline">{row.original.tax_type?.toUpperCase()}</Badge>
      ),
    },
    {
      accessorKey: "rate",
      header: "Rate",
      cell: ({ row }: any) => <span className="font-semibold">{row.original.rate}%</span>,
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }: any) => (
        <Badge variant={row.original.is_active ? "default" : "destructive"}>
          {row.original.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
    },
  ];

  const vatColumns = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }: any) => format(new Date(row.original.date), "MMM dd, yyyy"),
    },
    {
      accessorKey: "invoice_number",
      header: "Invoice #",
    },
    {
      accessorKey: "customer_vendor",
      header: "Customer/Vendor",
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }: any) => (
        <Badge variant={row.original.type === "Output VAT" ? "default" : "secondary"}>
          {row.original.type}
        </Badge>
      ),
    },
    {
      accessorKey: "base_amount",
      header: "Base Amount",
      cell: ({ row }: any) => <CurrencyDisplay amount={row.original.base_amount} />,
    },
    {
      accessorKey: "vat_rate",
      header: "VAT %",
      cell: ({ row }: any) => <span>{row.original.vat_rate}%</span>,
    },
    {
      accessorKey: "vat_amount",
      header: "VAT Amount",
      cell: ({ row }: any) => (
        <span className="font-semibold text-primary">
          <CurrencyDisplay amount={row.original.vat_amount} />
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => getStatusBadge(row.original.status),
    },
  ];

  const whtColumns = [
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }: any) => format(new Date(row.original.date), "MMM dd, yyyy"),
    },
    {
      accessorKey: "payment_number",
      header: "Invoice #",
    },
    {
      accessorKey: "vendor",
      header: "Vendor",
    },
    {
      accessorKey: "service_type",
      header: "Service Type",
    },
    {
      accessorKey: "gross_amount",
      header: "Gross Amount",
      cell: ({ row }: any) => <CurrencyDisplay amount={row.original.gross_amount} />,
    },
    {
      accessorKey: "wht_rate",
      header: "WHT %",
      cell: ({ row }: any) => <span>{row.original.wht_rate}%</span>,
    },
    {
      accessorKey: "wht_amount",
      header: "WHT Amount",
      cell: ({ row }: any) => (
        <span className="font-semibold text-orange-600">
          <CurrencyDisplay amount={row.original.wht_amount} />
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }: any) => getStatusBadge(row.original.status),
    },
  ];

  const totalOutputVAT = outputVATData.reduce((sum, t) => sum + t.vat_amount, 0);
  const totalInputVAT = inputVATData.reduce((sum, t) => sum + t.vat_amount, 0);
  const netVATPayable = totalOutputVAT - totalInputVAT;
  const totalWHT = whtTransactions.reduce((sum, t) => sum + t.wht_amount, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Output VAT (Sales)</p>
          <h3 className="text-2xl font-bold text-primary mt-2">
            <CurrencyDisplay amount={totalOutputVAT} />
          </h3>
          <p className="text-xs text-muted-foreground mt-1">{outputVATData.length} transactions</p>
        </Card>

        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Input VAT (Purchases)</p>
          <h3 className="text-2xl font-bold text-secondary-foreground mt-2">
            <CurrencyDisplay amount={totalInputVAT} />
          </h3>
          <p className="text-xs text-muted-foreground mt-1">{inputVATData.length} transactions</p>
        </Card>

        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Net VAT Payable</p>
          <h3 className={`text-2xl font-bold mt-2 ${netVATPayable >= 0 ? "text-destructive" : "text-green-600"}`}>
            <CurrencyDisplay amount={Math.abs(netVATPayable)} />
            {netVATPayable < 0 && <span className="text-sm ml-1">(Refund)</span>}
          </h3>
        </Card>

        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total WHT Withheld</p>
          <h3 className="text-2xl font-bold text-orange-600 mt-2">
            <CurrencyDisplay amount={totalWHT} />
          </h3>
          <p className="text-xs text-muted-foreground mt-1">{whtTransactions.length} payments</p>
        </Card>
      </div>

      {/* Tax Management Tabs */}
      <Tabs defaultValue="taxcodes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="taxcodes">Tax Codes</TabsTrigger>
          <TabsTrigger value="vat">VAT Transactions</TabsTrigger>
          <TabsTrigger value="wht">Withholding Tax (WHT)</TabsTrigger>
          <TabsTrigger value="reports">Tax Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="taxcodes">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">Tax Codes Configuration</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage tax codes for VAT, WHT, SSCL and other taxes
                </p>
              </div>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Tax Code
              </Button>
            </div>

            <DataTable enableColumnFilters 
              columns={taxCodeColumns} 
              data={taxCodes || []} 
              searchKey="tax_name" 
            />
          </Card>
        </TabsContent>

        <TabsContent value="vat">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">VAT Transactions</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Track and manage Value Added Tax (18% standard rate)
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export VAT Return
                </Button>
              </div>
            </div>

            <DataTable enableColumnFilters columns={vatColumns} data={vatTransactions} searchKey="customer_vendor" />
          </Card>
        </TabsContent>

        <TabsContent value="wht">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold">Withholding Tax (WHT)</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage withholding tax on payments to vendors and contractors
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export WHT Certificates
                </Button>
              </div>
            </div>

            <DataTable enableColumnFilters columns={whtColumns} data={whtTransactions} searchKey="vendor" />
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          <Card className="p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold">Tax Reports & Compliance</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Generate statutory tax reports for Sri Lanka Inland Revenue Department
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="p-4 border-2 hover:border-primary cursor-pointer transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">VAT Return (Form 200)</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Monthly VAT return for submission to IRD
                    </p>
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Output: <CurrencyDisplay amount={totalOutputVAT} /></span>
                      <span>Input: <CurrencyDisplay amount={totalInputVAT} /></span>
                    </div>
                  </div>
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <Button className="w-full mt-4" variant="outline">
                  Generate Report
                </Button>
              </Card>

              <Card className="p-4 border-2 hover:border-primary cursor-pointer transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">WHT Certificates</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Withholding tax certificates for vendors
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Pending: {whtTransactions.filter(w => w.status === "Withheld").length} certificates
                    </p>
                  </div>
                  <FileText className="h-8 w-8 text-orange-600" />
                </div>
                <Button className="w-full mt-4" variant="outline">
                  Generate Certificates
                </Button>
              </Card>

              <Card className="p-4 border-2 hover:border-primary cursor-pointer transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">SSCL Report</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Social Security Contribution Levy reporting
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Rate: 2.5% on turnover
                    </p>
                  </div>
                  <FileText className="h-8 w-8 text-secondary" />
                </div>
                <Button className="w-full mt-4" variant="outline">
                  Generate Report
                </Button>
              </Card>

              <Card className="p-4 border-2 hover:border-primary cursor-pointer transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">Tax Audit Trail</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Complete audit trail of all tax transactions
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {vatTransactions.length + whtTransactions.length} total transactions
                    </p>
                  </div>
                  <FileText className="h-8 w-8 text-green-600" />
                </div>
                <Button className="w-full mt-4" variant="outline">
                  View Audit Trail
                </Button>
              </Card>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
