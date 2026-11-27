import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const schema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  userName: String,
  role: String,
  method: String,
  path: String,
  entity: String,
  status: Number,
  summary: Schema.Types.Mixed,
  ip: String,
}, { timestamps: { createdAt: true, updatedAt: false } });
schema.index({ createdAt: -1 });

export default model('AuditLog', schema);