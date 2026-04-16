import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, ClipboardCheck, MoreHorizontal, CheckCircle, XCircle, Eye } from "lucide-react";
import { useQualityInspections, useCompleteInspection } from "@/hooks/useQualityInspection";
import { QualityInspectionForm } from "./QualityInspectionForm";
import { format } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const QualityInspectionView = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<any>(null);
  
  const { data: inspections, isLoading } = useQualityInspections(statusFilter === "all" ? undefined : statusFilter);
  
  const filteredInspections = inspections?.filter(inspection =>
    inspection.inspection_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inspection.items?.item_name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];
  
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; icon: any }> = {
      pending: { color: "bg-yellow-500/10 text-yellow-600", icon: null },
      passed: { color: "bg-green-500/10 text-green-600", icon: CheckCircle },
      failed: { color: "bg-destructive/10 text-destructive", icon: XCircle },
    };
    
    const config = statusConfig[status] || { color: "bg-muted", icon: null };
    const Icon = config.icon;
    
    return (
      <Badge variant="outline" className={`${config.color} flex items-center gap-1`}>
        {Icon && <Icon className="h-3 w-3" />}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };
  
  // Metrics
  const totalInspections = filteredInspections.length;
  const passedCount = filteredInspections.filter(i => i.status === "passed").length;
  const failedCount = filteredInspections.filter(i => i.status === "failed").length;
  const pendingCount = filteredInspections.filter(i => i.status === "pending").length;
  const passRate = totalInspections > 0 ? ((passedCount / (passedCount + failedCount)) * 100) || 0 : 0;
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Inspections</div>
            <div className="text-2xl font-bold">{totalInspections}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Pending</div>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Passed</div>
            <div className="text-2xl font-bold text-green-600">{passedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Failed</div>
            <div className="text-2xl font-bold text-destructive">{failedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Pass Rate</div>
            <div className="text-2xl font-bold">{passRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Quality Inspections
          </CardTitle>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Inspection
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Quality Inspection</DialogTitle>
              </DialogHeader>
              <QualityInspectionForm onSuccess={() => setIsFormOpen(false)} />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by inspection number or item..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="passed">Passed</TabsTrigger>
                <TabsTrigger value="failed">Failed</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          {/* Inspections Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Inspection #</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Inspected Qty</TableHead>
                  <TableHead className="text-right">Accepted</TableHead>
                  <TableHead className="text-right">Rejected</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredInspections.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No inspections found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInspections.map((inspection) => (
                    <TableRow key={inspection.id}>
                      <TableCell className="font-medium">{inspection.inspection_number}</TableCell>
                      <TableCell>{inspection.inspection_templates?.template_name || "-"}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{inspection.items?.item_code}</p>
                          <p className="text-sm text-muted-foreground">{inspection.items?.item_name}</p>
                        </div>
                      </TableCell>
                      <TableCell>{format(new Date(inspection.inspection_date), "MMM dd, yyyy")}</TableCell>
                      <TableCell className="text-right">{inspection.inspected_qty}</TableCell>
                      <TableCell className="text-right text-green-600">{inspection.accepted_qty || 0}</TableCell>
                      <TableCell className="text-right text-destructive">{inspection.rejected_qty || 0}</TableCell>
                      <TableCell>{getStatusBadge(inspection.status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedInspection(inspection)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {inspection.status === "pending" && (
                              <DropdownMenuItem>
                                <ClipboardCheck className="h-4 w-4 mr-2" />
                                Complete Inspection
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
      
      {/* Inspection Details Dialog */}
      <Dialog open={!!selectedInspection} onOpenChange={() => setSelectedInspection(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Inspection: {selectedInspection?.inspection_number}</DialogTitle>
          </DialogHeader>
          {selectedInspection && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Item</p>
                  <p className="font-medium">{selectedInspection.items?.item_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedInspection.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Inspection Date</p>
                  <p className="font-medium">{format(new Date(selectedInspection.inspection_date), "MMM dd, yyyy")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Template</p>
                  <p className="font-medium">{selectedInspection.inspection_templates?.template_name || "N/A"}</p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Quantity Summary</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <p className="text-2xl font-bold">{selectedInspection.inspected_qty}</p>
                    <p className="text-sm text-muted-foreground">Inspected</p>
                  </div>
                  <div className="text-center p-3 bg-green-500/10 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{selectedInspection.accepted_qty || 0}</p>
                    <p className="text-sm text-muted-foreground">Accepted</p>
                  </div>
                  <div className="text-center p-3 bg-destructive/10 rounded-lg">
                    <p className="text-2xl font-bold text-destructive">{selectedInspection.rejected_qty || 0}</p>
                    <p className="text-sm text-muted-foreground">Rejected</p>
                  </div>
                </div>
              </div>
              
              {selectedInspection.notes && (
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p>{selectedInspection.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
