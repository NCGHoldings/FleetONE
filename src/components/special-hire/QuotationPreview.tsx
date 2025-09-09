import React from 'react';
import { format } from 'date-fns';

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
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: format(date, 'yyyy-MM-dd'),
      time: format(date, 'HH:mm a')
    };
  };

  // Calculate the final customer total (what customer pays)
  const calculateFinalCustomerTotal = (quotation: QuotationData): number => {
    const hireCharges = quotation.gross_revenue || 0;
    const serviceCharges = quotation.fuel_cost_fuel_only || 0;
    const commission = quotation.commission_pass_through_amount || 0;
    const discount = quotation.discount_amount_lkr || 0;
    const additionalCharges = quotation.total_additional_charges || 0;
    
    return hireCharges + serviceCharges + commission + additionalCharges - discount;
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
      padding: '30px'
    }}>
      <div className="max-w-4xl mx-auto bg-white p-10 shadow-lg relative">
        
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
        <div className="flex justify-between items-start mb-8">
          {/* Logo */}
          <div className="w-48">
            <img 
              src="/lovable-uploads/52e834c4-cfda-4ea3-9da7-aac1f23e1162.png" 
              alt="NCG Express Logo" 
              className="max-w-full h-auto"
            />
          </div>
          
          {/* Right Block */}
          <div className="text-right max-w-lg">
            <div className="bg-blue-600 text-white font-bold text-xl px-8 py-4 inline-block mb-3 w-full">
              Quotation Special Hire
            </div>
            <div className="text-base leading-relaxed text-black">
              No. 157 Y, Kabellaowita, Weniwelkola,<br />
              Polgasowita.<br />
              074 289 3612<br />
              specialhire.ncgexpress@ncg.lk
            </div>
            <div className="text-sm mt-2 text-gray-700">
              Quotation Generated on {format(new Date(quotation.created_at), 'EEEE do MMMM yyyy, hh:mm:ss a')}<br />
              Quotation No: {quotation.quotation_no}
            </div>
          </div>
        </div>

        {/* Customer Details */}
        <div className="mt-5">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-blue-600 min-w-[120px]">Company Name:</span>
              <span className="text-gray-800">{quotation.company_name || "NCG Express"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-blue-600 min-w-[120px]">Contact Number:</span>
              <span className="text-gray-800">{quotation.customer_phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-blue-600 min-w-[120px]">Customer Name:</span>
              <span className="text-gray-800">{quotation.customer_name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-blue-600 min-w-[120px]">Email Address:</span>
              <span className="text-gray-800">{quotation.customer_email || "N/A"}</span>
            </div>
          </div>
        </div>

        {/* Pickup Details */}
        <div className="mt-5">
          <table className="w-full border-collapse text-sm">
            <tbody>
              <tr>
                <th className="border border-gray-300 p-2 bg-blue-50 font-semibold text-blue-600 text-left">Pick-up Location</th>
                <td className="border border-gray-300 p-2">{quotation.pickup_location}</td>
              </tr>
              <tr>
                <th className="border border-gray-300 p-2 bg-blue-50 font-semibold text-blue-600 text-left">Pick-up Date Time</th>
                <td className="border border-gray-300 p-2">{pickup.date} {pickup.time}</td>
              </tr>
              <tr>
                <th className="border border-gray-300 p-2 bg-blue-50 font-semibold text-blue-600 text-left">Drop-off Location</th>
                <td className="border border-gray-300 p-2">{quotation.drop_location}</td>
              </tr>
              <tr>
                <th className="border border-gray-300 p-2 bg-blue-50 font-semibold text-blue-600 text-left">Drop-off Date Time</th>
                <td className="border border-gray-300 p-2">{dropoff ? `${dropoff.date} ${dropoff.time}` : 'TBD'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Vehicle Details */}
        <table className="w-full border-collapse text-sm mt-5">
          <thead>
            <tr>
              <th className="border border-gray-300 p-2 bg-blue-50 font-semibold text-blue-600 text-left">Model</th>
              <th className="border border-gray-300 p-2 bg-blue-50 font-semibold text-blue-600 text-left">No. of Vehicles</th>
              <th className="border border-gray-300 p-2 bg-blue-50 font-semibold text-blue-600 text-left">Seating Capacity</th>
              <th className="border border-gray-300 p-2 bg-blue-50 font-semibold text-blue-600 text-left">Description</th>
              <th className="border border-gray-300 p-2 bg-blue-50 font-semibold text-blue-600 text-left">Mileage</th>
              <th className="border border-gray-300 p-2 bg-blue-50 font-semibold text-blue-600 text-left">Total Cost</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-300 p-2">{quotation.bus_type}</td>
              <td className="border border-gray-300 p-2">{quotation.number_of_buses.toString().padStart(2, '0')}</td>
              <td className="border border-gray-300 p-2">{quotation.seating_capacity || 54}</td>
              <td className="border border-gray-300 p-2">
                <div className="space-y-1">
                  <div className="flex items-center text-sm">
                    <span className="text-green-600 font-medium">Pickup:</span>
                    <span className="ml-2">{quotation.pickup_location}</span>
                  </div>
                  {intermediateStops.length > 0 && (
                    <div className="flex items-start text-sm">
                      <span className="text-blue-600 font-medium">Stops:</span>
                      <div className="ml-2 flex flex-col">
                        {intermediateStops.map((stop: any, index: number) => (
                          <span key={index} className="text-xs text-gray-600">• {stop.location}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center text-sm">
                    <span className="text-red-600 font-medium">Drop:</span>
                    <span className="ml-2">{quotation.drop_location}</span>
                  </div>
                </div>
              </td>
              <td className="border border-gray-300 p-2">{customerDistance.toFixed(2)} Km</td>
              <td className="border border-gray-300 p-2">
                <div>Hire Charges: LKR {((quotation.gross_revenue || 0) + (quotation.total_additional_charges || 0)).toLocaleString()}</div>
                <div>Service Charge: LKR {((quotation.fuel_cost_fuel_only || 0) + (quotation.commission_pass_through_amount || 0)).toLocaleString()}</div>
                {(quotation.discount_amount_lkr || 0) > 0 && (
                  <div className="text-red-600">Discount: -LKR {quotation.discount_amount_lkr?.toLocaleString()}</div>
                )}
                <div className="font-bold border-t pt-1 mt-1 text-lg">Final Total: LKR {calculateFinalCustomerTotal(quotation).toLocaleString()}</div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Extra Charges */}
        <div className="text-base mt-6 mb-2 font-semibold text-blue-600">Extra Charges and Route Info</div>
        <div className="text-sm leading-relaxed text-gray-800">
          Exceeding Per Kilometer will be charged Rs 300.00<br />
          Exceeding per hour will be charged Rs 1500.00<br />
          Route - Normal Way
        </div>

        {/* Payment Info */}
        <div className="text-base mt-6 mb-2 font-semibold text-blue-600">Payment Information</div>
        <div className="text-sm leading-relaxed text-gray-800">
          Account No. : 1934 1401 7578<br />
          Account Name : NCG EXPRESS (PVT) LTD<br />
          Bank Name : Sampath Bank, Nugegoda
        </div>

        {/* Terms & Conditions */}
        <div className="text-base mt-6 mb-2 font-semibold text-blue-600">Terms and Conditions</div>
        <div className="text-sm leading-relaxed text-gray-800">
          This quotation is valid for 7 days.<br /><br />
          
          The booking must be confirmed within 3 working days in order to avoid any inconvenience.<br /><br />
          
          Once we receive confirmation of the hire, kindly arrange 50% payment in advance. The balance payment should be arranged before the hire date.<br /><br />
          
          Any cancellations are compel to hold 10% from the advance payment.<br /><br />
          
          No extra charges will be incurred for the first 5 Km exceeding the due destination. There will be an additional charge from the 6th Km onwards.<br /><br />
          
          Any changes in the destination may require written permission from a higher official of NCG EXPRESS (PRIVATE) LIMITED.<br /><br />
          
          Note: If the hire is more than a day, we request that you provide food and accommodation to the driver.<br /><br />
          
          Please do not hesitate to contact us on 074 289 3612 for further information.
        </div>

        {/* Footer */}
        <div className="mt-8 text-xs text-gray-500 border-t border-gray-200 pt-3 text-center">
          For more information call <strong>074 289 3612</strong><br />
          © 2025 NCG Express. All Rights Reserved.
        </div>

      </div>
    </div>
  );
}