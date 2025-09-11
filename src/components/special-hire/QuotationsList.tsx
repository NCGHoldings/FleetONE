import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { FileText, Eye, Edit, Mail, Download, Search, Send, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { QuotationModal } from './QuotationModal';
import { EditQuotationModal } from './EditQuotationModal';
import { QuotationPreview } from './QuotationPreview';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  km_parking_to_pickup?: number;
  km_trip?: number;
  km_drop_to_parking?: number;
  total_distance_km?: number;
  gross_revenue: number;
  net_profit: number;
  fuel_cost_fuel_only?: number;
  hire_charge?: number;
  extra_charges?: number;
  commission_amount?: number;
  commission_pass_through_amount?: number;
  intermediate_stops?: string;
  route_description?: string;
  status: string;
  valid_until: string;
  created_at: string;
  created_by?: string;
  created_by_name?: string;
  percentage_adjustment?: number;
  audit_log?: any[];
  approval_status?: 'pending' | 'approved' | 'rejected';
  discount_percentage?: number;
  discount_type?: string;
  discount_amount_lkr?: number;
  additional_charges?: Array<{ type: string; amount: number; reason?: string }> | string;
  total_additional_charges?: number;
}

// Helper function to calculate total revenue (matches Final Total from QuotationPreview)
const calculateTotalRevenue = (quotation: Quotation): number => {
  const hireChargesAll = quotation.gross_revenue || 0; // includes all buses
  const fuelAll = quotation.fuel_cost_fuel_only || 0; // already total across buses
  const commissionPassThrough = quotation.commission_pass_through_amount || 0;
  const additional = quotation.total_additional_charges || 0;
  const discount = quotation.discount_amount_lkr || 0;

  const base = hireChargesAll + fuelAll + commissionPassThrough + additional - discount;
  const adjustmentPct = quotation.percentage_adjustment || 0;
  const adjustmentAmount = base * (adjustmentPct / 100);
  return Math.round(base + adjustmentAmount);
};

// Helper function to get revenue breakdown components (ALL buses)
const getRevenueBreakdown = (quotation: Quotation) => {
  const hire = quotation.gross_revenue || 0;
  const fuel = quotation.fuel_cost_fuel_only || 0; // already total across buses
  const commission = quotation.commission_pass_through_amount || 0;
  const additional = quotation.total_additional_charges || 0;
  const discountAmount = quotation.discount_amount_lkr || 0;
  const base = hire + fuel + commission + additional - discountAmount;
  const adjustmentAmount = base * ((quotation.percentage_adjustment || 0) / 100);
  
  // extras are already included in hire
  return { hire, fuel, extras: 0, additional, commission, discountAmount, adjustmentAmount };
};

interface Props {
  onRefresh: () => void;
}

export function QuotationsList({ onRefresh }: Props) {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [emailingQuotationId, setEmailingQuotationId] = useState<string | null>(null);
  const { toast } = useToast();

  const loadQuotations = async () => {
    try {
      const { data: quotationsData, error } = await supabase
        .from('special_hire_quotations')
        .select(`
          *,
          bus_types!bus_type_id (
            name,
            capacity
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get unique creator IDs that are not null
      const creatorIds = [...new Set(quotationsData?.map(q => q.created_by).filter(Boolean))] as string[];
      
      let creatorMap = new Map();
      
      // Only fetch profiles if we have creator IDs
      if (creatorIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, first_name')
          .in('user_id', creatorIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        }

        // Create a map of user_id to first_name
        profilesData?.forEach(profile => {
          creatorMap.set(profile.user_id, profile.first_name || 'Unknown User');
        });
      }
      
      // Transform the data to match our interface
      const transformedData = quotationsData?.map(item => ({
        ...item,
        bus_type: item.bus_types?.name || 'Unknown',
        seating_capacity: item.bus_types?.capacity || 54,
        created_by_name: item.created_by ? (creatorMap.get(item.created_by) || 'Unknown User') : 'System',
        total_distance_km: (item.km_parking_to_pickup || 0) + (item.km_trip || 0) + (item.km_drop_to_parking || 0),
        intermediate_stops: typeof item.intermediate_stops === 'string' ? item.intermediate_stops : JSON.stringify(item.intermediate_stops || []),
        audit_log: Array.isArray(item.audit_log) ? item.audit_log : (item.audit_log ? [item.audit_log] : []),
        additional_charges: typeof item.additional_charges === 'string' ? item.additional_charges : JSON.stringify(item.additional_charges || [])
      })) || [];
      
      console.log('Transformed quotations with creators:', transformedData.map(q => ({ 
        quotation_no: q.quotation_no, 
        created_by: q.created_by, 
        created_by_name: q.created_by_name 
      })));
      
      setQuotations(transformedData);
    } catch (error: any) {
      console.error('Error in loadQuotations:', error);
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

  const handleSendQuotation = async (quotation: Quotation) => {
    await handleStatusUpdate(quotation.id, 'sent');
  };

  const generatePDFBase64 = async (quotation: Quotation): Promise<string> => {
    // Create a temporary div to render the quotation
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '-9999px';
    tempDiv.style.width = '210mm';
    tempDiv.style.background = 'white';
    document.body.appendChild(tempDiv);

    // Import React and ReactDOM dynamically
    const React = await import('react');
    const ReactDOM = await import('react-dom/client');

    try {
      // Create React element and render it
      const root = ReactDOM.createRoot(tempDiv);
      const quotationElement = React.createElement(QuotationPreview, { quotation });
      
      await new Promise<void>((resolve) => {
        root.render(quotationElement);
        // Wait for render to complete
        setTimeout(resolve, 1000);
      });

      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;

      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      
      root.unmount();
      return pdf.output('datauristring').split(',')[1];
    } finally {
      document.body.removeChild(tempDiv);
    }
  };

  const handleEmailQuotation = async (quotation: Quotation) => {
    if (!quotation.customer_email) {
      toast({
        title: "Error",
        description: "No email address available for this customer",
        variant: "destructive"
      });
      return;
    }

    setEmailingQuotationId(quotation.id);
    try {
      const pdfBase64 = await generatePDFBase64(quotation);
      const date = new Date().toISOString().split('T')[0];
      const filename = `Quotation_${quotation.quotation_no}_${date}.pdf`;
      
      const subject = `Quotation ${quotation.quotation_no} - NCG Express`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">NCG Express</h2>
          <p>Dear ${quotation.customer_name},</p>
          <p>Please find your quotation details attached.</p>
          <p>Thank you for choosing NCG Express.</p>
          <br>
          <p>Best regards,<br>NCG Express Team</p>
        </div>
      `;

      const { error } = await supabase.functions.invoke('send-quotation-email', {
        body: {
          to: quotation.customer_email,
          subject,
          html,
          attachment: {
            filename,
            contentBase64: pdfBase64,
            contentType: 'application/pdf'
          }
        }
      });

      if (error) throw error;

      // Update status to sent
      await handleStatusUpdate(quotation.id, 'sent');
      
      toast({
        title: "Success",
        description: `Quotation emailed successfully to ${quotation.customer_email}`
      });
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast({
        title: "Error",
        description: 'Failed to send email: ' + (error.message || 'Unknown error'),
        variant: "destructive"
      });
    } finally {
      setEmailingQuotationId(null);
    }
  };

  const handleEditQuotation = (quotation: Quotation) => {
    setEditingQuotation(quotation);
    setShowEditModal(true);
  };

  const handleDeleteQuotation = async (quotation: Quotation) => {
    try {
      // Add audit log entry
      const currentUser = await supabase.auth.getUser();
      const auditEntry = {
        action: 'DELETE',
        timestamp: new Date().toISOString(),
        user_id: currentUser.data.user?.id,
        user_email: currentUser.data.user?.email,
        changes: {
          quotation_no: quotation.quotation_no,
          customer_name: quotation.customer_name,
          status: quotation.status
        }
      };

      const existingAuditLog = quotation.audit_log || [];
      
      const { error } = await supabase
        .from('special_hire_quotations')
        .delete()
        .eq('id', quotation.id);

      if (error) throw error;

      await loadQuotations();
      onRefresh();
      toast({
        title: "Success",
        description: "Quotation deleted successfully"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleEditSubmit = async () => {
    await loadQuotations();
    onRefresh();
    setShowEditModal(false);
    setEditingQuotation(null);
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
      cell: ({ row }) => {
        // Parse intermediate stops for display
        let intermediateStops = [];
        try {
          if (row.original.intermediate_stops) {
            intermediateStops = JSON.parse(row.original.intermediate_stops);
          }
        } catch (e) {
          console.warn('Failed to parse intermediate stops:', e);
        }

        // Build route description
        let routeDescription = row.original.pickup_location;
        if (intermediateStops.length > 0) {
          intermediateStops.forEach((stop: any) => {
            if (stop.location) {
              routeDescription += ` → ${stop.location}`;
            }
          });
        }
        routeDescription += ` → ${row.original.drop_location}`;

        return (
          <div className="max-w-xs">
            <div className="text-sm font-medium">{routeDescription}</div>
            {intermediateStops.length > 0 && (
              <div className="text-xs text-muted-foreground">
                {intermediateStops.length} intermediate stop{intermediateStops.length > 1 ? 's' : ''}
              </div>
            )}
          </div>
        );
      },
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
      cell: ({ row }) => {
        const quotation = row.original;
        const totalRevenue = calculateTotalRevenue(quotation);
        const breakdown = getRevenueBreakdown(quotation);
        const hasDiscount = breakdown.discountAmount > 0;
        const hasAdjustment = Math.abs(breakdown.adjustmentAmount || 0) > 0;
        const hasMultipleComponents = [breakdown.hire, breakdown.fuel, breakdown.additional, breakdown.commission]
          .filter(x => x > 0).length > 1 || hasAdjustment;
        
        return (
          <div className="text-right">
            <div className="font-medium">LKR {totalRevenue.toLocaleString()}</div>
            {(hasDiscount || hasMultipleComponents) && (
              <div className="text-xs text-muted-foreground space-y-1">
                {hasMultipleComponents && (
                  <div>
                    {breakdown.hire > 0 && `Hire: ${breakdown.hire.toLocaleString()}`}
                    {breakdown.fuel > 0 && ` + Fuel: ${breakdown.fuel.toLocaleString()}`}
                    {breakdown.additional > 0 && ` + Addl: ${breakdown.additional.toLocaleString()}`}
                    {breakdown.commission > 0 && ` + Comm: ${breakdown.commission.toLocaleString()}`}
                    {hasAdjustment && ` + Adj: ${(breakdown.adjustmentAmount > 0 ? '+' : '') + Math.round(breakdown.adjustmentAmount).toLocaleString()}`}
                  </div>
                )}
                {hasDiscount && (
                  <div className="text-red-600">
                    {quotation.discount_type === 'percentage' 
                      ? `Discount: -${quotation.discount_percentage}% (LKR ${breakdown.discountAmount.toLocaleString()})`
                      : `Discount: -LKR ${breakdown.discountAmount.toLocaleString()}`
                    }
                  </div>
                )}
              </div>
            )}
            <div className="text-xs text-green-600">
              Profit: LKR {quotation.net_profit.toLocaleString()}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "created_by_name",
      header: "Generated By",
      cell: ({ row }) => (
        <div className="text-sm font-medium">{row.getValue("created_by_name")}</div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const quotation = row.original;
        const hasDiscount = (quotation.discount_type === 'percentage' && (quotation.discount_percentage || 0) > 0) ||
                           (quotation.discount_type === 'amount' && (quotation.discount_amount_lkr || 0) > 0);
        const isDraft = quotation.approval_status === 'pending' && hasDiscount;
        
        return (
          <div className="flex flex-col gap-1">
            {getStatusBadge(row.getValue("status"))}
            {isDraft && (
              <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                DRAFT
              </Badge>
            )}
          </div>
        );
      },
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
                title="View Quotation"
              >
                <Eye className="h-4 w-4" />
              </Button>
              {quotation.status === 'draft' && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleEditQuotation(quotation)}
                    title="Edit Quotation"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        title="Delete Quotation"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Quotation</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete quotation {quotation.quotation_no}? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteQuotation(quotation)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
              {quotation.status === 'draft' && (
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => handleSendQuotation(quotation)}
                  title="Send Quotation"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Send className="h-4 w-4" />
                </Button>
              )}
              {quotation.status === 'sent' && (
                <>
                  <Button 
                    variant="default"
                    size="sm" 
                    onClick={() => handleStatusUpdate(quotation.id, 'confirmed')}
                    title="Confirm Quotation"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Confirm
                  </Button>
                  <Button 
                    variant="destructive"
                    size="sm" 
                    onClick={() => handleStatusUpdate(quotation.id, 'declined')}
                    title="Decline Quotation"
                  >
                    Decline
                  </Button>
                </>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleEmailQuotation(quotation)}
                title="Email Quotation"
                disabled={emailingQuotationId === quotation.id}
              >
                {emailingQuotationId === quotation.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
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

      {showEditModal && editingQuotation && (
        <EditQuotationModal
          quotation={editingQuotation}
          onClose={() => {
            setShowEditModal(false);
            setEditingQuotation(null);
          }}
          onUpdate={handleEditSubmit}
        />
      )}
    </>
  );
}