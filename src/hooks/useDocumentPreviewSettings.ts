import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DocumentPreviewSettings, DEFAULT_DOCUMENT_PREVIEW_SETTINGS } from '@/types/documentPreviewSettings';

export const useDocumentPreviewSettings = () => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['document-preview-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'document_preview_settings')
        .maybeSingle();

      if (error) {
        console.error('Error fetching document preview settings:', error);
        return DEFAULT_DOCUMENT_PREVIEW_SETTINGS;
      }

      if (!data) {
        return DEFAULT_DOCUMENT_PREVIEW_SETTINGS;
      }

      return data.setting_value as unknown as DocumentPreviewSettings;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (newSettings: DocumentPreviewSettings) => {
      const { error } = await supabase
        .from('system_settings')
        .update({ 
          setting_value: JSON.parse(JSON.stringify(newSettings)),
          updated_at: new Date().toISOString()
        })
        .eq('setting_key', 'document_preview_settings');

      if (error) throw error;
      return newSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-preview-settings'] });
      toast.success('Document preview settings saved');
    },
    onError: (error) => {
      console.error('Error updating document preview settings:', error);
      toast.error('Failed to save settings');
    },
  });

  const generateCSS = (s: DocumentPreviewSettings = settings || DEFAULT_DOCUMENT_PREVIEW_SETTINGS): string => {
    return `
      /* ============================================
         DOCUMENT PREVIEW SETTINGS - AUTO-GENERATED CSS
         These rules use high specificity to override inline styles
         ============================================ */

      /* Typography Settings - Content Area */
      .a4-page .doc-content,
      .a4-page .doc-content * {
        font-family: ${s.typography.fontFamily} !important;
      }
      
      .a4-page .doc-content {
        font-size: ${s.typography.contentFontSize}px !important;
        line-height: ${s.typography.contentLineHeight} !important;
      }
      
      .a4-page .doc-content p,
      .a4-page .doc-content li {
        font-size: ${s.typography.contentFontSize}px !important;
        line-height: ${s.typography.contentLineHeight} !important;
        margin: 0 0 ${s.typography.paragraphSpacing}px 0 !important;
      }
      
      .a4-page .doc-content h3,
      .a4-page .doc-content .section-title,
      .a4-page .doc-content .main-section-title {
        font-size: ${s.typography.sectionTitleFontSize}px !important;
        font-weight: bold !important;
        margin: ${s.typography.paragraphSpacing + 4}px 0 ${s.typography.paragraphSpacing - 2}px 0 !important;
      }
      
      .a4-page .doc-content .main-section,
      .a4-page .doc-content .section {
        margin-bottom: ${s.typography.paragraphSpacing + 2}px !important;
      }

      /* ============================================
         HEADER SETTINGS - AGGRESSIVE INLINE STYLE OVERRIDE
         These rules override inline font-size and padding in templates
         ============================================ */
      
      /* Override ALL header table cells including those with inline styles */
      .a4-page .header-table td,
      .a4-page .header-table th,
      .a4-page .header-table tbody td,
      .a4-page .header-table tbody tr td,
      .a4-page table.header-table td,
      .a4-page table.header-table th,
      .a4-page .header-table td[style],
      .a4-page .header-table td[style*="font-size"],
      .a4-page .header-table td[style*="padding"],
      .a4-page table[border="1"]:first-of-type td,
      .a4-page table[border="1"]:first-of-type th {
        padding: ${s.header.cellPadding}px ${s.header.cellPadding + 2}px !important;
        font-size: ${s.header.fontSize}px !important;
        line-height: ${s.header.lineHeight} !important;
      }
      
      /* Header title cell (black background) - override inline font-size */
      .a4-page .header-table .header-title-cell,
      .a4-page .header-table td[style*="background"],
      .a4-page .header-table td[style*="#000"],
      .a4-page .header-table td[style*="background:#000"],
      .a4-page .header-table td[style*="background: #000"],
      .a4-page table[border="1"]:first-of-type td[style*="background"] {
        padding: ${s.header.cellPadding}px ${s.header.cellPadding + 2}px !important;
        font-size: ${s.header.titleFontSize}px !important;
      }
      
      /* Nested tables in header (metadata block) */
      .a4-page .header-table table td,
      .a4-page .header-table table th,
      .a4-page table[border="1"]:first-of-type table td {
        padding: ${Math.max(1, s.header.cellPadding - 1)}px ${s.header.cellPadding}px !important;
        font-size: ${s.header.fontSize}px !important;
        line-height: ${s.header.lineHeight} !important;
      }
      
      /* Header logo cell - centering */
      .a4-page .header-table td[rowspan] {
        vertical-align: middle !important;
        text-align: center !important;
      }
      
      .a4-page .header-table img,
      .a4-page table[border="1"]:first-of-type img {
        max-height: ${s.header.logoMaxHeight}px !important;
        max-width: 100% !important;
        display: block !important;
        margin: auto !important;
        object-fit: contain !important;
      }

      /* ============================================
         MEMO HEADER - Meta-table specific overrides
         Ensures Colour code / Reference / Issued Date have proper spacing
         ============================================ */
      
      /* Column widths: logo 20%, title 45%, meta 35% */
      .a4-page .header-table .logo-cell {
        width: 20% !important;
      }
      
      .a4-page .header-table .title-cell {
        width: 45% !important;
        font-size: 14pt !important;
        font-weight: bold !important;
        letter-spacing: 1px !important;
        text-align: center !important;
        vertical-align: middle !important;
        padding: 8px !important;
      }
      
      .a4-page .header-table .meta-cell,
      .a4-page .header-table td.meta-cell,
      .a4-page .header-table td.meta-cell[style] {
        width: 35% !important;
        padding: 0 !important;
        border: none !important;
        vertical-align: top !important;
      }
      
      /* Meta-table inner layout — override the nested table cramping */
      .a4-page .header-table .meta-table {
        width: 100% !important;
        table-layout: fixed !important;
        border-collapse: collapse !important;
      }
      
      .a4-page .header-table .meta-table td,
      .a4-page .header-table .meta-table th,
      .a4-page .header-table table.meta-table td,
      .a4-page .header-table .meta-table td[style],
      .a4-page .header-table table.meta-table td[style] {
        padding: 3px 8px !important;
        font-size: 10pt !important;
        line-height: 1.2 !important;
        vertical-align: middle !important;
        border: 1px solid #000 !important;
      }
      
      .a4-page .header-table .meta-table .label {
        width: 45% !important;
        text-align: left !important;
        white-space: nowrap !important;
      }
      
      .a4-page .header-table .meta-table .value {
        width: 55% !important;
        text-align: center !important;
      }
      
      .a4-page .header-table .color-swatch {
        height: 18px !important;
        background: #0b3bff !important;
        display: block !important;
        width: 100% !important;
      }

      /* Sign-table: only th rows gray, td rows white */
      .a4-page .sign-table .approved-cell {
        background: #ffffff !important;
      }
      
      .a4-page .sign-table .sig-cell {
        background: #ffffff !important;
      }

      /* ============================================
         PDF CONTEXT — Duplicate rules WITHOUT .a4-page prefix
         The PDF container has no .a4-page class, so all .a4-page rules
         are dead there. These non-prefixed rules ensure the PDF header
         matches the on-page preview.
         ============================================ */
      
      /* Base header cell padding — compact to match on-page */
      .header-table td,
      .header-table th {
        padding: ${s.header.cellPadding}px ${s.header.cellPadding + 2}px !important;
        font-size: ${s.header.fontSize}px !important;
        line-height: ${s.header.lineHeight} !important;
        vertical-align: middle !important;
        border: 1px solid #000 !important;
      }
      
      /* Nested tables in header (fallback without .a4-page) */
      .header-table table td,
      .header-table table th {
        padding: ${Math.max(1, s.header.cellPadding - 1)}px ${s.header.cellPadding}px !important;
        font-size: ${s.header.fontSize}px !important;
        line-height: ${s.header.lineHeight} !important;
      }
      
      /* PDF: Column widths */
      .header-table .logo-cell { width: 20% !important; text-align: center !important; }
      .header-table .title-cell {
        width: 45% !important;
        font-size: 14pt !important;
        font-weight: bold !important;
        letter-spacing: 1px !important;
        text-align: center !important;
        vertical-align: middle !important;
        padding: 8px !important;
      }
      .header-table .meta-cell,
      .header-table td.meta-cell,
      .header-table td.meta-cell[style] {
        width: 35% !important;
        padding: 0 !important;
        border: none !important;
        vertical-align: top !important;
      }
      
      /* PDF: Meta-table layout */
      .header-table .meta-table,
      .header-table table.meta-table {
        width: 100% !important;
        table-layout: fixed !important;
        border-collapse: collapse !important;
      }
      
      .header-table .meta-table td,
      .header-table .meta-table th,
      .header-table table.meta-table td,
      .header-table .meta-table td[style],
      .header-table table.meta-table td[style] {
        padding: 3px 8px !important;
        font-size: 10pt !important;
        line-height: 1.2 !important;
        vertical-align: middle !important;
        border: 1px solid #000 !important;
      }
      
      .header-table .meta-table .label {
        width: 45% !important;
        text-align: left !important;
        white-space: nowrap !important;
      }
      
      .header-table .meta-table .value {
        width: 55% !important;
        text-align: center !important;
      }
      
      .header-table .color-swatch {
        height: 18px !important;
        background: #0b3bff !important;
        display: block !important;
        width: 100% !important;
      }
      
      .sign-table .approved-cell { background: #ffffff !important; }
      .sign-table .sig-cell { background: #ffffff !important; }
      
      .header-table img {
        max-height: ${s.header.logoMaxHeight}px !important;
        max-width: 100% !important;
        display: block !important;
        margin: auto !important;
        object-fit: contain !important;
      }

      /* ============================================
         FOOTER SETTINGS - AGGRESSIVE INLINE STYLE OVERRIDE
         ============================================ */
      
      .a4-page .footer-table td,
      .a4-page .footer-table th,
      .a4-page .footer-table tbody td,
      .a4-page .footer-table thead th,
      .a4-page table.footer-table td,
      .a4-page table.footer-table th,
      .a4-page .footer-table .footer-header-cell,
      .a4-page .footer-table .footer-label-cell,
      .a4-page .footer-table .footer-data-cell,
      .a4-page .footer-table td[style],
      .a4-page .footer-table td[style*="font-size"],
      .a4-page .footer-table td[style*="padding"] {
        padding: ${s.footer.cellPadding}px ${s.footer.cellPadding + 2}px !important;
        font-size: ${s.footer.fontSize}px !important;
        line-height: ${s.footer.lineHeight} !important;
      }

      /* Page Layout Settings */
      .a4-page {
        padding: ${s.page.contentPadding}px !important;
        ${s.page.borderEnabled ? `
        border: ${s.page.borderThickness}px solid ${s.page.borderColor} !important;
        ` : 'border: none !important;'}
      }

      /* Elements Settings - Lists */
      .a4-page .doc-content ul,
      .a4-page .doc-content ol {
        padding-left: ${s.elements.listIndent}px !important;
        font-size: ${s.typography.contentFontSize}px !important;
      }
      
      /* Elements Settings - Content Tables (not header/footer) */
      .a4-page .doc-content table:not(.header-table):not(.footer-table) th,
      .a4-page .doc-content .content-table th {
        font-size: ${s.elements.tableHeaderFontSize}px !important;
        padding: ${s.elements.tableCellPadding}px !important;
      }
      
      .a4-page .doc-content table:not(.header-table):not(.footer-table) td,
      .a4-page .doc-content table:not(.header-table):not(.footer-table) th,
      .a4-page .doc-content .content-table td,
      .a4-page .doc-content .content-table th {
        padding: ${s.elements.tableCellPadding}px !important;
        font-size: ${s.typography.contentFontSize}px !important;
      }
    `;
  };

  return {
    settings: settings || DEFAULT_DOCUMENT_PREVIEW_SETTINGS,
    isLoading,
    updateSettings: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    generateCSS,
  };
};
