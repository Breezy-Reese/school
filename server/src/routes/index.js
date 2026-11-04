import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import crud from './crud.js';
import studentRoutes from './students.js';
import paymentRoutes from './payments.js';
import { attendanceRoutes, marksRoutes } from './academics.js';
import { SchoolClass, Enquiry, FeeItem, Subject, Staff } from '../models/school.js';
import { clean, yy, nextNumber } from '../utils/helpers.js';

const router = Router();
router.use(protect); // every route below needs a valid login token

router.use('/classes', crud(SchoolClass, { sort: { order: 1 } }));
router.use('/subjects', crud(Subject, { sort: { name: 1 } }));
router.use('/staff', crud(Staff, { sort: { name: 1 } }));
router.use('/fee-items', crud(FeeItem, { sort: { class: 1, head: 1 } }));
router.use('/enquiries', crud(Enquiry, {
  sort: { createdAt: -1 },
  beforeCreate: async (body) => ({
    ...clean(body),
    formNo: `FORM-${yy()}-${await nextNumber(`form-${yy()}`)}`,
  }),
}));

router.use('/students', studentRoutes);
router.use('/payments', paymentRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/marks', marksRoutes);

export default router;