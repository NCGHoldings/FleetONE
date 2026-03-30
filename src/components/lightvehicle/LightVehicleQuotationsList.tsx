// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ColumnDef } from '@tanstack/react-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { LightVehicleQuotationViewModal } from './LightVehicleQuotationViewModal';
import { LightVehicleEditQuotationModal } from './LightVehicleEditQuotationModal';

interface LightVehicleQuotation {
  id: string;
  quotation_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_address?: string;
  company_name?: string;
  customer_type?: string;
  business_registration_number?: string;
  tax_registration_number?: string;
  representative_name?: string;
  designation?: string;
  vehicle_name: string;
  brand: string;
  category: string;
  engine_cc?: string;
  transmission?: string;
  fuel_type?: string;
  color?: string;
  quantity: number;
  unit_price: number;
  discount_amount?: number;
  grand_total: number;
  status: string;
  valid_until?: string;
  created_at: string;
  notes?: string;
  payment_terms?: string;
  warranty_terms?: string;
  delivery_timeline?: string;
  model_id?: string;
  finance_company?: string;
  contact_person?: string;
}

interface LightVehicleQuotationsListProps {
  onRefresh: () => void;
}

export function LightVehicleQuotationsList({ onRefresh }: LightVehicleQuotationsListProps) {
  const [quotations, setQuotations] = useState<LightVehicleQuotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuotation, setSelectedQuotation] = useState<LightVehicleQuotation | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editQuotation, setEditQuotation] = useState<LightVehicleQuotation | null>(null);
  const { toast } = useToast();

  const loadQuotations = async () => {
    try {
      const { data, error } = await supabase
        .from('lightvehicle_quotations')
        .select('*')
        .eq('is_active_version', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotations(data || []);
    } catch (error: any) {
      console.error('Error loading quotations:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load quotations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuotations();

    const channel = supabase
      .channel('lightvehicle-quotations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lightvehicle_quotations'
        },
        () => {
          loadQuotations();
          onRefresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [onRefresh]);

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-gray-100 text-gray-800",
      sent: "bg-blue-100 text-blue-800",
      confirmed: "bg-green-100 text-green-800",
      expired: "bg-red-100 text-red-800"
    };

    return (
      <Badge className={colors[status] || "bg-gray-100 text-gray-800"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('lightvehicle_quotations')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Quotation ${newStatus} successfully`
      });

      loadQuotations();
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this quotation?')) return;

    try {
      const { error } = await supabase
        .from('lightvehicle_quotations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Quotation deleted successfully"
      });

      loadQuotations();
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleViewQuotation = (quotation: LightVehicleQuotation) => {
    setSelectedQuotation(quotation);
    setIsViewModalOpen(true);
  };

  const handleEditQuotation = (quotation: LightVehicleQuotation) => {
    setEditQuotation(quotation);
    setIsEditModalOpen(true);
  };

  const handleEditSuccess = () => {
    loadQuotations();
    onRefresh();
  };

  const columns: ColumnDef<LightVehicleQuotation>[] = [
    {
      accessorKey: "quotation_number",
      header: "Quotation No",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.quotation_number}</span>
      ),
    },
    {
      accessorKey: "customer_name",
      header: "Customer",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.customer_name}</div>
          {row.original.company_name && (
            <div className="text-sm text-muted-foreground">{row.original.company_name}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "vehicle_name",
      header: "Vehicle",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.vehicle_name}</div>
          <div className="text-sm text-muted-foreground capitalize">
            {row.original.brand} - {row.original.category}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "quantity",
      header: "Qty",
    },
    {
      accessorKey: "grand_total",
      header: "Total",
      cell: ({ row }) => (
        <span className="font-medium">
          LKR {row.original.grand_total?.toLocaleString() || 0}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    {
      accessorKey: "created_at",
      header: "Date",
      cell: ({ row }) => format(new Date(row.original.created_at), 'dd/MM/yyyy'),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const quotation = row.original;
        return (
          <div className="flex items-center gap-2">
            <Select
              value={quotation.status}
              onValueChange={(value) => handleStatusUpdate(quotation.id, value)}
            >
              <SelectTrigger className="w-[100px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="ghost" 
              size="icon" 
              title="View"
              onClick={() => handleViewQuotation(quotation)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              title="Edit"
              onClick={() => handleEditQuotation(quotation)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              title="Delete"
              onClick={() => handleDelete(quotation.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        );
      },
    },
  ];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quotations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48">
            <div className="text-muted-foreground">Loading quotations...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Light Vehicle Quotations</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={quotations} />
          {quotations.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No quotations found. Create your first quotation to get started.
            </div>
          )}
        </CardContent>
      </Card>

      <LightVehicleQuotationViewModal
        quotation={selectedQuotation}
        open={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedQuotation(null);
        }}
      />

      <LightVehicleEditQuotationModal
        quotation={editQuotation}
        open={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditQuotation(null);
        }}
        onSuccess={handleEditSuccess}
      />
    </>
  );
}
