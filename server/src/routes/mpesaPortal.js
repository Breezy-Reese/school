
import { Router } from 'express';
import mongoose from 'mongoose';
import { Student } from '../models/school.js';
import ParentLink from '../models/ParentLink.js';
import MpesaRequest from '../models/MpesaRequest.js';

import {
  isConfigured,
  missingMpesaConfig,
  normalizePhone,
  stkPush,
} from '../utils/mpesa.js';

const r = Router();
const MAX_AMOUNT = 150000;

// Parents only
r.use((req, res, next) =>
  req.user?.role === 'parent'
    ? next()
    : res.status(403).json({ message: 'Parents only' })
);

const currentTerm = () => {
  const m = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Nairobi',
      month: 'numeric',
    }).format(new Date())
  );

  return m <= 4 ? 'Term 1' : m <= 8 ? 'Term 2' : 'Term 3';
};

// Start an M-Pesa payment
r.post('/stk', async (req, res) => {
  // Check configuration before contacting Daraja
  if (!isConfigured()) {
    const missing = missingMpesaConfig();

    console.error(
      'Missing M-Pesa environment variables:',
      missing.join(', ')
    );

    return res.status(503).json({
      message: 'Online payment is not configured. Please contact the administrator.',
    });
  }

  try {
    const admNo = String(req.body.admNo || '').trim();

    // Parent can only pay for a child linked to their account
    const linked = await ParentLink.exists({
      user: req.user._id,
      admNo,
    });

    const student = linked
      ? await Student.findOne({ admNo })
      : null;

    if (!student) {
      return res.status(404).json({
        message: 'Student not found',
      });
    }

    // Validate payment amount
    const amount = Math.round(Number(req.body.amount));

    if (!(amount >= 1 && amount <= MAX_AMOUNT)) {
      return res.status(400).json({
        message: `Enter an amount between KES 1 and KES ${MAX_AMOUNT.toLocaleString()}`,
      });
    }

    // Validate phone number
    const phone = normalizePhone(req.body.phone);

    if (!phone) {
      return res.status(400).json({
        message: 'Enter a valid Safaricom number, e.g. 0712 345 678',
      });
    }

    // Prevent duplicate prompts within 60 seconds
    const inProgress = await MpesaRequest.exists({
      user: req.user._id,
      admNo,
      status: 'pending',
      createdAt: {
        $gt: new Date(Date.now() - 60_000),
      },
    });

    if (inProgress) {
      return res.status(429).json({
        message: 'A payment request is already in progress. Check your phone, or wait a minute and try again.',
      });
    }

    // Create payment record
    const doc = await MpesaRequest.create({
      user: req.user._id,
      admNo,
      studentName: student.name,
      amount,
      phone,
      term: currentTerm(),
    });

    try {
      const result = await stkPush({
        phone,
        amount,
        accountRef: admNo,
        desc: 'School fees',
      });

      doc.checkoutRequestId = result.CheckoutRequestID;
      await doc.save();

      return res.status(201).json({
        id: doc._id,
        message: result.CustomerMessage,
      });
    } catch (err) {
      console.error('STK push failed:', err.message);

      doc.status = 'failed';
      doc.resultDesc = err.message;
      await doc.save();

      return res.status(502).json({
        message: 'Could not start the M-Pesa payment. Please try again in a moment.',
      });
    }
  } catch (err) {
    console.error('Payment route error:', err);

    return res.status(500).json({
      message: 'An error occurred while processing your payment.',
    });
  }
});

// Check payment status
r.get('/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({
        message: 'Not found',
      });
    }

    const doc = await MpesaRequest.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!doc) {
      return res.status(404).json({
        message: 'Not found',
      });
    }

    return res.json({
      status: doc.status,
      resultDesc: doc.resultDesc,
      receipt: doc.receipt,
      mpesaReceipt: doc.mpesaReceipt,
      amount: doc.amount,
    });
  } catch (err) {
    console.error('Payment status error:', err);

    return res.status(500).json({
      message: 'Could not retrieve payment status.',
    });
  }
});

export default r;
