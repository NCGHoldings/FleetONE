import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Eye, Truck, FileText, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useSalesOrders, useUpdateSalesOrderStatus } from "@/hooks/useSalesOrders";
import { useDeleteSalesOrder } from "@/hooks/useAccountingMutations";
import { SalesOrderForm } from "./SalesOrderForm";
import { CurrencyDisplay } from "./shared/CurrencyDisplay";
import { format } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const SalesOrderView = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const { data: orders, isLoading } = useSalesOrders(statusFilter === "all" ? undefined : statusFilter);
  const updateStatus = useUpdateSalesOrderStatus();
  const deleteSO = useDeleteSalesOrder();
  
  const filteredOrders = orders?.filter(order =>
    order.so_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customers?.customer_name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];
  
  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      draft: "bg-gray-500",
      confirmed: "bg-blue-500",
      processing: "bg-yellow-500",
      shipped: "bg-purple-500",
      delivered: "bg-green-500",
      cancelled: "bg-red-500",
      invoiced: "bg-teal-500",
    };
    return (
      <Badge className={`${statusColors[status] || "bg-gray-500"} text-white`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };
  
  const handleStatusChange = async (orderId: string, newStatus: string) => {
    await updateStatus.mutateAsync({ id: orderId, status: newStatus });
  };

  const handleDelete = () => {
    if (deleteConfirmId) {
      deleteSO.mutate(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };
  
  const totalOrders = filteredOrders.length;
  const totalValue = filteredOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const pendingOrders = filteredOrders.filter(o => ["draft", "confirmed", "processing"].includes(o.status)).length;
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Orders</div>
            <div className="text-2xl font-bold">{totalOrders}</div>
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
            <div className="text-sm text-muted-foreground">Pending Orders</div>
            <div className="text-2xl font-bold text-yellow-600">{pendingOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Avg. Order Value</div>
            <div className="text-2xl font-bold">
              <CurrencyDisplay amount={totalOrders > 0 ? totalValue / totalOrders : 0} />
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Sales Orders</CardTitle>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Sales Order
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Sales Order</DialogTitle>
              </DialogHeader>
              <SalesOrderForm onSuccess={() => setIsFormOpen(false)} />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by SO number or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="draft">Draft</TabsTrigger>
                <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
                <TabsTrigger value="processing">Processing</TabsTrigger>
                <TabsTrigger value="delivered">Delivered</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          {/* Orders Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SO Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Delivery Date</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No sales orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.so_number}</TableCell>
                      <TableCell>{order.customers?.customer_name}</TableCell>
                      <TableCell>{format(new Date(order.order_date), "MMM dd, yyyy")}</TableCell>
                      <TableCell>
                        {order.delivery_date ? format(new Date(order.delivery_date), "MMM dd, yyyy") : "-"}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        <CurrencyDisplay amount={order.total_amount || 0} />
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedOrder(order)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {order.status === "draft" && (
                              <>
                                <DropdownMenuItem onClick={() => handleStatusChange(order.id, "confirmed")}>
                                  <FileText className="h-4 w-4 mr-2" />
                                  Confirm Order
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => setDeleteConfirmId(order.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete Order
                                </DropdownMenuItem>
                              </>
                            )}
                            {order.status === "confirmed" && (
                              <DropdownMenuItem onClick={() => handleStatusChange(order.id, "processing")}>
                                <Truck className="h-4 w-4 mr-2" />
                                Start Processing
                              </DropdownMenuItem>
                            )}
                            {["confirmed", "processing"].includes(order.status) && (
                              <DropdownMenuItem>
                                <Truck className="h-4 w-4 mr-2" />
                                Create Delivery Note
                              </DropdownMenuItem>
                            )}
                            {order.status === "draft" && (
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => handleStatusChange(order.id, "cancelled")}
                              >
                                Cancel Order
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
      
      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Sales Order: {selectedOrder?.so_number}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-medium">{selectedOrder.customers?.customer_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Order Date</p>
                  <p className="font-medium">{format(new Date(selectedOrder.order_date), "MMM dd, yyyy")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Delivery Date</p>
                  <p className="font-medium">
                    {selectedOrder.delivery_date 
                      ? format(new Date(selectedOrder.delivery_date), "MMM dd, yyyy") 
                      : "Not set"}
                  </p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <p className="font-semibold mb-2">Order Summary</p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <CurrencyDisplay amount={selectedOrder.subtotal || 0} />
                  </div>
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <CurrencyDisplay amount={selectedOrder.tax_amount || 0} />
                  </div>
                  <div className="flex justify-between">
                    <span>Discount</span>
                    <CurrencyDisplay amount={-(selectedOrder.discount_amount || 0)} />
                  </div>
                  <div className="flex justify-between font-bold border-t pt-2">
                    <span>Total</span>
                    <CurrencyDisplay amount={selectedOrder.total_amount || 0} />
                  </div>
                </div>
              </div>
              
              {selectedOrder.notes && (
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p>{selectedOrder.notes}</p>
                </div>
              )}

              {selectedOrder.status === "draft" && (
                <div className="border-t pt-4 flex gap-2">
                  <Button
                    variant="outline"
                    className="text-destructive border-destructive hover:bg-destructive/10"
                    onClick={() => {
                      setSelectedOrder(null);
                      setDeleteConfirmId(selectedOrder.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sales Order?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Only draft orders can be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
