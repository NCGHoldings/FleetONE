import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  User, 
  Phone, 
  Calendar, 
  Download, 
  Filter,
  CheckCircle,
  Clock,
  XCircle,
  Bus,
  Truck,
  Car
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ReferralAgent {
  id: string;
  agent_name: string;
  phone: string | null;
  default_commission_pct: number;
  total_referrals: number;
  total_commission_earned: number;
  status: string;
  created_at: string;
}

interface CommissionRecord {
  id: string;
  quotation_id: string;
  commission_amount: number;
  payment_status: string;
  paid_at: string | null;
  payment_reference: string | null;
  payment_method: string | null;
  created_at: string;
  source: 'special_hire' | 'yutong' | 'light_vehicle' | 'sinotruck';
  quotation?: {
    quotation_no: string;
    customer_name: string;
    gross_revenue: number;
  };
}

interface ReferralAgentHistoryModalProps {
  agent: ReferralAgent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReferralAgentHistoryModal({ 
  agent, 
  open, 
  onOpenChange 
}: ReferralAgentHistoryModalProps) {
  const [records, setRecords] = useState<CommissionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchHistory();
    }
  }, [open, agent.id]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      
      // Fetch from ALL 4 commission tables in parallel
      const [specialHireRes, yutongRes, lightVehicleRes, sinotruckRes] = await Promise.all([
        supabase
          .from('referral_commission_payments')
          .select(`*, quotation:special_hire_quotations (quotation_no, customer_name, gross_revenue)`)
          .eq('referral_agent_id', agent.id),
        supabase
          .from('yutong_referral_commission_payments')
          .select(`*, quotation:yutong_quotations (quotation_no, customer_name, total_price)`)
          .eq('referral_agent_id', agent.id),
        supabase
          .from('lightvehicle_referral_commission_payments')
          .select(`*, quotation:lightvehicle_quotations (quotation_number, customer_name, total_price)`)
          .eq('agent_id', agent.id),
        supabase
          .from('sinotruck_referral_commission_payments')
          .select(`*, quotation:sinotruck_quotations (quotation_no, customer_name, total_price)`)
          .eq('referral_agent_id', agent.id)
      ]);

      // Normalize and combine all records with source indicator
      const allRecords: CommissionRecord[] = [
        ...(specialHireRes.data || []).map(r => ({
          id: r.id,
          quotation_id: r.quotation_id,
          commission_amount: r.commission_amount,
          payment_status: r.payment_status,
          paid_at: r.paid_at,
          payment_reference: r.payment_reference,
          payment_method: r.payment_method,
          created_at: r.created_at,
          source: 'special_hire' as const,
          quotation: r.quotation ? {
            quotation_no: r.quotation.quotation_no,
            customer_name: r.quotation.customer_name,
            gross_revenue: r.quotation.gross_revenue
          } : undefined
        })),
        ...(yutongRes.data || []).map(r => ({
          id: r.id,
          quotation_id: r.yutong_quotation_id || r.id,
          commission_amount: r.commission_amount,
          payment_status: r.payment_status,
          paid_at: r.paid_at,
          payment_reference: r.payment_reference,
          payment_method: r.payment_method,
          created_at: r.created_at,
          source: 'yutong' as const,
          quotation: r.quotation ? {
            quotation_no: r.quotation.quotation_no,
            customer_name: r.quotation.customer_name,
            gross_revenue: r.quotation.total_price || 0
          } : undefined
        })),
        ...(lightVehicleRes.data || []).map(r => ({
          id: r.id,
          quotation_id: r.quotation_id || r.id,
          commission_amount: r.commission_amount,
          payment_status: r.status || 'pending',
          paid_at: r.payment_date || null,
          payment_reference: r.payment_reference,
          payment_method: null,
          created_at: r.created_at,
          source: 'light_vehicle' as const,
          quotation: r.quotation ? {
            quotation_no: (r.quotation as any).quotation_number || '',
            customer_name: (r.quotation as any).customer_name || '',
            gross_revenue: (r.quotation as any).total_price || 0
          } : undefined
        })),
        ...(sinotruckRes.data || []).map(r => ({
          id: r.id,
          quotation_id: r.quotation_id,
          commission_amount: r.commission_amount,
          payment_status: r.payment_status,
          paid_at: r.paid_at,
          payment_reference: r.payment_reference,
          payment_method: r.payment_method,
          created_at: r.created_at,
          source: 'sinotruck' as const,
          quotation: r.quotation ? {
            quotation_no: r.quotation.quotation_no,
            customer_name: r.quotation.customer_name,
            gross_revenue: r.quotation.total_price || 0
          } : undefined
        }))
      ];

      // Sort by created_at descending
      allRecords.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setRecords(allRecords);
    } catch (error: any) {
      console.error('Error fetching history:', error);
      toast({
        title: 'Error',
        description: 'Failed to load commission history',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter(record => 
    statusFilter === 'all' || record.payment_status === statusFilter
  );

  const totalPending = records
    .filter(r => r.payment_status === 'pending')
    .reduce((sum, r) => sum + Number(r.commission_amount), 0);
  
  const totalPaid = records
    .filter(r => r.payment_status === 'paid')
    .reduce((sum, r) => sum + Number(r.commission_amount), 0);

  const formatCurrency = (amount: number) => {
    return `LKR ${amount.toLocaleString()}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"><CheckCircle className="h-3 w-3 mr-1" />Paid</Badge>;
      case 'pending':
        return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'special_hire':
        return <Badge variant="outline" className="text-xs"><Bus className="h-3 w-3 mr-1" />Special Hire</Badge>;
      case 'yutong':
        return <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-900/20"><Bus className="h-3 w-3 mr-1" />Yutong</Badge>;
      case 'light_vehicle':
        return <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-900/20"><Car className="h-3 w-3 mr-1" />Light Vehicle</Badge>;
      case 'sinotruck':
        return <Badge variant="outline" className="text-xs bg-amber-50 dark:bg-amber-900/20"><Truck className="h-3 w-3 mr-1" />Sinotruck</Badge>;
      default:
        return <Badge variant="outline">{source}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Commission History - {agent.agent_name}
          </DialogTitle>
        </DialogHeader>

        {/* Agent Profile Summary */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Agent Name</p>
              <p className="font-medium">{agent.agent_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium flex items-center gap-1">
                {agent.phone ? (
                  <>
                    <Phone className="h-3 w-3" />
                    {agent.phone}
                  </>
                ) : (
                  '-'
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Default Commission</p>
              <p className="font-medium">{agent.default_commission_pct}%</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Member Since</p>
              <p className="font-medium flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(agent.created_at), 'MMM dd, yyyy')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-2 border-t">
            <div>
              <p className="text-sm text-muted-foreground">Total Referrals</p>
              <p className="text-xl font-bold text-primary">{agent.total_referrals}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Payment</p>
              <p className="text-xl font-bold text-orange-600">{formatCurrency(totalPending)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Paid</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm" disabled>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        {/* History Table */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No commission records found.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Quotation #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Deal Value</TableHead>
                <TableHead className="text-right">Commission</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Paid Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((record) => (
                <TableRow key={`${record.source}-${record.id}`}>
                  <TableCell>
                    {format(new Date(record.created_at), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>{getSourceBadge(record.source)}</TableCell>
                  <TableCell className="font-mono">
                    {record.quotation?.quotation_no || '-'}
                  </TableCell>
                  <TableCell>{record.quotation?.customer_name || '-'}</TableCell>
                  <TableCell className="text-right">
                    {record.quotation?.gross_revenue 
                      ? formatCurrency(Number(record.quotation.gross_revenue)) 
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(Number(record.commission_amount))}
                  </TableCell>
                  <TableCell>{getStatusBadge(record.payment_status)}</TableCell>
                  <TableCell>
                    {record.paid_at 
                      ? format(new Date(record.paid_at), 'MMM dd, yyyy')
                      : '-'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}