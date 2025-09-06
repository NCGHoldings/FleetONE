import React, { forwardRef } from 'react';
import { format } from 'date-fns';

interface YutongQuotation {
  id: string;
  quotation_no: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  company_name?: string;
  customer_address?: string;
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

interface YutongQuotationPreviewProps {
  quotation: YutongQuotation;
}

export const YutongQuotationPreview = forwardRef<HTMLDivElement, YutongQuotationPreviewProps>(
  ({ quotation }, ref) => {
    // Parse bus model details - you might need to adjust this based on your data structure
    const getBusModelDetails = (model: string) => {
      // Default values - these could be fetched from a bus models table
      return {
        model: model || 'ZK6907H',
        seating: '37+1+1',
        engine: 'YUCHAI-YC6A270-50 (Euro V)',
        year: '2025',
        condition: 'BRAND NEW'
      };
    };

    const busDetails = getBusModelDetails(quotation.bus_model);
    const formattedDate = format(new Date(quotation.created_at), 'dd/MM/yyyy');

    return (
      <div ref={ref} style={{ fontFamily: 'Arial, sans-serif', margin: 0, padding: '20px', background: '#f9f9f9', color: '#000' }}>
        <div style={{ background: '#fff', padding: '20px', border: '2px solid #003366', maxWidth: '900px', margin: 'auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #003366', paddingBottom: '10px', marginBottom: '20px' }}>
            <h1 style={{ color: '#003366', margin: 0, fontSize: '28px' }}>QUOTATION</h1>
            <div>
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Yutong_Logo.png/425px-Yutong_Logo.png"
                alt="Yutong Logo"
                style={{ height: '60px', width: 'auto' }}
              />
            </div>
          </div>

          {/* Customer Info */}
          <div style={{ marginBottom: '20px' }}>
            <p style={{ margin: '4px 0', fontSize: '14px' }}><b>CUSTOMER :</b> {quotation.customer_name}</p>
            <p style={{ margin: '4px 0', fontSize: '14px' }}><b>COMPANY :</b> {quotation.company_name || ''}</p>
            <p style={{ margin: '4px 0', fontSize: '14px' }}><b>ADDRESS :</b> {quotation.customer_address || ''}</p>
            <p style={{ margin: '4px 0', fontSize: '14px' }}><b>CONTACT :</b> {quotation.customer_phone} / {quotation.customer_email}</p>
            <p style={{ margin: '4px 0', fontSize: '14px' }}><b>DATE :</b> {formattedDate}</p>
          </div>

          {/* Quotation No */}
          <div style={{ textAlign: 'right', fontWeight: 'bold', marginBottom: '10px' }}>
            QUOTATION NO : {quotation.quotation_no}
          </div>

          {/* Quotation Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px', border: '1px solid #003366' }}>
            <thead>
              <tr>
                <th style={{ background: '#003366', color: 'white', padding: '8px', textAlign: 'center', border: '1px solid #003366' }}>PRODUCT</th>
                <th style={{ background: '#003366', color: 'white', padding: '8px', textAlign: 'center', border: '1px solid #003366' }}>UNIT PRICE</th>
                <th style={{ background: '#003366', color: 'white', padding: '8px', textAlign: 'center', border: '1px solid #003366' }}>QTY</th>
                <th style={{ background: '#003366', color: 'white', padding: '8px', textAlign: 'center', border: '1px solid #003366' }}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: '8px', fontSize: '14px', border: '1px solid #003366' }}>
                  <b>BUS MODEL:</b> YUTONG - {busDetails.model}<br/>
                  <b>SEATING CAPACITY:</b> {busDetails.seating}<br/>
                  <b>ENGINE:</b> {busDetails.engine}<br/>
                  <b>YEAR:</b> {busDetails.year}<br/>
                  <b>CONDITION:</b> {busDetails.condition}
                  {quotation.special_features && (
                    <>
                      <br/><b>SPECIAL FEATURES:</b> {quotation.special_features}
                    </>
                  )}
                </td>
                <td style={{ textAlign: 'center', padding: '8px', fontSize: '14px', border: '1px solid #003366' }}>
                  {quotation.unit_price.toLocaleString()}
                </td>
                <td style={{ textAlign: 'center', padding: '8px', fontSize: '14px', border: '1px solid #003366' }}>
                  {quotation.quantity}
                </td>
                <td style={{ textAlign: 'center', padding: '8px', fontSize: '14px', border: '1px solid #003366' }}>
                  {quotation.total_price.toLocaleString()}
                </td>
              </tr>
              <tr>
                <td colSpan={3} style={{ fontWeight: 'bold', textAlign: 'right', padding: '8px', fontSize: '14px', border: '1px solid #003366' }}>
                  Total
                </td>
                <td style={{ textAlign: 'center', padding: '8px', fontSize: '14px', border: '1px solid #003366' }}>
                  {quotation.total_price.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Payment Details */}
          <div style={{ fontSize: '14px', marginTop: '10px' }}>
            <p style={{ margin: '3px 0' }}><b>Payment Terms :</b> {quotation.payment_terms || 'Payment method – by Cheque or bank transfer'}</p>
            <p style={{ margin: '3px 0' }}><b>Account Name :</b> NCG HOLDINGS (PRIVATE) LIMITED</p>
            <p style={{ margin: '3px 0' }}><b>Account Number :</b> 2000511791</p>
            <p style={{ margin: '3px 0' }}><b>Bank Name :</b> Commercial Bank of Ceylon PLC</p>
            <p style={{ margin: '3px 0' }}><b>Bank Code :</b> 7056</p>
            <p style={{ margin: '3px 0' }}><b>Branch :</b> Nugegoda Branch</p>
            <p style={{ margin: '3px 0' }}><b>Branch Code :</b> 020</p>
            <p style={{ margin: '3px 0' }}><b>Swift Code :</b> CCEYLKLX</p>
          </div>

          {/* Terms & Conditions */}
          <div style={{ marginTop: '30px', fontSize: '13px', lineHeight: '1.5', color: '#003366' }}>
            <h3 style={{ color: '#003366', borderBottom: '2px solid #003366', paddingBottom: '5px', marginBottom: '10px' }}>
              Terms & Conditions
            </h3>
            <p><b>1. Payment Terms & Delivery</b><br/>
              A non-refundable advance of 10% of the total amount is required to confirm the order. The remaining balance must be paid before delivery, or as agreed.
              Customizations will incur additional costs. Estimated delivery is 90 days, subject to stock and color availability. Delivery may be delayed due to factors beyond the seller's control. The motor coach will not be released until full payment is made.
            </p>
            <p><b>2. USD Rate Fluctuations</b><br/>
              The quoted price is based on the current USD exchange rate and may change if fluctuations occur. The buyer must agree to any price adjustments. If not accepted, the order will be void, and the advance will be forfeited.
            </p>
            <p><b>3. Import Regulations & Government Policies</b><br/>
              Any changes in Sri Lanka's import laws or trade restrictions may affect the delivery process. The buyer is responsible for any additional costs arising from these changes. If a ban on imports occurs, the advance is non-refundable.
            </p>
            <p><b>4. Vehicle Registration</b><br/>
              Registration occurs after full payment or a valid Purchase Order. The buyer is responsible for additional charges like taxes and special plates. Once registered, the vehicle cannot be returned, and no refunds will be issued.
            </p>
            <p><b>5. Inspection & Acceptance</b><br/>
              The buyer must inspect the vehicle upon delivery. Any defects or discrepancies must be noted at the time of delivery. After acceptance, no claims for damages or missing items will be accepted.
            </p>
            <p><b>6. Warranty & Maintenance</b><br/>
              The motor coach comes with a manufacturer's warranty. Maintenance outside the warranty is the buyer's responsibility, and the seller will assist with warranty claims but is not liable for the outcome or costs.
            </p>
            <p><b>7. Risk of Loss</b><br/>
              The risk of loss or damage passes to the buyer upon delivery and acceptance of the vehicle.
            </p>
            <p><b>8. Indemnity</b><br/>
              The buyer agrees to indemnify the seller against any liability arising from the use or resale of the vehicle after delivery.
            </p>
            <p><b>9. Additional Clauses</b><br/>
              The seller may use photos of the motor coach for promotional purposes unless otherwise agreed. The buyer may not transfer their rights or obligations under this agreement without the seller's written consent.
            </p>
            <p><b>10. Indemnity</b><br/>
              The buyer agrees to indemnify and hold the seller harmless against any loss, damage, or legal liability arising out of the buyer's use, ownership, or resale of the motor coach after delivery.
            </p>
            <p><b>11. Additional Clauses</b><br/>
              The seller retains the right to use photographs or descriptions of the motor coach for advertising or promotional purposes unless otherwise agreed in writing by both parties. The buyer may not assign, transfer, or sub-contract their rights or obligations under this agreement without the prior written consent of the seller.
            </p>
          </div>

          {/* Signatures */}
          <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
            <div style={{ textAlign: 'center', width: '30%' }}>
              <p style={{ marginTop: '50px', borderTop: '1px dotted #000', paddingTop: '5px' }}>Customer</p>
            </div>
            <div style={{ textAlign: 'center', width: '30%' }}>
              <p style={{ marginTop: '50px', borderTop: '1px dotted #000', paddingTop: '5px' }}>Sales Manager</p>
            </div>
            <div style={{ textAlign: 'center', width: '30%' }}>
              <p style={{ marginTop: '50px', borderTop: '1px dotted #000', paddingTop: '5px' }}>Date</p>
            </div>
          </div>

          {/* Footer */}
          <div style={{ 
            background: '#003366', 
            color: 'white', 
            padding: '10px', 
            fontSize: '13px', 
            marginTop: '30px', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>📞 0770455981</div>
            <div>📍 157 Y, Kebelalowita, Weniwelkola, Polgasowita</div>
            <div style={{ display: 'flex', alignItems: 'center' }}>✉️ yutong@ncg.lk</div>
          </div>
        </div>
      </div>
    );
  }
);

YutongQuotationPreview.displayName = 'YutongQuotationPreview';