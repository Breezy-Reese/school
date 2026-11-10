const TZ = 'Africa/Nairobi';

const base = () =>
  process.env.MPESA_ENV === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';

export const isConfigured = () =>
  ['MPESA_CONSUMER_KEY', 'MPESA_CONSUMER_SECRET', 'MPESA_SHORTCODE', 'MPESA_PASSKEY',
    'MPESA_CALLBACK_BASE', 'MPESA_CALLBACK_SECRET'].every((k) => process.env[k]);

// 07XX / 01XX / 7XX / +2547XX  ->  2547XXXXXXXX (or null if invalid)
export function normalizePhone(input) {
  const d = String(input || '').replace(/[\s\-()+]/g, '');
  let n = d;
  if (/^0[17]\d{8}$/.test(d)) n = `254${d.slice(1)}`;
  else if (/^[17]\d{8}$/.test(d)) n = `254${d}`;
  return /^254[17]\d{8}$/.test(n) ? n : null;
}

// YYYYMMDDHHmmss in Nairobi time
function timestamp() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t).value;
  return `${get('year')}${get('month')}${get('day')}${get('hour')}${get('minute')}${get('second')}`;
}

let cached = { token: null, expires: 0 };

async function getToken() {
  if (cached.token && Date.now() < cached.expires) return cached.token;
  const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64');
  const res = await fetch(`${base()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) throw new Error(`Daraja authentication failed (${res.status})`);
  const data = await res.json();
  cached = { token: data.access_token, expires: Date.now() + (Number(data.expires_in || 3599) - 60) * 1000 };
  return cached.token;
}

// Sends the "enter your PIN" prompt to the customer's phone
export async function stkPush({ phone, amount, accountRef, desc }) {
  const token = await getToken();
  const shortcode = process.env.MPESA_SHORTCODE;
  const ts = timestamp();
  const buyGoods = process.env.MPESA_TXN_TYPE === 'CustomerBuyGoodsOnline';

  const body = {
    BusinessShortCode: shortcode,
    Password: Buffer.from(`${shortcode}${process.env.MPESA_PASSKEY}${ts}`).toString('base64'),
    Timestamp: ts,
    TransactionType: buyGoods ? 'CustomerBuyGoodsOnline' : 'CustomerPayBillOnline',
    Amount: amount,
    PartyA: phone,
    PartyB: process.env.MPESA_PARTYB || shortcode,
    PhoneNumber: phone,
    CallBackURL: `${process.env.MPESA_CALLBACK_BASE}/api/mpesa/callback/${process.env.MPESA_CALLBACK_SECRET}`,
    AccountReference: String(accountRef).slice(0, 12),
    TransactionDesc: String(desc).slice(0, 13),
  };

  const res = await fetch(`${base()}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ResponseCode !== '0') {
    throw new Error(data.errorMessage || data.ResponseDescription || `STK push failed (${res.status})`);
  }
  return data; // MerchantRequestID, CheckoutRequestID, CustomerMessage
}