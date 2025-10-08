import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Users, TrendingUp } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface YutongCustomerDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string | null;
}

export function YutongCustomerDetailModal({
  open,
  onOpenChange,
  customerId,
}: YutongCustomerDetailModalProps) {
  const [customer, setCustomer] = useState<any>(null);
  const [directQuotations, setDirectQuotations] = useState<any[]>([]);
  const [relatedQuotations, setRelatedQuotations] = useState<any[]>([]);
  const [subCustomers, setSubCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"separate" | "combined">("separate");

  useEffect(() => {
    if (open && customerId) {
      loadCustomerDetails();
    }
  }, [open, customerId]);

  const loadCustomerDetails = async () => {
    if (!customerId) return;

    setLoading(true);
    try {
      // Load customer
      const { data: customerData, error: customerError } = await supabase
        .from("yutong_customers")
        .select("*")
        .eq("id", customerId)
        .single();

      if (customerError) throw customerError;
      setCustomer(customerData);

        // Load direct quotations
        const { data: directData, error: directError } = await supabase
          .from("yutong_quotations")
          .select("*")
          .eq("customer_id", customerId)
          .order("created_at", { ascending: false });

        if (directError) throw directError;
        setDirectQuotations(directData || []);

      // Load sub-customers
      const { data: subData, error: subError } = await supabase
        .from("yutong_customers")
        .select("*")
        .eq("parent_customer_id", customerId);

      if (subError) throw subError;
      setSubCustomers(subData || []);

      // Load related quotations from sub-customers
      if (subData && subData.length > 0) {
        const subCustomerIds = subData.map((sub) => sub.id);
        const { data: relatedData, error: relatedError } = await supabase
          .from("yutong_quotations")
          .select("*, yutong_customers(company_name, relationship_notes)")
          .in("customer_id", subCustomerIds)
          .order("created_at", { ascending: false });

        if (relatedError) throw relatedError;
        setRelatedQuotations(relatedData || []);
      } else {
        setRelatedQuotations([]);
      }
    } catch (error: any) {
      console.error("Error loading customer details:", error);
    } finally {
      setLoading(false);
    }
  };

  const quotationColumns: ColumnDef<any>[] = [
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
      cell: ({ row }) => (
        <span className="font-medium">
          {new Intl.NumberFormat("en-LK", {
            style: "currency",
            currency: "LKR",
          }).format(row.getValue("total_price"))}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.getValue("status") === "confirmed" ? "default" : "secondary"}>
          {row.getValue("status")}
        </Badge>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Date",
      cell: ({ row }) => format(new Date(row.getValue("created_at")), "MMM dd, yyyy"),
    },
  ];

  const relatedQuotationColumns: ColumnDef<any>[] = [
    ...quotationColumns.slice(0, 1),
    {
      accessorKey: "yutong_customers",
      header: "Sub-Customer",
      cell: ({ row }) => {
        const customer = row.getValue("yutong_customers") as any;
        return (
          <div>
            <p className="font-medium">{customer?.company_name}</p>
            {customer?.relationship_notes && (
              <p className="text-xs text-muted-foreground">{customer.relationship_notes}</p>
            )}
          </div>
        );
      },
    },
    ...quotationColumns.slice(1),
  ];

  const directTotal = directQuotations.reduce((sum, q) => sum + (q.total_price || 0), 0);
  const relatedTotal = relatedQuotations.reduce((sum, q) => sum + (q.total_price || 0), 0);
  const combinedTotal = directTotal + relatedTotal;

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <Skeleton className="h-64" />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {customer?.company_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Customer Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Customer Code</p>
                  <p className="font-medium">{customer?.customer_code}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Contact Person</p>
                  <p className="font-medium">{customer?.contact_person}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{customer?.phone}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Totals */}
          <div className="flex gap-2 justify-end">
            <Button
              variant={viewMode === "separate" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("separate")}
            >
              Separate View
            </Button>
            <Button
              variant={viewMode === "combined" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("combined")}
            >
              Combined View
            </Button>
          </div>

          {viewMode === "separate" ? (
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Direct Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-2xl font-bold">
                      {new Intl.NumberFormat("en-LK", {
                        style: "currency",
                        currency: "LKR",
                        notation: "compact",
                      }).format(directTotal)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {directQuotations.length} quotations
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Related Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span className="text-2xl font-bold">
                      {new Intl.NumberFormat("en-LK", {
                        style: "currency",
                        currency: "LKR",
                        notation: "compact",
                      }).format(relatedTotal)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {relatedQuotations.length} quotations from {subCustomers.length} sub-customers
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Grand Total</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <TrendingUp className="h-4 w-4 text-purple-600" />
                    <span className="text-2xl font-bold">
                      {new Intl.NumberFormat("en-LK", {
                        style: "currency",
                        currency: "LKR",
                        notation: "compact",
                      }).format(combinedTotal)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {directQuotations.length + relatedQuotations.length} total quotations
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Combined Total</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <span className="text-3xl font-bold">
                    {new Intl.NumberFormat("en-LK", {
                      style: "currency",
                      currency: "LKR",
                    }).format(combinedTotal)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {directQuotations.length + relatedQuotations.length} quotations •{" "}
                  {subCustomers.length + 1} customers in group
                </p>
              </CardContent>
            </Card>
          )}

          {/* Quotations */}
          <Tabs defaultValue="direct">
            <TabsList>
              <TabsTrigger value="direct">
                Direct Quotations ({directQuotations.length})
              </TabsTrigger>
              {subCustomers.length > 0 && (
                <TabsTrigger value="related">
                  Related Quotations ({relatedQuotations.length})
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="direct" className="mt-4">
              <DataTable columns={quotationColumns} data={directQuotations} />
            </TabsContent>

            {subCustomers.length > 0 && (
              <TabsContent value="related" className="mt-4">
                <DataTable columns={relatedQuotationColumns} data={relatedQuotations} />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
