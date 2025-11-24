import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Package, Plus, Calendar } from "lucide-react";
import { formatDateDisplay } from "@/lib/utils";
import { useState } from "react";
import { AddTyreModal } from "./AddTyreModal";

interface NSPTyreInventoryProps {
  buses: any[];
}

export const NSPTyreInventory = ({ buses }: NSPTyreInventoryProps) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  // Fetch NSP daily sales with tyre entries
  const { data: nspSales, isLoading } = useQuery({
    queryKey: ["nsp-tyre-inventory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nsp_daily_sales")
        .select("*")
        .order("sale_date", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Filter only sales with tyre entries and expand them
      const salesWithTyres = data?.filter((sale: any) => 
        sale.tyre_entries && Array.isArray(sale.tyre_entries) && sale.tyre_entries.length > 0
      );

      return salesWithTyres;
    },
  });

  // Fetch which tyres are already linked to fleet
  const { data: linkedTyres } = useQuery({
    queryKey: ["linked-nsp-tyres"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bus_tyres")
        .select("nsp_sale_reference_id")
        .not("nsp_sale_reference_id", "is", null);

      if (error) throw error;
      return data?.map(t => t.nsp_sale_reference_id) || [];
    },
  });

  const handleInstallToFleet = (saleId: string) => {
    setSelectedSaleId(saleId);
    setShowAddModal(true);
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="mt-2 text-muted-foreground">Loading tyre inventory...</p>
        </div>
      </Card>
    );
  }

  if (!nspSales || nspSales.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-center text-muted-foreground">No tyre purchases found in NSP sales</p>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {nspSales?.map((sale: any) => {
          const tyreEntries = sale.tyre_entries || [];
          const saleLinked = linkedTyres?.includes(sale.id);

          return (
            <Card key={sale.id} className="p-4 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Package className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      NSP Sale - {formatDateDisplay(sale.sale_date)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {tyreEntries.length} tyre{tyreEntries.length !== 1 ? 's' : ''} purchased
                    </p>
                  </div>
                </div>
                {saleLinked && (
                  <Badge className="bg-emerald-500">
                    Linked to Fleet
                  </Badge>
                )}
              </div>

              <div className="space-y-2 mb-3">
                {tyreEntries.map((entry: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{entry.type}</span>
                      {entry.quantity && (
                        <Badge variant="outline">Qty: {entry.quantity}</Badge>
                      )}
                    </div>
                    <span className="font-semibold text-primary">
                      LKR {entry.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={saleLinked ? "outline" : "default"}
                  onClick={() => handleInstallToFleet(sale.id)}
                  className="flex-1"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  {saleLinked ? "Add Another to Fleet" : "Install to Fleet"}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {showAddModal && (
        <AddTyreModal
          open={showAddModal}
          onOpenChange={setShowAddModal}
          buses={buses}
          nspSaleReferenceId={selectedSaleId}
        />
      )}
    </>
  );
};
