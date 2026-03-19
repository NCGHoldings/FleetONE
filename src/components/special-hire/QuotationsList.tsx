import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { FileText, Eye, Edit, Mail, Download, Search, Send, Trash2, Loader2, Calculator, GitBranch, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { QuotationModal } from './QuotationModal';
import { EditQuotationModal } from './EditQuotationModal';
import { SpecialHireExportModal } from './SpecialHireExportModal';
import { QuotationPreview } from './QuotationPreview';
import { QuotationVersionIndicator } from './QuotationVersionIndicator';
import { DocumentFlowDashboard } from './DocumentFlowDashboard';
import { SpecialHireQuotationRepeatModal } from './SpecialHireQuotationRepeatModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { canvasToMultiPagePDF } from '@/lib/pdf-multi-page';
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
  // Versioning fields
  parent_quotation_id?: string;
  version_number?: string;
  edit_type?: string;
  edit_reason?: string;
  is_active_version?: boolean;
  // All versions for this quotation
  all_versions?: any[];
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
  onViewInCalculator?: (quotationId: string) => void;
  refreshTrigger?: number;
}

export function QuotationsList({ onRefresh, onViewInCalculator, refreshTrigger }: Props) {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [hireTypeFilter, setHireTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [approvalFilter, setApprovalFilter] = useState('all');
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDocumentFlow, setShowDocumentFlow] = useState(false);
  const [documentFlowQuotation, setDocumentFlowQuotation] = useState<Quotation | null>(null);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [emailingQuotationId, setEmailingQuotationId] = useState<string | null>(null);
  const [showRepeatModal, setShowRepeatModal] = useState(false);
  const [repeatQuotation, setRepeatQuotation] = useState<Quotation | null>(null);

  const loadQuotations = async () => {
    try {
      // Get exact total count via a head-only query
      const { count: exactCount } = await supabase
        .from('special_hire_quotations')
        .select('*', { count: 'exact', head: true })
        .eq('is_active_version', true);

      setTotalCount(exactCount || 0);

      // Fetch all quotations using cursor-based pagination to bypass offset limits
      const batchSize = 1000;
      let allQuotationsData: any[] = [];
      let lastCreatedAt: string | null = null;
      let lastId: string | null = null;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('special_hire_quotations')
          .select(`
            *,
            bus_types!bus_type_id (
              name,
              capacity
            )
          `)
          .eq('is_active_version', true)
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .limit(batchSize);

        // Apply cursor filter for subsequent batches
        if (lastCreatedAt && lastId) {
          query = query.or(`created_at.lt.${lastCreatedAt},and(created_at.eq.${lastCreatedAt},id.lt.${lastId})`);
        }

        const { data, error } = await query;

        if (error) throw error;
        const batch = data || [];
        allQuotationsData = allQuotationsData.concat(batch);
        hasMore = batch.length === batchSize;

        if (batch.length > 0) {
          const lastItem = batch[batch.length - 1];
          lastCreatedAt = lastItem.created_at;
          lastId = lastItem.id;
        }
      }

      const quotationsData = allQuotationsData;

      // Get all unique user IDs
      const userIds = [...new Set(quotationsData?.map(q => q.created_by).filter(Boolean))];
      
      // Batch fetch all profiles in ONE query
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', userIds);

      // Create a lookup map for quick access
      const profileMap = new Map(
        profiles?.map(p => [
          p.user_id, 
          `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown User'
        ])
      );

      // Transform data with creator names from the map
      // Helper function for safe JSON parsing
      const safeParseJSON = <T,>(value: any, fallback: T): T => {
        if (value === null || value === undefined || value === '') return fallback;
        if (typeof value === 'object') return value as T;
        try { return JSON.parse(value); } 
        catch { return fallback; }
      };

      const transformedData = quotationsData.map((item: any) => ({
        ...item,
        bus_type: (() => {
          const fleetDetails = safeParseJSON(item.bus_fleet_details, null);
          return fleetDetails?.buses?.[0]?.bus_type_name || item.bus_types?.name || 'Unknown';
        })(),
        seating_capacity: item.bus_types?.capacity || 54,
        created_by_name: item.created_by ? profileMap.get(item.created_by) || 'Unknown User' : 'System',
        total_distance_km: (item.km_parking_to_pickup || 0) + (item.km_trip || 0) + (item.km_drop_to_parking || 0),
        intermediate_stops: typeof item.intermediate_stops === 'string' ? item.intermediate_stops : JSON.stringify(item.intermediate_stops || []),
        audit_log: Array.isArray(item.audit_log) ? item.audit_log : (item.audit_log ? [item.audit_log] : []),
        additional_charges: typeof item.additional_charges === 'string' ? item.additional_charges : JSON.stringify(item.additional_charges || []),
        bus_fleet_details: safeParseJSON(item.bus_fleet_details, null),
        all_versions: [] // Load versions lazily when needed
      }));

      setQuotations(transformedData);
    } catch (error: any) {
      console.error('Error in loadQuotations:', error);
      toast.error("Failed to load quotations", {
        description: error.message || "Unknown error occurred"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuotations();
  }, [refreshTrigger]);

  // Set up realtime subscription for automatic updates
  useEffect(() => {
    const channel = supabase
      .channel('quotations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'special_hire_quotations'
        },
        () => {
          loadQuotations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
      toast.success(`Quotation ${newStatus} successfully`);
    } catch (error: any) {
      toast.error("Failed to update status", {
        description: error.message
      });
    }
  };

  const handleViewQuotation = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setShowModal(true);
  };

  const handleViewDocumentFlow = (quotation: Quotation) => {
    setDocumentFlowQuotation(quotation);
    setShowDocumentFlow(true);
  };

  const loadVersionsForQuotation = async (quotationId: string) => {
    try {
      const quotation = quotations.find(q => q.id === quotationId);
      if (!quotation || quotation.all_versions.length > 0) return; // Already loaded

      const rootId = quotation.parent_quotation_id || quotation.id;
      
      // Fetch all versions
      const { data: allVersions } = await supabase
        .from('special_hire_quotations')
        .select('id, version_number, edit_type, edit_reason, is_active_version, created_at, created_by')
        .or(`id.eq.${rootId},parent_quotation_id.eq.${rootId}`)
        .order('version_number', { ascending: false });

      // Get unique user IDs and batch fetch profiles
      const versionUserIds = [...new Set(allVersions?.map(v => v.created_by).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', versionUserIds);

      const profileMap = new Map(
        profiles?.map(p => [
          p.user_id, 
          `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown User'
        ])
      );

      const versionsWithCreators = allVersions?.map(version => ({
        ...version,
        created_by_name: version.created_by ? profileMap.get(version.created_by) || 'Unknown User' : 'System'
      })) || [];

      // Update the quotation with versions
      setQuotations(prev => prev.map(q => 
        q.id === quotationId ? { ...q, all_versions: versionsWithCreators } : q
      ));
    } catch (error: any) {
      console.error('Error loading versions:', error);
    }
  };

  const handleViewVersion = async (versionId: string) => {
    try {
      const { data: versionData, error } = await supabase
        .from('special_hire_quotations')
        .select(`
          *,
          bus_types!bus_type_id (
            name,
            capacity
          )
        `)
        .eq('id', versionId)
        .single();

      if (error) throw error;

      // Transform the version data to match our interface
      // Safe JSON parse helper
      const safeParseJSON = <T,>(value: any, fallback: T): T => {
        if (value === null || value === undefined || value === '') return fallback;
        if (typeof value === 'object') return value as T;
        try { return JSON.parse(value); } 
        catch { return fallback; }
      };

      const transformedVersion = {
        ...versionData,
        bus_type: versionData.bus_types?.name || 'Unknown',
        seating_capacity: versionData.bus_types?.capacity || 54,
        total_distance_km: (versionData.km_parking_to_pickup || 0) + (versionData.km_trip || 0) + (versionData.km_drop_to_parking || 0),
        intermediate_stops: typeof versionData.intermediate_stops === 'string' ? versionData.intermediate_stops : JSON.stringify(versionData.intermediate_stops || []),
        audit_log: Array.isArray(versionData.audit_log) ? versionData.audit_log : (versionData.audit_log ? [versionData.audit_log] : []),
        additional_charges: typeof versionData.additional_charges === 'string' ? versionData.additional_charges : JSON.stringify(versionData.additional_charges || []),
        bus_fleet_details: safeParseJSON(versionData.bus_fleet_details, null)
      };

      setSelectedQuotation(transformedVersion as Quotation);
      setShowModal(true);
    } catch (error: any) {
      toast.error("Failed to load quotation version", {
        description: error.message
      });
    }
  };

  const handleDownloadQuotation = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setShowModal(true);
  };

  const handleSendQuotation = async (quotation: Quotation) => {
    await handleStatusUpdate(quotation.id, 'sent');
  };

  const generatePDFBase64 = async (quotation: Quotation): Promise<string> => {
    console.log('📄 Starting PDF generation for quotation:', quotation.quotation_no);
    
    const tempDiv = document.createElement('div');
    tempDiv.style.cssText = `
      position: absolute;
      left: -10000px;
      top: 0;
      width: 210mm;
      background: white;
      visibility: hidden;
    `;
    document.body.appendChild(tempDiv);

    try {
      const root = createRoot(tempDiv);
      const quotationElement = React.createElement(QuotationPreview, { quotation });
      
      await new Promise<void>((resolve) => {
        root.render(quotationElement);
        setTimeout(resolve, 2000); // Give more time for rendering
      });

      console.log('📸 Generating section-based PDF...');
      const pdf = await sectionBasedPDF(tempDiv);

      console.log('✅ PDF generated');

      root.unmount();
      document.body.removeChild(tempDiv);
      
      const base64 = pdf.output('datauristring').split(',')[1];
      console.log('✅ PDF generated successfully, size:', base64.length, 'bytes');
      
      return base64;
    } catch (error) {
      console.error('❌ PDF generation failed:', error);
      document.body.removeChild(tempDiv);
      throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleEmailQuotation = async (quotation: Quotation) => {
    console.log('📧 === EMAIL SEND STARTED ===');
    console.log('Quotation:', quotation.quotation_no);
    console.log('Customer:', quotation.customer_name);
    console.log('Email:', quotation.customer_email);

    if (!quotation.customer_email) {
      toast.error("No email address", {
        description: "This customer doesn't have an email address. Please add one first."
      });
      return;
    }

    setEmailingQuotationId(quotation.id);
    
    const loadingToast = toast.loading("Sending email...", {
      description: "Generating PDF and sending to customer"
    });

    try {
      // Step 1: Generate PDF
      toast.loading("Generating PDF document...", { id: loadingToast });
      console.log('📄 Step 1: Generating PDF...');
      const pdfBase64 = await generatePDFBase64(quotation);
      console.log('✅ PDF generated, size:', pdfBase64.length);

      // Step 2: Prepare email data
      const date = new Date().toISOString().split('T')[0];
      const filename = `Quotation_${quotation.quotation_no}_${date}.pdf`;
      const subject = `Quotation ${quotation.quotation_no} - NCG Express`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">NCG Express</h2>
          <p>Dear ${quotation.customer_name},</p>
          <p>Please find your quotation details attached.</p>
          <p><strong>Quotation Number:</strong> ${quotation.quotation_no}</p>
          <p><strong>Route:</strong> ${quotation.pickup_location} → ${quotation.drop_location}</p>
          <p>Thank you for choosing NCG Express.</p>
          <br>
          <p>Best regards,<br>NCG Express Team</p>
        </div>
      `;

      // Step 3: Send email via edge function
      toast.loading("Sending email to customer...", { id: loadingToast });
      console.log('📨 Step 2: Invoking edge function...');
      
      const { data, error } = await supabase.functions.invoke('send-quotation-email', {
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

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('❌ Edge function error:', error);
        throw error;
      }

      // Step 4: Update quotation status to 'sent'
      console.log('✅ Step 3: Updating status...');
      await handleStatusUpdate(quotation.id, 'sent');
      
      console.log('✅ === EMAIL SEND COMPLETED ===');
      toast.success("Email sent successfully!", {
        id: loadingToast,
        description: `Quotation sent to ${quotation.customer_email}`
      });

    } catch (error: any) {
      console.error('❌ === EMAIL SEND FAILED ===');
      console.error('Error:', error);
      
      const errorMessage = 'Failed to send email';
      let errorDescription = error.message || 'Unknown error occurred';
      
      if (error.message?.includes('PDF generation')) {
        errorDescription = 'Failed to generate PDF document. Please try again.';
      } else if (error.message?.includes('network')) {
        errorDescription = 'Network error. Please check your connection.';
      } else if (error.message?.includes('Resend')) {
        errorDescription = 'Email service error. Please contact support.';
      }
      
      toast.error(errorMessage, {
        id: loadingToast,
        description: errorDescription
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
      toast.success("Quotation deleted successfully");
    } catch (error: any) {
      toast.error("Failed to delete quotation", {
        description: error.message
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
        <div className="flex items-center space-x-2">
          <div className="font-medium">{row.getValue("quotation_no")}</div>
          <QuotationVersionIndicator
            currentVersion={{
              id: row.original.id,
              version_number: row.original.version_number || '1.0',
              edit_type: row.original.edit_type,
              edit_reason: row.original.edit_reason,
              is_active_version: row.original.is_active_version || true,
              created_at: row.original.created_at,
              created_by_name: row.original.created_by_name
            }}
            allVersions={row.original.all_versions || []}
            onViewVersion={(version) => {
              handleViewVersion(version.id);
            }}
            onEditVersion={(version) => {
              handleEditQuotation(row.original);
            }}
            onLoadVersions={async () => {
              await loadVersionsForQuotation(row.original.id);
            }}
          />
        </div>
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
      header: "Created By",
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
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleViewDocumentFlow(quotation)}
                title="Document Flow"
                className="text-purple-600 hover:text-purple-700"
              >
                <GitBranch className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onViewInCalculator?.(quotation.id)}
                title="View Cost Breakdown"
                className="text-primary hover:text-primary"
              >
                <Calculator className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setRepeatQuotation(quotation);
                  setShowRepeatModal(true);
                }}
                title="Duplicate Quotation"
                className="text-orange-600 hover:text-orange-700"
              >
                <Copy className="h-4 w-4" />
              </Button>
              {(quotation.status === 'draft' || quotation.status === 'sent') && (
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
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="destructive"
                        size="sm" 
                        title="Decline Quotation"
                      >
                        Decline
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Decline Quotation</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to decline quotation {quotation.quotation_no} for {quotation.customer_name}? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleStatusUpdate(quotation.id, 'declined')}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Yes, Decline
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
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

  const filteredQuotations = quotations.filter(quotation => {
    // Search filter
    const matchesSearch = quotation.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quotation.quotation_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quotation.pickup_location.toLowerCase().includes(searchTerm.toLowerCase());

    // Status filter
    const matchesStatus = statusFilter === 'all' || quotation.status === statusFilter;

    // Hire type filter
    const matchesHireType = hireTypeFilter === 'all' || quotation.hire_type === hireTypeFilter;

    // Approval filter
    const matchesApproval = approvalFilter === 'all' || 
      (approvalFilter === 'pending' && (!quotation.approval_status || quotation.approval_status === 'pending')) ||
      (approvalFilter === 'approved' && quotation.approval_status === 'approved') ||
      (approvalFilter === 'rejected' && quotation.approval_status === 'rejected');

    // Date filter
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const pickupDate = new Date(quotation.pickup_datetime);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      switch (dateFilter) {
        case 'today':
          const quotationDate = new Date(pickupDate);
          quotationDate.setHours(0, 0, 0, 0);
          matchesDate = quotationDate.getTime() === today.getTime();
          break;
        case 'upcoming':
          matchesDate = pickupDate >= today;
          break;
        case 'past':
          matchesDate = pickupDate < today;
          break;
      }
    }

    return matchesSearch && matchesStatus && matchesHireType && matchesApproval && matchesDate;
  });

  return (
    <>
      {/* Enhanced Filters and Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by quotation, customer, or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
              </SelectContent>
            </Select>

            <Select value={hireTypeFilter} onValueChange={setHireTypeFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by hire type" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Lyceum">Lyceum</SelectItem>
                <SelectItem value="Internal">Internal</SelectItem>
                <SelectItem value="Outside">Outside</SelectItem>
              </SelectContent>
            </Select>

            <Select value={approvalFilter} onValueChange={setApprovalFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by approval" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
                <SelectItem value="all">All Approvals</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent className="bg-white z-50">
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="past">Past</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Quotations ({searchTerm || statusFilter !== 'all' || hireTypeFilter !== 'all' || approvalFilter !== 'all' || dateFilter !== 'all' ? filteredQuotations.length : totalCount})</CardTitle>
            <Button 
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export to Excel
            </Button>
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

      <SpecialHireExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        data={quotations}
      />

      {/* Document Flow Dialog */}
      {showDocumentFlow && documentFlowQuotation && (
        <Dialog open={showDocumentFlow} onOpenChange={setShowDocumentFlow}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-purple-600" />
                Document Flow - {documentFlowQuotation.quotation_no}
              </DialogTitle>
            </DialogHeader>
            <DocumentFlowDashboard
              quotationId={documentFlowQuotation.id}
              quotationData={documentFlowQuotation}
              onDocumentGenerated={() => {
                loadQuotations();
                onRefresh();
              }}
              onDocumentEdited={() => {
                loadQuotations();
                onRefresh();
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Duplicate/Repeat Quotation Modal */}
      <SpecialHireQuotationRepeatModal
        quotation={repeatQuotation}
        open={showRepeatModal}
        onClose={() => {
          setShowRepeatModal(false);
          setRepeatQuotation(null);
        }}
        onSuccess={() => {
          loadQuotations();
          onRefresh();
        }}
      />
    </>
  );
}