/**
 * Indian Currency Number to Words Converter
 * Supports English and Gujarati language outputs for financial invoices.
 */

const ONES_EN = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const TENS_EN = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

const NUMBERS_GU: Record<number, string> = {
  0: 'શૂન્ય',
  1: 'એક',
  2: 'બે',
  3: 'ત્રણ',
  4: 'ચાર',
  5: 'પાંચ',
  6: 'છ',
  7: 'સાત',
  8: 'આઠ',
  9: 'નવ',
  10: 'દસ',
  11: 'અગિયાર',
  12: 'બાર',
  13: 'તેર',
  14: 'ચૌદ',
  15: 'પંદર',
  16: 'સોળ',
  17: 'સત્તર',
  18: 'અઢાર',
  19: 'ઓગણીસ',
  20: 'વીસ',
  21: 'એકવીસ',
  22: 'બાવીસ',
  23: 'ત્રેવીસ',
  24: 'ચોવીસ',
  25: 'પચીસ',
  26: 'છવીસ',
  27: 'સત્તાવીસ',
  28: 'અઠ્ઠાવીસ',
  29: 'ઓગણત્રીસ',
  30: 'ત્રીસ',
  31: 'એકત્રીસ',
  32: 'બત્રીસ',
  33: 'તેત્રીસ',
  34: 'ચોત્રીસ',
  35: 'પાંત્રીસ',
  36: 'છત્રીસ',
  37: 'સાડત્રીસ',
  38: 'આડત્રીસ',
  39: 'ઓગણચાલીસ',
  40: 'ચાલીસ',
  41: 'એકતાલીસ',
  42: 'બેતાલીસ',
  43: 'તેતાલીસ',
  44: 'ચુંમાલીસ',
  45: 'પિસ્તાલીસ',
  46: 'છેતાલીસ',
  47: 'સુડતાલીસ',
  48: 'અડતાલીસ',
  49: 'ઓગણપચાસ',
  50: 'પચાસ',
  51: 'એકાવન',
  52: 'બાવન',
  53: 'ત્રેપન',
  54: 'ચોપન',
  55: 'પંચાવન',
  56: 'છપ્પન',
  57: 'સત્તાવન',
  58: 'અઠ્ઠાવન',
  59: 'ઓગણસાઠ',
  60: 'સાઠ',
  61: 'એકસઠ',
  62: 'બાસઠ',
  63: 'ત્રેસઠ',
  64: 'ચોસઠ',
  65: 'પાંસઠ',
  66: 'છાસઠ',
  67: 'સડસઠ',
  68: 'અડસઠ',
  69: 'અગણોસિત્તેર',
  70: 'સિત્તેર',
  71: 'એકોતેર',
  72: 'બોતેર',
  73: 'તોતેર',
  74: 'ચુમોતેર',
  75: 'પંચોતેર',
  76: 'છોતેર',
  77: 'સંતોતેર',
  78: 'ઇઠોતેર',
  79: 'ઓગણાએંસી',
  80: 'એંસી',
  81: 'એક્યાસી',
  82: 'બ્યાસી',
  83: 'ત્યાસી',
  84: 'ચોર્યાસી',
  85: 'પંચાસી',
  86: 'છ્યાસી',
  87: 'સિત્યાસી',
  88: 'અઠ્યાસી',
  89: 'નેવ્યાસી',
  90: 'નેવું',
  91: 'એકાણું',
  92: 'બાણું',
  93: 'ત્રાણું',
  94: 'ચોરાણું',
  95: 'પંચાણું',
  96: 'છન્નું',
  97: 'સત્તાણું',
  98: 'અઠ્ઠાણું',
  99: 'નવ્વાણું',
  100: 'સો',
};

function convertTwoDigitsEn(n: number): string {
  if (n === 0) return '';
  if (n < 20) return ONES_EN[n];
  const tens = TENS_EN[Math.floor(n / 10)];
  const ones = ONES_EN[n % 10];
  return ones ? `${tens} ${ones}` : tens;
}

function convertThreeDigitsEn(n: number): string {
  const hundred = Math.floor(n / 100);
  const remainder = n % 100;
  let str = '';
  if (hundred > 0) {
    str += `${ONES_EN[hundred]} Hundred`;
    if (remainder > 0) str += ' ';
  }
  if (remainder > 0) {
    str += convertTwoDigitsEn(remainder);
  }
  return str;
}

/**
 * Convert number to English Indian currency words
 * e.g. 27600 -> "Twenty Seven Thousand Six Hundred Rupees Only"
 */
export function numberToWordsEn(rupees: number): string {
  const integerPart = Math.floor(Math.abs(rupees));
  if (integerPart === 0) return 'Zero Rupees Only';

  const crore = Math.floor(integerPart / 10000000);
  const lakh = Math.floor((integerPart % 10000000) / 100000);
  const thousand = Math.floor((integerPart % 100000) / 1000);
  const hundred = integerPart % 1000;

  const parts: string[] = [];

  if (crore > 0) {
    parts.push(`${convertThreeDigitsEn(crore)} Crore`);
  }
  if (lakh > 0) {
    parts.push(`${convertTwoDigitsEn(lakh)} Lakh`);
  }
  if (thousand > 0) {
    parts.push(`${convertTwoDigitsEn(thousand)} Thousand`);
  }
  if (hundred > 0) {
    parts.push(convertThreeDigitsEn(hundred));
  }

  return `${parts.join(' ')} Rupees Only`;
}

/**
 * Convert number to Gujarati Indian currency words
 * e.g. 27600 -> "સત્તાવીસ હજાર છસો રૂપિયા પૂરા"
 */
export function numberToWordsGu(rupees: number): string {
  const integerPart = Math.floor(Math.abs(rupees));
  if (integerPart === 0) return 'શૂન્ય રૂપિયા પૂરા';

  const crore = Math.floor(integerPart / 10000000);
  const lakh = Math.floor((integerPart % 10000000) / 100000);
  const thousand = Math.floor((integerPart % 100000) / 1000);
  const hundred = Math.floor((integerPart % 1000) / 100);
  const remainder = integerPart % 100;

  const parts: string[] = [];

  if (crore > 0) {
    parts.push(`${NUMBERS_GU[crore] || crore} કરોડ`);
  }
  if (lakh > 0) {
    parts.push(`${NUMBERS_GU[lakh] || lakh} લાખ`);
  }
  if (thousand > 0) {
    parts.push(`${NUMBERS_GU[thousand] || thousand} હજાર`);
  }
  if (hundred > 0) {
    parts.push(`${NUMBERS_GU[hundred] || hundred}સો`);
  }
  if (remainder > 0) {
    parts.push(NUMBERS_GU[remainder] || String(remainder));
  }

  return `${parts.join(' ')} રૂપિયા પૂરા`;
}

/**
 * Main number to words helper with language support
 */
export function amountInWords(rupees: number, lang: 'en' | 'gu' = 'en'): string {
  if (lang === 'gu') {
    return numberToWordsGu(rupees);
  }
  return numberToWordsEn(rupees);
}
