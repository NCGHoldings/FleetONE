import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, MoreHorizontal, Package, ClipboardList, CheckCircle, Clock, Play } from "lucide-react";
import { usePickLists, useCompletePicking } from "@/hooks/useInventoryEnhanced";
import { format } from "date-fns";

export const PickListView = () => {
  const [statusFilter, setStatusFilter] = useState<string>("_all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const [selectedPickList, setSelectedPickList] = useState<any>(null);
  
  const { data: pickLists, isLoading } = usePickLists(statusFilter === "_all" ? undefined : statusFilter);
  const completePicking = useCompletePicking();

  const filteredPickLists = pickLists?.filter(pl => 
    pl.pick_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pl.sales_orders?.so_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pl.sales_orders?.customers?.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const statusCounts = {
    total: pickLists?.length || 0,
    draft: pickLists?.filter(pl => pl.status === "draft").length || 0,
    in_progress: pickLists?.filter(pl => pl.status === "in_progress").length || 0,
    completed: pickLists?.filter(pl => pl.status === "completed").length || 0,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-500 hover:bg-blue-600">In Progress</Badge>;
      case "completed":
        return <Badge className="bg-green-500 hover:bg-green-600">Completed</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleCompletePicking = () => {
    if (!selectedPickList) return;
    
    completePicking.mutate({
      pickListId: selectedPickList.id,
      lines: [], // In real implementation, this would include picked quantities
    }, {
      onSuccess: () => {
        setIsCompleteDialogOpen(false);
        setSelectedPickList(null);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <ClipboardList className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Total Pick Lists</p>
              <p className="text-2xl font-bold">{statusCounts.total}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Clock className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold">{statusCounts.draft}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Play className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">In Progress</p>
              <p className="text-2xl font-bold">{statusCounts.in_progress}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold">{statusCounts.completed}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
          <div className="flex gap-4">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search pick lists..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Pick List
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading pick lists...</div>
        ) : filteredPickLists.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No pick lists found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pick Number</TableHead>
                <TableHead>Sales Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Picked At</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPickLists.map((pickList) => (
                <TableRow key={pickList.id}>
                  <TableCell className="font-medium">{pickList.pick_number}</TableCell>
                  <TableCell>{pickList.sales_orders?.so_number || "-"}</TableCell>
                  <TableCell>{pickList.sales_orders?.customers?.customer_name || "-"}</TableCell>
                  <TableCell>{getStatusBadge(pickList.status)}</TableCell>
                  <TableCell>
                    {pickList.picked_at 
                      ? format(new Date(pickList.picked_at), "MMM dd, yyyy HH:mm")
                      : "-"
                    }
                  </TableCell>
                  <TableCell>
                    {format(new Date(pickList.created_at), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        {pickList.status === "draft" && (
                          <DropdownMenuItem>Start Picking</DropdownMenuItem>
                        )}
                        {pickList.status === "in_progress" && (
                          <DropdownMenuItem onClick={() => {
                            setSelectedPickList(pickList);
                            setIsCompleteDialogOpen(true);
                          }}>
                            Complete Picking
                          </DropdownMenuItem>
                        )}
                        {pickList.status === "draft" && (
                          <DropdownMenuItem className="text-destructive">Cancel</DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Complete Picking Dialog */}
      <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Picking</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to mark pick list <span className="font-semibold">{selectedPickList?.pick_number}</span> as completed?
            </p>
            <div className="space-y-2">
              <Label>Completion Notes</Label>
              <Textarea placeholder="Add any notes about this pick..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCompleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCompletePicking} disabled={completePicking.isPending}>
              {completePicking.isPending ? "Processing..." : "Complete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
