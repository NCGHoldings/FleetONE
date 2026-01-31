import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Car, User, Building2, DollarSign, CalendarDays } from 'lucide-react';
import { useLightVehicleOrderManagement } from '@/hooks/useLightVehicleOrderManagement';
import { format } from 'date-fns';

interface LightVehicleCreateOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Quotation {
  id: string;
  quotation_number: string;
  customer_name: string;
  company_name?: string;
  vehicle_name: string;
  brand?: string;
  category?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  grand_total?: number;
  created_at: string;
}

export function LightVehicleCreateOrderModal({
  open,
  onOpenChange,
  onSuccess,
}: LightVehicleCreateOrderModalProps) {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [selectedQuotationId, setSelectedQuotationId] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<'cash' | 'lease'>('cash');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loadingQuotations, setLoadingQuotations] = useState(false);

  const { isLoading, getConfirmedQuotations, createOrderFromQuotation } = useLightVehicleOrderManagement();

  useEffect(() => {
    if (open) {
      loadQuotations();
    }
  }, [open]);

  const loadQuotations = async () => {
    setLoadingQuotations(true);
    const result = await getConfirmedQuotations();
    if (result.success) {
      setQuotations(result.quotations || []);
    }
    setLoadingQuotations(false);
  };

  const selectedQuotation = quotations.find(q => q.id === selectedQuotationId);

  const handleSubmit = async () => {
    if (!selectedQuotationId) return;

    const result = await createOrderFromQuotation({
      quotation_id: selectedQuotationId,
      payment_mode: paymentMode,
      expected_delivery_date: expectedDeliveryDate || undefined,
      notes: notes || undefined,
    });

    if (result.success) {
      onSuccess();
      onOpenChange(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setSelectedQuotationId('');
    setPaymentMode('cash');
    setExpectedDeliveryDate('');
    setNotes('');
  };

  const formatCurrency = (amount: number) => {
    return `Rs ${amount.toLocaleString()}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5 text-primary" />
            Create Order from Quotation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Quotation Selection */}
          <div className="space-y-2">
            <Label>Select Confirmed Quotation *</Label>
            {loadingQuotations ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading quotations...
              </div>
            ) : quotations.length === 0 ? (
              <div className="text-sm text-muted-foreground p-4 border rounded-lg bg-muted/50">
                No confirmed quotations available. Please confirm a quotation first.
              </div>
            ) : (
              <Select value={selectedQuotationId} onValueChange={setSelectedQuotationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a quotation..." />
                </SelectTrigger>
                <SelectContent>
                  {quotations.map((q) => (
                    <SelectItem key={q.id} value={q.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{q.quotation_number}</span>
                        <span className="text-muted-foreground">-</span>
                        <span>{q.customer_name}</span>
                        <span className="text-muted-foreground">({q.vehicle_name})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Selected Quotation Details */}
          {selectedQuotation && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Badge variant="outline">{selectedQuotation.quotation_number}</Badge>
                    Quotation Details
                  </h4>
                  <Badge variant="secondary">
                    {format(new Date(selectedQuotation.created_at), 'dd MMM yyyy')}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">{selectedQuotation.customer_name}</p>
                      {selectedQuotation.company_name && (
                        <p className="text-muted-foreground">{selectedQuotation.company_name}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Car className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">{selectedQuotation.vehicle_name}</p>
                      <p className="text-muted-foreground">
                        {selectedQuotation.brand} • {selectedQuotation.category}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-muted-foreground">Quantity</p>
                      <p className="font-medium">{selectedQuotation.quantity} unit(s)</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-muted-foreground">Total Amount</p>
                      <p className="font-bold text-lg">
                        {formatCurrency(selectedQuotation.grand_total || selectedQuotation.total_price)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Mode */}
          <div className="space-y-2">
            <Label>Payment Mode *</Label>
            <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as 'cash' | 'lease')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">
                  <div className="flex flex-col">
                    <span>Cash Payment</span>
                    <span className="text-xs text-muted-foreground">10% Advance, 40% Interim, 50% Balance</span>
                  </div>
                </SelectItem>
                <SelectItem value="lease">
                  <div className="flex flex-col">
                    <span>Lease / Finance</span>
                    <span className="text-xs text-muted-foreground">20% Down Payment, 80% Bank Financing</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment Structure Preview */}
          {selectedQuotation && (
            <Card className="bg-muted/30">
              <CardContent className="pt-4">
                <h5 className="text-sm font-medium mb-2">Payment Schedule Preview</h5>
                <div className="space-y-2 text-sm">
                  {paymentMode === 'cash' ? (
                    <>
                      <div className="flex justify-between">
                        <span>Advance (10%)</span>
                        <span className="font-medium">
                          {formatCurrency((selectedQuotation.grand_total || selectedQuotation.total_price) * 0.1)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Interim (40%)</span>
                        <span className="font-medium">
                          {formatCurrency((selectedQuotation.grand_total || selectedQuotation.total_price) * 0.4)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Balance (50%)</span>
                        <span className="font-medium">
                          {formatCurrency((selectedQuotation.grand_total || selectedQuotation.total_price) * 0.5)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span>Down Payment (20%)</span>
                        <span className="font-medium">
                          {formatCurrency((selectedQuotation.grand_total || selectedQuotation.total_price) * 0.2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Bank Financing (80%)</span>
                        <span className="font-medium">
                          {formatCurrency((selectedQuotation.grand_total || selectedQuotation.total_price) * 0.8)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Expected Delivery Date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              Expected Delivery Date
            </Label>
            <Input
              type="date"
              value={expectedDeliveryDate}
              onChange={(e) => setExpectedDeliveryDate(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Order Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special instructions or notes for this order..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedQuotationId || isLoading}
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
