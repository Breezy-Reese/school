import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const schema = new Schema({
  date: { type: Date, required: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  amount: { type: Number, required: true, min: 0.01 },
  method: String,
  reference: String,
  paidTo: String,
  recordedBy: String,
  // Expenses are never deleted. They are voided with a reason, so the record stays auditable.
  voided: { type: Boolean, default: false },
  voidReason: String,
  voidedBy: String,
  voidedAt: Date,
}, { timestamps: true });

export default model('Expense', schema);