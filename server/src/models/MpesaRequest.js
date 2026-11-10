import mongoose from 'mongoose';
const { Schema, model } = mongoose;

// One document per STK push request
const schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  admNo: { type: String, required: true },
  studentName: String,
  amount: { type: Number, required: true },
  phone: String,
  term: String,
  checkoutRequestId: { type: String, unique: true, sparse: true },
  status: { type: String, enum: ['pending', 'processing', 'success', 'failed', 'error'], default: 'pending' },
  resultDesc: String,
  mpesaReceipt: String,   // Safaricom's code, e.g. QGH7XXXXXX
  receipt: String,        // our own receipt number, e.g. RCT-0042
  paidAt: Date,
}, { timestamps: true });

export default model('MpesaRequest', schema);