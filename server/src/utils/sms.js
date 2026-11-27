export const smsConfigured = () => !!(process.env.AT_USERNAME && process.env.AT_API_KEY);

const base = () =>
  process.env.AT_ENV === 'sandbox' ? 'https://api.sandbox.africastalking.com' : 'https://api.africastalking.com';

// 0712345678 / 712345678 / 254712345678 / +254712345678  ->  +254712345678 (or null)
export function toIntl(phone) {
  const d = String(phone || '').replace(/[\s\-()]/g, '').replace(/^\+/, '');
  if (/^0[17]\d{8}$/.test(d)) return `+254${d.slice(1)}`;
  if (/^[17]\d{8}$/.test(d)) return `+254${d}`;
  if (/^254[17]\d{8}$/.test(d)) return `+${d}`;
  return null;
}

export async function sendSms(to, message) {
  try {
    const body = new URLSearchParams({ username: process.env.AT_USERNAME, to, message });
    if (process.env.AT_SENDER_ID) body.set('from', process.env.AT_SENDER_ID);
    const res = await fetch(`${base()}/version1/messaging`, {
      method: 'POST',
      headers: {
        apiKey: process.env.AT_API_KEY,
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    const data = await res.json().catch(() => ({}));
    const rec = data?.SMSMessageData?.Recipients?.[0];
    if (!res.ok || !rec) return { ok: false, detail: data?.SMSMessageData?.Message || `HTTP ${res.status}` };
    return { ok: [100, 101, 102].includes(Number(rec.statusCode)), detail: rec.status, cost: rec.cost };
  } catch (err) {
    return { ok: false, detail: err.message };
  }
}