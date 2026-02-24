import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, subHours } from 'date-fns';
import { Activity } from 'lucide-react';

export function LatencySparkline() {
  const { data: logs = [] } = useQuery({
    queryKey: ['health-logs-24h'],
    queryFn: async () => {
      const twentyFourHoursAgo = subHours(new Date(), 24).toISOString();
      
      const { data, error } = await supabase
        .from('system_health_logs')
        .select('created_at, response_time_ms, check_type, status')
        .gte('created_at', twentyFourHoursAgo)
        .eq('is_test_data', false)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000 // Refetch every minute
  });

  const chartData = useMemo(() => {
    // Group by hour and average latency
    const hourlyData: Record<string, { total: number; count: number }> = {};
    
    logs.forEach(log => {
      if (log.response_time_ms) {
        const hour = format(new Date(log.created_at), 'HH:00');
        if (!hourlyData[hour]) {
          hourlyData[hour] = { total: 0, count: 0 };
        }
        hourlyData[hour].total += log.response_time_ms;
        hourlyData[hour].count += 1;
      }
    });
    
    return Object.entries(hourlyData).map(([hour, data]) => ({
      time: hour,
      latency: Math.round(data.total / data.count)
    }));
  }, [logs]);

  const avgLatency = useMemo(() => {
    if (chartData.length === 0) return 0;
    const total = chartData.reduce((sum, d) => sum + d.latency, 0);
    return Math.round(total / chartData.length);
  }, [chartData]);

  return (
    <div className="cyber-card rounded-xl border border-cyan-500/20 bg-slate-900/50 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-cyan-400" />
          <span className="font-mono text-sm font-semibold text-cyan-300 uppercase tracking-wider">
            Response Time (24h)
          </span>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-foreground font-mono">
            {avgLatency}ms
          </div>
          <div className="text-xs text-muted-foreground">avg latency</div>
        </div>
      </div>

      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={120}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 10, fill: '#64748b' }}
              axisLine={{ stroke: '#334155' }}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 10, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              width={40}
              tickFormatter={(v) => `${v}ms`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0f172a',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                borderRadius: '8px',
                fontSize: '12px'
              }}
              labelStyle={{ color: '#94a3b8' }}
              formatter={(value: number) => [`${value}ms`, 'Latency']}
            />
            <Area
              type="monotone"
              dataKey="latency"
              stroke="#06b6d4"
              strokeWidth={2}
              fill="url(#latencyGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[120px] flex items-center justify-center text-muted-foreground text-sm">
          No data available yet
        </div>
      )}
    </div>
  );
}
