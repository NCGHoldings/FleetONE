import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Search,
  UserPlus,
  CheckCircle,
  Clock,
  AlertCircle,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { LinkReferralAgentModal } from './LinkReferralAgentModal';

interface ConfirmedQuotation {
  id: string;
  quotation_no: string;
  customer_name: string;
  company_name: string | null;
  phone_number: string | null;
  email: string | null;
  gross_revenue: number;
  fuel_cost_fuel_only: number;
  total_additional_charges: number;
  discount_amount_lkr: number;
  commission_pass_through_amount: number;
  pickup_location: string;
  drop_location: string;
  pickup_datetime: string;
  referral_agent_id: string | null;
  referral_commission_pct: number | null;
  referral_commission_amount: number | null;
  referral_agent?: {
    agent_name: string;
  };
}

export function BulkCommissionManagement() {
  const [quotations, setQuotations] = useState<ConfirmedQuotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [agentFilter, setAgentFilter] = useState('unlinked');
  const [selectedQuotation, setSelectedQuotation] = useState<ConfirmedQuotation | null>(null);
  const [linkModalOpen, setLinkModalOpen] = useState(false);

  useEffect(() => {
    fetchQuotations();
  }, []);

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      
      // @ts-ignore - Avoid TS2589 deep instantiation error
      const result = await supabase
        .from('special_hire_quotations')
        .select('*')
        .eq('status', 'confirmed')
        .eq('is_active', true)
        .order('pickup_datetime', { ascending: false });

      if (result.error) throw result.error;

      const quotationsData = (result.data || []) as any[];

      // Get unique agent IDs for linked quotations
      const agentIds: string[] = [];
      quotationsData.forEach(q => {
        if (q.referral_agent_id && !agentIds.includes(q.referral_agent_id)) {
          agentIds.push(q.referral_agent_id);
        }
      });

      // Fetch agent names if there are any linked agents
      const agentMap: Record<string, string> = {};
      if (agentIds.length > 0) {
        const { data: agentsData } = await supabase
          .from('referral_agents')
          .select('id, agent_name')
          .in('id', agentIds);
        
        if (agentsData) {
          agentsData.forEach((agent: any) => {
            agentMap[agent.id] = agent.agent_name;
          });
        }
      }

      // Map quotations with agent names
      const mappedQuotations: ConfirmedQuotation[] = quotationsData.map(q => ({
        id: q.id,
        quotation_no: q.quotation_no,
        customer_name: q.customer_name,
        company_name: q.company_name,
        gross_revenue: q.gross_revenue || 0,
        fuel_cost_fuel_only: q.fuel_cost_fuel_only || 0,
        total_additional_charges: q.total_additional_charges || 0,
        discount_amount_lkr: q.discount_amount_lkr || 0,
        commission_pass_through_amount: q.commission_pass_through_amount || 0,
        pickup_location: q.pickup_location,
        drop_location: q.drop_location,
        pickup_datetime: q.pickup_datetime,
        referral_agent_id: q.referral_agent_id,
        referral_commission_pct: q.referral_commission_pct,
        referral_commission_amount: q.referral_commission_amount,
        referral_agent: q.referral_agent_id ? { agent_name: agentMap[q.referral_agent_id] || 'Unknown' } : undefined
      }));

      setQuotations(mappedQuotations);
    } catch (error) {
      console.error('Error fetching quotations:', error);
      toast.error('Failed to load quotations');
    } finally {
      setLoading(false);
    }
  };

  const filteredQuotations = quotations.filter((q) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const queryClean = query.replace(/,/g, '');
    const amountStr = q.gross_revenue ? q.gross_revenue.toString().replace(/,/g, '') : '';
    
    const matchesSearch = q.quotation_no.toLowerCase().includes(query) ||
           q.customer_name.toLowerCase().includes(query) ||
           (q.company_name && q.company_name.toLowerCase().includes(query)) ||
           (q.phone_number && q.phone_number.toLowerCase().includes(query)) ||
           (q.email && q.email.toLowerCase().includes(query)) ||
           amountStr.includes(queryClean);

    let matchesAgentFilter = true;
    switch (agentFilter) {
      case 'unlinked':
        matchesAgentFilter = !q.referral_agent_id;
        break;
      case 'linked':
        matchesAgentFilter = !!q.referral_agent_id;
        break;
      case 'all':
      default:
        matchesAgentFilter = true;
    }

    return matchesSearch && matchesAgentFilter;
  });

  const unlinkedCount = quotations.filter((q) => !q.referral_agent_id).length;
  const linkedCount = quotations.filter((q) => !!q.referral_agent_id).length;

  const formatCurrency = (amount: number) => {
    return `LKR ${(amount || 0).toLocaleString()}`;
  };

  const handleLinkAgent = (quotation: ConfirmedQuotation) => {
    setSelectedQuotation(quotation);
    setLinkModalOpen(true);
  };

  const handleLinked = () => {
    fetchQuotations();
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unlinked Trips</p>
                <p className="text-2xl font-bold">{unlinkedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Linked Trips</p>
                <p className="text-2xl font-bold">{linkedCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Confirmed</p>
                <p className="text-2xl font-bold">{quotations.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quotations Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Link Referral Agents to Confirmed Trips
            </CardTitle>
            <Button variant="outline" size="sm" onClick={fetchQuotations}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search quotations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={agentFilter} onValueChange={setAgentFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Trips</SelectItem>
                  <SelectItem value="unlinked">Unlinked Only</SelectItem>
                  <SelectItem value="linked">Linked Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredQuotations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery
                ? 'No quotations found matching your search'
                : agentFilter === 'unlinked'
                ? 'All confirmed trips have referral agents linked!'
                : 'No confirmed quotations found.'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quotation #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Trip Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Referral Agent</TableHead>
                  <TableHead className="text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotations.map((quotation) => (
                  <TableRow key={quotation.id}>
                    <TableCell className="font-mono">{quotation.quotation_no}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{quotation.customer_name}</p>
                        {quotation.company_name && (
                          <p className="text-sm text-muted-foreground">{quotation.company_name}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{quotation.pickup_location}</p>
                        <p className="text-muted-foreground">→ {quotation.drop_location}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(quotation.pickup_datetime), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(quotation.gross_revenue)}
                    </TableCell>
                    <TableCell>
                      {quotation.referral_agent_id ? (
                        <div className="space-y-1">
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {quotation.referral_agent?.agent_name || 'Linked'}
                          </Badge>
                          {quotation.referral_commission_amount && (
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(quotation.referral_commission_amount)} ({quotation.referral_commission_pct}%)
                            </p>
                          )}
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-orange-600 border-orange-300">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Not Linked
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {!quotation.referral_agent_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleLinkAgent(quotation)}
                        >
                          <UserPlus className="h-4 w-4 mr-1" />
                          Link Agent
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Link Modal */}
      {selectedQuotation && (
        <LinkReferralAgentModal
          quotation={selectedQuotation}
          open={linkModalOpen}
          onOpenChange={setLinkModalOpen}
          onLinked={handleLinked}
        />
      )}
    </div>
  );
}
