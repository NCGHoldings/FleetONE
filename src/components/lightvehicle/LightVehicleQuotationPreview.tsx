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
  responsible_person_id?: string;
}

interface ResponsiblePerson {
  id: string;
  person_name: string;
  phone?: string;
  email?: string;
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
    const [responsiblePerson, setResponsiblePerson] = useState<ResponsiblePerson | null>(null);
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

          // Fetch responsible person if ID exists
          if (quotation.responsible_person_id) {
            const { data: personData } = await supabase
              .from("lightvehicle_responsible_persons")
              .select("id, person_name, phone, email")
              .eq("id", quotation.responsible_person_id)
              .single();
            if (personData) {
              setResponsiblePerson(personData);
            }
          } else {
            // Get default responsible person
            const { data: defaultPerson } = await supabase
              .from("lightvehicle_responsible_persons")
              .select("id, person_name, phone, email")
              .eq("is_default", true)
              .eq("is_active", true)
              .single();
            if (defaultPerson) {
              setResponsiblePerson(defaultPerson);
            }
          }
        } catch (error) {
          console.error("Error fetching quotation data:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    }, [quotation.id, quotation.responsible_person_id]);

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
        border: 2px solid #1e40af;
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
        background: #1e40af;
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
                alt="NCG Holdings - Light Vehicle Quotation Header"
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
                    <b>ADDRESS :</b> {quotation.customer_address || "N/A"}
                  </p>
                </>
              ) : (
                <>
                  <p style={{ margin: "3px 0", fontSize: "13px" }}>
                    <b>CUSTOMER :</b> {quotation.customer_name}
                  </p>
                  <p style={{ margin: "3px 0", fontSize: "13px" }}>
                    <b>ADDRESS :</b> {quotation.customer_address || "N/A"}
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
              style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px", border: "1px solid #3b82f6" }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      background: "#1e40af",
                      color: "white",
                      padding: "8px",
                      textAlign: "center",
                      border: "1px solid #3b82f6",
                    }}
                  >
                    PRODUCT
                  </th>
                  <th
                    style={{
                      background: "#1e40af",
                      color: "white",
                      padding: "8px",
                      textAlign: "center",
                      border: "1px solid #3b82f6",
                    }}
                  >
                    UNIT PRICE (LKR)
                  </th>
                  <th
                    style={{
                      background: "#1e40af",
                      color: "white",
                      padding: "8px",
                      textAlign: "center",
                      border: "1px solid #3b82f6",
                    }}
                  >
                    QTY
                  </th>
                  <th
                    style={{
                      background: "#1e40af",
                      color: "white",
                      padding: "8px",
                      textAlign: "center",
                      border: "1px solid #3b82f6",
                    }}
                  >
                    TOTAL (LKR)
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Main Vehicle Product */}
                <tr>
                  <td style={{ padding: "8px", fontSize: "14px", border: "1px solid #3b82f6" }}>
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
                  <td style={{ textAlign: "center", padding: "8px", fontSize: "14px", border: "1px solid #3b82f6" }}>
                    {quotation.unit_price.toLocaleString()}
                  </td>
                  <td style={{ textAlign: "center", padding: "8px", fontSize: "14px", border: "1px solid #3b82f6" }}>
                    {quotation.quantity}
                  </td>
                  <td style={{ textAlign: "center", padding: "8px", fontSize: "14px", border: "1px solid #3b82f6" }}>
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
                          border: "1px solid #3b82f6",
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
                          border: "1px solid #3b82f6",
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
                          border: "1px solid #3b82f6",
                          background: "#dbeafe",
                        }}
                      >
                        Net Vehicle Subtotal
                      </td>
                      <td
                        style={{
                          textAlign: "center",
                          padding: "8px",
                          fontSize: "14px",
                          border: "1px solid #3b82f6",
                          background: "#dbeafe",
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
                        border: "1px solid #3b82f6",
                        background: "#dbeafe",
                      }}
                    >
                      Vehicle Subtotal
                    </td>
                    <td
                      style={{
                        textAlign: "center",
                        padding: "8px",
                        fontSize: "14px",
                        border: "1px solid #3b82f6",
                        background: "#dbeafe",
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
                          border: "1px solid #3b82f6",
                          background: "#1e40af",
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
                        <td style={{ padding: "8px", fontSize: "14px", border: "1px solid #3b82f6" }}>
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
                          style={{ textAlign: "center", padding: "8px", fontSize: "14px", border: "1px solid #3b82f6" }}
                        >
                          {addon.is_free_of_charge ? "FREE" : addon.unit_price.toLocaleString()}
                        </td>
                        <td
                          style={{ textAlign: "center", padding: "8px", fontSize: "14px", border: "1px solid #3b82f6" }}
                        >
                          {addon.quantity}
                        </td>
                        <td
                          style={{ textAlign: "center", padding: "8px", fontSize: "14px", border: "1px solid #3b82f6" }}
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
                          border: "1px solid #3b82f6",
                          background: "#dbeafe",
                        }}
                      >
                        Add-ons Subtotal
                      </td>
                      <td
                        style={{
                          textAlign: "center",
                          padding: "8px",
                          fontSize: "14px",
                          border: "1px solid #3b82f6",
                          background: "#dbeafe",
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
                      border: "2px solid #1e40af",
                      background: "#1e40af",
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
                      border: "2px solid #1e40af",
                      background: "#1e40af",
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
                <b>Payment Terms :</b> Payment method - by Cheque or bank transfer
              </p>
              <p style={{ margin: "2px 0" }}>
                <b>NCG HOLDINGS (PRIVATE) LIMITED</b>
              </p>
              <p style={{ margin: "2px 0" }}>
                <b>Account No :</b> 2000511791 | <b>Bank :</b> Commercial Bank Nugegoda
              </p>
            </div>

            {/* Notes */}
            {quotation.notes && (
              <div style={{ fontSize: "12px", marginTop: "12px", padding: "10px", border: "1px solid #3b82f6", borderRadius: "6px", background: "#f8f9fa" }}>
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
              <div style={{ display: "flex", alignItems: "center" }}>📞 {responsiblePerson?.phone || "+94 77 123 4567"}</div>
              <div>📍 157 Y, Kebelalowita, Weniwelkola, Polgasowita</div>
              <div style={{ display: "flex", alignItems: "center" }}>✉️ {responsiblePerson?.email || "info@ncgholdings.lk"}</div>
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
                alt="NCG Holdings - Light Vehicle Quotation Header"
                style={{ width: "100%", height: "auto", display: "block" }}
              />
              <div
                style={{ textAlign: "center", fontWeight: "bold", fontSize: "16px", marginTop: "10px", color: "#1e40af" }}
              >
                QUOTATION NO: {quotation.quotation_number} - Terms & Conditions
              </div>
            </div>

            {/* Terms & Conditions */}
            <div className="terms-section" style={{ fontSize: "11px", lineHeight: "1.35", color: "#333" }}>
              <h3
                style={{
                  color: "#1e40af",
                  borderBottom: "2px solid #1e40af",
                  paddingBottom: "4px",
                  marginBottom: "10px",
                  fontSize: "14px",
                }}
              >
                Terms & Conditions
              </h3>

              <p style={{ marginBottom: "6px" }}>
                <b>1. Payment Terms & Delivery:</b> A non-refundable advance of 10% is required to confirm the order. The remaining balance must be paid before delivery, or as agreed. Customizations will incur additional costs. Estimated delivery is 45-120 days, subject to stock and color availability. Delivery may be delayed due to factors beyond the seller's control. The Vehicle will not be released until full payment is made.
              </p>

              <p style={{ marginBottom: "6px" }}>
                <b>2. Price Adjustments:</b> The quoted price may be subject to change due to market conditions, import duties, or regulatory changes. The buyer must agree to any price adjustments prior to delivery. If not accepted, the order will be void, and the advance will be forfeited.
              </p>

              <p style={{ marginBottom: "6px" }}>
                <b>3. Import Regulations & Government Policies:</b> Any changes in Sri Lanka's import laws or trade restrictions may affect the delivery process. The buyer is responsible for any additional costs arising from these changes. If a ban on imports occurs, the advance is non-refundable.
              </p>

              <p style={{ marginBottom: "6px" }}>
                <b>4. Vehicle Registration:</b> Registration occurs after full payment or a valid Purchase Order. The buyer is responsible for additional charges like taxes and special plates. Once registered, the vehicle cannot be returned, and no refunds will be issued.
              </p>

              <p style={{ marginBottom: "6px" }}>
                <b>5. Inspection & Acceptance:</b> The buyer must inspect the vehicle upon delivery. Any defects or discrepancies must be noted at the time of delivery. After acceptance, no claims for damages or missing items will be accepted.
              </p>

              <p style={{ marginBottom: "6px" }}>
                <b>6. Warranty & Maintenance:</b> This vehicle is covered under a 3-year or 100,000 km warranty (whichever occurs first), subject to strict compliance with the prescribed service schedule. To maintain warranty validity, all scheduled minor and major services, inspections, and spare part replacements must be carried out exclusively at NCG Automotive Services – PEP (NAS PEP). Servicing, repairs, or replacement of parts performed at any external or third-party service facility will automatically and irrevocably void the warranty. Warranty benefits remain applicable only while the vehicle is continuously serviced at NAS PEP in accordance with manufacturer and company service intervals.
              </p>

              <p style={{ marginBottom: "6px" }}>
                <b>7. Risk of Loss:</b> The risk of loss or damage passes to the buyer upon delivery and acceptance of the vehicle.
              </p>

              <p style={{ marginBottom: "6px" }}>
                <b>8. Indemnity:</b> The buyer agrees to indemnify the seller against any liability arising from the use or resale of the vehicle after delivery.
              </p>

              <p style={{ marginBottom: "6px" }}>
                <b>9. Additional Clauses:</b> The seller may use photos of the vehicle for promotional purposes unless otherwise agreed. The buyer may not transfer their rights or obligations under this agreement without the seller's written consent.
              </p>

              <p style={{ marginBottom: "6px" }}>
                <b>10. Indemnity:</b> The buyer agrees to indemnify and hold the seller harmless against any loss, damage, or legal liability arising out of the buyer's use, ownership, or resale of the vehicle after delivery.
              </p>

              <p style={{ marginBottom: "6px" }}>
                <b>11. Additional Clauses:</b> The seller retains the right to use photographs or descriptions of the vehicle for advertising or promotional purposes unless otherwise agreed in writing by both parties. The buyer may not assign, transfer, or sub-contract their rights or obligations under this agreement without the prior written consent of the seller.
              </p>

              <p style={{ marginBottom: "6px", padding: "8px", border: "2px solid #1e40af", borderRadius: "4px", background: "#e8f0fe" }}>
                <b>12. Quotation Validity:</b> This quotation is valid for {(() => {
                  try {
                    if (quotation.valid_until) {
                      const created = new Date(quotation.created_at);
                      const validUntil = new Date(quotation.valid_until);
                      const diffDays = Math.round((validUntil.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
                      return `${diffDays > 0 ? diffDays : 30} days`;
                    }
                    return "30 days";
                  } catch { return "30 days"; }
                })()} from the date of issue{quotation.valid_until ? ` (valid until ${format(new Date(quotation.valid_until), "dd/MM/yyyy")})` : ""}. After this period, prices and availability are subject to change.
              </p>
            </div>

            {/* Additional Terms Section - Warranty, Delivery, Payment */}
            {(quotation.warranty_terms || quotation.delivery_timeline || quotation.payment_terms) && (
              <div style={{ 
                marginTop: "15px", 
                padding: "12px", 
                border: "2px solid #1e40af", 
                borderRadius: "8px", 
                background: "#f8f9fa" 
              }}>
                <h4 style={{ 
                  color: "#1e40af", 
                  marginBottom: "8px", 
                  fontSize: "12px", 
                  fontWeight: "bold",
                  borderBottom: "1px solid #1e40af",
                  paddingBottom: "4px"
                }}>
                  ADDITIONAL TERMS
                </h4>
                
                {quotation.warranty_terms && (
                  <div style={{ marginBottom: "8px" }}>
                    <b style={{ color: "#1e40af", fontSize: "11px" }}>WARRANTY TERMS:</b>
                    <p style={{ margin: "4px 0 0 0", whiteSpace: "pre-line", fontSize: "10px", lineHeight: "1.4" }}>
                      {quotation.warranty_terms}
                    </p>
                  </div>
                )}
                
                {quotation.delivery_timeline && (
                  <div style={{ marginBottom: "8px" }}>
                    <b style={{ color: "#1e40af", fontSize: "11px" }}>DELIVERY TIMELINE:</b>
                    <p style={{ margin: "4px 0 0 0", fontSize: "10px", lineHeight: "1.4" }}>
                      {quotation.delivery_timeline}
                    </p>
                  </div>
                )}
                
                {quotation.payment_terms && (
                  <div style={{ marginBottom: "0" }}>
                    <b style={{ color: "#1e40af", fontSize: "11px" }}>PAYMENT TERMS:</b>
                    <p style={{ margin: "4px 0 0 0", whiteSpace: "pre-line", fontSize: "10px", lineHeight: "1.4" }}>
                      {quotation.payment_terms}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Acceptance Section */}
            <div style={{ marginTop: "15px", padding: "15px", border: "2px solid #3b82f6", borderRadius: "8px", background: "#f8f9fa" }}>
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
              <div style={{ display: "flex", alignItems: "center" }}>📞 {responsiblePerson?.phone || "+94 77 123 4567"}</div>
              <div>📍 157 Y, Kebelalowita, Weniwelkola, Polgasowita</div>
              <div style={{ display: "flex", alignItems: "center" }}>✉️ {responsiblePerson?.email || "info@ncgholdings.lk"}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

LightVehicleQuotationPreview.displayName = "LightVehicleQuotationPreview";
