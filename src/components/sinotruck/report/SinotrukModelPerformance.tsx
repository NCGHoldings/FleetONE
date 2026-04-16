import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SinotrukReportData } from '@/hooks/useSinotrukExecutiveReport';

interface Props {
  data: SinotrukReportData;
}

const formatLKR = (val: number) => `LKR ${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export function SinotrukModelPerformance({ data }: Props) {
  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Bus Model Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data.busModelPerformance.slice(0, 8)}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="model" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number, name: string) => [name === 'units' ? v : formatLKR(v), name === 'units' ? 'Units' : 'Value']} />
              <Bar dataKey="units" fill="hsl(215, 88%, 52%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          <div className="overflow-auto max-h-[250px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b">
                  <th className="text-left py-2 px-1">Model</th>
                  <th className="text-right py-2 px-1">Units</th>
                  <th className="text-right py-2 px-1">Total Value</th>
                  <th className="text-right py-2 px-1">Avg/Unit</th>
                </tr>
              </thead>
              <tbody>
                {data.busModelPerformance.map(m => (
                  <tr key={m.model} className="border-b border-muted">
                    <td className="py-2 px-1 font-medium truncate max-w-[120px]">{m.model}</td>
                    <td className="text-right py-2 px-1">{m.units}</td>
                    <td className="text-right py-2 px-1 text-xs">{formatLKR(m.totalValue)}</td>
                    <td className="text-right py-2 px-1 text-xs">{formatLKR(m.avgPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
