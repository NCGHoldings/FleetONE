import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';

export interface ApprovalSignature {
  approver_name: string;
  signature_data?: string;
  approval_date: string;
}

export interface InvoiceData {
  invoiceNo: string;
  invoiceType: 'advance' | 'balance';
  quotationNo: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  companyName?: string;
  pickupLocation: string;
  dropLocation: string;
  pickupDate: Date;
  dropDate: Date;
  busType: string;
  numberOfBuses: number;
  numberOfPassengers: number;
  totalAmount: number;
  advanceAmount?: number;
  balanceAmount?: number;
  paidAmount: number;
  companyLogo?: string;
  // New optional fields to align with NCG invoice template
  vehicleNo?: string;
  driverName?: string;
  conductorName?: string;
  itemDetail?: string;
  discountAmount?: number;
  // Trip distance field - real mileage from quotation
  tripDistance?: number; // km_trip from quotation
  totalKm?: number; // Total km (parking + trip + return)
  // Enhanced fields for the multi-step workflow
  invoice_status?: 'draft' | 'approved';
  document_type?: 'sales_receipt' | 'invoice';
  forCustomer?: boolean; // Flag to generate clean invoice for customer (no signatures, no draft text)
  // Post-trip adjustment fields
  hasAdjustments?: boolean;
  originalQuotedKm?: number;
  actualKmTraveled?: number;
  extraKm?: number;
  extraKmChargePerKm?: number;
  extraKmTotalCharge?: number;
  additionalExpenses?: Array<{
    description: string;
    amount: number;
    category: string;
  }>;
  totalAdditionalExpenses?: number;
  adjustmentNotes?: string;
  // Approval signatures
  preparedBy?: ApprovalSignature;
  checkedBy?: ApprovalSignature;
  approvedBy?: ApprovalSignature;
}

export const generateInvoiceHTML = (data: InvoiceData): string => {
  const isAdvanceInvoice = data.invoiceType === 'advance';
  const isSalesReceipt = data.document_type === 'sales_receipt' || isAdvanceInvoice;
  const currentDate = format(new Date(), 'dd/MM/yyyy');
  const companyLogo = data.companyLogo || '/lovable-uploads/ncg-holdings-logo.png';
  const isDraft = data.invoice_status === 'draft' && !data.forCustomer;
  const documentTitle = isSalesReceipt ? 'SALES RECEIPT' : 'INVOICE';

  // Enhanced draft watermark styles matching quotation design
  const draftWatermarkStyles = isDraft ? `
    .draft-watermark {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      z-index: 10;
      background: rgba(0, 0, 0, 0.05);
    }
    
    .draft-text {
      font-size: 120px;
      transform: rotate(-45deg);
      opacity: 0.3;
      letter-spacing: 20px;
      text-shadow: 0 0 10px rgba(0,0,0,0.1);
      font-family: Arial, sans-serif;
      font-weight: bold;
      color: #9ca3af;
      user-select: none;
    }
  ` : '';

  if (isAdvanceInvoice || isSalesReceipt) {
    // Use Sales Receipt format for advance payments with fixed padding
    return `
      <div id="invoice-root" style="font-family: Arial, sans-serif; font-size: 14px; margin: 0; padding: 20px; width: 210mm; min-height: 297mm; background: white; color: black; box-sizing: border-box; position: relative;">
        ${isDraft ? '<div class="draft-watermark"><div class="draft-text">DRAFT</div></div>' : ''}
        <style>
          ${draftWatermarkStyles}
        </style>
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <img src="${companyLogo}" alt="Company Logo" style="width: 150px;">
          <div style="text-align: right; font-size: 13px;">
            <b>NCG EXPRESS (PRIVATE) LIMITED</b><br>
            157/1, Kebellaowita, Wenwellkola, Polgasowita<br>
            0777556322
          </div>
        </div>

        <h2 style="text-align: center; margin: 20px 0; text-decoration: underline;">${documentTitle}${isDraft ? ' - DRAFT' : ''}</h2>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; border: 1px solid #000;">
          <tr>
            <td style="border: 1px solid #000; padding: 8px;"><b>Receipt No.</b><br> ${data.invoiceNo}</td>
            <td style="border: 1px solid #000; padding: 8px;"><b>Date</b><br> ${currentDate}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 8px;"><b>Payment Ref</b><br> ${data.customerName}, ${data.quotationNo}</td>
            <td style="border: 1px solid #000; padding: 8px;"><b>Transaction No.</b><br> ${data.invoiceNo.split('-').pop()}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 8px;"><b>Customer</b><br> ${data.companyName || data.customerName}</td>
            <td style="border: 1px solid #000; padding: 8px;"></td>
          </tr>
        </table>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; border: 1px solid #000;">
          <tr style="background: #f0f0f0;">
            <th style="border: 1px solid #000; padding: 8px; text-align: left;">Account Name</th>
            <th style="border: 1px solid #000; padding: 8px; text-align: left;">Transfer Date</th>
            <th style="border: 1px solid #000; padding: 8px; text-align: left;">Reference</th>
            <th style="border: 1px solid #000; padding: 8px; text-align: left;">Amount</th>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 8px;">ADVANCE PAYMENT</td>
            <td style="border: 1px solid #000; padding: 8px;">${currentDate}</td>
            <td style="border: 1px solid #000; padding: 8px;">${data.quotationNo}</td>
            <td style="border: 1px solid #000; padding: 8px; text-align: right; font-weight: bold;">${data.paidAmount.toLocaleString()}.00</td>
          </tr>
        </table>

        <p style="text-align: right; font-weight: bold; margin: 10px 0;">Advance Payment Total: LKR ${data.paidAmount.toLocaleString()}.00</p>
        <p style="text-align: right; font-weight: bold; margin: 10px 0;">Total Payment Amount: LKR ${data.paidAmount.toLocaleString()}.00</p>
        <p style="text-align: right; font-weight: bold; margin: 10px 0; color: #b91c1c;">Balance Due: LKR ${(data.totalAmount - data.paidAmount).toLocaleString()}.00</p>

        <p style="font-style: italic; margin: 15px 0;">Trip Details: ${format(data.pickupDate, 'dd/MM/yyyy')} - ${format(data.dropDate, 'dd/MM/yyyy')} | ${data.pickupLocation} to ${data.dropLocation} | ${data.numberOfPassengers} Pax | ${data.busType}</p>

        <p style="font-size: 12px; margin: 10px 0;">
          *Note: Please make sure to place the name, signature and date in the given space accordingly.
        </p>

        <!-- Signature Section -->
        <table style="width: 100%; border-collapse: collapse; margin-top: 30px; font-size: 14px;">
          <tr style="background: #f0f0f0;">
            <th style="border: 1px solid #000; padding: 8px; text-align: center;">Prepared By</th>
            <th style="border: 1px solid #000; padding: 8px; text-align: center;">Checked By</th>
            <th style="border: 1px solid #000; padding: 8px; text-align: center;">Approved By</th>
          </tr>
          <tr>
            <td style="border: 1px solid #000; padding: 10px; vertical-align: top;">
              <b>Name:</b> ${data.preparedBy?.approver_name || '.........................'}<br>
              <b>Signature:</b><br>
              ${data.preparedBy?.signature_data 
                ? `<img src="${data.preparedBy.signature_data}" alt="Signature" style="max-width: 150px; max-height: 50px; margin: 5px 0; border: 1px solid #ddd;">` 
                : '<div style="height: 50px; border-bottom: 1px solid #000; margin: 5px 0;"></div>'
              }
              <br><b>Date:</b> ${data.preparedBy?.approval_date || currentDate}
            </td>
            <td style="border: 1px solid #000; padding: 10px; vertical-align: top;">
              <b>Name:</b> ${data.checkedBy?.approver_name || '.........................'}<br>
              <b>Signature:</b><br>
              ${data.checkedBy?.signature_data 
                ? `<img src="${data.checkedBy.signature_data}" alt="Signature" style="max-width: 150px; max-height: 50px; margin: 5px 0; border: 1px solid #ddd;">` 
                : '<div style="height: 50px; border-bottom: 1px solid #000; margin: 5px 0;"></div>'
              }
              <br><b>Date:</b> ${data.checkedBy?.approval_date || '.........................'} 
            </td>
            <td style="border: 1px solid #000; padding: 10px; vertical-align: top;">
              <b>Name:</b> ${data.approvedBy?.approver_name || '.........................'}<br>
              <b>Signature:</b><br>
              ${data.approvedBy?.signature_data 
                ? `<img src="${data.approvedBy.signature_data}" alt="Signature" style="max-width: 150px; max-height: 50px; margin: 5px 0; border: 1px solid #ddd;">` 
                : '<div style="height: 50px; border-bottom: 1px solid #000; margin: 5px 0;"></div>'
              }
              <br><b>Date:</b> ${data.approvedBy?.approval_date || '.........................'}
            </td>
          </tr>
        </table>

        <div style="margin-top: 40px; text-align: center; font-size: 12px;">
          Page 1 of 1 <br>
          NCG Express Transport Management System
        </div>

      </div>
    `;
  } else {
    // Use improved NCG Invoice format for balance payments
    const discount = data.discountAmount || 0;
    const subTotal = data.totalAmount;
    
    // Add adjustments to sub-total before applying discount
    const adjustmentTotal = (data.extraKmTotalCharge || 0) + (data.totalAdditionalExpenses || 0);
    const adjustedSubTotal = subTotal + adjustmentTotal;
    
    // Apply discount to adjusted amount
    const priceAfterDiscount = adjustedSubTotal - discount;
    const previousAdvance = data.advanceAmount || 0; // kept for reference
    const totalPaid = data.paidAmount || 0;
    // Use explicit balanceAmount when provided (balance invoices), else compute
    const balanceDue = data.balanceAmount != null ? data.balanceAmount : Math.max(0, priceAfterDiscount - totalPaid);
    const itemDetail = data.itemDetail || `${data.pickupLocation} to ${data.dropLocation}`;
    // Use original trip distance from quotation first, then totalKm, then actual (post-trip) as fallback
    const mileage = data.tripDistance || data.totalKm || data.actualKmTraveled || 0;

    return `
      <div id="invoice-root" style="font-family: Arial, sans-serif; margin: 0; padding: 0; background: #fff; color: #000; width: 210mm; box-sizing: border-box;">
        ${isDraft ? `<style>${draftWatermarkStyles}</style>` : ''}
        
        <!-- PAGE 1 -->
        <div data-pdf-page="1" style="position: relative; width: 210mm; min-height: 297mm; padding: 15px 15px 25px 15px; box-sizing: border-box; background: #fff;">
          ${isDraft ? '<div class="draft-watermark"><div class="draft-text">DRAFT</div></div>' : ''}
          
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
            <img src="${companyLogo}" alt="NCG Express Logo" style="height: 70px;">
            <div style="text-align: right; font-size: 14px;">
              <strong>NCG EXPRESS (PRIVATE) LIMITED</strong><br>
              157, Kebellawovita, Wenivelkola, Polgasovita<br>
              0777556322
            </div>
          </div>

          <h2 style="text-align: center; text-decoration: underline; margin-bottom: 12px;">${documentTitle}${isDraft ? ' - DRAFT' : ''}</h2>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 14px;">
            <tr>
              <td style="padding: 5px; vertical-align: top; width: 20%; font-weight: bold;">Customer Code</td>
              <td style="padding: 5px; vertical-align: top;">LOC-${data.invoiceNo.split('-').pop() || '0001'}</td>
              <td style="padding: 5px; vertical-align: top; width: 20%; font-weight: bold;">Invoice No</td>
              <td style="padding: 5px; vertical-align: top;">${data.invoiceNo}</td>
            </tr>
            <tr>
              <td style="padding: 5px; vertical-align: top; font-weight: bold;">Customer Name</td>
              <td style="padding: 5px; vertical-align: top;">${data.companyName || data.customerName}</td>
              <td style="padding: 5px; vertical-align: top; font-weight: bold;">Invoice Date</td>
              <td style="padding: 5px; vertical-align: top;">${currentDate}</td>
            </tr>
            <tr>
              <td style="padding: 5px; vertical-align: top; font-weight: bold;">Branch</td>
              <td style="padding: 5px; vertical-align: top;">SHS</td>
              <td style="padding: 5px; vertical-align: top; font-weight: bold;">Ref No</td>
              <td style="padding: 5px; vertical-align: top;"></td>
            </tr>
            <tr>
              <td style="padding: 5px; vertical-align: top; font-weight: bold;">Contact Person</td>
              <td style="padding: 5px; vertical-align: top;">${data.customerName}</td>
              <td style="padding: 5px; vertical-align: top; font-weight: bold;">Dates of Hire</td>
              <td style="padding: 5px; vertical-align: top;">${format(data.pickupDate, 'dd/MM/yyyy HH:mm:ss')}AM</td>
            </tr>
            <tr>
              <td style="padding: 5px; vertical-align: top; font-weight: bold;">Contact Number</td>
              <td style="padding: 5px; vertical-align: top;">${data.customerPhone}</td>
              <td style="padding: 5px; vertical-align: top; font-weight: bold;">Quote No</td>
              <td style="padding: 5px; vertical-align: top;">${data.quotationNo}</td>
            </tr>
            <tr>
              <td style="padding: 5px; vertical-align: top; font-weight: bold;">Address</td>
              <td style="padding: 5px; vertical-align: top;"></td>
              <td style="padding: 5px; vertical-align: top; font-weight: bold;">Bus Type</td>
              <td style="padding: 5px; vertical-align: top;">${data.busType}</td>
            </tr>
            <tr>
              <td style="padding: 5px; vertical-align: top; font-weight: bold;">Mileage</td>
              <td style="padding: 5px; vertical-align: top;">${mileage}</td>
            </tr>
          </table>

          <table style="width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px;">
            <tr>
              <th style="border: 1px solid #ddd; padding: 6px; text-align: center; background: #f1f1f1; width: 25%;">Description</th>
              <th style="border: 1px solid #ddd; padding: 6px; text-align: center; background: #f1f1f1; width: 40%;">Item Detail</th>
              <th style="border: 1px solid #ddd; padding: 6px; text-align: center; background: #f1f1f1; width: 15%;">Vehicle No</th>
              <th style="border: 1px solid #ddd; padding: 6px; text-align: center; background: #f1f1f1; width: 20%;">Amount</th>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 6px; text-align: center; font-size: 12px;">${data.busType.toUpperCase()} - Fixed Rate for 1km - 100km<br>- External</td>
              <td style="border: 1px solid #ddd; padding: 6px; text-align: center; font-size: 12px;">${itemDetail}<br><br>Remark: ${data.vehicleNo || 'NE 2157'} ${data.driverName ? `(D) ${data.driverName}` : '(D) Tharindu'} ${data.conductorName ? `(A) ${data.conductorName}` : '(A) Kalpa'}</td>
              <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${data.vehicleNo || 'NE 2157'}</td>
              <td style="border: 1px solid #ddd; padding: 6px; text-align: center; font-weight: bold;">${subTotal.toLocaleString()}.00</td>
            </tr>
          </table>

          <table style="width: 100%; max-width: 300px; float: right; border-collapse: collapse; margin-top: 12px; font-size: 14px;">
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">Original Quote Amount</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${subTotal.toLocaleString()}.00</td>
            </tr>
            ${data.hasAdjustments && data.extraKm && data.extraKm !== 0 ? `
            <tr style="background: #fff9e6;">
              <td style="border: 1px solid #ddd; padding: 8px; font-size: 12px;" colspan="2">
                <strong>Extra KM Adjustment:</strong><br>
                Quoted: ${data.originalQuotedKm || 0} km | Actual: ${data.actualKmTraveled || 0} km<br>
                Extra: ${data.extraKm > 0 ? '+' : ''}${data.extraKm} km × LKR ${(data.extraKmChargePerKm || 0).toLocaleString()}/km
              </td>
            </tr>
            <tr style="background: #fff9e6;">
              <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">Extra KM Charge</td>
              <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">${(data.extraKmTotalCharge || 0).toLocaleString()}.00</td>
            </tr>
            ` : ''}
            ${data.hasAdjustments && data.additionalExpenses && data.additionalExpenses.length > 0 ? `
            <tr style="background: #ffe6f0;">
              <td style="border: 1px solid #ddd; padding: 6px; font-size: 12px;" colspan="2">
                <strong>Additional Expenses:</strong><br>
                ${data.additionalExpenses.map(exp => 
                  `• ${exp.description}: LKR ${exp.amount.toLocaleString()}.00`
                ).join('<br>')}
              </td>
            </tr>
            <tr style="background: #ffe6f0;">
              <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">Total Additional Expenses</td>
              <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">${(data.totalAdditionalExpenses || 0).toLocaleString()}.00</td>
            </tr>
            ` : ''}
            ${data.hasAdjustments ? `
            <tr style="background: #e6f7ff;">
              <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">Total Adjustments</td>
              <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">+${((data.extraKmTotalCharge || 0) + (data.totalAdditionalExpenses || 0)).toLocaleString()}.00</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold; background: #f5f5f5;">Adjusted Sub-Total</td>
              <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold; background: #f5f5f5;">${(subTotal + (data.extraKmTotalCharge || 0) + (data.totalAdditionalExpenses || 0)).toLocaleString()}.00</td>
            </tr>
            ` : `
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">Sub-Total</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${subTotal.toLocaleString()}.00</td>
            </tr>
            `}
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">Discount</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${discount.toLocaleString()}.00</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">Price After Discount</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${priceAfterDiscount.toLocaleString()}.00</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">Total Paid</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${totalPaid.toLocaleString()}.00</td>
            </tr>
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold; background: #e8f5e9;">Balance Due</td>
              <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold; background: #e8f5e9;">${balanceDue.toLocaleString()}.00</td>
            </tr>
            ${balanceDue === 0 && totalPaid > priceAfterDiscount ? `
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold; color: #16a34a;">Overpaid Credit</td>
              <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold; color: #16a34a;">${(totalPaid - priceAfterDiscount).toLocaleString()}.00</td>
            </tr>` : ''}
          </table>
          ${data.hasAdjustments && data.adjustmentNotes ? `
          <div style="clear: both; margin-top: 15px; padding: 10px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px;">
            <strong>Adjustment Notes:</strong><br>
            ${data.adjustmentNotes}
          </div>
          ` : ''}

          <div style="margin-top: 20px; font-size: 13px; clear: both;">
            <strong>Payment Info</strong><br>
            Account No: <b>193414017578</b><br>
            Account Name: <b>NCG Express (Pvt) Limited</b><br>
            Bank & Branch: <b>Sampath Bank - Nugegoda</b><br><br>
            <strong>Terms & Conditions:</strong><br>
            1. Cheques are to be drawn in favour of <b>NCG EXPRESS (PVT) LIMITED</b> and A/C payee only.
          </div>

          <div style="margin-top: 15px; padding-top: 10px; text-align: center; font-size: 12px; border-top: 1px solid #ddd;">
            ${!data.forCustomer ? 'Page 1 of 2<br>' : ''}
            NCG Express Transport Management System
          </div>
        </div>

        ${!data.forCustomer ? `
        <!-- PAGE 2 -->
        <div data-pdf-page="2" style="position: relative; width: 210mm; min-height: 297mm; padding: 15px 15px 25px 15px; box-sizing: border-box; background: #fff;">

          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #000;">
            <img src="${companyLogo}" alt="NCG Express Logo" style="height: 50px;">
            <div style="text-align: right; font-size: 13px;">
              <strong>${documentTitle} - ${data.invoiceNo}</strong><br>
              <span style="font-size: 12px; color: #555;">${data.quotationNo} | ${currentDate}</span>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px;">
            <tr style="background: #f0f0f0;">
              <th style="border: 1px solid #000; padding: 8px; text-align: center;">Prepared By</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: center;">Checked By</th>
              <th style="border: 1px solid #000; padding: 8px; text-align: center;">Approved By</th>
            </tr>
            <tr>
              <td style="border: 1px solid #000; padding: 10px; vertical-align: top; text-align: center;">
                <b>Name:</b> ${data.preparedBy?.approver_name || '.........................'}<br>
                <b>Signature:</b><br>
                ${data.preparedBy?.signature_data 
                  ? `<img src="${data.preparedBy.signature_data}" alt="Signature" style="max-width: 150px; max-height: 50px; margin: 5px 0; border: 1px solid #ddd;">` 
                  : '<div style="height: 50px; border-bottom: 1px solid #000; margin: 5px 0; width: 150px; display: inline-block;"></div>'
                }
                <br><b>Date:</b> ${data.preparedBy?.approval_date || currentDate}
              </td>
              <td style="border: 1px solid #000; padding: 10px; vertical-align: top; text-align: center;">
                <b>Name:</b> ${data.checkedBy?.approver_name || '.........................'}<br>
                <b>Signature:</b><br>
                ${data.checkedBy?.signature_data 
                  ? `<img src="${data.checkedBy.signature_data}" alt="Signature" style="max-width: 150px; max-height: 50px; margin: 5px 0; border: 1px solid #ddd;">` 
                  : '<div style="height: 50px; border-bottom: 1px solid #000; margin: 5px 0; width: 150px; display: inline-block;"></div>'
                }
                <br><b>Date:</b> ${data.checkedBy?.approval_date || currentDate}
              </td>
              <td style="border: 1px solid #000; padding: 10px; vertical-align: top; text-align: center;">
                <b>Name:</b> ${data.approvedBy?.approver_name || '.........................'}<br>
                <b>Signature:</b><br>
                ${data.approvedBy?.signature_data 
                  ? `<img src="${data.approvedBy.signature_data}" alt="Signature" style="max-width: 150px; max-height: 50px; margin: 5px 0; border: 1px solid #ddd;">` 
                  : '<div style="height: 50px; border-bottom: 1px solid #000; margin: 5px 0; width: 150px; display: inline-block;"></div>'
                }
                <br><b>Date:</b> ${data.approvedBy?.approval_date || format(new Date(Date.now() - 24 * 60 * 60 * 1000), 'dd/MM/yyyy')}
              </td>
            </tr>
          </table>

          <div style="margin-top: 12px; font-size: 12px; text-align: center; color: #555; font-style: italic;">
            "This is a computer-generated invoice and does not require a physical signature."
          </div>

          <div style="margin-top: 20px; padding-top: 15px; text-align: center; font-size: 12px; border-top: 1px solid #ddd;">
            Page 2 of 2<br>
            NCG Express Transport Management System
          </div>
        </div>
        ` : ''}
      </div>
    `;
  }
};

export const generateInvoicePDF = async (data: InvoiceData): Promise<Blob> => {
  console.log('Starting PDF generation for:', data.invoiceType);
  
  const tempDiv = document.createElement('div');
  const rawHtml = generateInvoiceHTML(data);
  tempDiv.innerHTML = rawHtml;
  tempDiv.style.position = 'absolute';
  tempDiv.style.left = '-9999px';
  tempDiv.style.top = '-9999px';
  tempDiv.style.width = '210mm';
  tempDiv.style.height = 'auto';
  document.body.appendChild(tempDiv);

  try {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Find all [data-pdf-page] containers for multi-page rendering
    const pages = tempDiv.querySelectorAll('[data-pdf-page]') as NodeListOf<HTMLElement>;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;

    if (pages.length > 0) {
      // Multi-page rendering: each [data-pdf-page] becomes a separate PDF page
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const canvas = await html2canvas(page, {
          scale: 1.5,
          useCORS: true,
          allowTaint: false,
          backgroundColor: '#ffffff',
          scrollX: 0,
          scrollY: 0,
          foreignObjectRendering: false,
          logging: false,
          onclone: (clonedDoc) => {
            const style = clonedDoc.createElement('style');
            style.textContent = '* { letter-spacing: normal !important; word-spacing: normal !important; }';
            clonedDoc.head.appendChild(style);
            clonedDoc.querySelectorAll('img').forEach((img) => {
              if (!img.complete || img.naturalHeight === 0) img.remove();
            });
          },
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.85);
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
      }
    } else {
      // Fallback: single-page rendering (sales receipts etc.)
      const rootEl = tempDiv.querySelector('#invoice-root') as HTMLElement || tempDiv;
      const canvas = await html2canvas(rootEl, {
        scale: 1.5,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        foreignObjectRendering: false,
        logging: false,
        onclone: (clonedDoc) => {
          clonedDoc.querySelectorAll('img').forEach((img) => {
            if (!img.complete || img.naturalHeight === 0) img.remove();
          });
        },
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pageHeight = 297;

      if (imgHeight > pageHeight) {
        let heightLeft = imgHeight;
        let position = 0;
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }
      } else {
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
      }
    }
    
    console.log('PDF generation completed successfully');
    return pdf.output('blob');
  } catch (error) {
    console.error('PDF generation failed:', error);
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    if (document.body.contains(tempDiv)) {
      document.body.removeChild(tempDiv);
    }
  }
};