import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  XCircle
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
  quotation?: {
    quotation_no: string;
    customer_name: string;
    gross_revenue: number;
    pickup_location: string;
    drop_location: string;
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
      
      const { data, error } = await supabase
        .from('referral_commission_payments')
        .select(`
          *,
          quotation:special_hire_quotations (
            quotation_no,
            customer_name,
            gross_revenue,
            pickup_location,
            drop_location
          )
        `)
        .eq('referral_agent_id', agent.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
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
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Paid</Badge>;
      case 'pending':
        return <Badge className="bg-orange-100 text-orange-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
                <TableHead>Quotation #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Trip Amount</TableHead>
                <TableHead className="text-right">Commission</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Paid Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    {format(new Date(record.created_at), 'MMM dd, yyyy')}
                  </TableCell>
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
