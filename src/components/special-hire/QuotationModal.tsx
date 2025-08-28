import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Printer, Mail } from 'lucide-react';
import { QuotationPreview } from './QuotationPreview';
import { toast } from 'sonner';

interface QuotationData {
  id: string;
  quotation_no: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  company_name?: string;
  contact_number?: string;
  pickup_location: string;
  drop_location: string;
  pickup_datetime: string;
  drop_datetime?: string;
  number_of_buses: number;
  bus_type: string;
  seating_capacity?: number;
  total_distance_km?: number;
  gross_revenue: number;
  net_profit: number;
  fuel_cost_fuel_only?: number;
  hire_charge?: number;
  extra_charges?: number;
  commission_amount?: number;
  created_at: string;
}

interface Props {
  quotation: QuotationData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuotationModal({ quotation, open, onOpenChange }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (printRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Quotation ${quotation?.quotation_no}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                @media print {
                  body { margin: 0; }
                  .no-print { display: none; }
                }
              </style>
            </head>
            <body>
              ${printRef.current.innerHTML}
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const handleDownload = async () => {
    try {
      // For now, we'll use the print functionality
      // In a production environment, you'd want to use a proper PDF generation library
      handlePrint();
      toast.success('Quotation download initiated');
    } catch (error) {
      toast.error('Failed to download quotation');
    }
  };

  const handleEmail = () => {
    if (quotation?.customer_email) {
      const subject = `Quotation ${quotation.quotation_no} - NCG Express`;
      const body = `Dear ${quotation.customer_name},\n\nPlease find your quotation details attached.\n\nThank you for choosing NCG Express.`;
      window.open(`mailto:${quotation.customer_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    } else {
      toast.error('No email address available for this customer');
    }
  };

  if (!quotation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Quotation Preview - {quotation.quotation_no}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleEmail}>
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div ref={printRef}>
          <QuotationPreview quotation={quotation} />
        </div>
      </DialogContent>
    </Dialog>
  );
}