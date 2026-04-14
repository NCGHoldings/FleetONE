// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, RefreshCw, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  posted: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export function YutongLandedCostView() {
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [chargesMap, setChargesMap] = useState<Record<string, any[]>>({});
  const [itemsMap, setItemsMap] = useState<Record<string, any[]>>({});

  const loadData = async () => {
    setLoading(true);
    const { data: voucherData } = await supabase
      .from('landed_cost_vouchers')
      .select('*')
      .eq('business_unit_code', 'YUT')
      .order('created_at', { ascending: false });
    setVouchers(voucherData || []);
    setLoading(false);
  };

  const loadDetails = async (voucherId: string) => {
    if (chargesMap[voucherId]) return;
    const [{ data: charges }, { data: items }] = await Promise.all([
      supabase.from('landed_cost_charges').select('*').eq('voucher_id', voucherId),
      supabase.from('landed_cost_items').select('*').eq('voucher_id', voucherId),
    ]);
    setChargesMap(prev => ({ ...prev, [voucherId]: charges || [] }));
    setItemsMap(prev => ({ ...prev, [voucherId]: items || [] }));
  };

  useEffect(() => { loadData(); }, []);

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      await loadDetails(id);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" /> Landed Cost Vouchers
        </CardTitle>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading landed cost data...</div>
        ) : vouchers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No landed cost vouchers found for Yutong. Create them from the Accounting → Landed Cost module.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead></TableHead>
                <TableHead>Voucher No</TableHead>
                <TableHead>Posting Date</TableHead>
                <TableHead>GRN</TableHead>
                <TableHead>Allocation Method</TableHead>
                <TableHead>Total Additional Cost</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vouchers.map(v => {
                const isExpanded = expandedId === v.id;
                const charges = chargesMap[v.id] || [];
                const items = itemsMap[v.id] || [];
                return (
                  <React.Fragment key={v.id}>
                    <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => toggleExpand(v.id)}>
                      <TableCell>{isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</TableCell>
                      <TableCell className="font-medium">{v.voucher_number}</TableCell>
                      <TableCell>{v.posting_date ? format(new Date(v.posting_date), 'dd/MM/yyyy') : '-'}</TableCell>
                      <TableCell>{v.grn_id ? 'Linked' : '-'}</TableCell>
                      <TableCell><Badge variant="outline">{v.allocation_method || 'By Value'}</Badge></TableCell>
                      <TableCell className="font-medium">LKR {Number(v.total_additional_cost || 0).toLocaleString()}</TableCell>
                      <TableCell><Badge className={statusColors[v.status] || 'bg-gray-100'}>{v.status?.toUpperCase()}</Badge></TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={7}>
                          <div className="p-4 bg-muted/30 rounded-lg space-y-4">
                            {/* Charges */}
                            <div>
                              <h4 className="font-medium mb-2">Additional Charges ({charges.length})</h4>
                              {charges.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No charges recorded</p>
                              ) : (
                                <Table>
                                  <TableHeader><TableRow>
                                    <TableHead>Type</TableHead><TableHead>Description</TableHead><TableHead>Vendor</TableHead><TableHead>Amount</TableHead>
                                  </TableRow></TableHeader>
                                  <TableBody>
                                    {charges.map(c => (
                                      <TableRow key={c.id}>
                                        <TableCell>{c.charge_type}</TableCell>
                                        <TableCell>{c.description || '-'}</TableCell>
                                        <TableCell>{c.vendor_name || '-'}</TableCell>
                                        <TableCell>LKR {Number(c.amount || 0).toLocaleString()}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              )}
                            </div>
                            {/* Items */}
                            <div>
                              <h4 className="font-medium mb-2">Cost Allocation ({items.length} items)</h4>
                              {items.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No items allocated</p>
                              ) : (
                                <Table>
                                  <TableHeader><TableRow>
                                    <TableHead>Item</TableHead><TableHead>Original Cost</TableHead><TableHead>Allocated Cost</TableHead><TableHead>Final Cost</TableHead>
                                  </TableRow></TableHeader>
                                  <TableBody>
                                    {items.map(item => (
                                      <TableRow key={item.id}>
                                        <TableCell>{item.item_description || item.item_code || '-'}</TableCell>
                                        <TableCell>LKR {Number(item.original_cost || 0).toLocaleString()}</TableCell>
                                        <TableCell>LKR {Number(item.allocated_cost || 0).toLocaleString()}</TableCell>
                                        <TableCell className="font-medium">LKR {Number(item.final_cost || 0).toLocaleString()}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              )}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
