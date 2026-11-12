import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const text = { type: String, default: '' };

// One document holds all the school's settings
const schema = new Schema({
  key: { type: String, default: 'main', unique: true },
  configured: { type: Boolean, default: false }, // true once an admin has saved Settings
  school: {
    name: text, address: text, phone: text, email: text,
    receiptFooter: { type: String }, // left undefined until saved, so an empty footer is possible
  },
  payment: {
    mpesa: { enabled: { type: Boolean, default: false }, paybill: text },
    bank: {
      enabled: { type: Boolean, default: false },
      bankName: text, accountName: text, accountNumber: text, branch: text, note: text,
    },
    office: { enabled: { type: Boolean, default: false }, details: text },
  },
}, { timestamps: true });

export default model('Setting', schema);