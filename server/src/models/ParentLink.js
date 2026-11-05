import mongoose from 'mongoose';
const { Schema, model } = mongoose;

// Links a parent's login to the admission numbers of their children
const linkSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  admNo: { type: String, required: true },
}, { timestamps: true });
linkSchema.index({ user: 1, admNo: 1 }, { unique: true });

export default model('ParentLink', linkSchema);