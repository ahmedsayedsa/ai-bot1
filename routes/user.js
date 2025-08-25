import express from 'express';
import {
  getProfile,
  getSubscription,
  subscribe,
  cancelUserSubscription,
  getUsage,
  getQRCode,
  getWhatsAppStatus,
  linkWhatsApp,
  getPlans
} from '../controllers/userController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { validate, schemas } from '../utils/validate.js';

const router = express.Router();

// حماية جميع المسارات بالمصادقة
router.use(authenticateToken);

// بيانات المستخدم
router.get('/profile', getProfile);

// الاشتراك
router.get('/subscription', getSubscription);
router.post('/subscribe', validate(schemas.subscribe), subscribe);
router.post('/cancel', cancelUserSubscription);

// الاستخدام
router.get('/usage', getUsage);

// واتساب
router.get('/qr', getQRCode);
router.get('/whatsapp/status', getWhatsAppStatus);
router.post('/whatsapp/link-callback', linkWhatsApp);

// الخطط المتاحة
router.get('/plans', getPlans);

export default router;