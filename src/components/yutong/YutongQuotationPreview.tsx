import React, { forwardRef, useEffect, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useYutongSignatures, YutongSignature } from "@/hooks/useYutongSignatures";

interface YutongQuotation {
  id: string;
  quotation_no: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  company_name?: string;
  customer_address?: string;
  contact_person?: string;
  bus_model: string;
  bus_model_id?: string;
  seating_capacity?: string;
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
  discount_amount?: number;
  responsible_person_id?: string;
  seat_colour?: string;
  curtain_colour?: string;
  body_colour?: string;
  seat_headrest_logo?: string;
  finance_company?: string;
  customer_type?: string;
  business_registration_number?: string;
  tax_registration_number?: string;
  representative_name?: string;
  designation?: string;
}

interface BusModelDetails {
  model_name: string;
  capacity: string;
  engine: string;
  manufactured_year: number;
  condition: string;
}

interface QuotationAddOn {
  id: string;
  addon_id: string;
  quantity: number;
  unit_price: number;
  is_free_of_charge?: boolean;
  notes?: string;
  yutong_addons?: {
    addon_name: string;
  };
}

interface YutongQuotationPreviewProps {
  quotation: YutongQuotation;
}

export const YutongQuotationPreview = forwardRef<HTMLDivElement, YutongQuotationPreviewProps>(({ quotation }, ref) => {
  const [addOns, setAddOns] = useState<QuotationAddOn[]>([]);
  const [busModelDetails, setBusModelDetails] = useState<BusModelDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [responsiblePerson, setResponsiblePerson] = useState<any>(null);
  const [signatures, setSignatures] = useState<YutongSignature[]>([]);
  const { fetchSignatures } = useYutongSignatures();

  // Get bus model details with fallback values
  const getBusModelDetails = () => {
    if (busModelDetails) {
      return {
        model: busModelDetails.model_name || quotation.bus_model,
        seating: busModelDetails.capacity ? `${busModelDetails.capacity}` : (quotation.seating_capacity || "N/A"),
        engine: busModelDetails.engine || "N/A",
        year: (quotation as any).vehicle_year?.toString() || busModelDetails.manufactured_year?.toString() || "N/A",
        condition: busModelDetails.condition || "BRAND NEW",
      };
    }

    // Fallback values when bus model details are not available
    return {
      model: quotation.bus_model || "N/A",
      seating: quotation.seating_capacity || "N/A",
      engine: "N/A",
      year: (quotation as any).vehicle_year?.toString() || "N/A",
      condition: "BRAND NEW",
    };
  };

  const busDetails = getBusModelDetails();
  const formattedDate = format(new Date(quotation.created_at), "dd/MM/yyyy");

  // Fetch bus model details and add-ons for this quotation
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch bus model details - try quotation's bus_model_id first, then walk parent chain
        let busModelId = quotation.bus_model_id;
        
        if (!busModelId && (quotation as any).parent_quotation_id) {
          // Walk the parent chain to find a valid bus_model_id
          let parentId = (quotation as any).parent_quotation_id;
          for (let i = 0; i < 10 && parentId && !busModelId; i++) {
            const { data: parentData } = await supabase
              .from("yutong_quotations")
              .select("bus_model_id, parent_quotation_id")
              .eq("id", parentId)
              .maybeSingle();
            if (parentData?.bus_model_id) {
              busModelId = parentData.bus_model_id;
            } else {
              parentId = parentData?.parent_quotation_id;
            }
          }
        }

        if (busModelId) {
          const { data: busData, error: busError } = await supabase
            .from("yutong_bus_models")
            .select("model_name, capacity, engine, manufactured_year, condition")
            .eq("id", busModelId)
            .maybeSingle();

          if (busError) {
            console.error("Error fetching bus model details:", busError);
          } else if (busData) {
            setBusModelDetails(busData);
          }
        }

        // Fetch add-ons
        const { data: addOnData, error: addOnError } = await supabase
          .from("yutong_quotation_addons")
          .select(
            `
              *,
              yutong_addons (
                addon_name
              )
            `,
          )
          .eq("quotation_id", quotation.id);

        if (addOnError) {
          console.error("Error fetching add-ons:", addOnError);
        } else {
          setAddOns(addOnData || []);
        }

        // Fetch responsible person if linked
        if (quotation.responsible_person_id) {
          const { data: personData, error: personError } = await supabase
            .from("yutong_responsible_persons")
            .select("*")
            .eq("id", quotation.responsible_person_id)
            .single();

          if (!personError && personData) {
            setResponsiblePerson(personData);
          }
        }

        // Fetch signatures for this quotation
        const sigs = await fetchSignatures(quotation.id);
        setSignatures(sigs);
      } catch (error) {
        console.error("Error fetching quotation data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [quotation.id, quotation.bus_model_id, quotation.responsible_person_id]);

  // Calculate totals correctly to avoid double-counting
  const addOnsTotal = addOns.reduce((sum, addon) => {
    return addon.is_free_of_charge ? sum : sum + addon.quantity * addon.unit_price;
  }, 0);

  // Calculate bus subtotal (quantity * unit_price with discount applied)
  const busSubtotalBeforeDiscount = quotation.quantity * quotation.unit_price;
  const discountAmount = quotation.discount_amount || 0;
  const busSubtotal = busSubtotalBeforeDiscount - discountAmount;

  // Grand total should be bus subtotal + add-ons (not quotation.total_price which already includes add-ons)
  const grandTotal = busSubtotal + addOnsTotal;

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
        
        /* Compact spacing for print */
        .customer-info p {
          margin: 2px 0 !important;
          font-size: 12px !important;
        }
        
        .payment-details p {
          margin: 2px 0 !important;
          font-size: 12px !important;
        }
        
        .vehicle-customization {
          margin-top: 10px !important;
          padding: 8px !important;
        }
        
        .terms-section p {
          margin-bottom: 8px !important;
          font-size: 11px !important;
          line-height: 1.3 !important;
        }
      }
      
      /* Screen preview styles - A4 proportioned */
      .page {
        width: 210mm;
        min-height: 297mm;
        max-width: 210mm;
        display: flex;
        flex-direction: column;
        background: white;
        border: 2px solid #003366;
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
        background: #003366;
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
              src="/lovable-uploads/3a890245-ca01-4bcf-b6a0-346e06befe92.png"
              alt="Quotation Header - NCG Holdings & Yutong"
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          </div>

          {/* Customer Info - Dynamic based on customer_type */}
          <div className="customer-info" style={{ marginBottom: "12px" }}>
            {quotation.customer_type === "company" ? (
              <>
                {quotation.representative_name && (
                  <p style={{ margin: "3px 0", fontSize: "13px", whiteSpace: "pre-wrap" }}>
                    <b>CUSTOMER{'\u00A0'}:{'\u00A0'}</b>{quotation.representative_name}
                  </p>
                )}
                {quotation.designation && (
                  <p style={{ margin: "3px 0", fontSize: "13px", whiteSpace: "pre-wrap" }}>
                    <b>DESIGNATION{'\u00A0'}:{'\u00A0'}</b>{quotation.designation}
                  </p>
                )}
                <p style={{ margin: "3px 0", fontSize: "13px", whiteSpace: "pre-wrap" }}>
                  <b>COMPANY{'\u00A0'}:{'\u00A0'}</b>{quotation.customer_name}
                </p>
                {quotation.business_registration_number && (
                  <p style={{ margin: "3px 0", fontSize: "13px", whiteSpace: "pre-wrap" }}>
                    <b>BUSINESS{'\u00A0'}REG{'\u00A0'}NO{'\u00A0'}:{'\u00A0'}</b>{quotation.business_registration_number}
                  </p>
                )}
                {quotation.tax_registration_number && (
                  <p style={{ margin: "3px 0", fontSize: "13px", whiteSpace: "pre-wrap" }}>
                    <b>TAX{'\u00A0'}REG{'\u00A0'}NO{'\u00A0'}:{'\u00A0'}</b>{quotation.tax_registration_number}
                  </p>
                )}
                <p style={{ margin: "3px 0", fontSize: "13px", whiteSpace: "pre-wrap" }}>
                  <b>ADDRESS{'\u00A0'}:{'\u00A0'}</b>{quotation.customer_address || ""}
                </p>
              </>
            ) : (
              <>
                <p style={{ margin: "3px 0", fontSize: "13px", whiteSpace: "pre-wrap" }}>
                  <b>CUSTOMER{'\u00A0'}:{'\u00A0'}</b>{quotation.customer_name}
                </p>
                <p style={{ margin: "3px 0", fontSize: "13px", whiteSpace: "pre-wrap" }}>
                  <b>ADDRESS{'\u00A0'}:{'\u00A0'}</b>{quotation.customer_address || ""}
                </p>
              </>
            )}
            <p style={{ margin: "3px 0", fontSize: "13px", whiteSpace: "pre-wrap" }}>
              <b>CONTACT{'\u00A0'}:{'\u00A0'}</b>{quotation.customer_phone}{quotation.customer_email ? ` / ${quotation.customer_email}` : ''}
            </p>
            <p style={{ margin: "3px 0", fontSize: "13px", whiteSpace: "pre-wrap" }}>
              <b>DATE{'\u00A0'}:{'\u00A0'}</b>{formattedDate}
            </p>
            {quotation.finance_company && (
              <p style={{ margin: "3px 0", fontSize: "13px", whiteSpace: "pre-wrap" }}>
                <b>FINANCE{'\u00A0'}COMPANY{'\u00A0'}:{'\u00A0'}</b>{quotation.finance_company}
              </p>
            )}
          </div>

          {/* Quotation No */}
          <div style={{ textAlign: "right", fontWeight: "bold", marginBottom: "10px" }}>
            QUOTATION NO : {quotation.quotation_no}
          </div>

          {/* Quotation Table */}
          <table
            style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px", border: "1px solid #003366" }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    background: "#003366",
                    color: "white",
                    padding: "8px",
                    textAlign: "center",
                    border: "1px solid #003366",
                  }}
                >
                  PRODUCT
                </th>
                <th
                  style={{
                    background: "#003366",
                    color: "white",
                    padding: "8px",
                    textAlign: "center",
                    border: "1px solid #003366",
                  }}
                >
                  UNIT PRICE
                </th>
                <th
                  style={{
                    background: "#003366",
                    color: "white",
                    padding: "8px",
                    textAlign: "center",
                    border: "1px solid #003366",
                  }}
                >
                  QTY
                </th>
                <th
                  style={{
                    background: "#003366",
                    color: "white",
                    padding: "8px",
                    textAlign: "center",
                    border: "1px solid #003366",
                  }}
                >
                  TOTAL
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Main Bus Product */}
              <tr>
                <td style={{ padding: "8px", fontSize: "14px", border: "1px solid #003366" }}>
                  <b>BUS MODEL:</b> YUTONG - {busDetails.model}
                  <br />
                  <b>SEATING CAPACITY:</b> {busDetails.seating}
                  <br />
                  <b>ENGINE:</b> {busDetails.engine}
                  <br />
                  <b>YEAR:</b> {busDetails.year}
                  <br />
                  <b>CONDITION:</b> {busDetails.condition}
                  {quotation.special_features && (
                    <>
                      <br />
                      <b>SPECIAL FEATURES:</b> {quotation.special_features}
                    </>
                  )}
                </td>
                <td style={{ textAlign: "center", padding: "8px", fontSize: "14px", border: "1px solid #003366" }}>
                  {quotation.unit_price.toLocaleString()}
                </td>
                <td style={{ textAlign: "center", padding: "8px", fontSize: "14px", border: "1px solid #003366" }}>
                  {quotation.quantity}
                </td>
                <td style={{ textAlign: "center", padding: "8px", fontSize: "14px", border: "1px solid #003366" }}>
                  {busSubtotalBeforeDiscount.toLocaleString()}
                </td>
              </tr>

              {/* Show discount breakdown if applicable */}
              {(quotation.discount_amount || 0) > 0 ? (
                <>
                  <tr>
                    <td
                      colSpan={3}
                      style={{
                        fontWeight: "bold",
                        textAlign: "right",
                        padding: "8px",
                        fontSize: "14px",
                        border: "1px solid #003366",
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
                        border: "1px solid #003366",
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
                        border: "1px solid #003366",
                        background: "#f5f5f5",
                      }}
                    >
                      Net Bus Subtotal
                    </td>
                    <td
                      style={{
                        textAlign: "center",
                        padding: "8px",
                        fontSize: "14px",
                        border: "1px solid #003366",
                        background: "#f5f5f5",
                        fontWeight: "bold",
                      }}
                    >
                      {busSubtotal.toLocaleString()}
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
                      border: "1px solid #003366",
                      background: "#f5f5f5",
                    }}
                  >
                    Bus Subtotal
                  </td>
                  <td
                    style={{
                      textAlign: "center",
                      padding: "8px",
                      fontSize: "14px",
                      border: "1px solid #003366",
                      background: "#f5f5f5",
                      fontWeight: "bold",
                    }}
                  >
                    {busSubtotal.toLocaleString()}
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
                        border: "1px solid #003366",
                        background: "#003366",
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
                      <td style={{ padding: "8px", fontSize: "14px", border: "1px solid #003366" }}>
                        <b>ADD-ON:</b> {addon.yutong_addons?.addon_name || "N/A"}
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
                        style={{ textAlign: "center", padding: "8px", fontSize: "14px", border: "1px solid #003366" }}
                      >
                        {addon.is_free_of_charge ? "FREE" : addon.unit_price.toLocaleString()}
                      </td>
                      <td
                        style={{ textAlign: "center", padding: "8px", fontSize: "14px", border: "1px solid #003366" }}
                      >
                        {addon.quantity}
                      </td>
                      <td
                        style={{ textAlign: "center", padding: "8px", fontSize: "14px", border: "1px solid #003366" }}
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
                        border: "1px solid #003366",
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
                        border: "1px solid #003366",
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
                    border: "2px solid #003366",
                    background: "#003366",
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
                    border: "2px solid #003366",
                    background: "#003366",
                    color: "white",
                    fontWeight: "bold",
                  }}
                >
                  {grandTotal.toLocaleString()}
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
              <b>Account Name :</b> NCG HOLDINGS (PRIVATE) LIMITED | <b>Account Number :</b> 2000511791
            </p>
            <p style={{ margin: "2px 0" }}>
              <b>Bank :</b> Commercial Bank of Ceylon PLC (7056) | <b>Branch :</b> Nugegoda (020) | <b>Swift :</b> CCEYLKLX
            </p>
          </div>

          {/* Vehicle Customization */}
          {(quotation.seat_colour ||
            quotation.curtain_colour ||
            quotation.body_colour ||
            quotation.seat_headrest_logo) && (
            <div
              className="vehicle-customization"
              style={{
                fontSize: "12px",
                marginTop: "12px",
                padding: "10px",
                border: "1px solid #003366",
                borderRadius: "6px",
                background: "#f8f9fa",
              }}
            >
              <h3 style={{ margin: "0 0 6px 0", color: "#003366", fontSize: "13px", fontWeight: "bold" }}>
                VEHICLE CUSTOMIZATION
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px" }}>
                {quotation.seat_colour && (
                  <p style={{ margin: "2px 0" }}>
                    <b>Seat Colour:</b> {quotation.seat_colour}
                  </p>
                )}
                {quotation.curtain_colour && (
                  <p style={{ margin: "2px 0" }}>
                    <b>Curtain Colour:</b> {quotation.curtain_colour}
                  </p>
                )}
                {quotation.body_colour && (
                  <p style={{ margin: "2px 0" }}>
                    <b>Body Colour:</b> {quotation.body_colour}
                  </p>
                )}
                {quotation.seat_headrest_logo && (
                  <p style={{ margin: "2px 0" }}>
                    <b>Seat Headrest Logo:</b> {quotation.seat_headrest_logo}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Company Registration Details */}
          {quotation.customer_type === "company" &&
            (quotation.business_registration_number || quotation.tax_registration_number) && (
              <div
                style={{
                  fontSize: "14px",
                  marginTop: "20px",
                  padding: "15px",
                  border: "2px solid #003366",
                  borderRadius: "8px",
                  background: "#f8f9fa",
                }}
              >
                <h3 style={{ margin: "0 0 10px 0", color: "#003366", fontSize: "16px", fontWeight: "bold" }}>
                  COMPANY REGISTRATION DETAILS
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  {quotation.business_registration_number && (
                    <p style={{ margin: "4px 0" }}>
                      <b>Business Registration Number:</b> {quotation.business_registration_number}
                    </p>
                  )}
                  {quotation.tax_registration_number && (
                    <p style={{ margin: "4px 0" }}>
                      <b>Tax Registration Number:</b> {quotation.tax_registration_number}
                    </p>
                  )}
                </div>
              </div>
            )}
        </div>

        {/* Page 1 Footer with Signatures */}
        <div className="page-footer">
          <div className="signatures">
            {["sales_manager", "approved_by", "customer"].map((role) => {
              const sig = signatures.find((s) => s.signature_role === role);
              const roleLabel = role === "sales_manager" ? "Sales Manager" 
                : role === "approved_by" ? "Approved By" 
                : "Customer";
              
              return (
                <div key={role} className="signature-field">
                  <div className="signature-content">
                    {sig ? (
                      sig.signature_type === "drawing" || sig.signature_type === "image" ? (
                        <img
                          src={sig.signature_data}
                          alt={`${sig.signer_name} signature`}
                          style={{ maxHeight: "60px", maxWidth: "100%" }}
                          crossOrigin="anonymous"
                        />
                      ) : (
                        <div style={{ fontFamily: "cursive", fontSize: "18px" }}>
                          {sig.signature_data}
                        </div>
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
                    ) : roleLabel}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="footer-contact">
            <div style={{ display: "flex", alignItems: "center" }}>
              📞 {responsiblePerson?.phone || "+94 77 766 5501"}
            </div>
            <div>📍 157 Y, Kebelalowita, Weniwelkola, Polgasowita</div>
            <div style={{ display: "flex", alignItems: "center" }}>
              ✉️ {responsiblePerson?.email || "info@yutonglankabus.lk"}
            </div>
            {responsiblePerson && (
              <div style={{ display: "flex", alignItems: "center" }}>👤 {responsiblePerson.name}</div>
            )}
          </div>
        </div>
      </div>

      {/* Page 2 - Terms & Conditions */}
      <div className="page">
        <div className="page-content">
          {/* Header */}
          <div className="page-header">
            <img
              src="/lovable-uploads/3a890245-ca01-4bcf-b6a0-346e06befe92.png"
              alt="Quotation Header - NCG Holdings & Yutong"
              style={{ width: "100%", height: "auto", display: "block" }}
            />
            <div
              style={{ textAlign: "center", fontWeight: "bold", fontSize: "16px", marginTop: "10px", color: "#003366" }}
            >
              QUOTATION NO: {quotation.quotation_no} - Terms & Conditions
            </div>
          </div>

          {/* Terms & Conditions */}
          <div className="terms-section" style={{ fontSize: "11px", lineHeight: "1.35", color: "#003366" }}>
            <h3
              style={{
                color: "#003366",
                borderBottom: "2px solid #003366",
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
              <b>2. Delivery Timeline:</b> Estimated delivery is 120 days, subject to stock availability, colour availability, production schedules, shipping conditions, and regulatory approvals. Delivery delays beyond the seller's control shall not be the seller's liability.
            </p>

            <p style={{ marginBottom: "6px" }}>
              <b>3. Customisations:</b> Any customer-requested customisations or specification changes will incur additional costs and may affect delivery timelines.
            </p>

            <p style={{ marginBottom: "6px" }}>
              <b>4. USD Exchange Rate Variations:</b> Prices are based on the prevailing USD exchange rate at the time of quotation. Any exchange rate fluctuation may result in a price adjustment. If not accepted, the order will be cancelled, and the advance payment forfeited.
            </p>

            <p style={{ marginBottom: "6px" }}>
              <b>5. Import Regulations & Government Policies:</b> Changes in import laws, duties, taxes, or trade restrictions in Sri Lanka may impact pricing and delivery. Any additional costs arising from such changes shall be borne by the buyer. In the event of an import ban, the advance remains non-refundable.
            </p>

            <p style={{ marginBottom: "6px" }}>
              <b>6. Vehicle Registration & Statutory Costs:</b> Vehicle registration will commence only after full payment or receipt of a valid Purchase Order. All related costs including taxes, special number plates, revenue licence, and insurance are the buyer's responsibility. Once registered, no returns or refunds will be allowed.
            </p>

            <p style={{ marginBottom: "6px" }}>
              <b>7. Inspection & Acceptance:</b> The buyer must inspect the vehicle at delivery. Any defects or discrepancies must be reported immediately. Once accepted, no claims for damages or missing items will be entertained.
            </p>

            <p style={{ marginBottom: "6px" }}>
              <b>8. Warranty & Maintenance:</b> The vehicle is covered under the manufacturer's warranty, subject to their terms. Maintenance outside the warranty scope is the buyer's responsibility. The seller may assist with warranty claims but bears no liability for outcomes or costs.
            </p>

            <p style={{ marginBottom: "6px" }}>
              <b>9. Risk & Liability:</b> Risk of loss or damage transfers to the buyer upon delivery and acceptance. The seller shall not be liable for any loss, damage, or misuse after delivery.
            </p>

            <p style={{ marginBottom: "6px" }}>
              <b>10. Indemnity, Marketing & Assignment:</b> The buyer agrees to indemnify the seller against any claims arising from use or resale of the vehicle. The seller may use vehicle images for promotional purposes. The buyer may not assign or transfer this agreement without written consent.
            </p>

            <p style={{ marginBottom: "6px", padding: "8px", border: "2px solid #003366", borderRadius: "4px", background: "#e8f0fe" }}>
              <b>11. Quotation Validity:</b> This quotation is valid for {(() => {
                try {
                  const created = new Date(quotation.created_at);
                  const validUntil = new Date(quotation.valid_until);
                  const diffDays = Math.round((validUntil.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
                  return diffDays > 0 ? diffDays : 30;
                } catch { return 30; }
              })()} days from the date of issue (valid until {(() => {
                try { return format(new Date(quotation.valid_until), "dd/MM/yyyy"); } catch { return "N/A"; }
              })()}). After this period, prices and availability are subject to change.
            </p>
          </div>

          {/* Additional Terms Section - Warranty, Delivery, Payment */}
          {(quotation.warranty_terms || quotation.delivery_timeline || quotation.payment_terms) && (
            <div style={{ 
              marginTop: "15px", 
              padding: "12px", 
              border: "2px solid #003366", 
              borderRadius: "8px", 
              background: "#f8f9fa" 
            }}>
              <h4 style={{ 
                color: "#003366", 
                marginBottom: "8px", 
                fontSize: "12px", 
                fontWeight: "bold",
                borderBottom: "1px solid #003366",
                paddingBottom: "4px"
              }}>
                ADDITIONAL TERMS
              </h4>
              
              {quotation.warranty_terms && (
                <div style={{ marginBottom: "8px" }}>
                  <b style={{ color: "#003366", fontSize: "11px" }}>WARRANTY TERMS:</b>
                  <p style={{ margin: "4px 0 0 0", whiteSpace: "pre-line", fontSize: "10px", lineHeight: "1.4" }}>
                    {quotation.warranty_terms}
                  </p>
                </div>
              )}
              
              {quotation.delivery_timeline && (
                <div style={{ marginBottom: "8px" }}>
                  <b style={{ color: "#003366", fontSize: "11px" }}>DELIVERY TIMELINE:</b>
                  <p style={{ margin: "4px 0 0 0", fontSize: "10px", lineHeight: "1.4" }}>
                    {quotation.delivery_timeline}
                  </p>
                </div>
              )}
              
              {quotation.payment_terms && (
                <div style={{ marginBottom: "0" }}>
                  <b style={{ color: "#003366", fontSize: "11px" }}>PAYMENT TERMS:</b>
                  <p style={{ margin: "4px 0 0 0", whiteSpace: "pre-line", fontSize: "10px", lineHeight: "1.4" }}>
                    {quotation.payment_terms}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Page 2 Footer with Signatures */}
        <div className="page-footer">
          <div className="signatures">
            {["sales_manager", "approved_by", "customer"].map((role) => {
              const sig = signatures.find((s) => s.signature_role === role);
              const roleLabel = role === "sales_manager" ? "Sales Manager" 
                : role === "approved_by" ? "Approved By" 
                : "Customer";
              
              return (
                <div key={role} className="signature-field">
                  <div className="signature-content">
                    {sig ? (
                      sig.signature_type === "drawing" || sig.signature_type === "image" ? (
                        <img
                          src={sig.signature_data}
                          alt={`${sig.signer_name} signature`}
                          style={{ maxHeight: "60px", maxWidth: "100%" }}
                          crossOrigin="anonymous"
                        />
                      ) : (
                        <div style={{ fontFamily: "cursive", fontSize: "18px" }}>
                          {sig.signature_data}
                        </div>
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
                    ) : roleLabel}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="footer-contact">
            <div style={{ display: "flex", alignItems: "center" }}>
              📞 {responsiblePerson?.phone || "+94 77 766 5501"}
            </div>
            <div>📍 157 Y, Kebelalowita, Weniwelkola, Polgasowita</div>
            <div style={{ display: "flex", alignItems: "center" }}>
              ✉️ {responsiblePerson?.email || "info@yutonglankabus.lk"}
            </div>
            {responsiblePerson && (
              <div style={{ display: "flex", alignItems: "center" }}>👤 {responsiblePerson.name}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

YutongQuotationPreview.displayName = "YutongQuotationPreview";
