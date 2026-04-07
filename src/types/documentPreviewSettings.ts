export interface DocumentPreviewSettings {
  typography: {
    fontFamily: string;
    contentFontSize: number;
    contentLineHeight: number;
    sectionTitleFontSize: number;
    paragraphSpacing: number;
  };
  header: {
    cellPadding: number;
    fontSize: number;
    titleFontSize: number;
    logoMaxHeight: number;
    lineHeight: number;
  };
  footer: {
    cellPadding: number;
    fontSize: number;
    lineHeight: number;
  };
  page: {
    marginTop: number;
    marginRight: number;
    marginBottom: number;
    marginLeft: number;
    contentPadding: number;
    borderEnabled: boolean;
    borderThickness: number;
    borderColor: string;
  };
  elements: {
    listIndent: number;
    tableHeaderFontSize: number;
    tableCellPadding: number;
  };
}

export const DEFAULT_DOCUMENT_PREVIEW_SETTINGS: DocumentPreviewSettings = {
  typography: {
    fontFamily: 'Calibri, Arial, sans-serif',
    contentFontSize: 14,
    contentLineHeight: 1.6,
    sectionTitleFontSize: 16,
    paragraphSpacing: 10,
  },
  header: {
    cellPadding: 6,
    fontSize: 10,
    titleFontSize: 14,
    logoMaxHeight: 80,
    lineHeight: 1.2,
  },
  footer: {
    cellPadding: 6,
    fontSize: 10,
    lineHeight: 1.2,
  },
  page: {
    marginTop: 15,
    marginRight: 15,
    marginBottom: 15,
    marginLeft: 15,
    contentPadding: 20,
    borderEnabled: true,
    borderThickness: 2,
    borderColor: '#000000',
  },
  elements: {
    listIndent: 20,
    tableHeaderFontSize: 11,
    tableCellPadding: 6,
  },
};

export const FONT_FAMILY_OPTIONS = [
  { label: 'Calibri', value: 'Calibri, Arial, sans-serif' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Times New Roman', value: 'Times New Roman, Times, serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { label: 'Tahoma', value: 'Tahoma, Geneva, sans-serif' },
  { label: 'Trebuchet MS', value: 'Trebuchet MS, sans-serif' },
  { label: 'Courier New', value: 'Courier New, monospace' },
];
