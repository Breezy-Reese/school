import 'dotenv/config';
import connectDB from './config/db.js';
import User from './models/User.js';
import {
  Counter, SchoolClass, Student, Enquiry, FeeItem, Payment, Subject, Staff, Attendance, Mark,
} from './models/school.js';

await connectDB();

// ---------- 1. Admin user ----------
await User.deleteMany({ email: 'basil59mutuku@gmail.com' });
await User.create({
  name: 'Basil Mutuku',
  email: 'basil59mutuku@gmail.com',
  password: '#Basil123',
  role: 'superadmin',
});
console.log('Super admin created');

// ---------- 2. School sample data ----------
// Skipped if students already exist, so real data is never wiped by accident.
// Use `npm run seed -- --force` to reset the sample data on purpose.
const force = process.argv.includes('--force');
const hasData = (await Student.countDocuments()) > 0;

if (hasData && !force) {
  console.log('School data already exists, skipped (use --force to reset it)');
} else {
  await Promise.all(
    [Counter, SchoolClass, Student, Enquiry, FeeItem, Payment, Subject, Staff, Attendance, Mark]
      .map((m) => m.deleteMany({}))
  );

  const classNames = ['Form 1', 'Form 2', 'Form 3', 'Form 4'];
  await SchoolClass.insertMany(classNames.map((name, i) => ({ name, order: i + 1 })));

  await Student.insertMany([
    { admNo: 'ADM-26-1001', name: 'Amina Wanjiru', class: 'Form 1', gender: 'Female', phone: '0712 345 678', status: 'Active' },
    { admNo: 'ADM-26-1002', name: 'Brian Otieno', class: 'Form 1', gender: 'Male', phone: '0723 456 789', status: 'Active' },
    { admNo: 'ADM-26-1003', name: 'Cynthia Mwende', class: 'Form 2', gender: 'Female', phone: '0734 567 890', status: 'Active' },
    { admNo: 'ADM-26-1004', name: 'David Kiprop', class: 'Form 2', gender: 'Male', phone: '0745 678 901', status: 'Active' },
    { admNo: 'ADM-26-1005', name: 'Esther Achieng', class: 'Form 3', gender: 'Female', phone: '0756 789 012', status: 'Transferred' },
    { admNo: 'ADM-26-1006', name: 'Felix Mutuku', class: 'Form 4', gender: 'Male', phone: '0767 890 123', status: 'Active' },
  ]);

  await Enquiry.insertMany([
    { formNo: 'FORM-26-1001', studentName: 'Amina Wanjiru', parentName: 'Grace Wanjiru', phone: '0712 345 678', classInterested: 'Form 1', source: 'Walk-in', enquiryDate: '2026-10-28', status: 'Follow Up' },
    { formNo: 'FORM-26-1002', studentName: 'Brian Otieno', parentName: 'Peter Otieno', phone: '0723 456 789', classInterested: 'Form 2', source: 'Referral', enquiryDate: '2026-11-01', status: 'New' },
  ]);

  // Term 1 totals: Form 1 = 45,000 / Form 2 = 45,000 / Form 3 = 48,000 / Form 4 = 50,000
  const tuition = { 'Form 1': 35000, 'Form 2': 35000, 'Form 3': 38000, 'Form 4': 40000 };
  await FeeItem.insertMany(
    classNames.flatMap((c) => [
      { class: c, head: 'Tuition', term: 'Term 1', amount: tuition[c] },
      { class: c, head: 'Activity', term: 'Term 1', amount: 5000 },
      { class: c, head: 'Exam', term: 'Term 1', amount: 5000 },
    ])
  );

  await Subject.insertMany([
    { name: 'Mathematics', code: '121', category: 'Compulsory' },
    { name: 'English', code: '101', category: 'Compulsory' },
    { name: 'Kiswahili', code: '102', category: 'Compulsory' },
    { name: 'Biology', code: '231', category: 'Science' },
    { name: 'Chemistry', code: '233', category: 'Science' },
    { name: 'Physics', code: '232', category: 'Science' },
    { name: 'History', code: '311', category: 'Humanities' },
    { name: 'Geography', code: '312', category: 'Humanities' },
    { name: 'Computer Studies', code: '451', category: 'Technical' },
  ]);

  await Staff.insertMany([
    { name: 'Mary Njeri', role: 'Teacher', phone: '0711 111 222', email: 'mary@school.com', salary: 55000 },
    { name: 'John Kamau', role: 'Accountant', phone: '0722 222 333', email: 'john@school.com', salary: 60000 },
    { name: 'Sarah Akinyi', role: 'Principal', phone: '0733 333 444', email: 'sarah@school.com', salary: 120000 },
  ]);

  // So new records continue after the seeded ones
  await Counter.insertMany([
    { _id: 'adm-26', seq: 6 },   // next student -> ADM-26-1007
    { _id: 'form-26', seq: 2 },  // next enquiry -> FORM-26-1003
    { _id: 'receipt', seq: 0 },  // first receipt -> RCT-0001
  ]);

  console.log('School data seeded');
}

process.exit();