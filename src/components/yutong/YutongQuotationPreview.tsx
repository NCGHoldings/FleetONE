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
        seating: busModelDetails.capacity ? `${busModelDetails.capacity}` : "37+1+1",
        engine: busModelDetails.engine || "YUCHAI-YC6A270-50 (Euro V)",
        year: busModelDetails.manufactured_year?.toString() || "2025",
        condition: busModelDetails.condition || "BRAND NEW",
      };
    }

    // Fallback values when bus model details are not available
    return {
      model: quotation.bus_model || "ZK6907H",
      seating: "37+1+1",
      engine: "YUCHAI-YC6A270-50 (Euro V)",
      year: "2025",
      condition: "BRAND NEW",
    };
  };

  const busDetails = getBusModelDetails();
  const formattedDate = format(new Date(quotation.created_at), "dd/MM/yyyy");

  // Fetch bus model details and add-ons for this quotation
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch bus model details if bus_model_id is available
        if (quotation.bus_model_id) {
          const { data: busData, error: busError } = await supabase
            .from("yutong_bus_models")
            .select("model_name, capacity, engine, manufactured_year, condition")
            .eq("id", quotation.bus_model_id)
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
        min-height: 100px;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
      }
      .signature-content {
        height: 70px;
        display: flex;
        align-items: flex-end;
        justify-content: center;
      }
      .signature-line {
        border-top: 1px dotted #000;
        padding-top: 5px;
        margin-top: 10px;
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
    <div
      ref={ref}
      style={{ fontFamily: "Arial, sans-serif", margin: 0, padding: "20px", background: "#f9f9f9", color: "#000" }}
    >
      <style dangerouslySetInnerHTML={{ __html: pageHeaderFooterStyles }} />

      {/* Page 1 - Main Quotation */}
      <div className="page" style={{ maxWidth: "900px", margin: "0 auto 20px auto" }}>
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
          <div style={{ marginBottom: "20px" }}>
            {quotation.customer_type === "company" ? (
              <>
                {quotation.representative_name && (
                  <p style={{ margin: "4px 0", fontSize: "14px" }}>
                    <b>CUSTOMER :</b> {quotation.representative_name}
                  </p>
                )}
                {quotation.designation && (
                  <p style={{ margin: "4px 0", fontSize: "14px" }}>
                    <b>DESIGNATION :</b> {quotation.designation}
                  </p>
                )}
                <p style={{ margin: "4px 0", fontSize: "14px" }}>
                  <b>COMPANY :</b> {quotation.customer_name}
                </p>
                {quotation.business_registration_number && (
                  <p style={{ margin: "4px 0", fontSize: "14px" }}>
                    <b>BUSINESS REG NO :</b> {quotation.business_registration_number}
                  </p>
                )}
                {quotation.tax_registration_number && (
                  <p style={{ margin: "4px 0", fontSize: "14px" }}>
                    <b>TAX REG NO :</b> {quotation.tax_registration_number}
                  </p>
                )}
                <p style={{ margin: "4px 0", fontSize: "14px" }}>
                  <b>ADDRESS :</b> {quotation.customer_address || ""}
                </p>
              </>
            ) : (
              <>
                <p style={{ margin: "4px 0", fontSize: "14px" }}>
                  <b>CUSTOMER :</b> {quotation.customer_name}
                </p>
                <p style={{ margin: "4px 0", fontSize: "14px" }}>
                  <b>ADDRESS :</b> {quotation.customer_address || ""}
                </p>
              </>
            )}
            <p style={{ margin: "4px 0", fontSize: "14px" }}>
              <b>CONTACT :</b> {quotation.customer_phone}{quotation.customer_email ? ` / ${quotation.customer_email}` : ''}
            </p>
            <p style={{ margin: "4px 0", fontSize: "14px" }}>
              <b>DATE :</b> {formattedDate}
            </p>
            {quotation.finance_company && (
              <p style={{ margin: "4px 0", fontSize: "14px" }}>
                <b>FINANCE COMPANY :</b> {quotation.finance_company}
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
          <div style={{ fontSize: "14px", marginTop: "10px" }}>
            <p style={{ margin: "3px 0" }}>
              <b>Payment Terms :</b> {quotation.payment_terms || "Payment method – by Cheque or bank transfer"}
            </p>
            <p style={{ margin: "3px 0" }}>
              <b>Account Name :</b> NCG HOLDINGS (PRIVATE) LIMITED
            </p>
            <p style={{ margin: "3px 0" }}>
              <b>Account Number :</b> 2000511791
            </p>
            <p style={{ margin: "3px 0" }}>
              <b>Bank Name :</b> Commercial Bank of Ceylon PLC
            </p>
            <p style={{ margin: "3px 0" }}>
              <b>Bank Code :</b> 7056
            </p>
            <p style={{ margin: "3px 0" }}>
              <b>Branch :</b> Nugegoda Branch
            </p>
            <p style={{ margin: "3px 0" }}>
              <b>Branch Code :</b> 020
            </p>
            <p style={{ margin: "3px 0" }}>
              <b>Swift Code :</b> CCEYLKLX
            </p>
          </div>

          {/* Vehicle Customization */}
          {(quotation.seat_colour ||
            quotation.curtain_colour ||
            quotation.body_colour ||
            quotation.seat_headrest_logo) && (
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
                VEHICLE CUSTOMIZATION
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {quotation.seat_colour && (
                  <p style={{ margin: "4px 0" }}>
                    <b>Seat Colour:</b> {quotation.seat_colour}
                  </p>
                )}
                {quotation.curtain_colour && (
                  <p style={{ margin: "4px 0" }}>
                    <b>Curtain Colour:</b> {quotation.curtain_colour}
                  </p>
                )}
                {quotation.body_colour && (
                  <p style={{ margin: "4px 0" }}>
                    <b>Body Colour:</b> {quotation.body_colour}
                  </p>
                )}
                {quotation.seat_headrest_logo && (
                  <p style={{ margin: "4px 0" }}>
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
      <div className="page" style={{ maxWidth: "900px", margin: "0 auto" }}>
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
          {/* Terms & Conditions */}
          <div style={{ fontSize: "13px", lineHeight: "1.5", color: "#003366" }}>
            <h3
              style={{
                color: "#003366",
                borderBottom: "2px solid #003366",
                paddingBottom: "5px",
                marginBottom: "15px",
              }}
            >
              Terms & Conditions
            </h3>

            <p style={{ marginBottom: "12px" }}>
              <b>1. Payment & Order Confirmation</b>
              <br />A non-refundable advance payment of 10% of the total value is required to confirm the order. The
              balance payment must be settled prior to delivery, unless otherwise agreed in writing. The vehicle will
              not be released until full payment is received.
            </p>

            <p style={{ marginBottom: "12px" }}>
              <b>2. Delivery Timeline</b>
              <br />
              Estimated delivery is 120 days, subject to stock availability, colour availability, production schedules,
              shipping conditions, and regulatory approvals. Delivery delays beyond the seller’s control shall not be
              the seller’s liability.
            </p>

            <p style={{ marginBottom: "12px" }}>
              <b>3. Customisations</b>
              <br />
              Any customer-requested customisations or specification changes will incur additional costs and may affect
              delivery timelines.
            </p>

            <p style={{ marginBottom: "12px" }}>
              <b>4. USD Exchange Rate Variations</b>
              <br />
              Prices are based on the prevailing USD exchange rate at the time of quotation. Any exchange rate
              fluctuation may result in a price adjustment. If not accepted, the order will be cancelled, and the
              advance payment forfeited.
            </p>

            <p style={{ marginBottom: "12px" }}>
              <b>5. Import Regulations & Government Policies</b>
              <br />
              Changes in import laws, duties, taxes, or trade restrictions in Sri Lanka may impact pricing and delivery.
              Any additional costs arising from such changes shall be borne by the buyer. In the event of an import ban,
              the advance remains non-refundable.
            </p>

            <p style={{ marginBottom: "12px" }}>
              <b>6. Vehicle Registration & Statutory Costs</b>
              <br />
              Vehicle registration will commence only after full payment or receipt of a valid Purchase Order. All
              related costs including taxes, special number plates, revenue licence, and insurance are the buyer’s
              responsibility. Once registered, no returns or refunds will be allowed.
            </p>

            <p style={{ marginBottom: "12px" }}>
              <b>7. Inspection & Acceptance</b>
              <br />
              The buyer must inspect the vehicle at delivery. Any defects or discrepancies must be reported immediately.
              Once accepted, no claims for damages or missing items will be entertained.
            </p>

            <p style={{ marginBottom: "12px" }}>
              <b>8. Warranty & Maintenance</b>
              <br />
              The vehicle is covered under the manufacturer’s warranty, subject to their terms. Maintenance outside the
              warranty scope is the buyer’s responsibility. The seller may assist with warranty claims but bears no
              liability for outcomes or costs.
            </p>

            <p style={{ marginBottom: "12px" }}>
              <b>9. Risk & Liability</b>
              <br />
              Risk of loss or damage transfers to the buyer upon delivery and acceptance. The seller shall not be liable
              for any loss, damage, or misuse after delivery.
            </p>

            <p style={{ marginBottom: "12px" }}>
              <b>10. Indemnity, Marketing & Assignment</b>
              <br />
              The buyer agrees to indemnify the seller against any claims arising from use or resale of the vehicle. The
              seller may use vehicle images for promotional purposes. The buyer may not assign or transfer this
              agreement without written consent.
            </p>
          </div>
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
