import React, { forwardRef, useEffect, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useLightVehicleSignatures, LightVehicleSignature } from "@/hooks/useLightVehicleSignatures";

interface LightVehicleQuotation {
  id: string;
  quotation_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_address?: string;
  company_name?: string;
  customer_type?: string;
  business_registration_number?: string;
  tax_registration_number?: string;
  representative_name?: string;
  designation?: string;
  vehicle_name: string;
  brand: string;
  category: string;
  engine_cc?: string;
  transmission?: string;
  fuel_type?: string;
  color?: string;
  quantity: number;
  unit_price: number;
  discount_amount?: number;
  grand_total: number;
  status: string;
  valid_until?: string;
  created_at: string;
  notes?: string;
  payment_terms?: string;
  warranty_terms?: string;
  delivery_timeline?: string;
}

interface QuotationAddOn {
  id: string;
  addon_name: string;
  quantity: number;
  unit_price: number;
  is_free_of_charge?: boolean;
  notes?: string;
}

interface LightVehicleQuotationPreviewProps {
  quotation: LightVehicleQuotation;
}

export const LightVehicleQuotationPreview = forwardRef<HTMLDivElement, LightVehicleQuotationPreviewProps>(
  ({ quotation }, ref) => {
    const [addOns, setAddOns] = useState<QuotationAddOn[]>([]);
    const [loading, setLoading] = useState(true);
    const [signatures, setSignatures] = useState<LightVehicleSignature[]>([]);
    const { fetchSignatures } = useLightVehicleSignatures();

    const formattedDate = format(new Date(quotation.created_at), "dd/MM/yyyy");

    useEffect(() => {
      const fetchData = async () => {
        try {
          // Fetch add-ons
          const { data: addOnData, error: addOnError } = await supabase
            .from("lightvehicle_quotation_addons")
            .select("*")
            .eq("quotation_id", quotation.id);

          if (addOnError) {
            console.error("Error fetching add-ons:", addOnError);
          } else {
            setAddOns(addOnData || []);
          }

          // Fetch signatures
          const sigs = await fetchSignatures(quotation.id);
          setSignatures(sigs);
        } catch (error) {
          console.error("Error fetching quotation data:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    }, [quotation.id]);

    // Calculate totals
    const addOnsTotal = addOns.reduce((sum, addon) => {
      return addon.is_free_of_charge ? sum : sum + addon.quantity * addon.unit_price;
    }, 0);

    const vehicleSubtotalBeforeDiscount = quotation.quantity * quotation.unit_price;
    const discountAmount = quotation.discount_amount || 0;
    const vehicleSubtotal = vehicleSubtotalBeforeDiscount - discountAmount;
    const grandTotal = vehicleSubtotal + addOnsTotal;

    const pageHeaderFooterStyles = `
      @page {
        size: A4 portrait;
        margin: 8mm;
      }
      
      @media print {
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        body {
          margin: 0;
          padding: 0;
        }
        
        .page {
          width: 100% !important;
          max-width: none !important;
          height: 277mm;
          max-height: 277mm;
          min-height: 277mm;
          page-break-after: always;
          page-break-inside: avoid;
          display: flex !important;
          flex-direction: column !important;
          border: none !important;
          margin: 0 !important;
          padding: 5mm !important;
          box-sizing: border-box;
          overflow: hidden;
          background: white !important;
        }
        
        .page:last-child {
          page-break-after: avoid;
        }
        
        .page-header {
          flex-shrink: 0;
          margin-bottom: 8px !important;
        }
        
        .page-header img {
          max-height: 80px !important;
        }
        
        .page-content {
          flex: 1;
          overflow: hidden;
          padding: 0 !important;
        }
        
        .page-footer {
          flex-shrink: 0;
          margin-top: auto !important;
          padding-top: 8px !important;
        }
        
        .signatures {
          margin-top: 15px !important;
          margin-bottom: 10px !important;
          page-break-inside: avoid;
        }
        
        .signature-field {
          min-height: 70px !important;
        }
        
        .signature-content {
          height: 50px !important;
        }
        
        .footer-contact {
          page-break-inside: avoid;
          padding: 6px 10px !important;
          font-size: 11px !important;
        }
        
        table {
          page-break-inside: avoid;
        }
        
        .customer-info p {
          margin: 2px 0 !important;
          font-size: 12px !important;
        }
        
        .payment-details p {
          margin: 2px 0 !important;
          font-size: 12px !important;
        }
        
        .terms-section p {
          margin-bottom: 8px !important;
          font-size: 11px !important;
          line-height: 1.3 !important;
        }
      }
      
      .page {
        width: 210mm;
        min-height: 297mm;
        max-width: 210mm;
        display: flex;
        flex-direction: column;
        background: white;
        border: 2px solid #8B0000;
        margin: 0 auto 20px auto;
        position: relative;
        padding: 15mm;
        box-sizing: border-box;
      }
      .page-header {
        flex-shrink: 0;
        margin-bottom: 15px;
      }
      .page-footer {
        flex-shrink: 0;
        margin-top: auto;
        padding-top: 15px;
      }
      .page-content {
        flex: 1;
        display: flex;
        flex-direction: column;
      }
      .signatures {
        display: flex;
        justify-content: space-between;
        font-size: 14px;
        margin-top: 25px;
        margin-bottom: 15px;
      }
      .signature-field {
        text-align: center;
        width: 30%;
        min-height: 80px;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
      }
      .signature-content {
        height: 55px;
        display: flex;
        align-items: flex-end;
        justify-content: center;
      }
      .signature-line {
        border-top: 1px dotted #000;
        padding-top: 4px;
        margin-top: 8px;
      }
      .footer-contact {
        background: #8B0000;
        color: white;
        padding: 8px;
        font-size: 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
    `;

    return (
      <div
        ref={ref}
        style={{ fontFamily: "Arial, sans-serif", margin: 0, padding: "20px", background: "#f9f9f9", color: "#000" }}
      >
        <style dangerouslySetInnerHTML={{ __html: pageHeaderFooterStyles }} />

        {/* Page 1 - Main Quotation */}
        <div className="page">
          <div className="page-content">
            {/* Header */}
            <div className="page-header">
              <img
                src="/lovable-uploads/lightvehicle-quotation-header.png"
                alt="Prime Auto - Light Vehicle Quotation Header"
                style={{ width: "100%", height: "auto", display: "block" }}
              />
            </div>

            {/* Customer Info */}
            <div className="customer-info" style={{ marginBottom: "12px" }}>
              {quotation.customer_type === "company" ? (
                <>
                  {quotation.representative_name && (
                    <p style={{ margin: "3px 0", fontSize: "13px" }}>
                      <b>CUSTOMER :</b> {quotation.representative_name}
                    </p>
                  )}
                  {quotation.designation && (
                    <p style={{ margin: "3px 0", fontSize: "13px" }}>
                      <b>DESIGNATION :</b> {quotation.designation}
                    </p>
                  )}
                  <p style={{ margin: "3px 0", fontSize: "13px" }}>
                    <b>COMPANY :</b> {quotation.company_name || quotation.customer_name}
                  </p>
                  {quotation.business_registration_number && (
                    <p style={{ margin: "3px 0", fontSize: "13px" }}>
                      <b>BUSINESS REG NO :</b> {quotation.business_registration_number}
                    </p>
                  )}
                  {quotation.tax_registration_number && (
                    <p style={{ margin: "3px 0", fontSize: "13px" }}>
                      <b>TAX REG NO :</b> {quotation.tax_registration_number}
                    </p>
                  )}
                  <p style={{ margin: "3px 0", fontSize: "13px" }}>
                    <b>ADDRESS :</b> {quotation.customer_address || ""}
                  </p>
                </>
              ) : (
                <>
                  <p style={{ margin: "3px 0", fontSize: "13px" }}>
                    <b>CUSTOMER :</b> {quotation.customer_name}
                  </p>
                  <p style={{ margin: "3px 0", fontSize: "13px" }}>
                    <b>ADDRESS :</b> {quotation.customer_address || ""}
                  </p>
                </>
              )}
              <p style={{ margin: "3px 0", fontSize: "13px" }}>
                <b>CONTACT :</b> {quotation.customer_phone}
                {quotation.customer_email ? ` / ${quotation.customer_email}` : ""}
              </p>
              <p style={{ margin: "3px 0", fontSize: "13px" }}>
                <b>DATE :</b> {formattedDate}
              </p>
            </div>

            {/* Quotation No */}
            <div style={{ textAlign: "right", fontWeight: "bold", marginBottom: "10px" }}>
              QUOTATION NO : {quotation.quotation_number}
            </div>

            {/* Quotation Table */}
            <table
              style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px", border: "1px solid #8B0000" }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      background: "#8B0000",
                      color: "white",
                      padding: "8px",
                      textAlign: "center",
                      border: "1px solid #8B0000",
                    }}
                  >
                    PRODUCT
                  </th>
                  <th
                    style={{
                      background: "#8B0000",
                      color: "white",
                      padding: "8px",
                      textAlign: "center",
                      border: "1px solid #8B0000",
                    }}
                  >
                    UNIT PRICE (LKR)
                  </th>
                  <th
                    style={{
                      background: "#8B0000",
                      color: "white",
                      padding: "8px",
                      textAlign: "center",
                      border: "1px solid #8B0000",
                    }}
                  >
                    QTY
                  </th>
                  <th
                    style={{
                      background: "#8B0000",
                      color: "white",
                      padding: "8px",
                      textAlign: "center",
                      border: "1px solid #8B0000",
                    }}
                  >
                    TOTAL (LKR)
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Main Vehicle Product */}
                <tr>
                  <td style={{ padding: "8px", fontSize: "14px", border: "1px solid #8B0000" }}>
                    <b>VEHICLE:</b> {quotation.brand} - {quotation.vehicle_name}
                    <br />
                    <b>CATEGORY:</b> {quotation.category}
                    {quotation.engine_cc && (
                      <>
                        <br />
                        <b>ENGINE:</b> {quotation.engine_cc} CC
                      </>
                    )}
                    {quotation.transmission && (
                      <>
                        <br />
                        <b>TRANSMISSION:</b> {quotation.transmission}
                      </>
                    )}
                    {quotation.fuel_type && (
                      <>
                        <br />
                        <b>FUEL TYPE:</b> {quotation.fuel_type}
                      </>
                    )}
                    {quotation.color && (
                      <>
                        <br />
                        <b>COLOR:</b> {quotation.color}
                      </>
                    )}
                  </td>
                  <td style={{ textAlign: "center", padding: "8px", fontSize: "14px", border: "1px solid #8B0000" }}>
                    {quotation.unit_price.toLocaleString()}
                  </td>
                  <td style={{ textAlign: "center", padding: "8px", fontSize: "14px", border: "1px solid #8B0000" }}>
                    {quotation.quantity}
                  </td>
                  <td style={{ textAlign: "center", padding: "8px", fontSize: "14px", border: "1px solid #8B0000" }}>
                    {vehicleSubtotalBeforeDiscount.toLocaleString()}
                  </td>
                </tr>

                {/* Show discount breakdown if applicable */}
                {discountAmount > 0 ? (
                  <>
                    <tr>
                      <td
                        colSpan={3}
                        style={{
                          fontWeight: "bold",
                          textAlign: "right",
                          padding: "8px",
                          fontSize: "14px",
                          border: "1px solid #8B0000",
                          color: "#d32f2f",
                        }}
                      >
                        Discount
                      </td>
                      <td
                        style={{
                          textAlign: "center",
                          padding: "8px",
                          fontSize: "14px",
                          border: "1px solid #8B0000",
                          color: "#d32f2f",
                          fontWeight: "bold",
                        }}
                      >
                        -{discountAmount.toLocaleString()}
                      </td>
                    </tr>
                    <tr>
                      <td
                        colSpan={3}
                        style={{
                          fontWeight: "bold",
                          textAlign: "right",
                          padding: "8px",
                          fontSize: "14px",
                          border: "1px solid #8B0000",
                          background: "#f5f5f5",
                        }}
                      >
                        Net Vehicle Subtotal
                      </td>
                      <td
                        style={{
                          textAlign: "center",
                          padding: "8px",
                          fontSize: "14px",
                          border: "1px solid #8B0000",
                          background: "#f5f5f5",
                          fontWeight: "bold",
                        }}
                      >
                        {vehicleSubtotal.toLocaleString()}
                      </td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td
                      colSpan={3}
                      style={{
                        fontWeight: "bold",
                        textAlign: "right",
                        padding: "8px",
                        fontSize: "14px",
                        border: "1px solid #8B0000",
                        background: "#f5f5f5",
                      }}
                    >
                      Vehicle Subtotal
                    </td>
                    <td
                      style={{
                        textAlign: "center",
                        padding: "8px",
                        fontSize: "14px",
                        border: "1px solid #8B0000",
                        background: "#f5f5f5",
                        fontWeight: "bold",
                      }}
                    >
                      {vehicleSubtotal.toLocaleString()}
                    </td>
                  </tr>
                )}

                {/* Add-ons Section */}
                {!loading && addOns.length > 0 && (
                  <>
                    <tr>
                      <td
                        colSpan={4}
                        style={{
                          padding: "8px",
                          fontSize: "14px",
                          border: "1px solid #8B0000",
                          background: "#8B0000",
                          color: "white",
                          textAlign: "center",
                          fontWeight: "bold",
                        }}
                      >
                        ADD-ONS
                      </td>
                    </tr>
                    {addOns.map((addon, index) => (
                      <tr key={index}>
                        <td style={{ padding: "8px", fontSize: "14px", border: "1px solid #8B0000" }}>
                          <b>ADD-ON:</b> {addon.addon_name}
                          {addon.is_free_of_charge && (
                            <span style={{ marginLeft: "8px", color: "#22c55e", fontWeight: "bold" }}>
                              [FREE OF CHARGE]
                            </span>
                          )}
                          {addon.notes && (
                            <>
                              <br />
                              <b>NOTES:</b> {addon.notes}
                            </>
                          )}
                        </td>
                        <td
                          style={{ textAlign: "center", padding: "8px", fontSize: "14px", border: "1px solid #8B0000" }}
                        >
                          {addon.is_free_of_charge ? "FREE" : addon.unit_price.toLocaleString()}
                        </td>
                        <td
                          style={{ textAlign: "center", padding: "8px", fontSize: "14px", border: "1px solid #8B0000" }}
                        >
                          {addon.quantity}
                        </td>
                        <td
                          style={{ textAlign: "center", padding: "8px", fontSize: "14px", border: "1px solid #8B0000" }}
                        >
                          {addon.is_free_of_charge ? "FREE" : (addon.quantity * addon.unit_price).toLocaleString()}
                        </td>
                      </tr>
                    ))}

                    {/* Add-ons Subtotal */}
                    <tr>
                      <td
                        colSpan={3}
                        style={{
                          fontWeight: "bold",
                          textAlign: "right",
                          padding: "8px",
                          fontSize: "14px",
                          border: "1px solid #8B0000",
                          background: "#f5f5f5",
                        }}
                      >
                        Add-ons Subtotal
                      </td>
                      <td
                        style={{
                          textAlign: "center",
                          padding: "8px",
                          fontSize: "14px",
                          border: "1px solid #8B0000",
                          background: "#f5f5f5",
                          fontWeight: "bold",
                        }}
                      >
                        {addOnsTotal.toLocaleString()}
                      </td>
                    </tr>
                  </>
                )}

                {/* Grand Total */}
                <tr>
                  <td
                    colSpan={3}
                    style={{
                      fontWeight: "bold",
                      textAlign: "right",
                      padding: "12px 8px",
                      fontSize: "16px",
                      border: "2px solid #8B0000",
                      background: "#8B0000",
                      color: "white",
                    }}
                  >
                    GRAND TOTAL
                  </td>
                  <td
                    style={{
                      textAlign: "center",
                      padding: "12px 8px",
                      fontSize: "16px",
                      border: "2px solid #8B0000",
                      background: "#8B0000",
                      color: "white",
                      fontWeight: "bold",
                    }}
                  >
                    LKR {grandTotal.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Payment Details */}
            <div className="payment-details" style={{ fontSize: "12px", marginTop: "8px" }}>
              <p style={{ margin: "2px 0" }}>
                <b>Payment Terms :</b> {quotation.payment_terms || "Payment method – by Cheque or bank transfer"}
              </p>
              <p style={{ margin: "2px 0" }}>
                <b>Account Name :</b> PRIME AUTO (PVT) LTD | <b>Account Number :</b> 008310009371
              </p>
              <p style={{ margin: "2px 0" }}>
                <b>Bank :</b> Sampath Bank PLC | <b>Branch :</b> Nugegoda | <b>Swift :</b> BABORKLX
              </p>
            </div>

            {/* Notes */}
            {quotation.notes && (
              <div style={{ fontSize: "12px", marginTop: "12px", padding: "10px", border: "1px solid #8B0000", borderRadius: "6px", background: "#f8f9fa" }}>
                <p style={{ margin: "0" }}>
                  <b>Notes:</b> {quotation.notes}
                </p>
              </div>
            )}
          </div>

          {/* Page 1 Footer with Signatures */}
          <div className="page-footer">
            <div className="signatures">
              {["sales_manager", "approved_by", "customer"].map((role) => {
                const sig = signatures.find((s) => s.signature_role === role);
                const roleLabel =
                  role === "sales_manager" ? "Sales Manager" : role === "approved_by" ? "Approved By" : "Customer";

                return (
                  <div key={role} className="signature-field">
                    <div className="signature-content">
                      {sig ? (
                        sig.signature_type === "drawing" || sig.signature_type === "image" ? (
                          <img
                            src={sig.signature_data}
                            alt={`${sig.signer_name} signature`}
                            style={{ maxHeight: "60px", maxWidth: "100%" }}
                          />
                        ) : (
                          <div style={{ fontFamily: "cursive", fontSize: "18px" }}>{sig.signature_data}</div>
                        )
                      ) : null}
                    </div>
                    <div className="signature-line">
                      {sig ? (
                        <>
                          {sig.signer_name}
                          <br />
                          <small>{format(new Date(sig.signed_at), "dd/MM/yyyy")}</small>
                        </>
                      ) : (
                        roleLabel
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="footer-contact">
              <div style={{ display: "flex", alignItems: "center" }}>📞 +94 77 123 4567</div>
              <div>📍 157 Y, Kebelalowita, Weniwelkola, Polgasowita</div>
              <div style={{ display: "flex", alignItems: "center" }}>✉️ info@primeauto.lk</div>
            </div>
          </div>
        </div>

        {/* Page 2 - Terms & Conditions */}
        <div className="page">
          <div className="page-content">
            {/* Header */}
            <div className="page-header">
              <img
                src="/lovable-uploads/lightvehicle-quotation-header.png"
                alt="Prime Auto - Light Vehicle Quotation Header"
                style={{ width: "100%", height: "auto", display: "block" }}
              />
              <div
                style={{ textAlign: "center", fontWeight: "bold", fontSize: "16px", marginTop: "10px", color: "#8B0000" }}
              >
                QUOTATION NO: {quotation.quotation_number} - Terms & Conditions
              </div>
            </div>

            {/* Terms & Conditions */}
            <div className="terms-section" style={{ fontSize: "11px", lineHeight: "1.35", color: "#333" }}>
              <h3
                style={{
                  color: "#8B0000",
                  borderBottom: "2px solid #8B0000",
                  paddingBottom: "4px",
                  marginBottom: "10px",
                  fontSize: "14px",
                }}
              >
                Terms & Conditions
              </h3>

              <p style={{ marginBottom: "6px" }}>
                <b>1. Payment & Order Confirmation:</b> A non-refundable advance payment of 10% of the total value is required to confirm the order. The balance payment must be settled prior to delivery, unless otherwise agreed in writing. The vehicle will not be released until full payment is received.
              </p>

              <p style={{ marginBottom: "6px" }}>
                <b>2. Delivery Timeline:</b> Estimated delivery is subject to stock availability, production schedules, and regulatory approvals. Delivery delays beyond the seller's control shall not be the seller's liability.
              </p>

              <p style={{ marginBottom: "6px" }}>
                <b>3. Price Validity:</b> This quotation is valid for 14 days from the date of issue. Prices are subject to change without prior notice after the validity period.
              </p>

              <p style={{ marginBottom: "6px" }}>
                <b>4. Currency Fluctuation:</b> Prices are based on the prevailing exchange rate at the time of quotation. Any exchange rate fluctuation may result in a price adjustment.
              </p>

              <p style={{ marginBottom: "6px" }}>
                <b>5. Vehicle Registration & Statutory Costs:</b> Vehicle registration will commence only after full payment. All related costs including taxes, number plates, revenue licence, and insurance are the buyer's responsibility.
              </p>

              <p style={{ marginBottom: "6px" }}>
                <b>6. Inspection & Acceptance:</b> The buyer must inspect the vehicle at delivery. Any defects or discrepancies must be reported immediately. Once accepted, no claims for damages or missing items will be entertained.
              </p>

              <p style={{ marginBottom: "6px" }}>
                <b>7. Warranty Terms:</b> {quotation.warranty_terms || "The vehicle is covered under the manufacturer's warranty, subject to their terms and conditions. Warranty claims must be made through authorized service centers."}
              </p>

              <p style={{ marginBottom: "6px" }}>
                <b>8. Risk Transfer:</b> Risk in the vehicle passes to the buyer upon delivery. The seller is not liable for any loss or damage after delivery.
              </p>

              <p style={{ marginBottom: "6px" }}>
                <b>9. Cancellation Policy:</b> If the buyer cancels the order after confirmation, the advance payment shall be forfeited. The seller reserves the right to cancel the order if terms are not met.
              </p>

              <p style={{ marginBottom: "6px" }}>
                <b>10. Dispute Resolution:</b> Any disputes arising from this quotation shall be governed by the laws of Sri Lanka and subject to the jurisdiction of Sri Lankan courts.
              </p>

              <p style={{ marginBottom: "6px" }}>
                <b>11. Documentation:</b> The buyer is responsible for providing all necessary documentation required for vehicle registration and financing (if applicable).
              </p>

              <p style={{ marginBottom: "6px" }}>
                <b>12. After-Sales Service:</b> Prime Auto provides after-sales support through our authorized service network. Regular servicing as per manufacturer guidelines is recommended to maintain warranty coverage.
              </p>
            </div>

            {/* Acceptance Section */}
            <div style={{ marginTop: "20px", padding: "15px", border: "2px solid #8B0000", borderRadius: "8px", background: "#f8f9fa" }}>
              <p style={{ fontSize: "12px", marginBottom: "10px" }}>
                <b>CUSTOMER ACCEPTANCE:</b> By signing below, I confirm that I have read, understood, and agree to the terms and conditions stated above.
              </p>
            </div>
          </div>

          {/* Page 2 Footer with Signatures */}
          <div className="page-footer">
            <div className="signatures">
              {["sales_manager", "approved_by", "customer"].map((role) => {
                const sig = signatures.find((s) => s.signature_role === role);
                const roleLabel =
                  role === "sales_manager" ? "Sales Manager" : role === "approved_by" ? "Approved By" : "Customer";

                return (
                  <div key={role} className="signature-field">
                    <div className="signature-content">
                      {sig ? (
                        sig.signature_type === "drawing" || sig.signature_type === "image" ? (
                          <img
                            src={sig.signature_data}
                            alt={`${sig.signer_name} signature`}
                            style={{ maxHeight: "60px", maxWidth: "100%" }}
                          />
                        ) : (
                          <div style={{ fontFamily: "cursive", fontSize: "18px" }}>{sig.signature_data}</div>
                        )
                      ) : null}
                    </div>
                    <div className="signature-line">
                      {sig ? (
                        <>
                          {sig.signer_name}
                          <br />
                          <small>{format(new Date(sig.signed_at), "dd/MM/yyyy")}</small>
                        </>
                      ) : (
                        roleLabel
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="footer-contact">
              <div style={{ display: "flex", alignItems: "center" }}>📞 +94 77 123 4567</div>
              <div>📍 157 Y, Kebelalowita, Weniwelkola, Polgasowita</div>
              <div style={{ display: "flex", alignItems: "center" }}>✉️ info@primeauto.lk</div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

LightVehicleQuotationPreview.displayName = "LightVehicleQuotationPreview";
