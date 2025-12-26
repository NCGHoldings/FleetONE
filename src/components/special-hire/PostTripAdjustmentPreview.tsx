import React from 'react';
import { format } from 'date-fns';

interface PostTripAdjustmentData {
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
  gross_revenue?: number;
  // Adjustment fields
  actual_km?: number;
  quoted_km?: number;
  extra_km?: number;
  extra_km_charge?: number;
  extra_km_total?: number;
  additional_expenses?: Array<{
    description: string;
    amount: number;
    category?: string;
  }>;
  total_additional_expenses?: number;
  additional_notes?: string;
  // Invoice amounts
  original_amount?: number;
  adjusted_amount?: number;
  advance_paid?: number;
  final_balance?: number;
  driver_name?: string;
  vehicle_no?: string;
}

interface Props {
  data: PostTripAdjustmentData;
  className?: string;
}

export function PostTripAdjustmentPreview({ data, className = '' }: Props) {
  const currentDate = format(new Date(), 'dd/MM/yyyy');
  
  const quotedKm = data.quoted_km || 0;
  const actualKm = data.actual_km || quotedKm;
  const extraKm = data.extra_km || Math.max(0, actualKm - quotedKm);
  const extraKmCharge = data.extra_km_charge || 0;
  const extraKmTotal = data.extra_km_total || (extraKm * extraKmCharge);
  
  const originalAmount = data.original_amount || data.gross_revenue || 0;
  const additionalExpenses = data.additional_expenses || [];
  const totalAdditionalExpenses = data.total_additional_expenses || additionalExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  
  const adjustedAmount = data.adjusted_amount || (originalAmount + extraKmTotal + totalAdditionalExpenses);
  const advancePaid = data.advance_paid || 0;
  const finalBalance = data.final_balance || (adjustedAmount - advancePaid);

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
      <div className="flex justify-between items-start mb-4">
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
      <h2 className="text-center text-xl font-bold underline mb-4">POST-TRIP ADJUSTMENT</h2>

      {/* Trip Reference */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div className="space-y-1">
          <div><strong>Quotation No:</strong> {data.quotation_no}</div>
          <div><strong>Customer:</strong> {data.company_name || data.customer_name}</div>
          <div><strong>Contact:</strong> {data.customer_phone}</div>
        </div>
        <div className="space-y-1 text-right">
          <div><strong>Date:</strong> {currentDate}</div>
          <div><strong>Vehicle:</strong> {data.vehicle_no || 'TBA'}</div>
          <div><strong>Driver:</strong> {data.driver_name || 'TBA'}</div>
        </div>
      </div>

      {/* Trip Details */}
      <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded text-sm">
        <div className="grid grid-cols-2 gap-2">
          <div><strong>Route:</strong> {data.pickup_location} → {data.drop_location}</div>
          <div><strong>Trip Date:</strong> {formatDateTime(data.pickup_datetime)} - {formatDateTime(data.drop_datetime)}</div>
        </div>
      </div>

      {/* Distance Adjustment Section */}
      <div className="mb-4">
        <h3 className="font-bold text-blue-700 mb-2 pb-1 border-b border-blue-200">DISTANCE ADJUSTMENT</h3>
        <table className="w-full border-collapse text-sm">
          <tbody>
            <tr>
              <td className="border border-gray-300 p-2 bg-gray-50 font-bold" style={{ width: '50%' }}>Quoted Distance (km)</td>
              <td className="border border-gray-300 p-2 text-right">{quotedKm.toLocaleString()}</td>
            </tr>
            <tr>
              <td className="border border-gray-300 p-2 bg-gray-50 font-bold">Actual Distance Traveled (km)</td>
              <td className="border border-gray-300 p-2 text-right">{actualKm.toLocaleString()}</td>
            </tr>
            <tr className={extraKm > 0 ? 'bg-yellow-50' : ''}>
              <td className="border border-gray-300 p-2 font-bold">Extra Distance (km)</td>
              <td className="border border-gray-300 p-2 text-right font-bold">{extraKm > 0 ? `+${extraKm.toLocaleString()}` : extraKm.toLocaleString()}</td>
            </tr>
            <tr>
              <td className="border border-gray-300 p-2 bg-gray-50 font-bold">Extra KM Rate (LKR/km)</td>
              <td className="border border-gray-300 p-2 text-right">{extraKmCharge.toLocaleString()}.00</td>
            </tr>
            <tr className="bg-blue-50">
              <td className="border border-gray-300 p-2 font-bold text-blue-800">Extra KM Charge</td>
              <td className="border border-gray-300 p-2 text-right font-bold text-blue-800">LKR {extraKmTotal.toLocaleString()}.00</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Additional Expenses Section */}
      {additionalExpenses.length > 0 && (
        <div className="mb-4">
          <h3 className="font-bold text-purple-700 mb-2 pb-1 border-b border-purple-200">ADDITIONAL EXPENSES</h3>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-2 text-left">Description</th>
                <th className="border border-gray-300 p-2 text-left">Category</th>
                <th className="border border-gray-300 p-2 text-right">Amount (LKR)</th>
              </tr>
            </thead>
            <tbody>
              {additionalExpenses.map((expense, index) => (
                <tr key={index}>
                  <td className="border border-gray-300 p-2">{expense.description}</td>
                  <td className="border border-gray-300 p-2">{expense.category || 'Other'}</td>
                  <td className="border border-gray-300 p-2 text-right">{expense.amount.toLocaleString()}.00</td>
                </tr>
              ))}
              <tr className="bg-purple-50">
                <td className="border border-gray-300 p-2 font-bold" colSpan={2}>Total Additional Expenses</td>
                <td className="border border-gray-300 p-2 text-right font-bold text-purple-800">LKR {totalAdditionalExpenses.toLocaleString()}.00</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Final Summary */}
      <div className="mb-4">
        <h3 className="font-bold text-green-700 mb-2 pb-1 border-b border-green-200">FINAL INVOICE SUMMARY</h3>
        <div className="flex justify-end">
          <table className="border-collapse text-sm" style={{ minWidth: '350px' }}>
            <tbody>
              <tr>
                <td className="border border-gray-300 p-2 bg-gray-50 font-bold">Original Quoted Amount</td>
                <td className="border border-gray-300 p-2 text-right">LKR {originalAmount.toLocaleString()}.00</td>
              </tr>
              {extraKmTotal > 0 && (
                <tr className="bg-yellow-50">
                  <td className="border border-gray-300 p-2 font-bold">+ Extra KM Charge</td>
                  <td className="border border-gray-300 p-2 text-right">LKR {extraKmTotal.toLocaleString()}.00</td>
                </tr>
              )}
              {totalAdditionalExpenses > 0 && (
                <tr className="bg-pink-50">
                  <td className="border border-gray-300 p-2 font-bold">+ Additional Expenses</td>
                  <td className="border border-gray-300 p-2 text-right">LKR {totalAdditionalExpenses.toLocaleString()}.00</td>
                </tr>
              )}
              <tr className="bg-gray-100">
                <td className="border border-gray-300 p-2 font-bold">Adjusted Total Amount</td>
                <td className="border border-gray-300 p-2 text-right font-bold">LKR {adjustedAmount.toLocaleString()}.00</td>
              </tr>
              {advancePaid > 0 && (
                <tr className="bg-green-50">
                  <td className="border border-gray-300 p-2 font-bold text-green-700">- Advance Already Paid</td>
                  <td className="border border-gray-300 p-2 text-right text-green-700 font-bold">LKR {advancePaid.toLocaleString()}.00</td>
                </tr>
              )}
              <tr className="bg-blue-100">
                <td className="border border-gray-300 p-2 font-bold text-blue-800 text-lg">FINAL BALANCE DUE</td>
                <td className="border border-gray-300 p-2 text-right font-bold text-blue-800 text-lg">LKR {finalBalance.toLocaleString()}.00</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjustment Notes */}
      {data.additional_notes && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded text-sm">
          <strong>Adjustment Notes:</strong>
          <p className="mt-1">{data.additional_notes}</p>
        </div>
      )}

      {/* Signature Section */}
      <table className="w-full border-collapse mt-6" style={{ fontSize: '12px' }}>
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-black p-2 text-center">Prepared By</th>
            <th className="border border-black p-2 text-center">Customer Acknowledgement</th>
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
      <div className="mt-6 text-center text-xs text-gray-600">
        Page 1 of 1
        <br />
        NCG Express Transport Management System
      </div>
    </div>
  );
}
