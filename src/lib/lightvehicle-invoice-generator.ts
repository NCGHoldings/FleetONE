// Stub module for Light Vehicle invoice generation
// TODO: Implement full invoice generation for light vehicle sales

import jsPDF from 'jspdf';

export interface LightVehicleInvoiceData {
  invoiceNo: string;
  invoiceType: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  companyName?: string;
  busModel?: string;
  quantity?: number;
  unitPrice?: number;
  totalAmount: number;
  paidAmount?: number;
  balanceAmount?: number;
  invoice_status?: 'draft' | 'approved';
  [key: string]: any;
}

export const generateLightVehicleInvoiceHTML = (data: LightVehicleInvoiceData): string => {
  return `<div style="font-family: Arial; padding: 20px;">
    <h2>Light Vehicle Invoice - ${data.invoiceNo}</h2>
    <p>Customer: ${data.customerName}</p>
    <p>Total: LKR ${(data.totalAmount || 0).toLocaleString()}</p>
  </div>`;
};

export const generateLightVehicleInvoicePDF = async (data: LightVehicleInvoiceData): Promise<Blob> => {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(`Invoice: ${data.invoiceNo}`, 20, 30);
  doc.setFontSize(12);
  doc.text(`Customer: ${data.customerName}`, 20, 50);
  doc.text(`Total: LKR ${(data.totalAmount || 0).toLocaleString()}`, 20, 65);
  return doc.output('blob');
};
