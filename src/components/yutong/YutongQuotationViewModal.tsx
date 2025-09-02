import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface YutongQuotation {
  id: string;
  quotation_no: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  company_name: string;
  bus_model: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: string;
  valid_until: string;
  created_at: string;
  special_features?: string;
  delivery_timeline?: string;
  payment_terms?: string;
  warranty_terms?: string;
  discount_percentage?: number;
}

interface YutongQuotationViewModalProps {
  quotation: YutongQuotation | null;
  open: boolean;
  onClose: () => void;
}

export function YutongQuotationViewModal({ quotation, open, onClose }: YutongQuotationViewModalProps) {
  if (!quotation) return null;

  const getStatusBadge = (status: string) => {
    const colors = {
      draft: "bg-gray-100 text-gray-800",
      sent: "bg-blue-100 text-blue-800",
      confirmed: "bg-green-100 text-green-800",
      expired: "bg-red-100 text-red-800"
    };

    return (
      <Badge className={colors[status as keyof typeof colors]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quotation Details - {quotation.quotation_no}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Header Section */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <h3 className="font-semibold text-lg">{quotation.quotation_no}</h3>
              <p className="text-sm text-muted-foreground">
                Created: {format(new Date(quotation.created_at), 'MMM dd, yyyy')}
              </p>
              <p className="text-sm text-muted-foreground">
                Valid Until: {format(new Date(quotation.valid_until), 'MMM dd, yyyy')}
              </p>
            </div>
            <div className="text-right">
              {getStatusBadge(quotation.status)}
            </div>
          </div>

          {/* Customer Information */}
          <div className="space-y-4">
            <h4 className="font-semibold text-base border-b pb-2">Customer Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Customer Name</label>
                <p className="font-medium">{quotation.customer_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Company Name</label>
                <p className="font-medium">{quotation.company_name || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Phone</label>
                <p className="font-medium">{quotation.customer_phone}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="font-medium">{quotation.customer_email}</p>
              </div>
            </div>
          </div>

          {/* Product Information */}
          <div className="space-y-4">
            <h4 className="font-semibold text-base border-b pb-2">Product Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Bus Model</label>
                <p className="font-medium">{quotation.bus_model}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Quantity</label>
                <p className="font-medium">{quotation.quantity}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Unit Price</label>
                <p className="font-medium">LKR {quotation.unit_price.toLocaleString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Discount</label>
                <p className="font-medium">{quotation.discount_percentage || 0}%</p>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-4">
            <h4 className="font-semibold text-base border-b pb-2">Pricing</h4>
            <div className="bg-muted/30 p-4 rounded-lg">
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total Price:</span>
                <span className="text-primary">LKR {quotation.total_price.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h4 className="font-semibold text-base border-b pb-2">Additional Information</h4>
            <div className="grid grid-cols-1 gap-4">
              {quotation.special_features && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Special Features</label>
                  <p className="font-medium">{quotation.special_features}</p>
                </div>
              )}
              {quotation.delivery_timeline && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Delivery Timeline</label>
                  <p className="font-medium">{quotation.delivery_timeline}</p>
                </div>
              )}
              {quotation.payment_terms && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Payment Terms</label>
                  <p className="font-medium">{quotation.payment_terms}</p>
                </div>
              )}
              {quotation.warranty_terms && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Warranty Terms</label>
                  <p className="font-medium">{quotation.warranty_terms}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}