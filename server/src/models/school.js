import mongoose from 'mongoose';
const { Schema, model } = mongoose;
const opts = { timestamps: true };

export const Counter = model('Counter', new Schema({ _id: String, seq: { type: Number, default: 0 } }));

export const SchoolClass = model('SchoolClass', new Schema({
  name: { type: String, required: true, unique: true },
  order: { type: Number, default: 0 },
}, opts));

export const Student = model('Student', new Schema({
  admNo: { type: String, required: true, unique: true },
  enquiryFormNo: String,
  name: { type: String, required: true, trim: true },
  fatherName: String, motherName: String, dob: Date, gender: String, bloodGroup: String,
  nationalId: String, penNo: String,
  class: { type: String, required: true },
  section: String,
  status: { type: String, enum: ['Active', 'Transferred', 'Passed Out'], default: 'Active' },
  admissionDate: Date, category: String, religion: String,
  nationality: { type: String, default: 'Kenyan' },
  medium: String, fatherOccupation: String, previousSchool: String, lastClass: String, tcNumber: String,
  phone: String, altPhone: String, email: String,
}, opts));

export const Enquiry = model('Enquiry', new Schema({
  formNo: { type: String, required: true, unique: true },
  studentName: { type: String, required: true },
  parentName: String,
  phone: { type: String, required: true },
  classInterested: String,
  source: String,
  enquiryDate: Date,
  status: { type: String, enum: ['New', 'Follow Up', 'Admitted', 'Closed'], default: 'New' },
  notes: String,
}, opts));

export const FeeItem = model('FeeItem', new Schema({
  class: { type: String, required: true },
  head: { type: String, required: true },
  term: { type: String, default: 'Term 1' },
  amount: { type: Number, required: true, min: 0 },
}, opts));

export const Payment = model('Payment', new Schema({
  receipt: { type: String, required: true, unique: true },
  admNo: { type: String, required: true },
  name: String,
  class: String,
  term: { type: String, default: 'Term 1' },
  amount: { type: Number, required: true, min: 1 },
  method: String,
  ref: String,
}, opts));

export const Subject = model('Subject', new Schema({
  name: { type: String, required: true, unique: true },
  code: String,
  category: { type: String, default: 'Compulsory' },
}, opts));

export const Staff = model('Staff', new Schema({
  name: { type: String, required: true },
  role: { type: String, default: 'Teacher' },
  phone: String,
  email: String,
  salary: { type: Number, default: 0 },
}, opts));

const attendanceSchema = new Schema({
  class: { type: String, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  records: [{ _id: false, admNo: String, status: String }],
}, opts);
attendanceSchema.index({ class: 1, date: 1 }, { unique: true });
export const Attendance = model('Attendance', attendanceSchema);

const markSchema = new Schema({
  class: String,
  exam: { type: String, required: true },
  subject: { type: String, required: true },
  admNo: { type: String, required: true },
  score: { type: Number, min: 0, max: 100 },
}, opts);
markSchema.index({ exam: 1, subject: 1, admNo: 1 }, { unique: true });
export const Mark = model('Mark', markSchema);