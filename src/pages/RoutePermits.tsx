import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { 
  FileText, Plus, AlertTriangle, CheckCircle, Calendar, 
  MapPin, Truck, Clock, Settings, Upload, Download, Eye, BookOpen, Loader2
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { KPICard } from "@/components/dashboard/KPICard";
import { format, parseISO, differenceInDays } from "date-fns";
import { useDropzone } from "react-dropzone";
import { RoutePermitImport } from "@/components/route-permits/RoutePermitImport";
import { RoutePermitDetailsModal } from "@/components/route-permits/RoutePermitDetailsModal";
import { useRoutePermitFinanceSettings, usePostPermitCostToGL } from "@/hooks/useRoutePermitFinance";
import { RoutePermitDocumentModal } from "@/components/route-permits/RoutePermitDocumentModal";

interface RoutePermit {
  id: string;
  permit_no: string;
  route_name: string;
  temporary_route_name?: string;
  via?: string;
  route_numbers?: string[];
  ntc_number?: string;
  owner_name: string;
  owner_address?: string;
  owner_nic?: string;
  service_type?: string;
  seats?: number;
  max_fare?: number;
  approved_maximum_fare?: number;
  allocated_bus_number?: string;
  permit_active_inactive?: string;
  issue_date: string;
  expiry_date: string;
  annual_fee?: number;
  permit_status: string;
  operation_status: string;
  bus_id?: string;
  route_id?: string;
  buses?: {
    bus_no: string;
    registration_number: string;
  };
  routes?: {
    route_no: string;
    route_name: string;
  };
}

export default function RoutePermits() {
  const { hasRole } = useAuth();
  const [permits, setPermits] = useState<RoutePermit[]>([]);
  const [buses, setBuses] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPermit, setEditingPermit] = useState<RoutePermit | null>(null);
  const [permitPrefix, setPermitPrefix] = useState("PRM");
  const [expiryThreshold, setExpiryThreshold] = useState(30);
  const [selectedPermit, setSelectedPermit] = useState<RoutePermit | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPermitId, setUploadPermitId] = useState<string>('');
  const [docCounts, setDocCounts] = useState<Record<string, number>>({});
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [selectedPermitForDocs, setSelectedPermitForDocs] = useState<RoutePermit | null>(null);

  // Finance integration
  const { data: permitFinanceSettings } = useRoutePermitFinanceSettings();
  const postPermitToGL = usePostPermitCostToGL();
  
  // Form states
  const [formData, setFormData] = useState({
    route_name: '',
    temporary_route_name: '',
    via: '',
    route_numbers: '',
    ntc_number: '',
    bus_id: '',
    route_id: '',
    owner_name: 'NCG Transport Ltd',
    owner_address: '',
    owner_nic: '',
    service_type: 'regular',
    seats: '',
    max_fare: '',
    issue_date: '',
    expiry_date: '',
    annual_fee: '',
    permit_status: 'valid',
    operation_status: 'inactive'
  });

  const isAdmin = hasRole('super_admin') || hasRole('admin');

  const fetchPermits = async () => {
    try {
      const { data, error } = await supabase
        .from('route_permits')
        .select(`
          *,
          buses(bus_no, registration_number),
          routes(route_no, route_name)
        `)
        .order('permit_no', { ascending: false });

      if (error) throw error;
      setPermits(data || []);
      if (data && data.length > 0) {
        fetchDocumentCounts(data.map(p => p.id));
      }
    } catch (error) {
      console.error('Error fetching permits:', error);
      toast.error('Failed to load route permits');
    }
  };

  const fetchDocumentCounts = async (permitIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('linked_row_id')
        .eq('linked_table', 'route_permits')
        .in('linked_row_id', permitIds);

      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach(doc => {
        counts[doc.linked_row_id] = (counts[doc.linked_row_id] || 0) + 1;
      });
      setDocCounts(counts);
    } catch (error) {
      console.error('Error fetching document counts:', error);
    }
  };

  const fetchBuses = async () => {
    try {
      const { data, error } = await supabase
        .from('buses')
        .select('id, bus_no, registration_number')
        .eq('status', 'active')
        .order('bus_no');

      if (error) throw error;
      setBuses(data || []);
    } catch (error) {
      console.error('Error fetching buses:', error);
    }
  };

  const fetchRoutes = async () => {
    try {
      const { data, error } = await supabase
        .from('routes')
        .select('id, route_no, route_name')
        .eq('is_active', true)
        .order('route_no');

      if (error) throw error;
      setRoutes(data || []);
    } catch (error) {
      console.error('Error fetching routes:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkOperationStatus = async () => {
    // Check if any permits are linked to active trips
    try {
      const { data: activeTrips, error } = await supabase
        .from('daily_trips')
        .select('bus_id')
        .in('status', ['scheduled', 'ongoing']);

      if (error) throw error;

      const activeBusIds = activeTrips?.map(trip => trip.bus_id) || [];

      // Update operation status for permits
      for (const permit of permits) {
        if (permit.bus_id && activeBusIds.includes(permit.bus_id)) {
          if (permit.operation_status !== 'active') {
            await supabase
              .from('route_permits')
              .update({ operation_status: 'active' })
              .eq('id', permit.id);
          }
        } else if (permit.operation_status === 'active') {
          await supabase
            .from('route_permits')
            .update({ operation_status: 'inactive' })
            .eq('id', permit.id);
        }
      }
    } catch (error) {
      console.error('Error checking operation status:', error);
    }
  };

  useEffect(() => {
    fetchPermits();
    fetchBuses();
    fetchRoutes();
  }, []);

  useEffect(() => {
    if (permits.length > 0) {
      checkOperationStatus();
    }
  }, [permits]);

  const generatePermitNumber = () => {
    const year = new Date().getFullYear();
    const lastPermit = permits.find(p => p.permit_no.startsWith(`${permitPrefix}${year}`));
    
    if (!lastPermit) {
      return `${permitPrefix}${year}001`;
    }
    
    const lastNumber = parseInt(lastPermit.permit_no.slice(-3)) + 1;
    return `${permitPrefix}${year}${String(lastNumber).padStart(3, '0')}`;
  };

  const recordChangeHistory = async (permitId: string, changeType: string, changes: any[], description: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await (supabase as any)
        .from('route_permit_change_history')
        .insert({
          permit_id: permitId,
          changed_by: user?.id || null,
          change_type: changeType,
          changes: changes,
          description: description,
        });
    } catch (err) {
      console.error('Failed to record change history:', err);
    }
  };

  const handleDocumentUpload = async () => {
    if (!uploadFile || !uploadPermitId) return;
    
    if (uploadFile.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploadingFile(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const filePath = `route-permits/${uploadPermitId}/${Date.now()}_${uploadFile.name}`;
      
      const { error: storageError } = await supabase.storage
        .from('documents')
        .upload(filePath, uploadFile);

      if (storageError) throw storageError;

      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filePath);

      await supabase.from('documents').insert({
        file_name: uploadFile.name,
        file_type: uploadFile.type,
        file_size: uploadFile.size,
        file_url: urlData.publicUrl,
        storage_path: filePath,
        linked_table: 'route_permits',
        linked_row_id: uploadPermitId,
        tag: 'permit_document',
        uploaded_by: user?.id || null,
      });

      await recordChangeHistory(uploadPermitId, 'document_uploaded', [], `Document uploaded: ${uploadFile.name}`);

      toast.success('Document uploaded successfully');
      setShowUploadDialog(false);
      setUploadFile(null);
      setUploadPermitId('');
      fetchDocumentCounts([uploadPermitId]);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload document');
    } finally {
      setUploadingFile(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setUploadFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [], 'application/pdf': [] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  const handleSubmit = async () => {
    if (!isAdmin) {
      toast.error('Access denied');
      return;
    }

    try {
      const permitNo = editingPermit ? editingPermit.permit_no : generatePermitNumber();
      const routeNumbersArray = formData.route_numbers ? formData.route_numbers.split(',').map(n => n.trim()) : null;
      
      const permitData = {
        ...formData,
        permit_no: permitNo,
        route_numbers: routeNumbersArray,
        seats: formData.seats ? parseInt(formData.seats) : null,
        max_fare: formData.max_fare ? parseFloat(formData.max_fare) : null,
        annual_fee: formData.annual_fee ? parseFloat(formData.annual_fee) : null,
        permit_status: formData.permit_status as any,
        operation_status: formData.operation_status,
        bus_id: formData.bus_id || null,
        route_id: formData.route_id || null
      };

      if (editingPermit) {
        // Build change diff
        const changesArr: any[] = [];
        const fieldsToTrack = ['route_name', 'temporary_route_name', 'via', 'owner_name', 'owner_address', 'owner_nic', 'service_type', 'seats', 'max_fare', 'issue_date', 'expiry_date', 'annual_fee', 'permit_status', 'operation_status', 'bus_id', 'route_id', 'ntc_number'];
        
        for (const field of fieldsToTrack) {
          const oldVal = String(editingPermit[field as keyof RoutePermit] ?? '');
          const newVal = String(permitData[field as keyof typeof permitData] ?? '');
          if (oldVal !== newVal) {
            changesArr.push({ field, old_value: oldVal, new_value: newVal });
          }
        }

        const { error } = await supabase
          .from('route_permits')
          .update(permitData)
          .eq('id', editingPermit.id);

        if (error) throw error;

        if (changesArr.length > 0) {
          const desc = changesArr.map(c => `${c.field}: "${c.old_value}" → "${c.new_value}"`).join('; ');
          await recordChangeHistory(editingPermit.id, 'updated', changesArr, `Permit updated: ${desc}`);
        }

        toast.success('Route permit updated successfully');
      } else {
        const { data: newPermit, error } = await supabase
          .from('route_permits')
          .insert(permitData)
          .select('id')
          .single();

        if (error) throw error;

        if (newPermit) {
          await recordChangeHistory(newPermit.id, 'created', [], `Permit ${permitNo} created for route ${formData.route_name}`);
        }

        toast.success('Route permit created successfully');
      }

      setIsDialogOpen(false);
      resetForm();
      fetchPermits();
      
      // Auto-post to GL if auto_post_on_renewal is enabled, fee is set, and settings configured
      const fee = formData.annual_fee ? parseFloat(formData.annual_fee) : 0;
      if (fee > 0 && permitFinanceSettings && permitFinanceSettings.auto_post_on_renewal) {
        const isAnnual = formData.expiry_date && formData.issue_date 
          ? differenceInDays(parseISO(formData.expiry_date), parseISO(formData.issue_date)) > 90
          : false;
        
        postPermitToGL.mutate({
          permit: {
            permitNumber: permitNo,
            routeName: formData.route_name,
            vehicleNo: buses.find(b => b.id === formData.bus_id)?.bus_no,
            permitType: isAnnual ? 'annual' : 'temporary',
            amount: fee,
            paymentDate: new Date().toISOString().slice(0, 10),
            expiryDate: formData.expiry_date || undefined,
            coverageMonths: isAnnual ? 12 : undefined,
            description: `Route permit ${permitNo} - ${formData.route_name}`,
          },
          settings: permitFinanceSettings,
        });
      }
    } catch (error: any) {
      console.error('Error saving permit:', error);
      toast.error(error.message || 'Failed to save route permit');
    }
  };

  const resetForm = () => {
    setFormData({
      route_name: '',
      temporary_route_name: '',
      via: '',
      route_numbers: '',
      ntc_number: '',
      bus_id: '',
      route_id: '',
      owner_name: 'NCG Transport Ltd',
      owner_address: '',
      owner_nic: '',
      service_type: 'regular',
      seats: '',
      max_fare: '',
      issue_date: '',
      expiry_date: '',
      annual_fee: '',
      permit_status: 'valid',
      operation_status: 'inactive'
    });
    setEditingPermit(null);
  };

  const handleEdit = (permit: RoutePermit) => {
    if (!isAdmin) {
      toast.error('Access denied');
      return;
    }
    
    setFormData({
      route_name: permit.route_name || '',
      temporary_route_name: permit.temporary_route_name || '',
      via: permit.via || '',
      route_numbers: permit.route_numbers?.join(', ') || '',
      ntc_number: permit.ntc_number || '',
      bus_id: permit.bus_id || '',
      route_id: permit.route_id || '',
      owner_name: permit.owner_name || '',
      owner_address: permit.owner_address || '',
      owner_nic: permit.owner_nic || '',
      service_type: permit.service_type || 'regular',
      seats: permit.seats?.toString() || '',
      max_fare: permit.max_fare?.toString() || '',
      issue_date: permit.issue_date || '',
      expiry_date: permit.expiry_date || '',
      annual_fee: permit.annual_fee?.toString() || '',
      permit_status: permit.permit_status || 'valid',
      operation_status: permit.operation_status || 'inactive'
    });
    setEditingPermit(permit);
    setIsDialogOpen(true);
  };

  const getExpiryStatus = (expiryDate: string) => {
    const days = differenceInDays(parseISO(expiryDate), new Date());
    if (days < 0) return 'expired';
    if (days <= expiryThreshold) return 'expiring-soon';
    return 'valid';
  };

  const exportToExcel = async () => {
    try {
      // This would integrate with a real Excel export library
      const csvContent = permits.map(permit => [
        permit.permit_no,
        permit.route_name,
        permit.buses?.bus_no || '',
        permit.owner_name,
        permit.service_type,
        permit.seats || '',
        permit.max_fare || '',
        permit.issue_date,
        permit.expiry_date,
        permit.annual_fee || '',
        permit.permit_status,
        permit.operation_status
      ].join(',')).join('\n');

      const header = 'Permit No,Route Name,Bus No,Owner,Service Type,Seats,Max Fare,Issue Date,Expiry Date,Annual Fee,Status,Operation Status\n';
      const blob = new Blob([header + csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'route_permits_report.csv';
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report');
    }
  };

  const handleOpenDocumentManager = (permit: RoutePermit) => {
    setSelectedPermitForDocs(permit);
    setDocModalOpen(true);
  };

  const columns: ColumnDef<RoutePermit>[] = [
    {
      accessorKey: "permit_no",
      header: "Permit No",
    },
    {
      accessorKey: "route_name",
      header: "Route Name",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{row.original.route_name || '-'}</p>
          {row.original.temporary_route_name && (
            <p className="text-xs text-muted-foreground truncate">
              Temp: {row.original.temporary_route_name}
            </p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "allocated_bus_number",
      header: "Bus No",
      cell: ({ row }) => {
        const busNo = row.original.allocated_bus_number || row.original.buses?.bus_no || '-';
        const docCount = docCounts[row.original.id] || 0;
        
        return (
          <div className="flex flex-col gap-1 items-start">
            <span className="font-mono text-sm font-semibold tracking-tighter">
              {busNo}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className={`h-6 px-1.5 text-[10px] gap-1 hover:bg-primary/10 hover:text-primary transition-all duration-300 ${docCount > 0 ? 'text-primary bg-primary/5 border border-primary/20' : 'text-muted-foreground opacity-50'}`}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenDocumentManager(row.original);
              }}
            >
              <FileText className={`h-3 w-3 ${docCount > 0 ? 'animate-pulse-subtle' : ''}`} />
              {docCount > 0 ? `${docCount} Documents` : 'No Attachments'}
            </Button>
          </div>
        );
      },
    },
    {
      accessorKey: "owner_name",
      header: "Owner",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="text-sm truncate">{row.original.owner_name}</p>
          {row.original.owner_nic && (
            <p className="text-xs text-muted-foreground font-mono">
              {row.original.owner_nic}
            </p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "service_type",
      header: "Service Type",
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.original.service_type || row.original.ntc_number || 'Regular'}
        </Badge>
      ),
    },
    {
      accessorKey: "seats",
      header: "Seats",
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.seats || '-'}
        </span>
      ),
    },
    {
      accessorKey: "approved_maximum_fare",
      header: "Max Fare",
      cell: ({ row }) => {
        const fare = row.original.approved_maximum_fare || row.original.max_fare;
        return fare ? `LKR ${fare}` : '-';
      },
    },
    {
      accessorKey: "expiry_date",
      header: "Expiry Date",
      cell: ({ row }) => {
        const expiryDate = row.getValue("expiry_date") as string;
        const status = getExpiryStatus(expiryDate);
        return (
          <div className="flex items-center gap-2">
            {format(parseISO(expiryDate), 'MMM dd, yyyy')}
            {status === 'expired' && <AlertTriangle className="h-4 w-4 text-red-500" />}
            {status === 'expiring-soon' && <Calendar className="h-4 w-4 text-yellow-500" />}
            {status === 'valid' && <CheckCircle className="h-4 w-4 text-green-500" />}
          </div>
        );
      },
    },
    {
      accessorKey: "permit_status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("permit_status") as string;
        const expiryStatus = getExpiryStatus(row.original.expiry_date);
        
        return (
          <Badge 
            variant={
              expiryStatus === 'expired' || status === 'suspended' ? 'destructive' : 
              expiryStatus === 'expiring-soon' ? 'secondary' : 
              'default'
            }
            className={`font-semibold tracking-tight shadow-sm px-2 py-0.5 rounded-full ${
              expiryStatus === 'expired' ? 'bg-red-500/10 text-red-600 border-red-200' : 
              expiryStatus === 'expiring-soon' ? 'bg-amber-500/10 text-amber-600 border-amber-200' : 
              'bg-emerald-500/10 text-emerald-600 border-emerald-200'
            }`}
          >
            {expiryStatus === 'expired' ? 'Expired' : 
             expiryStatus === 'expiring-soon' ? 'Expiring Soon' : 
             status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "operation_status",
      header: "Operation",
      cell: ({ row }) => (
        <Badge variant={row.getValue("operation_status") === "active" ? "default" : "secondary"}>
          {row.getValue("operation_status")}
        </Badge>
      ),
    },
    ...(isAdmin ? [{
      id: "actions",
      header: "Actions",
      cell: ({ row }: { row: any }) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => handleEdit(row.original)}>
            <Settings className="h-4 w-4" />
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => {
              setSelectedPermit(row.original);
              setShowDetailsModal(true);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => {
              setUploadPermitId(row.original.id);
              setUploadFile(null);
              setShowUploadDialog(true);
            }}
          >
            <Upload className="h-4 w-4" />
          </Button>
        </div>
      ),
    }] : []),
  ];

  const totalPermits = permits.length;
  const activePermits = permits.filter(p => p.permit_status === 'active' || p.operation_status === 'active').length;
  const expiringSoon = permits.filter(p => getExpiryStatus(p.expiry_date) === 'expiring-soon').length;
  const expired = permits.filter(p => getExpiryStatus(p.expiry_date) === 'expired').length;
  const totalDocs = Object.values(docCounts).reduce((sum, count) => sum + count, 0);

  return (
    <div className="space-y-8 animate-fade-in p-6">
      {/* Enhanced Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary-hover to-accent p-8 text-primary-foreground">
        <div className="absolute inset-0 bg-gradient-to-r from-black/10 to-transparent" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm animate-logo-glow">
              <FileText className="w-10 h-10 animate-bounce-subtle" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent animate-slide-in-right tracking-tight">
                Route Permits Registry
              </h1>
              <p className="text-primary-foreground/80 text-lg animate-slide-in-right font-medium" style={{ animationDelay: '0.1s' }}>
                Manage {totalPermits} active transport route permits and compliance documents
              </p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={exportToExcel}
              className="bg-white/10 backdrop-blur-sm border border-white/30 hover:bg-white/20 transition-all duration-300 animate-scale-in"
              style={{ animationDelay: '0.2s' }}
            >
              <Download className="h-4 w-4 mr-2 animate-pulse-subtle" />
              Export Report
            </Button>
            
            {isAdmin && (
              <Button 
                variant="outline"
                onClick={() => setShowImportDialog(true)}
                className="bg-white/10 backdrop-blur-sm border border-white/30 hover:bg-white/20 transition-all duration-300 animate-scale-in"
                style={{ animationDelay: '0.25s' }}
              >
                <Upload className="h-4 w-4 mr-2 animate-pulse-subtle" />
                Import Excel
              </Button>
            )}
            
            {isAdmin && (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={resetForm}
                    className="bg-white/20 backdrop-blur-sm border border-white/30 hover:bg-white/30 transition-all duration-300 animate-scale-in"
                    style={{ animationDelay: '0.3s' }}
                  >
                    <Plus className="h-4 w-4 mr-2 animate-pulse-subtle" />
                    Add Permit
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingPermit ? 'Edit Route Permit' : 'Add New Route Permit'}
                  </DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="route_name">Route Name *</Label>
                    <Input
                      id="route_name"
                      value={formData.route_name}
                      onChange={(e) => setFormData(prev => ({...prev, route_name: e.target.value}))}
                      placeholder="Colombo - Kandy Express"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="temporary_route_name">Temporary Route Name</Label>
                    <Input
                      id="temporary_route_name"
                      value={formData.temporary_route_name}
                      onChange={(e) => setFormData(prev => ({...prev, temporary_route_name: e.target.value}))}
                      placeholder="Alternative route name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="via">Via</Label>
                    <Input
                      id="via"
                      value={formData.via}
                      onChange={(e) => setFormData(prev => ({...prev, via: e.target.value}))}
                      placeholder="Kadawatha, Gampaha"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="route_numbers">Route Numbers</Label>
                    <Input
                      id="route_numbers"
                      value={formData.route_numbers}
                      onChange={(e) => setFormData(prev => ({...prev, route_numbers: e.target.value}))}
                      placeholder="101, 102, 103 (comma separated)"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="ntc_number">NTC Number</Label>
                    <Input
                      id="ntc_number"
                      value={formData.ntc_number}
                      onChange={(e) => setFormData(prev => ({...prev, ntc_number: e.target.value}))}
                      placeholder="NTC-2024-001"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="bus_id">Bus</Label>
                    <select
                      className="w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background rounded-md"
                      value={formData.bus_id}
                      onChange={(e) => setFormData(prev => ({...prev, bus_id: e.target.value}))}
                    >
                      <option value="">Select Bus</option>
                      {buses.map(bus => (
                        <option key={bus.id} value={bus.id}>
                          {bus.bus_no} - {bus.registration_number}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <Label htmlFor="route_id">Predefined Route</Label>
                    <select
                      className="w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background rounded-md"
                      value={formData.route_id}
                      onChange={(e) => setFormData(prev => ({...prev, route_id: e.target.value}))}
                    >
                      <option value="">Select Route</option>
                      {routes.map(route => (
                        <option key={route.id} value={route.id}>
                          {route.route_no} - {route.route_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <Label htmlFor="service_type">Service Type</Label>
                    <select
                      className="w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background rounded-md"
                      value={formData.service_type}
                      onChange={(e) => setFormData(prev => ({...prev, service_type: e.target.value}))}
                    >
                      <option value="regular">Regular</option>
                      <option value="express">Express</option>
                      <option value="semi-luxury">Semi-Luxury</option>
                      <option value="luxury">Luxury</option>
                      <option value="highway">Highway</option>
                      <option value="long_distance">Long Distance</option>
                    </select>
                  </div>
                  
                  <div>
                    <Label htmlFor="seats">Number of Seats</Label>
                    <Input
                      id="seats"
                      type="number"
                      value={formData.seats}
                      onChange={(e) => setFormData(prev => ({...prev, seats: e.target.value}))}
                      placeholder="49"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="max_fare">Maximum Fare (LKR)</Label>
                    <Input
                      id="max_fare"
                      type="number"
                      step="0.01"
                      value={formData.max_fare}
                      onChange={(e) => setFormData(prev => ({...prev, max_fare: e.target.value}))}
                      placeholder="300.00"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="issue_date">Issue Date</Label>
                    <Input
                      id="issue_date"
                      type="date"
                      value={formData.issue_date}
                      onChange={(e) => setFormData(prev => ({...prev, issue_date: e.target.value}))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="expiry_date">Expiry Date</Label>
                    <Input
                      id="expiry_date"
                      type="date"
                      value={formData.expiry_date}
                      onChange={(e) => setFormData(prev => ({...prev, expiry_date: e.target.value}))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="annual_fee">Annual Fee (LKR)</Label>
                    <Input
                      id="annual_fee"
                      type="number"
                      step="0.01"
                      value={formData.annual_fee}
                      onChange={(e) => setFormData(prev => ({...prev, annual_fee: e.target.value}))}
                      placeholder="75000.00"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="permit_status">Permit Status</Label>
                    <select
                      className="w-full border border-input bg-background px-3 py-2 text-sm ring-offset-background rounded-md"
                      value={formData.permit_status}
                      onChange={(e) => setFormData(prev => ({...prev, permit_status: e.target.value}))}
                    >
                      <option value="valid">Valid</option>
                      <option value="suspended">Suspended</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                  
                  <div className="col-span-2">
                    <Label htmlFor="owner_address">Owner Address</Label>
                    <Textarea
                      id="owner_address"
                      value={formData.owner_address}
                      onChange={(e) => setFormData(prev => ({...prev, owner_address: e.target.value}))}
                      placeholder="Complete address of permit owner"
                      rows={2}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="owner_nic">Owner NIC</Label>
                    <Input
                      id="owner_nic"
                      value={formData.owner_nic}
                      onChange={(e) => setFormData(prev => ({...prev, owner_nic: e.target.value}))}
                      placeholder="751234567V"
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <Button onClick={handleSubmit} className="w-full">
                      {editingPermit ? 'Update Permit' : 'Create Permit'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            )}
          </div>
        </div>
        
        {/* Animated Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl animate-pulse-subtle" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/20 rounded-full blur-2xl animate-bounce-subtle" />
      </div>

      {/* Enhanced KPI Cards with Animations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 px-1">
        <div className="animate-scale-in" style={{ animationDelay: '0.1s' }}>
          <KPICard
            title="Total Permits"
            value={totalPermits.toString()}
            icon={<FileText className="h-4 w-4" />}
            description="All active permits"
          />
        </div>
        <div className="animate-scale-in" style={{ animationDelay: '0.15s' }}>
          <KPICard
            title="Active Operations"
            value={activePermits.toString()}
            icon={<Truck className="h-4 w-4" />}
            description="Currently operating"
          />
        </div>
        <div className="animate-scale-in" style={{ animationDelay: '0.2s' }}>
          <KPICard
            title="Expiring Soon"
            value={expiringSoon.toString()}
            icon={<Clock className="h-4 w-4" />}
            description="Next 30 days"
          />
        </div>
        <div className="animate-scale-in" style={{ animationDelay: '0.25s' }}>
          <KPICard
            title="Expired"
            value={expired.toString()}
            icon={<AlertTriangle className="h-4 w-4" />}
            description="Needs renewal"
          />
        </div>
        <div className="animate-scale-in" style={{ animationDelay: '0.3s' }}>
          <KPICard
            title="Registry Documents"
            value={totalDocs.toString()}
            icon={<BookOpen className="h-4 w-4" />}
            description="Total attachments"
          />
        </div>
      </div>

      {/* Route Permits Table */}
      <Card>
        <CardHeader>
          <CardTitle>Route Permits Registry</CardTitle>
          <CardDescription>
            Manage transport route permits, compliance and operation status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable 
            columns={columns} 
            data={permits} 
            searchKey="permit_no"
            searchKeys={["permit_no", "route_name", "owner_name"]}
          />
        </CardContent>
      </Card>

      {/* Settings Panel for Admins */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Permit Configuration</CardTitle>
            <CardDescription>
              Configure permit number generation and alert settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="permit_prefix">Permit Number Prefix</Label>
                <Input
                  id="permit_prefix"
                  value={permitPrefix}
                  onChange={(e) => setPermitPrefix(e.target.value)}
                  placeholder="PRM"
                />
              </div>
              <div>
                <Label htmlFor="expiry_threshold">Expiry Alert Threshold (days)</Label>
                <Input
                  id="expiry_threshold"
                  type="number"
                  value={expiryThreshold}
                  onChange={(e) => setExpiryThreshold(parseInt(e.target.value) || 30)}
                  placeholder="30"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <RoutePermitImport 
            onImportComplete={() => {
              setShowImportDialog(false);
              fetchPermits();
            }} 
          />
        </DialogContent>
      </Dialog>

      {/* Details Modal */}
      <RoutePermitDetailsModal
        permit={selectedPermit}
        open={showDetailsModal}
        onOpenChange={setShowDetailsModal}
      />

      {/* Document Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload Permit Document
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              {uploadFile ? (
                <div>
                  <p className="text-sm font-medium">{uploadFile.name}</p>
                  <p className="text-xs text-muted-foreground">{(uploadFile.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium">Drop file here or click to browse</p>
                  <p className="text-xs text-muted-foreground">PDF or images, max 10MB</p>
                </div>
              )}
            </div>
            <Button 
              onClick={handleDocumentUpload} 
              disabled={!uploadFile || uploadingFile}
              className="w-full"
            >
              {uploadingFile ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</>
              ) : (
                <><Upload className="h-4 w-4 mr-2" /> Upload Document</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {selectedPermitForDocs && (
        <RoutePermitDocumentModal 
          permit={selectedPermitForDocs} 
          open={docModalOpen} 
          onOpenChange={setDocModalOpen} 
        />
      )}
    </div>
  );
}