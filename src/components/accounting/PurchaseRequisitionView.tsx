import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  CheckCircle,
  XCircle,
  FileText,
  ShoppingCart,
  Clock,
  AlertCircle,
} from "lucide-react";
import { usePurchaseRequisitions } from "@/hooks/useAccountingData";
import {
  useCreatePurchaseRequisition,
  useApprovePurchaseRequisition,
  useConvertPRtoPO,
} from "@/hooks/useAccountingMutations";
import { PurchaseRequisitionForm } from "./PurchaseRequisitionForm";
import { StatusBadge } from "./shared/StatusBadge";
import { toast } from "sonner";
import { format } from "date-fns";

export const PurchaseRequisitionView = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [selectedPR, setSelectedPR] = useState<any>(null);

  const { data: requisitions = [], isLoading } = usePurchaseRequisitions();
  const approvePR = useApprovePurchaseRequisition();
  const convertToPO = useConvertPRtoPO();

  const filteredRequisitions = requisitions.filter((pr: any) => {
    const matchesSearch =
      pr.requisition_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pr.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pr.requested_by_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || pr.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = requisitions.filter(
    (pr: any) => pr.status === "pending"
  ).length;
  const approvedCount = requisitions.filter(
    (pr: any) => pr.status === "approved"
  ).length;
  const draftCount = requisitions.filter(
    (pr: any) => pr.status === "draft"
  ).length;

  const handleApprove = async (id: string) => {
    try {
      await approvePR.mutateAsync({ requisitionId: id, action: "approve" });
      toast.success("Purchase requisition approved");
    } catch (error) {
      toast.error("Failed to approve requisition");
    }
  };

  const handleReject = async (id: string) => {
    try {
      await approvePR.mutateAsync({ requisitionId: id, action: "reject" });
      toast.success("Purchase requisition rejected");
    } catch (error) {
      toast.error("Failed to reject requisition");
    }
  };

  const handleConvertToPO = async (id: string) => {
    try {
      await convertToPO.mutateAsync(id);
      toast.success("Purchase order created from requisition");
    } catch (error) {
      toast.error("Failed to convert to PO");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "secondary";
      case "pending":
        return "outline";
      case "approved":
        return "default";
      case "rejected":
        return "destructive";
      case "converted":
        return "default";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Purchase Requisitions</h2>
          <p className="text-muted-foreground">
            Request items and services for procurement
          </p>
        </div>
        <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Requisition
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Purchase Requisition</DialogTitle>
            </DialogHeader>
            <PurchaseRequisitionForm
              onSuccess={() => {
                setFormDialogOpen(false);
                toast.success("Purchase requisition created");
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total PRs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requisitions.length}</div>
            <p className="text-xs text-muted-foreground">all requisitions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedCount}</div>
            <p className="text-xs text-muted-foreground">ready for PO</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Draft</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{draftCount}</div>
            <p className="text-xs text-muted-foreground">not submitted</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by PR number, department, requester..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="draft">Draft</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
                <TabsTrigger value="rejected">Rejected</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PR Number</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Required Date</TableHead>
                <TableHead className="text-right">Est. Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Loading requisitions...
                  </TableCell>
                </TableRow>
              ) : filteredRequisitions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    No purchase requisitions found
                  </TableCell>
                </TableRow>
              ) : (
                filteredRequisitions.map((pr: any) => (
                  <TableRow key={pr.id}>
                    <TableCell className="font-medium">
                      {pr.requisition_number}
                    </TableCell>
                    <TableCell>
                      {format(new Date(pr.requisition_date), "MMM dd, yyyy")}
                    </TableCell>
                    <TableCell>{pr.department || "-"}</TableCell>
                    <TableCell>{pr.requested_by_name || "-"}</TableCell>
                    <TableCell>
                      {pr.required_date
                        ? format(new Date(pr.required_date), "MMM dd, yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {pr.estimated_total?.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      }) || "0.00"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={pr.status} />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setSelectedPR(pr)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {pr.status === "pending" && (
                            <>
                              <DropdownMenuItem
                                onClick={() => handleApprove(pr.id)}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleReject(pr.id)}
                                className="text-destructive"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                              </DropdownMenuItem>
                            </>
                          )}
                          {pr.status === "approved" && (
                            <DropdownMenuItem
                              onClick={() => handleConvertToPO(pr.id)}
                            >
                              <ShoppingCart className="h-4 w-4 mr-2" />
                              Convert to PO
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
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedPR} onOpenChange={() => setSelectedPR(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Purchase Requisition: {selectedPR?.requisition_number}
            </DialogTitle>
          </DialogHeader>
          {selectedPR && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Department</p>
                  <p className="font-medium">{selectedPR.department || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Requested By</p>
                  <p className="font-medium">
                    {selectedPR.requested_by_name || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Request Date</p>
                  <p className="font-medium">
                    {format(
                      new Date(selectedPR.requisition_date),
                      "MMM dd, yyyy"
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Required Date</p>
                  <p className="font-medium">
                    {selectedPR.required_date
                      ? format(
                          new Date(selectedPR.required_date),
                          "MMM dd, yyyy"
                        )
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Estimated Total
                  </p>
                  <p className="font-medium font-mono">
                    Rs.{" "}
                    {selectedPR.estimated_total?.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    }) || "0.00"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <StatusBadge status={selectedPR.status} />
                </div>
              </div>
              {selectedPR.purpose && (
                <div>
                  <p className="text-sm text-muted-foreground">Purpose</p>
                  <p className="font-medium">{selectedPR.purpose}</p>
                </div>
              )}
              {selectedPR.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="font-medium">{selectedPR.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
