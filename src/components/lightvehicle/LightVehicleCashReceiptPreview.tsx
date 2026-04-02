// @ts-nocheck
import React from 'react';
import { LightVehicleCashReceipt } from '@/hooks/useLightVehicleCashReceipts';
import { format } from 'date-fns';

interface LightVehicleCashReceiptPreviewProps {
  receipt: LightVehicleCashReceipt;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  responsiblePersonPhone?: string;
  responsiblePersonEmail?: string;
}

export function LightVehicleCashReceiptPreview({
  receipt,
  companyName = 'NCG FLEET MANAGEMENT',
  companyAddress = '157 Y, Kebelalowita, Weniwelkola, Polgasowita',
  companyPhone = '+94 77 766 5501',
  responsiblePersonPhone,
  responsiblePersonEmail
}: LightVehicleCashReceiptPreviewProps) {
  const formatCurrency = (amount: number) => {
    return `Rs ${amount.toLocaleString()}`;
  };

  const footerPhone = responsiblePersonPhone || '+94 77 123 4567';
  const footerEmail = responsiblePersonEmail || 'info@ncgholdings.lk';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: 'Segoe UI', Arial, sans-serif; 
          font-size: 12px; 
          color: #1a1a1a;
          background: white;
          padding: 30px;
        }
        .receipt-container { 
          max-width: 600px; 
          margin: 0 auto;
          border: 2px solid #2563eb;
          border-radius: 12px;
          overflow: hidden;
        }
        .header { 
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: white;
          padding: 25px;
          text-align: center;
        }
        .header h1 { 
          font-size: 24px; 
          font-weight: 700;
          margin-bottom: 5px;
        }
        .header p { 
          font-size: 11px;
          opacity: 0.9;
        }
        .receipt-title {
          background: #1e40af;
          color: white;
          text-align: center;
          padding: 10px;
          font-size: 16px;
          font-weight: 600;
          letter-spacing: 2px;
        }
        .content {
          padding: 25px;
        }
        .receipt-meta {
          display: flex;
          justify-content: space-between;
          margin-bottom: 25px;
          padding-bottom: 15px;
          border-bottom: 2px dashed #e5e7eb;
        }
        .meta-item {
          text-align: center;
        }
        .meta-item label {
          font-size: 10px;
          color: #6b7280;
          text-transform: uppercase;
          display: block;
          margin-bottom: 4px;
        }
        .meta-item span {
          font-size: 13px;
          font-weight: 600;
          color: #1f2937;
        }
        .customer-section {
          background: #f8fafc;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
        }
        .customer-section h3 {
          font-size: 11px;
          color: #6b7280;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .customer-section p {
          margin: 4px 0;
        }
        .customer-section .name {
          font-weight: 600;
          font-size: 14px;
        }
        .amount-section {
          background: linear-gradient(135deg, #dbeafe, #eff6ff);
          border: 2px solid #2563eb;
          border-radius: 10px;
          padding: 20px;
          text-align: center;
          margin-bottom: 20px;
        }
        .amount-section .label {
          font-size: 12px;
          color: #1e40af;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .amount-section .amount {
          font-size: 28px;
          font-weight: 700;
          color: #1e40af;
        }
        .amount-section .words {
          font-size: 11px;
          color: #3b82f6;
          margin-top: 8px;
          font-style: italic;
        }
        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 20px;
        }
        .detail-item {
          padding: 12px;
          background: #f9fafb;
          border-radius: 6px;
        }
        .detail-item label {
          font-size: 10px;
          color: #6b7280;
          text-transform: uppercase;
          display: block;
          margin-bottom: 4px;
        }
        .detail-item span {
          font-size: 12px;
          font-weight: 500;
        }
        .signatures {
          display: flex;
          justify-content: space-between;
          gap: 30px;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 2px solid #e5e7eb;
        }
        .signature-box {
          flex: 1;
          text-align: center;
        }
        .signature-box .sig-image {
          height: 50px;
          margin-bottom: 5px;
        }
        .signature-box .sig-image img {
          max-height: 50px;
          max-width: 100px;
        }
        .signature-line {
          border-top: 1px solid #1a1a1a;
          margin: 8px 20px;
        }
        .signature-box p {
          font-size: 10px;
          color: #6b7280;
        }
        .signature-box .name {
          font-weight: 600;
          color: #1f2937;
          font-size: 11px;
        }
        .footer {
          text-align: center;
          padding: 15px;
          background: #f8fafc;
          font-size: 10px;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="receipt-container">
        <div class="header">
          <h1>${companyName}</h1>
          <p>${companyAddress}</p>
          <p>Tel: ${companyPhone}</p>
        </div>
        
        <div class="receipt-title">CASH RECEIPT</div>
        
        <div class="content">
          <div class="receipt-meta">
            <div class="meta-item">
              <label>Receipt No</label>
              <span>${receipt.receipt_no}</span>
            </div>
            <div class="meta-item">
              <label>Date</label>
              <span>${format(new Date(receipt.receipt_date), 'MMM dd, yyyy')}</span>
            </div>
            <div class="meta-item">
              <label>Payment Method</label>
              <span>${receipt.payment_method || 'Cash'}</span>
            </div>
          </div>
          
          <div class="customer-section">
            <h3>Received From</h3>
            <p class="name">${receipt.customer_name}</p>
            ${receipt.customer_address ? `<p>${receipt.customer_address}</p>` : ''}
            ${receipt.customer_contact ? `<p>Contact: ${receipt.customer_contact}</p>` : ''}
          </div>
          
          <div class="amount-section">
            <div class="label">Amount Received</div>
            <div class="amount">${formatCurrency(receipt.amount)}</div>
            ${receipt.amount_in_words ? `<div class="words">${receipt.amount_in_words}</div>` : ''}
          </div>
          
          <div class="details-grid">
            ${receipt.quotation_no ? `
            <div class="detail-item">
              <label>Quotation Reference</label>
              <span>${receipt.quotation_no}</span>
            </div>
            ` : ''}
            ${receipt.product_description ? `
            <div class="detail-item" style="grid-column: span 2;">
              <label>For</label>
              <span>${receipt.product_description}</span>
            </div>
            ` : ''}
          </div>
          
          <div class="signatures">
            <div class="signature-box">
              <div class="sig-image">
                ${receipt.customer_signature_data ? `<img src="${receipt.customer_signature_data}" alt="Signature" />` : ''}
              </div>
              <div class="signature-line"></div>
              <p class="name">${receipt.customer_signer_name || ''}</p>
              <p>Customer Signature</p>
            </div>
            <div class="signature-box">
              <div class="sig-image">
                ${receipt.finance_signature_data ? `<img src="${receipt.finance_signature_data}" alt="Signature" />` : ''}
              </div>
              <div class="signature-line"></div>
              <p class="name">${receipt.finance_signer_name || ''}</p>
              <p>Finance Department</p>
            </div>
          </div>
        </div>
        
        <div class="footer">
          <p>📞 ${footerPhone} | ✉️ ${footerEmail}</p>
          <p>Thank you for your payment!</p>
          <p>This is a computer-generated receipt.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <iframe
        srcDoc={html}
        title="Receipt Preview"
        className="w-full h-[600px] border-0"
        sandbox="allow-same-origin"
      />
    </div>
  );
}
