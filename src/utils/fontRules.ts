export interface FontRule {
  size: number;
  bold: boolean;
}

export interface FontRules {
  standard: string;
  legal?: string;
  sizes: {
    documentType: FontRule;
    documentTitle: FontRule;
    documentControl: FontRule;
    headings: FontRule;
    bodyText: FontRule;
    signatory: FontRule;
    footer: FontRule;
  };
}

export const fontRules: Record<string, FontRules> = {
  english: {
    standard: 'Calibri',
    legal: 'Times New Roman',
    sizes: {
      documentType: { size: 12, bold: true },
      documentTitle: { size: 12, bold: true },
      documentControl: { size: 9, bold: false },
      headings: { size: 11, bold: true },
      bodyText: { size: 11, bold: false },
      signatory: { size: 9, bold: false },
      footer: { size: 9, bold: false }
    }
  },
  sinhala: {
    standard: 'FMAbhaya',
    sizes: {
      documentType: { size: 13, bold: true },
      documentTitle: { size: 13, bold: true },
      documentControl: { size: 10, bold: false },
      headings: { size: 12, bold: true },
      bodyText: { size: 12, bold: false },
      signatory: { size: 10, bold: false },
      footer: { size: 10, bold: false }
    }
  }
};

export const getFont = (language: string, component: keyof FontRules['sizes']): string => {
  const rules = fontRules[language];
  if (!rules) return fontRules.english.standard;
  
  const fontRule = rules.sizes[component];
  const fontFamily = rules.standard;
  const fontSize = `${fontRule.size}pt`;
  const fontWeight = fontRule.bold ? 'bold' : 'normal';
  
  return `${fontWeight} ${fontSize} ${fontFamily}`;
};

export const getFontDetails = (language: string, component: keyof FontRules['sizes']): { fontFamily: string; fontSize: string; fontWeight: string } => {
  const rules = fontRules[language];
  if (!rules) {
    return {
      fontFamily: fontRules.english.standard,
      fontSize: `${fontRules.english.sizes[component].size}pt`,
      fontWeight: fontRules.english.sizes[component].bold ? 'bold' : 'normal'
    };
  }
  
  const fontRule = rules.sizes[component];
  return {
    fontFamily: rules.standard,
    fontSize: `${fontRule.size}pt`,
    fontWeight: fontRule.bold ? 'bold' : 'normal'
  };
};

export const validateFontSize = (component: keyof FontRules['sizes'], language: string, size: number): boolean => {
  const rules = fontRules[language];
  return rules ? rules.sizes[component].size === size : false;
};