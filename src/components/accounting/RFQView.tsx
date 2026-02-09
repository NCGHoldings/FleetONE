import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Send, Eye, MoreHorizontal, FileText, CheckCircle } from "lucide-react";
import { useRFQs, useSendRFQ, useRFQVendors } from "@/hooks/useRFQ";
import { RFQForm } from "./RFQForm";
import { format } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const RFQView = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRFQ, setSelectedRFQ] = useState<any>(null);
  
  const { data: rfqs, isLoading } = useRFQs(statusFilter === "all" ? undefined : statusFilter);
  const sendRFQ = useSendRFQ();
  
  const filteredRFQs = rfqs?.filter(rfq =>
    rfq.rfq_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rfq.purchase_requisitions?.pr_number?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];
  
  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      draft: "bg-muted text-muted-foreground",
      sent: "bg-blue-500/10 text-blue-600",
      received: "bg-yellow-500/10 text-yellow-600",
      closed: "bg-green-500/10 text-green-600",
      cancelled: "bg-destructive/10 text-destructive",
    };
    
    return (
      <Badge variant="outline" className={statusColors[status] || ""}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };
  
  const handleSendRFQ = async (rfqId: string, vendorIds: string[]) => {
    await sendRFQ.mutateAsync({ rfqId, vendorIds });
  };
  
  // Metrics
  const totalRFQs = filteredRFQs.length;
  const pendingRFQs = filteredRFQs.filter(r => r.status === "sent").length;
  const closedRFQs = filteredRFQs.filter(r => r.status === "closed").length;
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total RFQs</div>
            <div className="text-2xl font-bold">{totalRFQs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Awaiting Response</div>
            <div className="text-2xl font-bold text-blue-600">{pendingRFQs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Closed</div>
            <div className="text-2xl font-bold text-green-600">{closedRFQs}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Response Rate</div>
            <div className="text-2xl font-bold">
              {totalRFQs > 0 ? ((closedRFQs / totalRFQs) * 100).toFixed(0) : 0}%
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Request for Quotations
          </CardTitle>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New RFQ
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Request for Quotation</DialogTitle>
              </DialogHeader>
              <RFQForm onSuccess={() => setIsFormOpen(false)} />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by RFQ number or PR..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="draft">Draft</TabsTrigger>
                <TabsTrigger value="sent">Sent</TabsTrigger>
                <TabsTrigger value="received">Received</TabsTrigger>
                <TabsTrigger value="closed">Closed</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          {/* RFQ Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>RFQ Number</TableHead>
                  <TableHead>Purchase Requisition</TableHead>
                  <TableHead>RFQ Date</TableHead>
                  <TableHead>Response Deadline</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredRFQs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No RFQs found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRFQs.map((rfq) => (
                    <TableRow key={rfq.id}>
                      <TableCell className="font-medium">{rfq.rfq_number}</TableCell>
                      <TableCell>{rfq.purchase_requisitions?.pr_number || "-"}</TableCell>
                      <TableCell>{format(new Date(rfq.rfq_date), "MMM dd, yyyy")}</TableCell>
                      <TableCell>
                        {rfq.response_deadline 
                          ? format(new Date(rfq.response_deadline), "MMM dd, yyyy") 
                          : "-"}
                      </TableCell>
                      <TableCell>{getStatusBadge(rfq.status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedRFQ(rfq)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {rfq.status === "draft" && (
                              <DropdownMenuItem>
                                <Send className="h-4 w-4 mr-2" />
                                Send to Vendors
                              </DropdownMenuItem>
                            )}
                            {rfq.status === "sent" && (
                              <DropdownMenuItem>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Record Response
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
        </CardContent>
      </Card>
      
      {/* RFQ Details Dialog */}
      <Dialog open={!!selectedRFQ} onOpenChange={() => setSelectedRFQ(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>RFQ: {selectedRFQ?.rfq_number}</DialogTitle>
          </DialogHeader>
          {selectedRFQ && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">RFQ Date</p>
                  <p className="font-medium">{format(new Date(selectedRFQ.rfq_date), "MMM dd, yyyy")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedRFQ.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Response Deadline</p>
                  <p className="font-medium">
                    {selectedRFQ.response_deadline 
                      ? format(new Date(selectedRFQ.response_deadline), "MMM dd, yyyy") 
                      : "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Purchase Requisition</p>
                  <p className="font-medium">{selectedRFQ.purchase_requisitions?.pr_number || "N/A"}</p>
                </div>
              </div>
              
              {selectedRFQ.notes && (
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p>{selectedRFQ.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
