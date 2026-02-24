import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, DollarSign, Database, TrendingUp, TrendingDown, Activity, Zap, Globe } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface ApiUsageLog {
  id: string;
  api_name: string;
  endpoint: string;
  query_text: string;
  cache_hit: boolean;
  response_status: string;
  estimated_cost: number;
  created_at: string;
  metadata: any;
}

interface DailySummary {
  date: string;
  api_name: string;
  total_calls: number;
  cache_hits: number;
  api_calls: number;
  total_cost: number;
}

// API costs per 1000 calls
const API_COSTS = {
  places_autocomplete: 2.83,
  place_details: 17.00,
  geocoding: 5.00,
  directions: 5.00,
};

export default function ApiUsageMonitoring() {
  const [logs, setLogs] = useState<ApiUsageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7');
  const [summary, setSummary] = useState<{
    totalCalls: number;
    cacheHits: number;
    apiCalls: number;
    estimatedCost: number;
    costSaved: number;
  }>({ totalCalls: 0, cacheHits: 0, apiCalls: 0, estimatedCost: 0, costSaved: 0 });
  const [dailyBreakdown, setDailyBreakdown] = useState<DailySummary[]>([]);
  const [apiBreakdown, setApiBreakdown] = useState<{ [key: string]: { calls: number; cacheHits: number; cost: number } }>({});
  const { toast } = useToast();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const startDate = subDays(new Date(), parseInt(timeRange));
      
      const { data, error } = await supabase
        .from('api_usage_logs')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) {
        console.error('Error fetching logs:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch API usage logs',
          variant: 'destructive'
        });
        return;
      }

      setLogs(data || []);
      calculateSummary(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (data: ApiUsageLog[]) => {
    const totalCalls = data.length;
    const cacheHits = data.filter(l => l.cache_hit).length;
    const apiCalls = totalCalls - cacheHits;
    
    // Calculate actual cost
    const estimatedCost = data.reduce((sum, log) => sum + (log.estimated_cost || 0), 0);
    
    // Calculate cost that would have been incurred without caching
    const costWithoutCache = data.reduce((sum, log) => {
      const costPer1000 = API_COSTS[log.api_name as keyof typeof API_COSTS] || 0;
      return sum + (costPer1000 / 1000);
    }, 0);
    
    const costSaved = costWithoutCache - estimatedCost;
    
    setSummary({
      totalCalls,
      cacheHits,
      apiCalls,
      estimatedCost,
      costSaved: Math.max(0, costSaved)
    });

    // Calculate API breakdown
    const breakdown: { [key: string]: { calls: number; cacheHits: number; cost: number } } = {};
    data.forEach(log => {
      if (!breakdown[log.api_name]) {
        breakdown[log.api_name] = { calls: 0, cacheHits: 0, cost: 0 };
      }
      breakdown[log.api_name].calls++;
      if (log.cache_hit) {
        breakdown[log.api_name].cacheHits++;
      }
      breakdown[log.api_name].cost += log.estimated_cost || 0;
    });
    setApiBreakdown(breakdown);

    // Calculate daily breakdown
    const dailyMap: { [key: string]: DailySummary } = {};
    data.forEach(log => {
      const date = format(new Date(log.created_at), 'yyyy-MM-dd');
      const key = `${date}-${log.api_name}`;
      if (!dailyMap[key]) {
        dailyMap[key] = {
          date,
          api_name: log.api_name,
          total_calls: 0,
          cache_hits: 0,
          api_calls: 0,
          total_cost: 0
        };
      }
      dailyMap[key].total_calls++;
      if (log.cache_hit) {
        dailyMap[key].cache_hits++;
      } else {
        dailyMap[key].api_calls++;
      }
      dailyMap[key].total_cost += log.estimated_cost || 0;
    });
    setDailyBreakdown(Object.values(dailyMap).sort((a, b) => b.date.localeCompare(a.date)));
  };

  useEffect(() => {
    fetchLogs();
  }, [timeRange]);

  const cacheHitRate = summary.totalCalls > 0 
    ? ((summary.cacheHits / summary.totalCalls) * 100).toFixed(1) 
    : '0';

  const projectedMonthlyCost = (summary.estimatedCost / parseInt(timeRange)) * 30;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Google Maps API Usage Monitor
          </h1>
          <p className="text-muted-foreground mt-1">
            Track API calls, cache performance, and estimated costs
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 24 hours</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchLogs} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-200/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              Total Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{summary.totalCalls.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.apiCalls} API calls, {summary.cacheHits} cached
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-200/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4 text-green-500" />
              Cache Hit Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{cacheHitRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.cacheHits} requests served from cache
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-200/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-purple-500" />
              Estimated Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">${summary.estimatedCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ~${projectedMonthlyCost.toFixed(2)}/month projected
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-200/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              Cost Saved
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">${summary.costSaved.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Via caching optimization
            </p>
          </CardContent>
        </Card>
      </div>

      {/* API Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-500" />
            API Breakdown
          </CardTitle>
          <CardDescription>Usage by API type with cost per 1000 calls</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(apiBreakdown).map(([apiName, stats]) => (
              <div key={apiName} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="capitalize">
                    {apiName.replace(/_/g, ' ')}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    ${(API_COSTS[apiName as keyof typeof API_COSTS] || 0).toFixed(2)}/1000 calls
                  </span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="font-medium">{stats.calls.toLocaleString()} calls</div>
                    <div className="text-xs text-muted-foreground">
                      {stats.cacheHits} cached ({stats.calls > 0 ? ((stats.cacheHits / stats.calls) * 100).toFixed(0) : 0}%)
                    </div>
                  </div>
                  <div className="text-right min-w-[80px]">
                    <div className="font-medium text-purple-600">${stats.cost.toFixed(3)}</div>
                  </div>
                </div>
              </div>
            ))}
            {Object.keys(apiBreakdown).length === 0 && (
              <p className="text-center text-muted-foreground py-8">No API usage data yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Daily Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            Daily Usage
          </CardTitle>
          <CardDescription>API calls and costs by day</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3">Date</th>
                  <th className="text-left py-2 px-3">API</th>
                  <th className="text-right py-2 px-3">Total</th>
                  <th className="text-right py-2 px-3">API Calls</th>
                  <th className="text-right py-2 px-3">Cached</th>
                  <th className="text-right py-2 px-3">Cost</th>
                </tr>
              </thead>
              <tbody>
                {dailyBreakdown.slice(0, 20).map((row, idx) => (
                  <tr key={idx} className="border-b hover:bg-muted/30">
                    <td className="py-2 px-3">{format(new Date(row.date), 'MMM dd, yyyy')}</td>
                    <td className="py-2 px-3">
                      <Badge variant="outline" className="capitalize text-xs">
                        {row.api_name.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-right font-medium">{row.total_calls}</td>
                    <td className="py-2 px-3 text-right text-red-600">{row.api_calls}</td>
                    <td className="py-2 px-3 text-right text-green-600">{row.cache_hits}</td>
                    <td className="py-2 px-3 text-right font-medium text-purple-600">
                      ${row.total_cost.toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {dailyBreakdown.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No usage data for selected period</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent API Calls</CardTitle>
          <CardDescription>Last 50 API requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3">Time</th>
                  <th className="text-left py-2 px-3">API</th>
                  <th className="text-left py-2 px-3">Query</th>
                  <th className="text-center py-2 px-3">Cache</th>
                  <th className="text-left py-2 px-3">Status</th>
                  <th className="text-right py-2 px-3">Cost</th>
                </tr>
              </thead>
              <tbody>
                {logs.slice(0, 50).map((log) => (
                  <tr key={log.id} className="border-b hover:bg-muted/30">
                    <td className="py-2 px-3 text-muted-foreground">
                      {format(new Date(log.created_at), 'HH:mm:ss')}
                    </td>
                    <td className="py-2 px-3">
                      <Badge variant="outline" className="capitalize text-xs">
                        {log.api_name.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 max-w-[200px] truncate" title={log.query_text}>
                      {log.query_text || '-'}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {log.cache_hit ? (
                        <Badge className="bg-green-100 text-green-700 text-xs">HIT</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-700 text-xs">MISS</Badge>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <Badge variant={log.response_status === 'OK' || log.response_status?.includes('cache') ? 'default' : 'destructive'} className="text-xs">
                        {log.response_status}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 text-right font-mono">
                      ${(log.estimated_cost || 0).toFixed(4)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logs.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No API calls logged yet</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Cost Reference */}
      <Card>
        <CardHeader>
          <CardTitle>API Cost Reference</CardTitle>
          <CardDescription>Google Maps API pricing per 1000 requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-sm font-medium">Places Autocomplete</div>
              <div className="text-2xl font-bold text-blue-600">$2.83</div>
              <div className="text-xs text-muted-foreground">per 1000 calls</div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-sm font-medium">Place Details</div>
              <div className="text-2xl font-bold text-purple-600">$17.00</div>
              <div className="text-xs text-muted-foreground">per 1000 calls</div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-sm font-medium">Geocoding</div>
              <div className="text-2xl font-bold text-green-600">$5.00</div>
              <div className="text-xs text-muted-foreground">per 1000 calls</div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-sm font-medium">Directions</div>
              <div className="text-2xl font-bold text-amber-600">$5.00</div>
              <div className="text-xs text-muted-foreground">per 1000 calls</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
