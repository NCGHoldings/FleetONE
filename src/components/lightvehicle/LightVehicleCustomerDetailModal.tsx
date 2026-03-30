import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface LightVehicleCustomerDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName: string | null;
}

interface Quotation {
  id: string;
  quotation_no: string;
  bus_model: string;
  quantity: number;
  total_price: number;
  status: string;
  created_at: string;
  customer_name: string;
  company_name: string | null;
  relationship_notes: string | null;
}

export function LightVehicleCustomerDetailModal({
  open,
  onOpenChange,
  customerName,
}: LightVehicleCustomerDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [directQuotations, setDirectQuotations] = useState<Quotation[]>([]);
  const [relatedQuotations, setRelatedQuotations] = useState<Quotation[]>([]);
  const [combinedView, setCombinedView] = useState(false);

  useEffect(() => {
    if (open && customerName) {
      loadCustomerDetails();
    }
  }, [open, customerName]);

  const loadCustomerDetails = async () => {
    if (!customerName) return;

    try {
      setLoading(true);

      // Get direct quotations for this customer
      const { data: direct, error: directError } = await (supabase as any)
        .from("lightvehicle_quotations")
        .select("*")
        .eq("customer_name", customerName)
        .or("is_sub_customer.eq.false,main_customer_name.is.null");

      if (directError) throw directError;

      // Get related quotations (sub-customers linked to this customer)
      const { data: related, error: relatedError } = await (supabase as any)
        .from("lightvehicle_quotations")
        .select("*")
        .eq("main_customer_name", customerName)
        .eq("is_sub_customer", true);

      if (relatedError) throw relatedError;

      setDirectQuotations(direct || []);
      setRelatedQuotations(related || []);
    } catch (error) {
      console.error("Error loading customer details:", error);
    } finally {
      setLoading(false);
    }
  };

  const quotationColumns: ColumnDef<Quotation>[] = [
    {
      accessorKey: "quotation_no",
      header: "Quotation No",
    },
    {
      accessorKey: "bus_model",
      header: "Bus Model",
    },
    {
      accessorKey: "quantity",
      header: "Quantity",
    },
    {
      accessorKey: "total_price",
      header: "Amount",
      cell: ({ row }) => {
        return new Intl.NumberFormat("en-LK", {
          style: "currency",
          currency: "LKR",
        }).format(row.getValue("total_price"));
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge variant={status === "confirmed" ? "default" : "secondary"}>
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: "Date",
      cell: ({ row }) => {
        return format(new Date(row.getValue("created_at")), "MMM dd, yyyy");
      },
    },
  ];

  const relatedQuotationColumns: ColumnDef<Quotation>[] = [
    {
      accessorKey: "customer_name",
      header: "Sub-Customer",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.customer_name}</div>
          {row.original.relationship_notes && (
            <div className="text-xs text-muted-foreground">
              {row.original.relationship_notes}
            </div>
          )}
        </div>
      ),
    },
    ...quotationColumns,
  ];

  const directTotal = directQuotations.reduce((sum, q) => sum + (q.total_price || 0), 0);
  const relatedTotal = relatedQuotations.reduce((sum, q) => sum + (q.total_price || 0), 0);
  const combinedTotal = directTotal + relatedTotal;

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <Skeleton className="h-8 w-64" />
          </DialogHeader>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{customerName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Direct Quotations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="text-2xl font-bold">{directQuotations.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {new Intl.NumberFormat("en-LK", {
                      style: "currency",
                      currency: "LKR",
                      notation: "compact",
                    }).format(directTotal)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Related Quotations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="text-2xl font-bold">{relatedQuotations.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {new Intl.NumberFormat("en-LK", {
                      style: "currency",
                      currency: "LKR",
                      notation: "compact",
                    }).format(relatedTotal)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Combined Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="text-2xl font-bold">
                    {directQuotations.length + relatedQuotations.length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Intl.NumberFormat("en-LK", {
                      style: "currency",
                      currency: "LKR",
                      notation: "compact",
                    }).format(combinedTotal)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* View Toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="combined-view"
              checked={combinedView}
              onCheckedChange={setCombinedView}
            />
            <Label htmlFor="combined-view">Combined View</Label>
          </div>

          {/* Quotations Tables */}
          {combinedView ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">All Quotations</h3>
              <DataTable
                columns={relatedQuotationColumns}
                data={[...directQuotations, ...relatedQuotations]}
              />
            </div>
          ) : (
            <Tabs defaultValue="direct">
              <TabsList>
                <TabsTrigger value="direct">
                  Direct Orders ({directQuotations.length})
                </TabsTrigger>
                <TabsTrigger value="related">
                  Related Orders ({relatedQuotations.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="direct" className="space-y-4">
                <DataTable columns={quotationColumns} data={directQuotations} />
              </TabsContent>

              <TabsContent value="related" className="space-y-4">
                {relatedQuotations.length > 0 ? (
                  <DataTable columns={relatedQuotationColumns} data={relatedQuotations} />
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    No related orders found
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
