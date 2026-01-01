import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, Calendar, Route, TrendingUp } from "lucide-react";
import { format } from "date-fns";

interface Commission {
  id: string;
  staff_id: string;
  trip_id?: string;
  route_id?: string;
  trip_date: string;
  base_revenue?: number;
  target_revenue?: number;
  actual_revenue?: number;
  commission_rate?: number;
  commission_amount: number;
  status: 'pending' | 'approved' | 'paid';
  created_at: string;
}

interface CommissionHistoryProps {
  staffId: string;
}

export function CommissionHistory({ staffId }: CommissionHistoryProps) {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ pending: 0, approved: 0, paid: 0 });

  useEffect(() => {
    const fetchCommissions = async () => {
      try {
        const { data, error } = await supabase
          .from('staff_commissions')
          .select('*')
          .eq('staff_id', staffId)
          .order('trip_date', { ascending: false })
          .limit(20);

        if (error) throw error;

        setCommissions(data || []);

        // Calculate totals by status
        const pending = (data || [])
          .filter(c => c.status === 'pending')
          .reduce((sum, c) => sum + (c.commission_amount || 0), 0);
        const approved = (data || [])
          .filter(c => c.status === 'approved')
          .reduce((sum, c) => sum + (c.commission_amount || 0), 0);
        const paid = (data || [])
          .filter(c => c.status === 'paid')
          .reduce((sum, c) => sum + (c.commission_amount || 0), 0);

        setTotals({ pending, approved, paid });
      } catch (error) {
        console.error('Error fetching commissions:', error);
      } finally {
        setLoading(false);
      }
    };

    if (staffId) {
      fetchCommissions();
    }
  }, [staffId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'approved':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      default:
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="h-6 w-32 bg-muted rounded" />
            <div className="h-32 w-full bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-500" />
          Commission History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-yellow-500/10 rounded-lg p-3 text-center">
            <div className="text-xs text-muted-foreground">Pending</div>
            <div className="text-lg font-bold text-yellow-600">
              LKR {totals.pending.toLocaleString()}
            </div>
          </div>
          <div className="bg-blue-500/10 rounded-lg p-3 text-center">
            <div className="text-xs text-muted-foreground">Approved</div>
            <div className="text-lg font-bold text-blue-600">
              LKR {totals.approved.toLocaleString()}
            </div>
          </div>
          <div className="bg-green-500/10 rounded-lg p-3 text-center">
            <div className="text-xs text-muted-foreground">Paid</div>
            <div className="text-lg font-bold text-green-600">
              LKR {totals.paid.toLocaleString()}
            </div>
          </div>
        </div>

        {commissions.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <TrendingUp className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>No commission records yet</p>
            <p className="text-xs mt-1">Commissions are calculated based on route targets</p>
          </div>
        ) : (
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {commissions.map((commission) => (
                <div
                  key={commission.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Route className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          LKR {commission.commission_amount?.toLocaleString() || 0}
                        </span>
                        <Badge className={getStatusColor(commission.status)}>
                          {commission.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(commission.trip_date), 'MMM d, yyyy')}
                        {commission.actual_revenue && commission.target_revenue && (
                          <span className="ml-2">
                            Target: LKR {commission.target_revenue.toLocaleString()} → 
                            Actual: LKR {commission.actual_revenue.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
