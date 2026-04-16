import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Ruler, ArrowRightLeft, Edit, Trash2 } from "lucide-react";
import { useUnitOfMeasures, useUoMConversions, useCreateUoM, useCreateUoMConversion } from "@/hooks/useInventoryEnhanced";
import { useForm } from "react-hook-form";

export const UoMView = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isUoMDialogOpen, setIsUoMDialogOpen] = useState(false);
  const [isConversionDialogOpen, setIsConversionDialogOpen] = useState(false);
  
  const { data: uoms, isLoading: uomsLoading } = useUnitOfMeasures();
  const { data: conversions, isLoading: conversionsLoading } = useUoMConversions();
  const createUoM = useCreateUoM();
  const createConversion = useCreateUoMConversion();

  const { register: registerUoM, handleSubmit: handleUoMSubmit, reset: resetUoM } = useForm();
  const { register: registerConv, handleSubmit: handleConvSubmit, reset: resetConv } = useForm();

  const filteredUoMs = uoms?.filter(u => 
    u.uom_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.uom_symbol?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const onSubmitUoM = (data: any) => {
    createUoM.mutate(data, {
      onSuccess: () => {
        setIsUoMDialogOpen(false);
        resetUoM();
      }
    });
  };

  const onSubmitConversion = (data: any) => {
    createConversion.mutate({
      ...data,
      conversion_factor: parseFloat(data.conversion_factor),
    }, {
      onSuccess: () => {
        setIsConversionDialogOpen(false);
        resetConv();
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Ruler className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Units of Measure</p>
              <p className="text-2xl font-bold">{uoms?.length || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <ArrowRightLeft className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">Conversions</p>
              <p className="text-2xl font-bold">{conversions?.length || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Badge className="h-8 w-8 flex items-center justify-center bg-green-500">✓</Badge>
            <div>
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-2xl font-bold">{uoms?.filter(u => u.is_active).length || 0}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <Tabs defaultValue="units">
          <TabsList className="mb-4">
            <TabsTrigger value="units">Units of Measure</TabsTrigger>
            <TabsTrigger value="conversions">Conversions</TabsTrigger>
          </TabsList>

          <TabsContent value="units" className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search units..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button onClick={() => setIsUoMDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Unit
              </Button>
            </div>

            {uomsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredUoMs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Ruler className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No units of measure found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Unit Name</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUoMs.map((uom) => (
                    <TableRow key={uom.id}>
                      <TableCell className="font-medium">{uom.uom_name}</TableCell>
                      <TableCell>{uom.uom_symbol || "-"}</TableCell>
                      <TableCell>
                        {uom.is_active ? (
                          <Badge className="bg-green-500">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="conversions" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setIsConversionDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Conversion
              </Button>
            </div>

            {conversionsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : (conversions?.length || 0) === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ArrowRightLeft className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No conversions defined</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From UoM</TableHead>
                    <TableHead></TableHead>
                    <TableHead>To UoM</TableHead>
                    <TableHead>Factor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conversions?.map((conv) => (
                    <TableRow key={conv.id}>
                      <TableCell className="font-medium">{conv.from_uom}</TableCell>
                      <TableCell>
                        <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                      <TableCell className="font-medium">{conv.to_uom}</TableCell>
                      <TableCell>{conv.conversion_factor}</TableCell>
                      <TableCell>
                        {conv.is_active ? (
                          <Badge className="bg-green-500">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </Card>

      {/* Add UoM Dialog */}
      <Dialog open={isUoMDialogOpen} onOpenChange={setIsUoMDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Unit of Measure</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUoMSubmit(onSubmitUoM)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="uom_name">Unit Name *</Label>
              <Input 
                id="uom_name" 
                {...registerUoM("uom_name", { required: true })} 
                placeholder="e.g., Kilogram"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="uom_symbol">Symbol</Label>
              <Input 
                id="uom_symbol" 
                {...registerUoM("uom_symbol")} 
                placeholder="e.g., kg"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsUoMDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createUoM.isPending}>
                {createUoM.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Conversion Dialog */}
      <Dialog open={isConversionDialogOpen} onOpenChange={setIsConversionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add UoM Conversion</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleConvSubmit(onSubmitConversion)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="from_uom">From UoM *</Label>
              <Input 
                id="from_uom" 
                {...registerConv("from_uom", { required: true })} 
                placeholder="e.g., Box"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to_uom">To UoM *</Label>
              <Input 
                id="to_uom" 
                {...registerConv("to_uom", { required: true })} 
                placeholder="e.g., Piece"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="conversion_factor">Conversion Factor *</Label>
              <Input 
                id="conversion_factor" 
                type="number"
                step="0.000001"
                {...registerConv("conversion_factor", { required: true })} 
                placeholder="e.g., 12 (1 Box = 12 Pieces)"
              />
              <p className="text-xs text-muted-foreground">
                How many of the "To" unit equals 1 "From" unit
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsConversionDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createConversion.isPending}>
                {createConversion.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
