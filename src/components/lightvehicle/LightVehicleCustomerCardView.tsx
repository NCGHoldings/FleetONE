// @ts-nocheck
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { LightVehicleCustomerCard } from "./LightVehicleCustomerCard";
import { LightVehicleCustomerLinkModal } from "./LightVehicleCustomerLinkModal";
import { LightVehicleCustomerDetailModal } from "./LightVehicleCustomerDetailModal";
import { useLightVehicleQuotationCards } from "@/hooks/useLightVehicleQuotationCards";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface LightVehicleCustomerCardViewProps {
  canManageLinks: boolean;
}

export function LightVehicleCustomerCardView({ canManageLinks }: LightVehicleCustomerCardViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomerName, setSelectedCustomerName] = useState<string | null>(null);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const { cards, loading, loadCards, linkSubCustomer } = useLightVehicleQuotationCards();
  const { toast } = useToast();

  useEffect(() => {
    loadCards();
  }, []);

  const filteredCards = cards.filter((card) =>
    card.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (card.companyName && card.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleLinkSubCustomer = async (subCustomerName: string, mainCustomerName: string, notes: string) => {
    try {
      await linkSubCustomer(subCustomerName, mainCustomerName, notes);
      toast({
        title: "Success",
        description: "Sub-customer linked successfully",
      });
      setLinkModalOpen(false);
      loadCards();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search customers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCards.map((card) => (
          <LightVehicleCustomerCard
            key={card.customerName}
            customerName={card.customerName}
            companyName={card.companyName}
            quotationCount={card.quotationCount}
            totalValue={card.totalValue}
            latestQuotationDate={card.latestQuotationDate}
            subCustomerNames={card.subCustomerNames}
            onViewDetails={(name) => {
              setSelectedCustomerName(name);
              setDetailModalOpen(true);
            }}
            onLinkSubCustomer={(name) => {
              setSelectedCustomerName(name);
              setLinkModalOpen(true);
            }}
            canManageLinks={canManageLinks}
          />
        ))}
      </div>

      {filteredCards.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No customers found matching your search.
        </div>
      )}

      <LightVehicleCustomerLinkModal
        open={linkModalOpen}
        onOpenChange={setLinkModalOpen}
        mainCustomerName={selectedCustomerName}
        onLink={handleLinkSubCustomer}
      />

      <LightVehicleCustomerDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        customerName={selectedCustomerName}
      />
    </div>
  );
}
