import React from 'react';
import { format } from 'date-fns';

interface BalanceInvoiceData {
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
  balance_amount?: number;
  advance_amount?: number;
  driver_name?: string;
  conductor_name?: string;
  vehicle_no?: string;
  notes?: string;
  // Additional fields
  totalAmount?: number;
  paidAmount?: number;
  discount_amount_lkr?: number;
}

interface Props {
  data: BalanceInvoiceData;
  className?: string;
}

export function BalanceInvoicePreview({ data, className = '' }: Props) {
  const currentDate = format(new Date(), 'dd/MM/yyyy');
  const totalAmount = data.totalAmount || data.gross_revenue || 0;
  const advanceAmount = data.advance_amount || data.paidAmount || 0;
  const discount = data.discount_amount_lkr || 0;
  const balanceAmount = data.balance_amount || (totalAmount - advanceAmount - discount);

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
    } catch {
      return dateString;
    }
  };

  const itemDetail = `${data.pickup_location || 'Pickup'} to ${data.drop_location || 'Drop'}`;

  return (
    <div
      className={`bg-white text-black font-sans ${className}`}
      style={{
        fontFamily: '"Segoe UI", Arial, sans-serif',
        padding: '15px',
        width: '100%',
        maxWidth: '210mm',
        margin: '0 auto',
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <img
          src="/lovable-uploads/52e834c4-cfda-4ea3-9da7-aac1f23e1162.png"
          alt="NCG Express Logo"
          style={{ height: '70px' }}
        />
        <div className="text-right text-sm">
          <strong>NCG EXPRESS (PRIVATE) LIMITED</strong>
          <br />
          157, Kebellawovita, Wenivelkola, Polgasovita
          <br />
          0777556322
        </div>
      </div>

      {/* Title */}
      <h2 className="text-center text-xl font-bold underline mb-3">INVOICE</h2>

      {/* Invoice Info */}
      <table className="w-full mb-3 text-sm">
        <tbody>
          <tr>
            <td className="p-1 font-bold" style={{ width: '20%' }}>Customer Code</td>
            <td className="p-1">LOC-{data.quotation_no?.replace('Q-', '').slice(-4) || '0001'}</td>
            <td className="p-1 font-bold" style={{ width: '20%' }}>Invoice No</td>
            <td className="p-1">INV-{data.quotation_no?.replace('Q-', '') || '0001'}</td>
          </tr>
          <tr>
            <td className="p-1 font-bold">Customer Name</td>
            <td className="p-1">{data.company_name || data.customer_name}</td>
            <td className="p-1 font-bold">Invoice Date</td>
            <td className="p-1">{currentDate}</td>
          </tr>
          <tr>
            <td className="p-1 font-bold">Branch</td>
            <td className="p-1">SHS</td>
            <td className="p-1 font-bold">Ref No</td>
            <td className="p-1">{data.quotation_no}</td>
          </tr>
          <tr>
            <td className="p-1 font-bold">Contact Person</td>
            <td className="p-1">{data.customer_name}</td>
            <td className="p-1 font-bold">Dates of Hire</td>
            <td className="p-1">{formatDateTime(data.pickup_datetime)}</td>
          </tr>
          <tr>
            <td className="p-1 font-bold">Contact Number</td>
            <td className="p-1">{data.customer_phone}</td>
            <td className="p-1 font-bold">Bus Type</td>
            <td className="p-1">{data.bus_type}</td>
          </tr>
        </tbody>
      </table>

      {/* Item Table */}
      <table className="w-full border-collapse mt-3 text-sm">
        <thead>
          <tr>
            <th className="border border-gray-300 p-2 text-center bg-gray-100" style={{ width: '25%' }}>Description</th>
            <th className="border border-gray-300 p-2 text-center bg-gray-100" style={{ width: '40%' }}>Item Detail</th>
            <th className="border border-gray-300 p-2 text-center bg-gray-100" style={{ width: '15%' }}>Vehicle No</th>
            <th className="border border-gray-300 p-2 text-center bg-gray-100" style={{ width: '20%' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-gray-300 p-2 text-center text-xs">
              {data.bus_type?.toUpperCase() || 'BUS'} - Special Hire
            </td>
            <td className="border border-gray-300 p-2 text-center text-xs">
              {itemDetail}
              <br /><br />
              Remark: {data.vehicle_no || 'TBA'} {data.driver_name ? `(D) ${data.driver_name}` : ''} {data.conductor_name ? `(A) ${data.conductor_name}` : ''}
            </td>
            <td className="border border-gray-300 p-2 text-center">{data.vehicle_no || 'TBA'}</td>
            <td className="border border-gray-300 p-2 text-center font-bold">{totalAmount.toLocaleString()}.00</td>
          </tr>
        </tbody>
      </table>

      {/* Summary */}
      <div className="flex justify-end mt-3">
        <table className="border-collapse text-sm" style={{ maxWidth: '300px' }}>
          <tbody>
            <tr>
              <td className="border border-gray-300 p-2 font-bold">Sub Total</td>
              <td className="border border-gray-300 p-2 text-right">{totalAmount.toLocaleString()}.00</td>
            </tr>
            {discount > 0 && (
              <tr>
                <td className="border border-gray-300 p-2 font-bold">Discount</td>
                <td className="border border-gray-300 p-2 text-right text-red-600">-{discount.toLocaleString()}.00</td>
              </tr>
            )}
            <tr className="bg-yellow-50">
              <td className="border border-gray-300 p-2 font-bold">Advance Paid</td>
              <td className="border border-gray-300 p-2 text-right text-green-700 font-bold">-{advanceAmount.toLocaleString()}.00</td>
            </tr>
            <tr className="bg-blue-50">
              <td className="border border-gray-300 p-2 font-bold text-blue-800">BALANCE DUE</td>
              <td className="border border-gray-300 p-2 text-right font-bold text-blue-800 text-lg">{balanceAmount.toLocaleString()}.00</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Notes */}
      {data.notes && (
        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded text-sm">
          <strong>Notes:</strong> {data.notes}
        </div>
      )}

      {/* Signature Section */}
      <table className="w-full border-collapse mt-8" style={{ fontSize: '12px' }}>
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
              <div style={{ height: '40px', borderBottom: '1px solid #000', margin: '5px 0' }}></div>
              <strong>Date:</strong> {currentDate}
            </td>
            <td className="border border-black p-3" style={{ verticalAlign: 'top' }}>
              <strong>Name:</strong> .........................
              <br />
              <strong>Signature:</strong>
              <div style={{ height: '40px', borderBottom: '1px solid #000', margin: '5px 0' }}></div>
              <strong>Date:</strong> .........................
            </td>
            <td className="border border-black p-3" style={{ verticalAlign: 'top' }}>
              <strong>Name:</strong> .........................
              <br />
              <strong>Signature:</strong>
              <div style={{ height: '40px', borderBottom: '1px solid #000', margin: '5px 0' }}></div>
              <strong>Date:</strong> .........................
            </td>
          </tr>
        </tbody>
      </table>

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-gray-600">
        Page 1 of 1
        <br />
        NCG Express Transport Management System
      </div>
    </div>
  );
}
