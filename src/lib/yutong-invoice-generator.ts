import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';

export interface YutongInvoiceData {
  invoiceNo: string;
  quotationNo: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  companyName?: string;
  busModel: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
  totalPrice: number;
  paymentTerms?: string;
  deliveryTimeline?: string;
  warrantyTerms?: string;
  specialFeatures?: string;
  validUntil: Date;
  companyLogo?: string;
  // Status fields
  invoice_status?: 'draft' | 'approved';
  // Approval signatures
  preparedBy?: {
    approver_name: string;
    signature_data?: string;
    signature_type?: 'text' | 'drawing' | 'image';
    approval_date: string;
  };
  approvedBy?: {
    approver_name: string;
    signature_data?: string;
    signature_type?: 'text' | 'drawing' | 'image';
    approval_date: string;
  };
  receivedBy?: {
    approver_name: string;
    signature_data?: string;
    signature_type?: 'text' | 'drawing' | 'image';
    approval_date: string;
  };
}

export const generateYutongInvoiceHTML = (data: YutongInvoiceData): string => {
  const currentDate = format(new Date(), 'dd/MM/yyyy');
  const companyLogo = data.companyLogo || '/lovable-uploads/52e834c4-cfda-4ea3-9da7-aac1f23e1162.png';
  const isDraft = data.invoice_status === 'draft';
  const discountAmount = data.discountAmount || 0;
  const subtotal = data.unitPrice * data.quantity;
  const finalAmount = subtotal - discountAmount;
  
  // Enhanced draft watermark styles
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

  return `
    <div style="font-family: Arial, sans-serif; font-size: 14px; margin: 0; padding: 20px; width: 210mm; min-height: 297mm; background: white; color: black; box-sizing: border-box; position: relative;">
      ${isDraft ? '<div class="draft-watermark"><div class="draft-text">DRAFT</div></div>' : ''}
      <style>
        ${draftWatermarkStyles}
        .signature-section {
          border: 1px solid #ddd;
          padding: 10px;
          margin: 5px 0;
          min-height: 60px;
          position: relative;
        }
        .signature-image {
          max-width: 150px;
          max-height: 50px;
          margin: 5px 0;
        }
      </style>
      
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px;">
        <img src="${companyLogo}" alt="Company Logo" style="width: 150px;">
        <div style="text-align: right; font-size: 13px;">
          <b>NCG EXPRESS (PRIVATE) LIMITED</b><br>
          157/1, Kebellaowita, Wenwellkola, Polgasowita<br>
          0777556322
        </div>
      </div>

      <!-- Invoice Title -->
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="margin: 0; font-size: 24px; color: #333;">YUTONG BUS SALES INVOICE</h1>
        <p style="margin: 5px 0; font-size: 12px; color: #666;">Bus Sales & Service Invoice</p>
      </div>

      <!-- Invoice Info -->
      <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
        <div style="width: 48%;">
          <h3 style="margin: 0 0 10px 0; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Invoice Details</h3>
          <p><strong>Invoice No:</strong> ${data.invoiceNo}</p>
          <p><strong>Quotation No:</strong> ${data.quotationNo}</p>
          <p><strong>Date:</strong> ${currentDate}</p>
          <p><strong>Valid Until:</strong> ${format(data.validUntil, 'dd/MM/yyyy')}</p>
        </div>
        <div style="width: 48%;">
          <h3 style="margin: 0 0 10px 0; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Customer Details</h3>
          <p><strong>Customer:</strong> ${data.customerName}</p>
          ${data.companyName ? `<p><strong>Company:</strong> ${data.companyName}</p>` : ''}
          <p><strong>Phone:</strong> ${data.customerPhone}</p>
          ${data.customerEmail ? `<p><strong>Email:</strong> ${data.customerEmail}</p>` : ''}
        </div>
      </div>

      <!-- Bus Details Table -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; border: 2px solid #ddd; box-sizing: border-box;">
        <thead>
          <tr style="background: #f8f9fa;">
            <th style="border: 1px solid #ddd; border-right: 1px solid #ddd; border-bottom: 1px solid #ddd; padding: 12px; text-align: left; box-sizing: border-box;">Bus Model</th>
            <th style="border: 1px solid #ddd; border-right: 1px solid #ddd; border-bottom: 1px solid #ddd; padding: 12px; text-align: center; box-sizing: border-box;">Quantity</th>
            <th style="border: 1px solid #ddd; border-right: 1px solid #ddd; border-bottom: 1px solid #ddd; padding: 12px; text-align: right; box-sizing: border-box;">Unit Price (LKR)</th>
            <th style="border: 1px solid #ddd; border-right: 2px solid #ddd; border-bottom: 1px solid #ddd; padding: 12px; text-align: right; box-sizing: border-box;">Total (LKR)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #ddd; border-right: 1px solid #ddd; border-bottom: 2px solid #ddd; padding: 12px; box-sizing: border-box;">
              <strong>${data.busModel}</strong>
              ${data.specialFeatures ? `<br><small style="color: #666;">${data.specialFeatures}</small>` : ''}
            </td>
            <td style="border: 1px solid #ddd; border-right: 1px solid #ddd; border-bottom: 2px solid #ddd; padding: 12px; text-align: center; box-sizing: border-box;">${data.quantity}</td>
            <td style="border: 1px solid #ddd; border-right: 1px solid #ddd; border-bottom: 2px solid #ddd; padding: 12px; text-align: right; box-sizing: border-box;">${data.unitPrice.toLocaleString()}</td>
            <td style="border: 1px solid #ddd; border-right: 2px solid #ddd; border-bottom: 2px solid #ddd; padding: 12px; text-align: right; font-weight: bold; box-sizing: border-box;">${subtotal.toLocaleString()}</td>
          </tr>
        </tbody>
      </table>

      <!-- Pricing Summary -->
      <div style="margin-left: auto; width: 300px; margin-bottom: 30px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; text-align: right; border-bottom: 1px solid #eee;">Subtotal:</td>
            <td style="padding: 8px; text-align: right; border-bottom: 1px solid #eee; font-weight: bold;">LKR ${subtotal.toLocaleString()}</td>
          </tr>
          ${discountAmount > 0 ? `
          <tr>
            <td style="padding: 8px; text-align: right; border-bottom: 1px solid #eee;">Discount:</td>
            <td style="padding: 8px; text-align: right; border-bottom: 1px solid #eee; color: #dc3545;">-LKR ${discountAmount.toLocaleString()}</td>
          </tr>
          ` : ''}
          <tr style="background: #f8f9fa;">
            <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 16px; border-top: 2px solid #333;">TOTAL AMOUNT:</td>
            <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 16px; border-top: 2px solid #333;">LKR ${data.totalPrice.toLocaleString()}</td>
          </tr>
        </table>
      </div>

      <!-- Terms and Conditions -->
      <div style="margin-bottom: 30px;">
        <h3 style="margin: 0 0 15px 0; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Terms & Conditions</h3>
        <div style="display: flex; gap: 20px;">
          <div style="flex: 1;">
            ${data.paymentTerms ? `<p><strong>Payment Terms:</strong> ${data.paymentTerms}</p>` : ''}
            ${data.deliveryTimeline ? `<p><strong>Delivery Timeline:</strong> ${data.deliveryTimeline}</p>` : ''}
          </div>
          <div style="flex: 1;">
            ${data.warrantyTerms ? `<p><strong>Warranty:</strong> ${data.warrantyTerms}</p>` : ''}
          </div>
        </div>
      </div>

      <!-- Signatures Section -->
      <div style="margin-top: 50px;">
        <h3 style="margin: 0 0 20px 0; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Approvals</h3>
        <div style="display: flex; justify-content: space-between; gap: 20px;">
          <div class="signature-section" style="flex: 1;">
            <div style="font-weight: bold; margin-bottom: 5px;">Prepared By:</div>
            ${data.preparedBy ? `
              <div style="margin-bottom: 5px;">Name: ${data.preparedBy.approver_name}</div>
              <div style="margin-bottom: 5px;">Date: ${format(new Date(data.preparedBy.approval_date), 'dd/MM/yyyy')}</div>
              ${data.preparedBy.signature_data ? 
                data.preparedBy.signature_type === 'text' 
                  ? `<div style="font-family: 'Brush Script MT', cursive; font-size: 24px; font-style: italic; padding: 10px 0;">${data.preparedBy.signature_data}</div>` 
                  : `<img src="${data.preparedBy.signature_data}" alt="Signature" class="signature-image">`
                : '<div style="height: 30px;"></div>'}
            ` : `
              <div style="margin-bottom: 5px;">Name: _________________</div>
              <div style="margin-bottom: 5px;">Date: _________________</div>
              <div style="height: 30px; border-bottom: 1px solid #ddd; margin: 10px 0;"></div>
            `}
          </div>
          
          <div class="signature-section" style="flex: 1;">
            <div style="font-weight: bold; margin-bottom: 5px;">Approved By:</div>
            ${data.approvedBy ? `
              <div style="margin-bottom: 5px;">Name: ${data.approvedBy.approver_name}</div>
              <div style="margin-bottom: 5px;">Date: ${format(new Date(data.approvedBy.approval_date), 'dd/MM/yyyy')}</div>
              ${data.approvedBy.signature_data ? 
                data.approvedBy.signature_type === 'text' 
                  ? `<div style="font-family: 'Brush Script MT', cursive; font-size: 24px; font-style: italic; padding: 10px 0;">${data.approvedBy.signature_data}</div>` 
                  : `<img src="${data.approvedBy.signature_data}" alt="Signature" class="signature-image">`
                : '<div style="height: 30px;"></div>'}
            ` : `
              <div style="margin-bottom: 5px;">Name: _________________</div>
              <div style="margin-bottom: 5px;">Date: _________________</div>
              <div style="height: 30px; border-bottom: 1px solid #ddd; margin: 10px 0;"></div>
            `}
          </div>
          
          <div class="signature-section" style="flex: 1;">
            <div style="font-weight: bold; margin-bottom: 5px;">Customer Received:</div>
            ${data.receivedBy ? `
              <div style="margin-bottom: 5px;">Name: ${data.receivedBy.approver_name}</div>
              <div style="margin-bottom: 5px;">Date: ${format(new Date(data.receivedBy.approval_date), 'dd/MM/yyyy')}</div>
              ${data.receivedBy.signature_data ? 
                data.receivedBy.signature_type === 'text' 
                  ? `<div style="font-family: 'Brush Script MT', cursive; font-size: 24px; font-style: italic; padding: 10px 0;">${data.receivedBy.signature_data}</div>` 
                  : `<img src="${data.receivedBy.signature_data}" alt="Signature" class="signature-image">`
                : '<div style="height: 30px;"></div>'}
            ` : `
              <div style="margin-bottom: 5px;">Name: _________________</div>
              <div style="margin-bottom: 5px;">Date: _________________</div>
              <div style="height: 30px; border-bottom: 1px solid #ddd; margin: 10px 0;"></div>
            `}
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px;">
        <p>Thank you for choosing NCG Express for your bus requirements!</p>
        <p>For any queries, please contact us at 0777556322 or email us.</p>
      </div>
    </div>
  `;
};

export const generateYutongInvoicePDF = async (data: YutongInvoiceData): Promise<Blob> => {
  try {
    // Generate HTML content
    const htmlContent = generateYutongInvoiceHTML(data);
    
    // Create a temporary div to render the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '-9999px';
    document.body.appendChild(tempDiv);

    // Convert HTML to canvas
    const canvas = await html2canvas(tempDiv.firstElementChild as HTMLElement, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: 794, // A4 width in pixels at 96 DPI
      height: 1123, // A4 height in pixels at 96 DPI
    });

    // Remove temporary div
    document.body.removeChild(tempDiv);

    // Create PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgData = canvas.toDataURL('image/png');
    
    // Calculate dimensions to fit A4
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    let heightLeft = imgHeight;
    let position = 0;

    // Add first page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Add additional pages if needed
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Return as blob
    return new Promise((resolve) => {
      const pdfBlob = pdf.output('blob');
      resolve(pdfBlob);
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF');
  }
};