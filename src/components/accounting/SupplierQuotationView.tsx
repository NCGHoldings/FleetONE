import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Eye, CheckCircle, MoreHorizontal, Scale } from "lucide-react";
import { useSupplierQuotations, useSelectSupplierQuotation } from "@/hooks/useRFQ";
import { SupplierQuotationForm } from "./SupplierQuotationForm";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { format } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export const SupplierQuotationView = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<any>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareRFQId, setCompareRFQId] = useState<string | null>(null);
  
  const { data: quotations, isLoading } = useSupplierQuotations(compareRFQId || undefined);
  const selectQuotation = useSelectSupplierQuotation();
  
  const filteredQuotations = quotations?.filter(q =>
    q.sq_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.vendors?.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.request_for_quotations?.rfq_number?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];
  
  const getStatusBadge = (status: string, isSelected: boolean) => {
    if (isSelected) {
      return <Badge className="bg-green-500">Selected</Badge>;
    }
    
    const statusColors: Record<string, string> = {
      received: "bg-blue-500/10 text-blue-600",
      under_review: "bg-yellow-500/10 text-yellow-600",
      accepted: "bg-green-500/10 text-green-600",
      rejected: "bg-destructive/10 text-destructive",
    };
    
    return (
      <Badge variant="outline" className={statusColors[status] || ""}>
        {status.replace("_", " ").charAt(0).toUpperCase() + status.replace("_", " ").slice(1)}
      </Badge>
    );
  };
  
  const handleSelectQuotation = async (quotationId: string, rfqId: string) => {
    await selectQuotation.mutateAsync({ quotationId, rfqId });
  };
  
  // Group by RFQ for comparison
  const groupedByRFQ = filteredQuotations.reduce((acc, q) => {
    const rfqId = q.rfq_id || "no-rfq";
    if (!acc[rfqId]) {
      acc[rfqId] = [];
    }
    acc[rfqId].push(q);
    return acc;
  }, {} as Record<string, typeof filteredQuotations>);
  
  // Metrics
  const totalQuotations = filteredQuotations.length;
  const selectedCount = filteredQuotations.filter(q => q.is_selected).length;
  const totalValue = filteredQuotations.reduce((sum, q) => sum + (q.total_amount || 0), 0);
  const avgValue = totalQuotations > 0 ? totalValue / totalQuotations : 0;
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Quotations</div>
            <div className="text-2xl font-bold">{totalQuotations}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Selected</div>
            <div className="text-2xl font-bold text-green-600">{selectedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Value</div>
            <div className="text-2xl font-bold">
              <CurrencyDisplay amount={totalValue} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Avg. Quote Value</div>
            <div className="text-2xl font-bold">
              <CurrencyDisplay amount={avgValue} />
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Supplier Quotations
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={compareMode ? "default" : "outline"}
              onClick={() => setCompareMode(!compareMode)}
            >
              <Scale className="h-4 w-4 mr-2" />
              {compareMode ? "Exit Compare" : "Compare Mode"}
            </Button>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Record Quotation
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Record Supplier Quotation</DialogTitle>
                </DialogHeader>
                <SupplierQuotationForm onSuccess={() => setIsFormOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by SQ number, vendor, or RFQ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {compareMode ? (
            // Comparison View
            <div className="space-y-6">
              {Object.entries(groupedByRFQ).map(([rfqId, quotes]) => (
                <div key={rfqId} className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-4">
                    RFQ: {quotes[0]?.request_for_quotations?.rfq_number || "No RFQ"}
                  </h4>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {quotes.map((quote) => (
                      <Card key={quote.id} className={quote.is_selected ? "ring-2 ring-green-500" : ""}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-semibold">{quote.vendors?.vendor_name}</p>
                              <p className="text-sm text-muted-foreground">{quote.sq_number}</p>
                            </div>
                            {getStatusBadge(quote.status, quote.is_selected)}
                          </div>
                          <div className="space-y-2 mt-4">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Total Amount</span>
                              <span className="font-bold">
                                <CurrencyDisplay amount={quote.total_amount || 0} />
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Valid Until</span>
                              <span>
                                {quote.valid_until 
                                  ? format(new Date(quote.valid_until), "MMM dd, yyyy")
                                  : "N/A"}
                              </span>
                            </div>
                          </div>
                          {!quote.is_selected && rfqId !== "no-rfq" && (
                            <Button 
                              className="w-full mt-4" 
                              variant="outline"
                              onClick={() => handleSelectQuotation(quote.id, rfqId)}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Select This Quote
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Table View
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SQ Number</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>RFQ</TableHead>
                    <TableHead>Quote Date</TableHead>
                    <TableHead>Valid Until</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredQuotations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No supplier quotations found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredQuotations.map((quotation) => (
                      <TableRow key={quotation.id}>
                        <TableCell className="font-medium">{quotation.sq_number}</TableCell>
                        <TableCell>{quotation.vendors?.vendor_name}</TableCell>
                        <TableCell>{quotation.request_for_quotations?.rfq_number || "-"}</TableCell>
                        <TableCell>{format(new Date(quotation.quotation_date), "MMM dd, yyyy")}</TableCell>
                        <TableCell>
                          {quotation.valid_until 
                            ? format(new Date(quotation.valid_until), "MMM dd, yyyy") 
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          <CurrencyDisplay amount={quotation.total_amount || 0} />
                        </TableCell>
                        <TableCell>{getStatusBadge(quotation.status, quotation.is_selected)}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedQuotation(quotation)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              {!quotation.is_selected && quotation.rfq_id && (
                                <DropdownMenuItem 
                                  onClick={() => handleSelectQuotation(quotation.id, quotation.rfq_id!)}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Select This Quote
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Quotation Details Dialog */}
      <Dialog open={!!selectedQuotation} onOpenChange={() => setSelectedQuotation(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Quotation: {selectedQuotation?.sq_number}</DialogTitle>
          </DialogHeader>
          {selectedQuotation && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Vendor</p>
                  <p className="font-medium">{selectedQuotation.vendors?.vendor_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedQuotation.status, selectedQuotation.is_selected)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Quote Date</p>
                  <p className="font-medium">{format(new Date(selectedQuotation.quotation_date), "MMM dd, yyyy")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valid Until</p>
                  <p className="font-medium">
                    {selectedQuotation.valid_until 
                      ? format(new Date(selectedQuotation.valid_until), "MMM dd, yyyy") 
                      : "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Amount</p>
                  <p className="font-bold text-lg">
                    <CurrencyDisplay amount={selectedQuotation.total_amount || 0} />
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Currency</p>
                  <p className="font-medium">{selectedQuotation.currency || "LKR"}</p>
                </div>
              </div>
              
              {selectedQuotation.notes && (
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p>{selectedQuotation.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
