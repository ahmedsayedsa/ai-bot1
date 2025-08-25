import express from 'express';
import { register, login, adminLogin, logout, getProfile } from '../controllers/authController.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';
import { validate, schemas } from '../utils/validate.js';
import { authLimiter } from '../middlewares/rateLimit.js';

const router = express.Router();

// تسجيل مستخدم جديد
router.post('/register', authLimiter, validate(schemas.register), register);

// تسجيل دخول المستخدم
router.post('/login', authLimiter, validate(schemas.login), login);

// تسجيل دخول المشرف
router.post('/admin/login', authLimiter, validate(schemas.login), adminLogin);

// تسجيل الخروج
router.post('/logout', logout);

// جلب بيانات المستخدم الحالي
router.get('/me', authenticateToken, getProfile);

export default router;