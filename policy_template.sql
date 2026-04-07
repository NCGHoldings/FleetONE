-- ============================================================
-- Policy Template Fix v3 - Bold section titles + bigger header title
-- Run this in Supabase SQL Editor
-- ============================================================

UPDATE document_templates 
SET 
  template_name = 'Policy Template',
  template_code = 'PCY-001',
  html_template = '<!-- HTML Document Template -->
<!-- HIERARCHICAL_NUMBERING -->

<style>
  .policy-section-title {
    font-size: 12pt;
    font-weight: bold;
    margin-top: 16px;
    margin-bottom: 8px;
  }
  .policy-section-title .number {
    font-weight: bold;
    margin-right: 12px;
  }
  .policy-section-title .title-text {
    font-weight: bold;
  }
</style>

<!-- HEADER -->
<div id="doc-header" class="doc-header">
<table class="header-table" border="1" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; border: 1px solid #000;">
  <tr>
    <td class="logo-cell" rowspan="4" style="width: 20%; text-align: center; vertical-align: middle; border: 1px solid #000; padding: 8px;">
      {{company_logo}}
    </td>
    <td rowspan="2" style="width: 45%; text-align: center; vertical-align: middle; font-size: 18pt; font-weight: bold; border: 1px solid #000; padding: 12px; background: #000; color: #fff; letter-spacing: 2px;">
      POLICY
    </td>
    <td class="meta-cell" rowspan="4" style="width: 35%; padding: 0; border: none; vertical-align: top;">
      <table class="meta-table" border="1" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; table-layout: fixed;">
        <tr>
          <td style="width: 50%; padding: 3px 8px; font-size: 10pt; border: 1px solid #000; text-align: left;">Document No.</td>
          <td style="width: 50%; padding: 3px 8px; font-size: 10pt; border: 1px solid #000; text-align: center;">{{document_number}}</td>
        </tr>
        <tr>
          <td style="padding: 3px 8px; font-size: 10pt; border: 1px solid #000; text-align: left;">Issue</td>
          <td style="padding: 3px 8px; font-size: 10pt; border: 1px solid #000; text-align: center;">{{issue_number}}</td>
        </tr>
        <tr>
          <td style="padding: 3px 8px; font-size: 10pt; border: 1px solid #000; text-align: left;">Date of Revision</td>
          <td style="padding: 3px 8px; font-size: 10pt; border: 1px solid #000; text-align: center;">{{revision_date}}</td>
        </tr>
        <tr>
          <td style="padding: 3px 8px; font-size: 10pt; border: 1px solid #000; text-align: left;">Revision No.</td>
          <td style="padding: 3px 8px; font-size: 10pt; border: 1px solid #000; text-align: center;">{{revision_number}}</td>
        </tr>
      </table>
    </td>
  </tr>
  <tr></tr>
  <tr>
    <td class="doc-title-cell" rowspan="2" style="text-align: center; vertical-align: middle; font-size: 16pt; font-weight: bold; border: 1px solid #000; padding: 12px;">
      {{document_title}}
    </td>
  </tr>
  <tr></tr>
</table>
</div>

<!-- CONTENT -->
<div id="doc-content" class="doc-content">

{{SECTION:1.0:Purpose:required}}
<!-- CONTENT_TYPES: text,list -->
<!-- ALLOW_SUB_SECTIONS -->
<div data-section="purpose" data-section-number="1.0">
  <h2 class="policy-section-title" style="font-size: 12pt; font-weight: bold;"><span class="number" style="font-weight: bold;">1.0</span> <span class="title-text" style="font-weight: bold;">Purpose</span></h2>
  <div class="content">
    <p>&lt;Provide a concise overview of the necessity of the policy, outlining its goals and objectives.&gt;</p>
  </div>
</div>

{{SECTION:2.0:Scope:required}}
<!-- CONTENT_TYPES: text,list -->
<!-- ALLOW_SUB_SECTIONS -->
<div data-section="scope" data-section-number="2.0">
  <h2 class="policy-section-title" style="font-size: 12pt; font-weight: bold;"><span class="number" style="font-weight: bold;">2.0</span> <span class="title-text" style="font-weight: bold;">Scope</span></h2>
  <div class="content">
    <p>&lt;Specify the intended audience for this policy.&gt;</p>
    <p>&lt;Clarify where and for whom it applies.&gt;</p>
  </div>
</div>

{{SECTION:3.0:Policy Statement:required}}
<!-- CONTENT_TYPES: text,list,table -->
<!-- ALLOW_SUB_SECTIONS -->
<div data-section="policy_statement" data-section-number="3.0">
  <h2 class="policy-section-title" style="font-size: 12pt; font-weight: bold;"><span class="number" style="font-weight: bold;">3.0</span> <span class="title-text" style="font-weight: bold;">Policy Statement</span></h2>
  <div class="content">
    <p>&lt;Outline what the policy aims to achieve.&gt;</p>
    <p>&lt;Highlight the key principles behind the policy.&gt;</p>
  </div>
</div>

{{SECTION:4.0:Consequences:required}}
<!-- CONTENT_TYPES: text,list -->
<!-- ALLOW_SUB_SECTIONS -->
<div data-section="consequences" data-section-number="4.0">
  <h2 class="policy-section-title" style="font-size: 12pt; font-weight: bold;"><span class="number" style="font-weight: bold;">4.0</span> <span class="title-text" style="font-weight: bold;">Consequences</span></h2>
  <div class="content">
    <p>&lt;Outlines the implications for non-compliance.&gt;</p>
  </div>
</div>

{{SECTION:5.0:Related Documents:optional}}
<!-- CONTENT_TYPES: text,list -->
<!-- ALLOW_SUB_SECTIONS -->
<div data-section="related_documents" data-section-number="5.0">
  <h2 class="policy-section-title" style="font-size: 12pt; font-weight: bold;"><span class="number" style="font-weight: bold;">5.0</span> <span class="title-text" style="font-weight: bold;">Related Documents</span></h2>
  <div class="content">
    <p>&lt;Insert details of each document/annexure (if applicable).&gt;</p>
  </div>
</div>

</div>

<!-- FOOTER -->
<div id="doc-footer" class="doc-footer">
<table class="sign-table" border="1" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; border: 1px solid #000; margin-top: 0;">
  <tr>
    <td style="border: 1px solid #000; padding: 6px 8px; font-weight: bold; width: 15%;"></td>
    <td style="border: 1px solid #000; padding: 6px 8px; font-weight: bold; text-align: center; width: 25%;"><strong>Name</strong></td>
    <td style="border: 1px solid #000; padding: 6px 8px; font-weight: bold; text-align: center; width: 20%;"><strong>Designation</strong></td>
    <td style="border: 1px solid #000; padding: 6px 8px; font-weight: bold; text-align: center; width: 20%;"><strong>Signature</strong></td>
    <td style="border: 1px solid #000; padding: 6px 8px; font-weight: bold; text-align: center; width: 20%;"><strong>Date (YYYY/MM/DD)</strong></td>
  </tr>
  <tr>
    <td style="border: 1px solid #000; padding: 6px 8px; font-weight: bold;">Approved by</td>
    <td style="border: 1px solid #000; padding: 6px 8px; height: 30px;"></td>
    <td style="border: 1px solid #000; padding: 6px 8px;"></td>
    <td style="border: 1px solid #000; padding: 6px 8px;"></td>
    <td style="border: 1px solid #000; padding: 6px 8px;"></td>
  </tr>
  <tr>
    <td style="border: 1px solid #000; padding: 6px 8px; font-weight: bold;">Approved by</td>
    <td style="border: 1px solid #000; padding: 6px 8px; height: 30px;"></td>
    <td style="border: 1px solid #000; padding: 6px 8px;">COO/CEO</td>
    <td style="border: 1px solid #000; padding: 6px 8px;"></td>
    <td style="border: 1px solid #000; padding: 6px 8px;"></td>
  </tr>
</table>

<table class="footer-table" border="1" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; border: 1px solid #000; margin-top: -1px;">
  <tr>
    <td style="border: 1px solid #000; padding: 4px 8px; font-size: 9pt; width: 33%;">Format Revision : {{format_revision}}</td>
    <td style="border: 1px solid #000; padding: 4px 8px; font-size: 9pt; width: 34%; text-align: center;">{{format_revision_date}}</td>
    <td style="border: 1px solid #000; padding: 4px 8px; font-size: 9pt; width: 33%; text-align: right;">Page {{page_number}} of {{total_pages}}</td>
  </tr>
</table>
</div>'
WHERE id = 'f3862562-4b57-499c-9731-8ad981cc9238';

-- Verify
SELECT id, template_name, 
       html_template LIKE '%font-size: 16pt%' AS has_big_title,
       html_template LIKE '%font-weight: bold%' AS has_bold_sections
FROM document_templates 
WHERE id = 'f3862562-4b57-499c-9731-8ad981cc9238';