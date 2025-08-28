import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { FileText, Eye, Edit, Mail, Download, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { QuotationModal } from './QuotationModal';

interface Quotation {
  id: string;
  quotation_no: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  company_name?: string;
  contact_number?: string;
  hire_type: string;
  number_of_buses: number;
  bus_type: string;
  seating_capacity?: number;
  pickup_location: string;
  drop_location: string;
  pickup_datetime: string;
  drop_datetime?: string;
  total_distance_km?: number;
  gross_revenue: number;
  net_profit: number;
  fuel_cost_fuel_only?: number;
  hire_charge?: number;
  extra_charges?: number;
  commission_amount?: number;
  status: string;
  valid_until: string;
  created_at: string;
}

interface Props {
  onRefresh: () => void;
}

export function QuotationsList({ onRefresh }: Props) {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [showModal, setShowModal] = useState(false);
  const { toast } = useToast();

  const loadQuotations = async () => {
    try {
      const { data, error } = await supabase
        .from('special_hire_quotations')
        .select(`
          *,
          bus_types!bus_type_id (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedData = data?.map(item => ({
        ...item,
        bus_type: item.bus_types?.name || 'Unknown'
      })) || [];
      
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
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "outline",
      sent: "secondary",
      accepted: "default",
      rejected: "destructive",
      confirmed: "default",
      declined: "destructive"
    };

    const colors: Record<string, string> = {
      draft: "text-gray-600",
      sent: "text-blue-600",
      accepted: "text-green-600",
      rejected: "text-red-600",
      confirmed: "text-green-600",
      declined: "text-red-600"
    };

    return (
      <Badge variant={variants[status] || "outline"} className={colors[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('special_hire_quotations')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      await loadQuotations();
      onRefresh();
      toast({
        title: "Success",
        description: `Quotation ${newStatus} successfully`
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleViewQuotation = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setShowModal(true);
  };

  const handleDownloadQuotation = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setShowModal(true);
  };

  const handleEmailQuotation = (quotation: Quotation) => {
    if (quotation.customer_email) {
      const subject = `Quotation ${quotation.quotation_no} - NCG Express`;
      const body = `Dear ${quotation.customer_name},\n\nPlease find your quotation details.\n\nThank you for choosing NCG Express.`;
      window.open(`mailto:${quotation.customer_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    } else {
      toast({
        title: "Error",
        description: "No email address available for this customer",
        variant: "destructive"
      });
    }
  };

  const columns: ColumnDef<Quotation>[] = [
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
          <div className="text-sm text-muted-foreground">{row.original.customer_phone}</div>
        </div>
      ),
    },
    {
      accessorKey: "hire_type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant="outline">{row.getValue("hire_type")}</Badge>
      ),
    },
    {
      accessorKey: "pickup_location",
      header: "Route",
      cell: ({ row }) => (
        <div className="max-w-xs">
          <div className="text-sm font-medium">{row.original.pickup_location}</div>
          <div className="text-xs text-muted-foreground">to {row.original.drop_location}</div>
        </div>
      ),
    },
    {
      accessorKey: "pickup_datetime",
      header: "Date",
      cell: ({ row }) => (
        <div className="text-sm">
          {format(new Date(row.getValue("pickup_datetime")), "MMM dd, yyyy")}
        </div>
      ),
    },
    {
      accessorKey: "gross_revenue",
      header: "Revenue",
      cell: ({ row }) => (
        <div className="text-right">
          <div className="font-medium">LKR {row.original.gross_revenue.toLocaleString()}</div>
          <div className="text-xs text-green-600">
            Profit: LKR {row.original.net_profit.toLocaleString()}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => getStatusBadge(row.getValue("status")),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const quotation = row.original;
        return (
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleViewQuotation(quotation)}
              title="View Quotation"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" title="Edit Quotation">
              <Edit className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleEmailQuotation(quotation)}
              title="Email Quotation"
            >
              <Mail className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleDownloadQuotation(quotation)}
              title="Download Quotation"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  const filteredQuotations = quotations.filter(quotation =>
    quotation.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quotation.quotation_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quotation.pickup_location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Quotations</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search quotations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredQuotations}
            searchKey="customer_name"
          />
        </CardContent>
      </Card>

      <QuotationModal 
        quotation={selectedQuotation}
        open={showModal}
        onOpenChange={setShowModal}
      />
    </>
  );
}