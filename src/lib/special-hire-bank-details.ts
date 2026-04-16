export interface SpecialHireQuotationBankSource {
  quotation_bank_name?: string | null;
  quotation_account_name?: string | null;
  quotation_account_no?: string | null;
}

export interface SpecialHireQuotationBankSnapshot {
  payment_bank_name: string;
  payment_account_name: string;
  payment_account_no: string;
}

export const SPECIAL_HIRE_QUOTATION_BANK_DEFAULTS: SpecialHireQuotationBankSnapshot = {
  payment_bank_name: 'Commercial Bank - Nugegoda',
  payment_account_name: 'NCG Holding (Pvt) Ltd',
  payment_account_no: '1001077213',
};

const LEGACY_ACCOUNT_NAMES = new Set([
  'NCG EXPRESS (PVT) LTD',
  'NCG EXPRESS (PRIVATE) LIMITED',
  'NCG EXPRESS',
]);

const LEGACY_BANK_NAMES = new Set([
  'SAMPATH BANK, NUGEGODA',
]);

const LEGACY_ACCOUNT_NUMBERS = new Set([
  '193414017578',
]);

const normalizeText = (value?: string | null) => value?.trim() || '';

const normalizeCompareValue = (value?: string | null) =>
  normalizeText(value).replace(/\s+/g, ' ').toUpperCase();

const normalizeAccountNumber = (value?: string | null) =>
  normalizeText(value).replace(/\s+/g, '');

export const buildSpecialHireQuotationBankSnapshot = (
  source?: SpecialHireQuotationBankSource | null,
): SpecialHireQuotationBankSnapshot => {
  const bankName = normalizeText(source?.quotation_bank_name);
  const accountName = normalizeText(source?.quotation_account_name);
  const accountNo = normalizeText(source?.quotation_account_no);

  return {
    payment_bank_name:
      !bankName || LEGACY_BANK_NAMES.has(normalizeCompareValue(bankName))
        ? SPECIAL_HIRE_QUOTATION_BANK_DEFAULTS.payment_bank_name
        : bankName,
    payment_account_name:
      !accountName || LEGACY_ACCOUNT_NAMES.has(normalizeCompareValue(accountName))
        ? SPECIAL_HIRE_QUOTATION_BANK_DEFAULTS.payment_account_name
        : accountName,
    payment_account_no:
      !accountNo || LEGACY_ACCOUNT_NUMBERS.has(normalizeAccountNumber(accountNo))
        ? SPECIAL_HIRE_QUOTATION_BANK_DEFAULTS.payment_account_no
        : accountNo,
  };
};