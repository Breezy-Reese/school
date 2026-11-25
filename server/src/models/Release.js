import mongoose from 'mongoose';
const { Schema, model } = mongoose;

// Whether a class's results for a term have been released to parents
const schema = new Schema({
  class: { type: String, required: true },
  term: { type: String, required: true },
  year: { type: Number, required: true },
  published: { type: Boolean, default: false },
  publishedBy: String,
  publishedAt: Date,
}, { timestamps: true });
schema.index({ class: 1, term: 1, year: 1 }, { unique: true });

export default model('Release', schema);