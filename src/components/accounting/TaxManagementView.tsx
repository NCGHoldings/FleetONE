import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Download } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const TaxManagementView = () => {
    const [selectedPeriod, setSelectedPeriod] = useState("current");

    // Mock data for demonstration
    const vatTransactions = [
        {
            id: "1",
            date: "2026-01-15",
            invoice_number: "INV-2026-001",
            customer_vendor: "ABC Transport Ltd",
            type: "Output VAT",
            base_amount: 100000,
            vat_rate: 15,
            vat_amount: 15000,
            total_amount: 115000,
            status: "Filed",
        },
        {
            id: "2",
            date: "2026-01-18",
            invoice_number: "BILL-2026-045",
            customer_vendor: "Fuel Suppliers (Pvt) Ltd",
            type: "Input VAT",
            base_amount: 50000,
            vat_rate: 15,
            vat_amount: 7500,
            total_amount: 57500,
            status: "Pending",
        },
    ];

    const whtTransactions = [
        {
            id: "1",
            date: "2026-01-20",
            payment_number: "PAY-2026-012",
            vendor: "Professional Services Ltd",
            service_type: "Consulting",
            gross_amount: 200000,
            wht_rate: 5,
            wht_amount: 10000,
            net_amount: 190000,
            status: "Withheld",
        },
    ];

    const getStatusBadge = (status: string) => {
        const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
            Filed: "default",
            Pending: "outline",
            Withheld: "secondary",
            Paid: "default",
        };
        return <Badge variant={variants[status] || "default"}>{status}</Badge>;
    };

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
            cell: ({ row }: any) => (
                <span>LKR {row.original.base_amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            ),
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
                    LKR {row.original.vat_amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
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
            header: "Payment #",
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
            cell: ({ row }: any) => (
                <span>LKR {row.original.gross_amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            ),
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
                <span className="font-semibold text-destructive">
                    LKR {row.original.wht_amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
            ),
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }: any) => getStatusBadge(row.original.status),
        },
    ];

    const totalOutputVAT = vatTransactions
        .filter((t) => t.type === "Output VAT")
        .reduce((sum, t) => sum + t.vat_amount, 0);

    const totalInputVAT = vatTransactions
        .filter((t) => t.type === "Input VAT")
        .reduce((sum, t) => sum + t.vat_amount, 0);

    const netVATPayable = totalOutputVAT - totalInputVAT;

    const totalWHT = whtTransactions.reduce((sum, t) => sum + t.wht_amount, 0);

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card className="p-4">
                    <p className="text-sm text-muted-foreground">Output VAT (Sales)</p>
                    <h3 className="text-2xl font-bold text-primary mt-2">
                        LKR {totalOutputVAT.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </h3>
                </Card>

                <Card className="p-4">
                    <p className="text-sm text-muted-foreground">Input VAT (Purchases)</p>
                    <h3 className="text-2xl font-bold text-secondary mt-2">
                        LKR {totalInputVAT.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </h3>
                </Card>

                <Card className="p-4">
                    <p className="text-sm text-muted-foreground">Net VAT Payable</p>
                    <h3 className="text-2xl font-bold text-destructive mt-2">
                        LKR {netVATPayable.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </h3>
                </Card>

                <Card className="p-4">
                    <p className="text-sm text-muted-foreground">Total WHT Withheld</p>
                    <h3 className="text-2xl font-bold text-orange-600 mt-2">
                        LKR {totalWHT.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </h3>
                </Card>
            </div>

            {/* Tax Management Tabs */}
            <Tabs defaultValue="vat" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="vat">VAT Management</TabsTrigger>
                    <TabsTrigger value="wht">Withholding Tax (WHT)</TabsTrigger>
                    <TabsTrigger value="reports">Tax Reports</TabsTrigger>
                </TabsList>

                <TabsContent value="vat">
                    <Card className="p-6">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-2xl font-bold">VAT Transactions</h2>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Track and manage Value Added Tax (15% standard rate)
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline">
                                    <Download className="h-4 w-4 mr-2" />
                                    Export VAT Return
                                </Button>
                                <Button>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Record VAT Transaction
                                </Button>
                            </div>
                        </div>

                        <DataTable columns={vatColumns} data={vatTransactions} searchKey="customer_vendor" />
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
                                    Export WHT Certificate
                                </Button>
                                <Button>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Record WHT Payment
                                </Button>
                            </div>
                        </div>

                        <DataTable columns={whtColumns} data={whtTransactions} searchKey="vendor" />
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
                                        <p className="text-xs text-muted-foreground mt-2">
                                            Last filed: December 2025
                                        </p>
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
                                        <h3 className="font-semibold text-lg">WHT Certificate</h3>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            Withholding tax certificates for vendors
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-2">
                                            Pending: 3 certificates
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
                                            Compliance ready
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
