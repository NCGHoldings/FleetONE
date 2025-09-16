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
  // Enhanced fields for the multi-step workflow
  invoice_status?: 'draft' | 'approved';
  document_type?: 'sales_receipt' | 'invoice';
  // Approval signatures
  preparedBy?: ApprovalSignature;
  checkedBy?: ApprovalSignature;
  approvedBy?: ApprovalSignature;
}

export const generateInvoiceHTML = (data: InvoiceData): string => {
  const isAdvanceInvoice = data.invoiceType === 'advance';
  const isSalesReceipt = data.document_type === 'sales_receipt' || isAdvanceInvoice;
  const currentDate = format(new Date(), 'dd/MM/yyyy');
  const companyLogo = data.companyLogo || '/lovable-uploads/52e834c4-cfda-4ea3-9da7-aac1f23e1162.png';
  const isDraft = data.invoice_status === 'draft';
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
      <div style="font-family: Arial, sans-serif; font-size: 14px; margin: 0; padding: 20px; width: 210mm; min-height: 297mm; background: white; color: black; box-sizing: border-box; position: relative;">
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

        <div style="margin-top: 30px; display: flex; justify-content: space-between;">
          <div style="width: 30%;">
            <b>Prepared by :</b><br>
            <p style="margin: 5px 0;">Name: ${data.preparedBy?.approver_name || '.........................'}</p>
            ${data.preparedBy?.signature_data 
              ? `<p style="margin: 5px 0;"><img src="${data.preparedBy.signature_data}" alt="Signature" style="max-width: 120px; max-height: 40px; border: 1px solid #ddd;"></p>` 
              : '<p style="margin: 5px 0;">Signature: .........................</p>'
            }
            <p style="margin: 5px 0;">Date: ${data.preparedBy?.approval_date || currentDate}</p>
          </div>
          <div style="width: 30%;">
            <b>Checked by :</b><br>
            <p style="margin: 5px 0;">Name: ${data.checkedBy?.approver_name || '.........................'}</p>
            ${data.checkedBy?.signature_data 
              ? `<p style="margin: 5px 0;"><img src="${data.checkedBy.signature_data}" alt="Signature" style="max-width: 120px; max-height: 40px; border: 1px solid #ddd;"></p>` 
              : '<p style="margin: 5px 0;">Signature: .........................</p>'
            }
            <p style="margin: 5px 0;">Date: ${data.checkedBy?.approval_date || '.........................'}</p>
          </div>
          <div style="width: 30%;">
            <b>Approved by :</b><br>
            <p style="margin: 5px 0;">Name: ${data.approvedBy?.approver_name || '.........................'}</p>
            ${data.approvedBy?.signature_data 
              ? `<p style="margin: 5px 0;"><img src="${data.approvedBy.signature_data}" alt="Signature" style="max-width: 120px; max-height: 40px; border: 1px solid #ddd;"></p>` 
              : '<p style="margin: 5px 0;">Signature: .........................</p>'
            }
            <p style="margin: 5px 0;">Date: ${data.approvedBy?.approval_date || '.........................'}</p>
          </div>
        </div>

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
    const priceAfterDiscount = subTotal - discount;
    const previousAdvance = data.advanceAmount || 0; // kept for reference
    const totalPaid = data.paidAmount || 0;
    const balanceDue = priceAfterDiscount - totalPaid;
    const itemDetail = data.itemDetail || `${data.pickupLocation} to ${data.dropLocation}`;
    const mileage = data.numberOfBuses * 100; // Placeholder mileage calculation

    return `
      <div style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #fff; color: #000; width: 100%; max-width: 210mm; min-height: 297mm; box-sizing: border-box; position: relative;">
        ${isDraft ? '<div class="draft-watermark"><div class="draft-text">DRAFT</div></div>' : ''}
        <style>
          ${draftWatermarkStyles}
          @media print {
            .invoice-container { width: 210mm !important; max-width: none !important; }
          }
        </style>
        
        <div class="invoice-container" style="width: 100%; max-width: 800px; margin: auto; border: 1px solid #ddd; padding: 15px; box-sizing: border-box;">
          <!-- Header -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
            <img src="${companyLogo}" alt="NCG Express Logo" style="height: 70px;">
            <div style="text-align: right; font-size: 14px;">
              <strong>NCG EXPRESS (PRIVATE) LIMITED</strong><br>
              157, Kebellawovita, Wenivelkola, Polgasovita<br>
              0777556322
            </div>
          </div>

          <h2 style="text-align: center; text-decoration: underline; margin-bottom: 20px;">${documentTitle}${isDraft ? ' - DRAFT' : ''}</h2>

          <!-- Invoice Info -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
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

          <!-- Item Table -->
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px;">
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

          <!-- Summary -->
          <table style="width: 100%; max-width: 300px; float: right; border-collapse: collapse; margin-top: 20px; font-size: 14px;">
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">Sub-Total</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${subTotal.toLocaleString()}.00</td>
            </tr>
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
              <td style="border: 1px solid #ddd; padding: 8px; font-weight: bold;">Balance Due</td>
              <td style="border: 1px solid #ddd; padding: 8px;">${balanceDue.toLocaleString()}.00</td>
            </tr>
          </table>

          <!-- Payment Info -->
          <div style="margin-top: 40px; font-size: 13px; clear: both;">
            <strong>Payment Info</strong><br>
            Account No: <b>193414017578</b><br>
            Account Name: <b>NCG Express (Pvt) Limited</b><br>
            Bank & Branch: <b>Sampath Bank - Nugegoda</b><br><br>
            <strong>Terms & Conditions:</strong><br>
            1. Cheques are to be drawn in favour of <b>NCG EXPRESS (PVT) LIMITED</b> and A/C payee only.
          </div>

          <!-- Signatures -->
          <div style="display: flex; justify-content: space-between; margin-top: 50px; font-size: 14px;">
            <div style="text-align: center;">
              ${data.preparedBy?.signature_data 
                ? `<img src="${data.preparedBy.signature_data}" alt="Signature" style="max-width: 150px; max-height: 50px; margin-bottom: 10px; border: 1px solid #ddd;">` 
                : '<hr style="width: 150px;">'
              }
              ${data.preparedBy?.approver_name || 'Darshini Pallewela'}<br>
              Prepared By<br>
              ${data.preparedBy?.approval_date || currentDate}
            </div>
            <div style="text-align: center;">
              ${data.checkedBy?.signature_data 
                ? `<img src="${data.checkedBy.signature_data}" alt="Signature" style="max-width: 150px; max-height: 50px; margin-bottom: 10px; border: 1px solid #ddd;">` 
                : '<hr style="width: 150px;">'
              }
              ${data.checkedBy?.approver_name || 'Kasun Perera'}<br>
              Checked By<br>
              ${data.checkedBy?.approval_date || currentDate}
            </div>
            <div style="text-align: center;">
              ${data.approvedBy?.signature_data 
                ? `<img src="${data.approvedBy.signature_data}" alt="Signature" style="max-width: 150px; max-height: 50px; margin-bottom: 10px; border: 1px solid #ddd;">` 
                : '<hr style="width: 150px;">'
              }
              ${data.approvedBy?.approver_name || 'Sithara Thennakoon'}<br>
              Approved By<br>
              ${data.approvedBy?.approval_date || format(new Date(Date.now() - 24 * 60 * 60 * 1000), 'dd/MM/yyyy')}
            </div>
          </div>

          <!-- Note -->
          <div style="margin-top: 30px; font-size: 12px; text-align: center; color: #555; font-style: italic;">
            "This is a computer-generated invoice and does not require a physical signature."
          </div>
        </div>
      </div>
    `;
  }
};

export const generateInvoicePDF = async (data: InvoiceData): Promise<Blob> => {
  console.log('Starting PDF generation for:', data.invoiceType);
  
  // Create a temporary offscreen container and sanitize HTML
  const tempDiv = document.createElement('div');
  const rawHtml = generateInvoiceHTML(data);
  let contentHtml = rawHtml;

  // If a full HTML document was returned, extract the main invoice container
  const containerMatch = rawHtml.match(/<div class=\"invoice-container\">[\s\S]*?<\/div>/);
  if (containerMatch) {
    contentHtml = `<div id="invoice-root">${containerMatch[0]}</div>`;
  } else {
    // Strip doctype and html/head/body wrappers just in case
    const stripped = rawHtml
      .replace(/<!DOCTYPE[^>]*>/gi, '')
      .replace(/<html[^>]*>/gi, '')
      .replace(/<\/html>/gi, '')
      .replace(/<head>[\s\S]*?<\/head>/gi, '')
      .replace(/<body[^>]*>/gi, '')
      .replace(/<\/body>/gi, '');
    contentHtml = `<div id="invoice-root">${stripped}</div>`;
  }

  tempDiv.innerHTML = contentHtml;
  tempDiv.style.position = 'absolute';
  tempDiv.style.left = '-9999px';
  tempDiv.style.top = '-9999px';
  tempDiv.style.width = '210mm';
  tempDiv.style.height = 'auto';
  document.body.appendChild(tempDiv);

  try {
    console.log('Converting HTML to canvas...');
    
    // Wait a bit for any async content to load
    await new Promise(resolve => setTimeout(resolve, 100));
    
  // Convert HTML to canvas with improved settings and error handling
  const rootEl = tempDiv.querySelector('#invoice-root') as HTMLElement | null;
  if (!rootEl) {
    throw new Error('Invoice root element not found');
  }

  const canvas = await html2canvas(rootEl, {
    scale: 2,
    useCORS: true,
    allowTaint: false, // avoid PNG signature issues
    backgroundColor: '#ffffff',
    scrollX: 0,
    scrollY: 0,
    foreignObjectRendering: false,
    removeContainer: true,
    logging: false,
    onclone: (clonedDoc) => {
      const images = clonedDoc.querySelectorAll('img');
      images.forEach((img) => {
        if (!img.complete || img.naturalHeight === 0) {
          img.remove();
        }
      });
    },
  });

    console.log('Canvas created, generating PDF...');
    
    // Create PDF with proper margins
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
  // Convert canvas to JPEG data URL only (avoid PNG signature errors)
  let imgData: string;
  try {
    imgData = canvas.toDataURL('image/jpeg', 0.95);
  } catch (error) {
    console.error('Failed to convert canvas to JPEG:', error);
    throw new Error('Failed to generate image (JPEG) for PDF');
  }
    
    // Add image with no margins for clean edge-to-edge rendering
    pdf.addImage(imgData, imgData.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG', 0, 0, imgWidth, imgHeight);
    
    console.log('PDF generation completed successfully');
    return pdf.output('blob');
  } catch (error) {
    console.error('PDF generation failed:', error);
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    // Clean up
    if (document.body.contains(tempDiv)) {
      document.body.removeChild(tempDiv);
    }
  }
};