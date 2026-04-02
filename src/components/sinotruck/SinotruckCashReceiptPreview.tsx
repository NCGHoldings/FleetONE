// @ts-nocheck
import React, { forwardRef } from 'react';
import { format } from 'date-fns';
import { SinotruckCashReceipt } from '@/hooks/useSinotruckCashReceipts';

interface SinotruckCashReceiptPreviewProps {
  receipt: SinotruckCashReceipt;
}

export const SinotruckCashReceiptPreview = forwardRef<HTMLDivElement, SinotruckCashReceiptPreviewProps>(
  ({ receipt }, ref) => {
    const formattedDate = format(new Date(receipt.receipt_date), 'dd/MM/yyyy');
    
    const getPaymentMethodDisplay = (method: string) => {
      const methods: Record<string, { cash: boolean; cheque: boolean; bank: boolean }> = {
        'cash': { cash: true, cheque: false, bank: false },
        'cheque': { cash: false, cheque: true, bank: false },
        'bank_transfer': { cash: false, cheque: false, bank: true },
        'online': { cash: false, cheque: false, bank: true }
      };
      return methods[method] || { cash: false, cheque: false, bank: false };
    };

    const paymentMethods = getPaymentMethodDisplay(receipt.payment_method);

    const pageStyles = `
      @media print {
        .cash-receipt-page {
          page-break-after: always;
        }
      }
      .cash-receipt-page {
        background: white;
        max-width: 900px;
        margin: 0 auto;
        font-family: Arial, sans-serif;
        color: #000;
      }
      .receipt-header {
        margin-bottom: 20px;
      }
      .receipt-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
      }
      .receipt-table th {
        background: #dc2626;
        color: white;
        padding: 10px;
        text-align: center;
        border: 1px solid #dc2626;
      }
      .receipt-table td {
        padding: 10px;
        border: 1px solid #dc2626;
      }
      .amount-cell {
        background: #fef2f2;
      }
      .amount-words-cell {
        background: #f5f5f5;
      }
      .signature-section {
        display: flex;
        justify-content: space-between;
        margin-top: 40px;
        margin-bottom: 20px;
      }
      .signature-field {
        text-align: center;
        width: 45%;
        min-height: 100px;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
      }
      .signature-content {
        height: 70px;
        display: flex;
        align-items: flex-end;
        justify-content: center;
      }
      .signature-line {
        border-top: 1px dotted #000;
        padding-top: 5px;
        margin-top: 10px;
      }
      .footer-contact {
        background: #dc2626;
        color: white;
        padding: 10px;
        font-size: 13px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .payment-method-box {
        display: inline-block;
        padding: 2px 8px;
        border: 1px solid #dc2626;
        margin-right: 10px;
        font-size: 12px;
      }
      .payment-method-true {
        background: #dc2626;
        color: white;
      }
      .payment-method-false {
        background: white;
        color: #dc2626;
      }
    `;

    return (
      <div ref={ref} style={{ fontFamily: 'Arial, sans-serif', margin: 0, padding: '20px', background: '#f9f9f9', color: '#000' }}>
        <style dangerouslySetInnerHTML={{ __html: pageStyles }} />
        
        <div className="cash-receipt-page" style={{ border: '2px solid #dc2626', padding: '0' }}>
          {/* Header - Receipt specific branding */}
          <div className="receipt-header" style={{
            background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
            padding: '15px 25px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <img 
                src="/lovable-uploads/4f23f225-3dd1-4b3a-a078-0be25fd07b9c.png" 
                alt="NCG Holdings" 
                style={{ height: '50px', objectFit: 'contain' }}
              />
              <div style={{ color: 'white' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold' }}>NCG HOLDINGS (PVT) LTD</div>
                <div style={{ fontSize: '10px', opacity: 0.9 }}>Authorized Dealer</div>
              </div>
            </div>
            <div style={{ 
              color: 'white', 
              fontSize: '32px', 
              fontWeight: 'bold',
              letterSpacing: '4px',
              textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
            }}>
              RECEIPT
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <img 
                src="/lovable-uploads/3b2d4cfc-0490-40f7-b329-fa8a328ce48a.png" 
                alt="Sinotruck" 
                style={{ height: '40px', objectFit: 'contain' }}
              />
            </div>
          </div>

          <div style={{ padding: '20px' }}>
            {/* Cash Receipt Title */}
            <div style={{ 
              textAlign: 'center', 
              fontSize: '24px', 
              fontWeight: 'bold', 
              color: '#dc2626',
              marginBottom: '20px',
              textDecoration: 'underline'
            }}>
              CASH RECEIPT
            </div>

            {/* Customer Info and Receipt Info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
              {/* Left side - Customer Info */}
              <div style={{ flex: 1 }}>
                <p style={{ margin: '4px 0', fontSize: '14px' }}>
                  <b>CUSTOMER :</b> {receipt.customer_name || '-'}
                </p>
                <p style={{ margin: '4px 0', fontSize: '14px' }}>
                  <b>ADDRESS :</b> {receipt.customer_address || '-'}
                </p>
                <p style={{ margin: '4px 0', fontSize: '14px' }}>
                  <b>CONTACT :</b> {receipt.customer_contact || '-'}
                </p>
                <p style={{ margin: '4px 0', fontSize: '14px' }}>
                  <b>DATE :</b> {formattedDate}
                </p>
              </div>

              {/* Right side - Receipt Info */}
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: '4px 0', fontSize: '14px' }}>
                  <b>RECEIPT NO :</b> {receipt.receipt_no}
                </p>
                <p style={{ margin: '4px 0', fontSize: '14px' }}>
                  <b>QUOTATION NO :</b> {receipt.quotation_no || '-'}
                </p>
                <div style={{ marginTop: '10px' }}>
                  <b style={{ fontSize: '12px' }}>MODE OF PAYMENT:</b>
                  <div style={{ marginTop: '5px' }}>
                    <span className={`payment-method-box ${paymentMethods.cash ? 'payment-method-true' : 'payment-method-false'}`}>
                      CASH: {paymentMethods.cash ? '✓' : '✗'}
                    </span>
                    <span className={`payment-method-box ${paymentMethods.cheque ? 'payment-method-true' : 'payment-method-false'}`}>
                      CHEQUE: {paymentMethods.cheque ? '✓' : '✗'}
                    </span>
                    <span className={`payment-method-box ${paymentMethods.bank ? 'payment-method-true' : 'payment-method-false'}`}>
                      BANK: {paymentMethods.bank ? '✓' : '✗'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Receipt Table */}
            <table className="receipt-table">
              <thead>
                <tr>
                  <th style={{ width: '70%' }}>DESCRIPTION</th>
                  <th style={{ width: '30%' }}>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="amount-cell" style={{ fontSize: '14px', fontWeight: 'bold' }}>
                    {receipt.product_description || 'ADVANCE PAYMENT FOR SINOTRUCK'}
                  </td>
                  <td style={{ textAlign: 'center', fontSize: '16px', fontWeight: 'bold' }}>
                    LKR {receipt.amount.toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td className="amount-words-cell" colSpan={2} style={{ fontSize: '14px' }}>
                    <b>AMOUNT IN WORDS:</b> {receipt.amount_in_words || '-'}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Signature Section - Customer and Finance Only */}
            <div className="signature-section">
              <div className="signature-field">
                <div className="signature-content">
                  {receipt.customer_signature_data ? (
                    receipt.customer_signature_type === 'drawing' || receipt.customer_signature_type === 'image' ? (
                      <img
                        src={receipt.customer_signature_data}
                        alt="Customer signature"
                        style={{ maxHeight: '60px', maxWidth: '100%' }}
                      />
                    ) : (
                      <div style={{ fontFamily: 'cursive', fontSize: '18px' }}>
                        {receipt.customer_signature_data}
                      </div>
                    )
                  ) : null}
                </div>
                <div className="signature-line">
                  {receipt.customer_signer_name ? (
                    <>
                      {receipt.customer_signer_name}
                      <br />
                      <small>{receipt.customer_signed_at ? format(new Date(receipt.customer_signed_at), 'dd/MM/yyyy') : ''}</small>
                    </>
                  ) : 'Customer'}
                </div>
              </div>

              {/* Date in middle */}
              <div style={{ textAlign: 'center', alignSelf: 'flex-end', paddingBottom: '10px' }}>
                <p style={{ fontSize: '14px' }}>
                  <b>DATE:</b> {formattedDate}
                </p>
              </div>

              <div className="signature-field">
                <div className="signature-content">
                  {receipt.finance_signature_data ? (
                    receipt.finance_signature_type === 'drawing' || receipt.finance_signature_type === 'image' ? (
                      <img
                        src={receipt.finance_signature_data}
                        alt="Finance signature"
                        style={{ maxHeight: '60px', maxWidth: '100%' }}
                      />
                    ) : (
                      <div style={{ fontFamily: 'cursive', fontSize: '18px' }}>
                        {receipt.finance_signature_data}
                      </div>
                    )
                  ) : null}
                </div>
                <div className="signature-line">
                  {receipt.finance_signer_name ? (
                    <>
                      {receipt.finance_signer_name}
                      <br />
                      <small>{receipt.finance_signed_at ? format(new Date(receipt.finance_signed_at), 'dd/MM/yyyy') : ''}</small>
                    </>
                  ) : 'Finance Department'}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="footer-contact">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              📞 +94 77 766 5501
            </div>
            <div>📍 157 Y, Kebelalowita, Weniwelkola, Polgasowita</div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              ✉️ info@ncgholdings.lk
            </div>
          </div>
        </div>
      </div>
    );
  }
);

SinotruckCashReceiptPreview.displayName = 'SinotruckCashReceiptPreview';
