import React from 'react';
import { format } from 'date-fns';

interface AdvanceReceiptData {
  quotation_no?: string;
  customer_name?: string;
  customer_phone?: string;
  company_name?: string;
  pickup_location?: string;
  drop_location?: string;
  pickup_datetime?: string;
  drop_datetime?: string;
  bus_type?: string;
  number_of_buses?: number;
  seating_capacity?: number;
  gross_revenue?: number;
  amount?: number;
  payment_method?: string;
  reference?: string;
  payment_date?: string;
  advance_amount?: number;
  // Additional fields from payment
  paidAmount?: number;
  totalAmount?: number;
  // Vehicle assignment data
  assigned_driver_name?: string | null;
  assigned_conductor_name?: string | null;
  assigned_bus_no?: string | null;
  // Trip distance
  km_trip?: number;
  total_distance_km?: number;
}

interface Props {
  data: AdvanceReceiptData;
  className?: string;
}

export function AdvanceReceiptPreview({ data, className = '' }: Props) {
  const currentDate = format(new Date(), 'dd/MM/yyyy');
  const advanceAmount = data.amount || data.advance_amount || data.paidAmount || 0;
  const totalAmount = data.totalAmount || data.gross_revenue || 0;
  const balanceDue = totalAmount - advanceAmount;

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy');
    } catch {
      return dateString;
    }
  };

  return (
    <div
      className={`bg-white text-black font-sans ${className}`}
      style={{
        fontFamily: '"Segoe UI", Arial, sans-serif',
        padding: '20px',
        width: '100%',
        maxWidth: '210mm',
        margin: '0 auto',
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-5">
        <img
          src="/lovable-uploads/52e834c4-cfda-4ea3-9da7-aac1f23e1162.png"
          alt="NCG Express Logo"
          style={{ width: '150px' }}
        />
        <div className="text-right text-sm">
          <strong>NCG EXPRESS (PRIVATE) LIMITED</strong>
          <br />
          157/1, Kebellaowita, Wenwellkola, Polgasowita
          <br />
          0777556322
        </div>
      </div>

      {/* Title */}
      <h2 className="text-center text-xl font-bold underline mb-5">SALES RECEIPT</h2>

      {/* Receipt Info Table */}
      <table className="w-full border-collapse mb-4" style={{ border: '1px solid #000' }}>
        <tbody>
          <tr>
            <td className="border border-black p-2">
              <strong>Receipt No.</strong>
              <br />
              SR-{data.quotation_no?.replace('Q-', '') || '0001'}
            </td>
            <td className="border border-black p-2">
              <strong>Date</strong>
              <br />
              {data.payment_date ? formatDateTime(data.payment_date) : currentDate}
            </td>
          </tr>
          <tr>
            <td className="border border-black p-2">
              <strong>Payment Ref</strong>
              <br />
              {data.customer_name}, {data.quotation_no}
            </td>
            <td className="border border-black p-2">
              <strong>Transaction No.</strong>
              <br />
              {data.reference || `TXN-${Date.now().toString().slice(-6)}`}
            </td>
          </tr>
          <tr>
            <td className="border border-black p-2">
              <strong>Customer</strong>
              <br />
              {data.company_name || data.customer_name}
            </td>
            <td className="border border-black p-2">
              <strong>Payment Method</strong>
              <br />
              {data.payment_method || 'Bank Transfer'}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Payment Details Table */}
      <table className="w-full border-collapse mb-4" style={{ border: '1px solid #000' }}>
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-black p-2 text-left">Account Name</th>
            <th className="border border-black p-2 text-left">Transfer Date</th>
            <th className="border border-black p-2 text-left">Reference</th>
            <th className="border border-black p-2 text-left">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-black p-2">ADVANCE PAYMENT</td>
            <td className="border border-black p-2">{currentDate}</td>
            <td className="border border-black p-2">{data.quotation_no}</td>
            <td className="border border-black p-2 text-right font-bold">
              {advanceAmount.toLocaleString()}.00
            </td>
          </tr>
        </tbody>
      </table>

      {/* Totals */}
      <div className="text-right space-y-1 mb-4">
        <p className="font-bold">Advance Payment Total: LKR {advanceAmount.toLocaleString()}.00</p>
        <p className="font-bold">Total Quotation Amount: LKR {totalAmount.toLocaleString()}.00</p>
        <p className="font-bold text-red-700">Balance Due: LKR {balanceDue.toLocaleString()}.00</p>
      </div>

      {/* Trip Details */}
      <p className="italic text-sm mb-2">
        Trip Details: {formatDateTime(data.pickup_datetime)} - {formatDateTime(data.drop_datetime)} | {data.pickup_location} to {data.drop_location} | {data.seating_capacity || 'N/A'} Pax | {data.bus_type}
      </p>

      {/* Vehicle Assignment Details */}
      {(data.assigned_driver_name || data.assigned_conductor_name || data.assigned_bus_no || data.km_trip || data.total_distance_km) && (
        <div className="text-sm mb-4 p-2 bg-gray-50 border border-gray-200 rounded">
          <strong>Vehicle Assignment:</strong>
          <span className="ml-2">
            {data.assigned_bus_no && <span>Bus: {data.assigned_bus_no}</span>}
            {data.assigned_driver_name && <span className="ml-3">Driver: {data.assigned_driver_name}</span>}
            {data.assigned_conductor_name && <span className="ml-3">Conductor: {data.assigned_conductor_name}</span>}
            {(data.km_trip || data.total_distance_km) && (
              <span className="ml-3">Distance: {data.km_trip || data.total_distance_km} km</span>
            )}
          </span>
        </div>
      )}

      {/* Note */}
      <p className="text-xs mb-6">
        *Note: Please make sure to place the name, signature and date in the given space accordingly.
      </p>

      {/* Signature Section */}
      <table className="w-full border-collapse mt-8" style={{ fontSize: '14px' }}>
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-black p-2 text-center">Prepared By</th>
            <th className="border border-black p-2 text-center">Checked By</th>
            <th className="border border-black p-2 text-center">Approved By</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-black p-3" style={{ verticalAlign: 'top' }}>
              <strong>Name:</strong> .........................
              <br />
              <strong>Signature:</strong>
              <div style={{ height: '50px', borderBottom: '1px solid #000', margin: '5px 0' }}></div>
              <strong>Date:</strong> {currentDate}
            </td>
            <td className="border border-black p-3" style={{ verticalAlign: 'top' }}>
              <strong>Name:</strong> .........................
              <br />
              <strong>Signature:</strong>
              <div style={{ height: '50px', borderBottom: '1px solid #000', margin: '5px 0' }}></div>
              <strong>Date:</strong> .........................
            </td>
            <td className="border border-black p-3" style={{ verticalAlign: 'top' }}>
              <strong>Name:</strong> .........................
              <br />
              <strong>Signature:</strong>
              <div style={{ height: '50px', borderBottom: '1px solid #000', margin: '5px 0' }}></div>
              <strong>Date:</strong> .........................
            </td>
          </tr>
        </tbody>
      </table>

      {/* Footer */}
      <div className="mt-10 text-center text-xs text-gray-600">
        Page 1 of 1
        <br />
        NCG Express Transport Management System
      </div>
    </div>
  );
}
