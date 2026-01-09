
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ColumnDef } from '@tanstack/react-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Edit, Trash2, FileText, LayoutGrid, Table, PenTool, Copy, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { YutongQuotationViewModal } from './YutongQuotationViewModal';
import { YutongInvoiceGenerator } from './YutongInvoiceGenerator';
import { YutongEditQuotationModal } from './YutongEditQuotationModal';
import { YutongCustomerCardView } from './YutongCustomerCardView';
import { YutongQuotationRepeatModal } from './YutongQuotationRepeatModal';
import { useAuth } from '@/hooks/useAuth';
import { QuotationVersionIndicator } from '../special-hire/QuotationVersionIndicator';

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
  version_number?: string;
  parent_quotation_id?: string;
  edit_type?: string;
  edit_reason?: string;
  is_active_version?: boolean;
}

interface YutongQuotationsListProps {
  onRefresh: () => void;
}

export function YutongQuotationsList({ onRefresh }: YutongQuotationsListProps) {
  const [quotations, setQuotations] = useState<YutongQuotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuotation, setSelectedQuotation] = useState<YutongQuotation | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [invoiceGeneratorOpen, setInvoiceGeneratorOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [repeatModalOpen, setRepeatModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'card'>(() => {
    return (localStorage.getItem('yutong_quotation_view_mode') as 'table' | 'card') || 'table';
  });
  const [signatureCounts, setSignatureCounts] = useState<Map<string, number>>(new Map());
  const { toast } = useToast();
  const { user } = useAuth();
  const [userRoles, setUserRoles] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .then(({ data }) => {
          setUserRoles(data?.map(r => r.role) || []);
        });
    }
  }, [user]);

  const canManageLinks = userRoles.includes('admin') || userRoles.includes('supervisor') || userRoles.includes('super_admin');

  const handleViewModeChange = (mode: 'table' | 'card') => {
    setViewMode(mode);
    localStorage.setItem('yutong_quotation_view_mode', mode);
  };

  const loadQuotations = async () => {
    try {
      // Fetch only active version quotations
      const { data: quotationsData, error } = await supabase
        .from('yutong_quotations')
        .select('*')
        .eq('is_active_version', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

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
      const transformedData = quotationsData.map((quotation: any) => ({
        ...quotation,
        creator_name: quotation.created_by ? profileMap.get(quotation.created_by) || 'Unknown User' : 'Unknown User'
      }));
      
      setQuotations(transformedData);

      // Fetch signature counts for all quotations
      if (quotationsData && quotationsData.length > 0) {
        const quotationIds = quotationsData.map(q => q.id);
        const { data: signatureData } = await supabase
          .from('yutong_quotation_signatures')
          .select('quotation_id, signature_role')
          .in('quotation_id', quotationIds);

        // Count signatures per quotation
        const counts = new Map<string, number>();
        signatureData?.forEach(sig => {
          const count = counts.get(sig.quotation_id) || 0;
          counts.set(sig.quotation_id, count + 1);
        });
        setSignatureCounts(counts);
      }
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

    // Set up real-time subscription for new quotations
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'yutong_quotations'
        },
        (payload) => {
          console.log('New Yutong quotation created:', payload);
          loadQuotations(); // Refresh the list when a new quotation is created
          onRefresh(); // Also trigger parent refresh
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'yutong_quotations'
        },
        (payload) => {
          console.log('Yutong quotation updated:', payload);
          loadQuotations(); // Refresh the list when a quotation is updated
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'yutong_quotations'
        },
        (payload) => {
          console.log('Yutong quotation deleted:', payload);
          loadQuotations(); // Refresh the list when a quotation is deleted
          onRefresh(); // Also trigger parent refresh
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [onRefresh]);

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

  const handleViewQuotation = async (versionOrId: YutongQuotation | { id: string }) => {
    const id = typeof versionOrId === 'object' && 'id' in versionOrId ? versionOrId.id : '';
    if (!id) return;
    
    const { data } = await supabase
      .from('yutong_quotations')
      .select('*')
      .eq('id', id)
      .single();
    
    if (data) {
      setSelectedQuotation(data);
      setViewModalOpen(true);
    }
  };

  const handleEditQuotation = async (versionOrId: YutongQuotation | { id: string }) => {
    const id = typeof versionOrId === 'object' && 'id' in versionOrId ? versionOrId.id : '';
    if (!id) return;
    
    const { data } = await supabase
      .from('yutong_quotations')
      .select('*')
      .eq('id', id)
      .single();
    
    if (data) {
      setSelectedQuotation(data);
      setEditModalOpen(true);
    }
  };

  const handleSetActiveVersion = async (version: { id: string; parent_quotation_id?: string }) => {
    try {
      // Find the root parent by following the chain
      let rootId = version.id;
      let currentId = version.id;
      
      // First, get this version's parent
      const { data: versionData } = await supabase
        .from('yutong_quotations')
        .select('parent_quotation_id')
        .eq('id', version.id)
        .single();
      
      if (versionData?.parent_quotation_id) {
        // Follow the parent chain to find the root
        currentId = versionData.parent_quotation_id;
        while (true) {
          const { data: parentData } = await supabase
            .from('yutong_quotations')
            .select('id, parent_quotation_id')
            .eq('id', currentId)
            .single();
          
          if (!parentData?.parent_quotation_id) {
            rootId = parentData?.id || currentId;
            break;
          }
          currentId = parentData.parent_quotation_id;
        }
      }
      
      // Deactivate all versions in the family (root and all children)
      await supabase
        .from('yutong_quotations')
        .update({ is_active_version: false })
        .or(`id.eq.${rootId},parent_quotation_id.eq.${rootId}`);
      
      // Also deactivate any nested children
      const { data: children } = await supabase
        .from('yutong_quotations')
        .select('id')
        .eq('parent_quotation_id', rootId);
      
      if (children) {
        for (const child of children) {
          await supabase
            .from('yutong_quotations')
            .update({ is_active_version: false })
            .eq('parent_quotation_id', child.id);
        }
      }
      
      // Activate the selected version
      const { error } = await supabase
        .from('yutong_quotations')
        .update({ is_active_version: true })
        .eq('id', version.id);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Version is now active"
      });
      
      loadQuotations();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to set active version",
        variant: "destructive"
      });
    }
  };

  const handleGenerateInvoice = (quotation: YutongQuotation) => {
    setSelectedQuotation(quotation);
    setInvoiceGeneratorOpen(true);
  };

  const handleRepeatQuotation = (quotation: YutongQuotation) => {
    setSelectedQuotation(quotation);
    setRepeatModalOpen(true);
  };

  const columns: ColumnDef<YutongQuotation>[] = [
    {
      accessorKey: "quotation_no",
      header: "Quotation No",
      cell: ({ row }) => {
        const quotation = row.original;
        const [versions, setVersions] = useState<any[]>([]);
        
        return (
          <div className="flex items-center gap-2">
            <span className="font-medium">{quotation.quotation_no}</span>
            <QuotationVersionIndicator
              currentVersion={{
                id: quotation.id,
                version_number: quotation.version_number || "1.0",
                edit_type: quotation.edit_type,
                edit_reason: quotation.edit_reason,
                is_active_version: quotation.is_active_version || true,
                created_at: quotation.created_at,
                created_by_name: quotation.creator_name,
              }}
              allVersions={versions}
              onViewVersion={handleViewQuotation}
              onEditVersion={handleEditQuotation}
              onSetActiveVersion={handleSetActiveVersion}
              onLoadVersions={async () => {
                // Step 1: Find the root parent by following the chain backwards
                let currentId = quotation.parent_quotation_id || quotation.id;
                let rootId = currentId;
                const seenIds = new Set([currentId]);
                
                // Follow the parent chain to find the root
                while (true) {
                  const { data: parentData } = await supabase
                    .from("yutong_quotations")
                    .select("id, parent_quotation_id")
                    .eq("id", currentId)
                    .maybeSingle();
                  
                  if (!parentData?.parent_quotation_id || seenIds.has(parentData.parent_quotation_id)) {
                    rootId = parentData?.id || rootId;
                    break;
                  }
                  
                  currentId = parentData.parent_quotation_id;
                  rootId = currentId;
                  seenIds.add(currentId);
                }
                
                // Step 2: Fetch ALL versions in the family tree recursively
                const allVersions = new Map();
                const toProcess = [rootId];
                const processed = new Set();
                
                while (toProcess.length > 0) {
                  const processId = toProcess.shift();
                  if (!processId || processed.has(processId)) continue;
                  processed.add(processId);
                  
                  // Fetch this version and its direct children
                  const { data } = await supabase
                    .from("yutong_quotations")
                    .select(`
                      id, version_number, edit_type, edit_reason,
                      is_active_version, created_at, created_by,
                      parent_quotation_id
                    `)
                    .or(`id.eq.${processId},parent_quotation_id.eq.${processId}`);
                  
                  data?.forEach(v => {
                    allVersions.set(v.id, v);
                    if (v.parent_quotation_id === processId && !processed.has(v.id)) {
                      toProcess.push(v.id);
                    }
                  });
                }
                
                // Step 3: Fetch creator names and format data
                const versions = Array.from(allVersions.values());
                const userIds = [...new Set(versions.map(v => v.created_by).filter(Boolean))];
                
                const { data: profiles } = await supabase
                  .from('profiles')
                  .select('user_id, first_name, last_name')
                  .in('user_id', userIds);
                
                const profileMap = new Map(
                  profiles?.map(p => [
                    p.user_id, 
                    `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown User'
                  ])
                );
                
                const versionData = versions.map(v => ({
                  id: v.id,
                  version_number: v.version_number || "1.0",
                  edit_type: v.edit_type,
                  edit_reason: v.edit_reason,
                  is_active_version: v.is_active_version,
                  created_at: v.created_at,
                  created_by_name: v.created_by 
                    ? profileMap.get(v.created_by) || 'Unknown User'
                    : 'Unknown User',
                }));
                
                setVersions(versionData);
              }}
            />
          </div>
        );
      },
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
      accessorKey: "signatures",
      header: "Signatures",
      cell: ({ row }) => {
        const count = signatureCounts.get(row.original.id) || 0;
        const allSigned = count === 3;
        
        return allSigned ? (
          <Badge className="gap-1 bg-green-600 hover:bg-green-700 text-white">
            <CheckCircle className="h-4 w-4" />
            All Signed
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300 bg-amber-50">
            <Clock className="h-3 w-3" />
            {count}/3 Pending
          </Badge>
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
            >
              <Eye className="h-4 w-4" />
            </Button>
            {quotation.status === 'confirmed' && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleGenerateInvoice(quotation)}
                title="Generate Invoice"
              >
                <FileText className="h-4 w-4" />
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => handleEditQuotation(quotation)} title="Edit Quotation">
              <Edit className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleRepeatQuotation(quotation)}
              title="Repeat Quotation"
            >
              <Copy className="h-4 w-4" />
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
          <div className="flex items-center justify-between">
            <CardTitle>Yutong Bus Quotations</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleViewModeChange('table')}
              >
                <Table className="h-4 w-4 mr-2" />
                Table View
              </Button>
              <Button
                variant={viewMode === 'card' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleViewModeChange('card')}
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                Card View
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'table' ? (
            <DataTable 
              columns={columns} 
              data={quotations} 
              searchKey="quotation_no"
            />
          ) : (
            <YutongCustomerCardView canManageLinks={canManageLinks} />
          )}
        </CardContent>
      </Card>

      <YutongQuotationViewModal
        quotation={selectedQuotation}
        open={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
      />

      {invoiceGeneratorOpen && selectedQuotation && (
        <YutongInvoiceGenerator
          quotation={selectedQuotation}
          isOpen={invoiceGeneratorOpen}
          onClose={() => {
            setInvoiceGeneratorOpen(false);
            setSelectedQuotation(null);
          }}
        />
      )}

      <YutongEditQuotationModal
        quotation={selectedQuotation}
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedQuotation(null);
        }}
        onSuccess={() => {
          loadQuotations();
          onRefresh();
        }}
      />

      <YutongQuotationRepeatModal
        quotation={selectedQuotation}
        open={repeatModalOpen}
        onClose={() => {
          setRepeatModalOpen(false);
          setSelectedQuotation(null);
        }}
        onSuccess={() => {
          loadQuotations();
          onRefresh();
        }}
      />
    </>
  );
}
