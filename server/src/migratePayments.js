
import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import { Payment } from './models/school.js';

try {
  await connectDB();

  console.log('Starting payment migration...');

  const result = await Payment.updateMany(
    { paymentDate: { $exists: false } },
    [{ $set: { paymentDate: '$createdAt' } }],
    {
      updatePipeline: true,
      timestamps: false
    }
  );

  console.log(`Updated ${result.modifiedCount} existing payment(s)`);
  console.log('Payment migration completed successfully.');

} catch (error) {
  console.error('Payment migration failed:', error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
