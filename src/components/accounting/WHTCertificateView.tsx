import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Download, Printer } from "lucide-react";
import { useVendors, useWHTCertificates } from "@/hooks/useAccountingData";
import { useCreateWHTCertificate } from "@/hooks/useAccountingMutations";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { format } from "date-fns";
import { toast } from "sonner";

export const WHTCertificateView = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [vendorId, setVendorId] = useState("");
  const [certificateNumber, setCertificateNumber] = useState("");
  const [certificateDate, setCertificateDate] = useState(new Date().toISOString().split("T")[0]);
  const [whtAmount, setWhtAmount] = useState("");
  const [taxPeriod, setTaxPeriod] = useState("");

  const { data: vendors = [] } = useVendors();
  const { data: certificates = [] } = useWHTCertificates();
  const createCertificate = useCreateWHTCertificate();

  const handleSubmit = async () => {
    if (!vendorId || !certificateNumber || !whtAmount) return;

    await createCertificate.mutateAsync({
      vendor_id: vendorId,
      certificate_number: certificateNumber,
      certificate_date: certificateDate,
      wht_amount: parseFloat(whtAmount),
      tax_period: taxPeriod || undefined,
    });

    setDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setVendorId("");
    setCertificateNumber("");
    setCertificateDate(new Date().toISOString().split("T")[0]);
    setWhtAmount("");
    setTaxPeriod("");
  };

  const handlePrint = (certId: string) => {
    toast.info("Generating certificate PDF...");
    // In a real implementation, this would generate a PDF
  };

  const generateCertNumber = () => {
    const year = new Date().getFullYear();
    const num = String(certificates.length + 1).padStart(4, "0");
    setCertificateNumber(`WHT-${year}-${num}`);
  };

  const totalWHT = certificates.reduce((sum: number, c: any) => sum + (c.wht_amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">WHT Certificates</h2>
          <p className="text-muted-foreground">Issue and manage Withholding Tax certificates</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Issue Certificate
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Issue WHT Certificate</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Vendor</Label>
                <Select value={vendorId} onValueChange={setVendorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.filter((v: any) => v.wht_applicable).map((vendor: any) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.vendor_code} - {vendor.vendor_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Certificate Number</Label>
                <div className="flex gap-2">
                  <Input
                    value={certificateNumber}
                    onChange={(e) => setCertificateNumber(e.target.value)}
                    placeholder="WHT-2024-0001"
                  />
                  <Button variant="outline" type="button" onClick={generateCertNumber}>
                    Generate
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Certificate Date</Label>
                  <Input
                    type="date"
                    value={certificateDate}
                    onChange={(e) => setCertificateDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tax Period</Label>
                  <Select value={taxPeriod} onValueChange={setTaxPeriod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      {["Q1", "Q2", "Q3", "Q4"].map((q) => (
                        <SelectItem key={q} value={`${new Date().getFullYear()}-${q}`}>
                          {new Date().getFullYear()} - {q}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>WHT Amount</Label>
                <Input
                  type="number"
                  value={whtAmount}
                  onChange={(e) => setWhtAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!vendorId || !certificateNumber || !whtAmount || createCertificate.isPending}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Issue Certificate
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Certificates</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{certificates.length}</div>
            <p className="text-xs text-muted-foreground">Issued this year</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total WHT Withheld</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <CurrencyDisplay amount={totalWHT} />
            </div>
            <p className="text-xs text-muted-foreground">Year to date</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendors with WHT</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {vendors.filter((v: any) => v.wht_applicable).length}
            </div>
            <p className="text-xs text-muted-foreground">WHT applicable vendors</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Issued Certificates</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Certificate #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Tax Period</TableHead>
                <TableHead className="text-right">WHT Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {certificates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No WHT certificates issued
                  </TableCell>
                </TableRow>
              ) : (
                certificates.map((cert: any) => (
                  <TableRow key={cert.id}>
                    <TableCell className="font-mono font-medium">{cert.certificate_number}</TableCell>
                    <TableCell>{format(new Date(cert.certificate_date), "MMM dd, yyyy")}</TableCell>
                    <TableCell>
                      {cert.vendors?.vendor_code} - {cert.vendors?.vendor_name}
                    </TableCell>
                    <TableCell>{cert.tax_period || "-"}</TableCell>
                    <TableCell className="text-right font-mono">
                      <CurrencyDisplay amount={cert.wht_amount} />
                    </TableCell>
                    <TableCell>
                      <Badge variant={cert.status === "issued" ? "default" : "secondary"}>
                        {cert.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handlePrint(cert.id)}>
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};