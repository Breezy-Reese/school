import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const schema = new Schema({
  admNo: String,
  studentName: String,
  to: String,
  message: String,
  status: { type: String, enum: ['sent', 'failed'] },
  detail: String,
  cost: String,
  sentBy: String,
}, { timestamps: { createdAt: true, updatedAt: false } });
schema.index({ admNo: 1, createdAt: -1 });

export default model('SmsLog', schema);