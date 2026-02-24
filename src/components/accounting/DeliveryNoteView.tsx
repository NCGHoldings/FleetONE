import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Eye, Printer, MoreHorizontal, Truck } from "lucide-react";
import { useDeliveryNotes } from "@/hooks/useSalesOrders";
import { DeliveryNoteForm } from "./DeliveryNoteForm";
import { format } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const DeliveryNoteView = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<any>(null);
  
  const { data: notes, isLoading } = useDeliveryNotes(statusFilter === "all" ? undefined : statusFilter);
  
  const filteredNotes = notes?.filter(note =>
    note.dn_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.customers?.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.sales_orders?.so_number?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];
  
  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      draft: "bg-gray-500",
      dispatched: "bg-blue-500",
      in_transit: "bg-yellow-500",
      delivered: "bg-green-500",
      cancelled: "bg-red-500",
    };
    
    return (
      <Badge className={`${statusColors[status] || "bg-gray-500"} text-white`}>
        {status.replace("_", " ").charAt(0).toUpperCase() + status.replace("_", " ").slice(1)}
      </Badge>
    );
  };
  
  // Calculate metrics
  const totalNotes = filteredNotes.length;
  const deliveredCount = filteredNotes.filter(n => n.status === "delivered").length;
  const inTransitCount = filteredNotes.filter(n => n.status === "in_transit").length;
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Delivery Notes</div>
            <div className="text-2xl font-bold">{totalNotes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Delivered</div>
            <div className="text-2xl font-bold text-green-600">{deliveredCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">In Transit</div>
            <div className="text-2xl font-bold text-yellow-600">{inTransitCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Delivery Rate</div>
            <div className="text-2xl font-bold">
              {totalNotes > 0 ? ((deliveredCount / totalNotes) * 100).toFixed(1) : 0}%
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Delivery Notes
          </CardTitle>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Delivery Note
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Delivery Note</DialogTitle>
              </DialogHeader>
              <DeliveryNoteForm onSuccess={() => setIsFormOpen(false)} />
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by DN number, customer, or SO..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="draft">Draft</TabsTrigger>
                <TabsTrigger value="dispatched">Dispatched</TabsTrigger>
                <TabsTrigger value="in_transit">In Transit</TabsTrigger>
                <TabsTrigger value="delivered">Delivered</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          {/* Notes Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>DN Number</TableHead>
                  <TableHead>Sales Order</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Delivery Date</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Vehicle</TableHead>
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
                ) : filteredNotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No delivery notes found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredNotes.map((note) => (
                    <TableRow key={note.id}>
                      <TableCell className="font-medium">{note.dn_number}</TableCell>
                      <TableCell>{note.sales_orders?.so_number || "-"}</TableCell>
                      <TableCell>{note.customers?.customer_name}</TableCell>
                      <TableCell>{format(new Date(note.delivery_date), "MMM dd, yyyy")}</TableCell>
                      <TableCell>{note.driver_name || "-"}</TableCell>
                      <TableCell>{note.vehicle_number || "-"}</TableCell>
                      <TableCell>{getStatusBadge(note.status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedNote(note)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Printer className="h-4 w-4 mr-2" />
                              Print DN
                            </DropdownMenuItem>
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
      
      {/* Note Details Dialog */}
      <Dialog open={!!selectedNote} onOpenChange={() => setSelectedNote(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Delivery Note: {selectedNote?.dn_number}</DialogTitle>
          </DialogHeader>
          {selectedNote && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-medium">{selectedNote.customers?.customer_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedNote.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sales Order</p>
                  <p className="font-medium">{selectedNote.sales_orders?.so_number || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Delivery Date</p>
                  <p className="font-medium">{format(new Date(selectedNote.delivery_date), "MMM dd, yyyy")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Driver</p>
                  <p className="font-medium">{selectedNote.driver_name || "Not assigned"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vehicle</p>
                  <p className="font-medium">{selectedNote.vehicle_number || "Not assigned"}</p>
                </div>
              </div>
              
              {selectedNote.shipping_address && (
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground">Shipping Address</p>
                  <p>{selectedNote.shipping_address}</p>
                </div>
              )}
              
              {selectedNote.notes && (
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p>{selectedNote.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
