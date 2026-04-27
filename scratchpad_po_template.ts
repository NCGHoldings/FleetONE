export const generatePurchaseOrderTemplate = (): string => `
<style>
  body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
  .page { margin: 10px auto; max-width: 850px; background: #ffffff; padding: 30px; color: #000; }
  .header-grid { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
  .logo-area { display: flex; align-items: center; }
  img#strict-ncg-logo {
    width: 200px !important;
    max-height: 50px !important;
    object-fit: contain !important;
    object-position: left !important;
  }
  .company-info { text-align: right; }
  .company-name { font-size: 22px; font-weight: bold; margin: 0; text-transform: uppercase; }
  
  .title-container { text-align: center; margin: 20px 0; border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 10px 0; background-color: #f8f9fa; }
  .doc-title { font-size: 20px; font-weight: bold; letter-spacing: 2px; }
  
  table.info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
  table.info-table td { border: 1px solid #000; padding: 8px; }
  .bg-light { background-color: #f1f5f9; font-weight: bold; width: 20%; }
  
  table.items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
  table.items-table th { border: 1px solid #000; padding: 8px; background-color: #e2e8f0; text-align: left; font-weight: bold; text-transform: uppercase; }
  table.items-table td { border: 1px solid #000; padding: 8px; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }
  
  table.auth-table { width: 100%; border-collapse: collapse; border: 1px solid black; margin-top: 40px; font-size: 12px; }
  table.auth-table th { border: 1px solid black; padding: 6px; text-align: center; width: 33.33%; font-weight: bold; background-color: #f8f9fa; }
  table.auth-table td { border: 1px solid black; padding: 5px; height: 80px; position: relative; vertical-align: top; }
</style>
<div class="page">
  <div class="header-grid">
    <div class="logo-area">
      <img id="strict-ncg-logo" src="{{company_logo}}" alt="Company Logo" />
    </div>
    <div class="company-info">
      <div class="company-name">{{company_name}}</div>
      <div>{{company_address}}</div>
      <div>Tel: {{company_phone}} | Email: {{company_email}}</div>
    </div>
  </div>

  <div class="title-container">
    <div class="doc-title">PURCHASE ORDER</div>
  </div>

  <table class="info-table">
    <tr>
      <td class="bg-light">PO NUMBER</td>
      <td style="width: 30%; font-weight: bold; font-size: 14px;">{{po_number}}</td>
      <td class="bg-light">PO DATE</td>
      <td style="width: 30%;">{{order_date}}</td>
    </tr>
    <tr>
      <td class="bg-light">VENDOR</td>
      <td colspan="3"><strong>{{vendor_name}}</strong><br/>{{vendor_address}}<br/>Contact: {{vendor_contact}}</td>
    </tr>
    <tr>
      <td class="bg-light">DELIVERY TO</td>
      <td>{{delivery_address}}</td>
      <td class="bg-light">EXPECTED DATE</td>
      <td>{{expected_date}}</td>
    </tr>
  </table>

  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 5%;">#</th>
        <th style="width: 45%;">DESCRIPTION</th>
        <th style="width: 15%; text-align: center;">QTY</th>
        <th style="width: 15%; text-align: right;">UNIT PRICE</th>
        <th style="width: 20%; text-align: right;">TOTAL</th>
      </tr>
    </thead>
    <tbody>
      {{items_html}}
    </tbody>
  </table>

  <table class="info-table" style="width: 50%; float: right; margin-top: -10px;">
    <tr>
      <td class="bg-light text-right">SUB TOTAL</td>
      <td class="text-right" style="width: 40%;">{{sub_total}}</td>
    </tr>
    <tr>
      <td class="bg-light text-right">TAX AMOUNT</td>
      <td class="text-right">{{tax_amount}}</td>
    </tr>
    <tr>
      <td class="bg-light text-right" style="font-size: 14px;"><strong>GRAND TOTAL</strong></td>
      <td class="text-right" style="font-size: 14px;"><strong>{{currency}} {{grand_total}}</strong></td>
    </tr>
  </table>
  <div style="clear: both;"></div>

  <div style="margin-top: 20px; font-size: 12px;">
    <p><strong>Amount in Words:</strong> {{amount_in_words}}</p>
    <p><strong>Terms & Conditions:</strong><br/>{{terms_conditions}}</p>
  </div>

  <table class="auth-table">
    <tr>
      <th>PREPARED BY</th>
      <th>AUTHORIZED BY</th>
      <th>VENDOR ACCEPTANCE</th>
    </tr>
    <tr>
      <td>
        <div style="position: absolute; top: 5px; left: 5px;">Name: {{prepared_by}}</div>
        <div style="position: absolute; bottom: 5px; left: 25px;">Signature: _________________</div>
      </td>
      <td>
        <div style="position: absolute; top: 5px; left: 5px;">Name: </div>
        <div style="position: absolute; bottom: 5px; left: 25px;">Signature: _________________</div>
      </td>
      <td>
        <div style="position: absolute; top: 5px; left: 5px;">Date: </div>
        <div style="position: absolute; bottom: 5px; left: 25px;">Signature: _________________</div>
      </td>
    </tr>
  </table>
</div>
`;
