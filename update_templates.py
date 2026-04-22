import os
import json
import urllib.request
import urllib.parse

# Read .env
env_vars = {}
with open('.env') as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith('#'): continue
        if '=' in line:
            k, v = line.split('=', 1)
            env_vars[k.strip()] = v.strip().strip('"').strip("'")

supabase_url = env_vars.get('VITE_SUPABASE_URL')
supabase_key = env_vars.get('VITE_SUPABASE_PUBLISHABLE_KEY')

html_content = """<style>
  body { font-family: Arial, sans-serif; margin: 0; padding: 0; }
  .page { margin: 10px auto; max-width: 850px; background: #ffffff; padding: 30px; color: #000; }
  .header-container { text-align: center; margin-bottom: 20px; }
  .header-container h2 { margin: 0; font-size: 24px; text-transform: uppercase; font-weight: bold; }
  .header-container h3 { margin: 5px 0 0 0; font-size: 16px; text-transform: uppercase; font-weight: bold; }
  table.voucher-table { width: 100%; border-collapse: collapse; border: 2px solid black; margin-bottom: 20px; font-weight: bold; font-size: 12px; }
  table.voucher-table td, table.voucher-table th { border: 1px solid black; padding: 6px; }
  h4.section-title { margin: 0 0 5px 0; font-size: 14px; font-weight: bold; text-transform: uppercase; }
  .amount-words-table { width: 100%; border-collapse: collapse; border: 2px solid black; margin-bottom: 20px; font-weight: bold; font-size: 12px; }
  .amount-words-table td { border: 1px solid black; padding: 6px; }
  .auth-table { width: 100%; border-collapse: collapse; border: 2px solid black; margin-bottom: 20px; font-size: 12px; font-weight: bold; }
  .auth-table th { border: 1px solid black; padding: 6px; text-align: center; width: 33.33%; }
  .auth-table td { border: 1px solid black; padding: 5px; height: 80px; position: relative; vertical-align: top; }
</style>
<div class="page">
  <div class="header-container">
    <h2>NCG HOLDINGS PRIVATE LIMITED</h2>
    <h3>PAYMENT VOUCHER</h3>
  </div>

  <table class="voucher-table">
    <tr>
      <td style="width: 20%;">VOUCHER NO.</td>
      <td style="width: 45%;">{{payment_number}}</td>
      <td style="width: 15%;">DATE</td>
      <td style="width: 20%; text-align: center;">{{payment_date}}</td>
    </tr>
    <tr>
      <td>ISSUED TO</td>
      <td colspan="3">{{vendor_name}}</td>
    </tr>
  </table>

  <h4 class="section-title">PAYMENT INFORMATION</h4>
  <table class="voucher-table">
    <tr>
      <td style="width: 20%;">PAYMENT METHOD</td>
      <td style="width: 30%;">{{payment_method}}</td>
      <td style="width: 20%;">BANK</td>
      <td style="width: 30%;">{{source_bank}}</td>
    </tr>
    <tr>
      <td>REF / CHEQUE NO.</td>
      <td>{{cheque_number}}</td>
      <td colspan="2"></td>
    </tr>
    <tr>
      <td>{{date_label}}</td>
      <td style="text-align: right;">{{date_value}}</td>
      <td>ACCOUNT NO</td>
      <td>{{source_account_number}}</td>
    </tr>
  </table>

  {{beneficiary_bank_details}}

  {{allocations}}

  <h4 class="section-title">AMOUNT IN WORDS</h4>
  <table class="amount-words-table">
    <tr>
      <td style="width: 20%;">LKR (In Words)</td>
      <td style="width: 80%;">{{amount_in_words}}</td>
    </tr>
  </table>

  <h4 class="section-title">AUTHORISATION</h4>
  <table class="auth-table">
    <tr>
      <th>PREPARED BY</th>
      <th>CHECKED BY</th>
      <th>APPROVED BY</th>
    </tr>
    <tr>
      <td>
        <div style="position: absolute; top: 5px; left: 5px;">Name: {{prepared_by}}</div>
        <div style="position: absolute; bottom: 5px; left: 25px;">Signature: _________________</div>
        <div style="position: absolute; bottom: 15px; left: 85px;">{{prepared_by_signature}}</div>
      </td>
      <td>
        <div style="position: absolute; top: 5px; left: 5px;">Name: {{verified_by}}</div>
        <div style="position: absolute; bottom: 5px; left: 25px;">Signature: _________________</div>
        <div style="position: absolute; bottom: 15px; left: 85px;">{{verified_by_signature}}</div>
      </td>
      <td>
        <div style="position: absolute; top: 5px; left: 5px;">Name: {{approved_by}}</div>
        <div style="position: absolute; bottom: 5px; left: 25px;">Signature: _________________</div>
        <div style="position: absolute; bottom: 15px; left: 85px;">{{approved_by_signature}}</div>
      </td>
    </tr>
  </table>

  {{payment_received_by}}

</div>
"""

def request(url, method="GET", data=None):
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json"
    }
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8') if data else None, headers=headers, method=method)
    with urllib.request.urlopen(req) as response:
        if response.status >= 200 and response.status < 300:
            if method != "PATCH":
                return json.loads(response.read().decode())
            return None
        else:
            raise Exception(f"HTTP Error {response.status}")

# 1. Get the template_type_id for ap_payment_voucher
url = f"{supabase_url}/rest/v1/document_template_types?type_code=eq.ap_payment_voucher&select=id"
types = request(url)
if not types:
    print("Could not find ap_payment_voucher type")
    exit(1)

type_id = types[0]['id']
print(f"Found AP Payment Voucher Type ID: {type_id}")

# 2. Update all document_templates with this type_id
patch_url = f"{supabase_url}/rest/v1/document_templates?template_type_id=eq.{type_id}"
request(patch_url, method="PATCH", data={"html_content": html_content})

print("Successfully updated all AP Payment Voucher templates!")
