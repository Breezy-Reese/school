import { Router } from 'express';
import { protect, allowRoles } from '../middleware/auth.js';
import crud from './crud.js';
import studentRoutes from './students.js';
import paymentRoutes from './payments.js';
import userRoutes from './users.js';
import { attendanceRoutes, marksRoutes } from './academics.js';
import { SchoolClass, Enquiry, FeeItem, Subject, Staff } from '../models/school.js';
import { clean, yy, nextNumber } from '../utils/helpers.js';
import dashboardRoutes from './dashboard.js';

// 'superadmin' always passes, so it never needs listing
const ADMIN = ['admin'];
const FEES = ['admin', 'accountant'];
const ACADEMIC = ['admin', 'teacher'];
const ALL = ['admin', 'teacher', 'accountant'];

const router = Router();
router.use(protect);

router.use('/classes', crud(SchoolClass, { sort: { order: 1 }, roles: { read: ALL, write: ADMIN } }));
router.use('/subjects', crud(Subject, { sort: { name: 1 }, roles: { read: ALL, write: ADMIN } }));
router.use('/staff', crud(Staff, { sort: { name: 1 }, roles: { read: ADMIN, write: ADMIN } }));
router.use('/fee-items', crud(FeeItem, { sort: { class: 1, head: 1 }, roles: { read: FEES, write: FEES } }));
router.use('/dashboard', dashboardRoutes);
router.use('/enquiries', crud(Enquiry, {
  sort: { createdAt: -1 },
  roles: { read: ADMIN, write: ADMIN },
  beforeCreate: async (body) => ({
    ...clean(body),
    formNo: `FORM-${yy()}-${await nextNumber(`form-${yy()}`)}`,
  }),
}));

router.use('/students', studentRoutes);                              // guards inside the file
router.use('/payments', allowRoles(...FEES), paymentRoutes);
router.use('/attendance', allowRoles(...ACADEMIC), attendanceRoutes);
router.use('/marks', allowRoles(...ACADEMIC), marksRoutes);
router.use('/users', allowRoles(...ADMIN), userRoutes);

export default router;