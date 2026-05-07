import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Landmark, Wallet } from 'lucide-react';
import { OldSalesRecord } from '@/hooks/useLightVehicleOldSalesManagement';
import { supabase } from '@/integrations/supabase/client';
import { NCG_HOLDING_ID } from '@/hooks/useVehicleSalesFinance';

interface LightVehicleOldSalePaymentModalProps {
  record: OldSalesRecord | null;
  open: boolean;
  onClose: () => void;
  onRecord: (record: OldSalesRecord, data: any) => Promise<any>;
}

export function LightVehicleOldSalePaymentModal({ record, open, onClose, onRecord }: LightVehicleOldSalePaymentModalProps) {
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [isLoadingBanks, setIsLoadingBanks] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    method: 'bank_transfer',
    bankAccountId: '',
    notes: ''
  });

  useEffect(() => {
    if (open) {
      loadBankAccounts();
      if (record) {
        setFormData(prev => ({
          ...prev,
          amount: (record.final_price || 0).toString(),
          notes: `Payment for legacy sale ${record.quotation_no || ''}`
        }));
      }
    }
  }, [open, record]);

  const loadBankAccounts = async () => {
    setIsLoadingBanks(true);
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('id, account_name, bank_name')
        .eq('company_id', NCG_HOLDING_ID)
        .eq('is_active', true);
      if (!error) setBankAccounts(data || []);
    } finally {
      setIsLoadingBanks(false);
    }
  };

  const handleSubmit = async () => {
    if (!record || !formData.amount) return;
    setIsSubmitting(true);
    const result = await onRecord(record, formData);
    setIsSubmitting(false);
    if (result) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-blue-600" />
            Record Legacy Payment (Hit AR)
          </DialogTitle>
          <DialogDescription>
            Record a direct payment for customer: {record?.customer_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Payment Amount (LKR) *</Label>
            <Input 
              type="number"
              value={formData.amount}
              onChange={e => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="0.00"
              className="text-lg font-bold"
            />
          </div>

          <div className="space-y-2">
            <Label>Payment Date *</Label>
            <Input 
              type="date"
              value={formData.date}
              onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label>Payment Method *</Label>
            <Select 
              value={formData.method} 
              onValueChange={val => setFormData(prev => ({ ...prev, method: val }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Bank Account *</Label>
            <Select 
              value={formData.bankAccountId} 
              onValueChange={val => setFormData(prev => ({ ...prev, bankAccountId: val }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={isLoadingBanks ? "Loading banks..." : "Select bank account"} />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.map(bank => (
                  <SelectItem key={bank.id} value={bank.id}>
                    <div className="flex items-center gap-2">
                      <Landmark className="h-3 w-3" />
                      {bank.bank_name} - {bank.account_name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Input 
              value={formData.notes}
              onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional comments..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !formData.bankAccountId}>
            {isSubmitting ? 'Recording...' : 'Record Payment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
