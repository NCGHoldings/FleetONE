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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Package, Hash, Calendar, Search } from "lucide-react";
import { useItems, useBatchNumbers, useSerialNumbers } from "@/hooks/useAccountingData";
import { useCreateBatchNumber, useCreateSerialNumber } from "@/hooks/useAccountingMutations";
import { format, differenceInDays } from "date-fns";

export const BatchSerialTrackingView = () => {
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [serialDialogOpen, setSerialDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Batch form
  const [batchItemId, setBatchItemId] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [batchQty, setBatchQty] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [manufactureDate, setManufactureDate] = useState("");

  // Serial form
  const [serialItemId, setSerialItemId] = useState("");
  const [serialNumber, setSerialNumber] = useState("");

  const { data: items = [] } = useItems();
  const { data: batches = [] } = useBatchNumbers();
  const { data: serials = [] } = useSerialNumbers();
  const createBatch = useCreateBatchNumber();
  const createSerial = useCreateSerialNumber();

  const filteredBatches = batches.filter((b: any) =>
    b.batch_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.items?.item_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSerials = serials.filter((s: any) =>
    s.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.items?.item_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateBatch = async () => {
    if (!batchItemId || !batchNumber || !batchQty) return;

    await createBatch.mutateAsync({
      item_id: batchItemId,
      batch_number: batchNumber,
      quantity_received: parseInt(batchQty),
      expiry_date: expiryDate || undefined,
      manufacture_date: manufactureDate || undefined,
    });

    setBatchDialogOpen(false);
    resetBatchForm();
  };

  const handleCreateSerial = async () => {
    if (!serialItemId || !serialNumber) return;

    await createSerial.mutateAsync({
      item_id: serialItemId,
      serial_number: serialNumber,
    });

    setSerialDialogOpen(false);
    resetSerialForm();
  };

  const resetBatchForm = () => {
    setBatchItemId("");
    setBatchNumber("");
    setBatchQty("");
    setExpiryDate("");
    setManufactureDate("");
  };

  const resetSerialForm = () => {
    setSerialItemId("");
    setSerialNumber("");
  };

  const getExpiryStatus = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    const daysUntilExpiry = differenceInDays(new Date(expiryDate), new Date());
    if (daysUntilExpiry < 0) return { label: "Expired", variant: "destructive" as const };
    if (daysUntilExpiry <= 30) return { label: "Expiring Soon", variant: "secondary" as const };
    return { label: "Active", variant: "default" as const };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Batch & Serial Tracking</h2>
          <p className="text-muted-foreground">Track inventory by batch numbers and serial numbers</p>
        </div>
      </div>

      <Tabs defaultValue="batches" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="batches">
              <Package className="h-4 w-4 mr-2" />
              Batch Numbers
            </TabsTrigger>
            <TabsTrigger value="serials">
              <Hash className="h-4 w-4 mr-2" />
              Serial Numbers
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-10 w-[250px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        <TabsContent value="batches">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Batch Numbers</CardTitle>
              <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Batch
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Batch Number</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Item</Label>
                      <Select value={batchItemId} onValueChange={setBatchItemId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select item" />
                        </SelectTrigger>
                        <SelectContent>
                          {items.map((item: any) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.item_code} - {item.item_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Batch Number</Label>
                      <Input
                        value={batchNumber}
                        onChange={(e) => setBatchNumber(e.target.value)}
                        placeholder="Enter batch number"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        value={batchQty}
                        onChange={(e) => setBatchQty(e.target.value)}
                        placeholder="0"
                        min="1"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Manufacture Date</Label>
                        <Input
                          type="date"
                          value={manufactureDate}
                          onChange={(e) => setManufactureDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Expiry Date</Label>
                        <Input
                          type="date"
                          value={expiryDate}
                          onChange={(e) => setExpiryDate(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setBatchDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateBatch} disabled={createBatch.isPending}>
                        Create Batch
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch #</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty Received</TableHead>
                    <TableHead className="text-right">Qty Available</TableHead>
                    <TableHead>Manufacture Date</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBatches.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No batch numbers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBatches.map((batch: any) => {
                      const expiryStatus = getExpiryStatus(batch.expiry_date);
                      return (
                        <TableRow key={batch.id}>
                          <TableCell className="font-mono font-medium">{batch.batch_number}</TableCell>
                          <TableCell>
                            {batch.items?.item_code} - {batch.items?.item_name}
                          </TableCell>
                          <TableCell className="text-right">{batch.quantity_received}</TableCell>
                          <TableCell className="text-right font-semibold">{batch.quantity_available}</TableCell>
                          <TableCell>
                            {batch.manufacture_date ? format(new Date(batch.manufacture_date), "MMM dd, yyyy") : "-"}
                          </TableCell>
                          <TableCell>
                            {batch.expiry_date ? (
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                {format(new Date(batch.expiry_date), "MMM dd, yyyy")}
                              </div>
                            ) : "-"}
                          </TableCell>
                          <TableCell>
                            {expiryStatus ? (
                              <Badge variant={expiryStatus.variant}>{expiryStatus.label}</Badge>
                            ) : (
                              <Badge variant="outline">{batch.status}</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="serials">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Serial Numbers</CardTitle>
              <Dialog open={serialDialogOpen} onOpenChange={setSerialDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Serial
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Serial Number</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Item</Label>
                      <Select value={serialItemId} onValueChange={setSerialItemId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select item" />
                        </SelectTrigger>
                        <SelectContent>
                          {items.map((item: any) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.item_code} - {item.item_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Serial Number</Label>
                      <Input
                        value={serialNumber}
                        onChange={(e) => setSerialNumber(e.target.value)}
                        placeholder="Enter serial number"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setSerialDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateSerial} disabled={createSerial.isPending}>
                        Create Serial
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serial #</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSerials.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No serial numbers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSerials.map((serial: any) => (
                      <TableRow key={serial.id}>
                        <TableCell className="font-mono font-medium">{serial.serial_number}</TableCell>
                        <TableCell>
                          {serial.items?.item_code} - {serial.items?.item_name}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              serial.status === "available" ? "default" :
                              serial.status === "sold" ? "secondary" : "outline"
                            }
                          >
                            {serial.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{serial.location || "-"}</TableCell>
                        <TableCell>
                          {serial.created_at ? format(new Date(serial.created_at), "MMM dd, yyyy") : "-"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};