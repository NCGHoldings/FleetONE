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
  total_distance_km?: number;
  gross_revenue: number;
  net_profit: number;
  fuel_cost_fuel_only?: number;
  hire_charge?: number;
  extra_charges?: number;
  commission_amount?: number;
  created_at: string;
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

  const pickup = formatDateTime(quotation.pickup_datetime);
  const dropoff = quotation.drop_datetime ? formatDateTime(quotation.drop_datetime) : null;

  return (
    <div className={`bg-white text-black p-8 max-w-4xl mx-auto ${className}`} style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 text-white px-4 py-2 rounded">
            <span className="text-2xl font-bold">NCG</span>
            <br />
            <span className="text-sm">EXPRESS</span>
          </div>
        </div>
        <div className="bg-blue-600 text-white px-6 py-3 rounded">
          <h1 className="text-xl font-bold">Quotation Special Hire</h1>
        </div>
      </div>

      {/* Contact Info */}
      <div className="text-right mb-6 text-sm">
        <p>No. 157 Y, Kabellaowita, Weniwelkola,</p>
        <p>Polgasowita.</p>
        <p className="mt-2">074 289 3612</p>
        <p>specialhire.ncgexpress@ncg.lk</p>
        <p className="mt-2 text-gray-600">
          Quotation Generated on {format(new Date(quotation.created_at), 'EEEE do MMMM yyyy, hh:mm a')}
        </p>
      </div>

      {/* Company and Customer Details */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="font-semibold mb-2">Company Name:</h3>
          <p>{quotation.company_name || 'NCG Express'}</p>
          
          <h3 className="font-semibold mb-2 mt-4">Contact Number:</h3>
          <p>{quotation.contact_number || '+94742054835'}</p>
          
          <h3 className="font-semibold mb-2 mt-4">Quotation No:</h3>
          <p>{quotation.quotation_no}</p>
        </div>
        
        <div>
          <h3 className="font-semibold mb-2">Customer Name:</h3>
          <p>{quotation.customer_name}</p>
          
          <h3 className="font-semibold mb-2 mt-4">Email Address:</h3>
          <p>{quotation.customer_email || 'N/A'}</p>
        </div>
      </div>

      {/* Location and Date Details */}
      <div className="space-y-4 mb-8">
        <div className="bg-gray-100 p-4 rounded">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <h4 className="font-semibold">Pick-up Location</h4>
            </div>
            <div>
              <h4 className="font-semibold">Date</h4>
            </div>
            <div>
              <h4 className="font-semibold">Time</h4>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-2">
            <div>{quotation.pickup_location}</div>
            <div>{pickup.date}</div>
            <div>{pickup.time}</div>
          </div>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <h4 className="font-semibold">Drop-off Location</h4>
            </div>
            <div>
              <h4 className="font-semibold">Date</h4>
            </div>
            <div>
              <h4 className="font-semibold">Time</h4>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-2">
            <div>{quotation.drop_location}</div>
            <div>{dropoff?.date || pickup.date}</div>
            <div>{dropoff?.time || 'TBD'}</div>
          </div>
        </div>
      </div>

      {/* Vehicle Details Table */}
      <div className="mb-8">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-blue-600 text-white">
              <th className="border border-gray-300 p-3 text-left">Model</th>
              <th className="border border-gray-300 p-3 text-left">No. of Vehicles</th>
              <th className="border border-gray-300 p-3 text-left">Seating Capacity</th>
              <th className="border border-gray-300 p-3 text-left">Description</th>
              <th className="border border-gray-300 p-3 text-left">Mileage</th>
              <th className="border border-gray-300 p-3 text-left">Total Cost</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-300 p-3">{quotation.bus_type}</td>
              <td className="border border-gray-300 p-3">{quotation.number_of_buses.toString().padStart(2, '0')}</td>
              <td className="border border-gray-300 p-3">{quotation.seating_capacity || 54}</td>
              <td className="border border-gray-300 p-3">
                From {quotation.pickup_location}<br />
                To {quotation.drop_location}
              </td>
              <td className="border border-gray-300 p-3">{quotation.total_distance_km?.toFixed(2) || '0.00'} Km</td>
              <td className="border border-gray-300 p-3">LKR {quotation.gross_revenue.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Extra Charges */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold mb-4">Extra Charges and Route Info</h3>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Exceeding Per Kilometer</strong> will be charged Rs {((quotation.gross_revenue - (quotation.fuel_cost_fuel_only || 0) - (quotation.hire_charge || 0)) / (quotation.total_distance_km || 1)).toFixed(2)} per km
          </li>
          {quotation.extra_charges && quotation.extra_charges > 0 && (
            <li>
              <strong>Additional Charges:</strong> LKR {quotation.extra_charges.toLocaleString()}
            </li>
          )}
        </ul>
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-600 mt-8 pt-4 border-t">
        <p>This quotation is valid for 7 days from the date of generation.</p>
        <p className="mt-2">Thank you for choosing NCG Express for your transportation needs.</p>
      </div>
    </div>
  );
}