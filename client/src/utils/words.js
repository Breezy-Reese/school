const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function chunk(n) {
  let s = '';
  if (n >= 100) {
    s += `${ones[Math.floor(n / 100)]} hundred`;
    n %= 100;
    if (n) s += ' and ';
  }
  if (n >= 20) {
    s += tens[Math.floor(n / 10)];
    if (n % 10) s += `-${ones[n % 10]}`;
  } else if (n > 0) {
    s += ones[n];
  }
  return s;
}

export function amountInWords(value) {
  const num = Math.round(Number(value));
  if (!num) return 'Zero';
  const parts = [];
  const millions = Math.floor(num / 1_000_000);
  const thousands = Math.floor((num % 1_000_000) / 1000);
  const rest = num % 1000;
  if (millions) parts.push(`${chunk(millions)} million`);
  if (thousands) parts.push(`${chunk(thousands)} thousand`);
  if (rest) parts.push(`${parts.length && rest < 100 ? 'and ' : ''}${chunk(rest)}`);
  const s = parts.join(' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}