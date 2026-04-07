export interface PDFSettings {
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  border: {
    enabled: boolean;
    thickness: number;
    color: string;
    style: 'solid' | 'dashed' | 'dotted';
  };
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export const DEFAULT_PDF_SETTINGS: PDFSettings = {
  margins: {
    top: 15,
    right: 15,
    bottom: 15,
    left: 15,
  },
  border: {
    enabled: true,
    thickness: 2,
    color: '#000000',
    style: 'solid',
  },
  padding: {
    top: 20,
    right: 20,
    bottom: 20,
    left: 20,
  },
};

export type PDFPreset = 'standard' | 'narrow' | 'wide' | 'minimal' | 'custom';

export const PDF_PRESETS: Record<PDFPreset, PDFSettings> = {
  standard: DEFAULT_PDF_SETTINGS,
  narrow: {
    margins: { top: 10, right: 10, bottom: 10, left: 10 },
    border: { enabled: true, thickness: 2, color: '#000000', style: 'solid' },
    padding: { top: 15, right: 15, bottom: 15, left: 15 },
  },
  wide: {
    margins: { top: 25, right: 25, bottom: 25, left: 25 },
    border: { enabled: false, thickness: 0, color: '#000000', style: 'solid' },
    padding: { top: 25, right: 25, bottom: 25, left: 25 },
  },
  minimal: {
    margins: { top: 5, right: 5, bottom: 5, left: 5 },
    border: { enabled: false, thickness: 0, color: '#000000', style: 'solid' },
    padding: { top: 10, right: 10, bottom: 10, left: 10 },
  },
  custom: DEFAULT_PDF_SETTINGS,
};
