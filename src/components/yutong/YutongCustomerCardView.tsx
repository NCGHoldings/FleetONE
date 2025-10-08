import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { YutongCustomerCard } from "./YutongCustomerCard";
import { YutongCustomerLinkModal } from "./YutongCustomerLinkModal";
import { YutongCustomerDetailModal } from "./YutongCustomerDetailModal";
import { useYutongCustomerCards } from "@/hooks/useYutongCustomerCards";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface YutongCustomerCardViewProps {
  canManageLinks: boolean;
}

export function YutongCustomerCardView({ canManageLinks }: YutongCustomerCardViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const { customerCards, loading, loadCustomerCards, linkSubCustomer } = useYutongCustomerCards();
  const { toast } = useToast();

  useEffect(() => {
    loadCustomerCards();
  }, []);

  const filteredCards = customerCards.filter((card) =>
    card.customer.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    card.customer.customer_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleLinkSubCustomer = async (subCustomerId: string, mainCustomerId: string, notes: string) => {
    try {
      await linkSubCustomer(subCustomerId, mainCustomerId, notes);
      toast({
        title: "Success",
        description: "Sub-customer linked successfully",
      });
      setLinkModalOpen(false);
      loadCustomerCards();
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
          <YutongCustomerCard
            key={card.customer.id}
            customer={card.customer}
            subCustomersCount={card.subCustomersCount}
            totalQuotations={card.totalQuotations}
            totalValue={card.totalValue}
            latestQuotationDate={card.latestQuotationDate}
            onViewDetails={(id) => {
              setSelectedCustomerId(id);
              setDetailModalOpen(true);
            }}
            onLinkSubCustomer={(id) => {
              setSelectedCustomerId(id);
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

      <YutongCustomerLinkModal
        open={linkModalOpen}
        onOpenChange={setLinkModalOpen}
        mainCustomerId={selectedCustomerId}
        onLink={handleLinkSubCustomer}
      />

      <YutongCustomerDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        customerId={selectedCustomerId}
      />
    </div>
  );
}
