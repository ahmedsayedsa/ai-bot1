import express from 'express';
import {
  getStats,
  getUsers,
  getUser,
  updateUserStatus,
  getPlans,
  createNewPlan,
  updateExistingPlan,
  deletePlanById,
  getServiceQR
} from '../controllers/adminController.js';
import { authenticateToken, requireAdmin } from '../middlewares/authMiddleware.js';
import { validate, schemas } from '../utils/validate.js';

const router = express.Router();

// حماية جميع المسارات بالمصادقة وصلاحيات المشرف
router.use(authenticateToken);
router.use(requireAdmin);

// الإحصائيات
router.get('/stats', getStats);

// المستخدمون
router.get('/users', getUsers);
router.get('/users/:id', getUser);
router.patch('/users/:id/status', validate(schemas.updateUserStatus), updateUserStatus);

// الخطط
router.get('/plans', getPlans);
router.post('/plans', validate(schemas.createPlan), createNewPlan);
router.put('/plans/:id', validate(schemas.createPlan), updateExistingPlan);
router.delete('/plans/:id', deletePlanById);

// QR الخدمة
router.get('/qr', getServiceQR);

export default router;