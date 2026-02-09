import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Search, Calendar, Percent, Star, Edit, Trash2 } from "lucide-react";
import { usePaymentTerms, useCreatePaymentTerm } from "@/hooks/useSalesOrders";
import { useForm } from "react-hook-form";

export const PaymentTermsView = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const { data: terms, isLoading } = usePaymentTerms();
  const createTerm = useCreatePaymentTerm();

  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: {
      term_name: "",
      description: "",
      due_days: 30,
      discount_percentage: 0,
      discount_days: 0,
      is_default: false,
    }
  });

  const isDefault = watch("is_default");

  const filteredTerms = terms?.filter(t => 
    t.term_name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const onSubmit = (data: any) => {
    createTerm.mutate({
      term_name: data.term_name,
      description: data.description,
      due_days: parseInt(data.due_days),
      discount_percentage: data.discount_percentage ? parseFloat(data.discount_percentage) : undefined,
      discount_days: data.discount_days ? parseInt(data.discount_days) : undefined,
      is_default: data.is_default,
    }, {
      onSuccess: () => {
        setIsDialogOpen(false);
        reset();
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8 text-primary" />
            <div>
              <p className="text-sm text-muted-foreground">Total Terms</p>
              <p className="text-2xl font-bold">{terms?.length || 0}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Star className="h-8 w-8 text-yellow-500" />
            <div>
              <p className="text-sm text-muted-foreground">Default Term</p>
              <p className="text-lg font-semibold">
                {terms?.find(t => t.is_default)?.term_name || "Not Set"}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Percent className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">With Discounts</p>
              <p className="text-2xl font-bold">
                {terms?.filter(t => t.discount_percentage && t.discount_percentage > 0).length || 0}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search terms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={() => {
            reset();
            setIsDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Payment Term
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading payment terms...</div>
        ) : filteredTerms.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No payment terms found</p>
            <p className="text-sm mt-2">Create payment terms to use in sales and purchase transactions</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Term Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Due Days</TableHead>
                <TableHead className="text-center">Early Payment Discount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTerms.map((term) => (
                <TableRow key={term.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{term.term_name}</span>
                      {term.is_default && (
                        <Badge className="bg-yellow-500 hover:bg-yellow-600">
                          <Star className="h-3 w-3 mr-1" />
                          Default
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {term.description || "-"}
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    {term.due_days} days
                  </TableCell>
                  <TableCell className="text-center">
                    {term.discount_percentage && term.discount_percentage > 0 ? (
                      <span className="text-green-600 font-medium">
                        {term.discount_percentage}% if paid within {term.discount_days} days
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {term.is_active ? (
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
      </Card>

      {/* Add Payment Term Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Payment Term</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="term_name">Term Name *</Label>
              <Input 
                id="term_name" 
                {...register("term_name", { required: true })} 
                placeholder="e.g., Net 30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description" 
                {...register("description")} 
                placeholder="Enter description"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_days">Due Days *</Label>
              <Input 
                id="due_days" 
                type="number"
                {...register("due_days", { required: true })} 
                placeholder="30"
              />
              <p className="text-xs text-muted-foreground">
                Number of days until payment is due
              </p>
            </div>
            
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Early Payment Discount (Optional)</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="discount_percentage">Discount %</Label>
                  <Input 
                    id="discount_percentage" 
                    type="number"
                    step="0.01"
                    {...register("discount_percentage")} 
                    placeholder="2"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discount_days">If paid within (days)</Label>
                  <Input 
                    id="discount_days" 
                    type="number"
                    {...register("discount_days")} 
                    placeholder="10"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-4">
              <div className="space-y-0.5">
                <Label htmlFor="is_default">Set as Default</Label>
                <p className="text-xs text-muted-foreground">
                  Use this term by default for new transactions
                </p>
              </div>
              <Switch
                id="is_default"
                checked={isDefault}
                onCheckedChange={(checked) => setValue("is_default", checked)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTerm.isPending}>
                {createTerm.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
