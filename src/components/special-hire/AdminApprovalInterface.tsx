import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { CheckCircle, XCircle, Clock, Eye, MessageSquare } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface PendingQuotation {
  id: string;
  quotation_no: string;
  customer_name: string;
  customer_phone: string;
  pickup_location: string;
  drop_location: string;
  discount_percentage: number;
  gross_revenue: number;
  net_profit: number;
  created_at: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  approval_comments?: string;
  created_by?: string;
  profiles?: {
    first_name: string;
    last_name: string;
  } | null;
}

interface Props {
  onRefresh: () => void;
}

export function AdminApprovalInterface({ onRefresh }: Props) {
  const [pendingQuotations, setPendingQuotations] = useState<PendingQuotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuotation, setSelectedQuotation] = useState<PendingQuotation | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalComments, setApprovalComments] = useState('');
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();

  const loadPendingQuotations = async () => {
    try {
      const { data, error } = await supabase
        .from('special_hire_quotations')
        .select('*')
        .eq('approval_status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setPendingQuotations(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load pending quotations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingQuotations();
  }, []);

  const handleApprovalAction = (quotation: PendingQuotation, action: 'approve' | 'reject') => {
    setSelectedQuotation(quotation);
    setApprovalAction(action);
    setApprovalComments('');
    setShowApprovalModal(true);
  };

  const processApproval = async () => {
    if (!selectedQuotation) return;

    setProcessing(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('special_hire_quotations')
        .update({
          approval_status: approvalAction === 'approve' ? 'approved' : 'rejected',
          approved_by: userData.user?.id,
          approval_date: new Date().toISOString(),
          approval_comments: approvalComments || null,
        })
        .eq('id', selectedQuotation.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Quotation ${approvalAction === 'approve' ? 'approved' : 'rejected'} successfully`,
      });

      await loadPendingQuotations();
      onRefresh();
      setShowApprovalModal(false);
      setSelectedQuotation(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      pending: { variant: 'secondary' as const, icon: Clock, color: 'text-amber-600' },
      approved: { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
      rejected: { variant: 'destructive' as const, icon: XCircle, color: 'text-red-600' }
    };

    const { variant, icon: Icon, color } = config[status as keyof typeof config] || config.pending;
    
    return (
      <Badge variant={variant} className={`${color} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const columns: ColumnDef<PendingQuotation>[] = [
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
      accessorKey: "pickup_location",
      header: "Route",
      cell: ({ row }) => (
        <div className="max-w-xs">
          <div className="text-sm font-medium truncate">{row.original.pickup_location} → {row.original.drop_location}</div>
        </div>
      ),
    },
    {
      accessorKey: "discount_percentage",
      header: "Discount",
      cell: ({ row }) => (
        <div className="text-center">
          <Badge variant="secondary" className="bg-amber-100 text-amber-800">
            {row.getValue("discount_percentage")}%
          </Badge>
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
      accessorKey: "created_at",
      header: "Requested",
      cell: ({ row }) => (
          <div className="text-sm">
            <div>{format(new Date(row.getValue("created_at")), "MMM dd, yyyy")}</div>
          </div>
      ),
    },
    {
      accessorKey: "approval_status",
      header: "Status",
      cell: ({ row }) => getStatusBadge(row.getValue("approval_status")),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const quotation = row.original;
        return (
          <div className="flex space-x-1">
            {quotation.approval_status === 'pending' && (
              <>
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => handleApprovalAction(quotation, 'approve')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => handleApprovalAction(quotation, 'reject')}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </>
            )}
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
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Discount Approvals
              {pendingQuotations.length > 0 && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                  {pendingQuotations.length} pending
                </Badge>
              )}
            </CardTitle>
            <Button variant="outline" onClick={loadPendingQuotations} disabled={loading}>
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {pendingQuotations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No quotations pending approval</p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={pendingQuotations}
              searchKey="customer_name"
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={showApprovalModal} onOpenChange={setShowApprovalModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {approvalAction === 'approve' ? 'Approve' : 'Reject'} Discount Request
            </DialogTitle>
            <DialogDescription>
              Quotation: {selectedQuotation?.quotation_no} - {selectedQuotation?.customer_name}
              <br />
              Discount: {selectedQuotation?.discount_percentage}%
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="comments">Comments {approvalAction === 'reject' ? '(Required)' : '(Optional)'}</Label>
              <Textarea
                id="comments"
                placeholder={approvalAction === 'approve' 
                  ? "Optional comments about the approval..." 
                  : "Please provide a reason for rejection..."
                }
                value={approvalComments}
                onChange={(e) => setApprovalComments(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={processApproval}
              disabled={processing || (approvalAction === 'reject' && !approvalComments.trim())}
              variant={approvalAction === 'approve' ? 'default' : 'destructive'}
            >
              {processing ? 'Processing...' : (approvalAction === 'approve' ? 'Approve' : 'Reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}