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
  vehicleNo?: string;
  driverName?: string;
  conductorName?: string;
  itemDetail?: string;
  discountAmount?: number;
  tripDistance?: number;
  totalKm?: number;
  invoice_status?: 'draft' | 'approved';
  document_type?: 'sales_receipt' | 'invoice';
  forCustomer?: boolean;
  intermediateStops?: Array<{ location: string; id?: string; lat?: number; lng?: number }>;
  hireType?: string;
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
  /** Quotation-time extra KM (from additional_charges[type='additional_distance']). Display-only. */
  quotationAdditionalDistanceKm?: number;
  /** Quotation-time extra KM total charge (LKR). Display-only — already inside totalAmount. */
  quotationAdditionalDistanceAmount?: number;
  /** Optional itemized breakdown of quotation-time extra distance entries. */
  quotationAdditionalDistanceBreakdown?: Array<{ description: string; distance: number; amount: number }>;
  preparedBy?: ApprovalSignature;
  checkedBy?: ApprovalSignature;
  approvedBy?: ApprovalSignature;
  hideSignaturePage?: boolean;
  totalPaidToDate?: number;
}

// ---- Helper: build bus row objects ----
interface BusRow {
  description: string;
  itemDetail: string;
  vehicleNo: string;
  amount: number;
  isFirst: boolean; // true for the first row (shows full route)
}

function buildBusRows(data: InvoiceData, itemDetail: string, subTotal: number): BusRow[] {
  const vehicleList = (data.vehicleNo || '-').split(',').map(v => v.trim()).filter(Boolean);
  const driverList = (data.driverName || '').split(',').map(v => v.trim());
  const conductorList = (data.conductorName || '').split(',').map(v => v.trim());
  const busCount = Math.max(data.numberOfBuses || 1, vehicleList.length);
  const descLine = `${data.busType.toUpperCase()} - Fixed Rate for 1km - 100km<br>- ${data.hireType || 'External'}`;

  if (busCount > 1 && vehicleList.length > 1) {
    const perBusAmount = Math.round(subTotal / busCount);
    return vehicleList.map((vNo, idx) => {
      const driver = driverList[idx] || '';
      const conductor = conductorList[idx] || '';
      const remark = `${vNo} ${driver ? `(D) ${driver}` : ''} ${conductor ? `(C) ${conductor}` : ''}`.trim();
      return {
        description: descLine,
        itemDetail: idx === 0
          ? `${itemDetail}<br><br>Remark: ${remark}`
          : `<span style="color:#666;font-style:italic;">Same route as above</span><br><br>Remark: ${remark}`,
        vehicleNo: vNo,
        amount: perBusAmount,
        isFirst: idx === 0,
      };
    });
  }

  const remark = `${data.vehicleNo || '-'} ${data.driverName ? `(D) ${data.driverName}` : ''} ${data.conductorName ? `(C) ${data.conductorName}` : ''}`.trim();
  return [{
    description: descLine,
    itemDetail: `${itemDetail}<br><br>Remark: ${remark}`,
    vehicleNo: data.vehicleNo || '-',
    amount: subTotal,
    isFirst: true,
  }];
}

// ---- Helper: render a bus-row <tr> ----
function renderBusRowTR(row: BusRow): string {
  return `<tr>
    <td style="border: 1px solid #ddd; padding: 6px; text-align: center; font-size: 12px;">${row.description}</td>
    <td style="border: 1px solid #ddd; padding: 6px; text-align: center; font-size: 12px;">${row.itemDetail}</td>
    <td style="border: 1px solid #ddd; padding: 6px; text-align: center;">${row.vehicleNo}</td>
    <td style="border: 1px solid #ddd; padding: 6px; text-align: center; font-weight: bold;">${row.amount.toLocaleString()}.00</td>
  </tr>`;
}

// ---- Constants for pagination ----
const MAX_ROWS_FIRST_PAGE = 3;  // page 1 has header + customer info
const MAX_ROWS_CONT_PAGE = 6;   // continuation pages have only a mini header

// ---- Helper: table header row ----
function tableHeaderRow(): string {
  return `<tr>
    <th style="border: 1px solid #ddd; padding: 6px; text-align: center; background: #f1f1f1; width: 25%;">Description</th>
    <th style="border: 1px solid #ddd; padding: 6px; text-align: center; background: #f1f1f1; width: 40%;">Item Detail</th>
    <th style="border: 1px solid #ddd; padding: 6px; text-align: center; background: #f1f1f1; width: 15%;">Vehicle No</th>
    <th style="border: 1px solid #ddd; padding: 6px; text-align: center; background: #f1f1f1; width: 20%;">Amount</th>
  </tr>`;
}

// ---- Helper: mini header for continuation pages ----
function miniHeader(companyLogo: string, documentTitle: string, invoiceNo: string, quotationNo: string, currentDate: string): string {
  return `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 2px solid #000;">
    <img src="${companyLogo}" alt="NCG Holdings Logo" style="height: 45px;">
    <div style="text-align: right; font-size: 12px;">
      <strong>${documentTitle} - ${invoiceNo}</strong><br>
      <span style="color: #555;">${quotationNo} | ${currentDate}</span>
    </div>
  </div>`;
}

export const generateInvoiceHTML = (data: InvoiceData): string => {
  const isAdvanceInvoice = data.invoiceType === 'advance';
  const isSalesReceipt = data.document_type === 'sales_receipt' || isAdvanceInvoice;
  const currentDate = format(new Date(), 'dd/MM/yyyy');
  const companyLogo = data.companyLogo || '/lovable-uploads/ncg-holdings-logo.png';
  const isDraft = data.invoice_status === 'draft' && !data.forCustomer;
  const documentTitle = isSalesReceipt ? 'SALES RECEIPT' : 'INVOICE';

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
        <style>${draftWatermarkStyles}</style>
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <img src="${companyLogo}" alt="Company Logo" style="width: 150px;">
          <div style="text-align: right; font-size: 13px;">
             <b>NCG Holding (Pvt) Ltd</b><br>
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
            <td style="border: 1px solid #000; padding: 8px;">${data.invoiceType === 'advance' ? 'ADVANCE PAYMENT' : 'BALANCE PAYMENT'}</td>
            <td style="border: 1px solid #000; padding: 8px;">${currentDate}</td>
            <td style="border: 1px solid #000; padding: 8px;">${data.quotationNo}</td>
            <td style="border: 1px solid #000; padding: 8px; text-align: right; font-weight: bold;">${data.paidAmount.toLocaleString()}.00</td>
          </tr>
        </table>

        <p style="text-align: right; font-weight: bold; margin: 10px 0;">This Payment: LKR ${data.paidAmount.toLocaleString()}.00</p>
        ${data.totalPaidToDate != null ? `<p style="text-align: right; font-weight: bold; margin: 10px 0;">Total Paid to Date: LKR ${data.totalPaidToDate.toLocaleString()}.00</p>` : ''}
        <p style="text-align: right; font-weight: bold; margin: 10px 0; color: #b91c1c;">Balance Due: LKR ${(data.totalAmount - (data.totalPaidToDate ?? data.paidAmount)).toLocaleString()}.00</p>

        <p style="font-style: italic; margin: 15px 0;">Trip Details: ${format(data.pickupDate, 'dd/MM/yyyy')} - ${format(data.dropDate, 'dd/MM/yyyy')} | ${data.pickupLocation} to ${data.dropLocation} | ${data.numberOfPassengers} Pax | ${data.busType}</p>

        <p style="font-size: 12px; margin: 10px 0;">
          *Note: Please make sure to place the name, signature and date in the given space accordingly.
        </p>

        ${!data.hideSignaturePage ? `
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
        ` : `
        <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #555; font-style: italic;">
          "This is a computer-generated document and does not require a physical signature."
        </div>
        `}

        <div style="margin-top: 40px; text-align: center; font-size: 12px;">
          Page 1 of 1 <br>
           NCG Holding - Transport Management System
        </div>

      </div>
    `;
  }

  // ============ BALANCE / INVOICE FORMAT — with multi-page pagination ============
  const discount = data.discountAmount || 0;
  const subTotal = data.totalAmount;
  const adjustmentTotal = (data.extraKmTotalCharge || 0) + (data.totalAdditionalExpenses || 0);
  const adjustedSubTotal = subTotal + adjustmentTotal;
  const priceAfterDiscount = adjustedSubTotal - discount;
  const totalPaid = data.paidAmount || 0;
  const balanceDue = data.balanceAmount != null ? data.balanceAmount : Math.max(0, priceAfterDiscount - totalPaid);

  // Build route with intermediate stops
  const itemDetail = data.itemDetail || (() => {
    if (data.intermediateStops && data.intermediateStops.length > 0) {
      const stops = data.intermediateStops.map(s => s.location).join(' → ');
      return `${data.pickupLocation || ''} → ${stops} → ${data.dropLocation || ''}`;
    }
    return `${data.pickupLocation || ''} → ${data.dropLocation || ''}`;
  })();

  const mileage = (data.hasAdjustments && data.actualKmTraveled)
    ? data.actualKmTraveled
    : (data.tripDistance || data.totalKm || 0);
  const originalKm = data.originalQuotedKm || data.tripDistance || data.totalKm || 0;

  // Build all bus rows
  const busRows = buildBusRows(data, itemDetail, subTotal);

  // Chunk rows into pages
  const pageChunks: BusRow[][] = [];
  let remaining = [...busRows];
  // First page chunk
  const firstChunk = remaining.splice(0, MAX_ROWS_FIRST_PAGE);
  pageChunks.push(firstChunk);
  // Subsequent chunks
  while (remaining.length > 0) {
    pageChunks.push(remaining.splice(0, MAX_ROWS_CONT_PAGE));
  }

  // Determine total page count
  const showSignaturePage = !data.forCustomer && !data.hideSignaturePage;
  const itemPageCount = pageChunks.length;
  const totalPages = itemPageCount + (showSignaturePage ? 1 : 0);

  // ---- Build totals / summary HTML ----
  const totalsHTML = `
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
        <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">+${adjustmentTotal.toLocaleString()}.00</td>
      </tr>
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold; background: #f5f5f5;">Adjusted Sub-Total</td>
        <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold; background: #f5f5f5;">${adjustedSubTotal.toLocaleString()}.00</td>
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
      Account No: <b>1001077213</b><br>
      Account Name: <b>NCG Holding (Pvt) Ltd</b><br>
      Bank & Branch: <b>Commercial Bank - Nugegoda</b><br><br>
      <strong>Terms & Conditions:</strong><br>
      1. Cheques are to be drawn in favour of <b>NCG Holding (Pvt) Ltd</b> and A/C payee only.
    </div>
  `;

  // ---- Generate pages ----
  const pagesHTML: string[] = [];

  pageChunks.forEach((chunk, pageIdx) => {
    const pageNum = pageIdx + 1;
    const isFirstPage = pageIdx === 0;
    const isLastItemPage = pageIdx === pageChunks.length - 1;

    let pageContent = '';

    if (isFirstPage) {
      // Full header + customer info
      pageContent += `
        ${isDraft ? '<div class="draft-watermark"><div class="draft-text">DRAFT</div></div>' : ''}
        
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
           <img src="${companyLogo}" alt="NCG Holdings Logo" style="height: 70px;">
          <div style="text-align: right; font-size: 14px;">
            <strong>NCG Holding (Pvt) Ltd</strong><br>
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
            <td style="padding: 5px; vertical-align: top;">${data.hasAdjustments && data.actualKmTraveled ? `${mileage} KM (Quoted: ${originalKm} KM)` : `${mileage} KM`}</td>
          </tr>
        </table>
      `;
    } else {
      // Continuation page — mini header
      pageContent += miniHeader(companyLogo, documentTitle, data.invoiceNo, data.quotationNo, currentDate);
    }

    // Bus rows table
    pageContent += `
      <table style="width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px;">
        ${tableHeaderRow()}
        ${chunk.map(row => renderBusRowTR(row)).join('')}
      </table>
    `;

    // If this is the last item page, append totals + payment info
    if (isLastItemPage) {
      pageContent += totalsHTML;
    }

    // Footer
    pageContent += `
      <div style="margin-top: 15px; padding-top: 10px; text-align: center; font-size: 12px; border-top: 1px solid #ddd;">
        Page ${pageNum} of ${totalPages}<br>
         NCG Holding - Transport Management System
      </div>
    `;

    pagesHTML.push(`
      <div data-pdf-page="${pageNum}" style="position: relative; width: 210mm; min-height: 297mm; padding: 15px 15px 25px 15px; box-sizing: border-box; background: #fff;">
        ${pageContent}
      </div>
    `);
  });

  // ---- Signature page ----
  if (showSignaturePage) {
    const sigPageNum = itemPageCount + 1;
    pagesHTML.push(`
      <div data-pdf-page="${sigPageNum}" style="position: relative; width: 210mm; min-height: 297mm; padding: 15px 15px 25px 15px; box-sizing: border-box; background: #fff;">
        ${miniHeader(companyLogo, documentTitle, data.invoiceNo, data.quotationNo, currentDate)}

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
          Page ${sigPageNum} of ${totalPages}<br>
          NCG Holding - Transport Management System
        </div>
      </div>
    `);
  } else if (data.hideSignaturePage) {
    // No extra page, but add note to last item page — already handled by forCustomer logic
  }

  // Wrap all pages
  return `
    <div id="invoice-root" style="font-family: Arial, sans-serif; margin: 0; padding: 0; background: #fff; color: #000; width: 210mm; box-sizing: border-box;">
      ${isDraft ? `<style>${draftWatermarkStyles}</style>` : ''}
      ${pagesHTML.join('\n')}
      ${data.forCustomer || data.hideSignaturePage ? `
      <div style="margin-top: 20px; text-align: center; font-size: 12px; color: #555; font-style: italic;">
        "This is a computer-generated document and does not require a physical signature."
      </div>
      ` : ''}
    </div>
  `;
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
    
    const pages = tempDiv.querySelectorAll('[data-pdf-page]') as NodeListOf<HTMLElement>;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;

    if (pages.length > 0) {
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
