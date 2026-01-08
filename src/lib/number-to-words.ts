export function convertNumberToWords(amount: number): string {
  if (amount === 0) return "ZERO RUPEES";

  const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
  const teens = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

  function convertLessThanThousand(num: number): string {
    if (num === 0) return '';
    if (num < 10) return ones[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) {
      const ten = Math.floor(num / 10);
      const one = num % 10;
      return tens[ten] + (one > 0 ? ' ' + ones[one] : '');
    }
    const hundred = Math.floor(num / 100);
    const rest = num % 100;
    return ones[hundred] + ' HUNDRED' + (rest > 0 ? ' ' + convertLessThanThousand(rest) : '');
  }

  // Split into crores, lakhs, thousands, hundreds
  const crores = Math.floor(amount / 10000000);
  const lakhs = Math.floor((amount % 10000000) / 100000);
  const thousands = Math.floor((amount % 100000) / 1000);
  const hundreds = Math.floor(amount % 1000);
  const cents = Math.round((amount % 1) * 100);

  let words = '';

  if (crores > 0) {
    words += convertLessThanThousand(crores) + ' CRORE ';
  }

  if (lakhs > 0) {
    words += convertLessThanThousand(lakhs) + ' LAKH ';
  }

  if (thousands > 0) {
    words += convertLessThanThousand(thousands) + ' THOUSAND ';
  }

  if (hundreds > 0) {
    words += convertLessThanThousand(hundreds);
  }

  words = words.trim();
  
  if (words === '') {
    return 'ZERO RUPEES';
  }

  // For million format
  const millions = Math.floor(amount / 1000000);
  if (millions > 0 && crores === 0) {
    words = convertLessThanThousand(millions) + ' MILLION';
    const remainder = amount % 1000000;
    if (remainder > 0) {
      words += ' ' + convertLessThanThousand(remainder);
    }
  }

  words += ' RUPEES';

  if (cents > 0) {
    words += ' & ' + convertLessThanThousand(cents) + ' CENTS';
  } else {
    words += ' & ZERO';
  }

  return words;
}
