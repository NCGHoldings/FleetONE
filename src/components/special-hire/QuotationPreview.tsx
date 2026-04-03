import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { safeParseJSON } from "@/lib/utils";

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
  km_parking_to_pickup?: number;
  km_trip?: number;
  km_drop_to_parking?: number;
  total_distance_km?: number;
  gross_revenue: number;
  net_profit: number;
  fuel_cost_fuel_only?: number;
  hire_charge?: number;
  extra_charges?: number;
  // Time-based charges
  fixed_rate?: number;
  overtime_charge?: number;
  overnight_charge?: number;
  exceeding_distance_charge?: number;
  commission_amount?: number;
  commission_pass_through_amount?: number;
  discount_amount_lkr?: number;
  discount_type?: string;
  intermediate_stops?: string;
  route_description?: string;
  route_type?: string;
  valid_until?: string;
  created_at: string;
  approval_status?: "pending" | "approved" | "rejected";
  discount_percentage?: number;
  additional_charges?: Array<{ type: string; amount: number; reason?: string }> | string;
  total_additional_charges?: number;
  percentage_adjustment?: number;
  // Add the field that CostBreakdown uses
  customerTotalWithFuel?: number;
  // Multi-bus fleet support
  bus_fleet_details?: {
    buses: Array<{
      bus_type_id: string;
      bus_type_name: string;
      quantity: number;
      seating_capacity: number;
      hire_charge_per_bus: number;
      fuel_cost_per_bus: number;
      maintenance_cost_per_bus: number;
      subtotal_per_bus: number;
      subtotal_all_buses: number;
    }>;
    total_buses: number;
    total_capacity: number;
    combined_subtotal: number;
  };
}

interface Props {
  quotation: QuotationData;
  className?: string;
  documentMode?: 'quotation' | 'proforma_invoice';
}

export function QuotationPreview({ quotation, className = "", documentMode = 'quotation' }: Props) {
  const docLabel = documentMode === 'proforma_invoice' ? 'Proforma Invoice' : 'Quotation';
  const [rateCard, setRateCard] = useState<any>(null);

  // Ensure bus_fleet_details is always parsed and normalized to correct structure
  const parsedQuotation = {
    ...quotation,
    bus_fleet_details: (() => {
      const parsed = safeParseJSON(quotation.bus_fleet_details, null);

      // Handle if bus_fleet_details is just an array (legacy format from database)
      if (Array.isArray(parsed)) {
        return {
          buses: parsed,
          total_buses: parsed.reduce((sum, b) => sum + (b.quantity || 0), 0),
          total_capacity: parsed.reduce((sum, b) => sum + (b.seating_capacity || 0) * (b.quantity || 1), 0),
          combined_subtotal: parsed.reduce((sum, b) => sum + (b.subtotal_all_buses || 0), 0),
        };
      }

      // Already in correct format (object with buses property)
      return parsed;
    })(),
  };

  console.log("=== QuotationPreview Debug ===");
  console.log("Raw bus_fleet_details:", quotation.bus_fleet_details);
  console.log("Parsed bus_fleet_details:", parsedQuotation.bus_fleet_details);
  console.log("Is buses array?:", Array.isArray(parsedQuotation.bus_fleet_details?.buses));
  console.log("Buses:", parsedQuotation.bus_fleet_details?.buses);
  console.log("Total buses:", parsedQuotation.bus_fleet_details?.total_buses);
  console.log("Total capacity:", parsedQuotation.bus_fleet_details?.total_capacity);

  useEffect(() => {
    const fetchRateCard = async () => {
      try {
        // First get the bus type ID from bus_types table
        const { data: busTypes } = await supabase
          .from("bus_types")
          .select("id")
          .eq("name", parsedQuotation.bus_type)
          .single();

        if (busTypes) {
          // Then fetch the rate card for this bus type, prioritizing non-zero exceeding rates
          const { data: rateData } = await supabase
            .from("hire_rate_cards")
            .select("*")
            .eq("bus_type_id", busTypes.id)
            .eq("is_active", true)
            .order("exceeding_km_rate_lkr", { ascending: false });

          if (rateData && rateData.length > 0) {
            // Find first record with non-zero exceeding_km_rate_lkr, or use first record if all are zero
            const validRateCard = rateData.find((card) => card.exceeding_km_rate_lkr > 0) || rateData[0];
            setRateCard(validRateCard);
          }
        }
      } catch (error) {
        console.error("Error fetching rate card:", error);
      }
    };

    fetchRateCard();
  }, [parsedQuotation.bus_type]);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: format(date, "yyyy-MM-dd"),
      time: format(date, "HH:mm a"),
    };
  };

  // Always recalculate from current field values to reflect edits in real-time
  const calculateFinalCustomerTotal = (quot: QuotationData): number => {
    // Always calculate from component values - don't use stored customerTotalWithFuel
    // This ensures edited values are reflected in preview immediately
    const grossRevenue = Number(quot.gross_revenue) || 0;
    const fuelCostTotal = Number(quot.fuel_cost_fuel_only) || 0;
    const commissionPassThrough = Number(quot.commission_pass_through_amount) || 0;
    const additionalCharges = Number(quot.total_additional_charges) || 0;
    const discount = Number(quot.discount_amount_lkr) || 0;
    const percentageAdjustment = Number(quot.percentage_adjustment) || 0;

    const customerTotalBeforeAdjustment =
      grossRevenue + fuelCostTotal + commissionPassThrough + additionalCharges - discount;
    const adjustmentAmount = customerTotalBeforeAdjustment * (percentageAdjustment / 100);
    const finalCustomerTotal = customerTotalBeforeAdjustment + adjustmentAmount;

    return Math.round(finalCustomerTotal);
  };

  const pickup = formatDateTime(parsedQuotation.pickup_datetime);
  const dropoff = parsedQuotation.drop_datetime ? formatDateTime(parsedQuotation.drop_datetime) : null;

  // Calculate customer pickup to drop distance only (excluding parking distances)
  const customerDistance = parsedQuotation.km_trip || 0;

  // Parse intermediate stops for display
  const intermediateStops = safeParseJSON(parsedQuotation.intermediate_stops, []);

  // Parse additional charges for display
  const additionalCharges = safeParseJSON(parsedQuotation.additional_charges, []);

  // Build route description
  let routeDescription = `From ${parsedQuotation.pickup_location}`;
  if (intermediateStops.length > 0) {
    intermediateStops.forEach((stop: any) => {
      if (stop.location) {
        routeDescription += ` → ${stop.location}`;
      }
    });
  }
  routeDescription += ` → ${parsedQuotation.drop_location}`;

  // Check if DRAFT watermark should be shown
  const showDraftWatermark =
    parsedQuotation.approval_status === "pending" &&
    ((parsedQuotation.discount_percentage || 0) > 0 || (parsedQuotation.discount_amount_lkr || 0) > 0);

  return (
    <div
      className={`bg-white text-black font-sans ${className}`}
      style={{
        fontFamily: '"Segoe UI", Arial, sans-serif',
        background: "#f5f5f5",
        margin: 0,
        padding: "10px",
      }}
    >
      <div
        data-pdf-page="1"
        className="mx-auto bg-white shadow-lg relative"
        style={{
          width: "210mm",
          
          maxWidth: "210mm",
          padding: "15mm",
          boxSizing: "border-box",
          whiteSpace: "pre-wrap",
          overflowWrap: "break-word",
          wordWrap: "break-word",
        }}
      >
        {/* DRAFT Watermark */}
        {showDraftWatermark && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
            style={{
              background: "rgba(0, 0, 0, 0.05)",
            }}
          >
            <div
              className="text-gray-400 font-bold select-none"
              style={{
                fontSize: "120px",
                transform: "rotate(-45deg)",
                opacity: 0.3,
                letterSpacing: "20px",
                textShadow: "0 0 10px rgba(0,0,0,0.1)",
                fontFamily: "Arial, sans-serif",
              }}
            >
              DRAFT
            </div>
          </div>
        )}

        {/* Header */}
        <div data-pdf-section="header" className="flex justify-between items-start mb-4">
          {/* Logo */}
          <div className="w-32">
            <img
               src="/lovable-uploads/ncg-holdings-logo.png"
              alt="NCG Holdings Logo"
              className="max-w-full h-auto"
            />
          </div>

          {/* Right Block */}
          <div className="text-right" style={{ maxWidth: "45%" }}>
            <div className="bg-blue-600 text-white font-bold text-lg px-4 py-2 inline-block mb-2 w-full">
              Quotation{"\u00A0"}Special{"\u00A0"}Hire
            </div>
            <div className="text-sm leading-tight text-black">
              No. 157 Y, Kabellaowita, Weniwelkola,
              <br />
              Polgasowita.
              <br />
              074 289 3612
              <br />
              specialhire.ncgexpress@ncg.lk
            </div>
            <div className="text-xs mt-1 text-gray-700">
              Quotation{"\u00A0"}Generated{"\u00A0"}on{"\u00A0"}{format(new Date(parsedQuotation.created_at), "dd/MM/yyyy, hh:mm a")}
               <br />
               Quotation{"\u00A0"}No:{"\u00A0"}{parsedQuotation.quotation_no}
            </div>
          </div>
        </div>

        {/* Customer Details */}
        <div data-pdf-section="customer-details" className="mt-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-blue-600 min-w-[80px]">Company{"\u00A0"}Name:</span>
              <span className="text-gray-800">{parsedQuotation.company_name || "NCG Express"}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-blue-600 min-w-[80px]">Contact{"\u00A0"}Number:</span>
              <span className="text-gray-800">{parsedQuotation.customer_phone}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-blue-600 min-w-[80px]">Customer{"\u00A0"}Name:</span>
              <span className="text-gray-800">{parsedQuotation.customer_name}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-blue-600 min-w-[80px]">Email{"\u00A0"}Address:</span>
              <span className="text-gray-800">{parsedQuotation.customer_email || "N/A"}</span>
            </div>
          </div>
        </div>

        {/* Pickup Details */}
        <div data-pdf-section="pickup-details" style={{ marginTop: "12px" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "11px",
              fontFamily: '"Segoe UI", Arial, sans-serif',
            }}
          >
            <tbody>
              <tr>
                <th
                  style={{
                    border: "1px solid #d1d5db",
                    padding: "8px",
                    backgroundColor: "#eff6ff",
                    fontWeight: "600",
                    color: "#2563eb",
                    textAlign: "left",
                    verticalAlign: "middle",
                    width: "25%",
                  }}
                >
                  Pick-up{"\u00A0"}Location
                </th>
                <td
                  style={{
                    border: "1px solid #d1d5db",
                    padding: "8px",
                    verticalAlign: "middle",
                    color: "#374151",
                  }}
                  colSpan={3}
                >
                  {parsedQuotation.pickup_location}
                </td>
              </tr>
              <tr>
                <th
                  style={{
                    border: "1px solid #d1d5db",
                    padding: "8px",
                    backgroundColor: "#eff6ff",
                    fontWeight: "600",
                    color: "#2563eb",
                    textAlign: "left",
                    verticalAlign: "middle",
                    width: "12.5%",
                  }}
                >
                  Pick-up{"\u00A0"}Date
                </th>
                <td
                  style={{
                    border: "1px solid #d1d5db",
                    padding: "8px",
                    verticalAlign: "middle",
                    width: "12.5%",
                  }}
                >
                  <span style={{ fontWeight: "500", color: "#374151" }}>{pickup.date}</span>
                </td>
                <th
                  style={{
                    border: "1px solid #d1d5db",
                    padding: "8px",
                    backgroundColor: "#eff6ff",
                    fontWeight: "600",
                    color: "#2563eb",
                    textAlign: "left",
                    verticalAlign: "middle",
                    width: "12.5%",
                  }}
                >
                  Pick-up{"\u00A0"}Time
                </th>
                <td
                  style={{
                    border: "1px solid #d1d5db",
                    padding: "8px",
                    verticalAlign: "middle",
                    width: "12.5%",
                  }}
                >
                  <span style={{ color: "#6b7280" }}>{pickup.time}</span>
                </td>
              </tr>
              <tr>
                <th
                  style={{
                    border: "1px solid #d1d5db",
                    padding: "8px",
                    backgroundColor: "#eff6ff",
                    fontWeight: "600",
                    color: "#2563eb",
                    textAlign: "left",
                    verticalAlign: "middle",
                  }}
                >
                  Drop-off{"\u00A0"}Location
                </th>
                <td
                  style={{
                    border: "1px solid #d1d5db",
                    padding: "8px",
                    verticalAlign: "middle",
                    color: "#374151",
                  }}
                  colSpan={3}
                >
                  {parsedQuotation.drop_location}
                </td>
              </tr>
              <tr>
                <th
                  style={{
                    border: "1px solid #d1d5db",
                    padding: "8px",
                    backgroundColor: "#eff6ff",
                    fontWeight: "600",
                    color: "#2563eb",
                    textAlign: "left",
                    verticalAlign: "middle",
                    width: "12.5%",
                  }}
                >
                  Drop-off{"\u00A0"}Date
                </th>
                <td
                  style={{
                    border: "1px solid #d1d5db",
                    padding: "8px",
                    verticalAlign: "middle",
                    width: "12.5%",
                  }}
                >
                  {dropoff ? (
                    <span style={{ fontWeight: "500", color: "#374151" }}>{dropoff.date}</span>
                  ) : (
                    <span style={{ color: "#9ca3af" }}>TBD</span>
                  )}
                </td>
                <th
                  style={{
                    border: "1px solid #d1d5db",
                    padding: "8px",
                    backgroundColor: "#eff6ff",
                    fontWeight: "600",
                    color: "#2563eb",
                    textAlign: "left",
                    verticalAlign: "middle",
                    width: "12.5%",
                  }}
                >
                  Drop-off{"\u00A0"}Time
                </th>
                <td
                  style={{
                    border: "1px solid #d1d5db",
                    padding: "8px",
                    verticalAlign: "middle",
                    width: "12.5%",
                  }}
                >
                  {dropoff ? (
                    <span style={{ color: "#6b7280" }}>{dropoff.time}</span>
                  ) : (
                    <span style={{ color: "#9ca3af" }}>TBD</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Vehicle Details */}
        <div data-pdf-section="vehicle-details">
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "11px",
            marginTop: "12px",
            fontFamily: '"Segoe UI", Arial, sans-serif',
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  border: "1px solid #d1d5db",
                  padding: "8px",
                  backgroundColor: "#eff6ff",
                  fontWeight: "600",
                  color: "#2563eb",
                  textAlign: "left",
                  verticalAlign: "middle",
                  width: "12%",
                }}
              >
                Model
              </th>
              <th
                style={{
                  border: "1px solid #d1d5db",
                  padding: "8px",
                  backgroundColor: "#eff6ff",
                  fontWeight: "600",
                  color: "#2563eb",
                  textAlign: "left",
                  verticalAlign: "middle",
                  width: "8%",
                }}
              >
                Vehicles
              </th>
              <th
                style={{
                  border: "1px solid #d1d5db",
                  padding: "8px",
                  backgroundColor: "#eff6ff",
                  fontWeight: "600",
                  color: "#2563eb",
                  textAlign: "left",
                  verticalAlign: "middle",
                  width: "8%",
                }}
              >
                Capacity
              </th>
              <th
                style={{
                  border: "1px solid #d1d5db",
                  padding: "8px",
                  backgroundColor: "#eff6ff",
                  fontWeight: "600",
                  color: "#2563eb",
                  textAlign: "left",
                  verticalAlign: "middle",
                  width: "35%",
                }}
              >
                Description
              </th>
              <th
                style={{
                  border: "1px solid #d1d5db",
                  padding: "8px",
                  backgroundColor: "#eff6ff",
                  fontWeight: "600",
                  color: "#2563eb",
                  textAlign: "left",
                  verticalAlign: "middle",
                  width: "10%",
                }}
              >
                Mileage
              </th>
              <th
                style={{
                  border: "1px solid #d1d5db",
                  padding: "8px",
                  backgroundColor: "#eff6ff",
                  fontWeight: "600",
                  color: "#2563eb",
                  textAlign: "left",
                  verticalAlign: "middle",
                  width: "27%",
                }}
              >
                Total{"\u00A0"}Cost
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(parsedQuotation.bus_fleet_details?.buses) &&
              parsedQuotation.bus_fleet_details.buses.length > 0 ? (
              <>
                {/* Individual bus rows */}
                {parsedQuotation.bus_fleet_details.buses.map((bus, index) => (
                  <tr key={index}>
                    <td
                      style={{
                        border: "1px solid #d1d5db",
                        padding: "8px",
                        textAlign: "center",
                        verticalAlign: "middle",
                        color: "#374151",
                      }}
                    >
                      {bus?.bus_type_name || "N/A"}
                    </td>
                    <td
                      style={{
                        border: "1px solid #d1d5db",
                        padding: "8px",
                        textAlign: "center",
                        verticalAlign: "middle",
                        color: "#374151",
                      }}
                    >
                      {bus?.quantity || 0}x
                    </td>
                    <td
                      style={{
                        border: "1px solid #d1d5db",
                        padding: "8px",
                        textAlign: "center",
                        verticalAlign: "middle",
                        color: "#374151",
                      }}
                    >
                      {(bus?.seating_capacity || 0) * (bus?.quantity || 1)} seats
                    </td>
                    <td
                      style={{
                        border: "1px solid #d1d5db",
                        padding: "8px",
                        verticalAlign: "middle",
                      }}
                    >
                      <div style={{ fontSize: "11px", color: "#374151" }}>Route{"\u00A0"}Details</div>
                    </td>
                    <td
                      style={{
                        border: "1px solid #d1d5db",
                        padding: "8px",
                        verticalAlign: "middle",
                        color: "#374151",
                      }}
                    >
                      {(() => {
                        const additionalDistance = additionalCharges
                          .filter((charge) => charge.type === "additional_distance")
                          .reduce((sum, charge) => sum + (charge.distance || 0), 0);

                        if (additionalDistance > 0) {
                          return (
                            <div>
                              <div>{customerDistance.toFixed(2)} Km</div>
                              <div style={{ fontSize: "10px", color: "#7c3aed" }}>
                                +{additionalDistance} Km (Additional)
                              </div>
                              <div
                                style={{
                                  fontSize: "10px",
                                  fontWeight: "bold",
                                  borderTop: "1px solid #e5e7eb",
                                  paddingTop: "2px",
                                  marginTop: "2px",
                                }}
                              >
                                Total: {(customerDistance + additionalDistance).toFixed(2)} Km
                              </div>
                            </div>
                          );
                        }
                        return `${customerDistance.toFixed(2)} Km`;
                      })()}
                    </td>
                    <td
                      style={{
                        border: "1px solid #d1d5db",
                        padding: "8px",
                        verticalAlign: "middle",
                        textAlign: "right",
                      }}
                    >
                      <div style={{ fontSize: "11px", color: "#374151" }}>
                        LKR {(((bus?.hire_charge_per_bus || 0) + (bus?.fuel_cost_per_bus || 0)) * (bus?.quantity || 1)).toLocaleString()}
                      </div>
                    </td>
                  </tr>
                ))}

                {/* Additional Charges and Commission rows (fuel is now included per-bus) */}
                {(Number(parsedQuotation.total_additional_charges) || 0) > 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        border: "1px solid #d1d5db",
                        padding: "8px",
                        verticalAlign: "middle",
                        color: "#374151",
                        textAlign: "right",
                      }}
                    >
                       Additional{"\u00A0"}Charges
                    </td>
                    <td
                      style={{
                        border: "1px solid #d1d5db",
                        padding: "8px",
                        verticalAlign: "middle",
                        textAlign: "right",
                        color: "#374151",
                      }}
                    >
                      LKR {(Number(parsedQuotation.total_additional_charges) || 0).toLocaleString()}
                    </td>
                  </tr>
                )}
                {(Number(parsedQuotation.commission_pass_through_amount) || 0) > 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      style={{
                        border: "1px solid #d1d5db",
                        padding: "8px",
                        verticalAlign: "middle",
                        color: "#374151",
                        textAlign: "right",
                      }}
                    >
                      Commission ({parsedQuotation.commission_pass_through_amount ? 'Pass-through' : ''})
                    </td>
                    <td
                      style={{
                        border: "1px solid #d1d5db",
                        padding: "8px",
                        verticalAlign: "middle",
                        textAlign: "right",
                        color: "#374151",
                      }}
                    >
                      LKR {(Number(parsedQuotation.commission_pass_through_amount) || 0).toLocaleString()}
                    </td>
                  </tr>
                )}

                {/* Total Fleet Row */}
                <tr style={{ backgroundColor: "#f9fafb", fontWeight: "600" }}>
                  <td
                    style={{
                      border: "1px solid #d1d5db",
                      padding: "8px",
                      textAlign: "center",
                      verticalAlign: "middle",
                      color: "#374151",
                    }}
                  >
                     Total{"\u00A0"}Fleet
                  </td>
                  <td
                    style={{
                      border: "1px solid #d1d5db",
                      padding: "8px",
                      textAlign: "center",
                      verticalAlign: "middle",
                      color: "#374151",
                    }}
                  >
                    {parsedQuotation.bus_fleet_details.total_buses?.toString().padStart(2, "0")}
                  </td>
                  <td
                    style={{
                      border: "1px solid #d1d5db",
                      padding: "8px",
                      textAlign: "center",
                      verticalAlign: "middle",
                      color: "#374151",
                    }}
                  >
                    {parsedQuotation.bus_fleet_details.total_capacity} seats
                  </td>
                  <td
                    colSpan={2}
                    style={{
                      border: "1px solid #d1d5db",
                      padding: "8px",
                    }}
                  ></td>
                  <td
                    style={{
                      border: "1px solid #d1d5db",
                      padding: "8px",
                      verticalAlign: "middle",
                    }}
                  >
                    <div style={{ fontSize: "11px", color: "#374151", marginBottom: "4px" }}>
                      Subtotal:{"\u00A0"}LKR{" "}
                      {(() => {
                        const subtotal =
                          calculateFinalCustomerTotal(parsedQuotation) + (parsedQuotation.discount_amount_lkr || 0);
                        return subtotal.toLocaleString();
                      })()}
                    </div>

                    {(parsedQuotation.discount_amount_lkr || 0) > 0 && (
                      <div style={{ color: "#dc2626", fontSize: "11px", marginBottom: "4px" }}>
                        Discount: -LKR {parsedQuotation.discount_amount_lkr?.toLocaleString()}
                      </div>
                    )}
                    <div
                      style={{
                        fontWeight: "bold",
                        borderTop: "1px solid #d1d5db",
                        paddingTop: "4px",
                        marginTop: "4px",
                        fontSize: "12px",
                        color: "#374151",
                      }}
                    >
                       Final{"\u00A0"}Total:{"\u00A0"}LKR{"\u00A0"}{calculateFinalCustomerTotal(parsedQuotation).toLocaleString()}
                    {parsedQuotation.number_of_buses > 1 && (
                        <div
                          style={{
                            fontSize: "10px",
                            color: "#6b7280",
                            fontWeight: "normal",
                            marginTop: "2px",
                          }}
                        >
                          Per{"\u00A0"}Bus:{"\u00A0"}LKR{" "}
                          {(
                            calculateFinalCustomerTotal(parsedQuotation) / parsedQuotation.number_of_buses
                          ).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              </>
            ) : (
              /* Single bus row */
              <tr>
                <td
                  style={{
                    border: "1px solid #d1d5db",
                    padding: "8px",
                    textAlign: "center",
                    verticalAlign: "middle",
                    color: "#374151",
                  }}
                >
                  {parsedQuotation.bus_type}
                </td>
                <td
                  style={{
                    border: "1px solid #d1d5db",
                    padding: "8px",
                    textAlign: "center",
                    verticalAlign: "middle",
                    color: "#374151",
                  }}
                >
                  {parsedQuotation.number_of_buses.toString().padStart(2, "0")}
                </td>
                <td
                  style={{
                    border: "1px solid #d1d5db",
                    padding: "8px",
                    textAlign: "center",
                    verticalAlign: "middle",
                    color: "#374151",
                  }}
                >
                  {parsedQuotation.seating_capacity || 54} seats
                </td>
                <td
                  style={{
                    border: "1px solid #d1d5db",
                    padding: "8px",
                    verticalAlign: "middle",
                  }}
                >
                   <div style={{ fontSize: "11px", color: "#374151" }}>Route{"\u00A0"}Details</div>
                </td>
                <td
                  style={{
                    border: "1px solid #d1d5db",
                    padding: "8px",
                    verticalAlign: "middle",
                    color: "#374151",
                  }}
                >
                  {(() => {
                    const additionalDistance = additionalCharges
                      .filter((charge) => charge.type === "additional_distance")
                      .reduce((sum, charge) => sum + (charge.distance || 0), 0);

                    if (additionalDistance > 0) {
                      return (
                        <div>
                          <div>{customerDistance.toFixed(2)} Km</div>
                          <div style={{ fontSize: "10px", color: "#7c3aed" }}>
                            +{additionalDistance} Km (Additional)
                          </div>
                          <div
                            style={{
                              fontSize: "10px",
                              fontWeight: "bold",
                              borderTop: "1px solid #e5e7eb",
                              paddingTop: "2px",
                              marginTop: "2px",
                            }}
                          >
                            Total: {(customerDistance + additionalDistance).toFixed(2)} Km
                          </div>
                        </div>
                      );
                    }
                    return `${customerDistance.toFixed(2)} Km`;
                  })()}
                </td>
                <td
                  style={{
                    border: "1px solid #d1d5db",
                    padding: "8px",
                    verticalAlign: "middle",
                  }}
                >
                  <div style={{ fontSize: "11px", color: "#374151", marginBottom: "4px" }}>
                    Subtotal:{"\u00A0"}LKR{" "}
                     {(() => {
                       const subtotal =
                         calculateFinalCustomerTotal(parsedQuotation) + (parsedQuotation.discount_amount_lkr || 0);
                       return subtotal.toLocaleString();
                     })()}
                   </div>

                   {(parsedQuotation.discount_amount_lkr || 0) > 0 && (
                     <div style={{ color: "#dc2626", fontSize: "11px", marginBottom: "4px" }}>
                       Discount:{"\u00A0"}-LKR{"\u00A0"}{parsedQuotation.discount_amount_lkr?.toLocaleString()}
                    </div>
                  )}
                  <div
                    style={{
                      fontWeight: "bold",
                      borderTop: "1px solid #d1d5db",
                      paddingTop: "4px",
                      marginTop: "4px",
                      fontSize: "12px",
                      color: "#374151",
                    }}
                  >
                     Final{"\u00A0"}Total:{"\u00A0"}LKR{"\u00A0"}{calculateFinalCustomerTotal(parsedQuotation).toLocaleString()}
                    {parsedQuotation.number_of_buses > 1 && (
                       <div
                         style={{
                           fontSize: "10px",
                           color: "#6b7280",
                           fontWeight: "normal",
                           marginTop: "2px",
                         }}
                       >
                         Per{"\u00A0"}Bus:{"\u00A0"}LKR{" "}
                        {(
                          calculateFinalCustomerTotal(parsedQuotation) / parsedQuotation.number_of_buses
                        ).toLocaleString()}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>

        {/* Route Information */}
        {intermediateStops.length > 0 && (
          <div data-pdf-section="route-info" className="mt-3 mb-3">
            <div className="text-sm font-semibold text-blue-600 mb-2">Route{"\u00A0"}Details</div>
            <div className="bg-gray-50 p-3 rounded border">
              <div className="flex items-center gap-2 text-sm mb-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
        <span className="font-medium text-green-700">Start:{"\u00A0"}</span>
                <span className="text-gray-800" style={{ whiteSpace: "pre-wrap" }}>{parsedQuotation.pickup_location}</span>
              </div>

              {intermediateStops.map((stop: any, index: number) => (
                <div key={index} className="flex items-center gap-2 text-sm mb-2 ml-4">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span className="font-medium text-blue-600">Stop{"\u00A0"}{index + 1}:{"\u00A0"}</span>
                  <span className="text-gray-800" style={{ whiteSpace: "pre-wrap" }}>{stop.location}</span>
                </div>
              ))}

              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="font-medium text-red-700">End:{"\u00A0"}</span>
                <span className="text-gray-800" style={{ whiteSpace: "pre-wrap" }}>{parsedQuotation.drop_location}</span>
              </div>
            </div>
          </div>
        )}

        {/* Extra Charges */}
        <div data-pdf-section="extra-charges">
        <div className="text-sm mt-3 mb-1 font-semibold text-blue-600">Extra{"\u00A0"}Charges</div>
        <div className="text-xs leading-tight text-gray-800" style={{ whiteSpace: "pre-wrap", overflowWrap: "break-word" }}>
          Exceeding Per Kilometer will be charged Rs {rateCard?.exceeding_km_rate_lkr?.toLocaleString() || "300.00"}

          {/* Additional Distance Charges */}
          {additionalCharges.filter((charge) => charge.type === "additional_distance").length > 0 && (
            <>
              <br />
              <strong>Additional Distance Charges:</strong>
              <br />
              {additionalCharges
                .filter((charge) => charge.type === "additional_distance")
                .map((charge, index) => (
                  <span key={index}>
                    Additional {charge.distance || 0} km: Rs {charge.amount?.toLocaleString() || "0.00"}
                    {charge.reason && <> ({charge.reason})</>}
                    <br />
                  </span>
                ))}
            </>
          )}
        </div>
        </div>

        {/* Payment Info */}
        <div data-pdf-section="payment-info">
          <div className="text-sm mt-3 mb-1 font-semibold text-blue-600">Payment{"\u00A0"}Information</div>
           <div className="text-xs leading-tight text-gray-800">
              Account{"\u00A0"}No.{"\u00A0"}:{"\u00A0"}{(quotation as any).payment_account_no || "1001077213"}
              <br />
              Account{"\u00A0"}Name{"\u00A0"}:{"\u00A0"}{(quotation as any).payment_account_name || "NCG Holding (Pvt) Ltd"}
              <br />
              Bank{"\u00A0"}Name{"\u00A0"}:{"\u00A0"}{(quotation as any).payment_bank_name || "Commercial Bank - Nugegoda"}
          </div>
        </div>

        {/* Footer for Page 1 */}
        <div data-pdf-section="footer-p1" className="mt-4 text-xs text-gray-500 border-t border-gray-200 pt-2 text-center" style={{ whiteSpace: "pre-wrap" }}>
          For{"\u00A0"}more{"\u00A0"}information{"\u00A0"}call{"\u00A0"}<strong>074{"\u00A0"}289{"\u00A0"}3612</strong>
          <br />©{"\u00A0"}2025{"\u00A0"}NCG{"\u00A0"}Holding{"\u00A0"}(Pvt){"\u00A0"}Ltd.{"\u00A0"}All{"\u00A0"}Rights{"\u00A0"}Reserved.
        </div>
      </div>

      {/* ===== PAGE 2: Terms & Conditions ===== */}
      <div
        data-pdf-page="2"
        className="mx-auto bg-white shadow-lg relative"
        style={{
          width: "210mm",
          maxWidth: "210mm",
          padding: "15mm",
          boxSizing: "border-box",
          pageBreakBefore: "always",
          marginTop: "10px",
          whiteSpace: "pre-wrap",
          overflowWrap: "break-word",
          wordWrap: "break-word",
        }}
      >
        {/* Mini Header for Page 2 */}
        <div data-pdf-section="header-p2" className="flex justify-between items-start mb-4">
          <div className="w-24">
            <img
               src="/lovable-uploads/ncg-holdings-logo.png"
              alt="NCG Holdings Logo"
              className="max-w-full h-auto"
            />
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-blue-600">
               Quotation{"\u00A0"}No:{"\u00A0"}{parsedQuotation.quotation_no}
            </div>
            <div className="text-xs text-gray-500">
              Terms &amp; Conditions
            </div>
          </div>
        </div>

        {/* Terms & Conditions */}
        <div data-pdf-section="terms-conditions">
          <div className="text-sm mt-3 mb-1 font-semibold text-blue-600">Terms{"\u00A0"}and{"\u00A0"}Conditions</div>
          <div className="text-xs leading-tight text-gray-800" style={{ whiteSpace: "pre-wrap", overflowWrap: "break-word" }}>
            This quotation is valid for 7 days from the date of issue. Bookings must be confirmed within 3 working days to avoid inconvenience.
            <br />
            <br />
            <strong>Upon confirmation of hire:</strong> 50% advance payment of the total hire cost must be made. The balance payment must be settled before the hire date.
            <br />
            <br />
            <strong>Cancellation Policy:</strong>
            <br />
            • If cancelled 14 days or more before the hire date: 10% cancellation fee (based on the full hire rate) will be charged. The balance of any advance payment will be refunded.
            <br />
            • If cancelled within 14 days of the hire date: 20% cancellation fee (based on the full hire rate) will be charged. The balance of any advance payment will be refunded.
            <br />
            <br />
            <strong>Excess Mileage:</strong> A flat charge applies for the first 5 km exceeding the agreed destination. From the 6th km onwards, an additional per-km charge will be applied.
            <br />
            <br />
            Any change in destination must be approved in writing by a higher official of NCG Express (Private) Limited.
            <br />
            <br />
            <strong>Garbage Penalty (per bus):</strong>
            <br />
            • Rs. 5,000 for Leyland and D7 models.
            <br />
            • Rs. 10,000 for Super Luxury models.
            <br />
            <br />
            <strong>Damage Policy:</strong> If the bus is damaged, the customer will be charged twice the actual repair cost required to restore it to original condition.
            <br />
            <br />
            For hires of more than one day, customers must provide food and accommodation for the driver. For further information, please contact us at 074 289 3612.
            <br />
            <br />
            <strong>Customer Responsibilities:</strong>
            <br />
            • The customer is required to pre-check and verify the bus mileage before the hire, as this is a compulsory procedure.
            <br />
            • Google Maps mileage may differ from the actual mileage, and customers must rely on the verified mileage recorded at the start of the hire.
            <br />
            • Alcohol consumption is strictly prohibited on the bus, and any violation may result in immediate termination of service without refund.
            <br />
            • Please take a photo of the bus odometer at the start and at the end of the trip to record the actual kilometers traveled. If the actual kilometers exceed the quoted kilometers, you will need to pay the additional charges to NCG.
            <br />
            <br />
          </div>
        </div>

        {/* Footer */}
        <div data-pdf-section="footer" className="mt-4 text-xs text-gray-500 border-t border-gray-200 pt-2 text-center" style={{ whiteSpace: "pre-wrap" }}>
          For{"\u00A0"}more{"\u00A0"}information{"\u00A0"}call{"\u00A0"}<strong>074{"\u00A0"}289{"\u00A0"}3612</strong>
          <br />©{"\u00A0"}2025{"\u00A0"}NCG{"\u00A0"}Express.{"\u00A0"}All{"\u00A0"}Rights{"\u00A0"}Reserved.
        </div>
      </div>
    </div>
  );
}
