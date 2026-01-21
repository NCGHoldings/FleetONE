import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { FileText, Download, Printer, Calculator } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";

type TaxType = "vat" | "sscl" | "wht";
type PeriodOption = "current" | "previous" | "custom";

export const TaxReturnGeneratorView = () => {
  const [taxType, setTaxType] = useState<TaxType>("vat");
  const [periodOption, setPeriodOption] = useState<PeriodOption>("current");

  const getPeriodDates = () => {
    const now = new Date();
    switch (periodOption) {
      case "current":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "previous":
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const { start, end } = getPeriodDates();

  // Fetch VAT data
  const { data: vatData } = useQuery({
    queryKey: ["vat-return-data", start, end],
    queryFn: async () => {
      // Output VAT from AR invoices
      const { data: arData, error: arError } = await supabase
        .from("ar_invoices")
        .select("subtotal, tax_amount")
        .gte("invoice_date", start.toISOString())
        .lte("invoice_date", end.toISOString())
        .eq("status", "posted");
      
      if (arError) throw arError;

      // Input VAT from AP invoices
      const { data: apData, error: apError } = await supabase
        .from("ap_invoices")
        .select("subtotal, tax_amount")
        .gte("invoice_date", start.toISOString())
        .lte("invoice_date", end.toISOString())
        .eq("status", "posted");
      
      if (apError) throw apError;

      const outputVat = arData?.reduce((sum, inv) => sum + (inv.tax_amount || 0), 0) || 0;
      const inputVat = apData?.reduce((sum, inv) => sum + (inv.tax_amount || 0), 0) || 0;
      const salesValue = arData?.reduce((sum, inv) => sum + (inv.subtotal || 0), 0) || 0;
      const purchaseValue = apData?.reduce((sum, inv) => sum + (inv.subtotal || 0), 0) || 0;

      return {
        salesValue,
        outputVat,
        purchaseValue,
        inputVat,
        netVat: outputVat - inputVat,
      };
    },
    enabled: taxType === "vat",
  });

  // Fetch SSCL data
  const { data: ssclData } = useQuery({
    queryKey: ["sscl-return-data", start, end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sscl_transactions")
        .select("*")
        .gte("transaction_date", start.toISOString())
        .lte("transaction_date", end.toISOString());
      
      if (error) throw error;

      const totalGross = data?.reduce((sum, t) => sum + (t.gross_amount || 0), 0) || 0;
      const totalSscl = data?.reduce((sum, t) => sum + (t.sscl_amount || 0), 0) || 0;

      return {
        transactions: data || [],
        totalGross,
        totalSscl,
      };
    },
    enabled: taxType === "sscl",
  });

  // Fetch WHT data
  const { data: whtData } = useQuery({
    queryKey: ["wht-return-data", start, end],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wht_certificates")
        .select("*, vendors(vendor_name)")
        .gte("certificate_date", start.toISOString())
        .lte("certificate_date", end.toISOString());
      
      if (error) throw error;

      const totalWht = data?.reduce((sum, c) => sum + (c.wht_amount || 0), 0) || 0;

      return {
        certificates: data || [],
        totalWht,
      };
    },
    enabled: taxType === "wht",
  });

  const handleExport = () => {
    // Placeholder for PDF export
    console.log("Exporting tax return...");
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">Tax Return Generator</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Generate VAT, SSCL, and WHT returns for regulatory compliance
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mb-6">
          <div className="space-y-2">
            <Label>Tax Type</Label>
            <Select value={taxType} onValueChange={(v) => setTaxType(v as TaxType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vat">VAT Return</SelectItem>
                <SelectItem value="sscl">SSCL Return</SelectItem>
                <SelectItem value="wht">WHT Summary</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Period</Label>
            <Select value={periodOption} onValueChange={(v) => setPeriodOption(v as PeriodOption)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Current Month ({format(start, "MMMM yyyy")})</SelectItem>
                <SelectItem value="previous">Previous Month ({format(subMonths(new Date(), 1), "MMMM yyyy")})</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg mb-6">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-5 w-5 text-primary" />
            <span className="font-semibold">
              {taxType === "vat" && "VAT Return"}
              {taxType === "sscl" && "SSCL Return"}
              {taxType === "wht" && "WHT Summary"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Period: {format(start, "dd MMM yyyy")} - {format(end, "dd MMM yyyy")}
          </p>
        </div>

        {/* VAT Return */}
        {taxType === "vat" && vatData && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Total Sales Value</p>
                <p className="text-2xl font-bold mt-1">
                  <CurrencyDisplay amount={vatData.salesValue} />
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Output VAT</p>
                <p className="text-2xl font-bold mt-1 text-orange-600">
                  <CurrencyDisplay amount={vatData.outputVat} />
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Total Purchases Value</p>
                <p className="text-2xl font-bold mt-1">
                  <CurrencyDisplay amount={vatData.purchaseValue} />
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Input VAT</p>
                <p className="text-2xl font-bold mt-1 text-green-600">
                  <CurrencyDisplay amount={vatData.inputVat} />
                </p>
              </Card>
            </div>

            <Card className="p-6 bg-primary/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Calculator className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Net VAT {vatData.netVat >= 0 ? "Payable" : "Refundable"}</p>
                    <p className={`text-3xl font-bold ${vatData.netVat >= 0 ? "text-destructive" : "text-green-600"}`}>
                      <CurrencyDisplay amount={Math.abs(vatData.netVat)} />
                    </p>
                  </div>
                </div>
                <Badge variant={vatData.netVat >= 0 ? "destructive" : "default"}>
                  {vatData.netVat >= 0 ? "Payable to IRD" : "Refund Due"}
                </Badge>
              </div>
            </Card>
          </div>
        )}

        {/* SSCL Return */}
        {taxType === "sscl" && ssclData && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">Total Taxable Value</p>
                <p className="text-2xl font-bold mt-1">
                  <CurrencyDisplay amount={ssclData.totalGross} />
                </p>
              </Card>
              <Card className="p-4 bg-destructive/10">
                <p className="text-sm text-muted-foreground">Total SSCL Payable</p>
                <p className="text-2xl font-bold mt-1 text-destructive">
                  <CurrencyDisplay amount={ssclData.totalSscl} />
                </p>
              </Card>
            </div>

            {ssclData.transactions.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Reference Type</TableHead>
                    <TableHead className="text-right">Gross Amount</TableHead>
                    <TableHead className="text-right">SSCL Rate</TableHead>
                    <TableHead className="text-right">SSCL Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ssclData.transactions.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{format(new Date(t.transaction_date), "dd MMM yyyy")}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{t.reference_type}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <CurrencyDisplay amount={t.gross_amount} />
                      </TableCell>
                      <TableCell className="text-right">{t.sscl_rate}%</TableCell>
                      <TableCell className="text-right">
                        <CurrencyDisplay amount={t.sscl_amount} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}

        {/* WHT Summary */}
        {taxType === "wht" && whtData && (
          <div className="space-y-6">
            <Card className="p-4 bg-primary/5">
              <p className="text-sm text-muted-foreground">Total WHT Withheld</p>
              <p className="text-2xl font-bold mt-1">
                <CurrencyDisplay amount={whtData.totalWht} />
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {whtData.certificates.length} certificate(s) issued
              </p>
            </Card>

            {whtData.certificates.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Certificate #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-right">Gross Amount</TableHead>
                    <TableHead className="text-right">WHT Rate</TableHead>
                    <TableHead className="text-right">WHT Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {whtData.certificates.map((cert) => (
                    <TableRow key={cert.id}>
                      <TableCell className="font-medium">{cert.certificate_number}</TableCell>
                      <TableCell>{format(new Date(cert.certificate_date), "dd MMM yyyy")}</TableCell>
                      <TableCell>{(cert as any).vendors?.vendor_name || "-"}</TableCell>
                      <TableCell className="text-right">
                        <CurrencyDisplay amount={cert.gross_amount} />
                      </TableCell>
                      <TableCell className="text-right">{cert.wht_rate}%</TableCell>
                      <TableCell className="text-right">
                        <CurrencyDisplay amount={cert.wht_amount} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};
