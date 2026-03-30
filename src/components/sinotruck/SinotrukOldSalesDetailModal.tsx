// @ts-nocheck
import React from 'react';
import { FileText, ShoppingCart, Calendar, User, Building, Phone, Mail, MapPin, Bus, DollarSign, Percent } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { OldSalesRecord } from '@/hooks/useSinotrukOldSalesManagement';
import { format } from 'date-fns';

interface SinotrukOldSalesDetailModalProps {
  record: OldSalesRecord;
  open: boolean;
  onClose: () => void;
  onConvert: () => void;
  onCreateOrder: () => void;
}

export const SinotrukOldSalesDetailModal: React.FC<SinotrukOldSalesDetailModalProps> = ({
  record,
  open,
  onClose,
  onConvert,
  onCreateOrder,
}) => {
  const formatCurrency = (value: number | undefined) => {
    if (!value) return 'LKR 0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'LKR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return '-';
    try {
      return format(new Date(date), 'dd MMM yyyy');
    } catch {
      return date;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Old Sale Details
            {record.quotation_no && (
              <Badge variant="outline" className="ml-2 font-mono">
                {record.quotation_no}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status and Date */}
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Quoted: {formatDate(record.quoted_date)}</span>
            </div>
            {record.quotation_status && (
              <Badge variant="secondary">{record.quotation_status}</Badge>
            )}
            {record.converted_to_quotation_id && (
              <Badge className="bg-green-100 text-green-800">Converted to Quotation</Badge>
            )}
            {record.converted_to_order_id && (
              <Badge className="bg-blue-100 text-blue-800">Order Created</Badge>
            )}
          </div>

          <Separator />

          {/* Customer Information */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground">CUSTOMER INFORMATION</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-2">
                <User className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{record.customer_name}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Building className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Company</p>
                  <p className="font-medium">{record.company_name || '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Phone className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Contact</p>
                  <p className="font-medium">{record.customer_phone || '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{record.customer_email || '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 md:col-span-2">
                <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">{record.customer_address || '-'}</p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Vehicle Information */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground">VEHICLE INFORMATION</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-2">
                <Bus className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Model</p>
                  <p className="font-medium">{record.bus_model || '-'}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Quantity</p>
                <p className="font-medium">{record.quantity || 1} unit(s)</p>
              </div>
              {record.optional_specifications && (
                <div className="md:col-span-2">
                  <p className="text-sm text-muted-foreground">Optional Specifications</p>
                  <p className="font-medium">{record.optional_specifications}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Pricing Information */}
          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground">PRICING DETAILS</h3>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base Price</span>
                <span>{formatCurrency(record.base_price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Before Discount</span>
                <span>{formatCurrency(record.total_before_discount)}</span>
              </div>
              <div className="flex justify-between text-red-600">
                <span className="flex items-center gap-1">
                  <Percent className="h-3 w-3" />
                  Discount
                </span>
                <span>- {formatCurrency(record.discount_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(record.subtotal_price)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">VAT</span>
                <span>{formatCurrency(record.vat_amount)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-semibold text-lg">
                <span className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  Final Price
                </span>
                <span className="text-primary">{formatCurrency(record.final_price)}</span>
              </div>
              {record.advance_payment && record.advance_payment > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Advance Payment</span>
                  <span>{formatCurrency(record.advance_payment)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Sales Information */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Sales Person</p>
              <p className="font-medium">{record.sales_person || '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Entered By</p>
              <p className="font-medium">{record.entered_by || '-'}</p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {!record.converted_to_quotation_id && (
            <Button onClick={onConvert}>
              <FileText className="h-4 w-4 mr-2" />
              Convert to Quotation
            </Button>
          )}
          {!record.converted_to_order_id && (
            <Button variant="secondary" onClick={onCreateOrder}>
              <ShoppingCart className="h-4 w-4 mr-2" />
              Create Order
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
