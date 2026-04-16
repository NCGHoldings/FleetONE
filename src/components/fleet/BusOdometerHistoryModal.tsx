import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { History, Loader2, Gauge, Calendar, Navigation } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KPICard } from "@/components/dashboard/KPICard";

interface DailyMileageRecord {
  id: string;
  date: string;
  start_odometer_km: number | null;
  end_odometer_km: number | null;
  daily_km: number | null;
  data_source: string | null;
}

interface BusOdometerHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busId: string | null;
  busNo: string | null;
}

export function BusOdometerHistoryModal({ open, onOpenChange, busId, busNo }: BusOdometerHistoryModalProps) {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<DailyMileageRecord[]>([]);
  const [daysFilter, setDaysFilter] = useState("30");

  useEffect(() => {
    if (open && busId) {
      fetchHistory();
    }
  }, [open, busId, daysFilter]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const days = parseInt(daysFilter);
      const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('bus_daily_mileage')
        .select('*')
        .eq('bus_id', busId)
        .gte('date', startDate)
        .order('date', { ascending: false });

      if (error) throw error;
      
      // Fix inaccurate backend daily_km generation (caused by FIOS loadCount limit) by deducing it dynamically from chronological end_odometers
      if (data && data.length > 0) {
        data.forEach((record, idx, arr) => {
           // Array is sorted descending (latest date at idx 0).
           // Therefore the literal 'previous chronological day' is at idx + 1.
           const prevRecord = arr[idx + 1];
           if (prevRecord && record.end_odometer_km && prevRecord.end_odometer_km) {
             record.daily_km = Math.round((record.end_odometer_km - prevRecord.end_odometer_km) * 10) / 10;
           }
        });
      }
      
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching odometer history:', error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data (reverse for chronological order left-to-right)
  const chartData = [...records].reverse().map(record => ({
    date: format(new Date(record.date), 'MMM dd'),
    fullDate: record.date,
    mileage: record.daily_km || 0,
    source: record.data_source || 'manual'
  }));

  const totalMileage = records.reduce((sum, r) => sum + (r.daily_km || 0), 0);
  const avgMileage = records.length > 0 ? totalMileage / records.length : 0;
  const maxMileage = Math.max(...records.map(r => r.daily_km || 0), 0);

  const getSourceBadge = (source: string | null) => {
    switch (source) {
      case 'fios':
        return <Badge className="bg-blue-500 hover:bg-blue-600">FIOS</Badge>;
      case 'gps_calculated':
        return <Badge className="bg-purple-500 hover:bg-purple-600">GPS</Badge>;
      default:
        return <Badge variant="outline">Manual</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <History className="h-5 w-5 text-primary" />
              Odometer History - {busNo}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground font-medium">Show last:</span>
              <Select value={daysFilter} onValueChange={setDaysFilter} disabled={loading}>
                <SelectTrigger className="w-[120px] h-8">
                  <SelectValue placeholder="30 days" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="h-[500px] flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="h-[75vh] pr-4">
            <div className="space-y-6 pb-6">
              
              {/* Summary KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border rounded-xl p-4 bg-card shadow-sm">
                  <div className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-2">
                    <Navigation className="h-4 w-4" />
                    Total Mileage ({daysFilter}d)
                  </div>
                  <div className="text-2xl font-bold">{totalMileage.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">km</span></div>
                </div>
                <div className="border rounded-xl p-4 bg-card shadow-sm">
                  <div className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-2">
                    <Gauge className="h-4 w-4" />
                    Daily Average
                  </div>
                  <div className="text-2xl font-bold">{avgMileage.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">km/day</span></div>
                </div>
                <div className="border rounded-xl p-4 bg-card shadow-sm">
                  <div className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4" />
                    Peak Day
                  </div>
                  <div className="text-2xl font-bold text-primary">{maxMileage.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">km</span></div>
                </div>
              </div>

              {/* Chart Section */}
              <div className="border rounded-xl p-6 bg-card shadow-sm">
                <h3 className="font-semibold mb-6 flex items-center gap-2">
                  <BarChart className="h-4 w-4" />
                  Daily Distance Trends
                </h3>
                {chartData.length > 0 ? (
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="date" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 12, fill: '#6b7280' }}
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 12, fill: '#6b7280' }}
                          dx={-10}
                        />
                        <Tooltip 
                          cursor={{ fill: '#f3f4f6' }}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          formatter={(value: number) => [`${value.toFixed(1)} km`, 'Mileage']}
                          labelStyle={{ fontWeight: 'bold', color: '#111827', marginBottom: '4px' }}
                        />
                        <Bar dataKey="mileage" radius={[4, 4, 0, 0]} maxBarSize={40}>
                          {chartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.source === 'fios' ? '#3b82f6' : entry.source === 'gps_calculated' ? '#a855f7' : '#9ca3af'} 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                    No mileage data recorded for this period
                  </div>
                )}
              </div>

              {/* Table Section */}
              <div className="border rounded-xl bg-card shadow-sm overflow-hidden">
                <div className="p-4 border-b bg-muted/30">
                  <h3 className="font-semibold">Detailed Daily Records</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-muted-foreground">
                      <tr>
                        <th className="text-left font-medium p-3">Date</th>
                        <th className="text-left font-medium p-3">Start Odometer</th>
                        <th className="text-left font-medium p-3">End Odometer</th>
                        <th className="text-left font-medium p-3">Distance Logged</th>
                        <th className="text-left font-medium p-3">Data Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.length > 0 ? (
                        records.map((record, index) => (
                          <tr key={record.id} className={`border-t hover:bg-muted/20 ${index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}`}>
                            <td className="p-3 font-medium flex items-center gap-2">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              {format(new Date(record.date), 'MMM dd, yyyy')}
                            </td>
                            <td className="p-3">
                              {record.start_odometer_km ? (
                                <span className="font-mono">{record.start_odometer_km.toFixed(1)} km</span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="p-3">
                              {record.end_odometer_km ? (
                                <span className="font-mono text-primary">{record.end_odometer_km.toFixed(1)} km</span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                            <td className="p-3">
                              <div className="font-semibold text-green-600">
                                {record.daily_km ? `+${record.daily_km.toFixed(1)} km` : '-'}
                              </div>
                            </td>
                            <td className="p-3">
                              {getSourceBadge(record.data_source)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-muted-foreground">
                            No records found for the selected time range.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
