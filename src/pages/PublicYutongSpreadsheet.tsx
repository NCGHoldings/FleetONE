import React, { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lock, Loader2, Table2 } from 'lucide-react';
import { YutongSpreadsheetCore } from '@/components/yutong/spreadsheet/YutongSpreadsheetCore';
import { SpreadsheetOrder, NewOrderData } from '@/hooks/useYutongSpreadsheetData';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function PublicYutongSpreadsheet() {
  const [searchParams] = useSearchParams();
  const codeFromUrl = searchParams.get('code') || '';
  const [code, setCode] = useState(codeFromUrl);
  const [accessCode, setAccessCode] = useState('');
  const [orders, setOrders] = useState<SpreadsheetOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const { toast } = useToast();

  const fetchData = useCallback(async (ac: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('yutong-spreadsheet-data', {
        body: { access_code: ac },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: 'Access Denied', description: data.error, variant: 'destructive' });
        return false;
      }
      setOrders(data.orders || []);
      return true;
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to fetch data', variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleVerify = async () => {
    if (!code.trim()) return;
    const success = await fetchData(code.trim());
    if (success) {
      setAccessCode(code.trim());
      setVerified(true);
    }
  };

  const handleUpdate = useCallback(async (orderId: string, field: string, value: any) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, [field]: value } : o));
    try {
      const { data, error } = await supabase.functions.invoke('yutong-spreadsheet-data', {
        body: { access_code: accessCode, action: 'update', order_id: orderId, field, value },
      });
      if (error || data?.error) {
        toast({ title: 'Update Failed', description: data?.error || 'Failed to update', variant: 'destructive' });
        fetchData(accessCode);
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
      fetchData(accessCode);
    }
  }, [accessCode, toast, fetchData]);

  const handleAddOrder = useCallback(async (orderData: NewOrderData) => {
    try {
      const { data, error } = await supabase.functions.invoke('yutong-spreadsheet-data', {
        body: { access_code: accessCode, action: 'add', order_data: orderData },
      });
      if (error || data?.error) {
        toast({ title: 'Add Failed', description: data?.error || 'Failed to add order', variant: 'destructive' });
        return;
      }
      toast({ title: 'Order Added', description: 'New order created successfully' });
      await fetchData(accessCode);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  }, [accessCode, toast, fetchData]);

  const handleDeleteOrder = useCallback(async (orderId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('yutong-spreadsheet-data', {
        body: { access_code: accessCode, action: 'delete', order_id: orderId },
      });
      if (error || data?.error) {
        toast({ title: 'Delete Failed', description: data?.error || 'Failed to delete', variant: 'destructive' });
        return;
      }
      toast({ title: 'Order Deleted', description: 'Order removed successfully' });
      setOrders(prev => prev.filter(o => o.id !== orderId));
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  }, [accessCode, toast]);

  // Auto-verify if code came from URL
  React.useEffect(() => {
    if (codeFromUrl && !verified) {
      const ac = codeFromUrl;
      fetchData(ac).then(success => {
        if (success) { setAccessCode(ac); setVerified(true); }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (verified) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Yutong Orders — Live Spreadsheet</h1>
          <p className="text-sm text-muted-foreground">Edit cells inline • Changes save instantly</p>
        </div>
        <YutongSpreadsheetCore
          orders={orders}
          loading={loading}
          onUpdate={handleUpdate}
          onRefresh={() => fetchData(accessCode)}
          onAddOrder={handleAddOrder}
          onDeleteOrder={handleDeleteOrder}
          isPublic
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Table2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Yutong Orders Spreadsheet</CardTitle>
          <p className="text-sm text-muted-foreground">Enter your access code to view and edit orders</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Enter access code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
              className="pl-10"
              maxLength={20}
            />
          </div>
          <Button onClick={handleVerify} disabled={loading || !code.trim()} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {loading ? 'Verifying...' : 'Open Spreadsheet'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
