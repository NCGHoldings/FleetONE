import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

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
  commission_amount?: number;
  commission_pass_through_amount?: number;
  discount_amount_lkr?: number;
  discount_type?: string;
  intermediate_stops?: string;
  route_description?: string;
  valid_until?: string;
  created_at: string;
  approval_status?: 'pending' | 'approved' | 'rejected';
  discount_percentage?: number;
  additional_charges?: Array<{ type: string; amount: number; reason?: string }> | string;
  total_additional_charges?: number;
}

interface Props {
  quotation: QuotationData;
  className?: string;
}

export function QuotationPreview({ quotation, className = "" }: Props) {
  const [rateCard, setRateCard] = useState<any>(null);

  useEffect(() => {
    const fetchRateCard = async () => {
      try {
        // First get the bus type ID from bus_types table
        const { data: busTypes } = await supabase
          .from('bus_types')
          .select('id')
          .eq('name', quotation.bus_type)
          .single();

        if (busTypes) {
          // Then fetch the rate card for this bus type
          const { data: rateData } = await supabase
            .from('hire_rate_cards')
            .select('*')
            .eq('bus_type_id', busTypes.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          if (rateData) {
            setRateCard(rateData);
          }
        }
      } catch (error) {
        console.error('Error fetching rate card:', error);
      }
    };

    fetchRateCard();
  }, [quotation.bus_type]);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: format(date, 'yyyy-MM-dd'),
      time: format(date, 'HH:mm a')
    };
  };

  // Calculate the final customer total (what customer pays) - matches CostBreakdown calculation
  const calculateFinalCustomerTotal = (quotation: QuotationData): number => {
    const grossRevenue = quotation.gross_revenue || 0;
    const fuelCost = quotation.fuel_cost_fuel_only || 0;
    const commissionPassThrough = quotation.commission_pass_through_amount || 0;
    const additionalCharges = quotation.total_additional_charges || 0;
    const discount = quotation.discount_amount_lkr || 0;
    
    // This matches the calculation: Gross Revenue + Fuel + Commission Pass-through + Additional Charges - Discount
    return grossRevenue + fuelCost + commissionPassThrough + additionalCharges - discount;
  };

  const pickup = formatDateTime(quotation.pickup_datetime);
  const dropoff = quotation.drop_datetime ? formatDateTime(quotation.drop_datetime) : null;
  
  // Calculate customer pickup to drop distance only (excluding parking distances)
  const customerDistance = quotation.km_trip || 0;

  // Parse intermediate stops for display
  let intermediateStops = [];
  try {
    if (quotation.intermediate_stops) {
      intermediateStops = JSON.parse(quotation.intermediate_stops);
    }
  } catch (e) {
    console.warn('Failed to parse intermediate stops:', e);
  }

  // Parse additional charges for display
  let additionalCharges = [];
  try {
    if (quotation.additional_charges) {
      if (typeof quotation.additional_charges === 'string') {
        additionalCharges = JSON.parse(quotation.additional_charges);
      } else {
        additionalCharges = quotation.additional_charges;
      }
    }
  } catch (e) {
    console.warn('Failed to parse additional charges:', e);
  }

  // Build route description
  let routeDescription = `From ${quotation.pickup_location}`;
  if (intermediateStops.length > 0) {
    intermediateStops.forEach((stop: any) => {
      if (stop.location) {
        routeDescription += ` → ${stop.location}`;
      }
    });
  }
  routeDescription += ` → ${quotation.drop_location}`;

  // Check if DRAFT watermark should be shown
  const showDraftWatermark = quotation.approval_status === 'pending' && (quotation.discount_percentage || 0) > 0;

  return (
    <div className={`bg-white text-black font-sans ${className}`} style={{ 
      fontFamily: '"Segoe UI", Arial, sans-serif',
      background: '#f5f5f5',
      margin: 0,
      padding: '10px'
    }}>
      <div className="mx-auto bg-white shadow-lg relative" style={{
        width: '210mm',
        minHeight: '297mm',
        maxWidth: '210mm',
        padding: '15mm',
        boxSizing: 'border-box'
      }}>
        
        {/* DRAFT Watermark */}
        {showDraftWatermark && (
          <div 
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
            style={{
              background: 'rgba(0, 0, 0, 0.05)',
            }}
          >
            <div 
              className="text-gray-400 font-bold select-none"
              style={{
                fontSize: '120px',
                transform: 'rotate(-45deg)',
                opacity: 0.3,
                letterSpacing: '20px',
                textShadow: '0 0 10px rgba(0,0,0,0.1)',
                fontFamily: 'Arial, sans-serif'
              }}
            >
              DRAFT
            </div>
          </div>
        )}
        
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          {/* Logo */}
          <div className="w-32">
            <img 
              src="/lovable-uploads/52e834c4-cfda-4ea3-9da7-aac1f23e1162.png" 
              alt="NCG Express Logo" 
              className="max-w-full h-auto"
            />
          </div>
          
          {/* Right Block */}
          <div className="text-right" style={{ maxWidth: '45%' }}>
            <div className="bg-blue-600 text-white font-bold text-lg px-4 py-2 inline-block mb-2 w-full">
              Quotation Special Hire
            </div>
            <div className="text-sm leading-tight text-black">
              No. 157 Y, Kabellaowita, Weniwelkola,<br />
              Polgasowita.<br />
              074 289 3612<br />
              specialhire.ncgexpress@ncg.lk
            </div>
            <div className="text-xs mt-1 text-gray-700">
              Quotation Generated on {format(new Date(quotation.created_at), 'dd/MM/yyyy, hh:mm a')}<br />
              Quotation No: {quotation.quotation_no}
            </div>
          </div>
        </div>

        {/* Customer Details */}
        <div className="mt-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <span className="font-semibold text-blue-600 min-w-[80px]">Company Name:</span>
              <span className="text-gray-800">{quotation.company_name || "NCG Express"}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-blue-600 min-w-[80px]">Contact Number:</span>
              <span className="text-gray-800">{quotation.customer_phone}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-blue-600 min-w-[80px]">Customer Name:</span>
              <span className="text-gray-800">{quotation.customer_name}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-blue-600 min-w-[80px]">Email Address:</span>
              <span className="text-gray-800">{quotation.customer_email || "N/A"}</span>
            </div>
          </div>
        </div>

        {/* Pickup Details */}
        <div style={{ marginTop: '12px' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse', 
            fontSize: '11px',
            fontFamily: '"Segoe UI", Arial, sans-serif'
          }}>
            <tbody>
              <tr>
                <th style={{ 
                  border: '1px solid #d1d5db', 
                  padding: '8px', 
                  backgroundColor: '#eff6ff', 
                  fontWeight: '600', 
                  color: '#2563eb', 
                  textAlign: 'left', 
                  verticalAlign: 'middle',
                  width: '25%'
                }}>Pick-up Location</th>
                <td style={{ 
                  border: '1px solid #d1d5db', 
                  padding: '8px', 
                  verticalAlign: 'middle',
                  color: '#374151'
                }} colSpan={3}>{quotation.pickup_location}</td>
              </tr>
              <tr>
                <th style={{ 
                  border: '1px solid #d1d5db', 
                  padding: '8px', 
                  backgroundColor: '#eff6ff', 
                  fontWeight: '600', 
                  color: '#2563eb', 
                  textAlign: 'left', 
                  verticalAlign: 'middle',
                  width: '12.5%'
                }}>Pick-up Date</th>
                <td style={{ 
                  border: '1px solid #d1d5db', 
                  padding: '8px', 
                  verticalAlign: 'middle',
                  width: '12.5%'
                }}>
                  <span style={{ fontWeight: '500', color: '#374151' }}>{pickup.date}</span>
                </td>
                <th style={{ 
                  border: '1px solid #d1d5db', 
                  padding: '8px', 
                  backgroundColor: '#eff6ff', 
                  fontWeight: '600', 
                  color: '#2563eb', 
                  textAlign: 'left', 
                  verticalAlign: 'middle',
                  width: '12.5%'
                }}>Pick-up Time</th>
                <td style={{ 
                  border: '1px solid #d1d5db', 
                  padding: '8px', 
                  verticalAlign: 'middle',
                  width: '12.5%'
                }}>
                  <span style={{ color: '#6b7280' }}>{pickup.time}</span>
                </td>
              </tr>
              <tr>
                <th style={{ 
                  border: '1px solid #d1d5db', 
                  padding: '8px', 
                  backgroundColor: '#eff6ff', 
                  fontWeight: '600', 
                  color: '#2563eb', 
                  textAlign: 'left', 
                  verticalAlign: 'middle'
                }}>Drop-off Location</th>
                <td style={{ 
                  border: '1px solid #d1d5db', 
                  padding: '8px', 
                  verticalAlign: 'middle',
                  color: '#374151'
                }} colSpan={3}>{quotation.drop_location}</td>
              </tr>
              <tr>
                <th style={{ 
                  border: '1px solid #d1d5db', 
                  padding: '8px', 
                  backgroundColor: '#eff6ff', 
                  fontWeight: '600', 
                  color: '#2563eb', 
                  textAlign: 'left', 
                  verticalAlign: 'middle',
                  width: '12.5%'
                }}>Drop-off Date</th>
                <td style={{ 
                  border: '1px solid #d1d5db', 
                  padding: '8px', 
                  verticalAlign: 'middle',
                  width: '12.5%'
                }}>
                  {dropoff ? (
                    <span style={{ fontWeight: '500', color: '#374151' }}>{dropoff.date}</span>
                  ) : (
                    <span style={{ color: '#9ca3af' }}>TBD</span>
                  )}
                </td>
                <th style={{ 
                  border: '1px solid #d1d5db', 
                  padding: '8px', 
                  backgroundColor: '#eff6ff', 
                  fontWeight: '600', 
                  color: '#2563eb', 
                  textAlign: 'left', 
                  verticalAlign: 'middle',
                  width: '12.5%'
                }}>Drop-off Time</th>
                <td style={{ 
                  border: '1px solid #d1d5db', 
                  padding: '8px', 
                  verticalAlign: 'middle',
                  width: '12.5%'
                }}>
                  {dropoff ? (
                    <span style={{ color: '#6b7280' }}>{dropoff.time}</span>
                  ) : (
                    <span style={{ color: '#9ca3af' }}>TBD</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Vehicle Details */}
        <table style={{ 
          width: '100%', 
          borderCollapse: 'collapse', 
          fontSize: '11px',
          marginTop: '12px',
          fontFamily: '"Segoe UI", Arial, sans-serif'
        }}>
          <thead>
            <tr>
              <th style={{ 
                border: '1px solid #d1d5db', 
                padding: '8px', 
                backgroundColor: '#eff6ff', 
                fontWeight: '600', 
                color: '#2563eb', 
                textAlign: 'left', 
                verticalAlign: 'middle',
                width: '12%'
              }}>Model</th>
              <th style={{ 
                border: '1px solid #d1d5db', 
                padding: '8px', 
                backgroundColor: '#eff6ff', 
                fontWeight: '600', 
                color: '#2563eb', 
                textAlign: 'left', 
                verticalAlign: 'middle',
                width: '8%'
              }}>Vehicles</th>
              <th style={{ 
                border: '1px solid #d1d5db', 
                padding: '8px', 
                backgroundColor: '#eff6ff', 
                fontWeight: '600', 
                color: '#2563eb', 
                textAlign: 'left', 
                verticalAlign: 'middle',
                width: '8%'
              }}>Capacity</th>
              <th style={{ 
                border: '1px solid #d1d5db', 
                padding: '8px', 
                backgroundColor: '#eff6ff', 
                fontWeight: '600', 
                color: '#2563eb', 
                textAlign: 'left', 
                verticalAlign: 'middle',
                width: '35%'
              }}>Description</th>
              <th style={{ 
                border: '1px solid #d1d5db', 
                padding: '8px', 
                backgroundColor: '#eff6ff', 
                fontWeight: '600', 
                color: '#2563eb', 
                textAlign: 'left', 
                verticalAlign: 'middle',
                width: '10%'
              }}>Mileage</th>
              <th style={{ 
                border: '1px solid #d1d5db', 
                padding: '8px', 
                backgroundColor: '#eff6ff', 
                fontWeight: '600', 
                color: '#2563eb', 
                textAlign: 'left', 
                verticalAlign: 'middle',
                width: '27%'
              }}>Total Cost</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ 
                border: '1px solid #d1d5db', 
                padding: '8px', 
                textAlign: 'center', 
                verticalAlign: 'middle',
                color: '#374151'
              }}>{quotation.bus_type}</td>
              <td style={{ 
                border: '1px solid #d1d5db', 
                padding: '8px', 
                textAlign: 'center', 
                verticalAlign: 'middle',
                color: '#374151'
              }}>{quotation.number_of_buses.toString().padStart(2, '0')}</td>
              <td style={{ 
                border: '1px solid #d1d5db', 
                padding: '8px', 
                textAlign: 'center', 
                verticalAlign: 'middle',
                color: '#374151'
              }}>{quotation.seating_capacity || 54}</td>
              <td style={{ 
                border: '1px solid #d1d5db', 
                padding: '8px', 
                verticalAlign: 'middle'
              }}>
                <div style={{ fontSize: '11px', color: '#374151' }}>
                  Route Details
                </div>
              </td>
              <td style={{ 
                border: '1px solid #d1d5db', 
                padding: '8px', 
                verticalAlign: 'middle',
                color: '#374151'
              }}>{customerDistance.toFixed(2)} Km</td>
              <td style={{ 
                border: '1px solid #d1d5db', 
                padding: '8px', 
                verticalAlign: 'middle'
              }}>
                <div style={{ fontSize: '11px', color: '#374151', marginBottom: '4px' }}>
                  Hire Charges: LKR {((quotation.gross_revenue || 0) + (quotation.total_additional_charges || 0) + (quotation.fuel_cost_fuel_only || 0) + (quotation.commission_pass_through_amount || 0)).toLocaleString()}
                </div>
                {(quotation.discount_amount_lkr || 0) > 0 && (
                  <div style={{ color: '#dc2626', fontSize: '11px', marginBottom: '4px' }}>
                    Discount: -LKR {quotation.discount_amount_lkr?.toLocaleString()}
                  </div>
                )}
                <div style={{ 
                  fontWeight: 'bold', 
                  borderTop: '1px solid #d1d5db', 
                  paddingTop: '4px', 
                  marginTop: '4px', 
                  fontSize: '12px',
                  color: '#374151'
                }}>
                  Final Total: LKR {calculateFinalCustomerTotal(quotation).toLocaleString()}
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Route Information */}
        {intermediateStops.length > 0 && (
          <div className="mt-3 mb-3">
            <div className="text-sm font-semibold text-blue-600 mb-2">Route Details</div>
            <div className="bg-gray-50 p-3 rounded border">
              <div className="flex items-center gap-2 text-sm mb-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="font-medium text-green-700">Start:</span>
                <span className="text-gray-800">{quotation.pickup_location}</span>
              </div>
              
              {intermediateStops.map((stop: any, index: number) => (
                <div key={index} className="flex items-center gap-2 text-sm mb-2 ml-4">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span className="font-medium text-blue-600">Stop {index + 1}:</span>
                  <span className="text-gray-800">{stop.location}</span>
                </div>
              ))}
              
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="font-medium text-red-700">End:</span>
                <span className="text-gray-800">{quotation.drop_location}</span>
              </div>
            </div>
          </div>
        )}

        {/* Extra Charges */}
        <div className="text-sm mt-3 mb-1 font-semibold text-blue-600">Extra Charges and Route Info</div>
        <div className="text-xs leading-tight text-gray-800">
          {rateCard ? (
            <>
              Exceeding Per Kilometer will be charged Rs {rateCard.exceeding_km_rate_lkr?.toLocaleString() || '300.00'}<br />
              Exceeding per hour will be charged Rs {rateCard.overtime_rate_lkr_per_hour?.toLocaleString() || '1500.00'}<br />
              {rateCard.overnight_charge_lkr_per_day > 0 && (
                <>Overnight charge per day: Rs {rateCard.overnight_charge_lkr_per_day.toLocaleString()}<br /></>
              )}
              Route - Normal Way
            </>
          ) : (
            <>
              Exceeding Per Kilometer will be charged Rs 300.00<br />
              Exceeding per hour will be charged Rs 1500.00<br />
              Route - Normal Way
            </>
          )}
        </div>

        {/* Payment Info */}
        <div className="text-sm mt-3 mb-1 font-semibold text-blue-600">Payment Information</div>
        <div className="text-xs leading-tight text-gray-800">
          Account No. : 1934 1401 7578<br />
          Account Name : NCG EXPRESS (PVT) LTD<br />
          Bank Name : Sampath Bank, Nugegoda
        </div>

        {/* Terms & Conditions */}
        <div className="text-sm mt-3 mb-1 font-semibold text-blue-600">Terms and Conditions</div>
        <div className="text-xs leading-tight text-gray-800">
          This quotation is valid for 7 days. The booking must be confirmed within 3 working days in order to avoid any inconvenience.<br /><br />
          
          Once we receive confirmation of the hire, kindly arrange 50% payment in advance. The balance payment should be arranged before the hire date.<br /><br />
          
          Any cancellations are compel to hold 10% from the advance payment. No extra charges will be incurred for the first 5 Km exceeding the due destination. There will be an additional charge from the 6th Km onwards.<br /><br />
          
          Any changes in the destination may require written permission from a higher official of NCG EXPRESS (PRIVATE) LIMITED.<br /><br />
          
          Note: If the hire is more than a day, we request that you provide food and accommodation to the driver. Please do not hesitate to contact us on 074 289 3612 for further information.
        </div>

        {/* Footer */}
        <div className="mt-4 text-xs text-gray-500 border-t border-gray-200 pt-2 text-center">
          For more information call <strong>074 289 3612</strong><br />
          © 2025 NCG Express. All Rights Reserved.
        </div>

      </div>
    </div>
  );
}