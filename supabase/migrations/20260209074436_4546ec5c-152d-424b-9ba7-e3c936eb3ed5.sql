-- Fix Yutong AR Invoice template to use customer placeholders and include document_header
UPDATE document_templates 
SET html_content = '<style>
@import url(''https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap'');
body { font-family: ''Inter'', sans-serif; color: #1a1a1a; background-color: #f9fafb; padding: 40px 20px; line-height: 1.5; }
.invoice-wrapper { max-width: 850px; margin: 0 auto; background: white; padding: 50px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1); border-radius: 8px; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; border-bottom: 1px solid #e5e7eb; padding-bottom: 30px; }
h3 { font-weight: 700; font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-bottom: 12px; }
.info-row { display: flex; justify-content: flex-start; margin-bottom: 6px; font-size: 0.95rem; }
.label { font-weight: 600; color: #4b5563; width: 120px; }
.value { color: #111827; }
.customer-section p { font-size: 0.95rem; margin-bottom: 4px; }
.line-items-container { margin: 30px 0; min-height: 100px; }
table { width: 100%; border-collapse: collapse; }
th { background-color: #f3f4f6; text-align: left; padding: 12px; font-size: 0.85rem; text-transform: uppercase; color: #374151; border-bottom: 2px solid #e5e7eb; }
td { padding: 12px; border-bottom: 1px solid #f3f4f6; font-size: 0.95rem; }
.totals-section { margin-left: auto; width: 300px; margin-top: 20px; }
.total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 0.95rem; }
.total-row.grand { border-top: 2px solid #111827; margin-top: 8px; padding-top: 12px; font-weight: 700; font-size: 1.1rem; color: #000; }
.amount-words { margin-top: 40px; padding: 15px; background-color: #f9fafb; border-radius: 6px; font-size: 0.95rem; }
.footer-notes { margin-top: 20px; font-size: 0.9rem; color: #4b5563; }
.document-footer { margin-top: 60px; }
.signature-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 30px; }
.sig-box { text-align: center; }
.sig-line { border-top: 1px solid #9ca3af; padding-top: 10px; font-size: 0.85rem; font-weight: 600; color: #6b7280; text-transform: uppercase; }
@media print { body { background: white; padding: 0; } .invoice-wrapper { box-shadow: none; border: none; width: 100%; max-width: none; } }
</style>

{{document_header}}

<div class="invoice-wrapper">
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px;">
        <h1 style="font-size: 1.875rem; font-weight: 900; letter-spacing: -0.05em; text-transform: uppercase; font-style: italic;">TAX INVOICE</h1>
        <div style="text-align: right;">
            <p style="font-weight: 700; font-size: 1.125rem;">{{company_name}}</p>
            <p style="font-size: 0.875rem; color: #6b7280;">{{company_address}}</p>
            <p style="font-size: 0.875rem; color: #6b7280;">Tel: {{company_phone}}</p>
        </div>
    </div>

    <div class="info-grid">
        <div class="info-section">
            <h3>Invoice Details</h3>
            <div class="info-row"><span class="label">Invoice No:</span><span class="value">{{invoice_number}}</span></div>
            <div class="info-row"><span class="label">Date:</span><span class="value">{{invoice_date}}</span></div>
            <div class="info-row"><span class="label">Due Date:</span><span class="value">{{due_date}}</span></div>
            <div class="info-row"><span class="label">Reference:</span><span class="value">{{reference}}</span></div>
        </div>
        <div class="customer-section">
            <h3>Bill To</h3>
            <p><strong>{{customer_name}}</strong></p>
            <p>{{customer_address}}</p>
            <p>{{customer_phone}}</p>
            <p>{{customer_email}}</p>
            <p style="margin-top: 8px; color: #6b7280;">Customer Code: <span style="color: #000; font-weight: 500;">{{customer_code}}</span></p>
        </div>
    </div>

    <div class="line-items-container">
        {{line_items}}
    </div>

    <div class="totals-section">
        <div class="total-row"><span>Subtotal:</span><span style="font-weight: 500;">{{subtotal}}</span></div>
        <div class="total-row"><span>Tax:</span><span style="font-weight: 500;">{{tax_amount}}</span></div>
        <div class="total-row"><span>Discount:</span><span style="font-weight: 500;">{{discount_amount}}</span></div>
        <div class="total-row grand"><span>Total Due:</span><span>{{total_amount}}</span></div>
    </div>

    <div class="amount-words">
        <strong>Amount in Words:</strong> {{amount_in_words}}
    </div>

    <div class="footer-notes">
        <strong>Notes:</strong> {{notes}}
    </div>

    <div class="document-footer">
        <div class="signature-grid">
            <div class="sig-box">
                <div style="height: 64px;"></div>
                <div class="sig-line">Prepared By</div>
            </div>
            <div class="sig-box">
                <div style="height: 64px;"></div>
                <div class="sig-line">Checked By</div>
            </div>
            <div class="sig-box">
                <div style="height: 64px;"></div>
                <div class="sig-line">Authorized Signature</div>
            </div>
        </div>
    </div>
</div>',
updated_at = NOW()
WHERE id = '530359cb-40f3-49ee-ac5b-7539d3d49d66';