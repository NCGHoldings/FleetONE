import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { YutongReportData } from '@/hooks/useYutongExecutiveReport';

interface Props {
  data: YutongReportData;
}

const formatLKR = (val: number) => `LKR ${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export function YutongTopCustomers({ data }: Props) {
  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Top Customers by Order Value</CardTitle>
      </CardHeader>
      <CardContent>
        {data.topCustomers.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">No customer data available</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">#</th>
                  <th className="text-left py-2 px-2">Company</th>
                  <th className="text-left py-2 px-2">Contact</th>
                  <th className="text-right py-2 px-2">Orders</th>
                  <th className="text-right py-2 px-2">Avg Order</th>
                  <th className="text-right py-2 px-2">Total Value</th>
                  <th className="text-right py-2 px-2">Last Order</th>
                </tr>
              </thead>
              <tbody>
                {data.topCustomers.map((c, i) => (
                  <tr key={i} className="border-b border-muted hover:bg-muted/50">
                    <td className="py-2 px-2 font-medium">{i + 1}</td>
                    <td className="py-2 px-2 font-medium">{c.company_name}</td>
                    <td className="py-2 px-2 text-muted-foreground">{c.contact_person || '-'}</td>
                    <td className="text-right py-2 px-2">{c.orderCount}</td>
                    <td className="text-right py-2 px-2 text-muted-foreground">{formatLKR(c.avgOrderValue)}</td>
                    <td className="text-right py-2 px-2 font-semibold">{formatLKR(c.totalValue)}</td>
                    <td className="text-right py-2 px-2 text-muted-foreground text-xs">
                      {c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
