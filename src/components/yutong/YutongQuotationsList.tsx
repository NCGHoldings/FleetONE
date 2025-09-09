
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
import { YutongQuotationViewModal } from './YutongQuotationViewModal';

interface YutongQuotation {
  id: string;
  quotation_no: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  company_name: string;
  bus_model: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: string;
  valid_until: string;
  created_at: string;
  created_by: string;
  creator_name?: string;
  special_features?: string;
  delivery_timeline?: string;
  payment_terms?: string;
  warranty_terms?: string;
  discount_percentage?: number;
}

interface YutongQuotationsListProps {
  onRefresh: () => void;
}

export function YutongQuotationsList({ onRefresh }: YutongQuotationsListProps) {
  const [quotations, setQuotations] = useState<YutongQuotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuotation, setSelectedQuotation] = useState<YutongQuotation | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const { toast } = useToast();

  const loadQuotations = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('yutong_quotations')
        .select(`
          *,
          profiles:created_by (
            first_name,
            last_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform data to include creator name
      const transformedData = (data || []).map((quotation: any) => ({
        ...quotation,
        creator_name: quotation.profiles 
          ? `${quotation.profiles.first_name} ${quotation.profiles.last_name}`.trim()
          : 'Unknown'
      }));
      
      setQuotations(transformedData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load quotations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuotations();
  }, []);

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: "secondary",
      sent: "default",
      confirmed: "default",
      expired: "destructive"
    } as const;

    const colors = {
      draft: "bg-gray-100 text-gray-800",
      sent: "bg-blue-100 text-blue-800",
      confirmed: "bg-green-100 text-green-800",
      expired: "bg-red-100 text-red-800"
    };

    return (
      <Badge className={colors[status as keyof typeof colors]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const { error } = await (supabase as any)
        .from('yutong_quotations')
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
      const { error } = await (supabase as any)
        .from('yutong_quotations')
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

  const handleViewQuotation = (quotation: YutongQuotation) => {
    setSelectedQuotation(quotation);
    setViewModalOpen(true);
  };

  const columns: ColumnDef<YutongQuotation>[] = [
    {
      accessorKey: "quotation_no",
      header: "Quotation No",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("quotation_no")}</div>
      ),
    },
    {
      accessorKey: "customer_name",
      header: "Customer",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.getValue("customer_name")}</div>
          <div className="text-sm text-muted-foreground">
            {row.original.company_name}
          </div>
        </div>
      ),
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
      header: "Total Price",
      cell: ({ row }) => (
        <div className="font-medium">
          LKR {row.getValue<number>("total_price").toLocaleString()}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => getStatusBadge(row.getValue("status")),
    },
    {
      accessorKey: "valid_until",
      header: "Valid Until",
      cell: ({ row }) => {
        const date = row.getValue("valid_until");
        return date ? format(new Date(date as string), 'MMM dd, yyyy') : '-';
      },
    },
    {
      accessorKey: "creator_name",
      header: "Created By",
      cell: ({ row }) => (
        <div className="text-sm">
          {row.original.creator_name || 'Unknown'}
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const quotation = row.original;
        return (
          <div className="flex space-x-1">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleViewQuotation(quotation)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4" />
            </Button>
            <Select
              value={quotation.status}
              onValueChange={(value) => handleStatusUpdate(quotation.id, value)}
            >
              <SelectTrigger className="w-24 h-8">
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
              variant="outline" 
              size="sm"
              onClick={() => handleDelete(quotation.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Yutong Bus Quotations</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable 
            columns={columns} 
            data={quotations} 
            searchKey="quotation_no"
          />
        </CardContent>
      </Card>

      <YutongQuotationViewModal
        quotation={selectedQuotation}
        open={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
      />
    </>
  );
}
