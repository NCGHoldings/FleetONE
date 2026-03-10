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
      <div ref={ref} className="bg-white page" style={{ width: '210mm', minHeight: '297mm', padding: '0', margin: '0' }}>
        {/* Header */}
        <div className="page-header" style={{ marginBottom: '20px' }}>
          <img 
            src="/lovable-uploads/sinotruck-quotation-header.png"
            alt="Quotation Header - NCG Holdings & Sinotruck"
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
        </div>

        {/* Customer Details & Quotation Info */}
        <div className="px-10 pt-4 pb-2">
          <div className="flex justify-between items-start">
            <div className="space-y-1 text-sm">
              <div className="flex gap-3">
                <span className="font-bold text-gray-800 w-28">CUSTOMER</span>
                <span className="text-gray-700">: {quotation.customer_name}</span>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-gray-800 w-28">ADDRESS</span>
                <span className="text-gray-700">: {quotation.customer_address || 'N/A'}</span>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-gray-800 w-28">CONTACT</span>
                <span className="text-gray-700">: {quotation.customer_phone}</span>
              </div>
              <div className="flex gap-3">
                <span className="font-bold text-gray-800 w-28">DATE</span>
                <span className="text-gray-700">: {formattedDate}</span>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-sm font-bold text-gray-800">QUOTATION NO : {quotation.quotation_no}</p>
            </div>
          </div>
        </div>

        {/* Product Table */}
        <div className="px-10 py-6">
          <table className="w-full border-collapse border-2 border-gray-800">
            <thead>
              <tr style={{ backgroundColor: '#7FA827' }}>
                <th className="border-2 border-gray-800 p-3 text-left text-white font-bold text-base">PRODUCT</th>
                <th className="border-2 border-gray-800 p-3 text-center text-white font-bold text-base w-32">UNIT PRICE</th>
                <th className="border-2 border-gray-800 p-3 text-center text-white font-bold text-base w-20">QTY</th>
                <th className="border-2 border-gray-800 p-3 text-right text-white font-bold text-base w-32">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {/* Truck Model Row */}
              <tr>
                <td className="border-2 border-gray-800 p-0">
                  <table className="w-full">
                    <tbody>
                      <tr>
                        <td className="border-b border-gray-400 p-2 w-40 font-semibold text-sm">TRUCK MODEL</td>
                        <td className="border-b border-gray-400 p-2 text-sm">{quotation.truck_model_name}</td>
                      </tr>
                      <tr>
                        <td className="border-b border-gray-400 p-2 w-40 font-semibold text-sm">CAPACITY</td>
                        <td className="border-b border-gray-400 p-2 text-sm">500 Kw</td>
                      </tr>
                      <tr>
                        <td className="p-2 w-40 font-semibold text-sm">YEAR</td>
                        <td className="p-2 text-sm">2026</td>
                      </tr>
                      <tr>
                        <td className="border-t border-gray-400 p-2 w-40 font-semibold text-sm">CONDITION</td>
                        <td className="border-t border-gray-400 p-2 text-sm">BRAND NEW</td>
                      </tr>
                    </tbody>
                  </table>
                </td>
                <td className="border-2 border-gray-800 p-3 text-center text-sm align-top">{quotation.unit_price.toLocaleString()}</td>
                <td className="border-2 border-gray-800 p-3 text-center text-sm align-top">{quotation.quantity}</td>
                <td className="border-2 border-gray-800 p-3 text-right text-sm align-top">{(quotation.unit_price * quotation.quantity).toLocaleString()}</td>
              </tr>
              
              {/* Charger Row (if applicable) */}
              {quotation.charger_price && quotation.charger_price > 0 && (
                <tr>
                  <td className="border-2 border-gray-800 p-0">
                    <table className="w-full">
                      <tbody>
                        <tr>
                          <td className="p-2 font-semibold text-sm">SINOTRUK Charger</td>
                        </tr>
                        <tr>
                          <td className="p-2 text-sm">400 KW</td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                  <td className="border-2 border-gray-800 p-3 text-center text-sm">{quotation.charger_price.toLocaleString()}</td>
                  <td className="border-2 border-gray-800 p-3 text-center text-sm">{quotation.quantity}</td>
                  <td className="border-2 border-gray-800 p-3 text-right text-sm">{(quotation.charger_price * quotation.quantity).toLocaleString()}</td>
                </tr>
              )}
              
              {/* Total Row */}
              <tr>
                <td colSpan={3} className="border-2 border-gray-800 p-3 text-right font-bold text-base">Total</td>
                <td className="border-2 border-gray-800 p-3 text-right font-bold text-base">{quotation.total_price.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Payment Terms */}
        <div className="px-10 pb-4">
          <p className="text-sm mb-2" style={{ color: '#6B8E23' }}>
            <span className="font-bold">Payment Terms :</span> Payment method - by Cheque or bank transfer
          </p>
          <div className="space-y-0.5 text-sm font-bold" style={{ color: '#6B8E23' }}>
            <p>NCG HOLDINGS (PRIVATE) LIMITED</p>
            <p>ACCOUNT NO - 2000511791</p>
            <p>COMMERCIAL BANK NUGEGODA</p>
          </div>
        </div>

        {/* Terms & Conditions */}
        <div className="px-10 pb-6">
          <div className="space-y-3 text-xs leading-relaxed" style={{ color: '#2C3E1F' }}>
            <div>
              <p className="font-bold mb-1" style={{ color: '#6B8E23' }}>1. Payment Terms & Delivery</p>
              <p>A non-refundable advance of 10% is required to confirm the order. The remaining balance must be paid before delivery, or as agreed. Customizations will incur additional costs. Estimated delivery is 90-120 days, subject to stock and color availability. Delivery may be delayed due to factors beyond the seller's control. The TRUCK will not be released until full payment is made.</p>
            </div>
            
            <div>
              <p className="font-bold mb-1" style={{ color: '#6B8E23' }}>2. USD Rate Fluctuations</p>
              <p>The quoted price is based on the current USD exchange rate and may change if fluctuations occur. The buyer must agree to any price adjustments. If not accepted, the order will be void, and the advance will be forfeited.</p>
            </div>
            
            <div>
              <p className="font-bold mb-1" style={{ color: '#6B8E23' }}>3. Import Regulations & Government Policies</p>
              <p>Any changes in Sri Lanka's import laws or trade restrictions may affect the delivery process. The buyer is responsible for any additional costs arising from these changes. If a ban on imports occurs, the advance is non-refundable.</p>
            </div>
            
            <div>
              <p className="font-bold mb-1" style={{ color: '#6B8E23' }}>4. Vehicle Registration</p>
              <p>Registration occurs after full payment or a valid Purchase Order. The buyer is responsible for additional charges like taxes and special plates. Once registered, the vehicle cannot be returned, and no refunds will be issued.</p>
            </div>
            
            <div>
              <p className="font-bold mb-1" style={{ color: '#6B8E23' }}>5. Inspection & Acceptance</p>
              <p>The buyer must inspect the vehicle upon delivery. Any defects or discrepancies must be noted at the time of delivery. After acceptance, no claims for damages or missing items will be accepted.</p>
            </div>
            
            <div>
              <p className="font-bold mb-1" style={{ color: '#6B8E23' }}>6. Warranty & Maintenance</p>
              <p>The Truck comes with a manufacturer's warranty of 2 years or 100,000km for the Motor and Body. Maintenance outside, The warranty is the buyer's responsibility, and the seller will assist with warranty claims but is not liable for the outcome or costs.</p>
            </div>
            
            <div>
              <p className="font-bold mb-1" style={{ color: '#6B8E23' }}>7. Risk of Loss</p>
              <p>The risk of loss or damage passes to the buyer upon delivery and acceptance of the vehicle.</p>
            </div>
            
            <div>
              <p className="font-bold mb-1" style={{ color: '#6B8E23' }}>8. Indemnity</p>
              <p>The buyer agrees to indemnify the seller against any liability arising from the use or resale of the vehicle after delivery.</p>
            </div>
            
            <div>
              <p className="font-bold mb-1" style={{ color: '#6B8E23' }}>9. Additional Clauses</p>
              <p>The seller may use photos of the truck for promotional purposes unless otherwise agreed. The buyer may not transfer their rights or obligations under this agreement without the seller's written consent.</p>
            </div>
            
            <div>
              <p className="font-bold mb-1" style={{ color: '#6B8E23' }}>10. 10.Indemnity</p>
              <p>The buyer agrees to indemnify and hold the seller harmless against any loss, damage, or legal liability arising out of the buyer's use, ownership, or resale of the Truck after delivery.</p>
            </div>
            
            <div>
              <p className="font-bold mb-1" style={{ color: '#6B8E23' }}>11. Additional Clauses</p>
              <p>The seller retains the right to use photographs or descriptions of the truck for advertising or promotional purposes unless otherwise agreed in writing by both parties. The buyer may not assign, transfer, or sub-contract their rights or obligations under this agreement without the prior written consent of the seller.</p>
            </div>
            
            <div style={{ padding: '8px', border: '2px solid #6B8E23', borderRadius: '4px', background: '#f0f5e6' }}>
              <p className="font-bold mb-1" style={{ color: '#6B8E23' }}>12. Quotation Validity</p>
              <p>This quotation is valid until <b>{formattedValidUntil}</b>. After this period, prices and availability are subject to change.</p>
            </div>
          </div>
        </div>

        {/* Signature Section */}
        <div className="px-10 pb-8">
          <div className="grid grid-cols-4 gap-6 items-end">
            <div className="text-center">
              <div className="border-t-2 border-dotted border-gray-400 pt-2 mt-20">
                <p className="text-sm font-semibold">Customer</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t-2 border-dotted border-gray-400 pt-2 mt-20">
                <p className="text-sm font-semibold">Finance Department</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t-2 border-dotted border-gray-400 pt-2 mt-20">
                <p className="text-sm font-semibold">Sales Manager</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t-2 border-dotted border-gray-400 pt-2 mt-20">
                <p className="text-sm font-semibold">Date</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - pushed to bottom */}
        <div className="px-10 pb-6 mt-auto">
          <div className="border-t-2 border-gray-300 pt-4 text-center">
            <p className="text-sm font-bold text-gray-800">NCG HOLDINGS (PRIVATE) LIMITED</p>
            <p className="text-xs text-gray-600 mt-1">Sinotruk Authorized Dealer - Sales & Service</p>
          </div>
        </div>
      </div>
    );
  }
);

SinotruckQuotationPreview.displayName = 'SinotruckQuotationPreview';
