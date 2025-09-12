import React, { forwardRef, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface YutongQuotation {
  id: string;
  quotation_no: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  company_name?: string;
  customer_address?: string;
  bus_model: string;
  bus_model_id?: string;
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

interface BusModelDetails {
  model_name: string;
  capacity: number;
  engine: string;
  manufactured_year: number;
  condition: string;
}

interface QuotationAddOn {
  id: string;
  addon_id: string;
  quantity: number;
  unit_price: number;
  notes?: string;
  yutong_addons?: {
    addon_name: string;
    category: string;
  };
}

interface YutongQuotationPreviewProps {
  quotation: YutongQuotation;
}

export const YutongQuotationPreview = forwardRef<HTMLDivElement, YutongQuotationPreviewProps>(
  ({ quotation }, ref) => {
    const [addOns, setAddOns] = useState<QuotationAddOn[]>([]);
    const [busModelDetails, setBusModelDetails] = useState<BusModelDetails | null>(null);
    const [loading, setLoading] = useState(true);

    // Get bus model details with fallback values
    const getBusModelDetails = () => {
      if (busModelDetails) {
        return {
          model: busModelDetails.model_name || quotation.bus_model,
          seating: busModelDetails.capacity ? `${busModelDetails.capacity}` : '37+1+1',
          engine: busModelDetails.engine || 'YUCHAI-YC6A270-50 (Euro V)',
          year: busModelDetails.manufactured_year?.toString() || '2025',
          condition: busModelDetails.condition || 'BRAND NEW'
        };
      }
      
      // Fallback values when bus model details are not available
      return {
        model: quotation.bus_model || 'ZK6907H',
        seating: '37+1+1',
        engine: 'YUCHAI-YC6A270-50 (Euro V)',
        year: '2025',
        condition: 'BRAND NEW'
      };
    };

    const busDetails = getBusModelDetails();
    const formattedDate = format(new Date(quotation.created_at), 'dd/MM/yyyy');

    // Fetch bus model details and add-ons for this quotation
    useEffect(() => {
      const fetchData = async () => {
        try {
          // Fetch bus model details if bus_model_id is available
          if (quotation.bus_model_id) {
            const { data: busData, error: busError } = await supabase
              .from('yutong_bus_models')
              .select('model_name, capacity, engine, manufactured_year, condition')
              .eq('id', quotation.bus_model_id)
              .maybeSingle();

            if (busError) {
              console.error('Error fetching bus model details:', busError);
            } else if (busData) {
              setBusModelDetails(busData);
            }
          }

          // Fetch add-ons
          const { data: addOnData, error: addOnError } = await supabase
            .from('yutong_quotation_addons')
            .select(`
              *,
              yutong_addons (
                addon_name,
                category
              )
            `)
            .eq('quotation_id', quotation.id);

          if (addOnError) {
            console.error('Error fetching add-ons:', addOnError);
          } else {
            setAddOns(addOnData || []);
          }
        } catch (error) {
          console.error('Error fetching quotation data:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    }, [quotation.id, quotation.bus_model_id]);

    // Calculate totals correctly to avoid double-counting
    const addOnsTotal = addOns.reduce((sum, addon) => sum + (addon.quantity * addon.unit_price), 0);
    
    // Calculate bus subtotal (quantity * unit_price with discount applied)
    const busSubtotalBeforeDiscount = quotation.quantity * quotation.unit_price;
    const discountAmount = quotation.discount_percentage ? 
      (busSubtotalBeforeDiscount * quotation.discount_percentage / 100) : 0;
    const busSubtotal = busSubtotalBeforeDiscount - discountAmount;
    
    // Grand total should be bus subtotal + add-ons (not quotation.total_price which already includes add-ons)
    const grandTotal = busSubtotal + addOnsTotal;

    const pageHeaderFooterStyles = `
      @media print {
        .page {
          page-break-after: always;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          border: none !important;
        }
        .page:last-child {
          page-break-after: avoid;
        }
        .page-header {
          margin-bottom: 20px;
        }
        .page-footer {
          margin-top: auto;
          padding-top: 20px;
        }
        .page-content {
          flex: 1;
        }
      }
      .page {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        background: white;
        border: 2px solid #003366;
        margin-bottom: 20px;
        position: relative;
      }
      .page-header {
        margin-bottom: 20px;
      }
      .page-footer {
        margin-top: auto;
        padding-top: 20px;
      }
      .page-content {
        flex: 1;
        padding: 20px;
      }
      .signatures {
        display: flex;
        justify-content: space-between;
        font-size: 14px;
        margin-top: 40px;
        margin-bottom: 20px;
      }
      .signature-field {
        text-align: center;
        width: 30%;
      }
      .signature-line {
        margin-top: 50px;
        border-top: 1px dotted #000;
        padding-top: 5px;
      }
      .footer-contact {
        background: #003366;
        color: white;
        padding: 10px;
        font-size: 13px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
    `;

    return (
      <div ref={ref} style={{ fontFamily: 'Arial, sans-serif', margin: 0, padding: '20px', background: '#f9f9f9', color: '#000' }}>
        <style dangerouslySetInnerHTML={{ __html: pageHeaderFooterStyles }} />
        
        {/* Page 1 - Main Quotation */}
        <div className="page" style={{ maxWidth: '900px', margin: '0 auto 20px auto' }}>
          <div className="page-content">
            {/* Header */}
            <div className="page-header">
              <img 
                src="/lovable-uploads/3a890245-ca01-4bcf-b6a0-346e06befe92.png"
                alt="Quotation Header - NCG Holdings & Yutong"
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
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
                {/* Main Bus Product */}
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
                    {busSubtotalBeforeDiscount.toLocaleString()}
                  </td>
                </tr>
                
                {/* Show discount breakdown if applicable */}
                {quotation.discount_percentage > 0 ? (
                  <>
                    <tr>
                      <td colSpan={3} style={{ fontWeight: 'bold', textAlign: 'right', padding: '8px', fontSize: '14px', border: '1px solid #003366', color: '#d32f2f' }}>
                        Discount ({quotation.discount_percentage}%)
                      </td>
                      <td style={{ textAlign: 'center', padding: '8px', fontSize: '14px', border: '1px solid #003366', color: '#d32f2f', fontWeight: 'bold' }}>
                        -{discountAmount.toLocaleString()}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={3} style={{ fontWeight: 'bold', textAlign: 'right', padding: '8px', fontSize: '14px', border: '1px solid #003366', background: '#f5f5f5' }}>
                        Net Bus Subtotal
                      </td>
                      <td style={{ textAlign: 'center', padding: '8px', fontSize: '14px', border: '1px solid #003366', background: '#f5f5f5', fontWeight: 'bold' }}>
                        {busSubtotal.toLocaleString()}
                      </td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td colSpan={3} style={{ fontWeight: 'bold', textAlign: 'right', padding: '8px', fontSize: '14px', border: '1px solid #003366', background: '#f5f5f5' }}>
                      Bus Subtotal
                    </td>
                    <td style={{ textAlign: 'center', padding: '8px', fontSize: '14px', border: '1px solid #003366', background: '#f5f5f5', fontWeight: 'bold' }}>
                      {busSubtotal.toLocaleString()}
                    </td>
                  </tr>
                )}

                {/* Add-ons Section */}
                {!loading && addOns.length > 0 && (
                  <>
                    <tr>
                      <td colSpan={4} style={{ padding: '8px', fontSize: '14px', border: '1px solid #003366', background: '#003366', color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
                        ADD-ONS
                      </td>
                    </tr>
                    {addOns.map((addon, index) => (
                      <tr key={index}>
                        <td style={{ padding: '8px', fontSize: '14px', border: '1px solid #003366' }}>
                          <b>ADD-ON:</b> {addon.yutong_addons?.addon_name || 'N/A'}<br/>
                          <b>CATEGORY:</b> {addon.yutong_addons?.category || 'N/A'}
                          {addon.notes && (
                            <>
                              <br/><b>NOTES:</b> {addon.notes}
                            </>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', padding: '8px', fontSize: '14px', border: '1px solid #003366' }}>
                          {addon.unit_price.toLocaleString()}
                        </td>
                        <td style={{ textAlign: 'center', padding: '8px', fontSize: '14px', border: '1px solid #003366' }}>
                          {addon.quantity}
                        </td>
                        <td style={{ textAlign: 'center', padding: '8px', fontSize: '14px', border: '1px solid #003366' }}>
                          {(addon.quantity * addon.unit_price).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    
                    {/* Add-ons Subtotal */}
                    <tr>
                      <td colSpan={3} style={{ fontWeight: 'bold', textAlign: 'right', padding: '8px', fontSize: '14px', border: '1px solid #003366', background: '#f5f5f5' }}>
                        Add-ons Subtotal
                      </td>
                      <td style={{ textAlign: 'center', padding: '8px', fontSize: '14px', border: '1px solid #003366', background: '#f5f5f5', fontWeight: 'bold' }}>
                        {addOnsTotal.toLocaleString()}
                      </td>
                    </tr>
                  </>
                )}

                {/* Grand Total */}
                <tr>
                  <td colSpan={3} style={{ fontWeight: 'bold', textAlign: 'right', padding: '12px 8px', fontSize: '16px', border: '2px solid #003366', background: '#003366', color: 'white' }}>
                    GRAND TOTAL
                  </td>
                  <td style={{ textAlign: 'center', padding: '12px 8px', fontSize: '16px', border: '2px solid #003366', background: '#003366', color: 'white', fontWeight: 'bold' }}>
                    {grandTotal.toLocaleString()}
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
          </div>

          {/* Page 1 Footer with Signatures */}
          <div className="page-footer">
            <div className="signatures">
              <div className="signature-field">
                <div className="signature-line">Customer</div>
              </div>
              <div className="signature-field">
                <div className="signature-line">Sales Manager</div>
              </div>
              <div className="signature-field">
                <div className="signature-line">Date</div>
              </div>
            </div>

            <div className="footer-contact">
              <div style={{ display: 'flex', alignItems: 'center' }}>📞 0770455981</div>
              <div>📍 157 Y, Kebelalowita, Weniwelkola, Polgasowita</div>
              <div style={{ display: 'flex', alignItems: 'center' }}>✉️ yutong@ncg.lk</div>
            </div>
          </div>
        </div>

        {/* Page 2 - Terms & Conditions */}
        <div className="page" style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div className="page-content">
            {/* Header */}
            <div className="page-header">
              <img 
                src="/lovable-uploads/3a890245-ca01-4bcf-b6a0-346e06befe92.png"
                alt="Quotation Header - NCG Holdings & Yutong"
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
              <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '16px', marginTop: '10px', color: '#003366' }}>
                QUOTATION NO: {quotation.quotation_no} - Terms & Conditions
              </div>
            </div>

            {/* Terms & Conditions */}
            <div style={{ fontSize: '13px', lineHeight: '1.5', color: '#003366' }}>
              <h3 style={{ color: '#003366', borderBottom: '2px solid #003366', paddingBottom: '5px', marginBottom: '15px' }}>
                Terms & Conditions
              </h3>
              <p style={{ marginBottom: '12px' }}><b>1. Payment Terms & Delivery</b><br/>
                A non-refundable advance of 10% of the total amount is required to confirm the order. The remaining balance must be paid before delivery, or as agreed.
                Customizations will incur additional costs. Estimated delivery is 90 days, subject to stock and color availability. Delivery may be delayed due to factors beyond the seller's control. The motor coach will not be released until full payment is made.
              </p>
              <p style={{ marginBottom: '12px' }}><b>2. USD Rate Fluctuations</b><br/>
                The quoted price is based on the current USD exchange rate and may change if fluctuations occur. The buyer must agree to any price adjustments. If not accepted, the order will be void, and the advance will be forfeited.
              </p>
              <p style={{ marginBottom: '12px' }}><b>3. Import Regulations & Government Policies</b><br/>
                Any changes in Sri Lanka's import laws or trade restrictions may affect the delivery process. The buyer is responsible for any additional costs arising from these changes. If a ban on imports occurs, the advance is non-refundable.
              </p>
              <p style={{ marginBottom: '12px' }}><b>4. Vehicle Registration</b><br/>
                Registration occurs after full payment or a valid Purchase Order. The buyer is responsible for additional charges like taxes and special plates. Once registered, the vehicle cannot be returned, and no refunds will be issued.
              </p>
              <p style={{ marginBottom: '12px' }}><b>5. Inspection & Acceptance</b><br/>
                The buyer must inspect the vehicle upon delivery. Any defects or discrepancies must be noted at the time of delivery. After acceptance, no claims for damages or missing items will be accepted.
              </p>
              <p style={{ marginBottom: '12px' }}><b>6. Warranty & Maintenance</b><br/>
                The motor coach comes with a manufacturer's warranty. Maintenance outside the warranty is the buyer's responsibility, and the seller will assist with warranty claims but is not liable for the outcome or costs.
              </p>
              <p style={{ marginBottom: '12px' }}><b>7. Risk of Loss</b><br/>
                The risk of loss or damage passes to the buyer upon delivery and acceptance of the vehicle.
              </p>
              <p style={{ marginBottom: '12px' }}><b>8. Indemnity</b><br/>
                The buyer agrees to indemnify the seller against any liability arising from the use or resale of the vehicle after delivery.
              </p>
              <p style={{ marginBottom: '12px' }}><b>9. Additional Clauses</b><br/>
                The seller may use photos of the motor coach for promotional purposes unless otherwise agreed. The buyer may not transfer their rights or obligations under this agreement without the seller's written consent.
              </p>
              <p style={{ marginBottom: '12px' }}><b>10. Liability Indemnity</b><br/>
                The buyer agrees to indemnify and hold the seller harmless against any loss, damage, or legal liability arising out of the buyer's use, ownership, or resale of the motor coach after delivery.
              </p>
              <p style={{ marginBottom: '12px' }}><b>11. Marketing & Assignment Rights</b><br/>
                The seller retains the right to use photographs or descriptions of the motor coach for advertising or promotional purposes unless otherwise agreed in writing by both parties. The buyer may not assign, transfer, or sub-contract their rights or obligations under this agreement without the prior written consent of the seller.
              </p>
            </div>
          </div>

          {/* Page 2 Footer with Signatures */}
          <div className="page-footer">
            <div className="signatures">
              <div className="signature-field">
                <div className="signature-line">Customer</div>
              </div>
              <div className="signature-field">
                <div className="signature-line">Sales Manager</div>
              </div>
              <div className="signature-field">
                <div className="signature-line">Date</div>
              </div>
            </div>

            <div className="footer-contact">
              <div style={{ display: 'flex', alignItems: 'center' }}>📞 0770455981</div>
              <div>📍 157 Y, Kebelalowita, Weniwelkola, Polgasowita</div>
              <div style={{ display: 'flex', alignItems: 'center' }}>✉️ yutong@ncg.lk</div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

YutongQuotationPreview.displayName = 'YutongQuotationPreview';