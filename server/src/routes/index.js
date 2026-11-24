import { Router } from 'express';
import { protect, allowRoles } from '../middleware/auth.js';
import crud from './crud.js';
import studentRoutes from './students.js';
import paymentRoutes from './payments.js';
import userRoutes from './users.js';
import { attendanceRoutes, marksRoutes } from './academics.js';
import { Enquiry, FeeItem, Subject, Staff } from '../models/school.js';
import { clean, yy, nextNumber } from '../utils/helpers.js';
import dashboardRoutes from './dashboard.js';
import reportRoutes from './reports.js';
import promotionRoutes from './promotions.js';
import arrearsRoutes from './arrears.js';
import parentRoutes from './parents.js';
import portalRoutes from './portal.js';
import mpesaPortalRoutes from './mpesaPortal.js';
import settingsRoutes from './settings.js';
import importRoutes from './import.js';
import classesRoutes from './classes.js';
import expenseRoutes from './expenses.js';
import financeRoutes from './finance.js';

// 'superadmin' always passes, so it never needs listing
const ADMIN = ['admin'];
const FEES = ['admin', 'accountant'];
const ACADEMIC = ['admin', 'teacher'];
const ALL = ['admin', 'teacher', 'accountant'];

const router = Router();
router.use(protect);

// Parent portal: the only API parents can reach ('/portal/mpesa' must come before '/portal')
router.use('/portal/mpesa', mpesaPortalRoutes);
router.use('/portal', portalRoutes);
router.use('/settings', settingsRoutes);

// Everything below is staff only. Parents are blocked here.
router.use((req, res, next) =>
  req.user?.role === 'parent' ? res.status(403).json({ message: 'Not allowed' }) : next());

router.use('/classes', classesRoutes);                                  // guards inside the file
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

router.use('/students', studentRoutes);                                 // guards inside the file
router.use('/import', allowRoles(...ADMIN), importRoutes);
router.use('/payments', allowRoles(...FEES), paymentRoutes);
router.use('/reports', allowRoles(...FEES), reportRoutes);
router.use('/arrears', allowRoles(...FEES), arrearsRoutes);
router.use('/expenses', allowRoles(...FEES), expenseRoutes);
router.use('/finance', allowRoles(...FEES), financeRoutes);
router.use('/promotions', allowRoles(...ADMIN), promotionRoutes);
router.use('/attendance', allowRoles(...ACADEMIC), attendanceRoutes);
router.use('/marks', allowRoles(...ACADEMIC), marksRoutes);
router.use('/users', allowRoles(...ADMIN), userRoutes);
router.use('/parents', allowRoles(...ADMIN), parentRoutes);

export default router;