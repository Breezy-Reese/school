import { Router } from 'express';
import Setting from '../models/Setting.js';
import { allowRoles } from '../middleware/auth.js';

const r = Router();
const str = (v, max = 200) => String(v ?? '').trim().slice(0, max);
const bool = (v) => v === true || v === 'true';

// Everyone logged in can read (receipts and the parent portal need the school name and
// payment options). Nothing secret is stored here: the M-Pesa API keys stay in .env.
r.get('/', async (req, res) => {
  const doc = await Setting.findOneAndUpdate(
    { key: 'main' },
    { $setOnInsert: { key: 'main' } },
    { upsert: true, new: true },
  );
  res.json(doc);
});

// Only admins can change them
r.put('/', allowRoles('admin'), async (req, res) => {
  const { school = {}, payment = {} } = req.body || {};
  const { mpesa = {}, bank = {}, office = {} } = payment;

  const name = str(school.name, 120);
  if (!name) return res.status(400).json({ message: 'Enter the school name' });

  const email = str(school.email, 120);
  if (email && !/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ message: 'Enter a valid school email address' });
  }

  const paybill = str(mpesa.paybill, 12);
  if (paybill && !/^\d{4,8}$/.test(paybill)) {
    return res.status(400).json({ message: 'The Paybill number must be 4 to 8 digits' });
  }
  if (bool(mpesa.enabled) && !paybill) {
    return res.status(400).json({ message: 'Enter the Paybill number, or turn the M-Pesa option off' });
  }
  if (bool(bank.enabled) && !str(bank.accountNumber)) {
    return res.status(400).json({ message: 'Enter the bank account number, or turn the bank option off' });
  }
  if (bool(office.enabled) && !str(office.details)) {
    return res.status(400).json({ message: 'Enter the "pay at school" details, or turn that option off' });
  }

  const doc = await Setting.findOneAndUpdate(
    { key: 'main' },
    {
      $set: {
        configured: true,
        'school.name': name,
        'school.address': str(school.address),
        'school.phone': str(school.phone, 40),
        'school.email': email,
        'school.receiptFooter': str(school.receiptFooter, 300),
        'payment.mpesa.enabled': bool(mpesa.enabled),
        'payment.mpesa.paybill': paybill,
        'payment.bank.enabled': bool(bank.enabled),
        'payment.bank.bankName': str(bank.bankName),
        'payment.bank.accountName': str(bank.accountName),
        'payment.bank.accountNumber': str(bank.accountNumber, 40),
        'payment.bank.branch': str(bank.branch),
        'payment.bank.note': str(bank.note, 300),
        'payment.office.enabled': bool(office.enabled),
        'payment.office.details': str(office.details, 400),
      },
    },
    { upsert: true, new: true, runValidators: true },
  );
  res.json(doc);
});

export default r;