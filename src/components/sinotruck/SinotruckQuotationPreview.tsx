import React, { forwardRef } from 'react';
import { format } from 'date-fns';

interface SinotruckQuotation {
  id: string;
  quotation_no: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  customer_address?: string;
  truck_model_name: string;
  quantity: number;
  unit_price: number;
  charger_price?: number;
  total_price: number;
  payment_terms?: string;
  terms_conditions?: any;
  status: string;
  quotation_date: string;
  valid_until: string;
}

interface SinotruckQuotationPreviewProps {
  quotation: SinotruckQuotation;
}

export const SinotruckQuotationPreview = forwardRef<HTMLDivElement, SinotruckQuotationPreviewProps>(
  ({ quotation }, ref) => {
    const formattedDate = format(new Date(quotation.quotation_date), 'dd/MM/yyyy');
    const formattedValidUntil = format(new Date(quotation.valid_until), 'dd/MM/yyyy');

    return (
      <div ref={ref} className="bg-white p-8 page" style={{ width: '210mm', minHeight: '297mm' }}>
        {/* Header */}
        <div className="flex justify-between items-start mb-8 border-b-2 border-gray-300 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">NCG HOLDINGS</h1>
            <p className="text-sm text-gray-600 mt-1">SINOTRUK GROUP</p>
            <p className="text-xs text-gray-500 mt-1">Authorized Dealer</p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-semibold text-gray-800">QUOTATION</h2>
            <p className="text-sm text-gray-600 mt-1">No: {quotation.quotation_no}</p>
            <p className="text-sm text-gray-600">Date: {formattedDate}</p>
            <p className="text-sm text-gray-600">Valid Until: {formattedValidUntil}</p>
          </div>
        </div>

        {/* Customer Details */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-3 text-gray-800">CUSTOMER DETAILS</h3>
          <div className="bg-gray-50 p-4 rounded">
            <p className="mb-1"><span className="font-medium">Name:</span> {quotation.customer_name}</p>
            <p className="mb-1"><span className="font-medium">Phone:</span> {quotation.customer_phone}</p>
            {quotation.customer_email && (
              <p className="mb-1"><span className="font-medium">Email:</span> {quotation.customer_email}</p>
            )}
            {quotation.customer_address && (
              <p><span className="font-medium">Address:</span> {quotation.customer_address}</p>
            )}
          </div>
        </div>

        {/* Product Details Table */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-3 text-gray-800">PRODUCT DETAILS</h3>
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-3 text-left">Description</th>
                <th className="border border-gray-300 p-3 text-right">Qty</th>
                <th className="border border-gray-300 p-3 text-right">Unit Price (LKR)</th>
                <th className="border border-gray-300 p-3 text-right">Total (LKR)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 p-3">{quotation.truck_model_name}</td>
                <td className="border border-gray-300 p-3 text-right">{quotation.quantity}</td>
                <td className="border border-gray-300 p-3 text-right">{quotation.unit_price.toLocaleString()}</td>
                <td className="border border-gray-300 p-3 text-right">{(quotation.unit_price * quotation.quantity).toLocaleString()}</td>
              </tr>
              {quotation.charger_price && quotation.charger_price > 0 && (
                <tr>
                  <td className="border border-gray-300 p-3">Charger</td>
                  <td className="border border-gray-300 p-3 text-right">{quotation.quantity}</td>
                  <td className="border border-gray-300 p-3 text-right">{quotation.charger_price.toLocaleString()}</td>
                  <td className="border border-gray-300 p-3 text-right">{(quotation.charger_price * quotation.quantity).toLocaleString()}</td>
                </tr>
              )}
              <tr className="font-bold bg-gray-50">
                <td colSpan={3} className="border border-gray-300 p-3 text-right">GRAND TOTAL</td>
                <td className="border border-gray-300 p-3 text-right">{quotation.total_price.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Payment Terms */}
        {quotation.payment_terms && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">PAYMENT TERMS</h3>
            <div className="bg-gray-50 p-4 rounded whitespace-pre-line text-sm">
              {quotation.payment_terms}
            </div>
          </div>
        )}

        {/* Terms & Conditions */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-3 text-gray-800">TERMS & CONDITIONS</h3>
          <div className="text-sm space-y-2">
            <p>1. This quotation is valid for 30 days from the date of issue.</p>
            <p>2. All prices are quoted in Sri Lankan Rupees (LKR).</p>
            <p>3. Delivery timeline will be confirmed upon order confirmation.</p>
            <p>4. Standard warranty terms apply as per manufacturer specifications.</p>
            <p>5. Payment terms are subject to agreement between both parties.</p>
            <p>6. Prices are subject to change without prior notice.</p>
            <p>7. Installation and training costs are separate unless specified.</p>
            <p>8. All taxes and duties are included unless otherwise stated.</p>
            <p>9. Buyer is responsible for insurance and registration costs.</p>
            <p>10. Delivery location and charges to be mutually agreed.</p>
            <p>11. Any modifications to this quotation must be in writing.</p>
          </div>
        </div>

        {/* Signature Section */}
        <div className="grid grid-cols-3 gap-8 mt-12">
          <div className="text-center">
            <div className="border-t-2 border-gray-400 pt-2 mt-16">
              <p className="text-sm font-medium">Customer</p>
              <p className="text-xs text-gray-500 mt-1">Date: ___________</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t-2 border-gray-400 pt-2 mt-16">
              <p className="text-sm font-medium">Finance Department</p>
              <p className="text-xs text-gray-500 mt-1">Date: ___________</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t-2 border-gray-400 pt-2 mt-16">
              <p className="text-sm font-medium">Sales Manager</p>
              <p className="text-xs text-gray-500 mt-1">Date: ___________</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t-2 border-gray-300 text-center text-xs text-gray-600">
          <p className="font-semibold mb-1">NCG HOLDINGS (PVT) LTD</p>
          <p>Sinotruk Authorized Dealer - Sales & Service</p>
          <p className="mt-2">Tel: +94 11 123 4567 | Email: sales@ncgsinotruck.lk | Web: www.ncgsinotruck.lk</p>
        </div>
      </div>
    );
  }
);

SinotruckQuotationPreview.displayName = 'SinotruckQuotationPreview';
