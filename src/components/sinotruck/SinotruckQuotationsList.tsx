import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Eye, Download, Mail, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { SinotruckQuotationViewModal } from './SinotruckQuotationViewModal';
import { SinotruckInvoiceGenerator } from './SinotruckInvoiceGenerator';
import { SinotruckEditQuotationModal } from './SinotruckEditQuotationModal';

interface SinotruckQuotationsListProps {
  onRefresh: () => void;
}

export const SinotruckQuotationsList = ({ onRefresh }: SinotruckQuotationsListProps) => {
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedQuotation, setSelectedQuotation] = useState<any | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [invoiceGeneratorOpen, setInvoiceGeneratorOpen] = useState(false);

  useEffect(() => {
    loadQuotations();

    // Set up real-time subscription for quotation changes
    const channel = supabase
      .channel('sinotruck-quotations-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sinotruck_quotations'
        },
        (payload) => {
          console.log('New Sinotruck quotation created:', payload);
          loadQuotations();
          onRefresh();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sinotruck_quotations'
        },
        (payload) => {
          console.log('Sinotruck quotation updated:', payload);
          loadQuotations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'sinotruck_quotations'
        },
        (payload) => {
          console.log('Sinotruck quotation deleted:', payload);
          loadQuotations();
          onRefresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onRefresh]);

  const loadQuotations = async () => {
    try {
      const { data, error } = await supabase
        .from("sinotruck_quotations")
        .select("*")
        .eq("is_active_version", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      console.log('Loaded quotations:', data);
      setQuotations(data || []);
    } catch (error: any) {
      console.error("Error loading quotations:", error);
      toast.error("Failed to load quotations");
    } finally {
      setLoading(false);
    }
  };

  const handleViewQuotation = (quotation: any) => {
    setSelectedQuotation(quotation);
    setViewModalOpen(true);
  };

  const handleEditQuotation = (quotation: any) => {
    setSelectedQuotation(quotation);
    setEditModalOpen(true);
  };

  const handleGenerateInvoice = (quotation: any) => {
    setSelectedQuotation(quotation);
    setInvoiceGeneratorOpen(true);
  };

  const handleSendEmail = (quotation: any) => {
    toast.info("Email functionality coming soon");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this quotation?")) return;

    try {
      const { error } = await supabase.from("sinotruck_quotations").delete().eq("id", id);

      if (error) throw error;

      toast.success("Quotation deleted successfully");
      loadQuotations();
      onRefresh();
    } catch (error: any) {
      console.error("Error deleting quotation:", error);
      toast.error("Failed to delete quotation");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "secondary",
      sent: "default",
      confirmed: "default",
      cancelled: "destructive",
    };

    const colors: Record<string, string> = {
      draft: "bg-gray-500",
      sent: "bg-blue-500",
      confirmed: "bg-green-500",
      cancelled: "bg-red-500",
    };

    return (
      <Badge variant={variants[status] || "default"} className={colors[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const filteredQuotations = quotations.filter(
    (q) =>
      q.quotation_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.truck_model_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-8">Loading quotations...</div>;
  }

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Quotations</h2>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search quotations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Quotation No.</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Truck Model</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead className="text-right">Total Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredQuotations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No quotations found
                </TableCell>
              </TableRow>
            ) : (
              filteredQuotations.map((quotation) => (
                <TableRow key={quotation.id}>
                  <TableCell className="font-medium">{quotation.quotation_no}</TableCell>
                  <TableCell>{format(new Date(quotation.quotation_date), "MMM dd, yyyy")}</TableCell>
                  <TableCell>{quotation.customer_name}</TableCell>
                  <TableCell>{quotation.truck_model_name}</TableCell>
                  <TableCell>{quotation.quantity}</TableCell>
                  <TableCell className="text-right font-semibold">
                    LKR {quotation.total_price.toLocaleString()}
                  </TableCell>
                  <TableCell>{getStatusBadge(quotation.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleViewQuotation(quotation)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleGenerateInvoice(quotation)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleSendEmail(quotation)}
                      >
                        <Mail className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(quotation.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modals */}
      {selectedQuotation && (
        <>
          <SinotruckQuotationViewModal
            isOpen={viewModalOpen}
            onClose={() => {
              setViewModalOpen(false);
              setSelectedQuotation(null);
            }}
            quotation={selectedQuotation}
            onEdit={() => {
              setViewModalOpen(false);
              setEditModalOpen(true);
            }}
            onGenerateInvoice={() => {
              setViewModalOpen(false);
              setInvoiceGeneratorOpen(true);
            }}
            onDelete={async () => {
              await handleDelete(selectedQuotation.id);
              setViewModalOpen(false);
              setSelectedQuotation(null);
            }}
            onRefresh={loadQuotations}
          />

          <SinotruckInvoiceGenerator
            isOpen={invoiceGeneratorOpen}
            onClose={() => {
              setInvoiceGeneratorOpen(false);
              setSelectedQuotation(null);
            }}
            quotation={selectedQuotation}
          />

          <SinotruckEditQuotationModal
            isOpen={editModalOpen}
            onClose={() => {
              setEditModalOpen(false);
              setSelectedQuotation(null);
            }}
            quotation={selectedQuotation}
            onUpdate={() => {
              loadQuotations();
              onRefresh();
            }}
          />
        </>
      )}
    </Card>
  );
};
