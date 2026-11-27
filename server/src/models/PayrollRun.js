import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const entry = new Schema({
  staff: { type: Schema.Types.ObjectId, ref: 'Staff' },
  name: String,
  role: String,
  basic: { type: Number, default: 0 },
  allowances: { type: Number, default: 0 },
  deductions: { type: Number, default: 0 },
  note: String,
});

const schema = new Schema({
  month: { type: String, required: true, unique: true }, // YYYY-MM
  status: { type: String, enum: ['draft', 'finalized'], default: 'draft' },
  entries: [entry],
  createdBy: String,
  finalizedBy: String,
  finalizedAt: Date,
  expense: { type: Schema.Types.ObjectId, ref: 'Expense' },
}, { timestamps: true });

export default model('PayrollRun', schema);