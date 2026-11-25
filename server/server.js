import 'dotenv/config';
import app from './src/app.js';
import connectDB from './src/config/db.js';
import { Mark } from './src/models/school.js';

connectDB().then(async () => {
  // Marks are now unique per year and term, so replace the old index
  try { await Mark.syncIndexes(); } catch (err) { console.error('Could not sync Mark indexes:', err.message); }
  app.listen(process.env.PORT, () =>
    console.log(`Server running on port ${process.env.PORT}`)
  );
});