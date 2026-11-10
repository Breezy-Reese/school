import { Router } from 'express';
import crypto from 'node:crypto';
import { Student, Payment, FeeItem } from '../models/school.js';
import MpesaRequest from '../models/MpesaRequest.js';
import { nextNumber } from '../utils/helpers.js';

const r = Router();
const ack = (res) => res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
const sum = (rows, key) => rows.reduce((s, x) => s + (x[key] || 0), 0);

function sameSecret(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

async function handle(cb) {
  // Claim the request so a repeated callback can never record the payment twice
  const req = await MpesaRequest.findOneAndUpdate(
    { checkoutRequestId: cb.CheckoutRequestID, status: 'pending' },
    { $set: { status: 'processing' } },
    { new: true },
  );
  if (!req) return; // unknown request, or already handled

  if (Number(cb.ResultCode) !== 0) {
    req.status = 'failed';
    req.resultDesc = cb.ResultDesc;
    await req.save();
    return;
  }

  const meta = Object.fromEntries((cb.CallbackMetadata?.Item || []).map((i) => [i.Name, i.Value]));
  const code = String(meta.MpesaReceiptNumber || '');
  const amount = Number(meta.Amount);

  // Save the M-Pesa code first so staff can trace the money if anything below fails
  req.mpesaReceipt = code;
  await req.save();

  try {
    if (code && (await Payment.exists({ method: 'M-Pesa', ref: code }))) {
      req.status = 'success';
      await req.save();
      return;
    }
    const student = await Student.findOne({ admNo: req.admNo });
    const termFee = sum(await FeeItem.find({ class: student.class, term: req.term }), 'amount');
    const n = await nextNumber('receipt', 0);
    const payment = await Payment.create({
      receipt: `RCT-${String(n).padStart(4, '0')}`,
      admNo: student.admNo,
      name: student.name,
      class: student.class,
      term: req.term,
      paymentDate: new Date(),
      termFee: termFee > 0 ? termFee : undefined,
      amount,
      method: 'M-Pesa',
      ref: code,
      collectedBy: 'M-Pesa (online)',
    });
    req.status = 'success';
    req.receipt = payment.receipt;
    req.resultDesc = cb.ResultDesc;
    req.paidAt = new Date();
    await req.save();
  } catch (err) {
    console.error('Could not record M-Pesa payment', code, err);
    req.status = 'error';
    req.resultDesc = 'Payment received but not recorded';
    await req.save();
  }
}

// The secret in the URL stops strangers from sending fake "payment successful" messages
r.post('/callback/:secret', async (req, res) => {
  const secret = process.env.MPESA_CALLBACK_SECRET;
  if (!secret || !sameSecret(req.params.secret, secret)) {
    return res.status(404).json({ message: 'Not found' });
  }
  const cb = req.body?.Body?.stkCallback;
  if (cb?.CheckoutRequestID) {
    try { await handle(cb); } catch (err) { console.error('M-Pesa callback error:', err); }
  }
  ack(res);
});

export default r;